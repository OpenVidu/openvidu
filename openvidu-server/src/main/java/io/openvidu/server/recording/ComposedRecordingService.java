/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.server.recording;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import javax.ws.rs.ProcessingException;

import org.apache.commons.io.FilenameUtils;
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
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.utils.CommandExecutor;

@Service
public class ComposedRecordingService {

	private static final Logger log = LoggerFactory.getLogger(ComposedRecordingService.class);

	@Autowired
	private OpenviduConfig openviduConfig;

	@Autowired
	private SessionEventsHandler sessionHandler;

	private Map<String, String> containers = new ConcurrentHashMap<>();
	private Map<String, String> sessionsContainers = new ConcurrentHashMap<>();
	private Map<String, Recording> startingRecordings = new ConcurrentHashMap<>();
	private Map<String, Recording> startedRecordings = new ConcurrentHashMap<>();
	private Map<String, Recording> sessionsRecordings = new ConcurrentHashMap<>();
	private final Map<String, ScheduledFuture<?>> automaticRecordingStopThreads = new ConcurrentHashMap<>();

	private ScheduledThreadPoolExecutor automaticRecordingStopExecutor = new ScheduledThreadPoolExecutor(
			Runtime.getRuntime().availableProcessors());

	private final String IMAGE_NAME = "openvidu/openvidu-recording";
	private String IMAGE_TAG;
	private final String RECORDING_ENTITY_FILE = ".recording.";

	private DockerClient dockerClient;

	public ComposedRecordingService() {
		DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
		this.dockerClient = DockerClientBuilder.getInstance(config).build();
	}

	public Recording startRecording(Session session, RecordingProperties properties) {
		List<String> envs = new ArrayList<>();
		String shortSessionId = session.getSessionId().substring(session.getSessionId().lastIndexOf('/') + 1,
				session.getSessionId().length());
		String recordingId = this.getFreeRecordingId(session.getSessionId(), shortSessionId);

		if (properties.name() == null || properties.name().isEmpty()) {
			// No name provided for the recording file
			properties = new RecordingProperties.Builder().name(recordingId)
					.recordingLayout(properties.recordingLayout()).customLayout(properties.customLayout()).build();
		}

		Recording recording = new Recording(session.getSessionId(), recordingId, properties);

		this.sessionsRecordings.put(session.getSessionId(), recording);
		this.sessionHandler.setRecordingStarted(session.getSessionId(), recording);
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

		String layoutUrl = this.getLayoutUrl(recording, shortSessionId);

		envs.add("URL=" + layoutUrl);
		envs.add("RESOLUTION=1920x1080");
		envs.add("FRAMERATE=30");
		envs.add("VIDEO_ID=" + recordingId);
		envs.add("VIDEO_NAME=" + properties.name());
		envs.add("VIDEO_FORMAT=mp4");
		envs.add("USER_ID=" + uid);
		envs.add("RECORDING_JSON=" + recording.toJson().toString());

		log.info(recording.toJson().toString());
		log.info("Recorder connecting to url {}", layoutUrl);

		String containerId = this.runRecordingContainer(envs, "recording_" + recordingId);

		this.waitForVideoFileNotEmpty(properties.name());

		this.sessionsContainers.put(session.getSessionId(), containerId);

		recording.setStatus(Recording.Status.started);

		this.startedRecordings.put(recording.getId(), recording);
		this.startingRecordings.remove(recording.getId());

		return recording;
	}

	public Recording stopRecording(Session session, String recordingId, String reason) {
		Recording recording;
		String containerId;

		if (session == null) {
			log.warn(
					"Existing recording {} does not have an active session associated. This usually means the recording"
							+ " layout did not join a recorded participant or the recording has been automatically"
							+ " stopped after last user left and timeout passed",
					recordingId);
			recording = this.startedRecordings.remove(recordingId);
			containerId = this.sessionsContainers.remove(recording.getSessionId());
			this.sessionsRecordings.remove(recording.getSessionId());
		} else {
			recording = this.sessionsRecordings.remove(session.getSessionId());
			containerId = this.sessionsContainers.remove(session.getSessionId());
			this.startedRecordings.remove(recording.getId());
		}

		if (containerId == null) {

			// Session was closed while recording container was initializing
			// Wait until containerId is available and force its stop and removal
			new Thread(() -> {
				log.warn("Session closed while starting recording container");
				boolean containerClosed = false;
				String containerIdAux;
				while (!containerClosed) {
					containerIdAux = this.sessionsContainers.remove(session.getSessionId());
					if (containerIdAux == null) {
						try {
							log.warn("Waiting for container to be launched...");
							Thread.sleep(500);
						} catch (InterruptedException e) {
							e.printStackTrace();
						}
					} else {
						log.warn("Removing container {} for closed session {}...", containerIdAux,
								session.getSessionId());
						dockerClient.stopContainerCmd(containerIdAux).exec();
						this.removeDockerContainer(containerIdAux);
						containerClosed = true;
						log.warn("Container {} for closed session {} succesfully stopped and removed", containerIdAux,
								session.getSessionId());
						log.warn("Deleting unusable files for recording {}", recording.getId());
						if (HttpStatus.NO_CONTENT.equals(this.deleteRecordingFromHost(recording.getId(), true))) {
							log.warn("Files properly deleted");
						}
					}
				}
			}).start();

		} else {

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
						this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + ".info");

				if (openviduConfig.getOpenViduRecordingPublicAccess()) {
					recording.setStatus(Recording.Status.available);
				} else {
					recording.setStatus(Recording.Status.stopped);
				}
				recording.setDuration(infoUtils.getDurationInSeconds());
				recording.setSize(infoUtils.getSizeInBytes());
				recording.setHasAudio(infoUtils.hasAudio());
				recording.setHasVideo(infoUtils.hasVideo());

				if (openviduConfig.getOpenViduRecordingPublicAccess()) {
					recording.setUrl(this.openviduConfig.getFinalUrl() + "recordings/" + recording.getName() + ".mp4");
				}

			} catch (IOException e) {
				throw new OpenViduException(Code.RECORDING_REPORT_ERROR_CODE,
						"There was an error generating the metadata report file for the recording");
			}
			if (session != null) {
				this.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
			}
		}
		return recording;
	}

	public boolean recordingImageExistsLocally() {
		boolean imageExists = false;
		try {
			dockerClient.inspectImageCmd(IMAGE_NAME + ":" + IMAGE_TAG).exec();
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
			dockerClient.pullImageCmd(IMAGE_NAME + ":" + IMAGE_TAG).exec(new PullImageResultCallback()).awaitSuccess();
		} catch (NotFoundException | InternalServerErrorException e) {
			if (imageExistsLocally(IMAGE_NAME + ":" + IMAGE_TAG)) {
				log.info("Docker image '{}' exists locally", IMAGE_NAME + ":" + IMAGE_TAG);
			} else {
				throw e;
			}
		} catch (DockerClientException e) {
			log.info("Error on Pulling '{}' image. Probably because the user has stopped the execution",
					IMAGE_NAME + ":" + IMAGE_TAG);
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
		CreateContainerCmd cmd = dockerClient.createContainerCmd(IMAGE_NAME + ":" + IMAGE_TAG).withName(containerName)
				.withEnv(envs).withNetworkMode("host").withVolumes(volume1)
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
		return this.getAllRecordingsFromHost();
	}

	public Collection<Recording> getStartingRecordings() {
		return this.startingRecordings.values();
	}

	public Collection<Recording> getStartedRecordings() {
		return this.startedRecordings.values();
	}

	public Collection<Recording> getFinishedRecordings() {
		return this.getAllRecordingsFromHost().stream()
				.filter(recording -> (recording.getStatus().equals(Recording.Status.stopped)
						|| recording.getStatus().equals(Recording.Status.available)))
				.collect(Collectors.toSet());
	}

	public File initRecordingPath() throws OpenViduException {
		try {
			Path path = Files.createDirectories(Paths.get(this.openviduConfig.getOpenViduRecordingPath()));

			if (!Files.isWritable(path)) {
				throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID,
						"The recording path '" + this.openviduConfig.getOpenViduRecordingPath()
								+ "' is not valid. Reason: OpenVidu Server process needs write permissions");
			}

			log.info("Recording path: {}", this.openviduConfig.getOpenViduRecordingPath());
			return path.toFile();
		} catch (IOException e) {
			throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID,
					"The recording path '" + this.openviduConfig.getOpenViduRecordingPath() + "' is not valid. Reason: "
							+ e.getClass().getName());
		}
	}

	private Recording getRecordingFromHost(String recordingId) {
		log.info(this.openviduConfig.getOpenViduRecordingPath() + RECORDING_ENTITY_FILE + recordingId);
		File file = new File(this.openviduConfig.getOpenViduRecordingPath() + RECORDING_ENTITY_FILE + recordingId);
		log.info("File exists: " + file.exists());
		return this.getRecordingFromEntityFile(file);
	}

	private Set<Recording> getAllRecordingsFromHost() {
		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();

		if (files == null) {
			files = initRecordingPath().listFiles();
		}

		Set<Recording> recordingEntities = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			Recording recording = this.getRecordingFromEntityFile(files[i]);
			if (recording != null) {
				if (openviduConfig.getOpenViduRecordingPublicAccess()) {
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

	private Set<String> getRecordingIdsFromHost() {
		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();

		if (files == null) {
			files = initRecordingPath().listFiles();
		}

		Set<String> fileNamesNoExtension = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isFile() && !files[i].getName().startsWith(RECORDING_ENTITY_FILE)) {
				fileNamesNoExtension.add(FilenameUtils.removeExtension(files[i].getName()));
			}
		}
		return fileNamesNoExtension;
	}

	public HttpStatus deleteRecordingFromHost(String recordingId, boolean force) {

		if (!force && (this.startedRecordings.containsKey(recordingId)
				|| this.startingRecordings.containsKey(recordingId))) {
			// Cannot delete an active recording
			return HttpStatus.CONFLICT;
		}

		Recording recording = getRecordingFromHost(recordingId);
		if (recording == null) {
			return HttpStatus.NOT_FOUND;
		}

		String name = getRecordingFromHost(recordingId).getName();

		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isFile() && isFileFromRecording(files[i], recordingId, name)) {
				files[i].delete();
			}
		}

		return HttpStatus.NO_CONTENT;
	}

	private Recording getRecordingFromEntityFile(File file) {
		if (file.isFile() && file.getName().startsWith(RECORDING_ENTITY_FILE)) {
			JsonObject json = null;
			try {
				json = new JsonParser().parse(new FileReader(file)).getAsJsonObject();
			} catch (IOException e) {
				return null;
			}
			return new Recording(json);
		}
		return null;
	}

	private boolean isFileFromRecording(File file, String recordingId, String recordingName) {
		return (((recordingId + ".info").equals(file.getName()))
				|| ((RECORDING_ENTITY_FILE + recordingId).equals(file.getName()))
				|| (recordingName + ".mp4").equals(file.getName()) || (recordingId + ".jpg").equals(file.getName()));
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

	private void waitForVideoFileNotEmpty(String videoName) {
		boolean isPresent = false;
		while (!isPresent) {
			try {
				Thread.sleep(150);
				File f = new File(this.openviduConfig.getOpenViduRecordingPath() + videoName + ".mp4");
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

	private String getLayoutUrl(Recording recording, String shortSessionId) {
		String secret = openviduConfig.getOpenViduSecret();
		String location = OpenViduServer.publicUrl.replaceFirst("wss://", "");
		String layout, finalUrl;

		if (RecordingLayout.CUSTOM.equals(recording.getRecordingLayout())) {
			layout = recording.getCustomLayout();
			if (!layout.isEmpty()) {
				layout = layout.startsWith("/") ? layout : ("/" + layout);
				layout = layout.endsWith("/") ? layout.substring(0, layout.length() - 1) : layout;
			}
			layout += "/index.html";
			finalUrl = "https://OPENVIDUAPP:" + secret + "@" + location + "/layouts/custom" + layout + "?sessionId="
					+ shortSessionId + "&secret=" + secret;
		} else {
			layout = recording.getRecordingLayout().name().toLowerCase().replaceAll("_", "-");
			finalUrl = "https://OPENVIDUAPP:" + secret + "@" + location + "/#/layout-" + layout + "/" + shortSessionId
					+ "/" + secret;
		}

		return finalUrl;
	}

	public void setRecordingVersion(String version) {
		this.IMAGE_TAG = version;
	}

	public void initAutomaticRecordingStopThread(String sessionId) {
		final String recordingId = this.sessionsRecordings.get(sessionId).getId();
		ScheduledFuture<?> future = this.automaticRecordingStopExecutor.schedule(() -> {
			log.info("Stopping recording {} after 2 minutes wait (no publisher published before timeout)", recordingId);
			this.stopRecording(null, recordingId, "lastParticipantLeft");
			this.automaticRecordingStopThreads.remove(sessionId);
		}, 2, TimeUnit.MINUTES);
		this.automaticRecordingStopThreads.putIfAbsent(sessionId, future);
	}

	public boolean abortAutomaticRecordingStopThread(String sessionId) {
		ScheduledFuture<?> future = this.automaticRecordingStopThreads.remove(sessionId);
		return future.cancel(false);
	}

}
