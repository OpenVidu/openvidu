/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

import org.json.simple.JSONObject;

import io.openvidu.server.coturn.TurnCredentials;

public class Token {

	private String token;
	private ParticipantRole role;
	private String serverMetadata = "";
	private TurnCredentials turnCredentials;

	public Token(String token) {
		this.token = token;
	}

	public Token(String token, ParticipantRole role, String serverMetadata, TurnCredentials turnCredentials) {
		this.token = token;
		this.role = role;
		this.serverMetadata = serverMetadata;
		this.turnCredentials = turnCredentials;
	}

	public String getToken() {
		return token;
	}

	public ParticipantRole getRole() {
		return role;
	}

	public String getServerMetadata() {
		return serverMetadata;
	}

	public TurnCredentials getTurnCredentials() {
		return turnCredentials;
	}

	@Override
	public String toString() {
		if (this.role != null)
			return this.role.name();
		else
			return this.token;
	}
	
	@SuppressWarnings("unchecked")
	public JSONObject toJSON() {
		JSONObject json = new JSONObject();
		json.put("token", this.token);
		json.put("role", this.role.name());
		json.put("data", this.serverMetadata);
		return json;
	}

}