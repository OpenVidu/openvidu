/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Participant;

public class CDREventParticipant extends CDREventEnd {

	private Participant participant;

	// participantJoined
	public CDREventParticipant(Participant participant) {
		super(CDREventName.participantJoined, participant.getSessionId(), participant.getUniqueSessionId(),
				participant.getActiveAt());
		this.participant = participant;
	}

	// participantLeft
	public CDREventParticipant(CDREventParticipant event, EndReason reason, Long timestamp) {
		super(CDREventName.participantLeft, event.getSessionId(), event.getUniqueSessionId(), event.getTimestamp(),
				reason, timestamp);
		this.participant = event.participant;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		// TODO: remove deprecated "participantId" when possible
		json.addProperty("participantId", this.participant.getParticipantPublicId());
		json.addProperty("connectionId", this.participant.getParticipantPublicId());
		json.addProperty("location", this.participant.getLocation().toString());
		json.addProperty("ip", this.participant.getLocation().getIp());
		json.addProperty("platform", this.participant.getPlatform());
		json.addProperty("clientData", this.participant.getClientMetadata());
		json.addProperty("serverData", this.participant.getServerMetadata());
		return json;
	}

	public Participant getParticipant() {
		return this.participant;
	}

}
