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

package io.openvidu.server.rpc;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.kurento.jsonrpc.DefaultJsonRpcHandler;
import org.kurento.jsonrpc.Session;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonElement;
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

	private ConcurrentMap<String, Boolean> webSocketEOFTransportError = new ConcurrentHashMap<>();
	// private ConcurrentMap<String, Boolean> webSocketBrokenPipeTransportError = new ConcurrentHashMap<>();

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

		RpcConnection rpcConnection;
		if (ProtocolElements.JOINROOM_METHOD.equals(request.getMethod())) {
			// Store new RpcConnection information if method 'joinRoom'
			rpcConnection = notificationService.newRpcConnection(transaction, request);
		} else if (notificationService.getRpcConnection(participantPrivateId) == null) {
			// Throw exception if any method is called before 'joinRoom'
			log.warn(
					"No connection found for participant with privateId {} when trying to execute method '{}'. Method 'Session.connect()' must be the first operation called in any session",
					participantPrivateId, request.getMethod());
			throw new OpenViduException(Code.TRANSPORT_ERROR_CODE,
					"No connection found for participant with privateId " + participantPrivateId
							+ ". Method 'Session.connect()' must be the first operation called in any session");
		}
		rpcConnection = notificationService.addTransaction(transaction, request);

		String sessionId = rpcConnection.getSessionId();
		if (sessionId == null && !ProtocolElements.JOINROOM_METHOD.equals(request.getMethod())) {
			log.warn(
					"No session information found for participant with privateId {} when trying to execute method '{}'. Method 'Session.connect()' must be the first operation called in any session",
					participantPrivateId, request.getMethod());
			throw new OpenViduException(Code.TRANSPORT_ERROR_CODE,
					"No session information found for participant with privateId " + participantPrivateId
							+ ". Method 'Session.connect()' must be the first operation called in any session");
		}

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
		case ProtocolElements.STREAMPROPERTYCHANGED_METHOD:
			streamPropertyChanged(rpcConnection, request);
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

		boolean recorder = false;

		try {
			recorder = getBooleanParam(request, ProtocolElements.JOINROOM_RECORDER_PARAM);
		} catch (RuntimeException e) {
			// Nothing happens. 'recorder' param to false
		}

		boolean generateRecorderParticipant = false;

		if (openviduConfig.isOpenViduSecret(secret)) {
			sessionManager.newInsecureParticipant(participantPrivatetId);
			token = sessionManager.generateRandomChain();
			if (recorder) {
				generateRecorderParticipant = true;
			}
		}

		if (sessionManager.isTokenValidInSession(token, sessionId, participantPrivatetId)) {

			String clientMetadata = getStringParam(request, ProtocolElements.JOINROOM_METADATA_PARAM);

			if (sessionManager.isMetadataFormatCorrect(clientMetadata)) {

				Token tokenObj = sessionManager.consumeToken(sessionId, participantPrivatetId, token);
				Participant participant;

				if (generateRecorderParticipant) {
					participant = sessionManager.newRecorderParticipant(sessionId, participantPrivatetId, tokenObj,
							clientMetadata);
				} else {
					participant = sessionManager.newParticipant(sessionId, participantPrivatetId, tokenObj,
							clientMetadata);
				}

				rpcConnection.setSessionId(sessionId);
				sessionManager.joinRoom(participant, sessionId, request.getId());

			} else {
				log.error("ERROR: Metadata format set in client-side is incorrect");
				throw new OpenViduException(Code.USER_METADATA_FORMAT_INVALID_ERROR_CODE,
						"Unable to join room. The metadata received from the client-side has an invalid format (max length allowed is 10000 chars)");
			}
		} else {
			log.error("ERROR: sessionId or token not valid");
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
			leaveRoomAfterConnClosed(participantPrivateId, "");
		} else {
			// Sanity check: don't call leaveRoom unless the id checks out
			Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);
			if (participant != null) {
				log.info("Participant {} is leaving session {}", participant.getParticipantPublicId(), sessionId);
				sessionManager.leaveRoom(participant, request.getId(), "disconnect");
				log.info("Participant {} has left session {}", participant.getParticipantPublicId(), sessionId);
			} else {
				log.warn("Participant with private id {} not found in session {}. "
						+ "Using the admin method to evict the user.", participantPrivateId, sessionId);
				leaveRoomAfterConnClosed(participantPrivateId, "");
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

		sessionManager.unpublishVideo(participant, request.getId(), "unpublish");
	}
	
	public void streamPropertyChanged(RpcConnection rpcConnection, Request<JsonObject> request) {
		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);
		
		String streamId = getStringParam(request, ProtocolElements.STREAMPROPERTYCHANGED_STREAMID_PARAM);
		String property = getStringParam(request, ProtocolElements.STREAMPROPERTYCHANGED_PROPERTY_PARAM);
		JsonElement newValue = getParam(request, ProtocolElements.STREAMPROPERTYCHANGED_NEWVALUE_PARAM);
		String reason = getStringParam(request, ProtocolElements.STREAMPROPERTYCHANGED_REASON_PARAM);
		
		sessionManager.streamPropertyChanged(participant, request.getId(), streamId, property, newValue, reason);
	}

	public void leaveRoomAfterConnClosed(String participantPrivateId, String reason) {
		try {
			sessionManager.evictParticipant(participantPrivateId, reason);
			log.info("Evicted participant with privateId {}", participantPrivateId);
		} catch (OpenViduException e) {
			log.warn("Unable to evict: {}", e.getMessage());
			log.trace("Unable to evict user", e);
		}
	}

	@Override
	public void afterConnectionEstablished(Session rpcSession) throws Exception {
		log.info("After connection established for WebSocket session: {}", rpcSession.getSessionId());
	}

	@Override
	public void afterConnectionClosed(Session rpcSession, String status) throws Exception {
		log.info("After connection closed for WebSocket session: {} - Status: {}", rpcSession.getSessionId(), status);

		String rpcSessionId = rpcSession.getSessionId();
		String message = "";

		if ("Close for not receive ping from client".equals(status)) {
			message = "Evicting participant with private id {} because of a network disconnection";
		} else if (status == null) { // && this.webSocketBrokenPipeTransportError.remove(rpcSessionId) != null)) {
			try {
				Participant p = sessionManager.getParticipant(rpcSession.getSessionId());
				if (p != null) {
					message = "Evicting participant with private id {} because its websocket unexpectedly closed in the client side";
				}
			} catch (OpenViduException exception) {
			}
		}

		if (!message.isEmpty()) {
			RpcConnection rpc = this.notificationService.closeRpcSession(rpcSessionId);
			if (rpc != null && rpc.getSessionId() != null) {
				io.openvidu.server.core.Session session = this.sessionManager.getSession(rpc.getSessionId());
				if (session != null && session.getParticipantByPrivateId(rpc.getParticipantPrivateId()) != null) {
					log.info(message, rpc.getParticipantPrivateId());
					leaveRoomAfterConnClosed(rpc.getParticipantPrivateId(), "networkDisconnect");
				}
			}
		}

		if (this.webSocketEOFTransportError.remove(rpcSessionId) != null) {
			log.warn(
					"Evicting participant with private id {} because a transport error took place and its web socket connection is now closed",
					rpcSession.getSessionId());
			this.leaveRoomAfterConnClosed(rpcSessionId, "networkDisconnect");
		}
	}

	@Override
	public void handleTransportError(Session rpcSession, Throwable exception) throws Exception {
		log.error("Transport exception for WebSocket session: {} - Exception: {}", rpcSession.getSessionId(),
				exception);
		if ("IOException".equals(exception.getClass().getSimpleName())
				&& "Broken pipe".equals(exception.getCause().getMessage())) {
			log.warn("Parcipant with private id {} unexpectedly closed the websocket", rpcSession.getSessionId());
			// this.webSocketBrokenPipeTransportError.put(rpcSession.getSessionId(), true);
		}
		if ("EOFException".equals(exception.getClass().getSimpleName())) {
			// Store WebSocket connection interrupted exception for this web socket to
			// automatically evict the participant on "afterConnectionClosed" event
			this.webSocketEOFTransportError.put(rpcSession.getSessionId(), true);
		}
	}

	@Override
	public void handleUncaughtException(Session rpcSession, Exception exception) {
		log.error("Uncaught exception for WebSocket session: {} - Exception: {}", rpcSession.getSessionId(), exception);
	}

	@Override
	public List<String> allowedOrigins() {
		return Arrays.asList("*");
	}

	public static String getStringParam(Request<JsonObject> request, String key) {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw new RuntimeException("Request element '" + key + "' is missing in method '" + request.getMethod()
					+ "'. CHECK THAT 'openvidu-server' AND 'openvidu-browser' SHARE THE SAME VERSION NUMBER");
		}
		return request.getParams().get(key).getAsString();
	}

	public static int getIntParam(Request<JsonObject> request, String key) {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw new RuntimeException("Request element '" + key + "' is missing in method '" + request.getMethod()
					+ "'. CHECK THAT 'openvidu-server' AND 'openvidu-browser' SHARE THE SAME VERSION NUMBER");
		}
		return request.getParams().get(key).getAsInt();
	}

	public static boolean getBooleanParam(Request<JsonObject> request, String key) {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw new RuntimeException("Request element '" + key + "' is missing in method '" + request.getMethod()
					+ "'. CHECK THAT 'openvidu-server' AND 'openvidu-browser' SHARE THE SAME VERSION NUMBER");
		}
		return request.getParams().get(key).getAsBoolean();
	}
	
	public static JsonElement getParam(Request<JsonObject> request, String key) {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw new RuntimeException("Request element '" + key + "' is missing in method '" + request.getMethod()
					+ "'. CHECK THAT 'openvidu-server' AND 'openvidu-browser' SHARE THE SAME VERSION NUMBER");
		}
		return request.getParams().get(key);
	}

}
