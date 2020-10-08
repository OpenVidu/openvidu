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

import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.coturn.TurnCredentials;
import io.openvidu.server.kurento.core.KurentoTokenOptions;

public class Token {

	private String token;
	private String sessionId;
	private OpenViduRole role;
	private String serverMetadata = "";
	private boolean record;
	private TurnCredentials turnCredentials;
	private KurentoTokenOptions kurentoTokenOptions;

	private final String connectionId = IdentifierPrefixes.PARTICIPANT_PUBLIC_ID
			+ RandomStringUtils.randomAlphabetic(1).toUpperCase() + RandomStringUtils.randomAlphanumeric(9);

	public Token(String token, String sessionId, OpenViduRole role, String serverMetadata, boolean record,
			TurnCredentials turnCredentials, KurentoTokenOptions kurentoTokenOptions) {
		this.token = token;
		this.sessionId = sessionId;
		this.role = role;
		this.serverMetadata = serverMetadata;
		this.record = record;
		this.turnCredentials = turnCredentials;
		this.kurentoTokenOptions = kurentoTokenOptions;
	}

	public String getToken() {
		return token;
	}

	public void setToken(String token) {
		this.token = token;
	}

	public OpenViduRole getRole() {
		return role;
	}

	public String getServerMetadata() {
		return serverMetadata;
	}

	public boolean record() {
		return record;
	}

	public TurnCredentials getTurnCredentials() {
		return turnCredentials;
	}

	public KurentoTokenOptions getKurentoTokenOptions() {
		return kurentoTokenOptions;
	}

	public String getConnectionId() {
		return connectionId;
	}

	public void setRole(OpenViduRole role) {
		this.role = role;
	}

	public void setRecord(boolean record) {
		this.record = record;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("token", this.getToken());
		json.addProperty("id", this.getToken());
		json.addProperty("connectionId", this.getConnectionId());
		json.addProperty("session", this.sessionId);
		json.addProperty("role", this.getRole().toString());
		json.addProperty("data", this.getServerMetadata());
		json.addProperty("record", this.record());
		if (this.getKurentoTokenOptions() != null) {
			json.add("kurentoOptions", this.getKurentoTokenOptions().toJson());
		}
		return json;
	}

	@Override
	public String toString() {
		if (this.role != null)
			return this.role.name();
		else
			return this.token;
	}

}