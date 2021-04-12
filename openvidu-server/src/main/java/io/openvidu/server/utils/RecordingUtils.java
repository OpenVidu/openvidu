package io.openvidu.server.utils;

import io.openvidu.java.client.Recording.OutputMode;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.core.Session;

public final class RecordingUtils {

	public final static boolean IS_COMPOSED(OutputMode outputMode) {
		return (OutputMode.COMPOSED.equals(outputMode) || OutputMode.COMPOSED_QUICK_START.equals(outputMode));
	}

	public final static RecordingProperties RECORDING_PROPERTIES_WITH_MEDIA_NODE(Session session) {
		RecordingProperties recordingProperties = session.getSessionProperties().defaultRecordingProperties();
		if (recordingProperties.mediaNode() == null) {
			recordingProperties = new RecordingProperties.Builder(recordingProperties)
					.mediaNode(session.getMediaNodeId()).build();
		}
		return recordingProperties;
	}

}
