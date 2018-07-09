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

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import javax.annotation.PreDestroy;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.coturn.CoturnCredentialsService;
import io.openvidu.server.coturn.TurnCredentials;
import io.openvidu.server.recording.ComposedRecordingService;

public abstract class SessionManager {

	private static final Logger log = LoggerFactory.getLogger(SessionManager.class);

	@Autowired
	protected SessionEventsHandler sessionEventsHandler;

	@Autowired
	protected ComposedRecordingService recordingService;

	@Autowired
	protected CallDetailRecord CDR;

	@Autowired
	protected OpenviduConfig openviduConfig;

	@Autowired
	protected CoturnCredentialsService coturnCredentialsService;

	@Autowired
	protected SessionStorage sessionStorage;

	private volatile boolean closed = false;

	public abstract void joinRoom(Participant participant, String sessionId, Integer transactionId);

	public abstract void leaveRoom(Participant participant, Integer transactionId, String reason,
			boolean closeWebSocket);

	public abstract void publishVideo(Participant participant, MediaOptions mediaOptions, Integer transactionId);

	public abstract void unpublishVideo(Participant participant, Participant moderator, Integer transactionId, String reason);

	public abstract void subscribe(Participant participant, String senderName, String sdpOffer, Integer transactionId);

	public abstract void unsubscribe(Participant participant, String senderName, Integer transactionId);

	public abstract void sendMessage(Participant participant, String message, Integer transactionId);

	public abstract void streamPropertyChanged(Participant participant, Integer transactionId, String streamId,
			String property, JsonElement newValue, String reason);

	public abstract void onIceCandidate(Participant participant, String endpointName, String candidate,
			int sdpMLineIndex, String sdpMid, Integer transactionId);

	public abstract boolean unpublishStream(Session session, String streamId, Participant moderator, Integer transactionId, String reason);

	public abstract void evictParticipant(Participant evictedParticipant, Participant moderator, Integer transactionId,
			String reason);

	/**
	 * Returns a Session given its id
	 *
	 * @return Session
	 */
	public Session getSession(String sessionId) {
		return this.sessionStorage.getSession(sessionId);
	}

	/**
	 * Returns all currently active (opened) sessions.
	 *
	 * @return set of the session's identifiers
	 */
	public Set<String> getSessions() {
		return this.sessionStorage.getSessions();
	}

	/**
	 * Returns all currently active (opened) sessions.
	 *
	 * @return set of the session's identifiers
	 */
	public Collection<Session> getSessionObjects() {
		return this.sessionStorage.getSessionObjects();
	}

	/**
	 * Returns all the participants inside a session.
	 *
	 * @param sessionId
	 *            identifier of the session
	 * @return set of {@link Participant}
	 * @throws OpenViduException
	 *             in case the session doesn't exist
	 */
	public Set<Participant> getParticipants(String sessionId) throws OpenViduException {
		return this.sessionStorage.getParticipants(sessionId);
	}

	/**
	 * Returns a participant in a session
	 *
	 * @param sessionId
	 *            identifier of the session
	 * @param participantPrivateId
	 *            private identifier of the participant
	 * @return {@link Participant}
	 * @throws OpenViduException
	 *             in case the session doesn't exist or the participant doesn't
	 *             belong to it
	 */
	public Participant getParticipant(String sessionId, String participantPrivateId) throws OpenViduException {
		return this.sessionStorage.getParticipant(sessionId, participantPrivateId);
	}

	/**
	 * Returns a participant
	 *
	 * @param participantPrivateId
	 *            private identifier of the participant
	 * @return {@link Participant}
	 * @throws OpenViduException
	 *             in case the participant doesn't exist
	 */
	public Participant getParticipant(String participantPrivateId) throws OpenViduException {
		return this.sessionStorage.getParticipant(participantPrivateId);
	}

	public MediaOptions generateMediaOptions(Request<JsonObject> request) {
		return null;
	}

	public void storeSessionId(String sessionId, SessionProperties sessionProperties) {
		this.sessionStorage.storeSessionId(sessionId, sessionProperties);
	}

	public String newToken(String sessionId, ParticipantRole role, String serverMetadata) throws OpenViduException {
		return this.sessionStorage.newToken(sessionId, role, serverMetadata);
	}

	public boolean isTokenValidInSession(String token, String sessionId, String participanPrivatetId) {
		return this.sessionStorage.isTokenValidInSession(token, sessionId, participanPrivatetId);
	}

	public boolean isParticipantInSession(String sessionId, Participant participant) {
		return this.sessionStorage.isParticipantInSession(sessionId, participant);
	}

	public boolean isPublisherInSession(String sessionId, Participant participant) {
		return this.sessionStorage.isPublisherInSession(sessionId, participant);
	}

	public boolean isModeratorInSession(String sessionId, Participant participant) {
		return this.sessionStorage.isModeratorInSession(sessionId, participant);
	}

	public boolean isInsecureParticipant(String participantPrivateId) {
		return this.sessionStorage.isInsecureParticipant(participantPrivateId);
	}

	public boolean isMetadataFormatCorrect(String metadata) {
		// Max 10000 chars
		return (metadata.length() <= 10000);
	}

	public void newInsecureParticipant(String participantPrivateId) {
		this.sessionStorage.newInsecureParticipant(participantPrivateId);
	}

	public Participant newParticipant(String sessionId, String participantPrivatetId, Token token,
			String clientMetadata) {
		return this.sessionStorage.newParticipant(sessionId, participantPrivatetId, token, clientMetadata);
	}

	public Participant newRecorderParticipant(String sessionId, String participantPrivatetId, Token token,
			String clientMetadata) {
		return this.sessionStorage.newRecorderParticipant(sessionId, participantPrivatetId, token, clientMetadata);
	}

	public Token consumeToken(String sessionId, String participantPrivateId, String token) {
		return this.sessionStorage.consumeToken(sessionId, participantPrivateId, token);
	}

	public void showTokens() { this.sessionStorage.showTokens(); }

	public void showInsecureParticipants() {
		this.sessionStorage.showInsecureParticipants();
	}

	public void showAllParticipants() { this.sessionStorage.showAllParticipants(); }

	public String generateRandomChain() {
		return RandomStringUtils.randomAlphanumeric(16).toLowerCase();
	}

	/**
	 * Closes all resources. This method has been annotated with the @PreDestroy
	 * directive (javax.annotation package) so that it will be automatically called
	 * when the SessionManager instance is container-managed. <br/>
	 * <strong>Dev advice:</strong> Send notifications to all participants to inform
	 * that their session has been forcibly closed.
	 *
	 * @see SessionManmager#closeSession(String)
	 */
	@PreDestroy
	public void close() {
		closed = true;
		log.info("Closing all sessions");
		for (String sessionId : this.sessionStorage.getSessions()) {
			try {
				closeSession(sessionId, "openviduServerStopped");
			} catch (Exception e) {
				log.warn("Error closing session '{}'", sessionId, e);
			}
		}
	}

	/**
	 * Closes an existing session by releasing all resources that were allocated for
	 * it. Once closed, the session can be reopened (will be empty and it will use
	 * another Media Pipeline). Existing participants will be evicted. <br/>
	 * <strong>Dev advice:</strong> The session event handler should send
	 * notifications to the existing participants in the session to inform that it
	 * was forcibly closed.
	 *
	 * @param sessionId
	 *            identifier of the session
	 * @return
	 * @return set of {@link Participant} POJOS representing the session's
	 *         participants
	 * @throws OpenViduException
	 *             in case the session doesn't exist or has been already closed
	 */
	public Set<Participant> closeSession(String sessionId, String reason) {
		Session session = this.sessionStorage.getSession(sessionId);
		if (session == null) {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId + "' not found");
		}
		if (session.isClosed()) {
			throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "Session '" + sessionId + "' already closed");
		}
		Set<Participant> participants = getParticipants(sessionId);
		for (Participant p : participants) {
			try {
				this.evictParticipant(p, null, null, reason);
			} catch (OpenViduException e) {
				log.warn("Error evicting participant '{}' from session '{}'", p.getParticipantPublicId(), sessionId, e);
			}
		}

		this.closeSessionAndEmptyCollections(session, reason);

		if (recordingService.sessionIsBeingRecorded(session.getSessionId())) {
			recordingService.stopRecording(session);
		}

		return participants;
	}

	public void closeSessionAndEmptyCollections(Session session, String reason) {
		if (session.close(reason)) {
			sessionEventsHandler.onSessionClosed(session.getSessionId(), reason);
		}
		this.sessionStorage.emptyCollections(session);

		log.warn("Session '{}' removed and closed", session.getSessionId());
	}

}
