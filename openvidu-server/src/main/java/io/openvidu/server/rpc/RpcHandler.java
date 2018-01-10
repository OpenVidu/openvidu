package io.openvidu.server.rpc;

import java.util.Arrays;
import java.util.List;

import org.kurento.jsonrpc.DefaultJsonRpcHandler;
import org.kurento.jsonrpc.Session;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.Token;

public class RpcHandler extends DefaultJsonRpcHandler<JsonObject> {

	private static final Logger log = LoggerFactory.getLogger(RpcHandler.class);

	@Autowired
	OpenviduConfig openviduConfig;

	@Autowired
	SessionManager sessionManager;

	@Autowired
	RpcNotificationService notificationService;

	@Override
	public void handleRequest(Transaction transaction, Request<JsonObject> request) throws Exception {

		String participantPrivateId = null;
		try {
			participantPrivateId = transaction.getSession().getSessionId();
		} catch (Throwable e) {
			log.error("Error getting WebSocket session ID from transaction {}", transaction, e);
			throw e;
		}

		log.debug("WebSocket session #{} - Request: {}", participantPrivateId, request);

		RpcConnection rpcConnection = notificationService.addTransaction(transaction, request);

		// ParticipantRequest participantRequest = new ParticipantRequest(rpcSessionId,
		// Integer.toString(request.getId()));

		transaction.startAsync();

		switch (request.getMethod()) {
		case ProtocolElements.JOINROOM_METHOD:
			joinRoom(rpcConnection, request);
			break;
		case ProtocolElements.LEAVEROOM_METHOD:
			leaveRoom(rpcConnection, request);
			break;
		case ProtocolElements.PUBLISHVIDEO_METHOD:
			publishVideo(rpcConnection, request);
			break;
		case ProtocolElements.ONICECANDIDATE_METHOD:
			onIceCandidate(rpcConnection, request);
			break;
		case ProtocolElements.RECEIVEVIDEO_METHOD:
			receiveVideoFrom(rpcConnection, request);
			break;
		case ProtocolElements.UNSUBSCRIBEFROMVIDEO_METHOD:
			unsubscribeFromVideo(rpcConnection, request);
			break;
		case ProtocolElements.SENDMESSAGE_ROOM_METHOD:
			sendMessage(rpcConnection, request);
			break;
		case ProtocolElements.UNPUBLISHVIDEO_METHOD:
			unpublishVideo(rpcConnection, request);
			break;
		default:
			log.error("Unrecognized request {}", request);
			break;
		}
	}

	public void joinRoom(RpcConnection rpcConnection, Request<JsonObject> request) {

		String sessionId = getStringParam(request, ProtocolElements.JOINROOM_ROOM_PARAM);
		String token = getStringParam(request, ProtocolElements.JOINROOM_TOKEN_PARAM);
		String secret = getStringParam(request, ProtocolElements.JOINROOM_SECRET_PARAM);
		String participantPrivatetId = rpcConnection.getParticipantPrivateId();

		if (openviduConfig.isOpenViduSecret(secret)) {
			sessionManager.newInsecureParticipant(participantPrivatetId);
		}

		if (sessionManager.isTokenValidInSession(token, sessionId, participantPrivatetId)) {

			String clientMetadata = getStringParam(request, ProtocolElements.JOINROOM_METADATA_PARAM);

			if (sessionManager.isMetadataFormatCorrect(clientMetadata)) {

				Token tokenObj = sessionManager.consumeToken(sessionId, participantPrivatetId, token);
				Participant participant = sessionManager.newParticipant(sessionId, participantPrivatetId, tokenObj,
						clientMetadata);

				rpcConnection.setSessionId(sessionId);
				sessionManager.joinRoom(participant, sessionId, request.getId());

			} else {
				System.out.println("Error: metadata format is incorrect");
				throw new OpenViduException(Code.USER_METADATA_FORMAT_INVALID_ERROR_CODE,
						"Unable to join room. The metadata received has an invalid format");
			}
		} else {
			System.out.println("Error: sessionId or token not valid");
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to join room. The user is not authorized");
		}
	}

	private void leaveRoom(RpcConnection rpcConnection, Request<JsonObject> request) {

		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();

		if (sessionId == null) { // null when afterConnectionClosed
			log.warn("No session information found for participant with privateId {}. "
					+ "Using the admin method to evict the user.", participantPrivateId);
			leaveRoomAfterConnClosed(participantPrivateId);
		} else {
			// Sanity check: don't call leaveRoom unless the id checks out
			Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);
			if (participant != null) {
				log.info("Participant {} is leaving session {}", participant.getParticipantPublicId(), sessionId);
				sessionManager.leaveRoom(participant, request.getId());
				log.info("Participant {} has left session {}", participant.getParticipantPublicId(), sessionId);
			} else {
				log.warn("Participant with private id {} not found in session {}. "
						+ "Using the admin method to evict the user.", participantPrivateId, sessionId);
				leaveRoomAfterConnClosed(participantPrivateId);
			}
		}
	}

	private void publishVideo(RpcConnection rpcConnection, Request<JsonObject> request) {

		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);

		if (sessionManager.isPublisherInSession(sessionId, participant)) {
			MediaOptions options = sessionManager.generateMediaOptions(request);
			sessionManager.publishVideo(participant, options, request.getId());
		} else {
			log.error("Error: participant {} is not a publisher", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to publish video. The user does not have a valid token");
		}
	}

	private void receiveVideoFrom(RpcConnection rpcConnection, Request<JsonObject> request) {

		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);

		String senderName = getStringParam(request, ProtocolElements.RECEIVEVIDEO_SENDER_PARAM);
		senderName = senderName.substring(0, senderName.indexOf("_"));
		String sdpOffer = getStringParam(request, ProtocolElements.RECEIVEVIDEO_SDPOFFER_PARAM);

		sessionManager.subscribe(participant, senderName, sdpOffer, request.getId());
	}

	private void unsubscribeFromVideo(RpcConnection rpcConnection, Request<JsonObject> request) {

		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);

		String senderName = getStringParam(request, ProtocolElements.UNSUBSCRIBEFROMVIDEO_SENDER_PARAM);

		sessionManager.unsubscribe(participant, senderName, request.getId());
	}

	private void onIceCandidate(RpcConnection rpcConnection, Request<JsonObject> request) {

		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);

		String endpointName = getStringParam(request, ProtocolElements.ONICECANDIDATE_EPNAME_PARAM);
		String candidate = getStringParam(request, ProtocolElements.ONICECANDIDATE_CANDIDATE_PARAM);
		String sdpMid = getStringParam(request, ProtocolElements.ONICECANDIDATE_SDPMIDPARAM);
		int sdpMLineIndex = getIntParam(request, ProtocolElements.ONICECANDIDATE_SDPMLINEINDEX_PARAM);

		sessionManager.onIceCandidate(participant, endpointName, candidate, sdpMLineIndex, sdpMid, request.getId());
	}

	private void sendMessage(RpcConnection rpcConnection, Request<JsonObject> request) {

		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);

		String message = getStringParam(request, ProtocolElements.SENDMESSAGE_MESSAGE_PARAM);

		sessionManager.sendMessage(participant, message, request.getId());
	}
	
	private void unpublishVideo(RpcConnection rpcConnection, Request<JsonObject> request) {

		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);

		sessionManager.unpublishVideo(participant, request.getId());
	}

	public void leaveRoomAfterConnClosed(String participantPrivateId) {
		try {
			sessionManager.evictParticipant(participantPrivateId);
			log.info("Evicted participant with privateId {}", participantPrivateId);
		} catch (OpenViduException e) {
			log.warn("Unable to evict: {}", e.getMessage());
			log.trace("Unable to evict user", e);
		}
	}

	@Override
	public void afterConnectionEstablished(Session rpcSession) throws Exception {
		log.info("Connection established for WebSocket session: {}", rpcSession.getSessionId());
	}

	@Override
	public void afterConnectionClosed(Session rpcSession, String status) throws Exception {
		log.info("Connection closed for WebSocket session: {} - Status: {}", rpcSession.getSessionId(), status);
	}

	@Override
	public void handleTransportError(Session rpcSession, Throwable exception) throws Exception {
		log.error("Transport exception for WebSocket session: {} - Exception: {}", rpcSession.getSessionId(),
				exception.getMessage());
	}

	@Override
	public void handleUncaughtException(Session rpcSession, Exception exception) {
		log.error("Uncaught exception for WebSocket session: {} - Exception: {}", rpcSession.getSessionId(),
				exception.getMessage());
	}

	@Override
	public List<String> allowedOrigins() {
		return Arrays.asList("*");
	}

	public static String getStringParam(Request<JsonObject> request, String key) {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw new RuntimeException("Request element '" + key + "' is missing");
		}
		return request.getParams().get(key).getAsString();
	}

	public static int getIntParam(Request<JsonObject> request, String key) {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw new RuntimeException("Request element '" + key + "' is missing");
		}
		return request.getParams().get(key).getAsInt();
	}

	public static boolean getBooleanParam(Request<JsonObject> request, String key) {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw new RuntimeException("Request element '" + key + "' is missing");
		}
		return request.getParams().get(key).getAsBoolean();
	}

}
