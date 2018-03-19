package io.openvidu.server.kurento.core;

import java.util.Collections;
import java.util.Set;

import org.kurento.client.IceCandidate;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaElement;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.ArchiveLayout;
import io.openvidu.java.client.ArchiveMode;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.KurentoClientProvider;
import io.openvidu.server.kurento.KurentoClientSessionInfo;
import io.openvidu.server.kurento.OpenViduKurentoClientSessionInfo;
import io.openvidu.server.kurento.endpoint.SdpType;
import io.openvidu.server.recording.ComposedRecordingService;
import io.openvidu.server.rpc.RpcHandler;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;

public class KurentoSessionManager extends SessionManager {

	private static final Logger log = LoggerFactory.getLogger(KurentoSessionManager.class);

	@Autowired
	private KurentoClientProvider kcProvider;

	@Autowired
	private KurentoSessionEventsHandler sessionHandler;

	@Autowired
	private ComposedRecordingService recordingService;

	@Autowired
	OpenviduConfig openviduConfig;

	@Override
	public synchronized void joinRoom(Participant participant, String sessionId, Integer transactionId) {
		Set<Participant> existingParticipants = null;
		try {

			KurentoClientSessionInfo kcSessionInfo = new OpenViduKurentoClientSessionInfo(
					participant.getParticipantPrivateId(), sessionId);

			KurentoSession session = (KurentoSession) sessions.get(sessionId);
			if (session == null && kcSessionInfo != null) {
				SessionProperties properties = sessionProperties.get(sessionId);
				if (properties == null && this.isInsecureParticipant(participant.getParticipantPrivateId())) {
					properties = new SessionProperties.Builder().mediaMode(MediaMode.ROUTED)
							.archiveMode(ArchiveMode.ALWAYS).archiveLayout(ArchiveLayout.BEST_FIT).build();
				}
				createSession(kcSessionInfo, properties);
			}
			session = (KurentoSession) sessions.get(sessionId);
			if (session == null) {
				log.warn("Session '{}' not found");
				throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId
						+ "' was not found, must be created before '" + sessionId + "' can join");
			}
			if (session.isClosed()) {
				log.warn("'{}' is trying to join session '{}' but it is closing", participant.getParticipantPublicId(),
						sessionId);
				throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "'" + participant.getParticipantPublicId()
						+ "' is trying to join room '" + sessionId + "' but it is closing");
			}
			existingParticipants = getParticipants(sessionId);
			session.join(participant);

		} catch (OpenViduException e) {
			log.warn("PARTICIPANT {}: Error joining/creating session {}", participant.getParticipantPublicId(),
					sessionId, e);
			sessionHandler.onParticipantJoined(participant, sessionId, null, transactionId, e);
		}
		if (existingParticipants != null) {
			sessionHandler.onParticipantJoined(participant, sessionId, existingParticipants, transactionId, null);
		}
	}

	@Override
	public void leaveRoom(Participant participant, Integer transactionId) {
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
		session.leave(participant.getParticipantPrivateId());

		if (sessionidParticipantpublicidParticipant.get(sessionId) != null) {
			Participant p = sessionidParticipantpublicidParticipant.get(sessionId)
					.remove(participant.getParticipantPublicId());
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

		Set<Participant> remainingParticipants = null;
		try {
			remainingParticipants = getParticipants(sessionId);
		} catch (OpenViduException e) {
			log.debug("Possible collision when closing the session '{}' (not found)");
			remainingParticipants = Collections.emptySet();
		}
		if (remainingParticipants.isEmpty()) {
			log.info("No more participants in session '{}', removing it and closing it", sessionId);
			if (session.close()) {
				sessionHandler.onSessionClosed(sessionId);
			}
			sessions.remove(sessionId);

			sessionProperties.remove(sessionId);
			sessionidParticipantpublicidParticipant.remove(sessionId);
			sessionidTokenTokenobj.remove(sessionId);

			showTokens();

			log.warn("Session '{}' removed and closed", sessionId);
		}
		if (remainingParticipants.size() == 1 && openviduConfig.isRecordingModuleEnabled()
				&& MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode())
				&& ArchiveMode.ALWAYS.equals(session.getSessionProperties().archiveMode())
				&& ProtocolElements.RECORDER_PARTICIPANT_ID_PUBLICID
						.equals(remainingParticipants.iterator().next().getParticipantPublicId())) {
			log.info("Last participant left. Stopping recording for session {}", sessionId);
			evictParticipant(session.getParticipantByPublicId("RECORDER").getParticipantPrivateId());
			recordingService.stopRecording(session);
		}
		sessionHandler.onParticipantLeft(participant, sessionId, remainingParticipants, transactionId, null);
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
	 * @param participant
	 *            Participant publishing video
	 * @param MediaOptions
	 *            configuration of the stream to publish
	 * @param transactionId
	 *            identifier of the Transaction
	 * @throws OpenViduException
	 *             on error
	 */
	@Override
	public void publishVideo(Participant participant, MediaOptions mediaOptions, Integer transactionId)
			throws OpenViduException {

		Set<Participant> participants = null;
		String sdpAnswer = null;

		KurentoMediaOptions kurentoOptions = (KurentoMediaOptions) mediaOptions;
		KurentoParticipant kurentoParticipant = (KurentoParticipant) participant;

		log.debug(
				"Request [PUBLISH_MEDIA] isOffer={} sdp={} "
						+ "loopbackAltSrc={} lpbkConnType={} doLoopback={} mediaElements={} ({})",
				kurentoOptions.isOffer, kurentoOptions.sdpOffer, kurentoOptions.loopbackAlternativeSrc,
				kurentoOptions.loopbackConnectionType, kurentoOptions.doLoopback, kurentoOptions.mediaElements,
				participant.getParticipantPublicId());

		SdpType sdpType = kurentoOptions.isOffer ? SdpType.OFFER : SdpType.ANSWER;
		KurentoSession session = kurentoParticipant.getSession();

		kurentoParticipant.createPublishingEndpoint();

		for (MediaElement elem : kurentoOptions.mediaElements) {
			kurentoParticipant.getPublisher().apply(elem);
		}

		sdpAnswer = kurentoParticipant.publishToRoom(sdpType, kurentoOptions.sdpOffer, kurentoOptions.doLoopback,
				kurentoOptions.loopbackAlternativeSrc, kurentoOptions.loopbackConnectionType);

		if (sdpAnswer == null) {
			OpenViduException e = new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
					"Error generating SDP response for publishing user " + participant.getParticipantPublicId());
			log.error("PARTICIPANT {}: Error publishing media", participant.getParticipantPublicId(), e);
			sessionHandler.onPublishMedia(participant, session.getSessionId(), mediaOptions, sdpAnswer, participants,
					transactionId, e);
		}

		if (this.openviduConfig.isRecordingModuleEnabled()
				&& MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode())
				&& ArchiveMode.ALWAYS.equals(session.getSessionProperties().archiveMode())
				&& session.getActivePublishers() == 0) {
			recordingService.startRecording(session);
		}

		session.newPublisher(participant);

		kurentoParticipant.setAudioActive(kurentoOptions.audioActive);
		kurentoParticipant.setVideoActive(kurentoOptions.videoActive);
		kurentoParticipant.setTypeOfVideo(kurentoOptions.typeOfVideo);

		participants = kurentoParticipant.getSession().getParticipants();

		if (sdpAnswer != null) {
			sessionHandler.onPublishMedia(participant, session.getSessionId(), mediaOptions, sdpAnswer, participants,
					transactionId, null);
		}
	}

	@Override
	public void unpublishVideo(Participant participant, Integer transactionId) {
		try {
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			KurentoSession session = kParticipant.getSession();

			log.debug("Request [UNPUBLISH_MEDIA] ({})", participant.getParticipantPublicId());
			if (!participant.isStreaming()) {
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"Participant '" + participant.getParticipantPublicId() + "' is not streaming media");
			}
			kParticipant.unpublishMedia();
			session.cancelPublisher(participant);

			Set<Participant> participants = session.getParticipants();

			sessionHandler.onUnpublishMedia(participant, participants, transactionId, null);

		} catch (OpenViduException e) {
			log.warn("PARTICIPANT {}: Error unpublishing media", participant.getParticipantPublicId(), e);
			sessionHandler.onUnpublishMedia(participant, null, transactionId, e);
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
								+ "in room {} but user could not be found",
						participant.getParticipantPublicId(), senderName, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
						"User '" + senderName + " not found in room '" + session.getSessionId() + "'");
			}
			if (!senderParticipant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to recv media from user {} "
								+ "in room {} but user is not streaming media",
						participant.getParticipantPublicId(), senderName, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + senderName + " not streaming media in room '" + session.getSessionId() + "'");
			}

			sdpAnswer = kParticipant.receiveMediaFrom(senderParticipant, sdpOffer);
			if (sdpAnswer == null) {
				throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
						"Unable to generate SDP answer when subscribing '" + participant.getParticipantPublicId()
								+ "' to '" + senderName + "'");
			}
		} catch (OpenViduException e) {
			log.error("PARTICIPANT {}: Error subscribing to {}", participant.getParticipantPublicId(), senderName, e);
			sessionHandler.onSubscribe(participant, session.getSessionId(), senderName, null, transactionId, e);
		}
		if (sdpAnswer != null) {
			sessionHandler.onSubscribe(participant, session.getSessionId(), senderName, sdpAnswer, transactionId, null);
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
							+ "in room {} but user could not be found",
					participant.getParticipantPublicId(), senderName, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"User " + senderName + " not found in room " + session.getSessionId());
		}

		kParticipant.cancelReceivingMedia(senderName);

		sessionHandler.onUnsubscribe(participant, senderName, transactionId, null);
	}

	@Override
	public void sendMessage(Participant participant, String message, Integer transactionId) {
		try {
			JsonObject messageJSON = new JsonParser().parse(message).getAsJsonObject();
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			sessionHandler.onSendMessage(participant, messageJSON,
					getParticipants(kParticipant.getSession().getSessionId()), transactionId, null);
		} catch (JsonSyntaxException | IllegalStateException e) {
			throw new OpenViduException(Code.SIGNAL_FORMAT_INVALID_ERROR_CODE,
					"Provided signal object '" + message + "' has not a valid JSON format");
		}
	}

	@Override
	public void onIceCandidate(Participant participant, String endpointName, String candidate, int sdpMLineIndex,
			String sdpMid, Integer transactionId) {
		try {
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			log.debug("Request [ICE_CANDIDATE] endpoint={} candidate={} " + "sdpMLineIdx={} sdpMid={} ({})",
					endpointName, candidate, sdpMLineIndex, sdpMid, participant.getParticipantPublicId());
			kParticipant.addIceCandidate(endpointName, new IceCandidate(candidate, sdpMid, sdpMLineIndex));
			sessionHandler.onRecvIceCandidate(participant, transactionId, null);
		} catch (OpenViduException e) {
			log.error("PARTICIPANT {}: Error receiving ICE " + "candidate (epName={}, candidate={})",
					participant.getParticipantPublicId(), endpointName, candidate, e);
			sessionHandler.onRecvIceCandidate(participant, transactionId, e);
		}
	}

	/**
	 * Creates a session if it doesn't already exist. The session's id will be
	 * indicated by the session info bean.
	 *
	 * @param kcSessionInfo
	 *            bean that will be passed to the {@link KurentoClientProvider} in
	 *            order to obtain the {@link KurentoClient} that will be used by the
	 *            room
	 * @throws OpenViduException
	 *             in case of error while creating the session
	 */
	public void createSession(KurentoClientSessionInfo kcSessionInfo, SessionProperties sessionProperties)
			throws OpenViduException {
		String sessionId = kcSessionInfo.getRoomName();
		KurentoSession session = (KurentoSession) sessions.get(sessionId);
		if (session != null) {
			throw new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
					"Session '" + sessionId + "' already exists");
		}
		KurentoClient kurentoClient = kcProvider.getKurentoClient(kcSessionInfo);
		session = new KurentoSession(sessionId, sessionProperties, kurentoClient, sessionHandler,
				kcProvider.destroyWhenUnused());

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

		sessionHandler.onSessionCreated(sessionId);
	}

	/**
	 * Application-originated request to remove a participant from a session. <br/>
	 * <strong>Side effects:</strong> The session event handler should notify the
	 * participant that she has been evicted. Should also send notifications to all
	 * other participants about the one that's just been evicted.
	 *
	 */
	@Override
	public void evictParticipant(String participantPrivateId) throws OpenViduException {
		Participant participant = this.getParticipant(participantPrivateId);
		this.leaveRoom(participant, null);
		sessionHandler.onParticipantEvicted(participant);
	}

	@Override
	public MediaOptions generateMediaOptions(Request<JsonObject> request) {

		String sdpOffer = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_SDPOFFER_PARAM);
		boolean audioActive = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_AUDIOACTIVE_PARAM);
		boolean videoActive = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_VIDEOACTIVE_PARAM);
		String typeOfVideo = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_TYPEOFVIDEO_PARAM);
		boolean doLoopback = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_DOLOOPBACK_PARAM);

		return new KurentoMediaOptions(true, sdpOffer, null, null, audioActive, videoActive, typeOfVideo, doLoopback);
	}

}
