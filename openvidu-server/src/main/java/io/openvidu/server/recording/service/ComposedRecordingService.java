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

package io.openvidu.server.recording.service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import javax.ws.rs.ProcessingException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

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
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Session;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingInfoUtils;
import io.openvidu.server.utils.CommandExecutor;

public class ComposedRecordingService extends RecordingService {

	private static final Logger log = LoggerFactory.getLogger(ComposedRecordingService.class);

	private Map<String, String> containers = new ConcurrentHashMap<>();
	private Map<String, String> sessionsContainers = new ConcurrentHashMap<>();

	private final String IMAGE_NAME = "openvidu/openvidu-recording";
	private String IMAGE_TAG;

	private DockerClient dockerClient;

	public ComposedRecordingService(RecordingManager recordingManager, OpenviduConfig openviduConfig) {
		super(recordingManager, openviduConfig);
		DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
		this.dockerClient = DockerClientBuilder.getInstance(config).build();
	}

	@Override
	public Recording startRecording(Session session, RecordingProperties properties) throws OpenViduException {
		List<String> envs = new ArrayList<>();

		PropertiesRecordingId updatePropertiesAndRecordingId = this.setFinalRecordingNameAndGetFreeRecordingId(session,
				properties);
		properties = updatePropertiesAndRecordingId.properties;
		String recordingId = updatePropertiesAndRecordingId.recordingId;

		Recording recording = new Recording(session.getSessionId(), recordingId, properties);

		this.recordingManager.sessionsRecordings.put(session.getSessionId(), recording);
		this.recordingManager.sessionHandler.setRecordingStarted(session.getSessionId(), recording);
		this.recordingManager.startingRecordings.put(recording.getId(), recording);

		String uid = null;
		try {
			uid = System.getenv("MY_UID");
			if (uid == null) {
				uid = CommandExecutor.execCommand("/bin/sh", "-c", "id -u " + System.getProperty("user.name"));
			}
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}

		String layoutUrl = this.getLayoutUrl(recording, this.getShortSessionId(session));

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

		String containerId;
		try {
			containerId = this.runRecordingContainer(envs, "recording_" + recordingId);
		} catch (Exception e) {
			this.cleanRecordingMapsAndReturnContainerId(recording);
			throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
					"Couldn't initialize recording container. Error: " + e.getMessage());
		}

		this.waitForVideoFileNotEmpty(recording);

		this.sessionsContainers.put(session.getSessionId(), containerId);

		recording.setStatus(io.openvidu.java.client.Recording.Status.started);

		this.recordingManager.startedRecordings.put(recording.getId(), recording);
		this.recordingManager.startingRecordings.remove(recording.getId());

		return recording;
	}

	@Override
	public Recording stopRecording(Session session, Recording recording, String reason) {
		String containerId = cleanRecordingMapsAndReturnContainerId(recording);
		final String recordingId = recording.getId();

		if (session == null) {
			log.warn(
					"Existing recording {} does not have an active session associated. This usually means the recording"
							+ " layout did not join a recorded participant or the recording has been automatically"
							+ " stopped after last user left and timeout passed",
					recording.getId());
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
						log.warn("Deleting unusable files for recording {}", recordingId);
						if (HttpStatus.NO_CONTENT
								.equals(this.recordingManager.deleteRecordingFromHost(recordingId, true))) {
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
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				failRecordingCompletion(containerId, new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE,
						"The recording completion process has been unexpectedly interrupted"));
			}
			if (!stopped) {
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				failRecordingCompletion(containerId, new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE,
						"The recording completion process couldn't finish in 60 seconds"));
			}

			// Remove container
			this.removeDockerContainer(containerId);

			// Update recording attributes reading from video report file
			try {
				RecordingInfoUtils infoUtils = new RecordingInfoUtils(
						this.openviduConfig.getOpenViduRecordingPath() + recordingId + "/" + recordingId + ".info");

				recording.setStatus(io.openvidu.java.client.Recording.Status.stopped);
				recording.setDuration(infoUtils.getDurationInSeconds());
				recording.setSize(infoUtils.getSizeInBytes());
				recording.setHasAudio(infoUtils.hasAudio());
				recording.setHasVideo(infoUtils.hasVideo());

				infoUtils.deleteFilePath();

				recording = this.recordingManager.updateRecordingUrl(recording);

			} catch (IOException e) {
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				throw new OpenViduException(Code.RECORDING_REPORT_ERROR_CODE,
						"There was an error generating the metadata report file for the recording");
			}
			if (session != null) {
				this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
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

	private String runRecordingContainer(List<String> envs, String containerName) throws Exception {
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
			throw e;
		} catch (NotFoundException e) {
			log.error("Docker image {} couldn't be found in docker host", IMAGE_NAME + ":" + IMAGE_TAG);
			throw e;
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

	private void waitForVideoFileNotEmpty(Recording recording) {
		boolean isPresent = false;
		while (!isPresent) {
			try {
				Thread.sleep(150);
				File f = new File(this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/"
						+ recording.getName() + ".mp4");
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
		String location = OpenViduServer.wsUrl.replaceFirst("wss://", "");
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

	private String cleanRecordingMapsAndReturnContainerId(Recording recording) {
		this.recordingManager.sessionsRecordings.remove(recording.getSessionId());
		this.recordingManager.startedRecordings.remove(recording.getId());
		return this.sessionsContainers.remove(recording.getSessionId());
	}

	public void setRecordingContainerVersion(String version) {
		this.IMAGE_TAG = version;
	}

}
