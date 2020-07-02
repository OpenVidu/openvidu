package io.openvidu.server.utils;

import io.openvidu.java.client.Recording.OutputMode;

public final class RecordingUtils {

	public final static boolean IS_COMPOSED(OutputMode outputMode) {
		return (OutputMode.COMPOSED.equals(outputMode) || OutputMode.COMPOSED_QUICK_START.equals(outputMode));
	}

}
