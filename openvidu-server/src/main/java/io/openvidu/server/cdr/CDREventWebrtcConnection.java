package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.server.core.MediaOptions;

public class CDREventWebrtcConnection extends CDREventEnd implements Comparable<CDREventWebrtcConnection> {

	String participantId;
	MediaOptions mediaOptions;
	String receivingFrom;

	// webrtcConnectionCreated
	public CDREventWebrtcConnection(String sessionId, String participantId, MediaOptions mediaOptions,
			String receivingFrom) {
		super(CDREventName.webrtcConnectionCreated, sessionId, System.currentTimeMillis());
		this.participantId = participantId;
		this.mediaOptions = mediaOptions;
		this.receivingFrom = receivingFrom;
	}

	// webrtcConnectionDestroyed
	public CDREventWebrtcConnection(CDREvent event, String reason) {
		super(CDREventName.webrtcConnectionDestroyed, event.getSessionId(), event.getTimestamp(), reason);
		CDREventWebrtcConnection e = (CDREventWebrtcConnection) event;
		this.participantId = e.participantId;
		this.mediaOptions = e.mediaOptions;
		this.receivingFrom = e.receivingFrom;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("participantId", this.participantId);
		if (this.receivingFrom != null) {
			json.addProperty("connection", "INBOUND");
			json.addProperty("receivingFrom", this.receivingFrom);
		} else {
			json.addProperty("connection", "OUTBOUND");
		}
		if (this.mediaOptions.hasVideo()) {
			json.addProperty("videoSource", this.mediaOptions.getTypeOfVideo());
			json.addProperty("videoFramerate", this.mediaOptions.getFrameRate());
			json.addProperty("videoDimensions", this.mediaOptions.getVideoDimensions());
		}
		json.addProperty("audioEnabled", this.mediaOptions.hasAudio());
		json.addProperty("videoEnabled", this.mediaOptions.hasVideo());
		return json;
	}

	public int compareTo(CDREventWebrtcConnection other) {
		if (this.participantId.equals(other.participantId)) {
			if (this.receivingFrom != null && other.receivingFrom != null) {
				if (this.receivingFrom.equals(other.receivingFrom)) {
					return 0;
				} else {
					return 1;
				}
			} else {
				if (this.receivingFrom == null && other.receivingFrom == null) {
					return 0;
				} else {
					return 1;
				}
			}
		}
		return 1;
	}

}
