/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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

	public void onIceCandidate(String roomName, String participantPrivateId, String senderPublicId, String endpointName,
			IceCandidate candidate) {
		JsonObject params = new JsonObject();

		params.addProperty(ProtocolElements.ICECANDIDATE_SENDERCONNECTIONID_PARAM, senderPublicId);
		params.addProperty(ProtocolElements.ICECANDIDATE_EPNAME_PARAM, endpointName);
		params.addProperty(ProtocolElements.ICECANDIDATE_SDPMLINEINDEX_PARAM, candidate.getSdpMLineIndex());
		params.addProperty(ProtocolElements.ICECANDIDATE_SDPMID_PARAM, candidate.getSdpMid());
		params.addProperty(ProtocolElements.ICECANDIDATE_CANDIDATE_PARAM, candidate.getCandidate());
		rpcNotificationService.sendNotification(participantPrivateId, ProtocolElements.ICECANDIDATE_METHOD, params);
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
