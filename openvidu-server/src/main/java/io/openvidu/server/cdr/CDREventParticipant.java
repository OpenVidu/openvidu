package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.server.core.Participant;

public class CDREventParticipant extends CDREventEnd {

	private Participant participant;

	// participantJoined
	public CDREventParticipant(String sessionId, Participant participant) {
		super(CDREventName.participantJoined, sessionId, participant.getCreatedAt());
		this.participant = participant;
	}

	// participantLeft
	public CDREventParticipant(CDREvent event, String reason) {
		super(CDREventName.participantLeft, event.getSessionId(), event.getTimestamp(), reason);
		this.participant = ((CDREventParticipant) event).participant;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("participantId", this.participant.getParticipantPublicId());
		json.addProperty("location", this.participant.getLocation());
		json.addProperty("platform", this.participant.getPlatform());
		return json;
	}

}
