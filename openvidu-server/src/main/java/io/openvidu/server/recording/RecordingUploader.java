package io.openvidu.server.recording;

public interface RecordingUploader {

	void uploadRecording(Recording recording, Runnable successCallback, Runnable errorCallback);

	void storeAsUploadingRecording(String recording);

	boolean isBeingUploaded(String recordingId);

}
