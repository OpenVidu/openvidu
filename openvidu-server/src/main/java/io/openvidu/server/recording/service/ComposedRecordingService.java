/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Volume;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.kurento.core.KurentoSession;
import io.openvidu.server.recording.CompositeWrapper;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingInfoUtils;
import io.openvidu.server.utils.DockerManager;

public class ComposedRecordingService extends RecordingService {

	private static final Logger log = LoggerFactory.getLogger(ComposedRecordingService.class);

	private Map<String, String> containers = new ConcurrentHashMap<>();
	private Map<String, String> sessionsContainers = new ConcurrentHashMap<>();
	private Map<String, CompositeWrapper> composites = new ConcurrentHashMap<>();

	private DockerManager dockerManager;

	public ComposedRecordingService(RecordingManager recordingManager, OpenviduConfig openviduConfig) {
		super(recordingManager, openviduConfig);
		this.dockerManager = new DockerManager();
	}

	@Override
	public Recording startRecording(Session session, RecordingProperties properties) throws OpenViduException {

		PropertiesRecordingId updatePropertiesAndRecordingId = this.setFinalRecordingNameAndGetFreeRecordingId(session,
				properties);
		properties = updatePropertiesAndRecordingId.properties;
		String recordingId = updatePropertiesAndRecordingId.recordingId;

		// Instantiate and store recording object
		Recording recording = new Recording(session.getSessionId(), recordingId, properties);
		this.recordingManager.startingRecordings.put(recording.getId(), recording);

		if (properties.hasVideo()) {
			// Docker container used
			recording = this.startRecordingWithVideo(session, recording, properties);
		} else {
			// Kurento composite used
			recording = this.startRecordingAudioOnly(session, recording, properties);
		}

		this.updateRecordingManagerCollections(session, recording);

		return recording;
	}

	@Override
	public Recording stopRecording(Session session, Recording recording, EndReason reason) {
		return this.stopRecording(session, recording, reason, false);
	}

	public Recording stopRecording(Session session, Recording recording, EndReason reason,
			boolean forceAfterKmsRestart) {
		if (recording.hasVideo()) {
			return this.stopRecordingWithVideo(session, recording, reason);
		} else {
			return this.stopRecordingAudioOnly(session, recording, reason, forceAfterKmsRestart);
		}
	}

	public void joinPublisherEndpointToComposite(Session session, String recordingId, Participant participant)
			throws OpenViduException {
		log.info("Joining single stream {} to Composite in session {}", participant.getPublisherStreamId(),
				session.getSessionId());

		KurentoParticipant kurentoParticipant = (KurentoParticipant) participant;
		CompositeWrapper compositeWrapper = this.composites.get(session.getSessionId());

		try {
			compositeWrapper.connectPublisherEndpoint(kurentoParticipant.getPublisher());
		} catch (OpenViduException e) {
			if (Code.RECORDING_START_ERROR_CODE.getValue() == e.getCodeValue()) {
				// First user publishing triggered RecorderEnpoint start, but it failed
				throw e;
			}
		}
	}

	public void removePublisherEndpointFromComposite(String sessionId, String streamId) {
		CompositeWrapper compositeWrapper = this.composites.get(sessionId);
		compositeWrapper.disconnectPublisherEndpoint(streamId);
	}

	private Recording startRecordingWithVideo(Session session, Recording recording, RecordingProperties properties)
			throws OpenViduException {

		log.info("Starting composed ({}) recording {} of session {}",
				properties.hasAudio() ? "video + audio" : "audio-only", recording.getId(), recording.getSessionId());

		List<String> envs = new ArrayList<>();

		String layoutUrl = this.getLayoutUrl(recording, this.getShortSessionId(session));

		envs.add("URL=" + layoutUrl);
		envs.add("ONLY_VIDEO=" + !properties.hasAudio());
		envs.add("RESOLUTION=" + properties.resolution());
		envs.add("FRAMERATE=30");
		envs.add("VIDEO_ID=" + recording.getId());
		envs.add("VIDEO_NAME=" + properties.name());
		envs.add("VIDEO_FORMAT=mp4");
		envs.add("RECORDING_JSON=" + recording.toJson().toString());

		log.info(recording.toJson().toString());
		log.info("Recorder connecting to url {}", layoutUrl);

		String containerId;
		try {
			final String container = RecordingManager.IMAGE_NAME + ":" + RecordingManager.IMAGE_TAG;
			final String containerName = "recording_" + recording.getId();
			Volume volume1 = new Volume("/recordings");
			Volume volume2 = new Volume("/dev/shm");
			List<Volume> volumes = new ArrayList<>();
			volumes.add(volume1);
			volumes.add(volume2);
			Bind bind1 = new Bind(openviduConfig.getOpenViduRecordingPath(), volume1);
			Bind bind2 = new Bind("/dev/shm", volume2);
			List<Bind> binds = new ArrayList<>();
			binds.add(bind1);
			binds.add(bind2);
			containerId = dockerManager.runContainer(container, containerName, volumes, binds, null, "host", envs);
			containers.put(containerId, containerName);
		} catch (Exception e) {
			this.cleanRecordingMaps(recording);
			throw this.failStartRecording(session, recording,
					"Couldn't initialize recording container. Error: " + e.getMessage());
		}

		this.sessionsContainers.put(session.getSessionId(), containerId);

		try {
			this.waitForVideoFileNotEmpty(recording);
		} catch (OpenViduException e) {
			this.cleanRecordingMaps(recording);
			throw this.failStartRecording(session, recording,
					"Couldn't initialize recording container. Error: " + e.getMessage());
		}

		return recording;
	}

	private Recording startRecordingAudioOnly(Session session, Recording recording, RecordingProperties properties)
			throws OpenViduException {

		log.info("Starting composed (audio-only) recording {} of session {}", recording.getId(),
				recording.getSessionId());

		CompositeWrapper compositeWrapper = new CompositeWrapper((KurentoSession) session,
				"file://" + this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/" + properties.name()
						+ ".webm");
		this.composites.put(session.getSessionId(), compositeWrapper);

		for (Participant p : session.getParticipants()) {
			if (p.isStreaming()) {
				try {
					this.joinPublisherEndpointToComposite(session, recording.getId(), p);
				} catch (OpenViduException e) {
					log.error("Error waiting for RecorderEndpooint of Composite to start in session {}",
							session.getSessionId());
					throw this.failStartRecording(session, recording, e.getMessage());
				}
			}
		}

		this.generateRecordingMetadataFile(recording);
		this.sendRecordingStartedNotification(session, recording);

		return recording;
	}

	private Recording stopRecordingWithVideo(Session session, Recording recording, EndReason reason) {

		log.info("Stopping composed ({}) recording {} of session {}. Reason: {}",
				recording.hasAudio() ? "video + audio" : "audio-only", recording.getId(), recording.getSessionId(),
				RecordingManager.finalReason(reason));

		String containerId = this.sessionsContainers.remove(recording.getSessionId());
		this.cleanRecordingMaps(recording);

		final String recordingId = recording.getId();

		if (session == null) {
			log.warn(
					"Existing recording {} does not have an active session associated. This usually means a custom recording"
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
				int i = 0;
				final int timeout = 30;
				while (!containerClosed && (i < timeout)) {
					containerIdAux = this.sessionsContainers.remove(session.getSessionId());
					if (containerIdAux == null) {
						try {
							log.warn("Waiting for container to be launched...");
							i++;
							Thread.sleep(500);
						} catch (InterruptedException e) {
							e.printStackTrace();
						}
					} else {
						log.warn("Removing container {} for closed session {}...", containerIdAux,
								session.getSessionId());
						dockerManager.stopDockerContainer(containerIdAux);
						dockerManager.removeDockerContainer(containerIdAux, false);
						containers.remove(containerId);
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
				if (i == timeout) {
					log.error("Container did not launched in {} seconds", timeout / 2);
					return;
				}
			}).start();

		} else {

			// Gracefully stop ffmpeg process
			try {
				dockerManager.runCommandInContainer(containerId, "echo 'q' > stop", 0);
			} catch (InterruptedException e1) {
				e1.printStackTrace();
			}

			// Wait for the container to be gracefully self-stopped
			final int timeOfWait = 30;
			try {
				dockerManager.waitForContainerStopped(containerId, timeOfWait);
			} catch (Exception e) {
				failRecordingCompletion(recording, containerId,
						new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE,
								"The recording completion process couldn't finish in " + timeOfWait + " seconds"));
			}

			// Remove container
			dockerManager.removeDockerContainer(containerId, false);
			containers.remove(containerId);

			// Update recording attributes reading from video report file
			try {
				RecordingInfoUtils infoUtils = new RecordingInfoUtils(
						this.openviduConfig.getOpenViduRecordingPath() + recordingId + "/" + recordingId + ".info");

				if (!infoUtils.hasVideo()) {
					log.error("COMPOSED recording {} with hasVideo=true has not video track", recordingId);
					recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				} else {
					recording.setStatus(io.openvidu.java.client.Recording.Status.stopped);
					recording.setDuration(infoUtils.getDurationInSeconds());
					recording.setSize(infoUtils.getSizeInBytes());
					recording.setResolution(infoUtils.videoWidth() + "x" + infoUtils.videoHeight());
					recording.setHasAudio(infoUtils.hasAudio());
					recording.setHasVideo(infoUtils.hasVideo());
				}

				infoUtils.deleteFilePath();

				recording = this.recordingManager.updateRecordingUrl(recording);

			} catch (IOException e) {
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				throw new OpenViduException(Code.RECORDING_REPORT_ERROR_CODE,
						"There was an error generating the metadata report file for the recording");
			}
			if (session != null && reason != null) {
				this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
			}
		}
		return recording;
	}

	private Recording stopRecordingAudioOnly(Session session, Recording recording, EndReason reason,
			boolean forceAfterKmsRestart) {

		log.info("Stopping composed (audio-only) recording {} of session {}. Reason: {}", recording.getId(),
				recording.getSessionId(), reason);

		String sessionId;
		if (session == null) {
			log.warn(
					"Existing recording {} does not have an active session associated. This means the recording "
							+ "has been automatically stopped after last user left and {} seconds timeout passed",
					recording.getId(), this.openviduConfig.getOpenviduRecordingAutostopTimeout());
			sessionId = recording.getSessionId();
		} else {
			sessionId = session.getSessionId();
		}

		CompositeWrapper compositeWrapper = this.composites.remove(sessionId);

		final CountDownLatch stoppedCountDown = new CountDownLatch(1);

		compositeWrapper.stopCompositeRecording(stoppedCountDown, forceAfterKmsRestart);
		try {
			if (!stoppedCountDown.await(5, TimeUnit.SECONDS)) {
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				log.error("Error waiting for RecorderEndpoint of Composite to stop in session {}",
						recording.getSessionId());
			}
		} catch (InterruptedException e) {
			recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
			log.error("Exception while waiting for state change", e);
		}

		compositeWrapper.disconnectAllPublisherEndpoints();

		this.cleanRecordingMaps(recording);

		String filesPath = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/";
		File videoFile = new File(filesPath + recording.getName() + ".webm");
		long finalSize = videoFile.length();
		double finalDuration = (double) compositeWrapper.getDuration() / 1000;

		this.updateFilePermissions(filesPath);

		this.sealRecordingMetadataFile(recording, finalSize, finalDuration,
				filesPath + RecordingManager.RECORDING_ENTITY_FILE + recording.getId());

		if (reason != null && session != null) {
			this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
		}

		return recording;
	}

	private void waitForVideoFileNotEmpty(Recording recording) throws OpenViduException {
		boolean isPresent = false;
		int i = 1;
		int timeout = 150; // Wait for 150*150 = 22500 = 22.5 seconds
		while (!isPresent && timeout <= 150) {
			try {
				Thread.sleep(150);
				timeout++;
				File f = new File(this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/"
						+ recording.getName() + ".mp4");
				isPresent = ((f.isFile()) && (f.length() > 0));
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
		if (i == timeout) {
			log.error("Recorder container failed generating video file (is empty) for session {}",
					recording.getSessionId());
			throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
					"Recorder container failed generating video file (is empty)");
		}
	}

	private void failRecordingCompletion(Recording recording, String containerId, OpenViduException e)
			throws OpenViduException {
		recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
		dockerManager.stopDockerContainer(containerId);
		dockerManager.removeDockerContainer(containerId, true);
		containers.remove(containerId);
		throw e;
	}

	private String getLayoutUrl(Recording recording, String shortSessionId) {
		String secret = openviduConfig.getOpenViduSecret();
		boolean recordingUrlDefined = openviduConfig.getOpenViduRecordingComposedUrl() != null
				&& !openviduConfig.getOpenViduRecordingComposedUrl().isEmpty();
		String recordingUrl = recordingUrlDefined ? openviduConfig.getOpenViduRecordingComposedUrl()
				: OpenViduServer.wsUrl;
		recordingUrl = recordingUrl.replaceFirst("wss://", "").replaceFirst("https://", "");
		boolean startsWithHttp = recordingUrl.startsWith("http://") || recordingUrl.startsWith("ws://");

		if (startsWithHttp) {
			recordingUrl = recordingUrl.replaceFirst("http://", "").replaceFirst("ws://", "");
		}

		if (recordingUrl.endsWith("/")) {
			recordingUrl = recordingUrl.substring(0, recordingUrl.length() - 1);
		}

		String layout, finalUrl;
		if (RecordingLayout.CUSTOM.equals(recording.getRecordingLayout())) {
			layout = recording.getCustomLayout();
			if (!layout.isEmpty()) {
				layout = layout.startsWith("/") ? layout : ("/" + layout);
				layout = layout.endsWith("/") ? layout.substring(0, layout.length() - 1) : layout;
			}
			layout += "/index.html";
			finalUrl = (startsWithHttp ? "http" : "https") + "://OPENVIDUAPP:" + secret + "@" + recordingUrl
					+ "/layouts/custom" + layout + "?sessionId=" + shortSessionId + "&secret=" + secret;
		} else {
			layout = recording.getRecordingLayout().name().toLowerCase().replaceAll("_", "-");
			int port = startsWithHttp ? 80 : 443;
			try {
				port = new URL(openviduConfig.getFinalUrl()).getPort();
			} catch (MalformedURLException e) {
				log.error(e.getMessage());
			}
			finalUrl = (startsWithHttp ? "http" : "https") + "://OPENVIDUAPP:" + secret + "@" + recordingUrl
					+ "/#/layout-" + layout + "/" + shortSessionId + "/" + secret + "/" + port + "/"
					+ !recording.hasAudio();
		}

		return finalUrl;
	}

}
