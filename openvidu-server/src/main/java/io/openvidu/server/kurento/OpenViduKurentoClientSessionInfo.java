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

package io.openvidu.server.kurento;

/**
 * Implementation of the session info interface, contains a participant's
 * private id and the session's id.
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 *
 */
public class OpenViduKurentoClientSessionInfo implements KurentoClientSessionInfo {

	private String participantPrivateId;
	private String sessionId;

	public OpenViduKurentoClientSessionInfo(String participantPrivateId, String roomName) {
		super();
		this.participantPrivateId = participantPrivateId;
		this.sessionId = roomName;
	}

	public String getParticipantPrivateId() {
		return participantPrivateId;
	}

	public void setParticipantPrivateId(String participantPrivateId) {
		this.participantPrivateId = participantPrivateId;
	}

	@Override
	public String getRoomName() {
		return sessionId;
	}

	public void setSessionId(String sessionId) {
		this.sessionId = sessionId;
	}
}
