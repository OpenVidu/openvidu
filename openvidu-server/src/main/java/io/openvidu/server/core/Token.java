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

package io.openvidu.server.core;

import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.coturn.TurnCredentials;
import io.openvidu.server.kurento.core.KurentoTokenOptions;

public class Token {

	private String token;
	private OpenViduRole role;
	private String serverMetadata = "";
	private TurnCredentials turnCredentials;

	private KurentoTokenOptions kurentoTokenOptions;

	public Token(String token) {
		this.token = token;
	}

	public Token(String token, OpenViduRole role, String serverMetadata, TurnCredentials turnCredentials,
			KurentoTokenOptions kurentoTokenOptions) {
		this.token = token;
		this.role = role;
		this.serverMetadata = serverMetadata;
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

	public TurnCredentials getTurnCredentials() {
		return turnCredentials;
	}

	public KurentoTokenOptions getKurentoTokenOptions() {
		return kurentoTokenOptions;
	}

	@Override
	public String toString() {
		if (this.role != null)
			return this.role.name();
		else
			return this.token;
	}

}