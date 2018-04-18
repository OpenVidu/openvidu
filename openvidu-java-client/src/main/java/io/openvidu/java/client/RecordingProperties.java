package io.openvidu.java.client;

public class RecordingProperties {
	
	private String name;
	
	public static class Builder {

		private String name = "";

		public RecordingProperties build() {
			return new RecordingProperties(this.name);
		}

		public RecordingProperties.Builder name(String name) {
			this.name = name;
			return this;
		}

	}
	
	protected RecordingProperties(String name) {
		this.name = name;
	}
	
	public String name() {
		return this.name;
	}

}
