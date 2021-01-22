package io.openvidu.server.recording;

public class DummyRecordingUploader implements RecordingUploader {

	@Override
	public void uploadRecording(Recording recording, Runnable successCallback, Runnable errorCallback) {
		// Just immediately run success callback function
		successCallback.run();
	}

	@Override
	public void storeAsUploadingRecording(String recording) {
	}

	@Override
	public boolean isBeingUploaded(String recordingId) {
		return false;
	}

}
