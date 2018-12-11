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
import io.openvidu.server.kurento.core.KurentoTokenOptions;
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

	protected ConcurrentMap<String, Session> sessions = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, SessionProperties> sessionProperties = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, Long> sessionCreationTime = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, ConcurrentHashMap<String, Participant>> sessionidParticipantpublicidParticipant = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, Boolean> insecureUsers = new ConcurrentHashMap<>();
	public ConcurrentMap<String, ConcurrentHashMap<String, Token>> sessionidTokenTokenobj = new ConcurrentHashMap<>();

	private volatile boolean closed = false;

	public abstract void joinRoom(Participant participant, String sessionId, Integer transactionId);

	public abstract void leaveRoom(Participant participant, Integer transactionId, String reason,
			boolean closeWebSocket);

	public abstract void publishVideo(Participant participant, MediaOptions mediaOptions, Integer transactionId);

	public abstract void unpublishVideo(Participant participant, Participant moderator, Integer transactionId,
			String reason);

	public abstract void subscribe(Participant participant, String senderName, String sdpOffer, Integer transactionId);

	public abstract void unsubscribe(Participant participant, String senderName, Integer transactionId);

	public abstract void sendMessage(Participant participant, String message, Integer transactionId);

	public abstract void streamPropertyChanged(Participant participant, Integer transactionId, String streamId,
			String property, JsonElement newValue, String reason);

	public abstract void onIceCandidate(Participant participant, String endpointName, String candidate,
			int sdpMLineIndex, String sdpMid, Integer transactionId);

	public abstract boolean unpublishStream(Session session, String streamId, Participant moderator,
			Integer transactionId, String reason);

	public abstract void evictParticipant(Participant evictedParticipant, Participant moderator, Integer transactionId,
			String reason);

	public abstract void applyFilter(Session session, String streamId, String filterType, JsonObject filterOptions,
			Participant moderator, Integer transactionId, String reason);

	public abstract void execFilterMethod(Session session, String streamId, String filterMethod,
			JsonObject filterParams, Participant moderator, Integer transactionId, String reason);

	public abstract void removeFilter(Session session, String streamId, Participant moderator, Integer transactionId,
			String reason);

	public abstract void addFilterEventListener(Session session, Participant subscriber, String streamId,
			String eventType);

	public abstract void removeFilterEventListener(Session session, Participant subscriber, String streamId,
			String eventType);

	public abstract String getParticipantPrivateIdFromStreamId(String sessionId, String streamId)
			throws OpenViduException;

	/**
	 * Returns a Session given its id
	 *
	 * @return Session
	 */
	public Session getSession(String sessionId) {
		return sessions.get(sessionId);
	}

	/**
	 * Returns all currently active (opened) sessions.
	 *
	 * @return set of the session's identifiers
	 */
	public Set<String> getSessions() {
		return new HashSet<String>(sessions.keySet());
	}

	/**
	 * Returns all currently active (opened) sessions.
	 *
	 * @return set of the session's identifiers
	 */
	public Collection<Session> getSessionObjects() {
		return sessions.values();
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
		Session session = sessions.get(sessionId);
		if (session == null) {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId + "' not found");
		}
		Set<Participant> participants = session.getParticipants();
		participants.removeIf(p -> p.isClosed());
		return participants;
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
		Session session = sessions.get(sessionId);
		if (session == null) {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId + "' not found");
		}
		Participant participant = session.getParticipantByPrivateId(participantPrivateId);
		if (participant == null) {
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Participant '" + participantPrivateId + "' not found in session '" + sessionId + "'");
		}
		return participant;
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
		for (Session session : sessions.values()) {
			if (!session.isClosed()) {
				if (session.getParticipantByPrivateId(participantPrivateId) != null) {
					return session.getParticipantByPrivateId(participantPrivateId);
				}
			}
		}
		throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
				"No participant with private id '" + participantPrivateId + "' was found");
	}

	public MediaOptions generateMediaOptions(Request<JsonObject> request) {
		return null;
	}

	public void storeSessionId(String sessionId, Long creationTime, SessionProperties sessionProperties) {
		this.sessionidParticipantpublicidParticipant.putIfAbsent(sessionId, new ConcurrentHashMap<>());
		this.sessionProperties.putIfAbsent(sessionId, sessionProperties);
		this.sessionCreationTime.putIfAbsent(sessionId, creationTime);
		showTokens();
	}

	public String newToken(String sessionId, ParticipantRole role, String serverMetadata,
			KurentoTokenOptions kurentoTokenOptions) throws OpenViduException {

		ConcurrentHashMap<String, Token> map = this.sessionidTokenTokenobj.putIfAbsent(sessionId,
				new ConcurrentHashMap<>());
		if (map != null) {

			if (!isMetadataFormatCorrect(serverMetadata)) {
				log.error("Data invalid format");
				throw new OpenViduException(Code.GENERIC_ERROR_CODE,
						"Data invalid format");
			}

			String token = OpenViduServer.publicUrl;
			token += "?sessionId=" + sessionId;
			token += "&token=" + this.generateRandomChain();
			token += "&role=" + role.name();
			TurnCredentials turnCredentials = null;
			if (this.coturnCredentialsService.isCoturnAvailable()) {
				turnCredentials = coturnCredentialsService.createUser();
				if (turnCredentials != null) {
					token += "&turnUsername=" + turnCredentials.getUsername();
					token += "&turnCredential=" + turnCredentials.getCredential();
				}
			}
			Token t = new Token(token, role, serverMetadata, turnCredentials, kurentoTokenOptions);

			map.putIfAbsent(token, t);
			showTokens();
			return token;

		} else {
			this.sessionidTokenTokenobj.remove(sessionId);
			log.error("sessionId [" + sessionId + "] is not valid");
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "sessionId [" + sessionId + "] not found");
		}

	}

	public boolean isTokenValidInSession(String token, String sessionId, String participanPrivatetId) {
		if (!this.isInsecureParticipant(participanPrivatetId)) {
			if (this.sessionidTokenTokenobj.get(sessionId) != null) {
				return this.sessionidTokenTokenobj.get(sessionId).containsKey(token);
			} else {
				return false;
			}
		} else {
			this.sessionidParticipantpublicidParticipant.putIfAbsent(sessionId, new ConcurrentHashMap<>());
			this.sessionCreationTime.putIfAbsent(sessionId, System.currentTimeMillis());
			this.sessionidTokenTokenobj.putIfAbsent(sessionId, new ConcurrentHashMap<>());
			this.sessionidTokenTokenobj.get(sessionId).putIfAbsent(token,
					new Token(token, ParticipantRole.PUBLISHER, "",
							this.coturnCredentialsService.isCoturnAvailable()
									? this.coturnCredentialsService.createUser()
									: null,
							null));
			return true;
		}
	}

	public boolean isParticipantInSession(String sessionId, Participant participant) {
		Session session = this.sessions.get(sessionId);
		if (session != null) {
			return (session.getParticipantByPrivateId(participant.getParticipantPrivateId()) != null);
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "[" + sessionId + "] is not a valid sessionId");
		}
	}

	public boolean isPublisherInSession(String sessionId, Participant participant) {
		if (!this.isInsecureParticipant(participant.getParticipantPrivateId())) {
			if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
				return (ParticipantRole.PUBLISHER.equals(participant.getToken().getRole())
						|| ParticipantRole.MODERATOR.equals(participant.getToken().getRole()));
			} else {
				return false;
			}
		} else {
			return true;
		}
	}

	public boolean isModeratorInSession(String sessionId, Participant participant) {
		if (!this.isInsecureParticipant(participant.getParticipantPrivateId())) {
			if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
				return ParticipantRole.MODERATOR.equals(participant.getToken().getRole());
			} else {
				return false;
			}
		} else {
			return true;
		}
	}

	public boolean isInsecureParticipant(String participantPrivateId) {
		if (this.insecureUsers.containsKey(participantPrivateId)) {
			log.info("The user with private id {} is an INSECURE user", participantPrivateId);
			return true;
		}
		return false;
	}

	public boolean isMetadataFormatCorrect(String metadata) {
		return true;
	}

	public void newInsecureParticipant(String participantPrivateId) {
		this.insecureUsers.put(participantPrivateId, true);
	}

	public Participant newParticipant(String sessionId, String participantPrivatetId, Token token,
			String clientMetadata, String location, String platform) {
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			String participantPublicId = this.generateRandomChain();
			Participant p = new Participant(participantPrivatetId, participantPublicId, token, clientMetadata, location,
					platform, null);
			while (this.sessionidParticipantpublicidParticipant.get(sessionId).putIfAbsent(participantPublicId,
					p) != null) {
				participantPublicId = this.generateRandomChain();
				p.setParticipantPublicId(participantPublicId);
			}
			return p;
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
	}

	public Participant newRecorderParticipant(String sessionId, String participantPrivatetId, Token token,
			String clientMetadata) {
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			Participant p = new Participant(participantPrivatetId, ProtocolElements.RECORDER_PARTICIPANT_PUBLICID,
					token, clientMetadata, null, null, null);
			this.sessionidParticipantpublicidParticipant.get(sessionId)
					.put(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID, p);
			return p;
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
	}

	public Token consumeToken(String sessionId, String participantPrivateId, String token) {
		if (this.sessionidTokenTokenobj.get(sessionId) != null) {
			Token t = this.sessionidTokenTokenobj.get(sessionId).remove(token);
			if (t != null) {
				return t;
			} else {
				throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE, sessionId);
			}
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
	}

	public void showTokens() {
		log.info("<SESSIONID, TOKENS>: {}", this.sessionidTokenTokenobj.toString());
	}

	public void showInsecureParticipants() {
		log.info("<INSECURE_PARTICIPANTS>: {}", this.insecureUsers.toString());
	}

	public void showAllParticipants() {
		log.info("<SESSIONID, PARTICIPANTS>: {}", this.sessionidParticipantpublicidParticipant.toString());
	}

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
		for (String sessionId : sessions.keySet()) {
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
		Session session = sessions.get(sessionId);
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
			recordingService.stopRecording(session, null, reason);
		}

		return participants;
	}

	public void closeSessionAndEmptyCollections(Session session, String reason) {
		if (session.close(reason)) {
			sessionEventsHandler.onSessionClosed(session.getSessionId(), reason);
		}
		sessions.remove(session.getSessionId());

		sessionProperties.remove(session.getSessionId());
		sessionCreationTime.remove(session.getSessionId());
		sessionidParticipantpublicidParticipant.remove(session.getSessionId());
		sessionidTokenTokenobj.remove(session.getSessionId());

		log.warn("Session '{}' removed and closed", session.getSessionId());
	}

}
