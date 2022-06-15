package io.openvidu.server.utils;

import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.core.Session;

public final class RecordingUtils {

	public final static RecordingProperties RECORDING_PROPERTIES_WITH_MEDIA_NODE(Session session) {
		RecordingProperties recordingProperties = session.getSessionProperties().defaultRecordingProperties();
		if (RecordingProperties.IS_COMPOSED(recordingProperties.outputMode())
				&& recordingProperties.mediaNode() == null) {
			recordingProperties = new RecordingProperties.Builder(recordingProperties)
					.mediaNode(session.getMediaNodeId()).build();
		}
		return recordingProperties;
	}

}
