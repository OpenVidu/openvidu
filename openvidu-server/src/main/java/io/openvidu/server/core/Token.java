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

import java.net.MalformedURLException;
import java.util.List;

import org.apache.commons.lang3.RandomStringUtils;

import com.google.gson.JsonArray;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;

import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.IceServerProperties;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.core.Participant.ParticipantStatus;
import io.openvidu.server.coturn.TurnCredentials;

public class Token {

	private String token;
	private String sessionId;
	private Long createdAt;
	private ConnectionProperties connectionProperties;
	private TurnCredentials turnCredentials;

	private String connectionId = IdentifierPrefixes.PARTICIPANT_PUBLIC_ID
			+ RandomStringUtils.randomAlphabetic(1).toUpperCase() + RandomStringUtils.randomAlphanumeric(9);

	public Token(String token, String sessionId, ConnectionProperties connectionProperties,
			TurnCredentials turnCredentials) {
		this.token = token;
		this.sessionId = sessionId;
		this.createdAt = System.currentTimeMillis();
		this.connectionProperties = connectionProperties;
		this.turnCredentials = turnCredentials;
	}

	public ConnectionType getType() {
		return this.connectionProperties.getType();
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
		return this.connectionProperties.getData();
	}

	public Boolean record() {
		return this.connectionProperties.record();
	}

	public void setRecord(boolean newRecord) {
		this.updateConnectionProperties(connectionProperties.getType(), connectionProperties.getData(), newRecord,
				connectionProperties.getRole(), connectionProperties.getKurentoOptions(),
				connectionProperties.getRtspUri(), connectionProperties.adaptativeBitrate(),
				connectionProperties.onlyPlayWithSubscribers(), connectionProperties.getNetworkCache(),
				connectionProperties.getCustomIceServers());
	}

	public OpenViduRole getRole() {
		return this.connectionProperties.getRole();
	}

	public void setRole(OpenViduRole newRole) {
		this.updateConnectionProperties(connectionProperties.getType(), connectionProperties.getData(),
				connectionProperties.record(), newRole, connectionProperties.getKurentoOptions(),
				connectionProperties.getRtspUri(), connectionProperties.adaptativeBitrate(),
				connectionProperties.onlyPlayWithSubscribers(), connectionProperties.getNetworkCache(),
				connectionProperties.getCustomIceServers());
	}

	public KurentoOptions getKurentoOptions() {
		return this.connectionProperties.getKurentoOptions();
	}

	public String getRtspUri() {
		return this.connectionProperties.getRtspUri();
	}

	public Boolean adaptativeBitrate() {
		return this.connectionProperties.adaptativeBitrate();
	}

	public Boolean onlyPlayWithSubscribers() {
		return this.connectionProperties.onlyPlayWithSubscribers();
	}

	public Integer getNetworkCache() {
		return this.connectionProperties.getNetworkCache();
	}

	public TurnCredentials getTurnCredentials() {
		return turnCredentials;
	}

	public String getConnectionId() {
		return connectionId;
	}

	public List<IceServerProperties> getCustomIceServers() {
		return this.connectionProperties.getCustomIceServers();
	}

	public void setConnectionId(String connectionId) {
		this.connectionId = connectionId;
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

	public JsonArray getCustomIceServersAsJson() {
		JsonArray customIceServersJsonList = new JsonArray();
		if (this.connectionProperties.getCustomIceServers() != null) {
			this.connectionProperties.getCustomIceServers().forEach((customIceServer) -> {
				customIceServersJsonList.add(customIceServer.toJson());
			});
		}
		return customIceServersJsonList;
	}

	public JsonObject toJsonAsParticipant() {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.getConnectionId());
		json.addProperty("object", "connection");
		json.addProperty("status", ParticipantStatus.pending.name());
		json.addProperty("connectionId", this.getConnectionId()); // DEPRECATED: better use id
		json.addProperty("sessionId", this.sessionId);
		json.addProperty("createdAt", this.createdAt);

		// Add all ConnectionProperties
		JsonObject connectionPropertiesJson = this.getConnectionPropertiesWithFinalJsonFormat();
		connectionPropertiesJson.entrySet().forEach(entry -> {
			json.add(entry.getKey(), entry.getValue());
		});

		json.addProperty("token", this.getToken());
		json.add("activeAt", null);
		json.add("location", null);
		json.add("ip", null);
		json.add("platform", null);
		json.add("clientData", null);
		json.add("publishers", null);
		json.add("subscribers", null);
		return json;
	}

	protected JsonObject getConnectionPropertiesWithFinalJsonFormat() {
		JsonObject json = this.connectionProperties.toJson(this.sessionId);
		json.remove("session");
		if (json.has("data") && !json.get("data").isJsonNull()) {
			json.addProperty("serverData", json.get("data").getAsString());
		} else {
			json.add("serverData", JsonNull.INSTANCE);
		}
		json.remove("data");
		return json;
	}

	private void updateConnectionProperties(ConnectionType type, String data, Boolean record, OpenViduRole role,
			KurentoOptions kurentoOptions, String rtspUri, Boolean adaptativeBitrate, Boolean onlyPlayWithSubscribers,
			Integer networkCache, List<IceServerProperties> iceServerProperties) {
		ConnectionProperties.Builder builder = new ConnectionProperties.Builder();
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
			try {
				builder.rtspUri(rtspUri);
			} catch (MalformedURLException e) {
				e.printStackTrace();
			}
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
		if (iceServerProperties != null) {
			for (IceServerProperties customIceServer : iceServerProperties) {
				builder.addCustomIceServer(customIceServer);
			}
		}
		this.connectionProperties = builder.build();
	}

	@Override
	public String toString() {
		if (this.connectionProperties.getRole() != null)
			return this.connectionProperties.getRole().name();
		else
			return this.token;
	}

}