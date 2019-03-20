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

package io.openvidu.server.kurento.core;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.kurento.client.GenericMediaElement;
import org.kurento.client.IceCandidate;
import org.kurento.client.KurentoClient;
import org.kurento.client.ListenerSubscription;
import org.kurento.jsonrpc.Props;
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
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingMode;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.KurentoClientProvider;
import io.openvidu.server.kurento.KurentoClientSessionInfo;
import io.openvidu.server.kurento.KurentoFilter;
import io.openvidu.server.kurento.OpenViduKurentoClientSessionInfo;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.kurento.endpoint.SdpType;
import io.openvidu.server.rpc.RpcHandler;
import io.openvidu.server.utils.JsonUtils;

public class KurentoSessionManager extends SessionManager {

	private static final Logger log = LoggerFactory.getLogger(KurentoSessionManager.class);

	@Autowired
	private KurentoClientProvider kcProvider;

	@Autowired
	private KurentoSessionEventsHandler kurentoSessionEventsHandler;

	@Autowired
	private KurentoParticipantEndpointConfig kurentoEndpointConfig;

	private KurentoClient kurentoClient;

	@Override
	public synchronized void joinRoom(Participant participant, String sessionId, Integer transactionId) {
		Set<Participant> existingParticipants = null;
		try {

			KurentoClientSessionInfo kcSessionInfo = new OpenViduKurentoClientSessionInfo(
					participant.getParticipantPrivateId(), sessionId);
			KurentoSession kSession = (KurentoSession) sessions.get(sessionId);

			if (kSession == null && kcSessionInfo != null) {
				// First user connecting to the session
				Session sessionNotActive = sessionsNotActive.remove(sessionId);

				if (sessionNotActive == null && this.isInsecureParticipant(participant.getParticipantPrivateId())) {
					// Insecure user directly call joinRoom RPC method, without REST API use
					sessionNotActive = new Session(sessionId,
							new SessionProperties.Builder().mediaMode(MediaMode.ROUTED)
									.recordingMode(RecordingMode.ALWAYS)
									.defaultRecordingLayout(RecordingLayout.BEST_FIT).build(),
							openviduConfig, recordingManager);
				}

				createSession(sessionNotActive, kcSessionInfo);
			}
			kSession = (KurentoSession) sessions.get(sessionId);
			if (kSession == null) {
				log.warn("Session '{}' not found");
				throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId
						+ "' was not found, must be created before '" + sessionId + "' can join");
			}
			if (kSession.isClosed()) {
				log.warn("'{}' is trying to join session '{}' but it is closing", participant.getParticipantPublicId(),
						sessionId);
				throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "'" + participant.getParticipantPublicId()
						+ "' is trying to join session '" + sessionId + "' but it is closing");
			}
			existingParticipants = getParticipants(sessionId);
			kSession.join(participant);
		} catch (OpenViduException e) {
			log.warn("PARTICIPANT {}: Error joining/creating session {}", participant.getParticipantPublicId(),
					sessionId, e);
			sessionEventsHandler.onParticipantJoined(participant, sessionId, null, transactionId, e);
		}
		if (existingParticipants != null) {
			sessionEventsHandler.onParticipantJoined(participant, sessionId, existingParticipants, transactionId, null);
		}
	}

	@Override
	public synchronized void leaveRoom(Participant participant, Integer transactionId, EndReason reason,
			boolean closeWebSocket) {
		log.debug("Request [LEAVE_ROOM] ({})", participant.getParticipantPublicId());

		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		KurentoSession session = kParticipant.getSession();
		String sessionId = session.getSessionId();

		if (session.isClosed()) {
			log.warn("'{}' is trying to leave from session '{}' but it is closing",
					participant.getParticipantPublicId(), sessionId);
			throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "'" + participant.getParticipantPublicId()
					+ "' is trying to leave from session '" + sessionId + "' but it is closing");
		}
		session.leave(participant.getParticipantPrivateId(), reason);

		// Update control data structures

		if (sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			Participant p = sessionidParticipantpublicidParticipant.get(sessionId)
					.remove(participant.getParticipantPublicId());

			if (this.coturnCredentialsService.isCoturnAvailable()) {
				this.coturnCredentialsService.deleteUser(p.getToken().getTurnCredentials().getUsername());
			}

			if (sessionidTokenTokenobj.get(sessionId) != null) {
				sessionidTokenTokenobj.get(sessionId).remove(p.getToken().getToken());
			}
			boolean stillParticipant = false;
			for (Session s : sessions.values()) {
				if (s.getParticipantByPrivateId(p.getParticipantPrivateId()) != null) {
					stillParticipant = true;
					break;
				}
			}
			if (!stillParticipant) {
				insecureUsers.remove(p.getParticipantPrivateId());
			}
		}

		showTokens();

		// Close Session if no more participants

		Set<Participant> remainingParticipants = null;
		try {
			remainingParticipants = getParticipants(sessionId);
		} catch (OpenViduException e) {
			log.info("Possible collision when closing the session '{}' (not found)", sessionId);
			remainingParticipants = Collections.emptySet();
		}
		sessionEventsHandler.onParticipantLeft(participant, sessionId, remainingParticipants, transactionId, null,
				reason);

		if (!EndReason.sessionClosedByServer.equals(reason)) {
			// If session is closed by a call to "DELETE /api/sessions" do NOT stop the
			// recording. Will be stopped after in method
			// "SessionManager.closeSessionAndEmptyCollections"
			if (remainingParticipants.isEmpty()) {
				if (openviduConfig.isRecordingModuleEnabled()
						&& MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode())
						&& (this.recordingManager.sessionIsBeingRecorded(sessionId))) {
					// Start countdown to stop recording. Will be aborted if a Publisher starts
					// before timeout
					log.info(
							"Last participant left. Starting {} seconds countdown for stopping recording of session {}",
							this.openviduConfig.getOpenviduRecordingAutostopTimeout(), sessionId);
					recordingManager.initAutomaticRecordingStopThread(session);
				} else {
					log.info("No more participants in session '{}', removing it and closing it", sessionId);
					this.closeSessionAndEmptyCollections(session, reason);
					showTokens();
				}
			} else if (remainingParticipants.size() == 1 && openviduConfig.isRecordingModuleEnabled()
					&& MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode())
					&& this.recordingManager.sessionIsBeingRecorded(sessionId)
					&& ProtocolElements.RECORDER_PARTICIPANT_PUBLICID
							.equals(remainingParticipants.iterator().next().getParticipantPublicId())) {
				// Start countdown
				log.info("Last participant left. Starting {} seconds countdown for stopping recording of session {}",
						this.openviduConfig.getOpenviduRecordingAutostopTimeout(), sessionId);
				recordingManager.initAutomaticRecordingStopThread(session);
			}
		}

		// Finally close websocket session if required
		if (closeWebSocket) {
			sessionEventsHandler.closeRpcSession(participant.getParticipantPrivateId());
		}
	}

	/**
	 * Represents a client's request to start streaming her local media to anyone
	 * inside the room. The media elements should have been created using the same
	 * pipeline as the publisher's. The streaming media endpoint situated on the
	 * server can be connected to itself thus realizing what is known as a loopback
	 * connection. The loopback is performed after applying all additional media
	 * elements specified as parameters (in the same order as they appear in the
	 * params list).
	 * <p>
	 * <br/>
	 * <strong>Dev advice:</strong> Send notifications to the existing participants
	 * in the room to inform about the new stream that has been published. Answer to
	 * the peer's request by sending it the SDP response (answer or updated offer)
	 * generated by the WebRTC endpoint on the server.
	 *
	 * @param participant   Participant publishing video
	 * @param MediaOptions  configuration of the stream to publish
	 * @param transactionId identifier of the Transaction
	 * @throws OpenViduException on error
	 */
	@Override
	public void publishVideo(Participant participant, MediaOptions mediaOptions, Integer transactionId)
			throws OpenViduException {

		Set<Participant> participants = null;
		String sdpAnswer = null;

		KurentoMediaOptions kurentoOptions = (KurentoMediaOptions) mediaOptions;
		KurentoParticipant kParticipant = (KurentoParticipant) participant;

		log.debug(
				"Request [PUBLISH_MEDIA] isOffer={} sdp={} "
						+ "loopbackAltSrc={} lpbkConnType={} doLoopback={} mediaElements={} ({})",
				kurentoOptions.isOffer, kurentoOptions.sdpOffer, kurentoOptions.loopbackAlternativeSrc,
				kurentoOptions.loopbackConnectionType, kurentoOptions.doLoopback, kurentoOptions.mediaElements,
				participant.getParticipantPublicId());

		SdpType sdpType = kurentoOptions.isOffer ? SdpType.OFFER : SdpType.ANSWER;
		KurentoSession kSession = kParticipant.getSession();

		kParticipant.createPublishingEndpoint(mediaOptions);

		/*
		 * for (MediaElement elem : kurentoOptions.mediaElements) {
		 * kurentoParticipant.getPublisher().apply(elem); }
		 */

		KurentoTokenOptions kurentoTokenOptions = participant.getToken().getKurentoTokenOptions();
		if (kurentoOptions.getFilter() != null && kurentoTokenOptions != null) {
			if (kurentoTokenOptions.isFilterAllowed(kurentoOptions.getFilter().getType())) {
				this.applyFilterInPublisher(kParticipant, kurentoOptions.getFilter());
			} else {
				OpenViduException e = new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"Error applying filter for publishing user " + participant.getParticipantPublicId()
								+ ". The token has no permissions to apply filter "
								+ kurentoOptions.getFilter().getType());
				log.error("PARTICIPANT {}: Error applying filter. The token has no permissions to apply filter {}",
						participant.getParticipantPublicId(), kurentoOptions.getFilter().getType(), e);
				sessionEventsHandler.onPublishMedia(participant, null, kParticipant.getPublisher().createdAt(),
						kSession.getSessionId(), mediaOptions, sdpAnswer, participants, transactionId, e);
				throw e;
			}
		}

		sdpAnswer = kParticipant.publishToRoom(sdpType, kurentoOptions.sdpOffer, kurentoOptions.doLoopback,
				kurentoOptions.loopbackAlternativeSrc, kurentoOptions.loopbackConnectionType);

		if (sdpAnswer == null) {
			OpenViduException e = new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
					"Error generating SDP response for publishing user " + participant.getParticipantPublicId());
			log.error("PARTICIPANT {}: Error publishing media", participant.getParticipantPublicId(), e);
			sessionEventsHandler.onPublishMedia(participant, null, kParticipant.getPublisher().createdAt(),
					kSession.getSessionId(), mediaOptions, sdpAnswer, participants, transactionId, e);
		}

		if (this.openviduConfig.isRecordingModuleEnabled()
				&& MediaMode.ROUTED.equals(kSession.getSessionProperties().mediaMode())
				&& kSession.getActivePublishers() == 0) {
			if (RecordingMode.ALWAYS.equals(kSession.getSessionProperties().recordingMode())
					&& !recordingManager.sessionIsBeingRecorded(kSession.getSessionId())
					&& !kSession.recordingManuallyStopped.get()) {
				// Start automatic recording for sessions configured with RecordingMode.ALWAYS
				new Thread(() -> {
					recordingManager.startRecording(kSession,
							new RecordingProperties.Builder().name("")
									.outputMode(kSession.getSessionProperties().defaultOutputMode())
									.recordingLayout(kSession.getSessionProperties().defaultRecordingLayout())
									.customLayout(kSession.getSessionProperties().defaultCustomLayout()).build());
				}).start();
			} else if (RecordingMode.MANUAL.equals(kSession.getSessionProperties().recordingMode())
					&& recordingManager.sessionIsBeingRecorded(kSession.getSessionId())) {
				// Abort automatic recording stop (user published before timeout)
				log.info("Participant {} published before timeout finished. Aborting automatic recording stop",
						participant.getParticipantPublicId());
				boolean stopAborted = recordingManager.abortAutomaticRecordingStopThread(kSession);
				if (stopAborted) {
					log.info("Automatic recording stopped succesfully aborted");
				} else {
					log.info("Automatic recording stopped couldn't be aborted. Recording of session {} has stopped",
							kSession.getSessionId());
				}
			}
		}

		kSession.newPublisher(participant);

		participants = kParticipant.getSession().getParticipants();

		if (sdpAnswer != null) {
			sessionEventsHandler.onPublishMedia(participant, participant.getPublisherStreamId(),
					kParticipant.getPublisher().createdAt(), kSession.getSessionId(), mediaOptions, sdpAnswer,
					participants, transactionId, null);
		}
	}

	@Override
	public void unpublishVideo(Participant participant, Participant moderator, Integer transactionId,
			EndReason reason) {
		try {
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			KurentoSession session = kParticipant.getSession();

			log.debug("Request [UNPUBLISH_MEDIA] ({})", participant.getParticipantPublicId());
			if (!participant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to unpublish video of user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"Participant '" + participant.getParticipantPublicId() + "' is not streaming media");
			}
			kParticipant.unpublishMedia(reason);
			session.cancelPublisher(participant, reason);

			Set<Participant> participants = session.getParticipants();

			sessionEventsHandler.onUnpublishMedia(participant, participants, moderator, transactionId, null, reason);

		} catch (OpenViduException e) {
			log.warn("PARTICIPANT {}: Error unpublishing media", participant.getParticipantPublicId(), e);
			sessionEventsHandler.onUnpublishMedia(participant, new HashSet<>(Arrays.asList(participant)), moderator,
					transactionId, e, null);
		}
	}

	@Override
	public void subscribe(Participant participant, String senderName, String sdpOffer, Integer transactionId) {
		String sdpAnswer = null;
		Session session = null;
		try {
			log.debug("Request [SUBSCRIBE] remoteParticipant={} sdpOffer={} ({})", senderName, sdpOffer,
					participant.getParticipantPublicId());

			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			session = ((KurentoParticipant) participant).getSession();
			Participant senderParticipant = session.getParticipantByPublicId(senderName);

			if (senderParticipant == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to recv media from user {} "
								+ "in session {} but user could not be found",
						participant.getParticipantPublicId(), senderName, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
						"User '" + senderName + " not found in session '" + session.getSessionId() + "'");
			}
			if (!senderParticipant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to recv media from user {} "
								+ "in session {} but user is not streaming media",
						participant.getParticipantPublicId(), senderName, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + senderName + " not streaming media in session '" + session.getSessionId() + "'");
			}

			sdpAnswer = kParticipant.receiveMediaFrom(senderParticipant, sdpOffer);
			if (sdpAnswer == null) {
				throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
						"Unable to generate SDP answer when subscribing '" + participant.getParticipantPublicId()
								+ "' to '" + senderName + "'");
			}
		} catch (OpenViduException e) {
			log.error("PARTICIPANT {}: Error subscribing to {}", participant.getParticipantPublicId(), senderName, e);
			sessionEventsHandler.onSubscribe(participant, session, null, transactionId, e);
		}
		if (sdpAnswer != null) {
			sessionEventsHandler.onSubscribe(participant, session, sdpAnswer, transactionId, null);
		}
	}

	@Override
	public void unsubscribe(Participant participant, String senderName, Integer transactionId) {
		log.debug("Request [UNSUBSCRIBE] remoteParticipant={} ({})", senderName, participant.getParticipantPublicId());

		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		Session session = ((KurentoParticipant) participant).getSession();
		Participant sender = session.getParticipantByPublicId(senderName);

		if (sender == null) {
			log.warn(
					"PARTICIPANT {}: Requesting to unsubscribe from user {} "
							+ "in session {} but user could not be found",
					participant.getParticipantPublicId(), senderName, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"User " + senderName + " not found in session " + session.getSessionId());
		}

		kParticipant.cancelReceivingMedia(senderName, EndReason.unsubscribe);

		sessionEventsHandler.onUnsubscribe(participant, transactionId, null);
	}

	@Override
	public void sendMessage(Participant participant, String message, Integer transactionId) {
		try {
			JsonObject messageJson = new JsonParser().parse(message).getAsJsonObject();
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			sessionEventsHandler.onSendMessage(participant, messageJson,
					getParticipants(kParticipant.getSession().getSessionId()), transactionId, null);
		} catch (JsonSyntaxException | IllegalStateException e) {
			throw new OpenViduException(Code.SIGNAL_FORMAT_INVALID_ERROR_CODE,
					"Provided signal object '" + message + "' has not a valid JSON format");
		}
	}

	@Override
	public void streamPropertyChanged(Participant participant, Integer transactionId, String streamId, String property,
			JsonElement newValue, String reason) {
		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		streamId = kParticipant.getPublisherStreamId();
		MediaOptions streamProperties = kParticipant.getPublisherMediaOptions();

		Boolean hasAudio = streamProperties.hasAudio();
		Boolean hasVideo = streamProperties.hasVideo();
		Boolean audioActive = streamProperties.isAudioActive();
		Boolean videoActive = streamProperties.isVideoActive();
		String typeOfVideo = streamProperties.getTypeOfVideo();
		Integer frameRate = streamProperties.getFrameRate();
		String videoDimensions = streamProperties.getVideoDimensions();
		KurentoFilter filter = streamProperties.getFilter();

		switch (property) {
		case "audioActive":
			audioActive = newValue.getAsBoolean();
			break;
		case "videoActive":
			videoActive = newValue.getAsBoolean();
			break;
		case "videoDimensions":
			videoDimensions = newValue.getAsString();
			break;
		}

		kParticipant.setPublisherMediaOptions(new MediaOptions(hasAudio, hasVideo, audioActive, videoActive,
				typeOfVideo, frameRate, videoDimensions, filter));

		sessionEventsHandler.onStreamPropertyChanged(participant, transactionId,
				kParticipant.getSession().getParticipants(), streamId, property, newValue, reason);
	}

	@Override
	public void onIceCandidate(Participant participant, String endpointName, String candidate, int sdpMLineIndex,
			String sdpMid, Integer transactionId) {
		try {
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			log.debug("Request [ICE_CANDIDATE] endpoint={} candidate={} " + "sdpMLineIdx={} sdpMid={} ({})",
					endpointName, candidate, sdpMLineIndex, sdpMid, participant.getParticipantPublicId());
			kParticipant.addIceCandidate(endpointName, new IceCandidate(candidate, sdpMid, sdpMLineIndex));
			sessionEventsHandler.onRecvIceCandidate(participant, transactionId, null);
		} catch (OpenViduException e) {
			log.error("PARTICIPANT {}: Error receiving ICE " + "candidate (epName={}, candidate={})",
					participant.getParticipantPublicId(), endpointName, candidate, e);
			sessionEventsHandler.onRecvIceCandidate(participant, transactionId, e);
		}
	}

	/**
	 * Creates a session if it doesn't already exist. The session's id will be
	 * indicated by the session info bean.
	 *
	 * @param kcSessionInfo bean that will be passed to the
	 *                      {@link KurentoClientProvider} in order to obtain the
	 *                      {@link KurentoClient} that will be used by the room
	 * @throws OpenViduException in case of error while creating the session
	 */
	public void createSession(Session sessionNotActive, KurentoClientSessionInfo kcSessionInfo)
			throws OpenViduException {
		String sessionId = kcSessionInfo.getRoomName();
		KurentoSession session = (KurentoSession) sessions.get(sessionId);
		if (session != null) {
			throw new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
					"Session '" + sessionId + "' already exists");
		}
		this.kurentoClient = kcProvider.getKurentoClient(kcSessionInfo);
		session = new KurentoSession(sessionNotActive, kurentoClient, kurentoSessionEventsHandler,
				kurentoEndpointConfig, kcProvider.destroyWhenUnused());

		KurentoSession oldSession = (KurentoSession) sessions.putIfAbsent(sessionId, session);
		if (oldSession != null) {
			log.warn("Session '{}' has just been created by another thread", sessionId);
			return;
		}
		String kcName = "[NAME NOT AVAILABLE]";
		if (kurentoClient.getServerManager() != null) {
			kcName = kurentoClient.getServerManager().getName();
		}
		log.warn("No session '{}' exists yet. Created one using KurentoClient '{}'.", sessionId, kcName);

		sessionEventsHandler.onSessionCreated(session);
	}

	@Override
	public void evictParticipant(Participant evictedParticipant, Participant moderator, Integer transactionId,
			EndReason reason) throws OpenViduException {
		if (evictedParticipant != null) {
			KurentoParticipant kParticipant = (KurentoParticipant) evictedParticipant;
			Set<Participant> participants = kParticipant.getSession().getParticipants();
			this.leaveRoom(kParticipant, null, reason, false);
			this.sessionEventsHandler.onForceDisconnect(moderator, evictedParticipant, participants, transactionId,
					null, reason);
			sessionEventsHandler.closeRpcSession(evictedParticipant.getParticipantPrivateId());
		} else {
			if (moderator != null && transactionId != null) {
				this.sessionEventsHandler.onForceDisconnect(moderator, evictedParticipant,
						new HashSet<>(Arrays.asList(moderator)), transactionId,
						new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
								"Connection not found when calling 'forceDisconnect'"),
						null);
			}
		}
	}

	@Override
	public KurentoMediaOptions generateMediaOptions(Request<JsonObject> request) throws OpenViduException {

		String sdpOffer = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_SDPOFFER_PARAM);
		boolean hasAudio = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_HASAUDIO_PARAM);
		boolean hasVideo = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_HASVIDEO_PARAM);

		Boolean audioActive = null, videoActive = null;
		String typeOfVideo = null, videoDimensions = null;
		Integer frameRate = null;
		KurentoFilter kurentoFilter = null;

		try {
			audioActive = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_AUDIOACTIVE_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			videoActive = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_VIDEOACTIVE_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			typeOfVideo = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_TYPEOFVIDEO_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			videoDimensions = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_VIDEODIMENSIONS_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			frameRate = RpcHandler.getIntParam(request, ProtocolElements.PUBLISHVIDEO_FRAMERATE_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			JsonObject kurentoFilterJson = (JsonObject) RpcHandler.getParam(request,
					ProtocolElements.PUBLISHVIDEO_KURENTOFILTER_PARAM);
			if (kurentoFilterJson != null) {
				try {
					kurentoFilter = new KurentoFilter(kurentoFilterJson.get("type").getAsString(),
							kurentoFilterJson.get("options").getAsJsonObject());
				} catch (Exception e) {
					throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
							"'filter' parameter wrong:" + e.getMessage());
				}
			}
		} catch (OpenViduException e) {
			throw e;
		} catch (RuntimeException noParameterFound) {
		}

		boolean doLoopback = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_DOLOOPBACK_PARAM);

		return new KurentoMediaOptions(true, sdpOffer, null, null, hasAudio, hasVideo, audioActive, videoActive,
				typeOfVideo, frameRate, videoDimensions, kurentoFilter, doLoopback);
	}

	@Override
	public boolean unpublishStream(Session session, String streamId, Participant moderator, Integer transactionId,
			EndReason reason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant participant = this.getParticipant(participantPrivateId);
			if (participant != null) {
				this.unpublishVideo(participant, moderator, transactionId, reason);
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

	@Override
	public void applyFilter(Session session, String streamId, String filterType, JsonObject filterOptions,
			Participant moderator, Integer transactionId, String filterReason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant publisher = this.getParticipant(participantPrivateId);
			moderator = (moderator != null
					&& publisher.getParticipantPublicId().equals(moderator.getParticipantPublicId())) ? null
							: moderator;
			log.debug("Request [APPLY_FILTER] over stream [{}] for reason [{}]", streamId, filterReason);
			KurentoParticipant kParticipantPublisher = (KurentoParticipant) publisher;
			if (!publisher.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to applyFilter to user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : publisher.getParticipantPublicId(),
						publisher.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + publisher.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipantPublisher.getPublisher().getFilter() != null) {
				log.warn(
						"PARTICIPANT {}: Requesting to applyFilter to user {} "
								+ "in session {} but user already has a filter",
						moderator != null ? moderator.getParticipantPublicId() : publisher.getParticipantPublicId(),
						publisher.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.EXISTING_FILTER_ALREADY_APPLIED_ERROR_CODE,
						"User '" + publisher.getParticipantPublicId() + " already has a filter applied in session '"
								+ session.getSessionId() + "'");
			} else {
				try {
					KurentoFilter filter = new KurentoFilter(filterType, filterOptions);
					this.applyFilterInPublisher(kParticipantPublisher, filter);
					Set<Participant> participants = kParticipantPublisher.getSession().getParticipants();
					sessionEventsHandler.onFilterChanged(publisher, moderator, transactionId, participants, streamId,
							filter, null, filterReason);
				} catch (OpenViduException e) {
					log.warn("PARTICIPANT {}: Error applying filter", publisher.getParticipantPublicId(), e);
					sessionEventsHandler.onFilterChanged(publisher, moderator, transactionId, new HashSet<>(), streamId,
							null, e, "");
				}
			}

			log.info("State of filter for participant {}: {}", publisher.getParticipantPublicId(),
					((KurentoParticipant) publisher).getPublisher().filterCollectionsToString());

		} else {
			log.warn("PARTICIPANT {}: Requesting to applyFilter to stream {} "
					+ "in session {} but the owner cannot be found", streamId, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Owner of stream '" + streamId + "' not found in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void removeFilter(Session session, String streamId, Participant moderator, Integer transactionId,
			String filterReason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant participant = this.getParticipant(participantPrivateId);
			log.debug("Request [REMOVE_FILTER] over stream [{}] for reason [{}]", streamId, filterReason);
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			if (!participant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilter to user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipant.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilter to user {} "
								+ "in session {} but user does NOT have a filter",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " has no filter applied in session '"
								+ session.getSessionId() + "'");
			} else {
				this.removeFilterInPublisher(kParticipant);
				Set<Participant> participants = kParticipant.getSession().getParticipants();
				sessionEventsHandler.onFilterChanged(participant, moderator, transactionId, participants, streamId,
						null, null, filterReason);
			}

			log.info("State of filter for participant {}: {}", kParticipant.getParticipantPublicId(),
					kParticipant.getPublisher().filterCollectionsToString());

		} else {
			log.warn("PARTICIPANT {}: Requesting to removeFilter to stream {} "
					+ "in session {} but the owner cannot be found", streamId, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Owner of stream '" + streamId + "' not found in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void execFilterMethod(Session session, String streamId, String filterMethod, JsonObject filterParams,
			Participant moderator, Integer transactionId, String filterReason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant participant = this.getParticipant(participantPrivateId);
			log.debug("Request [EXEC_FILTER_MTEHOD] over stream [{}] for reason [{}]", streamId, filterReason);
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			if (!participant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to execFilterMethod to user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipant.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to execFilterMethod to user {} "
								+ "in session {} but user does NOT have a filter",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " has no filter applied in session '"
								+ session.getSessionId() + "'");
			} else {
				KurentoFilter updatedFilter = this.execFilterMethodInPublisher(kParticipant, filterMethod,
						filterParams);
				Set<Participant> participants = kParticipant.getSession().getParticipants();
				sessionEventsHandler.onFilterChanged(participant, moderator, transactionId, participants, streamId,
						updatedFilter, null, filterReason);
			}
		} else {
			log.warn("PARTICIPANT {}: Requesting to removeFilter to stream {} "
					+ "in session {} but the owner cannot be found", streamId, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Owner of stream '" + streamId + "' not found in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void addFilterEventListener(Session session, Participant userSubscribing, String streamId, String eventType)
			throws OpenViduException {
		String publisherPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (publisherPrivateId != null) {
			log.debug("Request [ADD_FILTER_LISTENER] over stream [{}]", streamId);
			KurentoParticipant kParticipantPublishing = (KurentoParticipant) this.getParticipant(publisherPrivateId);
			KurentoParticipant kParticipantSubscribing = (KurentoParticipant) userSubscribing;
			if (!kParticipantPublishing.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to addFilterEventListener to stream {} "
								+ "in session {} but the publisher is not streaming media",
						userSubscribing.getParticipantPublicId(), streamId, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + kParticipantPublishing.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipantPublishing.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to addFilterEventListener to user {} "
								+ "in session {} but user does NOT have a filter",
						kParticipantSubscribing.getParticipantPublicId(),
						kParticipantPublishing.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + kParticipantPublishing.getParticipantPublicId()
								+ " has no filter applied in session '" + session.getSessionId() + "'");
			} else {
				try {
					this.addFilterEventListenerInPublisher(kParticipantPublishing, eventType);
					kParticipantPublishing.getPublisher().addParticipantAsListenerOfFilterEvent(eventType,
							userSubscribing.getParticipantPublicId());
				} catch (OpenViduException e) {
					throw e;
				}
			}

			log.info("State of filter for participant {}: {}", kParticipantPublishing.getParticipantPublicId(),
					kParticipantPublishing.getPublisher().filterCollectionsToString());

		} else {
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Not user found for streamId '" + streamId + "' in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void removeFilterEventListener(Session session, Participant subscriber, String streamId, String eventType)
			throws OpenViduException {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			log.debug("Request [REMOVE_FILTER_LISTENER] over stream [{}]", streamId);
			Participant participantPublishing = this.getParticipant(participantPrivateId);
			KurentoParticipant kParticipantPublishing = (KurentoParticipant) participantPublishing;
			if (!participantPublishing.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilterEventListener to stream {} "
								+ "in session {} but user is not streaming media",
						subscriber.getParticipantPublicId(), streamId, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + participantPublishing.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipantPublishing.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilterEventListener to user {} "
								+ "in session {} but user does NOT have a filter",
						subscriber.getParticipantPublicId(), participantPublishing.getParticipantPublicId(),
						session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + participantPublishing.getParticipantPublicId()
								+ " has no filter applied in session '" + session.getSessionId() + "'");
			} else {
				try {
					PublisherEndpoint pub = kParticipantPublishing.getPublisher();
					if (pub.removeParticipantAsListenerOfFilterEvent(eventType, subscriber.getParticipantPublicId())) {
						// If there are no more participants listening to the event remove the event
						// from the GenericMediaElement
						this.removeFilterEventListenerInPublisher(kParticipantPublishing, eventType);
					}
				} catch (OpenViduException e) {
					throw e;
				}
			}

			log.info("State of filter for participant {}: {}", kParticipantPublishing.getParticipantPublicId(),
					kParticipantPublishing.getPublisher().filterCollectionsToString());

		}
	}

	@Override
	public String getParticipantPrivateIdFromStreamId(String sessionId, String streamId) {
		Session session = this.getSession(sessionId);
		return ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
	}

	private void applyFilterInPublisher(KurentoParticipant kParticipant, KurentoFilter filter)
			throws OpenViduException {
		GenericMediaElement.Builder builder = new GenericMediaElement.Builder(kParticipant.getPipeline(),
				filter.getType());
		Props props = new JsonUtils().fromJsonObjectToProps(filter.getOptions());
		props.forEach(prop -> {
			builder.withConstructorParam(prop.getName(), prop.getValue());
		});
		kParticipant.getPublisher().apply(builder.build());
		kParticipant.getPublisher().getMediaOptions().setFilter(filter);
	}

	private void removeFilterInPublisher(KurentoParticipant kParticipant) {
		kParticipant.getPublisher().cleanAllFilterListeners();
		kParticipant.getPublisher().revert(kParticipant.getPublisher().getFilter());
		kParticipant.getPublisher().getMediaOptions().setFilter(null);
	}

	private KurentoFilter execFilterMethodInPublisher(KurentoParticipant kParticipant, String method,
			JsonObject params) {
		kParticipant.getPublisher().execMethod(method, params);
		KurentoFilter filter = kParticipant.getPublisher().getMediaOptions().getFilter();
		KurentoFilter updatedFilter = new KurentoFilter(filter.getType(), filter.getOptions(), method, params);
		kParticipant.getPublisher().getMediaOptions().setFilter(updatedFilter);
		return updatedFilter;
	}

	private void addFilterEventListenerInPublisher(KurentoParticipant kParticipant, String eventType)
			throws OpenViduException {
		PublisherEndpoint pub = kParticipant.getPublisher();
		if (!pub.isListenerAddedToFilterEvent(eventType)) {
			final String connectionId = kParticipant.getParticipantPublicId();
			final String streamId = kParticipant.getPublisherStreamId();
			final String filterType = kParticipant.getPublisherMediaOptions().getFilter().getType();
			try {
				ListenerSubscription listener = pub.getFilter().addEventListener(eventType, event -> {
					sessionEventsHandler.onFilterEventDispatched(connectionId, streamId, filterType, event.getType(),
							event.getData(), kParticipant.getSession().getParticipants(),
							kParticipant.getPublisher().getPartipantsListentingToFilterEvent(eventType));
				});
				pub.storeListener(eventType, listener);
			} catch (Exception e) {
				log.error("Request to addFilterEventListener to stream {} gone wrong. Error: {}", streamId,
						e.getMessage());
				throw new OpenViduException(Code.FILTER_EVENT_LISTENER_NOT_FOUND,
						"Request to addFilterEventListener to stream " + streamId + " gone wrong: " + e.getMessage());
			}
		}
	}

	private void removeFilterEventListenerInPublisher(KurentoParticipant kParticipant, String eventType) {
		PublisherEndpoint pub = kParticipant.getPublisher();
		if (pub.isListenerAddedToFilterEvent(eventType)) {
			GenericMediaElement filter = kParticipant.getPublisher().getFilter();
			filter.removeEventListener(pub.removeListener(eventType));
		}
	}

}
