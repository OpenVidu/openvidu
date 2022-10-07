/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.apache.http.NameValuePair;
import org.apache.http.client.utils.URLEncodedUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Volume;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.kurento.core.KurentoSession;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.recording.CompositeWrapper;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.recording.RecordingInfoUtils;
import io.openvidu.server.recording.RecordingUploader;
import io.openvidu.server.rest.RequestMappings;
import io.openvidu.server.utils.CustomFileManager;
import io.openvidu.server.utils.DockerManager;

public class ComposedRecordingService extends RecordingService {

	private static final Logger log = LoggerFactory.getLogger(ComposedRecordingService.class);

	protected Map<String, String> sessionsContainers = new ConcurrentHashMap<>();
	private Map<String, CompositeWrapper> composites = new ConcurrentHashMap<>();

	protected DockerManager dockerManager;

	public ComposedRecordingService(RecordingManager recordingManager, RecordingDownloader recordingDownloader,
			RecordingUploader recordingUploader, KmsManager kmsManager, CustomFileManager fileManager,
			OpenviduConfig openviduConfig, CallDetailRecord cdr, DockerManager dockerManager) {
		super(recordingManager, recordingDownloader, recordingUploader, kmsManager, fileManager, openviduConfig, cdr);
		this.dockerManager = dockerManager;
	}

	@Override
	public Recording startRecording(Session session, String recordingId, RecordingProperties properties)
			throws OpenViduException {

		// Instantiate and store recording object
		Recording recording = new Recording(session.getSessionId(), session.getUniqueSessionId(), recordingId,
				properties);
		this.recordingManager.recordingToStarting(recording);

		if (properties.hasVideo()) {
			// Docker container used
			recording = this.startRecordingWithVideo(session, recording, properties);
		} else {
			// Kurento composite used
			recording = this.startRecordingAudioOnly(session, recording, properties);
		}

		return recording;
	}

	@Override
	public Recording stopRecording(Session session, Recording recording, EndReason reason) {
		if (recording.hasVideo()) {
			return this.stopRecordingWithVideo(session, recording, reason);
		} else {
			return this.stopRecordingAudioOnly(session, recording, reason, null);
		}
	}

	public Recording stopRecording(Session session, Recording recording, EndReason reason, Long kmsDisconnectionTime) {
		if (recording.hasVideo()) {
			return this.stopRecordingWithVideo(session, recording, reason);
		} else {
			return this.stopRecordingAudioOnly(session, recording, reason, kmsDisconnectionTime);
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

	protected Recording startRecordingWithVideo(Session session, Recording recording, RecordingProperties properties)
			throws OpenViduException {

		log.info("Starting composed ({}) recording {} of session {}",
				properties.hasAudio() ? "video + audio" : "video-only", recording.getId(), recording.getSessionId());

		List<String> envs = new ArrayList<>();

		String layoutUrl = this.getLayoutUrl(recording);

		envs.add("DEBUG_MODE=" + openviduConfig.isOpenViduRecordingDebug());
		envs.add("URL=" + layoutUrl);
		envs.add("ONLY_VIDEO=" + !properties.hasAudio());
		envs.add("RESOLUTION=" + properties.resolution());
		envs.add("FRAMERATE=" + properties.frameRate());
		envs.add("VIDEO_ID=" + recording.getId());
		envs.add("VIDEO_NAME=" + properties.name());
		envs.add("VIDEO_FORMAT=mp4");
		envs.add("RECORDING_JSON=" + recording.toJson(true).toString());

		log.info(recording.toJson(true).toString());
		log.info("Recorder connecting to url {}", layoutUrl);

		String containerId;
		try {
			final String container = openviduConfig.getOpenviduRecordingImageRepo() + ":"
					+ openviduConfig.getOpenViduRecordingVersion();
			final String containerName = "recording_" + recording.getId().replace("~", "_");
			Volume volume1 = new Volume("/recordings");
			List<Volume> volumes = new ArrayList<>();
			volumes.add(volume1);
			Bind bind1 = new Bind(openviduConfig.getOpenViduRecordingPath(properties.mediaNode()), volume1);
			List<Bind> binds = new ArrayList<>();
			binds.add(bind1);
			containerId = dockerManager.runContainer(properties.mediaNode(), container, containerName, null, volumes,
					binds, "host", envs, null, properties.shmSize(), false, null,
					openviduConfig.isOpenviduRecordingGPUEnabled());
		} catch (Exception e) {
			this.cleanRecordingMaps(recording);
			throw this.failStartRecording(session, recording,
					"Couldn't initialize recording container. Error: " + e.getMessage());
		}

		this.sessionsContainers.put(session.getSessionId(), containerId);

		try {
			this.waitForVideoFileNotEmpty(recording);
		} catch (Exception e) {
			this.cleanRecordingMaps(recording);
			throw this.failStartRecording(session, recording,
					"Couldn't initialize recording container. Error: " + e.getMessage());
		}

		if (this.openviduConfig.isRecordingComposedExternal()) {
			this.generateRecordingMetadataFile(recording);
		}

		return recording;
	}

	private Recording startRecordingAudioOnly(Session session, Recording recording, RecordingProperties properties)
			throws OpenViduException {

		log.info("Starting composed (audio-only) recording {} of session {}", recording.getId(),
				recording.getSessionId());

		CompositeWrapper compositeWrapper = new CompositeWrapper((KurentoSession) session,
				"file://" + this.openviduConfig.getOpenViduRecordingPath(properties.mediaNode()) + recording.getId() + "/" + properties.name()
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

		return recording;
	}

	protected Recording stopRecordingWithVideo(Session session, Recording recording, EndReason reason) {

		log.info("Stopping composed ({}) recording {} of session {}. Reason: {}",
				recording.hasAudio() ? "video + audio" : "video-only", recording.getId(), recording.getSessionId(),
				RecordingManager.finalReason(reason));

		String containerId = this.sessionsContainers.remove(recording.getSessionId());

		final String recordingId = recording.getId();

		if (session == null) {
			log.warn(
					"Existing recording {} does not have an active session associated. This usually means a custom recording"
							+ " layout did not join a recorded participant or the recording has been automatically"
							+ " stopped after last user left and timeout passed",
					recording.getId());
		}

		if (containerId == null) {
			if (this.recordingManager.startingRecordings.containsKey(recordingId)) {

				// Session was closed while recording container was initializing
				// Wait until containerId is available and force its stop and deletion
				final Recording recordingAux = recording;
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
							dockerManager.removeContainer(recordingAux.getRecordingProperties().mediaNode(),
									containerIdAux, true);
							containerClosed = true;
							log.warn("Container {} for closed session {} succesfully stopped and removed",
									containerIdAux, session.getSessionId());
							log.warn("Deleting unusable files for recording {}", recordingId);
							if (HttpStatus.NO_CONTENT
									.equals(this.recordingManager.deleteRecordingFromHost(recordingId, true))) {
								log.warn("Files properly deleted for recording {}", recordingId);
							} else {
								log.warn("No files found for recording {}", recordingId);
							}
						}
					}
					cleanRecordingMaps(recordingAux);

					// Decrement active recordings
					kmsManager.decrementActiveRecordings(recordingAux.getRecordingProperties(), recordingId, session);

					if (i == timeout) {
						log.error("Container did not launched in {} seconds", timeout / 2);
						return;
					}
				}).start();
			}
		} else {

			stopAndRemoveRecordingContainer(recording, containerId, 30);

			if (session != null && reason != null) {
				this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
			}

			downloadComposedRecording(session, recording, reason);
		}

		return recording;
	}

	private Recording stopRecordingAudioOnly(Session session, Recording recording, EndReason reason,
			Long kmsDisconnectionTime) {

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
		compositeWrapper.stopCompositeRecording(stoppedCountDown, kmsDisconnectionTime);

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

		final Recording[] finalRecordingArray = new Recording[1];
		finalRecordingArray[0] = recording;
		try {
			this.recordingDownloader.downloadRecording(finalRecordingArray[0], null, () -> {

				String filesPath = this.openviduConfig.getOpenViduRecordingPath() + finalRecordingArray[0].getId()
						+ "/";
				File videoFile = new File(filesPath + finalRecordingArray[0].getName() + ".webm");
				long finalSize = videoFile.length();
				double finalDuration = (double) compositeWrapper.getDuration() / 1000;
				this.updateFilePermissions(filesPath);
				finalRecordingArray[0] = this.sealRecordingMetadataFileAsReady(finalRecordingArray[0], finalSize,
						finalDuration,
						filesPath + RecordingService.RECORDING_ENTITY_FILE + finalRecordingArray[0].getId());

				// Decrement active recordings once it is downloaded. This method will also drop
				// the Media Node if no more sessions or recordings and status is
				// waiting-idle-to-terminate
				kmsManager.decrementActiveRecordings(finalRecordingArray[0].getRecordingProperties(),
						finalRecordingArray[0].getId(), session);

				// Upload if necessary
				this.uploadRecording(finalRecordingArray[0], reason);

			});
		} catch (IOException e) {
			log.error("Error while downloading recording {}: {}", finalRecordingArray[0].getName(), e.getMessage());
		}

		if (reason != null && session != null) {
			this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, finalRecordingArray[0],
					reason);
		}

		return finalRecordingArray[0];
	}

	private void stopAndRemoveRecordingContainer(Recording recording, String containerId, int secondsOfWait) {
		// Gracefully stop ffmpeg process
		try {
			dockerManager.runCommandInContainerAsync(recording.getRecordingProperties().mediaNode(), containerId,
					"echo 'q' > stop");
		} catch (IOException e1) {
			e1.printStackTrace();
		}

		// Wait for the container to be gracefully self-stopped
		final int timeOfWait = 30;
		try {
			dockerManager.waitForContainerStopped(recording.getRecordingProperties().mediaNode(), containerId,
					timeOfWait);
		} catch (Exception e) {
			failRecordingCompletion(recording, containerId, true,
					new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE,
							"The recording completion process couldn't finish in " + timeOfWait + " seconds"));
		}

		// Remove container
		dockerManager.removeContainer(recording.getRecordingProperties().mediaNode(), containerId, false);
	}

	protected void updateRecordingAttributes(Recording recording) {
		try {
			RecordingInfoUtils infoUtils = new RecordingInfoUtils(this.openviduConfig.getOpenViduRecordingPath()
					+ recording.getId() + "/" + recording.getId() + RecordingService.COMPOSED_INFO_FILE_EXTENSION);

			if (!infoUtils.hasVideo()) {
				log.error("COMPOSED recording {} with hasVideo=true has not video track", recording.getId());
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
			} else {
				recording.setStatus(io.openvidu.java.client.Recording.Status.ready);
				recording.setDuration(infoUtils.getDurationInSeconds());
				recording.setSize(infoUtils.getSizeInBytes());
				recording.setResolution(infoUtils.videoWidth() + "x" + infoUtils.videoHeight());
				recording.setFrameRate(infoUtils.getVideoFramerate());
				recording.setHasAudio(infoUtils.hasAudio());
				recording.setHasVideo(infoUtils.hasVideo());
			}
			infoUtils.deleteFilePath();
		} catch (IOException e) {
			recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
			throw new OpenViduException(Code.RECORDING_REPORT_ERROR_CODE,
					"There was an error generating the metadata report file for the recording: " + e.getMessage());
		}
	}

	protected void waitForVideoFileNotEmpty(Recording recording) throws Exception {
		final String VIDEO_FILE = this.openviduConfig.getOpenViduRecordingPath(recording.getRecordingProperties().mediaNode()) + recording.getId() + "/"
				+ recording.getName() + RecordingService.COMPOSED_RECORDING_EXTENSION;
		this.fileManager.waitForFileToExistAndNotEmpty(recording.getRecordingProperties().mediaNode(), VIDEO_FILE);
		log.info("File {} exists and is not empty", VIDEO_FILE);
	}

	protected void failRecordingCompletion(Recording recording, String containerId, boolean removeContainer,
			OpenViduException e) throws OpenViduException {
		recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
		if (removeContainer) {
			dockerManager.removeContainer(recording.getRecordingProperties().mediaNode(), containerId, true);
		}
		sealRecordingMetadataFileAsReady(recording, recording.getSize(), recording.getDuration(),
				getMetadataFilePath(recording));
		cleanRecordingMaps(recording);
		throw e;
	}

	protected String getLayoutUrl(Recording recording) throws OpenViduException {
		String secret = openviduConfig.getOpenViduSecret();

		// Check if "customLayout" property defines a final URL
		if (RecordingLayout.CUSTOM.equals(recording.getRecordingLayout())) {
			String layout = recording.getCustomLayout();
			if (!layout.isEmpty()) {
				try {
					URL url = new URL(layout);
					log.info("\"customLayout\" property has a URL format ({}). Using it to connect to custom layout",
							url.toString());
					return this.processCustomLayoutUrlFormat(url, recording.getSessionId());
				} catch (MalformedURLException e) {
					String layoutPath = openviduConfig.getOpenviduRecordingCustomLayout() + layout;
					layoutPath = layoutPath.endsWith("/") ? layoutPath : (layoutPath + "/");
					log.info(
							"\"customLayout\" property is defined as \"{}\". Using a different custom layout than the default one. Expected path: {}",
							layout, layoutPath + "index.html");
					try {
						final File indexHtml = new File(layoutPath + "index.html");
						if (!indexHtml.exists()) {
							throw new IOException();
						}
						log.info("Custom layout path \"{}\" is valid. Found file {}", layout,
								indexHtml.getAbsolutePath());
					} catch (IOException e1) {
						final String error = "Custom layout path " + layout + " is not valid. Expected file "
								+ layoutPath + "index.html to exist and be readable";
						log.error(error);
						throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID, error);
					}
				}
			}
		}

		boolean recordingComposedUrlDefined = openviduConfig.getOpenViduRecordingComposedUrl() != null
				&& !openviduConfig.getOpenViduRecordingComposedUrl().isEmpty();
		String recordingUrl = recordingComposedUrlDefined ? openviduConfig.getOpenViduRecordingComposedUrl()
				: openviduConfig.getFinalUrl();
		recordingUrl = recordingUrl.replaceFirst("https://", "");
		boolean startsWithHttp = recordingUrl.startsWith("http://");

		if (startsWithHttp) {
			recordingUrl = recordingUrl.replaceFirst("http://", "");
		}

		if (recordingUrl.endsWith("/")) {
			recordingUrl = recordingUrl.substring(0, recordingUrl.length() - 1);
		}

		String layout, finalUrl;
		final String basicauth = openviduConfig.isOpenviduRecordingComposedBasicauth() ? ("OPENVIDUAPP:" + secret + "@")
				: "";
		if (RecordingLayout.CUSTOM.equals(recording.getRecordingLayout())) {
			layout = recording.getCustomLayout();
			if (!layout.isEmpty()) {
				layout = layout.startsWith("/") ? layout : ("/" + layout);
				layout = layout.endsWith("/") ? layout.substring(0, layout.length() - 1) : layout;
			}
			layout += "/index.html";
			finalUrl = (startsWithHttp ? "http" : "https") + "://" + basicauth + recordingUrl
					+ RequestMappings.CUSTOM_LAYOUTS + layout + "?sessionId=" + recording.getSessionId() + "&secret="
					+ secret;
		} else {
			layout = recording.getRecordingLayout().name().toLowerCase().replaceAll("_", "-");
			int port = startsWithHttp ? 80 : 443;
			try {
				port = new URL(openviduConfig.getFinalUrl()).getPort();
			} catch (MalformedURLException e) {
				log.error(e.getMessage());
			}
			String defaultPathForDefaultLayout = recordingComposedUrlDefined ? ""
					: (openviduConfig.getOpenViduFrontendDefaultPath());
			finalUrl = (startsWithHttp ? "http" : "https") + "://" + basicauth + recordingUrl
					+ defaultPathForDefaultLayout + "/#/layout-" + layout + "/" + recording.getSessionId() + "/"
					+ secret + "/" + port + "/" + !recording.hasAudio();
		}

		return finalUrl;
	}

	private String processCustomLayoutUrlFormat(URL url, String shortSessionId) {
		String finalUrl = url.getProtocol() + "://" + url.getAuthority();
		if (!url.getPath().isEmpty()) {
			finalUrl += url.getPath();
		}
		finalUrl = finalUrl.endsWith("/") ? finalUrl.substring(0, finalUrl.length() - 1) : finalUrl;
		if (url.getQuery() != null) {
			URI uri;
			try {
				uri = url.toURI();
				finalUrl += "?";
			} catch (URISyntaxException e) {
				String error = "\"customLayout\" property has URL format and query params (" + url.toString()
						+ "), but does not comply with RFC2396 URI format";
				log.error(error);
				throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID, error);
			}
			List<NameValuePair> params = URLEncodedUtils.parse(uri, Charset.forName("UTF-8"));
			Iterator<NameValuePair> it = params.iterator();
			boolean hasSessionId = false;
			boolean hasSecret = false;
			while (it.hasNext()) {
				NameValuePair param = it.next();
				finalUrl += param.getName() + "=" + param.getValue();
				if (it.hasNext()) {
					finalUrl += "&";
				}
				if (!hasSessionId) {
					hasSessionId = param.getName().equals("sessionId");
				}
				if (!hasSecret) {
					hasSecret = param.getName().equals("secret");
				}
			}
			if (!hasSessionId) {
				finalUrl += "&sessionId=" + shortSessionId;
			}
			if (!hasSecret) {
				finalUrl += "&secret=" + openviduConfig.getOpenViduSecret();
			}
		}

		if (url.getRef() != null) {
			finalUrl += "#" + url.getRef();
		}

		return finalUrl;
	}

	protected void downloadComposedRecording(final Session session, final Recording recording, final EndReason reason) {
		try {
			this.recordingDownloader.downloadRecording(recording, null, () -> {

				updateRecordingAttributes(recording);

				this.sealRecordingMetadataFileAsReady(recording, recording.getSize(), recording.getDuration(),
						getMetadataFilePath(recording));
				cleanRecordingMaps(recording);

				// Decrement active recordings once it is downloaded. This method will also drop
				// the Media Node if no more sessions or recordings and status is
				// waiting-idle-to-terminate
				kmsManager.decrementActiveRecordings(recording.getRecordingProperties(), recording.getId(), session);

				// Upload if necessary
				this.uploadRecording(recording, reason);
			});
		} catch (IOException e) {
			log.error("Error while downloading recording {}: {}", recording.getName(), e.getMessage());
		}
	}

}
