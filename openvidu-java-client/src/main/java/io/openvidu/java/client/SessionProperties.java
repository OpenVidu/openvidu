package io.openvidu.java.client;

public class SessionProperties {

	private MediaMode mediaMode;
	private RecordingMode recordingMode;
	private RecordingLayout recordingLayout;

	public static class Builder {

		private MediaMode mediaMode = MediaMode.ROUTED;
		private RecordingMode recordingMode = RecordingMode.MANUAL;
		private RecordingLayout recordingLayout = RecordingLayout.BEST_FIT;

		public SessionProperties build() {
			return new SessionProperties(this.mediaMode, this.recordingMode, this.recordingLayout);
		}

		public SessionProperties.Builder mediaMode(MediaMode mediaMode) {
			this.mediaMode = mediaMode;
			return this;
		}

		public SessionProperties.Builder recordingMode(RecordingMode recordingMode) {
			this.recordingMode = recordingMode;
			return this;
		}

		public SessionProperties.Builder recordingLayout(RecordingLayout recordingLayout) {
			this.recordingLayout = recordingLayout;
			return this;
		}

	}

	protected SessionProperties() {
		this.mediaMode = MediaMode.ROUTED;
		this.recordingMode = RecordingMode.MANUAL;
		this.recordingLayout = RecordingLayout.BEST_FIT;
	}

	private SessionProperties(MediaMode mediaMode, RecordingMode recordingMode, RecordingLayout recordingLayout) {
		this.mediaMode = mediaMode;
		this.recordingMode = recordingMode;
		this.recordingLayout = recordingLayout;
	}

	public RecordingMode recordingMode() {
		return this.recordingMode;
	}

	public MediaMode mediaMode() {
		return this.mediaMode;
	}

	public RecordingLayout recordingLayout() {
		return this.recordingLayout;
	}

}