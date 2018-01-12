package io.openvidu.server.kurento.core;

import java.util.Set;

import org.kurento.client.IceCandidate;

import com.google.gson.JsonObject;

import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.SessionEventsHandler;

public class KurentoSessionEventsHandler extends SessionEventsHandler {

	public KurentoSessionEventsHandler() {
	}

	public void onIceCandidate(String roomName, String participantId, String endpointName, IceCandidate candidate) {
		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.ICECANDIDATE_EPNAME_PARAM, endpointName);
		params.addProperty(ProtocolElements.ICECANDIDATE_SDPMLINEINDEX_PARAM, candidate.getSdpMLineIndex());
		params.addProperty(ProtocolElements.ICECANDIDATE_SDPMID_PARAM, candidate.getSdpMid());
		params.addProperty(ProtocolElements.ICECANDIDATE_CANDIDATE_PARAM, candidate.getCandidate());
		rpcNotificationService.sendNotification(participantId, ProtocolElements.ICECANDIDATE_METHOD, params);
	}

	public void onPipelineError(String roomName, Set<Participant> participants, String description) {
		JsonObject notifParams = new JsonObject();
		notifParams.addProperty(ProtocolElements.MEDIAERROR_ERROR_PARAM, description);
		for (Participant p : participants) {
			rpcNotificationService.sendNotification(p.getParticipantPrivateId(), ProtocolElements.MEDIAERROR_METHOD,
					notifParams);
		}
	}

	public void onMediaElementError(String roomName, String participantId, String description) {
		JsonObject notifParams = new JsonObject();
		notifParams.addProperty(ProtocolElements.MEDIAERROR_ERROR_PARAM, description);
		rpcNotificationService.sendNotification(participantId, ProtocolElements.MEDIAERROR_METHOD, notifParams);
	}

	public void updateFilter(String roomName, Participant participant, String filterId, String state) {
	}

	public String getNextFilterState(String filterId, String state) {
		return null;
	}

}
