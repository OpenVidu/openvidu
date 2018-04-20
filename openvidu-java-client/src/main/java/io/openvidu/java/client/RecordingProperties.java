package io.openvidu.java.client;

public class RecordingProperties {
	
	private String name;
	private RecordingLayout recordingLayout;
	
	public static class Builder {

		private String name = "";
		private RecordingLayout recordingLayout;

		public RecordingProperties build() {
			return new RecordingProperties(this.name, this.recordingLayout);
		}

		public RecordingProperties.Builder name(String name) {
			this.name = name;
			return this;
		}
		
		public RecordingProperties.Builder recordingLayout(RecordingLayout layout) {
			this.recordingLayout = layout;
			return this;
		}

	}
	
	protected RecordingProperties(String name, RecordingLayout layout) {
		this.name = name;
		this.recordingLayout = layout;
	}
	
	public String name() {
		return this.name;
	}
	
	public RecordingLayout recordingLayout() {
		return this.recordingLayout;
	}

}
