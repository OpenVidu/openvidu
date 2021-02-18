package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.server.core.Participant;

public class WebrtcDebugEvent {

	private Participant participant;
	private String endpoint;
	private String issuer; // [client, server]
	private String operation; // [publish, subscribe, reconnectPublisher, reconnectSubscriber]
	private String type; // [sdpOffer, mungedSdpOffer, sdpAnswer]
	private String content;
	private Long timestamp;

	public WebrtcDebugEvent(Participant participant, String endpoint, String issuer, String operation, String type,
			String content) {
		this.participant = participant;
		this.endpoint = endpoint;
		this.issuer = issuer;
		this.operation = operation;
		this.type = type;
		this.content = content;
		this.timestamp = System.currentTimeMillis();
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("sessionId", participant.getSessionId());
		json.addProperty("user", participant.getFinalUserId());
		json.addProperty("connectionId", participant.getParticipantPublicId());
		json.addProperty("endpoint", this.endpoint);
		json.addProperty("issuer", this.issuer);
		json.addProperty("operation", this.operation);
		json.addProperty("type", this.type);
		json.addProperty("content", this.content);
		json.addProperty("timestamp", this.timestamp);
		return json;
	}

}
