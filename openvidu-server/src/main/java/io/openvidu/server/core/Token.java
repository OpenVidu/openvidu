/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import org.apache.commons.lang3.RandomStringUtils;

import com.google.gson.JsonObject;

import io.openvidu.java.client.ConnectionOptions;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.core.Participant.ParticipantStatus;
import io.openvidu.server.coturn.TurnCredentials;

public class Token {

	private String token;
	private String sessionId;
	private Long createdAt;
	private ConnectionOptions connectionOptions;
	private TurnCredentials turnCredentials;

	private final String connectionId = IdentifierPrefixes.PARTICIPANT_PUBLIC_ID
			+ RandomStringUtils.randomAlphabetic(1).toUpperCase() + RandomStringUtils.randomAlphanumeric(9);

	public Token(String token, String sessionId, ConnectionOptions connectionOptions, TurnCredentials turnCredentials) {
		this.token = token;
		this.sessionId = sessionId;
		this.createdAt = System.currentTimeMillis();
		this.connectionOptions = connectionOptions;
		this.turnCredentials = turnCredentials;
	}

	public ConnectionType getType() {
		return this.connectionOptions.getType();
	}

	public String getToken() {
		return token;
	}

	public void setToken(String newToken) {
		this.token = newToken;
	}

	public Long getCreatedAt() {
		return this.createdAt;
	}

	public String getServerMetadata() {
		return this.connectionOptions.getData();
	}

	public boolean record() {
		return this.connectionOptions.record();
	}

	public void setRecord(boolean newRecord) {
		this.updateConnectionOptions(connectionOptions.getType(), connectionOptions.getData(), newRecord,
				connectionOptions.getRole(), connectionOptions.getKurentoOptions(), connectionOptions.getRtspUri(),
				connectionOptions.adaptativeBitrate(), connectionOptions.onlyPlayWithSubscribers(),
				connectionOptions.getNetworkCache());
	}

	public OpenViduRole getRole() {
		return this.connectionOptions.getRole();
	}

	public void setRole(OpenViduRole newRole) {
		this.updateConnectionOptions(connectionOptions.getType(), connectionOptions.getData(),
				connectionOptions.record(), newRole, connectionOptions.getKurentoOptions(),
				connectionOptions.getRtspUri(), connectionOptions.adaptativeBitrate(),
				connectionOptions.onlyPlayWithSubscribers(), connectionOptions.getNetworkCache());
	}

	public KurentoOptions getKurentoOptions() {
		return this.connectionOptions.getKurentoOptions();
	}

	public String getRtspUri() {
		return this.connectionOptions.getRtspUri();
	}

	public Boolean adaptativeBitrate() {
		return this.connectionOptions.adaptativeBitrate();
	}

	public Boolean onlyPlayWithSubscribers() {
		return this.connectionOptions.onlyPlayWithSubscribers();
	}

	public Integer getNetworkCache() {
		return this.connectionOptions.getNetworkCache();
	}

	public TurnCredentials getTurnCredentials() {
		return turnCredentials;
	}

	public String getConnectionId() {
		return connectionId;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.getToken());
		json.addProperty("token", this.getToken());
		json.addProperty("createdAt", this.getCreatedAt());
		json.addProperty("connectionId", this.getConnectionId());
		json.addProperty("session", this.sessionId);
		json.addProperty("data", this.getServerMetadata());
		json.addProperty("role", this.getRole().toString());
		if (this.getKurentoOptions() != null) {
			json.add("kurentoOptions", this.getKurentoOptions().toJson());
		}
		return json;
	}

	public JsonObject toJsonAsParticipant() {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.getConnectionId());
		json.addProperty("object", "connection");
		json.addProperty("status", ParticipantStatus.pending.name());
		json.addProperty("connectionId", this.getConnectionId()); // DEPRECATED: better use id
		json.addProperty("sessionId", this.sessionId);
		json.addProperty("createdAt", this.createdAt);

		// Add all ConnectionOptions
		JsonObject connectionOptionsJson = this.getConnectionOptionsWithFinalJsonFormat();
		connectionOptionsJson.entrySet().forEach(entry -> {
			json.add(entry.getKey(), entry.getValue());
		});

		json.addProperty("token", this.getToken());
		json.add("activeAt", null);
		json.add("location", null);
		json.add("platform", null);
		json.add("clientData", null);
		json.add("publishers", null);
		json.add("subscribers", null);
		return json;
	}

	protected JsonObject getConnectionOptionsWithFinalJsonFormat() {
		JsonObject json = this.connectionOptions.toJson(this.sessionId);
		json.remove("session");
		json.addProperty("serverData", json.get("data").getAsString());
		json.remove("data");
		return json;
	}

	private void updateConnectionOptions(ConnectionType type, String data, Boolean record, OpenViduRole role,
			KurentoOptions kurentoOptions, String rtspUri, Boolean adaptativeBitrate, Boolean onlyPlayWithSubscribers,
			Integer networkCache) {
		ConnectionOptions.Builder builder = new ConnectionOptions.Builder();
		if (type != null) {
			builder.type(type);
		}
		if (data != null) {
			builder.data(data);
		}
		if (record != null) {
			builder.record(record);
		}
		if (role != null) {
			builder.role(role);
		}
		if (kurentoOptions != null) {
			builder.kurentoOptions(kurentoOptions);
		}
		if (rtspUri != null) {
			builder.rtspUri(rtspUri);
		}
		if (adaptativeBitrate != null) {
			builder.adaptativeBitrate(adaptativeBitrate);
		}
		if (onlyPlayWithSubscribers != null) {
			builder.onlyPlayWithSubscribers(onlyPlayWithSubscribers);
		}
		if (networkCache != null) {
			builder.networkCache(networkCache);
		}
		this.connectionOptions = builder.build();
	}

	@Override
	public String toString() {
		if (this.connectionOptions.getRole() != null)
			return this.connectionOptions.getRole().name();
		else
			return this.token;
	}

}