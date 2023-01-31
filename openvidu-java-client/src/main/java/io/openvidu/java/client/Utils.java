package io.openvidu.java.client;

/**
 * @hidden
 */
public class Utils {

	public static boolean isAcceptableRecordingResolution(String stringResolution) {
		// Matches every string with format "AxB", being A and B any number not starting
		// with 0 and 3 digits long or 4 digits long if they start with 1
		return stringResolution.matches("^(?!(0))(([0-9]{3})|1([0-9]{3}))x(?!0)(([0-9]{3})|1([0-9]{3}))$");
	}

	public static boolean isAcceptableRecordingFrameRate(Integer frameRate) {
		// Integer greater than 0 and below 120
		return (frameRate > 0 && frameRate <= 120);
	}

	public static boolean isAcceptableRecordingShmSize(Long shmSize) {
		// Long grater than 134217728 (128 MB)
		return (shmSize >= 134217728L);
	}

	public static boolean isServerMetadataFormatCorrect(String metadata) {
		return true;
	}

	public static boolean isValidCustomSessionId(String customSessionId) {
		return customSessionId.matches("[a-zA-Z0-9_\\-]+");
	}

	public static boolean isValidRecordingName(String recodingName) {
		return recodingName.matches("[a-zA-Z0-9_\\-~]+");
	}

}
