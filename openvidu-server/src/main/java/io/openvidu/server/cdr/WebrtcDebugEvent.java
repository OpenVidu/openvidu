package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.server.core.Participant;

public class WebrtcDebugEvent {

	public enum WebrtcDebugEventIssuer {
		client, server
	}

	public enum WebrtcDebugEventOperation {
		publish, subscribe, reconnectPublisher, reconnectSubscriber, forciblyReconnectSubscriber
	}

	public enum WebrtcDebugEventType {
		sdpOffer, sdpOfferMunged, sdpAnswer, iceCandidate
	}

	private Participant participant;
	private String endpoint;
	private WebrtcDebugEventIssuer issuer;
	private WebrtcDebugEventOperation operation;
	private WebrtcDebugEventType type;
	private String content;
	private Long timestamp;

	public WebrtcDebugEvent(Participant participant, String endpoint, WebrtcDebugEventIssuer issuer,
			WebrtcDebugEventOperation operation, WebrtcDebugEventType type, String content) {
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
		json.addProperty("uniqueSessionId", participant.getUniqueSessionId());
		json.addProperty("user", participant.getFinalUserId());
		json.addProperty("connectionId", participant.getParticipantPublicId());
		json.addProperty("endpoint", this.endpoint);
		json.addProperty("issuer", this.issuer.name());
		json.addProperty("operation", this.operation.name());
		json.addProperty("type", this.type.name());
		json.addProperty("content", this.content);
		json.addProperty("timestamp", this.timestamp);
		return json;
	}

}
