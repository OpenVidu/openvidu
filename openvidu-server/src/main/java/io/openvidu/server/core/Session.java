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

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.recording.service.RecordingManager;

public class Session implements SessionInterface {

	private static final Logger log = LoggerFactory.getLogger(Session.class);

	protected OpenviduConfig openviduConfig;
	protected RecordingManager recordingManager;

	protected ConcurrentMap<String, Token> tokens = new ConcurrentHashMap<>();
	protected final ConcurrentMap<String, Participant> participants = new ConcurrentHashMap<>();
	protected String sessionId;
	protected SessionProperties sessionProperties;
	protected Long startTime;

	protected volatile boolean closed = false;
	protected AtomicInteger activePublishers = new AtomicInteger(0);

	/**
	 * This lock protects the following operations with read lock: [REST API](POST
	 * /api/tokens, POST /sessions/{sessionId}/connection), [RPC](joinRoom).
	 * 
	 * All of them get it with tryLock, immediately failing if written locked
	 * 
	 * Lock is written-locked upon session close up. That is: everywhere in the code
	 * calling method SessionManager#closeSessionAndEmptyCollections (5 times)
	 */
	public ReadWriteLock closingLock = new ReentrantReadWriteLock();

	/**
	 * This lock protects the operations of SessionManager#joinRoom and
	 * SessionManager#leaveRoom
	 */
	public Lock joinLeaveLock = new ReentrantLock();

	public final AtomicBoolean recordingManuallyStopped = new AtomicBoolean(false);

	public Session(Session previousSession) {
		this.sessionId = previousSession.getSessionId();
		this.startTime = previousSession.getStartTime();
		this.sessionProperties = previousSession.getSessionProperties();
		this.openviduConfig = previousSession.openviduConfig;
		this.recordingManager = previousSession.recordingManager;
		this.tokens = previousSession.tokens;
	}

	public Session(String sessionId, SessionProperties sessionProperties, OpenviduConfig openviduConfig,
			RecordingManager recordingManager) {
		this.sessionId = sessionId;
		this.startTime = System.currentTimeMillis();
		this.sessionProperties = sessionProperties;
		this.openviduConfig = openviduConfig;
		this.recordingManager = recordingManager;
	}

	public String getSessionId() {
		return this.sessionId;
	}

	public SessionProperties getSessionProperties() {
		return this.sessionProperties;
	}

	public Long getStartTime() {
		return this.startTime;
	}

	public Set<Participant> getParticipants() {
		checkClosed();
		return new HashSet<Participant>(this.participants.values());
	}

	public Participant getParticipantByPrivateId(String participantPrivateId) {
		checkClosed();
		return participants.get(participantPrivateId);
	}

	public Participant getParticipantByPublicId(String participantPublicId) {
		checkClosed();
		for (Participant p : participants.values()) {
			if (p.getParticipantPublicId().equals(participantPublicId)) {
				return p;
			}
		}
		return null;
	}

	public boolean onlyRecorderParticipant() {
		return this.participants.size() == 1 && ProtocolElements.RECORDER_PARTICIPANT_PUBLICID
				.equals(this.participants.values().iterator().next().getParticipantPublicId());
	}

	public int getActivePublishers() {
		return activePublishers.get();
	}

	public void registerPublisher() {
		this.activePublishers.incrementAndGet();
	}

	public void deregisterPublisher() {
		this.activePublishers.decrementAndGet();
	}

	public void storeToken(Token token) {
		this.tokens.put(token.getToken(), token);
	}

	public boolean isTokenValid(String token) {
		return this.tokens.containsKey(token);
	}

	public Token consumeToken(String token) {
		Token tokenObj = this.tokens.remove(token);
		showTokens("Token consumed");
		return tokenObj;
	}

	public void showTokens(String preMessage) {
		log.info("{} { Session: {} | Tokens: {} }", preMessage, this.sessionId, this.tokens.keySet().toString());
	}

	public boolean isClosed() {
		return closed;
	}

	public String getMediaNodeId() {
		return null;
	}

	protected void checkClosed() {
		if (isClosed()) {
			throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "The session '" + sessionId + "' is closed");
		}
	}

	public JsonObject toJson() {
		return this.sharedJson(KurentoParticipant::toJson);
	}

	public JsonObject withStatsToJson() {
		return this.sharedJson(KurentoParticipant::withStatsToJson);
	}

	private JsonObject sharedJson(Function<KurentoParticipant, JsonObject> toJsonFunction) {
		JsonObject json = new JsonObject();
		json.addProperty("sessionId", this.sessionId);
		json.addProperty("createdAt", this.startTime);
		json.addProperty("mediaMode", this.sessionProperties.mediaMode().name());
		json.addProperty("recordingMode", this.sessionProperties.recordingMode().name());
		json.addProperty("defaultOutputMode", this.sessionProperties.defaultOutputMode().name());
		if (Recording.OutputMode.COMPOSED.equals(this.sessionProperties.defaultOutputMode())) {
			json.addProperty("defaultRecordingLayout", this.sessionProperties.defaultRecordingLayout().name());
			if (RecordingLayout.CUSTOM.equals(this.sessionProperties.defaultRecordingLayout())) {
				json.addProperty("defaultCustomLayout", this.sessionProperties.defaultCustomLayout());
			}
		}
		if (this.sessionProperties.customSessionId() != null) {
			json.addProperty("customSessionId", this.sessionProperties.customSessionId());
		}
		JsonObject connections = new JsonObject();
		JsonArray participants = new JsonArray();
		this.participants.values().forEach(p -> {
			if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(p.getParticipantPublicId())) {
				participants.add(toJsonFunction.apply((KurentoParticipant) p));
			}
		});
		connections.addProperty("numberOfElements", participants.size());
		connections.add("content", participants);
		json.add("connections", connections);
		json.addProperty("recording", this.recordingManager.sessionIsBeingRecorded(this.sessionId));
		return json;
	}

	@Override
	public void join(Participant participant) {
	}

	@Override
	public void leave(String participantPrivateId, EndReason reason) {
	}

	@Override
	public boolean close(EndReason reason) {
		return false;
	}

}
