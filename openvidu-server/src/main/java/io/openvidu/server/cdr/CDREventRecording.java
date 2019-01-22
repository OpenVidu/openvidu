package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingLayout;
import io.openvidu.server.recording.Recording;

public class CDREventRecording extends CDREventEnd {

	private Recording recording;

	// recordingStarted
	public CDREventRecording(String sessionId, Recording recording) {
		super(CDREventName.recordingStarted, sessionId, recording.getCreatedAt());
		this.recording = recording;
	}

	// recordingStopped
	public CDREventRecording(CDREvent event, String reason) {
		super(CDREventName.recordingStopped, event.getSessionId(), event.getTimestamp(), reason);
		this.recording = ((CDREventRecording) event).recording;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("id", this.recording.getId());
		json.addProperty("name", this.recording.getName());
		json.addProperty("outputMode", this.recording.getOutputMode().name());
		if (io.openvidu.java.client.Recording.OutputMode.COMPOSED.equals(this.recording.getOutputMode())) {
			json.addProperty("resolution", this.recording.getResolution());
			json.addProperty("recordingLayout", this.recording.getRecordingLayout().name());
			if (RecordingLayout.CUSTOM.equals(this.recording.getRecordingLayout())
					&& this.recording.getCustomLayout() != null && !this.recording.getCustomLayout().isEmpty()) {
				json.addProperty("customLayout", this.recording.getCustomLayout());
			}
		}
		json.addProperty("hasAudio", this.recording.hasAudio());
		json.addProperty("hasVideo", this.recording.hasVideo());
		json.addProperty("size", this.recording.getSize());
		json.addProperty("duration", this.recording.getDuration());
		return json;
	}

}
