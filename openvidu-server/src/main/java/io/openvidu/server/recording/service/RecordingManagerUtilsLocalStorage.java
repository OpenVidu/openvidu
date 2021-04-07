package io.openvidu.server.recording.service;

import java.io.File;
import java.util.HashSet;
import java.util.Set;

import org.springframework.http.HttpStatus;

import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.rest.RequestMappings;

public class RecordingManagerUtilsLocalStorage extends RecordingManagerUtils {

	public RecordingManagerUtilsLocalStorage(OpenviduConfig openviduConfig, RecordingManager recordingManager) {
		super(openviduConfig, recordingManager);
	}

	@Override
	public Recording getRecordingFromStorage(String recordingId) {
		File file = recordingManager.getRecordingEntityFileFromLocalStorage(recordingId);
		return recordingManager.getRecordingFromEntityFile(file);
	}

	@Override
	public Set<Recording> getAllRecordingsFromStorage() {
		return recordingManager.getAllRecordingsFromLocalStorage();
	}

	@Override
	public HttpStatus deleteRecordingFromStorage(String recordingId) {
		return recordingManager.deleteRecordingFromLocalStorage(recordingId);
	}

	@Override
	public String getRecordingUrl(Recording recording) {
		String basePath = RequestMappings.RECORDINGS.replaceFirst("^/", "") + "/";
		return openviduConfig.getFinalUrl() + basePath + recording.getId() + "/" + recording.getName() + "."
				+ this.getExtensionFromRecording(recording);
	}

	@Override
	protected Set<String> getAllRecordingIdsFromStorage(String sessionIdPrefix) {
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

}
