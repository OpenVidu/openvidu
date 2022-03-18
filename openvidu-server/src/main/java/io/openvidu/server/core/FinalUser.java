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

package io.openvidu.server.core;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.server.cdr.CDREventParticipant;
import io.openvidu.server.summary.ParticipantSummary;
import io.openvidu.server.utils.GeoLocation;

public class FinalUser {

	private String id;
	private GeoLocation location;
	private String platform;
	private Map<String, ParticipantSummary> connections = new ConcurrentHashMap<>();

	public FinalUser(String id, String sessionId, Participant firstConnection) {
		this.id = id;
		this.location = firstConnection.getLocation();
		this.platform = firstConnection.getPlatform();
		this.connections.put(firstConnection.getParticipantPublicId(), new ParticipantSummary(firstConnection));
	}

	public String getId() {
		return id;
	}

	public GeoLocation getLocation() {
		return location;
	}

	public String getPlatform() {
		return platform;
	}

	public Map<String, ParticipantSummary> getConnections() {
		return connections;
	}

	public void addConnectionIfAbsent(Participant participant) {
		this.connections.putIfAbsent(participant.getParticipantPublicId(), new ParticipantSummary(participant));
	}

	public void setConnection(CDREventParticipant event) {
		final String participantPublicId = event.getParticipant().getParticipantPublicId();
		ParticipantSummary oldSummary = this.connections.remove(participantPublicId);
		this.connections.put(participantPublicId, new ParticipantSummary(event, oldSummary));
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("id", id);
		json.addProperty("location", this.location.toString());
		json.addProperty("ip", this.location.getIp());
		json.addProperty("platform", platform);

		JsonObject connectionsJson = new JsonObject();
		connectionsJson.addProperty("numberOfElements", connections.size());
		JsonArray jsonArray = new JsonArray();
		connections.values().forEach(connection -> {
			jsonArray.add(connection.toJson());
		});
		connectionsJson.add("content", jsonArray);
		json.add("connections", connectionsJson);

		return json;
	}

}
