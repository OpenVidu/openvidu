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
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
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

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.recording.RecorderEndpointWrapper;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.utils.CommandExecutor;
import io.openvidu.server.utils.CustomFileWriter;

public class SingleStreamRecordingService extends RecordingService {

	private static final Logger log = LoggerFactory.getLogger(SingleStreamRecordingService.class);

	private Map<String, Map<String, RecorderEndpointWrapper>> recorders = new ConcurrentHashMap<>();
	private CustomFileWriter fileWriter = new CustomFileWriter();
	private final String INDIVIDUAL_STREAM_METADATA_FILE = ".stream.";

	public SingleStreamRecordingService(RecordingManager recordingManager, OpenviduConfig openviduConfig) {
		super(recordingManager, openviduConfig);
	}

	@Override
	public Recording startRecording(Session session, RecordingProperties properties) throws OpenViduException {

		PropertiesRecordingId updatePropertiesAndRecordingId = this.setFinalRecordingNameAndGetFreeRecordingId(session,
				properties);
		properties = updatePropertiesAndRecordingId.properties;
		String recordingId = updatePropertiesAndRecordingId.recordingId;

		recorders.put(session.getSessionId(), new ConcurrentHashMap<String, RecorderEndpointWrapper>());

		final CountDownLatch recordingStartedCountdown = new CountDownLatch(session.getActivePublishers());

		for (Participant p : session.getParticipants()) {
			if (p.isStreaming()) {

				MediaProfileSpecType profile = null;
				try {
					profile = generateMediaProfile(properties, p);
				} catch (OpenViduException e) {
					log.error(
							"Cannot start single stream recorder for stream {} in session {}: {}. Skipping to next stream being published",
							p.getPublisherStreamId(), session.getSessionId(), e.getMessage());
					continue;
				}
				this.startOneIndividualStreamRecording(session, recordingId, profile, p, recordingStartedCountdown);
			}
		}

		Recording recording = new Recording(session.getSessionId(), recordingId, properties);
		recording.setStatus(io.openvidu.java.client.Recording.Status.started);

		this.recordingManager.startingRecordings.put(recording.getId(), recording);

		try {
			if (!recordingStartedCountdown.await(5, TimeUnit.SECONDS)) {
				log.error("Error waiting for some recorder endpoint to start in session {}", session.getSessionId());
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				this.recordingManager.startingRecordings.remove(recording.getId());
				this.stopRecording(session, recording, null);
				throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
						"Couldn't initialize some RecorderEndpoint");
			}
		} catch (InterruptedException e) {
			recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
			log.error("Exception while waiting for state change", e);
		}

		if (session.getActivePublishers() == 0) {
			// Recording started for a session with some user connected but no publishers
			// Must create recording root folder for storing metadata archive
			this.fileWriter.createFolder(this.openviduConfig.getOpenViduRecordingPath() + recording.getId());
		}

		this.generateRecordingMetadataFile(recording);
		this.recordingManager.sessionHandler.setRecordingStarted(session.getSessionId(), recording);
		this.recordingManager.sessionsRecordings.put(session.getSessionId(), recording);
		this.recordingManager.startingRecordings.remove(recording.getId());
		this.recordingManager.startedRecordings.put(recording.getId(), recording);
		this.recordingManager.getSessionEventsHandler().sendRecordingStartedNotification(session, recording);

		return recording;
	}

	@Override
	public Recording stopRecording(Session session, Recording recording, String reason) {

		final int numberOfActiveRecorders = recorders.get(recording.getSessionId()).size();
		final CountDownLatch stoppedCountDown = new CountDownLatch(numberOfActiveRecorders);

		for (RecorderEndpointWrapper wrapper : recorders.get(recording.getSessionId()).values()) {
			this.stopOneIndividualStreamRecording(recording.getSessionId(), wrapper.getStreamId(), stoppedCountDown);
		}
		try {
			if (!stoppedCountDown.await(5, TimeUnit.SECONDS)) {
				log.error("Error waiting for some recorder endpoint to stop in session {}", recording.getSessionId());
			}
		} catch (InterruptedException e) {
			log.error("Exception while waiting for state change", e);
		}

		this.recordingManager.sessionsRecordings.remove(recording.getSessionId());
		this.recordingManager.startedRecordings.remove(recording.getId());
		this.recorders.remove(recording.getSessionId());

		recording = this.sealMetadataFiles(recording);
		recording = this.recordingManager.updateRecordingUrl(recording);

		if (reason != null && session != null) {
			this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
		}

		return recording;
	}

	public void startOneIndividualStreamRecording(Session session, String recordingId, MediaProfileSpecType profile,
			Participant participant, CountDownLatch globalStartLatch) {
		log.info("Starting single stream recorder for stream {} in session {}", participant.getPublisherStreamId(),
				session.getSessionId());

		if (recordingId == null) {
			// Stream is being recorded because is a new publisher in an ongoing recorded
			// session. If recordingId is defined is because Stream is being recorded from
			// "startRecording" method
			Recording recording = this.recordingManager.sessionsRecordings.get(session.getSessionId());
			recordingId = recording.getId();

			try {
				profile = generateMediaProfile(recording.getRecordingProperties(), participant);
			} catch (OpenViduException e) {
				log.error("Cannot start single stream recorder for stream {} in session {}: {}",
						participant.getPublisherStreamId(), session.getSessionId(), e.getMessage());
				return;
			}
		}

		KurentoParticipant kurentoParticipant = (KurentoParticipant) participant;
		MediaPipeline pipeline = kurentoParticipant.getPublisher().getPipeline();

		RecorderEndpoint recorder = new RecorderEndpoint.Builder(pipeline,
				"file://" + this.openviduConfig.getOpenViduRecordingPath() + recordingId + "/"
						+ participant.getPublisherStreamId() + ".webm").withMediaProfile(profile).build();

		recorder.addRecordingListener(new EventListener<RecordingEvent>() {
			@Override
			public void onEvent(RecordingEvent event) {
				recorders.get(session.getSessionId()).get(participant.getPublisherStreamId())
						.setStartTime(System.currentTimeMillis());
				log.info("Recording started event for stream {}", participant.getPublisherStreamId());
				globalStartLatch.countDown();
			}
		});

		recorder.addErrorListener(new EventListener<ErrorEvent>() {
			@Override
			public void onEvent(ErrorEvent event) {
				log.error(event.getErrorCode() + " " + event.getDescription());
			}
		});

		connectAccordingToProfile(kurentoParticipant.getPublisher(), recorder, profile);

		RecorderEndpointWrapper wrapper = new RecorderEndpointWrapper(recorder, participant.getParticipantPublicId(),
				recordingId, participant.getPublisherStreamId(), participant.getClientMetadata(),
				participant.getServerMetadata(), kurentoParticipant.getPublisher().getMediaOptions().hasAudio(),
				kurentoParticipant.getPublisher().getMediaOptions().hasVideo(),
				kurentoParticipant.getPublisher().getMediaOptions().getTypeOfVideo());

		recorders.get(session.getSessionId()).put(participant.getPublisherStreamId(), wrapper);
		wrapper.getRecorder().record();
	}

	public void stopOneIndividualStreamRecording(String sessionId, String streamId, CountDownLatch globalStopLatch) {
		log.info("Stopping single stream recorder for stream {} in session {}", streamId, sessionId);
		RecorderEndpointWrapper wrapper = this.recorders.get(sessionId).remove(streamId);
		if (wrapper != null) {
			wrapper.getRecorder().addStoppedListener(new EventListener<StoppedEvent>() {
				@Override
				public void onEvent(StoppedEvent event) {
					wrapper.setEndTime(System.currentTimeMillis());
					generateIndividualMetadataFile(wrapper);
					log.info("Recording stopped event for stream {}", streamId);
					globalStopLatch.countDown();
				}
			});
			wrapper.getRecorder().stop();
		} else {
			log.error("Stream {} wasn't being recorded in session {}", streamId, sessionId);
		}
	}

	private MediaProfileSpecType generateMediaProfile(RecordingProperties properties, Participant participant)
			throws OpenViduException {

		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		MediaProfileSpecType profile = null;

		boolean streamHasAudio = kParticipant.getPublisher().getMediaOptions().hasAudio();
		boolean streamHasVideo = kParticipant.getPublisher().getMediaOptions().hasVideo();
		boolean propertiesHasAudio = properties.hasAudio();
		boolean propertiesHasVideo = properties.hasVideo();

		if (streamHasAudio) {
			if (streamHasVideo) {
				// Stream has both audio and video tracks

				if (propertiesHasAudio) {
					if (propertiesHasVideo) {
						profile = MediaProfileSpecType.WEBM;
					} else {
						profile = MediaProfileSpecType.WEBM_AUDIO_ONLY;
					}
				} else if (propertiesHasVideo) {
					profile = MediaProfileSpecType.WEBM_VIDEO_ONLY;
				} else {
					// ERROR: RecordingProperties set to not record audio nor video
					throw new OpenViduException(Code.MEDIA_TYPE_RECORDING_PROPERTIES_ERROR_CODE,
							"RecordingProperties set to \"hasVideo(false)\" and \"hasAudio(false)\"");
				}
			} else {
				// Stream has audio track only

				if (propertiesHasAudio) {
					profile = MediaProfileSpecType.WEBM_AUDIO_ONLY;
				} else {
					// ERROR: RecordingProperties set to video only but there's no video track
					throw new OpenViduException(Code.MEDIA_TYPE_RECORDING_PROPERTIES_ERROR_CODE,
							"RecordingProperties set to \"hasAudio(false)\" but stream is audio-only");
				}
			}
		} else if (streamHasVideo) {
			// Stream has video track only

			if (propertiesHasVideo) {
				profile = MediaProfileSpecType.WEBM_VIDEO_ONLY;
			} else {
				// ERROR: RecordingProperties set to audio only but there's no audio track
				throw new OpenViduException(Code.MEDIA_TYPE_RECORDING_PROPERTIES_ERROR_CODE,
						"RecordingProperties set to \"hasVideo(false)\" but stream is video-only");
			}
		} else {
			// ERROR: Stream has no track at all
			throw new OpenViduException(Code.MEDIA_TYPE_RECORDING_PROPERTIES_ERROR_CODE,
					"Stream has no track at all. Cannot be recorded");
		}
		return profile;
	}

	private void connectAccordingToProfile(PublisherEndpoint publisherEndpoint, RecorderEndpoint recorder,
			MediaProfileSpecType profile) {
		switch (profile) {
		case WEBM:
			publisherEndpoint.connect(recorder, MediaType.AUDIO);
			publisherEndpoint.connect(recorder, MediaType.VIDEO);
			break;
		case WEBM_AUDIO_ONLY:
			publisherEndpoint.connect(recorder, MediaType.AUDIO);
			break;
		case WEBM_VIDEO_ONLY:
			publisherEndpoint.connect(recorder, MediaType.VIDEO);
			break;
		default:
			throw new UnsupportedOperationException("Unsupported profile when single stream recording: " + profile);
		}
	}

	private void generateRecordingMetadataFile(Recording recording) {
		String filePath = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/"
				+ RecordingManager.RECORDING_ENTITY_FILE + recording.getId();
		String text = recording.toJson().toString();
		this.fileWriter.createAndWriteFile(filePath, text);
	}

	private void generateIndividualMetadataFile(RecorderEndpointWrapper wrapper) {
		String filesPath = this.openviduConfig.getOpenViduRecordingPath() + wrapper.getRecordingId() + "/";
		File videoFile = new File(filesPath + wrapper.getStreamId() + ".webm");
		wrapper.setSize(videoFile.length());
		String metadataFilePath = filesPath + INDIVIDUAL_STREAM_METADATA_FILE + wrapper.getStreamId();
		String metadataFileContent = wrapper.toJson().toString();
		this.fileWriter.createAndWriteFile(metadataFilePath, metadataFileContent);
	}

	private Recording sealMetadataFiles(Recording recording) {
		// Must update recording "status" (to stopped), "duration" (min startTime of all
		// individual recordings) and "size" (sum of all individual recordings size)

		String folderPath = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/";

		String metadataFilePath = folderPath + RecordingManager.RECORDING_ENTITY_FILE + recording.getId();
		String syncFilePath = folderPath + recording.getId() + ".json";

		recording = this.recordingManager.getRecordingFromEntityFile(new File(metadataFilePath));

		long minStartTime = Long.MAX_VALUE;
		long maxEndTime = 0;
		long accumulatedSize = 0;

		File folder = new File(folderPath);
		File[] files = folder.listFiles();

		Reader reader = null;
		Gson gson = new Gson();

		// Sync metadata json object to store in "RECORDING_ID.json"
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
				RecorderEndpointWrapper wr = gson.fromJson(reader, RecorderEndpointWrapper.class);
				minStartTime = Math.min(minStartTime, wr.getStartTime());
				maxEndTime = Math.max(maxEndTime, wr.getEndTime());
				accumulatedSize += wr.getSize();

				JsonObject jsonFile = new JsonObject();
				jsonFile.addProperty("connectionId", wr.getConnectionId());
				jsonFile.addProperty("streamId", wr.getStreamId());
				jsonFile.addProperty("size", wr.getSize());
				jsonFile.addProperty("clientData", wr.getClientData());
				jsonFile.addProperty("serverData", wr.getServerData());
				jsonFile.addProperty("hasAudio", wr.hasAudio());
				jsonFile.addProperty("hasVideo", wr.hasVideo());
				if (wr.hasVideo()) {
					jsonFile.addProperty("typeOfVideo", wr.getTypeOfVideo());
				}
				jsonFile.addProperty("startTimeOffset", wr.getStartTime() - recording.getCreatedAt());
				jsonFile.addProperty("endTimeOffset", wr.getEndTime() - recording.getCreatedAt());

				jsonArrayFiles.add(jsonFile);
			}
		}

		json.add("files", jsonArrayFiles);

		long duration = (maxEndTime - minStartTime) / 1000;

		recording.setSize(accumulatedSize); // Size in bytes
		recording.setDuration(duration > 0 ? duration : 0); // Duration in seconds
		recording.setStatus(io.openvidu.java.client.Recording.Status.stopped);

		this.fileWriter.overwriteFile(metadataFilePath, recording.toJson().toString());
		this.fileWriter.createAndWriteFile(syncFilePath, new GsonBuilder().setPrettyPrinting().create().toJson(json));
		this.generateZipFileAndCleanFolder(folderPath, recording.getName() + ".zip");

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

				if (files[i].isFile() && (fileExtension.equals("json") || fileExtension.equals("webm"))) {

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
				if (!files[i].getName().startsWith(RecordingManager.RECORDING_ENTITY_FILE)) {
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

	private void updateFilePermissions(String folder) {
		String command = "chmod -R 777 " + folder;
		try {
			String response = CommandExecutor.execCommand("/bin/sh", "-c", command);
			if ("".equals(response)) {
				log.info("Individual recording file permissions successfully updated");
			} else {
				log.error("Individual recording file permissions failed to update: {}", response);
			}
		} catch (IOException | InterruptedException e) {
			log.error("Individual recording file permissions failed to update. Error: {}", e.getMessage());
		}
	}

}
