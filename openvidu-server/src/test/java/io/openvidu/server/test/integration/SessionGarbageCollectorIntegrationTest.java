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

package io.openvidu.server.test.integration;

import java.util.HashMap;
import java.util.UUID;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.Token;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.rest.SessionRestController;
import io.openvidu.server.test.integration.config.IntegrationTestConfiguration;

/**
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@SpringBootTest(properties = { "OPENVIDU_SESSIONS_GARBAGE_INTERVAL=1", "OPENVIDU_SESSIONS_GARBAGE_THRESHOLD=1" })
@TestPropertySource(locations = "classpath:integration-test.properties")
@ContextConfiguration(classes = { IntegrationTestConfiguration.class })
@WebAppConfiguration
public class SessionGarbageCollectorIntegrationTest {

	private static final Logger log = LoggerFactory.getLogger(SessionGarbageCollectorIntegrationTest.class);

	@SpyBean
	private KmsManager kmsManager;

	@Autowired
	private SessionManager sessionManager;

	@Autowired
	private SessionRestController sessionRestController;

	@Test
	@DisplayName("Sessions not active garbage collector")
	void garbageCollectorOfSessionsNotActiveTest() throws Exception {

		log.info("Sessions not active garbage collector");

		JsonObject jsonResponse;

		getSession();
		jsonResponse = listSessions();

		Assertions.assertEquals(1, jsonResponse.get("numberOfElements").getAsInt(), "Wrong number of sessions");

		Thread.sleep(2000);

		jsonResponse = listSessions();
		Assertions.assertEquals(0, jsonResponse.get("numberOfElements").getAsInt(), "Wrong number of sessions");

		getSession();
		getSession();
		Session session = getSession();
		jsonResponse = listSessions();
		Assertions.assertEquals(3, jsonResponse.get("numberOfElements").getAsInt(), "Wrong number of sessions");

		String token = getToken(session);
		joinParticipant(session, token);

		Thread.sleep(2000);

		jsonResponse = listSessions();
		Assertions.assertEquals(1, jsonResponse.get("numberOfElements").getAsInt(), "Wrong number of sessions");
	}

	private Session getSession() {
		String stringResponse = (String) sessionRestController.initializeSession(new HashMap<>()).getBody();
		JsonObject json = new Gson().fromJson(stringResponse, JsonObject.class);
		String sessionId = json.get("id").getAsString();
		return new Session(sessionId, null, null, null);
	}

	private String getToken(Session session) {
		String stringResponse = (String) sessionRestController
				.initializeConnection(session.getSessionId(), new HashMap<>()).getBody();
		return new Gson().fromJson(stringResponse, JsonObject.class).get("token").getAsString();
	}

	private JsonObject listSessions() {
		String stringResponse = (String) sessionRestController.listSessions(false, false).getBody();
		return new Gson().fromJson(stringResponse, JsonObject.class);
	}

	private void joinParticipant(Session session, String token) {
		ConnectionProperties connectionProperties = new ConnectionProperties.Builder().data("SERVER_METADATA").build();
		Token t = new Token(token, session.getSessionId(), connectionProperties, null);
		String uuid = UUID.randomUUID().toString();
		String participantPrivateId = "PARTICIPANT_PRIVATE_ID_" + uuid;
		String finalUserId = "FINAL_USER_ID_" + uuid;
		Participant participant = sessionManager.newParticipant(session, participantPrivateId, t, "CLIENT_METADATA",
				null, "Chrome", finalUserId);
		sessionManager.joinRoom(participant, session.getSessionId(), null);
	}

}
