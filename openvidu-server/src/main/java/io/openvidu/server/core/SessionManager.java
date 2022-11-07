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

import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

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
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.IceServerProperties;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.java.client.utils.FormatChecker;
import io.openvidu.server.cdr.CDREventRecordingStatusChanged;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.coturn.CoturnCredentialsService;
import io.openvidu.server.kurento.endpoint.EndpointType;
import io.openvidu.server.kurento.kms.Kms;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.utils.GeoLocation;
import io.openvidu.server.utils.GeoLocationByIp;
import io.openvidu.server.utils.MediaNodeManager;
import io.openvidu.server.utils.UpdatableTimerTask;

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
	protected TokenRegister tokenRegister;

	@Autowired
	protected MediaNodeManager mediaNodeManager;

	@Autowired
	protected GeoLocationByIp geoLocationByIp;

	private UpdatableTimerTask sessionGarbageCollectorTimer;

	final protected ConcurrentMap<String, Session> sessions = new ConcurrentHashMap<>();
	final protected ConcurrentMap<String, Session> sessionsNotActive = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, ConcurrentHashMap<String, Participant>> sessionidParticipantpublicidParticipant = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, ConcurrentHashMap<String, FinalUser>> sessionidFinalUsers = new ConcurrentHashMap<>();
	protected ConcurrentMap<String, ConcurrentLinkedQueue<CDREventRecordingStatusChanged>> sessionidAccumulatedRecordings = new ConcurrentHashMap<>();

	protected ConcurrentMap<String, Boolean> insecureUsers = new ConcurrentHashMap<>();

	public abstract void joinRoom(Participant participant, String sessionId, Integer transactionId);

	public abstract boolean leaveRoom(Participant participant, Integer transactionId, EndReason reason,
			boolean scheduleWebocketClose);

	public abstract void publishVideo(Participant participant, MediaOptions mediaOptions, Integer transactionId);

	public abstract void unpublishVideo(Participant participant, Participant moderator, Integer transactionId,
			EndReason reason);

	public abstract void prepareSubscription(Participant participant, String senderPublicId, boolean reconnect,
			Integer id);

	public abstract String prepareForcedSubscription(Participant participant, String senderPublicId);

	public abstract void subscribe(Participant participant, String senderName, String sdpString, Integer transactionId,
			boolean initByServer);

	public abstract void unsubscribe(Participant participant, String senderName, Integer transactionId);

	public void sendMessage(String message, Session session) {
		try {
			JsonObject messageJson = JsonParser.parseString(message).getAsJsonObject();
			sessionEventsHandler.onSendMessage(null, messageJson, getParticipants(session.getSessionId()),
					session.getSessionId(), session.getUniqueSessionId(), null, null);
		} catch (JsonSyntaxException | IllegalStateException e) {
			throw new OpenViduException(Code.SIGNAL_FORMAT_INVALID_ERROR_CODE,
					"Provided signal object '" + message + "' has not a valid JSON format");
		}
	}

	public void sendMessage(Participant participant, String message, Integer transactionId) {
		try {
			JsonObject messageJson = JsonParser.parseString(message).getAsJsonObject();
			sessionEventsHandler.onSendMessage(participant, messageJson, getParticipants(participant.getSessionId()),
					participant.getSessionId(), participant.getUniqueSessionId(), transactionId, null);
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

	public abstract Participant publishIpcam(Session session, MediaOptions mediaOptions,
			ConnectionProperties connectionProperties) throws Exception;

	public abstract void reconnectPublisher(Participant participant, String streamId, String sdpOffer,
			Integer transactionId);

	public abstract void reconnectSubscriber(Participant participant, String streamId, String sdpString,
			Integer transactionId, boolean initByServer, boolean forciblyReconnect);

	public abstract String getParticipantPrivateIdFromStreamId(String sessionId, String streamId)
			throws OpenViduException;

	public abstract void onVideoData(Participant participant, Integer transactionId, Integer height, Integer width,
			Boolean videoActive, Boolean audioActive);

	public abstract void onSubscribeToSpeechToText(Participant participant, Integer transactionId, String lang,
			String connectionId);

	public abstract void onUnsubscribeFromSpeechToText(Participant participant, Integer transactionId,
			String connectionId);

	public void onEcho(String participantPrivateId, Integer requestId) {
		sessionEventsHandler.onEcho(participantPrivateId, requestId);
	}

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

	public void accumulateNewRecording(CDREventRecordingStatusChanged event) {
		this.sessionidAccumulatedRecordings.get(event.getSessionId()).add(event);
	}

	public Collection<CDREventRecordingStatusChanged> removeAccumulatedRecordings(String sessionId) {
		return this.sessionidAccumulatedRecordings.remove(sessionId);
	}

	public MediaOptions generateMediaOptions(Request<JsonObject> request) {
		return null;
	}

	/**
	 * @return null if concurrent storing of session
	 */
	public Session storeSessionNotActive(String sessionId, SessionProperties sessionProperties) {
		Session sessionNotActive = this
				.storeSessionNotActive(new Session(sessionId, sessionProperties, openviduConfig, recordingManager));
		if (sessionNotActive == null) {
			return null;
		} else {
			sessionEventsHandler.onSessionCreated(sessionNotActive);
			return sessionNotActive;
		}
	}

	public Session storeSessionNotActive(Session sessionNotActive) {
		final String sessionId = sessionNotActive.getSessionId();
		if (this.sessionsNotActive.putIfAbsent(sessionId, sessionNotActive) != null) {
			log.warn("Concurrent initialization of session {}", sessionId);
			return null;
		}
		this.initializeCollections(sessionId);
		return sessionNotActive;
	}

	public Token newToken(Session session, OpenViduRole role, String serverMetadata, boolean record,
			KurentoOptions kurentoOptions, List<IceServerProperties> customIceServers) throws Exception {
		if (!FormatChecker.isServerMetadataFormatCorrect(serverMetadata)) {
			log.error("Data invalid format");
			throw new OpenViduException(Code.GENERIC_ERROR_CODE, "Data invalid format");
		}
		Token tokenObj = tokenGenerator.generateToken(session.getSessionId(), serverMetadata, record, role,
				kurentoOptions, customIceServers);

		// Internal dev feature: allows customizing connectionId
		if (serverMetadata.contains("openviduCustomConnectionId")) {
			try {
				JsonObject serverMetadataJson = JsonParser.parseString(serverMetadata).getAsJsonObject();
				String customConnectionId = serverMetadataJson.get("openviduCustomConnectionId").getAsString();
				// Remove all non-word characters: [^A-Za-z0-9_]
				customConnectionId = customConnectionId.replaceAll("\\W", "");
				customConnectionId = customConnectionId.replaceAll(IdentifierPrefixes.PARTICIPANT_PUBLIC_ID, "");
				tokenObj.setConnectionId(IdentifierPrefixes.PARTICIPANT_PUBLIC_ID + customConnectionId);
			} catch (Exception e) {
				log.debug(
						"Tried to parse server metadata as JSON after encountering \"openviduCustomConnectionId\" string, but failed with {}: {}",
						e.getClass().getCanonicalName(), e.getMessage());
			}
		}

		session.storeToken(tokenObj);
		return tokenObj;
	}

	public Token newTokenForInsecureUser(Session session, String token, ConnectionProperties connectionProperties,
			String connectionId) throws Exception {
		Token tokenObj = new Token(token, session.getSessionId(), connectionProperties,
				this.coturnCredentialsService.createUser());
		if (connectionId != null) {
			tokenObj.setConnectionId(connectionId);
		}
		session.storeToken(tokenObj);
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

	public Participant newParticipant(Session session, String participantPrivateId, Token token, String clientMetadata,
			GeoLocation location, String platform, String finalUserId) {

		String sessionId = session.getSessionId();
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {

			Participant p = newParticipantAux(sessionId, session.getUniqueSessionId(), finalUserId,
					participantPrivateId, token.getConnectionId(), token, clientMetadata, location, platform,
					EndpointType.WEBRTC_ENDPOINT);

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

	public Participant newRecorderParticipant(Session session, String participantPrivateId, Token token,
			String clientMetadata) {
		String sessionId = session.getSessionId();
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			return newParticipantAux(sessionId, session.getUniqueSessionId(), null, participantPrivateId,
					ProtocolElements.RECORDER_PARTICIPANT_PUBLICID, token, clientMetadata, null, null,
					EndpointType.WEBRTC_ENDPOINT);
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
	}

	public Participant newSttParticipant(Session session, String participantPrivateId, Token token,
			String clientMetadata) {
		String sessionId = session.getSessionId();
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			return newParticipantAux(sessionId, session.getUniqueSessionId(), null, participantPrivateId,
					ProtocolElements.STT_PARTICIPANT_PUBLICID, token, clientMetadata, null, null,
					EndpointType.WEBRTC_ENDPOINT);
		} else {
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
		}
	}

	public Participant newIpcamParticipant(Session session, String ipcamId, Token token, GeoLocation location,
			String platform) {
		String sessionId = session.getSessionId();
		if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			return newParticipantAux(sessionId, session.getUniqueSessionId(), ipcamId, ipcamId, ipcamId, token, null,
					location, platform, EndpointType.PLAYER_ENDPOINT);
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
		if (this.sessionGarbageCollectorTimer != null) {
			this.sessionGarbageCollectorTimer.cancelTimer();
		}
	}

	@PostConstruct
	private void startSessionGarbageCollector() {
		if (openviduConfig.getSessionGarbageInterval() == 0) {
			log.info(
					"Garbage collector for non active sessions is disabled (property 'OPENVIDU_SESSIONS_GARBAGE_INTERVAL' is 0)");
			return;
		}

		this.sessionGarbageCollectorTimer = new UpdatableTimerTask(() -> {

			// Remove all non active sessions created more than the specified time
			log.info("Running non active sessions garbage collector...");
			final long currentMillis = System.currentTimeMillis();

			this.closeNonActiveSessions(sessionNotActive -> {
				// Remove non active session if threshold has elapsed
				return (currentMillis - sessionNotActive.getStartTime()) > (openviduConfig.getSessionGarbageThreshold()
						* 1000);
			});

			// Warn about possible ghost sessions
			for (Iterator<Entry<String, Session>> iter = sessions.entrySet().iterator(); iter.hasNext();) {
				final Session sessionActive = iter.next().getValue();
				if (sessionActive.getParticipants().size() == 0) {
					log.warn("Possible ghost session {}", sessionActive.getSessionId());
				}
			}
		}, () -> Long.valueOf(openviduConfig.getSessionGarbageInterval() * 1000));

		this.sessionGarbageCollectorTimer.updateTimer();

		log.info(
				"Garbage collector for non active sessions initialized. Running every {} seconds and cleaning up non active Sessions more than {} seconds old",
				openviduConfig.getSessionGarbageInterval(), openviduConfig.getSessionGarbageThreshold());
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

		try {
			if (session.closingLock.writeLock().tryLock(15, TimeUnit.SECONDS)) {
				try {
					if (session.isClosed()) {
						this.cleanCollections(sessionId);
						throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE,
								"Session '" + sessionId + "' already closed");
					}

					boolean sessionClosedByLastParticipant = false;
					Set<Participant> participants = getParticipants(sessionId);
					for (Participant p : participants) {
						try {
							sessionClosedByLastParticipant = this.evictParticipant(p, null, null, reason);
						} catch (OpenViduException e) {
							log.warn("Error evicting participant '{}' from session '{}'", p.getParticipantPublicId(),
									sessionId, e);
						}
					}
					if (!sessionClosedByLastParticipant) {
						// This code should only be executed when there were no participants connected
						// to the session. That is: if the session was in the automatic recording stop
						// timeout with INDIVIDUAL recording (no docker participant connected)
						this.closeSessionAndEmptyCollections(session, reason, true);
					}

				} finally {
					session.closingLock.writeLock().unlock();
				}
			} else {
				log.error("Timeout waiting for Session {} closing lock to be available", sessionId);
			}
		} catch (InterruptedException e) {
			log.error("InterruptedException while waiting for Session {} closing lock to be available", sessionId);
		}
	}

	public void closeNonActiveSessions(Function<Session, Boolean> conditionToRemove) {
		// Loop through all non active sessions. Safely remove and clean all of
		// the data for each non active session meeting the condition
		for (Iterator<Entry<String, Session>> iter = sessionsNotActive.entrySet().iterator(); iter.hasNext();) {
			final Session sessionNotActive = iter.next().getValue();
			final String sessionId = sessionNotActive.getSessionId();
			if (conditionToRemove.apply(sessionNotActive)) {
				try {
					if (sessionNotActive.closingLock.writeLock().tryLock(15, TimeUnit.SECONDS)) {
						try {
							if (sessions.containsKey(sessionId)) {
								// The session passed to active during lock wait
								continue;
							}
							iter.remove();
							cleanCollections(sessionId);
							log.info("Non active session {} cleaned up", sessionId);
						} finally {
							sessionNotActive.closingLock.writeLock().unlock();
						}
					} else {
						log.error(
								"Timeout waiting for Session closing lock to be available to clean up non active session {}",
								sessionId);
					}
				} catch (InterruptedException e) {
					log.error(
							"InterruptedException while waiting for non active Session closing lock to be available to clean up non active session session {}",
							sessionId);
				}
			}
		}
	}

	public void closeSessionAndEmptyCollections(Session session, EndReason reason, boolean stopRecording) {

		if (openviduConfig.isRecordingModuleEnabled()) {
			if (stopRecording && this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
				try {
					recordingManager.stopRecording(session, null, RecordingManager.finalReason(reason));
				} catch (OpenViduException e) {
					log.error("Error stopping recording of session {}: {}", session.getSessionId(), e.getMessage());
				}
			}
			if (Recording.OutputMode.COMPOSED_QUICK_START
					.equals(session.getSessionProperties().defaultRecordingProperties().outputMode())) {
				try {
					this.recordingManager.stopComposedQuickStartContainer(session, reason);
				} catch (OpenViduException e) {
					log.error("Error stopping COMPOSED_QUICK_START container of session {}", session.getSessionId());
				}
			}
		}

		final String mediaNodeId = session.getMediaNodeId();

		if (session.close(reason)) {
			try {
				sessionEventsHandler.onSessionClosed(session, reason);
			} catch (Exception e) {
				log.error("Error recording 'sessionDestroyed' event for session {}: {} - {}", session.getSessionId(),
						e.getClass().getName(), e.getMessage());
			}
		}

		this.cleanCollections(session.getSessionId());

		log.info("Session '{}' removed and closed", session.getSessionId());

		if (mediaNodeId != null) {
			this.mediaNodeManager.dropIdleMediaNode(mediaNodeId);
		}
	}

	protected void cleanCollections(String sessionId) {
		sessions.remove(sessionId);
		sessionsNotActive.remove(sessionId);
		sessionidParticipantpublicidParticipant.remove(sessionId);
		sessionidFinalUsers.remove(sessionId);
		sessionidAccumulatedRecordings.remove(sessionId);
		tokenRegister.deregisterTokens(sessionId);
	}

	private void initializeCollections(String sessionId) {
		this.sessionidParticipantpublicidParticipant.putIfAbsent(sessionId, new ConcurrentHashMap<>());
		this.sessionidFinalUsers.putIfAbsent(sessionId, new ConcurrentHashMap<>());
		if (this.openviduConfig.isRecordingModuleEnabled()) {
			this.sessionidAccumulatedRecordings.putIfAbsent(sessionId, new ConcurrentLinkedQueue<>());
		}
	}

	public void closeAllSessionsAndRecordingsOfKms(Kms kms, EndReason reason) {
		// Close all non active sessions configured with this Media Node
		this.closeNonActiveSessions(sessionNotActive -> {
			return (sessionNotActive.getSessionProperties().mediaNode() != null
					&& kms.getId().equals(sessionNotActive.getSessionProperties().mediaNode()));
		});
		// Close all active sessions
		kms.getKurentoSessions().forEach(kSession -> {
			this.closeSession(kSession.getSessionId(), reason);
		});
		// Stop all external recordings
		kms.getActiveRecordings().forEach(recordingIdSessionId -> {

			final String recordingId = recordingIdSessionId.getKey();
			final String sessionId = recordingIdSessionId.getValue();
			Session session = this.getSession(sessionId);

			if (session != null && !session.isClosed()) {
				// This is a recording of a Session hosted on a different Media Node
				try {
					this.recordingManager.stopRecording(session, null, RecordingManager.finalReason(reason));
				} catch (OpenViduException e) {
					log.error("Error stopping external recording {} of session {} in Media Node {}: {}", recordingId,
							sessionId, kms.getId(), e.getMessage());
				}
			}
		});
	}

	private Participant newParticipantAux(String sessionId, String uniqueSessionId, String finalUserId,
			String participantPrivateId, String participantPublicId, Token token, String clientMetadata,
			GeoLocation location, String platform, EndpointType endpointType) {
		Participant p = new Participant(finalUserId, participantPrivateId, participantPublicId, sessionId,
				uniqueSessionId, token, clientMetadata, location, platform, endpointType, null);
		this.tokenRegister.registerToken(sessionId, p, token);
		this.sessionidParticipantpublicidParticipant.get(sessionId).put(p.getParticipantPublicId(), p);
		return p;
	}

}
