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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;

import org.apache.commons.io.FileUtils;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaProfileSpecType;
import org.kurento.client.RecorderEndpoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import com.google.gson.JsonIOException;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.Recording.OutputMode;
import io.openvidu.java.client.Recording.Status;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.MediaServer;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.kms.Kms;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.recording.RecordingUploader;
import io.openvidu.server.recording.service.RecordingService.PropertiesRecordingId;
import io.openvidu.server.utils.CustomFileManager;
import io.openvidu.server.utils.DockerManager;
import io.openvidu.server.utils.JsonUtils;
import io.openvidu.server.utils.LocalCustomFileManager;
import io.openvidu.server.utils.LocalDockerManager;
import io.openvidu.server.utils.RemoteOperationUtils;

public class RecordingManager {

	private static final Logger log = LoggerFactory.getLogger(RecordingManager.class);

	private ComposedRecordingService composedRecordingService;
	private ComposedQuickStartRecordingService composedQuickStartRecordingService;
	private SingleStreamRecordingService singleStreamRecordingService;
	private DockerManager dockerManager;
	private CustomFileManager fileManager;

	@Autowired
	protected SessionEventsHandler sessionHandler;

	@Autowired
	private SessionManager sessionManager;

	@Autowired
	protected RecordingManagerUtils recordingManagerUtils;

	@Autowired
	private RecordingDownloader recordingDownloader;

	@Autowired
	private RecordingUploader recordingUploader;

	@Autowired
	protected OpenviduConfig openviduConfig;

	@Autowired
	private KmsManager kmsManager;

	@Autowired
	private CallDetailRecord cdr;

	protected Map<String, Recording> startingRecordings = new ConcurrentHashMap<>();
	protected Map<String, Recording> startedRecordings = new ConcurrentHashMap<>();
	protected Map<String, Recording> sessionsRecordings = new ConcurrentHashMap<>();
	protected Map<String, Recording> sessionsRecordingsStarting = new ConcurrentHashMap<>();
	private final Map<String, ScheduledFuture<?>> automaticRecordingStopThreads = new ConcurrentHashMap<>();

	private JsonUtils jsonUtils = new JsonUtils();

	private ScheduledExecutorService automaticRecordingStopExecutor = Executors
			.newScheduledThreadPool(Runtime.getRuntime().availableProcessors());

	private static final List<EndReason> LAST_PARTICIPANT_LEFT_REASONS = Arrays
			.asList(new EndReason[] { EndReason.disconnect, EndReason.forceDisconnectByUser,
					EndReason.forceDisconnectByServer, EndReason.networkDisconnect });

	public RecordingManager(DockerManager dockerManager, CustomFileManager fileManager) {
		this.dockerManager = dockerManager;
		this.fileManager = fileManager;
	}

	@PostConstruct
	public void init() {
		if (this.openviduConfig.isRecordingModuleEnabled()) {
			log.info("OpenVidu recording service is enabled");
			try {
				this.initializeRecordingManager();
			} catch (OpenViduException e) {
				String finalErrorMessage = "";
				if (e.getCodeValue() == Code.DOCKER_NOT_FOUND.getValue()) {
					finalErrorMessage = "Error connecting to Docker daemon. Enabling OpenVidu recording module requires Docker";
				} else if (e.getCodeValue() == Code.RECORDING_PATH_NOT_VALID.getValue()) {
					finalErrorMessage = "Error initializing recording path \""
							+ this.openviduConfig.getOpenViduRecordingPath()
							+ "\" set with system property \"OPENVIDU_RECORDING_PATH\"";
				} else if (e.getCodeValue() == Code.RECORDING_FILE_EMPTY_ERROR.getValue()) {
					finalErrorMessage = "Error initializing recording custom layouts path \""
							+ this.openviduConfig.getOpenviduRecordingCustomLayout()
							+ "\" set with system property \"OPENVIDU_RECORDING_CUSTOM_LAYOUT\"";
				}
				log.error(finalErrorMessage + ". Shutting down OpenVidu Server");
				Runtime.getRuntime().halt(1);
			}
		} else {
			log.info("OpenVidu recording service is disabled");
		}
	}

	public void initializeRecordingManager() throws OpenViduException {

		this.dockerManager.init();

		this.composedRecordingService = new ComposedRecordingService(this, recordingDownloader, recordingUploader,
				kmsManager, fileManager, openviduConfig, cdr, this.dockerManager);
		this.composedQuickStartRecordingService = new ComposedQuickStartRecordingService(this, recordingDownloader,
				recordingUploader, kmsManager, fileManager, openviduConfig, cdr, this.dockerManager);
		this.singleStreamRecordingService = new SingleStreamRecordingService(this, recordingDownloader,
				recordingUploader, kmsManager, fileManager, openviduConfig, cdr);

		this.checkRecordingRequirements(this.openviduConfig.getOpenViduRecordingPath(),
				this.openviduConfig.getOpenviduRecordingCustomLayout());

		LocalDockerManager dockMng = new LocalDockerManager(true);

		if (!openviduConfig.isRecordingComposedExternal()) {
			downloadRecordingImageToLocal(dockMng);
		}

		// Clean any stranded openvidu/openvidu-recording container on startup
		dockMng.cleanStrandedContainers(openviduConfig.getOpenviduRecordingImageRepo());
	}

	public void checkRecordingRequirements(String openviduRecordingPath, String openviduRecordingCustomLayout)
			throws OpenViduException {
		LocalDockerManager dockerManager = null;
		try {
			dockerManager = new LocalDockerManager(true);
			dockerManager.checkDockerEnabled();
		} catch (OpenViduException e) {
			String message = e.getMessage();
			if ("docker".equals(openviduConfig.getSpringProfile())) {
				final String NEW_LINE = System.getProperty("line.separator");
				message += ": make sure you include the following flags in your \"docker run\" command:" + NEW_LINE
						+ "    -e OPENVIDU_RECORDING_PATH=/YOUR/PATH/TO/VIDEO/FILES" + NEW_LINE
						+ "    -e MY_UID=$(id -u $USER)" + NEW_LINE + "    -v /var/run/docker.sock:/var/run/docker.sock"
						+ NEW_LINE + "    -v /YOUR/PATH/TO/VIDEO/FILES:/YOUR/PATH/TO/VIDEO/FILES" + NEW_LINE;
			} else {
				message += ": you need Docker CE installed in this machine to enable OpenVidu recording service. "
						+ "If Docker CE is already installed, make sure to add OpenVidu Server user to "
						+ "\"docker\" group: " + System.lineSeparator() + "   1) $ sudo usermod -aG docker $USER"
						+ System.lineSeparator()
						+ "   2) Log out and log back to the host to reevaluate group membership";
			}
			log.error(message);
			throw e;
		} finally {
			dockerManager.close();
		}
		this.checkRecordingPaths(openviduRecordingPath, openviduRecordingCustomLayout);
	}

	private void downloadRecordingImageToLocal(LocalDockerManager dockMng) {
		log.info("Recording module required: Downloading openvidu/openvidu-recording:"
				+ openviduConfig.getOpenViduRecordingVersion() + " Docker image (350MB aprox)");

		if (dockMng.dockerImageExistsLocally(
				openviduConfig.getOpenviduRecordingImageRepo() + ":" + openviduConfig.getOpenViduRecordingVersion())) {
			log.info("Docker image already exists locally");
		} else {
			Thread t = new Thread(() -> {
				boolean keep = true;
				log.info("Downloading ");
				while (keep) {
					System.out.print(".");
					try {
						Thread.sleep(1000);
					} catch (InterruptedException e) {
						keep = false;
						log.info("\nDownload complete");
					}
				}
			});
			t.start();
			try {
				dockMng.downloadDockerImage(openviduConfig.getOpenviduRecordingImageRepo() + ":"
						+ openviduConfig.getOpenViduRecordingVersion(), 600);
			} catch (Exception e) {
				log.error("Error downloading docker image {}:{}", openviduConfig.getOpenviduRecordingImageRepo(),
						openviduConfig.getOpenViduRecordingVersion());
			}
			t.interrupt();
			try {
				t.join();
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
			log.info("Docker image available");
		}
	}

	public void startComposedQuickStartContainer(Session session) {
		this.composedQuickStartRecordingService.runComposedQuickStartContainer(session);
	}

	public void stopComposedQuickStartContainer(Session session, EndReason reason) {
		this.composedQuickStartRecordingService.stopRecordingContainer(session, reason);
	}

	public Recording startRecording(Session session, RecordingProperties properties) throws OpenViduException {

		String recordingId = null;

		try {
			PropertiesRecordingId updatePropertiesAndRecordingId = ((RecordingService) this.composedRecordingService)
					.setFinalRecordingNameAndGetFreeRecordingId(session, properties);
			properties = updatePropertiesAndRecordingId.properties;
			recordingId = updatePropertiesAndRecordingId.recordingId;

			// INCREMENT ACTIVE RECORDINGS OF MEDIA NODE HERE. IF MEDIA NODE IS NOT
			// AVAILABLE FOR STARTING NEW RECORDINGS THIS METHOD THROWS AN EXCEPTION
			kmsManager.incrementActiveRecordings(properties, recordingId, session);

			try {
				if (session.recordingLock.tryLock(15, TimeUnit.SECONDS)) {
					try {
						if (sessionIsBeingRecorded(session.getSessionId())) {
							throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
									"Concurrent start of recording for session " + session.getSessionId());
						} else {
							Recording recording = null;
							switch (properties.outputMode()) {
							case COMPOSED:
								recording = this.composedRecordingService.startRecording(session, recordingId,
										properties);
								break;
							case COMPOSED_QUICK_START:
								recording = this.composedQuickStartRecordingService.startRecording(session, recordingId,
										properties);
								break;
							case INDIVIDUAL:
								recording = this.singleStreamRecordingService.startRecording(session, recordingId,
										properties);
								break;
							}
							this.recordingFromStartingToStarted(recording);

							this.cdr.recordRecordingStatusChanged(recording, null, recording.getCreatedAt(),
									Status.started);

							if (!(OutputMode.COMPOSED.equals(properties.outputMode()) && properties.hasVideo())) {
								// Directly send recording started notification for all cases except for
								// COMPOSED recordings with video (will be sent on first RECORDER subscriber)
								// Both INDIVIDUAL and COMPOSED_QUICK_START should notify immediately
								this.sessionHandler.sendRecordingStartedNotification(session, recording);
							}
							if (session.getActivePublishers() == 0) {
								// Init automatic recording stop if no publishers when starting the recording
								log.info(
										"No publisher in session {}. Starting {} seconds countdown for stopping recording",
										session.getSessionId(),
										this.openviduConfig.getOpenviduRecordingAutostopTimeout());
								this.initAutomaticRecordingStopThread(session);
							}
							return recording;
						}
					} finally {
						session.recordingLock.unlock();
					}
				} else {
					throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
							"Timeout waiting for recording Session lock to be available for session "
									+ session.getSessionId());
				}
			} catch (InterruptedException e) {
				throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
						"InterruptedException waiting for recording Session lock to be available for session "
								+ session.getSessionId());
			}
		} catch (Exception e) {
			// DECREMENT ACTIVE RECORDINGS OF MEDIA NODE AND TRY REMOVE MEDIA NODE HERE
			kmsManager.decrementActiveRecordings(properties, recordingId, session);
			throw e;
		}
	}

	public Recording stopRecording(Session session, String recordingId, EndReason reason) {
		Recording recording;
		if (session == null) {
			recording = this.startedRecordings.get(recordingId);
		} else {
			recording = this.sessionsRecordings.get(session.getSessionId());
		}

		if (recording == null) {
			recording = this.sessionsRecordingsStarting.get(session.getSessionId());
			if (recording == null) {
				log.error("Cannot stop recording. Session {} is not being recorded", recordingId,
						session.getSessionId());
				return null;
			} else {
				// Recording is still starting
				log.warn("Recording {} is still in \"starting\" status", recording.getId());
			}
		}

		((RecordingService) singleStreamRecordingService).sealRecordingMetadataFileAsStopped(recording);
		final long timestamp = System.currentTimeMillis();
		this.cdr.recordRecordingStatusChanged(recording, reason, timestamp, Status.stopped);

		switch (recording.getOutputMode()) {
		case COMPOSED:
			recording = this.composedRecordingService.stopRecording(session, recording, reason);
			break;
		case COMPOSED_QUICK_START:
			recording = this.composedQuickStartRecordingService.stopRecording(session, recording, reason);
			break;
		case INDIVIDUAL:
			recording = this.singleStreamRecordingService.stopRecording(session, recording, reason);
			break;
		}
		this.abortAutomaticRecordingStopThread(session, reason);
		return recording;
	}

	public Recording forceStopRecording(Session session, EndReason reason, Long kmsDisconnectionTime) {
		Recording recording = this.sessionsRecordings.get(session.getSessionId());

		((RecordingService) singleStreamRecordingService).sealRecordingMetadataFileAsStopped(recording);
		final long timestamp = System.currentTimeMillis();
		this.cdr.recordRecordingStatusChanged(recording, reason, timestamp, Status.stopped);

		switch (recording.getOutputMode()) {
		case COMPOSED:
			recording = this.composedRecordingService.stopRecording(session, recording, reason, kmsDisconnectionTime);
			if (recording.hasVideo()) {
				// Evict the recorder participant if composed recording with video
				this.sessionManager.evictParticipant(
						session.getParticipantByPublicId(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID), null, null,
						null);
			}
			break;
		case COMPOSED_QUICK_START:
			recording = this.composedQuickStartRecordingService.stopRecording(session, recording, reason,
					kmsDisconnectionTime);
			if (recording.hasVideo()) {
				// Evict the recorder participant if composed recording with video
				this.sessionManager.evictParticipant(
						session.getParticipantByPublicId(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID), null, null,
						null);
			}
			break;
		case INDIVIDUAL:
			recording = this.singleStreamRecordingService.stopRecording(session, recording, reason,
					kmsDisconnectionTime);
			break;
		}
		this.abortAutomaticRecordingStopThread(session, reason);
		return recording;
	}

	public void startOneIndividualStreamRecording(Session session, Participant participant) {
		Recording recording = this.sessionsRecordings.get(session.getSessionId());
		if (recording == null) {
			recording = this.sessionsRecordingsStarting.get(session.getSessionId());
			if (recording == null) {
				log.error("Cannot start recording of new stream {}. Session {} is not being recorded",
						participant.getPublisherStreamId(), session.getSessionId());
				return;
			}
		}
		if (OutputMode.INDIVIDUAL.equals(recording.getOutputMode())) {
			// Start new RecorderEndpoint for this stream
			log.info("Starting new RecorderEndpoint in session {} for new stream of participant {}",
					session.getSessionId(), participant.getParticipantPublicId());

			MediaProfileSpecType profile = null;
			try {
				profile = this.singleStreamRecordingService.generateMediaProfile(recording.getRecordingProperties(),
						participant);
			} catch (OpenViduException e) {
				log.error("Cannot start single stream recorder for stream {} in session {}: {}",
						participant.getPublisherStreamId(), session.getSessionId(), e.getMessage());
				return;
			}

			this.singleStreamRecordingService.startRecorderEndpointForPublisherEndpoint(recording.getId(), profile,
					participant, new CountDownLatch(1));
		} else if (RecordingProperties.IS_COMPOSED(recording.getOutputMode()) && !recording.hasVideo()) {
			// Connect this stream to existing Composite recorder
			log.info("Joining PublisherEndpoint to existing Composite in session {} for new stream of participant {}",
					session.getSessionId(), participant.getParticipantPublicId());
			this.composedRecordingService.joinPublisherEndpointToComposite(session, recording.getId(), participant);
		}
	}

	public void stopOneIndividualStreamRecording(Session session, String streamId, Long kmsDisconnectionTime) {
		Recording recording = this.sessionsRecordings.get(session.getSessionId());
		if (recording == null) {
			recording = this.sessionsRecordingsStarting.get(session.getSessionId());
			if (recording == null) {
				log.error("Cannot stop recording of existing stream {}. Session {} is not being recorded", streamId,
						session.getSessionId());
				return;
			} else {
				// Recording is still starting
				log.warn("Recording {} is still in \"starting\" status", recording.getId());
			}
		}
		if (OutputMode.INDIVIDUAL.equals(recording.getOutputMode())) {
			// Stop specific RecorderEndpoint for this stream
			log.info("Stopping RecorderEndpoint in session {} for stream of participant {}", session.getSessionId(),
					streamId);
			final CountDownLatch stoppedCountDown = new CountDownLatch(1);
			this.singleStreamRecordingService.stopRecorderEndpointOfPublisherEndpoint(recording.getId(), streamId,
					stoppedCountDown, kmsDisconnectionTime);
			try {
				if (!stoppedCountDown.await(5, TimeUnit.SECONDS)) {
					log.error("Error waiting for recorder endpoint of stream {} to stop in session {}", streamId,
							session.getSessionId());
				}
			} catch (InterruptedException e) {
				log.error("Exception while waiting for state change", e);
			}
		} else if (RecordingProperties.IS_COMPOSED(recording.getOutputMode()) && !recording.hasVideo()) {
			// Disconnect this stream from existing Composite recorder
			log.info("Removing PublisherEndpoint from Composite in session {} for stream of participant {}",
					session.getSessionId(), streamId);
			this.composedRecordingService.removePublisherEndpointFromComposite(session.getSessionId(), streamId);
		}
	}

	public boolean sessionIsBeingRecorded(String sessionId) {
		return (this.sessionsRecordings.get(sessionId) != null
				|| this.sessionsRecordingsStarting.get(sessionId) != null);
	}

	public Recording getActiveRecordingForSession(String sessionId) {
		Recording recording = this.sessionsRecordings.get(sessionId);
		if (recording == null) {
			recording = this.sessionsRecordingsStarting.get(sessionId);
		}
		return recording;
	}

	public boolean sessionIsBeingRecordedIndividual(String sessionId) {
		if (!sessionIsBeingRecorded(sessionId)) {
			return false;
		} else {
			Recording recording = this.sessionsRecordings.get(sessionId);
			if (recording == null) {
				recording = this.sessionsRecordingsStarting.get(sessionId);
			}
			return OutputMode.INDIVIDUAL.equals(recording.getOutputMode());
		}
	}

	public Recording getStartedRecording(String recordingId) {
		return this.startedRecordings.get(recordingId);
	}

	public Recording getStartingRecording(String recordingId) {
		return this.startingRecordings.get(recordingId);
	}

	public Collection<Recording> getFinishedRecordings() {
		return recordingManagerUtils.getAllRecordingsFromStorage().stream()
				.filter(recording -> recording.getStatus().equals(Status.ready)).collect(Collectors.toSet());
	}

	public Recording getRecording(String recordingId) {
		return recordingManagerUtils.getRecordingFromStorage(recordingId);
	}

	public Collection<Recording> getAllRecordings() {
		return recordingManagerUtils.getAllRecordingsFromStorage();
	}

	public String getFreeRecordingId(String sessionId) {
		log.info("Getting free recording id for session {}", sessionId);
		String recordingId = recordingManagerUtils.getFreeRecordingId(sessionId);
		log.info("Free recording id got for session {}: {}", sessionId, recordingId);
		return recordingId;
	}

	public HttpStatus deleteRecordingFromHost(String recordingId, boolean force) {

		if (this.startedRecordings.containsKey(recordingId) || this.startingRecordings.containsKey(recordingId)) {
			if (!force) {
				// Cannot delete an active recording
				return HttpStatus.CONFLICT;
			}
		}

		Recording recording = recordingManagerUtils.getRecordingFromStorage(recordingId);
		if (recording == null) {
			return HttpStatus.NOT_FOUND;
		}
		if (Status.stopped.equals(recording.getStatus())) {
			// Recording is being downloaded from remote host or being uploaded
			log.warn("Recording {} status is \"stopped\". Cancelling possible ongoing download process",
					recording.getId());
			this.recordingDownloader.cancelDownload(recording.getId());
		}

		return recordingManagerUtils.deleteRecordingFromStorage(recordingId);
	}

	public Set<String> getAllRecordingIdsFromLocalStorage() {
		File folder = new File(openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();

		Set<String> fileNamesNoExtension = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isDirectory()) {
				File[] innerFiles = files[i].listFiles();
				for (int j = 0; j < innerFiles.length; j++) {
					if (innerFiles[j].isFile()
							&& innerFiles[j].getName().startsWith(RecordingService.RECORDING_ENTITY_FILE)) {
						fileNamesNoExtension
								.add(innerFiles[j].getName().replaceFirst(RecordingService.RECORDING_ENTITY_FILE, ""));
						break;
					}
				}
			}
		}
		return fileNamesNoExtension;
	}

	public HttpStatus deleteRecordingFromLocalStorage(String recordingId) {
		File folder = new File(openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isDirectory() && files[i].getName().equals(recordingId)) {
				// Correct folder. Delete it
				try {
					FileUtils.deleteDirectory(files[i]);
					return HttpStatus.NO_CONTENT;
				} catch (IOException e) {
					log.error("Couldn't delete folder {}", files[i].getAbsolutePath());
					return HttpStatus.INTERNAL_SERVER_ERROR;
				}
			}
		}
		return HttpStatus.NOT_FOUND;
	}

	public File getRecordingEntityFileFromLocalStorage(String recordingId) {
		String metadataFilePath = openviduConfig.getOpenViduRecordingPath() + recordingId + "/"
				+ RecordingService.RECORDING_ENTITY_FILE + recordingId;
		return new File(metadataFilePath);
	}

	public Set<Recording> getAllRecordingsFromLocalStorage() {
		File folder = new File(openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();
		Set<Recording> recordingEntities = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isDirectory()) {
				File[] innerFiles = files[i].listFiles();
				for (int j = 0; j < innerFiles.length; j++) {
					Recording recording = getRecordingFromEntityFile(innerFiles[j]);
					if (recording != null) {
						recordingEntities.add(recording);
					}
				}
			}
		}
		return recordingEntities;
	}

	public Recording getRecordingFromEntityFile(File file) {
		if (file.isFile() && file.getName().startsWith(RecordingService.RECORDING_ENTITY_FILE)) {
			JsonObject json;
			try {
				json = jsonUtils.fromFileToJsonObject(file.getAbsolutePath());
			} catch (JsonIOException | JsonSyntaxException | IOException e) {
				log.error("Error reading recording entity file {}: {}", file.getAbsolutePath(), (e.getMessage()));
				return null;
			}
			return getRecordingFromJson(json);
		}
		return null;
	}

	public Recording getRecordingFromJson(JsonObject json) {
		Recording recording = new Recording(json);
		if (Status.ready.equals(recording.getStatus())
				&& composedQuickStartRecordingService.isBeingUploaded(recording)) {
			// Recording has finished but is being uploaded
			recording.setStatus(Status.stopped);
		} else if (Status.ready.equals(recording.getStatus()) || Status.failed.equals(recording.getStatus())) {
			// Recording has been completely processed and must include URL
			recording.setUrl(recordingManagerUtils.getRecordingUrl(recording));
		}
		return recording;
	}

	public String getRecordingUrl(Recording recording) {
		return recordingManagerUtils.getRecordingUrl(recording);
	}

	public void initAutomaticRecordingStopThread(final Session session) {
		final String recordingId = this.sessionsRecordings.get(session.getSessionId()).getId();

		this.automaticRecordingStopThreads.computeIfAbsent(session.getSessionId(), f -> {

			ScheduledFuture<?> future = this.automaticRecordingStopExecutor.schedule(() -> {
				log.info("Stopping recording {} after {} seconds wait (no publisher published before timeout)",
						recordingId, this.openviduConfig.getOpenviduRecordingAutostopTimeout());

				if (this.automaticRecordingStopThreads.remove(session.getSessionId()) != null) {
					boolean alreadyUnlocked = false;
					try {
						if (session.closingLock.writeLock().tryLock(15, TimeUnit.SECONDS)) {
							try {
								if (session.isClosed()) {
									return;
								}
								if (session.getParticipants().size() == 0
										|| session.onlyRecorderAndOrSttParticipant()) {
									// Close session if there are no participants connected (RECORDER or STT do not
									// count) and publishing
									log.info("Closing session {} after automatic stop of recording {}",
											session.getSessionId(), recordingId);
									sessionManager.closeSessionAndEmptyCollections(session, EndReason.automaticStop,
											true);
								} else {
									// There are users connected, but no one is publishing
									// We don't need the lock if session is not closing
									session.closingLock.writeLock().unlock();
									alreadyUnlocked = true;
									log.info(
											"Automatic stopping recording {}. There are users connected to session {}, but no one is publishing",
											recordingId, session.getSessionId());
									this.stopRecording(session, recordingId, EndReason.automaticStop);
								}
							} finally {
								if (!alreadyUnlocked) {
									session.closingLock.writeLock().unlock();
								}
							}
						} else {
							log.error(
									"Timeout waiting for Session {} closing lock to be available for automatic recording stop thred",
									session.getSessionId());
						}
					} catch (InterruptedException e) {
						log.error(
								"InterruptedException while waiting for Session {} closing lock to be available for automatic recording stop thred",
								session.getSessionId());
					}

				} else {
					// This code shouldn't be reachable
					log.warn("Recording {} was already automatically stopped by a previous thread", recordingId);
				}
			}, this.openviduConfig.getOpenviduRecordingAutostopTimeout(), TimeUnit.SECONDS);

			return future;
		});
	}

	public boolean abortAutomaticRecordingStopThread(Session session, EndReason reason) {
		ScheduledFuture<?> future = this.automaticRecordingStopThreads.remove(session.getSessionId());
		if (future != null) {
			boolean cancelled = future.cancel(false);
			try {
				if (session.closingLock.writeLock().tryLock(15, TimeUnit.SECONDS)) {
					try {
						if (session.isClosed()) {
							return false;
						}
						if (session.getParticipants().size() == 0 || session.onlyRecorderAndOrSttParticipant()) {
							// Close session if there are no participants connected (except for RECORDER or
							// STT). This code will only be executed if recording is manually stopped during
							// the automatic stop timeout, so the session must be also closed
							log.info(
									"Ongoing recording of session {} was explicetly stopped within timeout for automatic recording stop. Closing session",
									session.getSessionId());
							sessionManager.closeSessionAndEmptyCollections(session, reason, false);
						}
					} finally {
						session.closingLock.writeLock().unlock();
					}
				} else {
					log.error(
							"Timeout waiting for Session {} closing lock to be available for aborting automatic recording stop thred",
							session.getSessionId());
				}
			} catch (InterruptedException e) {
				log.error(
						"InterruptedException while waiting for Session {} closing lock to be available for aborting automatic recording stop thred",
						session.getSessionId());
			}
			return cancelled;
		} else {
			return true;
		}
	}

	protected void checkRecordingPaths(String openviduRecordingPath, String openviduRecordingCustomLayout)
			throws OpenViduException {
		log.info("Initializing recording paths");

		Path recordingPath = null;
		try {
			recordingPath = Files.createDirectories(Paths.get(openviduRecordingPath));
		} catch (IOException e) {
			String errorMessage = "The recording path \"" + openviduRecordingPath
					+ "\" is not valid. Reason: OpenVidu Server cannot find path \"" + openviduRecordingPath
					+ "\" and doesn't have permissions to create it";
			log.error(errorMessage);
			throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID, errorMessage);
		}

		// Check OpenVidu Server write permissions in recording path
		if (!Files.isWritable(recordingPath)) {
			String errorMessage = "The recording path \"" + openviduRecordingPath
					+ "\" is not valid. Reason: OpenVidu Server needs write permissions. Try running command \"sudo chmod 777 "
					+ openviduRecordingPath + "\"";
			log.error(errorMessage);
			throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID, errorMessage);
		} else {
			log.info("OpenVidu Server has write permissions on recording path: {}", openviduRecordingPath);
		}

		final String testFolderPath = openviduRecordingPath + "/TEST_RECORDING_PATH_" + System.currentTimeMillis();
		final String testFilePath = testFolderPath + "/TEST_RECORDING_PATH"
				+ openviduConfig.getMediaServer().getRecordingFileExtension();

		// Check Kurento Media Server write permissions in recording path
		if (this.kmsManager.getKmss().isEmpty()) {
			log.warn("No KMSs were defined in KMS_URIS array. Recording path check aborted");
		} else if (MediaServer.mediasoup.equals(openviduConfig.getMediaServer())) {
			log.warn("Using mediasoup. Recording path check aborted");
		} else {
			Kms kms = null;
			try {
				kms = this.kmsManager.getLessLoadedConnectedAndRunningKms();
			} catch (NoSuchElementException e) {
			}
			if (kms == null) {
				log.warn("There are not running and connected KMSs. Recording path check aborted");
			} else {
				MediaPipeline pipeline = this.kmsManager.getLessLoadedConnectedAndRunningKms().getKurentoClient()
						.createMediaPipeline();
				RecorderEndpoint recorder = new RecorderEndpoint.Builder(pipeline, "file://" + testFilePath).build();

				final AtomicBoolean kurentoRecorderError = new AtomicBoolean(false);

				recorder.addErrorListener(new EventListener<ErrorEvent>() {
					@Override
					public void onEvent(ErrorEvent event) {
						if (event.getErrorCode() == 6) {
							// KMS write permissions error
							kurentoRecorderError.compareAndSet(false, true);
						}
					}
				});

				recorder.record();

				try {
					// Give the error event some time to trigger if necessary
					Thread.sleep(500);
				} catch (InterruptedException e1) {
					e1.printStackTrace();
				}

				if (kurentoRecorderError.get()) {
					String errorMessage = "The recording path \"" + openviduRecordingPath
							+ "\" is not valid. Reason: Kurento Media Server needs write permissions. Try running command \"sudo chmod 777 "
							+ openviduRecordingPath + "\"";
					log.error(errorMessage);
					throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID, errorMessage);
				}

				if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
					recorder.stop();
					recorder.release();
					pipeline.release();
				}

				log.info("Kurento Media Server has write permissions on recording path: {}", openviduRecordingPath);

				try {
					new LocalCustomFileManager().deleteFolder(testFolderPath);
					log.info("OpenVidu Server has write permissions over files created by Kurento Media Server");
				} catch (IOException e) {
					String errorMessage = "The recording path \"" + openviduRecordingPath
							+ "\" is not valid. Reason: OpenVidu Server does not have write permissions over files created by Kurento Media Server. "
							+ "Try running Kurento Media Server as user \"" + System.getProperty("user.name")
							+ "\" or run OpenVidu Server as superuser";
					log.error(errorMessage);
					log.error(
							"Be aware that a folder \"{}\" was created and should be manually deleted (\"sudo rm -rf {}\")",
							testFolderPath, testFolderPath);
					throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID, errorMessage);
				}
			}
		}

		if (openviduConfig.openviduRecordingCustomLayoutChanged(openviduRecordingCustomLayout)) {
			// Property OPENVIDU_RECORDING_CUSTOM_LAYOUT changed
			File dir = new File(openviduRecordingCustomLayout);
			if (dir.exists()) {
				if (!dir.isDirectory()) {
					String errorMessage = "The custom layouts path \"" + openviduRecordingCustomLayout
							+ "\" is not valid. Reason: path already exists but it is not a directory";
					log.error(errorMessage);
					throw new OpenViduException(Code.RECORDING_FILE_EMPTY_ERROR, errorMessage);
				} else {
					if (dir.listFiles() == null) {
						String errorMessage = "The custom layouts path \"" + openviduRecordingCustomLayout
								+ "\" is not valid. Reason: OpenVidu Server needs read permissions. Try running command \"sudo chmod 755 "
								+ openviduRecordingCustomLayout + "\"";
						log.error(errorMessage);
						throw new OpenViduException(Code.RECORDING_FILE_EMPTY_ERROR, errorMessage);
					} else {
						log.info("OpenVidu Server has read permissions on custom layout path: {}",
								openviduRecordingCustomLayout);
						log.info("Custom layouts path successfully initialized at {}", openviduRecordingCustomLayout);
					}
				}
			} else {
				try {
					Files.createDirectories(dir.toPath());
					log.warn(
							"OpenVidu custom layouts path (system property 'OPENVIDU_RECORDING_CUSTOM_LAYOUT') has been created, being folder {}. "
									+ "It is an empty folder, so no custom layout is currently present",
							dir.getAbsolutePath());
				} catch (IOException e) {
					String errorMessage = "The custom layouts path \"" + openviduRecordingCustomLayout
							+ "\" is not valid. Reason: OpenVidu Server cannot find path \""
							+ openviduRecordingCustomLayout + "\" and doesn't have permissions to create it";
					log.error(errorMessage);
					throw new OpenViduException(Code.RECORDING_FILE_EMPTY_ERROR, errorMessage);
				}
			}
		}

		log.info("Recording path successfully initialized at {}", openviduRecordingPath);
	}

	public static EndReason finalReason(EndReason reason) {
		if (RecordingManager.LAST_PARTICIPANT_LEFT_REASONS.contains(reason)) {
			return EndReason.lastParticipantLeft;
		} else {
			return reason;
		}
	}

	/**
	 * New starting recording
	 */
	public void recordingToStarting(Recording recording) throws RuntimeException {
		if ((startingRecordings.putIfAbsent(recording.getId(), recording) != null)
				|| (sessionsRecordingsStarting.putIfAbsent(recording.getSessionId(), recording) != null)) {
			log.error("Concurrent session recording initialization. Aborting this thread");
			throw new RuntimeException("Concurrent initialization of recording " + recording.getId());
		} else {
			this.sessionHandler.storeRecordingToSendClientEvent(recording);
		}
	}

	/**
	 * Changes recording from starting to started, updating global recording
	 * collection
	 */
	private void recordingFromStartingToStarted(Recording recording) {
		this.sessionsRecordings.put(recording.getSessionId(), recording);
		this.startingRecordings.remove(recording.getId());
		this.sessionsRecordingsStarting.remove(recording.getSessionId());
		this.startedRecordings.put(recording.getId(), recording);
	}

}
