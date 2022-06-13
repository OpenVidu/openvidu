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

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.Recording.OutputMode;
import io.openvidu.java.client.Recording.Status;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.recording.RecordingUploader;
import io.openvidu.server.utils.CommandExecutor;
import io.openvidu.server.utils.CustomFileManager;

public abstract class RecordingService {

	private static final Logger log = LoggerFactory.getLogger(RecordingService.class);

	protected OpenviduConfig openviduConfig;
	protected RecordingManager recordingManager;
	protected RecordingDownloader recordingDownloader;
	protected RecordingUploader recordingUploader;
	protected KmsManager kmsManager;
	protected CustomFileManager fileManager;
	protected CallDetailRecord cdr;

	public final static String RECORDING_ENTITY_FILE = ".recording.";
	public final static String COMPOSED_RECORDING_EXTENSION = ".mp4";
	public final static String COMPOSED_RECORDING_AUDIO_ONLY_EXTENSION = ".webm";
	public final static String COMPOSED_THUMBNAIL_EXTENSION = ".jpg";
	public final static String COMPOSED_INFO_FILE_EXTENSION = ".info";
	public final static String INDIVIDUAL_STREAM_METADATA_FILE = ".stream.";
	public final static String INDIVIDUAL_RECORDING_COMPRESSED_EXTENSION = ".zip";

	public RecordingService(RecordingManager recordingManager, RecordingDownloader recordingDownloader,
			RecordingUploader recordingUploader, KmsManager kmsManager, CustomFileManager fileManager,
			OpenviduConfig openviduConfig, CallDetailRecord cdr) {
		this.recordingManager = recordingManager;
		this.recordingDownloader = recordingDownloader;
		this.recordingUploader = recordingUploader;
		this.kmsManager = kmsManager;
		this.fileManager = fileManager;
		this.openviduConfig = openviduConfig;
		this.cdr = cdr;
	}

	public abstract Recording startRecording(Session session, String recordingId, RecordingProperties properties)
			throws OpenViduException;

	public abstract Recording stopRecording(Session session, Recording recording, EndReason reason);

	/**
	 * Generates metadata recording file (".recording.RECORDING_ID" JSON file to
	 * store Recording entity)
	 */
	protected void generateRecordingMetadataFile(Recording recording) {
		String folder = this.openviduConfig.getOpenViduRecordingPath() + recording.getId();
		boolean newFolderCreated = this.fileManager.createFolderIfNotExists(folder);

		if (newFolderCreated) {
			log.info("New folder {} created for recording {}", folder, recording.getId());
		}

		String filePath = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/"
				+ RecordingService.RECORDING_ENTITY_FILE + recording.getId();
		String text = recording.toJson(true).toString();
		this.fileManager.createAndWriteFile(filePath, text);
		log.info("Generated recording metadata file at {}", filePath);
	}

	/**
	 * Update and overwrites metadata recording file to set it in "stopped" status.
	 * Recording size and duration will remain as 0
	 * 
	 * @return updated Recording object
	 */
	protected Recording sealRecordingMetadataFileAsStopped(Recording recording) {
		final String entityFile = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/"
				+ RecordingService.RECORDING_ENTITY_FILE + recording.getId();
		return this.sealRecordingMetadataFile(recording, 0, 0, io.openvidu.java.client.Recording.Status.stopped,
				entityFile);
	}

	/**
	 * Update and overwrites metadata recording file to set it in "ready" (or
	 * "failed") status
	 * 
	 * @return updated Recording object
	 */
	protected Recording sealRecordingMetadataFileAsReady(Recording recording, long size, double duration,
			String metadataFilePath) {
		Status status = Status.failed.equals(recording.getStatus()) ? Status.failed : Status.ready;

		if (Status.ready.equals(status)) {
			// Prevent uploading recordings from being retrieved from REST API with "ready"
			// status. This will force their status back to "stopped" on GET until upload
			// process has finished
			storeAsUploadingRecording(recording);
		}

		// Status is now failed or ready. Url property must be defined
		recording.setUrl(recordingManager.getRecordingUrl(recording));

		final String entityFile = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/"
				+ RecordingService.RECORDING_ENTITY_FILE + recording.getId();
		return this.sealRecordingMetadataFile(recording, size, duration, status, entityFile);
	}

	private Recording sealRecordingMetadataFile(Recording recording, long size, double duration,
			io.openvidu.java.client.Recording.Status status, String metadataFilePath) {
		recording.setStatus(status);
		recording.setSize(size); // Size in bytes
		recording.setDuration(duration > 0 ? duration : 0); // Duration in seconds

		if (this.fileManager.overwriteFile(metadataFilePath, recording.toJson(true).toString())) {
			log.info("Sealed recording metadata file at {} with status [{}]", metadataFilePath, status.name());
		}

		return recording;
	}

	/**
	 * Returns a new available recording identifier (adding a number tag at the end
	 * of the sessionId if it already exists) and rebuilds RecordingProperties
	 * object to set the final value of "name" property
	 */
	protected PropertiesRecordingId setFinalRecordingNameAndGetFreeRecordingId(Session session,
			RecordingProperties properties) {
		String recordingId = this.recordingManager.getFreeRecordingId(session.getSessionId());
		if (properties.name() == null || properties.name().isEmpty()) {
			// No name provided for the recording file. Use recordingId
			RecordingProperties.Builder builder = new RecordingProperties.Builder().name(recordingId)
					.outputMode(properties.outputMode()).hasAudio(properties.hasAudio()).hasVideo(properties.hasVideo())
					.mediaNode(properties.mediaNode());
			if (RecordingProperties.IS_COMPOSED(properties.outputMode()) && properties.hasVideo()) {
				builder.resolution(properties.resolution());
				builder.frameRate(properties.frameRate());
				builder.recordingLayout(properties.recordingLayout());
				if (RecordingLayout.CUSTOM.equals(properties.recordingLayout())) {
					builder.customLayout(properties.customLayout());
				}
				builder.shmSize(properties.shmSize());
			}
			if (OutputMode.INDIVIDUAL.equals(properties.outputMode())) {
				builder.ignoreFailedStreams(properties.ignoreFailedStreams());
			}
			properties = builder.build();
		}

		log.info("New recording id ({}) and final name ({})", recordingId, properties.name());
		return new PropertiesRecordingId(properties, recordingId);
	}

	protected void updateFilePermissions(String folder) {
		String command = "chmod -R 777 " + folder;
		try {
			String response = CommandExecutor.execCommand(5000, "/bin/sh", "-c", command);
			if ("".equals(response)) {
				log.info("KMS recording file permissions successfully updated");
			} else {
				log.error("KMS recording file permissions failed to update: {}", response);
			}
		} catch (IOException | InterruptedException e) {
			log.error("KMS recording file permissions failed to update. Error: {}", e.getMessage());
		}
	}

	protected OpenViduException failStartRecording(Session session, Recording recording, String errorMessage) {
		log.error("Recording start failed for session {}: {}", session.getSessionId(), errorMessage);
		recording.setStatus(io.openvidu.java.client.Recording.Status.failed);

		sealRecordingMetadataFileAsReady(recording, recording.getSize(), recording.getDuration(),
				getMetadataFilePath(recording));

		this.recordingManager.startingRecordings.remove(recording.getId());
		this.recordingManager.sessionsRecordingsStarting.remove(session.getSessionId());
		this.stopRecording(session, recording, null);
		return new OpenViduException(Code.RECORDING_START_ERROR_CODE, errorMessage);
	}

	protected void cleanRecordingMaps(Recording recording) {
		this.recordingManager.sessionsRecordings.remove(recording.getSessionId());
		this.recordingManager.startedRecordings.remove(recording.getId());
	}

	protected String getMetadataFilePath(Recording recording) {
		final String folderPath = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/";
		return folderPath + RecordingService.RECORDING_ENTITY_FILE + recording.getId();
	}

	protected void uploadRecording(final Recording recording, EndReason reason) {
		recordingUploader.uploadRecording(recording, () -> {
			final long timestamp = System.currentTimeMillis();
			cdr.recordRecordingStatusChanged(recording, reason, timestamp, recording.getStatus());
		}, () -> {
			final long timestamp = System.currentTimeMillis();
			cdr.recordRecordingStatusChanged(recording, reason, timestamp,
					io.openvidu.java.client.Recording.Status.failed);
		});
	}

	protected void storeAsUploadingRecording(Recording recording) {
		recordingUploader.storeAsUploadingRecording(recording.getId());
	}

	protected boolean isBeingUploaded(Recording recording) {
		return recordingUploader.isBeingUploaded(recording.getId());
	}

	/**
	 * Simple wrapper for returning update RecordingProperties and a free
	 * recordingId when starting a new recording
	 */
	protected class PropertiesRecordingId {

		RecordingProperties properties;
		String recordingId;

		PropertiesRecordingId(RecordingProperties properties, String recordingId) {
			this.properties = properties;
			this.recordingId = recordingId;
		}
	}

}
