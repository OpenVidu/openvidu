package io.openvidu.server.recording;

import java.io.IOException;
import java.util.Collection;

public class DummyRecordingDownloader implements RecordingDownloader {

	@Override
	public void downloadRecording(Recording recording, Collection<String> streamIds, Runnable callback)
			throws IOException {
		// Just immediately run callback function
		callback.run();
		return;
	}

	@Override
	public void cancelDownload(String recordingId) {
	}

}
