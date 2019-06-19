package io.openvidu.server.recording;

import java.io.IOException;
import java.util.Collection;

public class DummyRecordingDownloader implements RecordingDownloader {

	@Override
	public void downloadRecording(Recording recording, Collection<String> streamIds) throws IOException {
		// Do nothing
	}

}
