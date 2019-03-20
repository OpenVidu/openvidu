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

package io.openvidu.server.summary;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.server.cdr.CDREventParticipant;
import io.openvidu.server.cdr.CDREventWebrtcConnection;
import io.openvidu.server.core.Participant;

public class ParticipantSummary {

	private CDREventParticipant eventParticipantEnd;
	private Map<String, CDREventWebrtcConnection> publishers = new ConcurrentHashMap<>();
	private Map<String, CDREventWebrtcConnection> subscribers = new ConcurrentHashMap<>();

	public ParticipantSummary(CDREventParticipant event) {
		this.eventParticipantEnd = event;
	}

	public ParticipantSummary(CDREventParticipant event, ParticipantSummary oldSummary) {
		this.eventParticipantEnd = event;
		this.publishers = oldSummary.publishers;
		this.subscribers = oldSummary.subscribers;
	}

	public ParticipantSummary(String sessionId, Participant participant) {
		this.eventParticipantEnd = new CDREventParticipant(sessionId, participant);
	}

	public void addPublisherClosed(String streamId, CDREventWebrtcConnection event) {
		this.publishers.put(streamId, event);
	}

	public void addSubscriberClosed(String streamId, CDREventWebrtcConnection event) {
		this.subscribers.put(streamId, event);
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();

		json.addProperty("createdAt", this.eventParticipantEnd.getStartTime());
		json.addProperty("destroyedAt", this.eventParticipantEnd.getTimestamp());

		Participant p = this.eventParticipantEnd.getParticipant();
		json.addProperty("connectionId", p.getParticipantPublicId());
		json.addProperty("clientData", p.getClientMetadata());
		json.addProperty("serverData", p.getServerMetadata());

		long duration = (this.eventParticipantEnd.getTimestamp() - this.eventParticipantEnd.getStartTime()) / 1000;
		json.addProperty("duration", duration);

		json.addProperty("reason",
				this.eventParticipantEnd.getReason().name() != null ? this.eventParticipantEnd.getReason().name() : "");

		// Publishers summary
		JsonObject publishersJson = new JsonObject();
		publishersJson.addProperty("numberOfElements", publishers.size());
		JsonArray jsonArrayPublishers = new JsonArray();
		publishers.values().forEach(cdrEvent -> {
			JsonObject j = cdrEvent.toJson();
			j.remove("participantId");
			j.remove("connection");
			jsonArrayPublishers.add(j);
		});
		publishersJson.add("content", jsonArrayPublishers);
		json.add("publishers", publishersJson);

		// Subscribers summary
		JsonObject subscribersJson = new JsonObject();
		subscribersJson.addProperty("numberOfElements", subscribers.size());
		JsonArray jsonArraySubscribers = new JsonArray();
		subscribers.values().forEach(cdrEvent -> {
			JsonObject j = cdrEvent.toJson();
			j.remove("participantId");
			j.remove("connection");
			jsonArraySubscribers.add(j);
		});
		subscribersJson.add("content", jsonArraySubscribers);
		json.add("subscribers", subscribersJson);

		return json;
	}

}
