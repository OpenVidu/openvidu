package io.openvidu.server.core;

import org.kurento.client.MediaProfileSpecType;

public enum MediaServer {

	kurento(MediaProfileSpecType.WEBM), mediasoup(MediaProfileSpecType.MKV);

	private final MediaProfileSpecType recordingProfile;

	MediaServer(MediaProfileSpecType recordingProfile) {
		this.recordingProfile = recordingProfile;
	}

	public MediaProfileSpecType getRecordingProfile() {
		return recordingProfile;
	}

	public MediaProfileSpecType getRecordingProfileAudioOnly() {
		return MediaProfileSpecType.valueOf(recordingProfile.name() + "_AUDIO_ONLY");
	}

	public MediaProfileSpecType getRecordingProfileVideoOnly() {
		return MediaProfileSpecType.valueOf(recordingProfile.name() + "_VIDEO_ONLY");
	}

	public String getRecordingFileExtension() {
		return "." + recordingProfile.name().toLowerCase();
	}
}
