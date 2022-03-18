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

package io.openvidu.server.kurento.endpoint;

import org.kurento.client.RaiseBaseEvent;
import org.kurento.jsonrpc.JsonUtils;

import com.google.gson.JsonObject;

import io.openvidu.server.core.Participant;

public class KmsEvent {

	long timestamp;
	long msSinceCreation;
	Participant participant;
	String endpoint;
	RaiseBaseEvent event;

	public KmsEvent(RaiseBaseEvent event, Participant participant, String endpointName, long createdAt) {
		this.event = event;
		this.participant = participant;
		this.endpoint = endpointName;
		this.timestamp = Long.parseLong(event.getTimestampMillis());
		this.msSinceCreation = this.timestamp - createdAt;

		this.removeSourceForJsonCompatibility();
	}

	public JsonObject toJson() {
		JsonObject json = JsonUtils.toJsonObject(event);
		json.remove("tags");
		json.remove("timestampMillis");
		json.addProperty("timestamp", timestamp);
		json.addProperty("sessionId", participant.getSessionId());
		json.addProperty("uniqueSessionId", participant.getUniqueSessionId());
		json.addProperty("user", participant.getFinalUserId());
		// TODO: remove deprecated "connection" when possible
		json.addProperty("connection", participant.getParticipantPublicId());
		json.addProperty("connectionId", participant.getParticipantPublicId());
		json.addProperty("endpoint", this.endpoint);
		json.addProperty("msSinceEndpointCreation", msSinceCreation);
		return json;
	}

	public long getTimestamp() {
		return this.timestamp;
	}

	private void removeSourceForJsonCompatibility() {
		// This avoids stack overflow error when transforming RaiseBaseEvent into
		// JsonObject
		this.event.setSource(null);
	}

}