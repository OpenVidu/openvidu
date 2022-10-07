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
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.commons.io.FilenameUtils;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaProfileSpecType;
import org.kurento.client.MediaType;
import org.kurento.client.RecorderEndpoint;
import org.kurento.client.RecordingEvent;
import org.kurento.client.StoppedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.recording.RecorderEndpointWrapper;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.recording.RecordingUploader;
import io.openvidu.server.utils.CustomFileManager;
import io.openvidu.server.utils.RemoteOperationUtils;

public class SingleStreamRecordingService extends RecordingService {

	private static final Logger log = LoggerFactory.getLogger(SingleStreamRecordingService.class);

	// One recorder endpoint active at a time per stream
	private Map<String, Map<String, RecorderEndpointWrapper>> activeRecorders = new ConcurrentHashMap<>();
	// Multiple recorder endpoints per stream during a recording
	private Map<String, Map<String, List<RecorderEndpointWrapper>>> storedRecorders = new ConcurrentHashMap<>();

	public SingleStreamRecordingService(RecordingManager recordingManager, RecordingDownloader recordingDownloader,
			RecordingUploader recordingUploader, KmsManager kmsManager, CustomFileManager fileManager,
			OpenviduConfig openviduConfig, CallDetailRecord cdr) {
		super(recordingManager, recordingDownloader, recordingUploader, kmsManager, fileManager, openviduConfig, cdr);
	}

	@Override
	public Recording startRecording(Session session, String recordingId, RecordingProperties properties)
			throws OpenViduException {

		log.info("Starting individual ({}) recording {} of session {}",
				properties.hasVideo() ? (properties.hasAudio() ? "video+audio" : "video-only") : "audioOnly",
				recordingId, session.getSessionId());

		Recording recording = new Recording(session.getSessionId(), session.getUniqueSessionId(), recordingId,
				properties);
		this.recordingManager.recordingToStarting(recording);

		activeRecorders.put(recording.getId(), new ConcurrentHashMap<>());
		storedRecorders.put(recording.getId(), new ConcurrentHashMap<>());

		int activePublishersToRecord = session.getActiveIndividualRecordedPublishers();
		final CountDownLatch recordingStartedCountdown = new CountDownLatch(activePublishersToRecord);

		try {
			for (Participant p : session.getParticipants()) {
				if (p.isStreaming() && p.getToken().record()) {

					MediaProfileSpecType profile = null;
					try {
						profile = generateMediaProfile(properties, p);
					} catch (OpenViduException e) {
						log.error(
								"Cannot start single stream recorder for stream {} in session {}: {}. Skipping to next stream being published",
								p.getPublisherStreamId(), session.getSessionId(), e.getMessage());
						recordingStartedCountdown.countDown();
						continue;
					}
					this.startRecorderEndpointForPublisherEndpoint(recording.getId(), profile, p,
							recordingStartedCountdown);
				}
			}
		} catch (RecorderEndpointException e) {
			throw this.failStartRecording(session, recording, "Couldn't initialize some RecorderEndpoint");
		}

		try {
			if (!properties.ignoreFailedStreams()) {
				if (!recordingStartedCountdown.await(10, TimeUnit.SECONDS)) {
					log.error("Error waiting for some recorder endpoint to start in session {}",
							session.getSessionId());
					throw this.failStartRecording(session, recording,
							"Some RecorderEndpoint did not trigger RecordingEvent in time");
				}
			} else {
				log.info(
						"Ignoring failed streams in recording {}. Some streams may not be immediately or ever recorded",
						recordingId);
			}
		} catch (InterruptedException e) {
			recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
			log.error("Exception while waiting for state change", e);
		}

		this.generateRecordingMetadataFile(recording);

		return recording;
	}

	@Override
	public Recording stopRecording(Session session, Recording recording, EndReason reason) {
		return this.stopRecording(session, recording, reason, null);
	}

	public Recording stopRecording(Session session, Recording recording, EndReason reason, Long kmsDisconnectionTime) {
		log.info("Stopping individual ({}) recording {} of session {}. Reason: {}",
				recording.hasVideo() ? (recording.hasAudio() ? "video+audio" : "video-only") : "audioOnly",
				recording.getId(), recording.getSessionId(), reason);

		final List<RecorderEndpointWrapper> wrappers = new ArrayList<>();
		storedRecorders.get(recording.getId()).values().forEach(list -> {
			wrappers.addAll(list);
		});
		final CountDownLatch stoppedCountDown = new CountDownLatch(wrappers.size());

		ForkJoinPool customThreadPool = new ForkJoinPool(4);
		try {
			customThreadPool.submit(() -> wrappers.parallelStream().forEach(wrapper -> {
				this.stopRecorderEndpointOfPublisherEndpoint(recording.getId(), wrapper.getStreamId(), stoppedCountDown,
						kmsDisconnectionTime);
			}));
		} finally {
			customThreadPool.shutdown();
		}

		try {
			if (!stoppedCountDown.await(5, TimeUnit.SECONDS)) {
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				log.error("Error waiting for some recorder endpoint to stop in session {}", recording.getSessionId());
			}
		} catch (InterruptedException e) {
			recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
			log.error("Exception while waiting for state change", e);
		}

		this.cleanRecordingMaps(recording);

		final Recording[] finalRecordingArray = new Recording[1];
		finalRecordingArray[0] = recording;
		try {
			this.recordingDownloader.downloadRecording(finalRecordingArray[0], wrappers, () -> {
				// Update recording entity files with final file size
				for (RecorderEndpointWrapper wrapper : wrappers) {
					if (wrapper.getSize() == 0) {
						updateIndividualMetadataFile(wrapper);
					}
				}
				finalRecordingArray[0] = this.sealMetadataFiles(finalRecordingArray[0]);

				cleanRecordingWrappers(finalRecordingArray[0]);

				// Decrement active recordings once it is downloaded. This method will also drop
				// the Media Node if no more sessions or recordings and status is
				// waiting-idle-to-terminate
				kmsManager.decrementActiveRecordings(finalRecordingArray[0].getRecordingProperties(),
						finalRecordingArray[0].getId(), session);

				// Upload if necessary
				this.uploadRecording(finalRecordingArray[0], reason);

			});
		} catch (IOException e) {
			log.error("Error while downloading recording {}", finalRecordingArray[0].getName());
			cleanRecordingWrappers(finalRecordingArray[0]);
		}

		if (reason != null && session != null) {
			this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, finalRecordingArray[0],
					reason);
		}

		return finalRecordingArray[0];
	}

	public void startRecorderEndpointForPublisherEndpoint(final String recordingId, MediaProfileSpecType profile,
			final Participant participant, CountDownLatch globalStartLatch) {

		log.info("Starting single stream recorder for stream {} in session {}", participant.getPublisherStreamId(),
				participant.getSessionId());

		final String streamId = participant.getPublisherStreamId();

		try {
			if (participant.singleRecordingLock.tryLock(15, TimeUnit.SECONDS)) {
				try {
					if (this.activeRecorders.get(recordingId).containsKey(streamId)) {
						log.warn("Concurrent initialization of RecorderEndpoint for stream {} of session {}. Returning",
								streamId, participant.getSessionId());
						return;
					}

					// Update stream recording counter
					final List<RecorderEndpointWrapper> wrapperList = storedRecorders.get(recordingId).get(streamId);
					final int streamCounter = wrapperList != null ? wrapperList.size() : 0;
					String fileName = streamCounter == 0 ? streamId : (streamId + "-" + streamCounter);
					String fileExtension = openviduConfig.getMediaServer().getRecordingFileExtension();

					KurentoParticipant kurentoParticipant = (KurentoParticipant) participant;
					MediaPipeline pipeline = kurentoParticipant.getPublisher().getPipeline();
					String kmsUri = kurentoParticipant.getSession().getKms().getUri();

					RecorderEndpoint recorder = new RecorderEndpoint.Builder(pipeline,
							"file://" + openviduConfig.getOpenViduRecordingPath(kmsUri) + recordingId + "/" + fileName
									+ fileExtension).withMediaProfile(profile).build();

					recorder.addRecordingListener(new EventListener<RecordingEvent>() {
						@Override
						public void onEvent(RecordingEvent event) {
							activeRecorders.get(recordingId).get(streamId)
									.setStartTime(Long.parseLong(event.getTimestampMillis()));
							log.info("Recording started event for stream {}", streamId);
							globalStartLatch.countDown();
						}
					});

					recorder.addErrorListener(new EventListener<ErrorEvent>() {
						@Override
						public void onEvent(ErrorEvent event) {
							final String msg = "Event [" + event.getType() + "] endpoint: " + recorder.getName()
									+ " | errorCode: " + event.getErrorCode() + " | description: "
									+ event.getDescription() + " | timestamp: " + event.getTimestampMillis();
							log.error(msg);
						}
					});

					RecorderEndpointWrapper wrapper = new RecorderEndpointWrapper(recorder, kurentoParticipant,
							recordingId, fileName, fileExtension);
					activeRecorders.get(recordingId).put(streamId, wrapper);
					if (wrapperList != null) {
						wrapperList.add(wrapper);
					} else {
						storedRecorders.get(recordingId).put(streamId, new ArrayList<>(Arrays.asList(wrapper)));
					}

					connectAccordingToProfile(kurentoParticipant.getPublisher(), recorder, profile);

					try {
						wrapper.getRecorder().record();
					} catch (Exception e) {
						log.error("Error on RecorderEndpoint: " + e.getMessage());
						throw new RecorderEndpointException();
					}

				} finally {
					participant.singleRecordingLock.unlock();
				}
			} else {
				log.error(
						"Timeout waiting for individual recording lock to be available to start stream recording for participant {} of session {}",
						participant.getParticipantPublicId(), participant.getSessionId());
			}
		} catch (InterruptedException e) {
			log.error(
					"InterruptedException waiting for individual recording lock to be available to start stream recording for participant {} of session {}",
					participant.getParticipantPublicId(), participant.getSessionId());
		}
	}

	public void stopRecorderEndpointOfPublisherEndpoint(String recordingId, String streamId,
			CountDownLatch globalStopLatch, Long kmsDisconnectionTime) {

		log.info("Stopping single stream recorder for stream {} in recording {}", streamId, recordingId);

		final RecorderEndpointWrapper finalWrapper = activeRecorders.get(recordingId).remove(streamId);
		if (finalWrapper != null) {
			KurentoParticipant kParticipant = finalWrapper.getParticipant();
			try {
				if (kParticipant.singleRecordingLock.tryLock(15, TimeUnit.SECONDS)) {
					try {

						if (kmsDisconnectionTime != null || RemoteOperationUtils.mustSkipRemoteOperation()) {

							// Stopping recorder endpoint because of a KMS disconnection
							finalWrapper.setEndTime(
									kmsDisconnectionTime != null ? kmsDisconnectionTime : System.currentTimeMillis());
							generateIndividualMetadataFile(finalWrapper);
							globalStopLatch.countDown();
							log.warn("Forcing individual recording stop after {} for stream {} in recording {}",
									kmsDisconnectionTime != null ? "KMS restart" : "node crashed", streamId,
									recordingId);

						} else {

							finalWrapper.getRecorder().addStoppedListener(new EventListener<StoppedEvent>() {
								@Override
								public void onEvent(StoppedEvent event) {
									finalWrapper.setEndTime(Long.parseLong(event.getTimestampMillis()));
									generateIndividualMetadataFile(finalWrapper);
									log.info("Recording stopped event for stream {}", streamId);
									finalWrapper.getRecorder().release();
									globalStopLatch.countDown();
								}
							});
							finalWrapper.getRecorder().stop();

						}
					} finally {
						kParticipant.singleRecordingLock.unlock();
					}
				} else {
					log.error(
							"Timeout waiting for individual recording lock to be available to stop stream recording for participant {} of session {}",
							kParticipant.getParticipantPublicId(), kParticipant.getSessionId());
				}
			} catch (InterruptedException e) {
				log.error(
						"InterruptedException waiting for individual recording lock to be available to stop stream recording for participant {} of session {}",
						kParticipant.getParticipantPublicId(), kParticipant.getSessionId());
			}
		} else {
			// The streamId has no associated RecorderEndpoint
			if (storedRecorders.get(recordingId).containsKey(streamId)) {
				log.info("Stream {} recording of recording {} was already stopped", streamId, recordingId);
			} else {
				log.info("Stream {} wasn't being recorded in recording {}", streamId, recordingId);
			}
			globalStopLatch.countDown();
		}
	}

	MediaProfileSpecType generateMediaProfile(RecordingProperties properties, Participant participant)
			throws OpenViduException {

		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		MediaProfileSpecType profile = null;

		boolean streamHasAudio = kParticipant.getPublisher().getMediaOptions().hasAudio();
		boolean streamHasVideo = kParticipant.getPublisher().getMediaOptions().hasVideo();
		boolean propertiesHasAudio = properties.hasAudio();
		boolean propertiesHasVideo = properties.hasVideo();

		// Detect some error conditions to provide a hint about what's wrong

		if (!streamHasAudio && !streamHasVideo) {
			// ERROR: Stream has no track at all. This branch should never be reachable
			throw new OpenViduException(Code.MEDIA_TYPE_STREAM_INCOMPATIBLE_WITH_RECORDING_PROPERTIES_ERROR_CODE,
					"Stream has no track at all. Cannot be recorded");
		}

		if (!propertiesHasAudio && !propertiesHasVideo) {
			// ERROR: Properties don't enable any track. This branch should never be
			// reachable
			throw new OpenViduException(Code.MEDIA_TYPE_RECORDING_PROPERTIES_ERROR_CODE,
					"RecordingProperties cannot set both \"hasAudio(false)\" and \"hasVideo(false)\"");
		}

		boolean streamOnlyAudio = streamHasAudio && !streamHasVideo;
		if (streamOnlyAudio && !propertiesHasAudio) {
			throw new OpenViduException(Code.MEDIA_TYPE_STREAM_INCOMPATIBLE_WITH_RECORDING_PROPERTIES_ERROR_CODE,
					"RecordingProperties set to \"hasAudio(false)\" but stream is audio-only");
		}

		boolean streamOnlyVideo = !streamHasAudio && streamHasVideo;
		if (streamOnlyVideo & !propertiesHasVideo) {
			throw new OpenViduException(Code.MEDIA_TYPE_STREAM_INCOMPATIBLE_WITH_RECORDING_PROPERTIES_ERROR_CODE,
					"RecordingProperties set to \"hasVideo(false)\" but stream is video-only");
		}

		// Detect the requested media kinds and select the appropriate profile

		boolean recordAudio = streamHasAudio && propertiesHasAudio;
		boolean recordVideo = streamHasVideo && propertiesHasVideo;
		if (recordAudio && recordVideo) {
			profile = openviduConfig.getMediaServer().getRecordingProfile();
		} else if (recordAudio) {
			profile = openviduConfig.getMediaServer().getRecordingProfileAudioOnly();
		} else if (recordVideo) {
			profile = openviduConfig.getMediaServer().getRecordingProfileVideoOnly();
		}

		return profile;
	}

	private void connectAccordingToProfile(PublisherEndpoint publisherEndpoint, RecorderEndpoint recorder,
			MediaProfileSpecType profile) {
		// Perform blocking connections, to ensure that elements are
		// already connected when `RecorderEndpoint.record()` is called.
		if (profile.name().contains("AUDIO_ONLY")) {
			publisherEndpoint.connect(recorder, MediaType.AUDIO, true);
		} else if (profile.name().contains("VIDEO_ONLY")) {
			publisherEndpoint.connect(recorder, MediaType.VIDEO, true);
		} else {
			publisherEndpoint.connect(recorder, MediaType.AUDIO, true);
			publisherEndpoint.connect(recorder, MediaType.VIDEO, true);
		}
	}

	private void generateIndividualMetadataFile(RecorderEndpointWrapper wrapper) {
		this.commonWriteIndividualMetadataFile(wrapper, this.fileManager::createAndWriteFile);
	}

	private void updateIndividualMetadataFile(RecorderEndpointWrapper wrapper) {
		this.commonWriteIndividualMetadataFile(wrapper, this.fileManager::overwriteFile);
	}

	private void commonWriteIndividualMetadataFile(RecorderEndpointWrapper wrapper,
			BiFunction<String, String, Boolean> writeFunction) {
		String filesPath = this.openviduConfig.getOpenViduRecordingPath() + wrapper.getRecordingId() + "/";
		File videoFile = new File(filesPath + wrapper.getNameWithExtension());
		wrapper.setSize(videoFile.length());
		String metadataFilePath = filesPath + INDIVIDUAL_STREAM_METADATA_FILE + wrapper.getName();
		String metadataFileContent = wrapper.toJson().toString();
		writeFunction.apply(metadataFilePath, metadataFileContent);
	}

	private Recording sealMetadataFiles(Recording recording) {
		// Must update recording "status" (to stopped), "duration" (min startTime of all
		// individual recordings) and "size" (sum of all individual recordings size)

		String folderPath = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/";
		String metadataFilePath = folderPath + RecordingService.RECORDING_ENTITY_FILE + recording.getId();
		String syncFilePath = folderPath + recording.getName() + ".json";

		recording = this.recordingManager.getRecordingFromEntityFile(new File(metadataFilePath));

		long minStartTime = Long.MAX_VALUE;
		long maxEndTime = 0;
		long accumulatedSize = 0;

		File folder = new File(folderPath);
		File[] files = folder.listFiles();

		Reader reader = null;

		// Sync metadata json object to store in "RECORDING_NAME.json"
		JsonObject json = new JsonObject();
		json.addProperty("createdAt", recording.getCreatedAt());
		json.addProperty("id", recording.getId());
		json.addProperty("name", recording.getName());
		json.addProperty("sessionId", recording.getSessionId());
		JsonArray jsonArrayFiles = new JsonArray();

		for (int i = 0; i < files.length; i++) {
			if (files[i].isFile() && files[i].getName().startsWith(INDIVIDUAL_STREAM_METADATA_FILE)) {
				try {
					reader = new FileReader(files[i].getAbsolutePath());
				} catch (FileNotFoundException e) {
					log.error("Error reading file {}. Error: {}", files[i].getAbsolutePath(), e.getMessage());
				}
				RecorderEndpointWrapper wr = new RecorderEndpointWrapper(
						JsonParser.parseReader(reader).getAsJsonObject(),
						openviduConfig.getMediaServer().getRecordingFileExtension());
				minStartTime = Math.min(minStartTime, wr.getStartTime());
				maxEndTime = Math.max(maxEndTime, wr.getEndTime());
				accumulatedSize += wr.getSize();

				JsonObject jsonFile = new JsonObject();
				jsonFile.addProperty("name", wr.getNameWithExtension());
				jsonFile.addProperty("connectionId", wr.getConnectionId());
				jsonFile.addProperty("streamId", wr.getStreamId());
				jsonFile.addProperty("size", wr.getSize());
				jsonFile.addProperty("clientData", wr.getClientData());
				jsonFile.addProperty("serverData", wr.getServerData());
				jsonFile.addProperty("hasAudio", wr.hasAudio() && recording.hasAudio());
				jsonFile.addProperty("hasVideo", wr.hasVideo() && recording.hasVideo());
				if (wr.hasVideo()) {
					jsonFile.addProperty("typeOfVideo", wr.getTypeOfVideo());
				}
				jsonFile.addProperty("startTimeOffset", wr.getStartTime() - recording.getCreatedAt());
				jsonFile.addProperty("endTimeOffset", wr.getEndTime() - recording.getCreatedAt());

				jsonArrayFiles.add(jsonFile);
			}
		}

		json.add("files", jsonArrayFiles);
		this.fileManager.createAndWriteFile(syncFilePath, new GsonBuilder().setPrettyPrinting().create().toJson(json));
		this.generateZipFileAndCleanFolder(folderPath,
				recording.getName() + RecordingService.INDIVIDUAL_RECORDING_COMPRESSED_EXTENSION);

		double duration = (double) (maxEndTime - minStartTime) / 1000;
		duration = duration > 0 ? duration : 0;

		recording = this.sealRecordingMetadataFileAsReady(recording, accumulatedSize, duration, metadataFilePath);

		return recording;
	}

	private void generateZipFileAndCleanFolder(String folder, String fileName) {
		FileOutputStream fos = null;
		ZipOutputStream zipOut = null;

		final File[] files = new File(folder).listFiles();

		try {
			fos = new FileOutputStream(folder + fileName);
			zipOut = new ZipOutputStream(fos);

			for (int i = 0; i < files.length; i++) {
				String fileExtension = FilenameUtils.getExtension(files[i].getName());

				if (files[i].isFile() && (fileExtension.equals("json")
						|| openviduConfig.getMediaServer().getRecordingFileExtension().equals("." + fileExtension))) {

					// Zip video files and json sync metadata file
					FileInputStream fis = new FileInputStream(files[i]);
					ZipEntry zipEntry = new ZipEntry(files[i].getName());
					zipOut.putNextEntry(zipEntry);
					byte[] bytes = new byte[1024];
					int length;
					while ((length = fis.read(bytes)) >= 0) {
						zipOut.write(bytes, 0, length);
					}
					fis.close();

				}
				if (!files[i].getName().startsWith(RecordingService.RECORDING_ENTITY_FILE)) {
					// Clean inspected file if it is not
					files[i].delete();
				}
			}
		} catch (IOException e) {
			log.error("Error generating ZIP file {}. Error: {}", folder + fileName, e.getMessage());
		} finally {
			try {
				zipOut.close();
				fos.close();
				this.updateFilePermissions(folder);
			} catch (IOException e) {
				log.error("Error closing FileOutputStream or ZipOutputStream. Error: {}", e.getMessage());
				e.printStackTrace();
			}
		}
	}

	private void cleanRecordingWrappers(Recording recording) {
		this.storedRecorders.remove(recording.getId());
		this.activeRecorders.remove(recording.getId());
	}

	class RecorderEndpointException extends RuntimeException {
		private static final long serialVersionUID = 1L;
	}

}
