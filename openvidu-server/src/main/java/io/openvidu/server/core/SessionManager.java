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

import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

import javax.annotation.PreDestroy;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.cdr.CDREventRecording;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.coturn.CoturnCredentialsService;
import io.openvidu.server.kurento.core.KurentoTokenOptions;
import io.openvidu.server.kurento.endpoint.EndpointType;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.utils.FormatChecker;
import io.openvidu.server.utils.GeoLocation;
import io.openvidu.server.utils.GeoLocationByIp;
import io.openvidu.server.utils.QuarantineKiller;

public abstract class SessionManager {

	private static final Logger log = LoggerFactory.getLogger(SessionManager.class);

	@Autowired
	protected SessionEventsHandler sessionEventsHandler;

	@Autowired
	protected RecordingManager recordingManager;

	@Autowired
	protected OpenviduConfig openviduConfig;

	@Autowired
	protected CoturnCredentialsService coturnCredentialsService;

	@Autowired
	protected TokenGenerator tokenGenerator;

	@Autowired
	protected QuarantineKiller quarantineKiller;

	@Autowired
	protected GeoLocationByIp geoLocationByIp;

	public FormatChecker formatChecker = new FormatChecker();

	protected ConcurrentMap<String, Session> sessions = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, Session> sessionsNotActive = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, ConcurrentHashMap<String, Participant>> sessionidParticipantpublicidParticipant = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, ConcurrentHashMap<String, FinalUser>> sessionidFinalUsers = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, ConcurrentLinkedQueue<CDREventRecording>> sessionidAccumulatedRecordings = new ConcurrentHashMap<>();

	protected ConcurrentMap<String, Boolean> insecureUsers = new ConcurrentHashMap<>();

	public abstract void joinRoom(Participant participant, String sessionId, Integer transactionId);

	public abstract boolean leaveRoom(Participant participant, Integer transactionId, EndReason reason,
			boolean closeWebSocket);

	public abstract void publishVideo(Participant participant, MediaOptions mediaOptions, Integer transactionId);

	public abstract void unpublishVideo(Participant participant, Participant moderator, Integer transactionId,
			EndReason reason);

	public abstract void subscribe(Participant participant, String senderName, String sdpOffer, Integer transactionId);

	public abstract void unsubscribe(Participant participant, String senderName, Integer transactionId);

	public void sendMessage(String message, String sessionId) {
		try {
			JsonObject messageJson = JsonParser.parseString(message).getAsJsonObject();
			sessionEventsHandler.onSendMessage(null, messageJson, getParticipants(sessionId), null, null);
		} catch (JsonSyntaxException | IllegalStateException e) {
			throw new OpenViduException(Code.SIGNAL_FORMAT_INVALID_ERROR_CODE,
					"Provided signal object '" + message + "' has not a valid JSON format");
		}
	}

	public void sendMessage(Participant participant, String message, Integer transactionId) {
		try {
			JsonObject messageJson = JsonParser.parseString(message).getAsJsonObject();
			sessionEventsHandler.onSendMessage(participant, messageJson, getParticipants(participant.getSessionId()),
					transactionId, null);
		} catch (JsonSyntaxException | IllegalStateException e) {
			throw new OpenViduException(Code.SIGNAL_FORMAT_INVALID_ERROR_CODE,
					"Provided signal object '" + message + "' has not a valid JSON format");
		}
	}

	public abstract void streamPropertyChanged(Participant participant, Integer transactionId, String streamId,
			String property, JsonElement newValue, String changeReason);

	public abstract void onIceCandidate(Participant participant, String endpointName, String candidate,
			int sdpMLineIndex, String sdpMid, Integer transactionId);

	public abstract boolean unpublishStream(Session session, String streamId, Participant moderator,
			Integer transactionId, EndReason reason);

	public abstract boolean evictParticipant(Participant evictedParticipant, Participant moderator,
			Integer transactionId, EndReason reason);

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

	public abstract Participant publishIpcam(Session session, MediaOptions mediaOptions, String serverMetadata)
			throws Exception;

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
	public Collection<Session> getSessions() {
		return sessions.values();
	}

	public Session getSessionNotActive(String sessionId) {
		return this.sessionsNotActive.get(sessionId);
	}

	public Session getSessionWithNotActive(String sessionId) {
		return (sessions.get(sessionId) != null ? sessions.get(sessionId) : sessionsNotActive.get(sessionId));
	}

	public Collection<Session> getSessionsWithNotActive() {
		Collection<Session> allSessions = new HashSet<>();
		allSessions.addAll(this.sessionsNotActive.values().stream()
				.filter(sessionNotActive -> !sessions.containsKey(sessionNotActive.getSessionId()))
				.collect(Collectors.toSet()));
		allSessions.addAll(this.getSessions());
		return allSessions;
	}

	/**
	 * Returns all the participants inside a session.
	 *
	 * @param sessionId identifier of the session
	 * @return set of {@link Participant}
	 * @throws OpenViduException in case the session doesn't exist
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
	 * @param sessionId            identifier of the session
	 * @param participantPrivateId private identifier of the participant
	 * @return {@link Participant}
	 * @throws OpenViduException in case the session doesn't exist or the
	 *                           participant doesn't belong to it
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
	 * @param participantPrivateId private identifier of the participant
	 * @return {@link Participant}
	 * @throws OpenViduException in case the participant doesn't exist
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

	public Map<String, FinalUser> getFinalUsers(String sessionId) {
		return this.sessionidFinalUsers.get(sessionId);
	}

	public Map<String, FinalUser> removeFinalUsers(String sessionId) {
		return this.sessionidFinalUsers.remove(sessionId);
	}

	public Collection<CDREventRecording> getAccumulatedRecordings(String sessionId) {
		return this.sessionidAccumulatedRecordings.get(sessionId);
	}

	public Collection<CDREventRecording> removeAccumulatedRecordings(String sessionId) {
		return this.sessionidAccumulatedRecordings.remove(sessionId);
	}

	public MediaOptions generateMediaOptions(Request<JsonObject> request) {
		return null;
	}

	public Session storeSessionNotActive(String sessionId, SessionProperties sessionProperties) {
		Session sessionNotActive = new Session(sessionId, sessionProperties, openviduConfig, recordingManager);
		return this.storeSessionNotActive(sessionNotActive);
	}

	public Session storeSessionNotActive(Session sessionNotActive) {
		final String sessionId = sessionNotActive.getSessionId();
		this.sessionsNotActive.put(sessionId, sessionNotActive);
		this.initializeCollections(sessionId);
		return sessionNotActive;
	}

	public String newToken(Session session, OpenViduRole role, String serverMetadata,
			KurentoTokenOptions kurentoTokenOptions) throws OpenViduException {
		if (!formatChecker.isServerMetadataFormatCorrect(serverMetadata)) {
			log.error("Data invalid format");
			throw new OpenViduException(Code.GENERIC_ERROR_CODE, "Data invalid format");
		}
		Token tokenObj = tokenGenerator.generateToken(session.getSessionId(), role, serverMetadata,
				kurentoTokenOptions);
		session.storeToken(tokenObj);
		session.showTokens("Token created");
		return tokenObj.getToken();
	}

	public Token newTokenForInsecureUser(Session session, String token, String serverMetadata) {
		Token tokenObj = new Token(token, OpenViduRole.PUBLISHER, serverMetadata != null ? serverMetadata : "",
				this.coturnCredentialsService.isCoturnAvailable() ? this.coturnCredentialsService.createUser() : null,
				null);
		session.storeToken(tokenObj);
		session.showTokens("Token created for insecure user");
		return tokenObj;
	}

	public boolean isPublisherInSession(String sessionId, Participant participant) {
		if (!this.isInsecureParticipant(participant.getParticipantPrivateId())) {
			if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
				return (OpenViduRole.PUBLISHER.equals(participant.getToken().getRole())
						|| OpenViduRole.MODERATOR.equals(participant.getToken().getRole()));
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
				return OpenViduRole.MODERATOR.equals(participant.getToken().getRole());
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

	public void newInsecureParticipant(String participantPrivateId) {
		this.insecureUsers.put(participantPrivateId, true);
	}

	public Participant newParticipant(String sessionId, String participantPrivatetId, Token token,
			String clientMetadata, GeoLocation location, String platform, String finalUserId) {
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			String participantPublicId = IdentifierPrefixes.PARTICIPANT_PUBLIC_ID
					+ RandomStringUtils.randomAlphabetic(1).toUpperCase() + RandomStringUtils.randomAlphanumeric(9);
			Participant p = new Participant(finalUserId, participantPrivatetId, participantPublicId, sessionId, token,
					clientMetadata, location, platform, EndpointType.WEBRTC_ENDPOINT, null);
			while (this.sessionidParticipantpublicidParticipant.get(sessionId).putIfAbsent(participantPublicId,
					p) != null) {
				participantPublicId = IdentifierPrefixes.PARTICIPANT_PUBLIC_ID
						+ RandomStringUtils.randomAlphabetic(1).toUpperCase() + RandomStringUtils.randomAlphanumeric(9);
				p.setParticipantPublicId(participantPublicId);
			}

			this.sessionidFinalUsers.get(sessionId).computeIfAbsent(finalUserId, k -> {
				log.info("Participant {} of session {} is a final user connecting to this session for the first time",
						p.getParticipantPublicId(), sessionId);
				return new FinalUser(finalUserId, sessionId, p);
			}).addConnectionIfAbsent(p);

			return p;
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
	}

	public Participant newRecorderParticipant(String sessionId, String participantPrivatetId, Token token,
			String clientMetadata) {
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			Participant p = new Participant(null, participantPrivatetId, ProtocolElements.RECORDER_PARTICIPANT_PUBLICID,
					sessionId, token, clientMetadata, null, null, EndpointType.WEBRTC_ENDPOINT, null);
			this.sessionidParticipantpublicidParticipant.get(sessionId)
					.put(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID, p);
			return p;
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
	}

	public Participant newIpcamParticipant(String sessionId, String ipcamId, Token token, GeoLocation location,
			String platform) {
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			Participant p = new Participant(ipcamId, ipcamId, ipcamId, sessionId, token, null, location, platform,
					EndpointType.PLAYER_ENDPOINT, null);
			this.sessionidParticipantpublicidParticipant.get(sessionId).put(ipcamId, p);
			return p;
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
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
		log.info("Closing all sessions");
		for (String sessionId : sessions.keySet()) {
			try {
				closeSession(sessionId, EndReason.openviduServerStopped);
			} catch (Exception e) {
				log.warn("Error closing session '{}': {}", sessionId, e.getMessage());
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
	 * @param sessionId identifier of the session
	 * @throws OpenViduException in case the session doesn't exist or has been
	 *                           already closed
	 */
	public void closeSession(String sessionId, EndReason reason) {
		Session session = sessions.get(sessionId);
		if (session == null) {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId + "' not found");
		}
		if (session.isClosed()) {
			this.cleanCollections(sessionId);
			throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "Session '" + sessionId + "' already closed");
		}
		Set<Participant> participants = getParticipants(sessionId);

		boolean sessionClosedByLastParticipant = false;

		for (Participant p : participants) {
			try {
				sessionClosedByLastParticipant = this.evictParticipant(p, null, null, reason);
			} catch (OpenViduException e) {
				log.warn("Error evicting participant '{}' from session '{}'", p.getParticipantPublicId(), sessionId, e);
			}
		}

		if (!sessionClosedByLastParticipant) {
			// This code should only be executed when there were no participants connected
			// to the session. That is: if the session was in the automatic recording stop
			// timeout with INDIVIDUAL recording (no docker participant connected)
			try {
				session.closingLock.writeLock().lock();
				if (session.isClosed()) {
					return;
				}
				this.closeSessionAndEmptyCollections(session, reason, true);
			} finally {
				session.closingLock.writeLock().unlock();
			}
		}
	}

	public void closeSessionAndEmptyCollections(Session session, EndReason reason, boolean stopRecording) {

		if (openviduConfig.isRecordingModuleEnabled() && stopRecording
				&& this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
			recordingManager.stopRecording(session, null, RecordingManager.finalReason(reason));
		}

		final String mediaNodeId = session.getMediaNodeId();

		if (session.close(reason)) {
			sessionEventsHandler.onSessionClosed(session.getSessionId(), reason);
		}

		this.cleanCollections(session.getSessionId());

		log.info("Session '{}' removed and closed", session.getSessionId());

		if (mediaNodeId != null) {
			this.quarantineKiller.dropMediaNode(mediaNodeId);
		}
	}

	protected void cleanCollections(String sessionId) {
		sessions.remove(sessionId);
		sessionsNotActive.remove(sessionId);
		sessionidParticipantpublicidParticipant.remove(sessionId);
		sessionidFinalUsers.remove(sessionId);
		sessionidAccumulatedRecordings.remove(sessionId);
	}

	private void initializeCollections(String sessionId) {
		this.sessionidParticipantpublicidParticipant.putIfAbsent(sessionId, new ConcurrentHashMap<>());
		this.sessionidFinalUsers.putIfAbsent(sessionId, new ConcurrentHashMap<>());
		if (this.openviduConfig.isRecordingModuleEnabled()) {
			this.sessionidAccumulatedRecordings.putIfAbsent(sessionId, new ConcurrentLinkedQueue<>());
		}
	}

}
