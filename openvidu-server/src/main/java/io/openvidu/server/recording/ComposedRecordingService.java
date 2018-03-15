package io.openvidu.server.recording;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import javax.ws.rs.ProcessingException;

import org.apache.commons.io.FilenameUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerCmd;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.api.exception.ConflictException;
import com.github.dockerjava.api.exception.DockerClientException;
import com.github.dockerjava.api.exception.InternalServerErrorException;
import com.github.dockerjava.api.exception.NotFoundException;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.core.command.ExecStartResultCallback;
import com.github.dockerjava.core.command.PullImageResultCallback;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.CommandExecutor;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Session;

@Service
public class ComposedRecordingService {

	private Logger log = LoggerFactory.getLogger(ComposedRecordingService.class);

	@Autowired
	OpenviduConfig openviduConfig;

	private Map<String, String> containers = new ConcurrentHashMap<>();
	private Map<String, String> sessionsContainers = new ConcurrentHashMap<>();
	private Map<String, Recording> startingRecordings = new ConcurrentHashMap<>();
	private Map<String, Recording> startedRecordings = new ConcurrentHashMap<>();
	private Map<String, Recording> sessionsRecordings = new ConcurrentHashMap<>();

	private final String IMAGE_NAME = "openvidu/openvidu-recording";
	private final String RECORDING_ENTITY_FILE = ".recording.";

	private DockerClient dockerClient;

	public ComposedRecordingService() {
		DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
		this.dockerClient = DockerClientBuilder.getInstance(config).build();
	}

	public Recording startRecording(Session session) {
		List<String> envs = new ArrayList<>();
		String shortSessionId = session.getSessionId().substring(session.getSessionId().lastIndexOf('/') + 1,
				session.getSessionId().length());
		String videoId = this.getFreeRecordingId(session.getSessionId(), shortSessionId);
		String secret = openviduConfig.getOpenViduSecret();

		Recording recording = new Recording(session.getSessionId(), videoId, videoId);
		
		this.sessionsRecordings.put(session.getSessionId(), recording);
		this.startingRecordings.put(recording.getId(), recording);

		String uid = null;
		try {
			uid = System.getenv("MY_UID");
			if (uid == null) {
				uid = CommandExecutor.execCommand("/bin/sh", "-c", "id -u " + System.getProperty("user.name"));
			}
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}

		String location = OpenViduServer.publicUrl.replaceFirst("wss://", "");
		String layoutUrl = session.getSessionProperties().archiveLayout().name().toLowerCase().replaceAll("_", "-");

		envs.add("URL=https://OPENVIDUAPP:" + secret + "@" + location + "/#/layout-" + layoutUrl + "/" + shortSessionId
				+ "/" + secret);
		envs.add("RESOLUTION=1920x1080");
		envs.add("FRAMERATE=30");
		envs.add("VIDEO_NAME=" + videoId);
		envs.add("VIDEO_FORMAT=mp4");
		envs.add("USER_ID=" + uid);
		envs.add("RECORDING_JSON=" + recording.toJson().toJSONString());

		log.info(recording.toJson().toJSONString());
		log.debug("Recorder connecting to url {}",
				"https://OPENVIDUAPP:" + secret + "@localhost:8443/#/layout-best-fit/" + shortSessionId + "/" + secret);

		String containerId = this.runRecordingContainer(envs, "recording_" + videoId);

		this.waitForVideoFileNotEmpty(videoId);

		this.sessionsContainers.put(session.getSessionId(), containerId);

		recording.setStatus(Recording.Status.started);
		
		this.startedRecordings.put(recording.getId(), recording);
		this.startingRecordings.remove(recording.getId());

		return recording;
	}

	public Recording stopRecording(Session session) {
		Recording recording = this.sessionsRecordings.remove(session.getSessionId());
		String containerId = this.sessionsContainers.remove(session.getSessionId());
		this.startedRecordings.remove(recording.getId());

		// Gracefully stop ffmpeg process
		ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId).withAttachStdout(true)
				.withAttachStderr(true).withCmd("bash", "-c", "echo 'q' > stop").exec();
		try {
			dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(new ExecStartResultCallback())
					.awaitCompletion();
		} catch (InterruptedException e) {
			e.printStackTrace();
		}

		// Wait for the container to be gracefully self-stopped
		CountDownLatch latch = new CountDownLatch(1);
		WaitForContainerStoppedCallback callback = new WaitForContainerStoppedCallback(latch);
		dockerClient.waitContainerCmd(containerId).exec(callback);

		boolean stopped = false;
		try {
			stopped = latch.await(60, TimeUnit.SECONDS);
		} catch (InterruptedException e) {
			recording.setStatus(Recording.Status.failed);
			failRecordingCompletion(containerId, new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE,
					"The recording completion process has been unexpectedly interrupted"));
		}
		if (!stopped) {
			recording.setStatus(Recording.Status.failed);
			failRecordingCompletion(containerId, new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE,
					"The recording completion process couldn't finish in 60 seconds"));
		}

		// Remove container
		this.removeDockerContainer(containerId);

		// Update recording attributes reading from video report file
		try {
			RecordingInfoUtils infoUtils = new RecordingInfoUtils(
					this.openviduConfig.getOpenViduRecordingPath() + recording.getName() + ".info");

			if (openviduConfig.getOpenViduRecordingFreeAccess()) {
				recording.setStatus(Recording.Status.available);
			} else {
				recording.setStatus(Recording.Status.stopped);
			}
			recording.setDuration(infoUtils.getDurationInSeconds());
			recording.setSize(infoUtils.getSizeInBytes());
			recording.setHasAudio(infoUtils.hasAudio());
			recording.setHasVideo(infoUtils.hasVideo());

			if (openviduConfig.getOpenViduRecordingFreeAccess()) {
				recording.setUrl(this.openviduConfig.getFinalUrl() + "recordings/" + recording.getName() + ".mp4");
			}

		} catch (IOException | ParseException e) {
			throw new OpenViduException(Code.RECORDING_REPORT_ERROR_CODE,
					"There was an error generating the metadata report file for the recording");
		}

		return recording;
	}

	public boolean recordingImageExistsLocally() {
		boolean imageExists = false;
		try {
			dockerClient.inspectImageCmd(IMAGE_NAME).exec();
			imageExists = true;
		} catch (NotFoundException nfe) {
			imageExists = false;
		} catch (ProcessingException e) {
			throw e;
		}
		return imageExists;
	}

	public void downloadRecordingImage() {
		try {
			dockerClient.pullImageCmd(IMAGE_NAME).exec(new PullImageResultCallback()).awaitSuccess();
		} catch (NotFoundException | InternalServerErrorException e) {
			if (imageExistsLocally(IMAGE_NAME)) {
				log.info("Docker image '{}' exists locally", IMAGE_NAME);
			} else {
				throw e;
			}
		} catch (DockerClientException e) {
			log.info("Error on Pulling '{}' image. Probably because the user has stopped the execution", IMAGE_NAME);
			throw e;
		}
	}

	public boolean sessionIsBeingRecorded(String sessionId) {
		return (this.sessionsRecordings.get(sessionId) != null);
	}

	public Recording getStartedRecording(String recordingId) {
		return this.startedRecordings.get(recordingId);
	}
	
	public Recording getStartingRecording(String recordingId) {
		return this.startingRecordings.get(recordingId);
	}

	private String runRecordingContainer(List<String> envs, String containerName) {
		Volume volume1 = new Volume("/recordings");
		CreateContainerCmd cmd = dockerClient.createContainerCmd(IMAGE_NAME).withName(containerName).withEnv(envs)
				.withNetworkMode("host").withVolumes(volume1)
				.withBinds(new Bind(openviduConfig.getOpenViduRecordingPath(), volume1));
		CreateContainerResponse container = null;
		try {
			container = cmd.exec();
			dockerClient.startContainerCmd(container.getId()).exec();
			containers.put(container.getId(), containerName);
			log.info("Container ID: {}", container.getId());
			return container.getId();
		} catch (ConflictException e) {
			log.error(
					"The container name {} is already in use. Probably caused by a session with unique publisher re-publishing a stream",
					containerName);
			return null;
		}
	}

	private void removeDockerContainer(String containerId) {
		dockerClient.removeContainerCmd(containerId).exec();
		containers.remove(containerId);
	}

	private void stopDockerContainer(String containerId) {
		dockerClient.stopContainerCmd(containerId).exec();
	}

	private boolean imageExistsLocally(String imageName) {
		boolean imageExists = false;
		try {
			dockerClient.inspectImageCmd(imageName).exec();
			imageExists = true;
		} catch (NotFoundException nfe) {
			imageExists = false;
		}
		return imageExists;
	}

	public Collection<Recording> getAllRecordings() {
		return this.getRecordingEntitiesFromHost();
	}
	
	public Collection<Recording> getStartingRecordings() {
		return this.startingRecordings.values();
	}

	public Collection<Recording> getStartedRecordings() {
		return this.startedRecordings.values();
	}

	public Collection<Recording> getFinishedRecordings() {
		return this.getRecordingEntitiesFromHost().stream()
				.filter(recording -> (recording.getStatus().equals(Recording.Status.stopped)
						|| recording.getStatus().equals(Recording.Status.available)))
				.collect(Collectors.toSet());
	}

	private Set<String> getRecordingIdsFromHost() {
		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();
		Set<String> fileNamesNoExtension = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isFile() && !files[i].getName().startsWith(RECORDING_ENTITY_FILE)) {
				fileNamesNoExtension.add(FilenameUtils.removeExtension(files[i].getName()));
			}
		}
		return fileNamesNoExtension;
	}

	private Set<Recording> getRecordingEntitiesFromHost() {
		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();
		Set<Recording> recordingEntities = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			Recording recording = this.getRecordingFromFile(files[i]);
			if (recording != null) {
				if (openviduConfig.getOpenViduRecordingFreeAccess()) {
					if (Recording.Status.stopped.equals(recording.getStatus())) {
						recording.setStatus(Recording.Status.available);
						recording.setUrl(
								this.openviduConfig.getFinalUrl() + "recordings/" + recording.getName() + ".mp4");
					}
				}
				recordingEntities.add(recording);
			}
		}
		return recordingEntities;
	}

	public HttpStatus deleteRecordingFromHost(String recordingId) {

		if (this.startedRecordings.containsKey(recordingId) || this.startingRecordings.containsKey(recordingId)) {
			// Cannot delete an active recording
			return HttpStatus.CONFLICT;
		}

		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();
		int numFilesDeleted = 0;
		for (int i = 0; i < files.length; i++) {
			if (files[i].isFile() && isFileFromRecording(files[i], recordingId)) {
				files[i].delete();
				numFilesDeleted++;
			}
		}

		HttpStatus status;
		if (numFilesDeleted == 3) {
			status = HttpStatus.NO_CONTENT;
		} else {
			status = HttpStatus.NOT_FOUND;
		}
		return status;
	}

	private Recording getRecordingFromFile(File file) {
		if (file.isFile() && file.getName().startsWith(RECORDING_ENTITY_FILE)) {
			JSONParser parser = new JSONParser();
			JSONObject json = null;
			try {
				json = (JSONObject) parser.parse(new FileReader(file));
			} catch (IOException | ParseException e) {
				return null;
			}
			return new Recording(json);
		}
		return null;
	}

	private boolean isFileFromRecording(File file, String recordingId) {
		return (((recordingId + ".info").equals(file.getName())) || ((recordingId + ".mp4").equals(file.getName()))
				|| ((".recording." + recordingId).equals(file.getName())));
	}

	private String getFreeRecordingId(String sessionId, String shortSessionId) {
		Set<String> recordingIds = this.getRecordingIdsFromHost();
		String recordingId = shortSessionId;
		boolean isPresent = recordingIds.contains(recordingId);
		int i = 1;

		while (isPresent) {
			recordingId = shortSessionId + "-" + i;
			i++;
			isPresent = recordingIds.contains(recordingId);
		}

		return recordingId;
	}

	private void waitForVideoFileNotEmpty(String recordingId) {
		boolean isPresent = false;
		while (!isPresent) {
			try {
				Thread.sleep(150);
				File f = new File(this.openviduConfig.getOpenViduRecordingPath() + recordingId + ".mp4");
				isPresent = ((f.isFile()) && (f.length() > 0));
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}

	private void failRecordingCompletion(String containerId, OpenViduException e) {
		this.stopDockerContainer(containerId);
		this.removeDockerContainer(containerId);
		throw e;
	}

}
