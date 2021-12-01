package io.openvidu.server.recording.service;

import java.util.Set;

import org.springframework.http.HttpStatus;

import io.openvidu.java.client.Recording.OutputMode;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.utils.JsonUtils;

public abstract class RecordingManagerUtils {

	protected OpenviduConfig openviduConfig;
	protected RecordingManager recordingManager;

	protected JsonUtils jsonUtils = new JsonUtils();

	public RecordingManagerUtils(OpenviduConfig openviduConfig, RecordingManager recordingManager) {
		this.openviduConfig = openviduConfig;
		this.recordingManager = recordingManager;
	}

	public abstract Recording getRecordingFromStorage(String recordingId);

	public abstract Set<Recording> getAllRecordingsFromStorage();

	public abstract HttpStatus deleteRecordingFromStorage(String recordingId);

	protected abstract String getRecordingUrl(Recording recording);

	protected abstract Set<String> getAllRecordingIdsFromStorage(String sessionIdPrefix);

	protected String getExtensionFromRecording(Recording recording) {
		if (OutputMode.INDIVIDUAL.equals(recording.getOutputMode())) {
			return "zip";
		} else if (recording.hasVideo()) {
			return "mp4";
		} else {
			return "webm";
		}
	}

	public String getFreeRecordingId(String sessionId) {
		Set<String> recordingIds = getAllRecordingIdsFromStorage(sessionId);
		return getNextAvailableRecordingId(sessionId, recordingIds);
	}

	private String getNextAvailableRecordingId(String baseRecordingId, Set<String> existingRecordingIds) {
		String recordingId = baseRecordingId;
		boolean isPresent = existingRecordingIds.contains(recordingId);
		int i = 1;
		while (isPresent) {
			recordingId = baseRecordingId + "~" + i;
			i++;
			isPresent = existingRecordingIds.contains(recordingId);
		}
		return recordingId;
	}

}
