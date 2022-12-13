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

import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.stream.Collectors;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.recording.service.RecordingManager;

public class Session implements SessionInterface {

	protected OpenviduConfig openviduConfig;
	protected RecordingManager recordingManager;

	protected ConcurrentMap<String, Token> tokens = new ConcurrentHashMap<>();
	protected final ConcurrentMap<String, Participant> participants = new ConcurrentHashMap<>();
	protected String sessionId;
	protected String uniqueSessionId;
	protected SessionProperties sessionProperties;
	protected Long startTime;

	protected volatile boolean closed = false;
	protected AtomicInteger activePublishers = new AtomicInteger(0);
	protected AtomicInteger activeIndividualRecordedPublishers = new AtomicInteger(0);

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

	/**
	 * This lock protects initialization of ALWAYS recordings upon first user
	 * publishing, as well as POST /api/recordings/start
	 */
	public Lock recordingLock = new ReentrantLock();

	public final AtomicBoolean recordingManuallyStopped = new AtomicBoolean(false);

	public Session(Session previousSession) {
		this.sessionId = previousSession.getSessionId();
		this.startTime = previousSession.getStartTime();
		this.uniqueSessionId = previousSession.getUniqueSessionId();
		this.sessionProperties = previousSession.getSessionProperties();
		this.openviduConfig = previousSession.openviduConfig;
		this.recordingManager = previousSession.recordingManager;
		this.tokens = previousSession.tokens;
	}

	public Session(String sessionId, SessionProperties sessionProperties, OpenviduConfig openviduConfig,
			RecordingManager recordingManager) {
		this.sessionId = sessionId;
		this.startTime = System.currentTimeMillis();
		this.uniqueSessionId = sessionId + "_" + this.startTime;
		this.sessionProperties = sessionProperties;
		this.openviduConfig = openviduConfig;
		this.recordingManager = recordingManager;
	}

	public String getSessionId() {
		return this.sessionId;
	}

	public String getUniqueSessionId() {
		return this.uniqueSessionId;
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

	public boolean onlyRecorderAndOrSttParticipant() {
		if (this.participants.size() == 1) {
			return this.participants.values().iterator().next().isRecorderOrSttParticipant();
		} else if (this.participants.size() == 2) {
			return this.participants.values().stream().allMatch(p -> p.isRecorderOrSttParticipant());
		}
		return false;
	}

	public int getActivePublishers() {
		return activePublishers.get();
	}

	public int getActiveIndividualRecordedPublishers() {
		return activeIndividualRecordedPublishers.get();
	}

	public void registerPublisher(Participant participant) {
		this.activePublishers.incrementAndGet();
		if (participant.getToken().record()) {
			activeIndividualRecordedPublishers.incrementAndGet();
		}
	}

	public void deregisterPublisher(Participant participant) {
		this.activePublishers.decrementAndGet();
		if (participant.getToken().record()) {
			activeIndividualRecordedPublishers.decrementAndGet();
		}
	}

	public void storeToken(Token token) {
		this.tokens.put(token.getToken(), token);
	}

	public boolean deleteTokenFromConnectionId(String connectionId) {
		boolean deleted = false;
		Iterator<Entry<String, Token>> iterator = this.tokens.entrySet().iterator();
		while (iterator.hasNext() && !deleted) {
			Entry<String, Token> entry = iterator.next();
			if (connectionId.equals(entry.getValue().getConnectionId())) {
				iterator.remove();
				deleted = true;
			}
		}
		return deleted;
	}

	public Token consumeToken(String token) {
		Token tokenObj = this.tokens.remove(token);
		return tokenObj;
	}

	public Iterator<Entry<String, Token>> getTokenIterator() {
		return this.tokens.entrySet().iterator();
	}

	public boolean hasToken(String token) {
		return this.tokens.containsKey(token);
	}

	public boolean isClosed() {
		return closed;
	}

	public String getMediaNodeId() {
		return null;
	}
	
	public String getMediaNodeIp() {
		return null;
	}

	protected void checkClosed() {
		if (isClosed()) {
			throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "The session '" + sessionId + "' is closed");
		}
	}

	public JsonArray getSnapshotOfConnectionsAsJsonArray(boolean withPendingConnections, boolean withWebrtcStats) {

		Set<Participant> snapshotOfActiveConnections = this.getParticipants().stream().collect(Collectors.toSet());
		JsonArray jsonArray = new JsonArray();
		snapshotOfActiveConnections.forEach(participant -> {
			// Filter RECORDER and STT participants
			if (!participant.isRecorderOrSttParticipant()) {
				jsonArray.add(withWebrtcStats ? participant.withStatsToJson() : participant.toJson());
			}
		});

		if (withPendingConnections) {
			Set<Token> snapshotOfPendingConnections = this.tokens.values().stream().collect(Collectors.toSet());
			// Eliminate duplicates in case some concurrent situation took place
			Set<String> activeConnectionIds = snapshotOfActiveConnections.stream()
					.map(participant -> participant.getParticipantPublicId()).collect(Collectors.toSet());
			snapshotOfPendingConnections.removeIf(token -> activeConnectionIds.contains(token.getConnectionId()));
			snapshotOfPendingConnections.forEach(token -> jsonArray.add(token.toJsonAsParticipant()));
		}

		return jsonArray;
	}

	public JsonObject toJson(boolean withPendingConnections, boolean withWebrtcStats) {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.sessionId);
		json.addProperty("object", "session");
		json.addProperty("sessionId", this.sessionId); // TODO: deprecated. Better use only "id"
		json.addProperty("createdAt", this.startTime);
		json.addProperty("recording", this.recordingManager.sessionIsBeingRecorded(this.sessionId));

		// Add keys from SessionProperties
		JsonObject sessionPropertiesJson = sessionProperties.toJson();
		for (Map.Entry<String, JsonElement> entry : sessionPropertiesJson.entrySet()) {
			json.add(entry.getKey(), entry.getValue().deepCopy());
		}

		// Add "connections" object
		JsonObject connections = new JsonObject();
		JsonArray participants = this.getSnapshotOfConnectionsAsJsonArray(withPendingConnections, withWebrtcStats);
		connections.addProperty("numberOfElements", participants.size());
		connections.add("content", participants);
		json.add("connections", connections);

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
		return true;
	}

	public int getNumberOfConnections() {
		return this.participants.size();
	}

}
