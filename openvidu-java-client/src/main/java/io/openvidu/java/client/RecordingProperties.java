package io.openvidu.java.client;

public class RecordingProperties {

	private String name;
	private RecordingLayout recordingLayout;
	private String customLayout;

	public static class Builder {

		private String name = "";
		private RecordingLayout recordingLayout;
		private String customLayout;

		public RecordingProperties build() {
			return new RecordingProperties(this.name, this.recordingLayout, this.customLayout);
		}

		public RecordingProperties.Builder name(String name) {
			this.name = name;
			return this;
		}

		public RecordingProperties.Builder recordingLayout(RecordingLayout layout) {
			this.recordingLayout = layout;
			return this;
		}

		public RecordingProperties.Builder customLayout(String path) {
			this.customLayout = path;
			return this;
		}

	}

	protected RecordingProperties(String name, RecordingLayout layout, String customLayout) {
		this.name = name;
		this.recordingLayout = layout;
		this.customLayout = customLayout;
	}

	public String name() {
		return this.name;
	}

	public RecordingLayout recordingLayout() {
		return this.recordingLayout;
	}

	public String customLayout() {
		return this.customLayout;
	}

}
