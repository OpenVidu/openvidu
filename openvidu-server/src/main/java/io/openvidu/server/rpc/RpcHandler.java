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

package io.openvidu.server.rpc;

import java.io.IOException;
import java.net.InetAddress;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import javax.servlet.http.HttpSession;

import org.apache.commons.lang3.RandomStringUtils;
import org.apache.maven.artifact.versioning.DefaultArtifactVersion;
import org.kurento.jsonrpc.DefaultJsonRpcHandler;
import org.kurento.jsonrpc.Session;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.internal.ws.WebSocketServerSession;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.utils.FormatChecker;
import io.openvidu.server.config.OpenviduBuildInfo;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.IdentifierPrefixes;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.Token;
import io.openvidu.server.utils.GeoLocation;
import io.openvidu.server.utils.GeoLocationByIp;
import io.openvidu.server.utils.VersionComparator;
import io.openvidu.server.utils.VersionComparator.VersionMismatchException;

public class RpcHandler extends DefaultJsonRpcHandler<JsonObject> {

	private static final Logger log = LoggerFactory.getLogger(RpcHandler.class);

	@Autowired
	OpenviduConfig openviduConfig;

	@Autowired
	OpenviduBuildInfo openviduBuildConfig;

	@Autowired
	GeoLocationByIp geoLocationByIp;

	@Autowired
	SessionManager sessionManager;

	@Autowired
	RpcNotificationService notificationService;

	private ConcurrentMap<String, Boolean> webSocketEOFTransportError = new ConcurrentHashMap<>();

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
		case ProtocolElements.PREPARERECEIVEVIDEO_METHOD:
			prepareReceiveVideoFrom(rpcConnection, request);
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
		case ProtocolElements.FORCEDISCONNECT_METHOD:
			forceDisconnect(rpcConnection, request);
			break;
		case ProtocolElements.FORCEUNPUBLISH_METHOD:
			forceUnpublish(rpcConnection, request);
			break;
		case ProtocolElements.APPLYFILTER_METHOD:
			applyFilter(rpcConnection, request);
			break;
		case ProtocolElements.EXECFILTERMETHOD_METHOD:
			execFilterMethod(rpcConnection, request);
			break;
		case ProtocolElements.REMOVEFILTER_METHOD:
			removeFilter(rpcConnection, request);
			break;
		case ProtocolElements.ADDFILTEREVENTLISTENER_METHOD:
			addFilterEventListener(rpcConnection, request);
			break;
		case ProtocolElements.REMOVEFILTEREVENTLISTENER_METHOD:
			removeFilterEventListener(rpcConnection, request);
			break;
		case ProtocolElements.RECONNECTSTREAM_METHOD:
			reconnectStream(rpcConnection, request);
			break;
		case ProtocolElements.VIDEODATA_METHOD:
			updateVideoData(rpcConnection, request);
			break;
		case ProtocolElements.SUBSCRIBETOSPEECHTOTEXT_METHOD:
			subscribeToSpeechToText(rpcConnection, request);
			break;
		case ProtocolElements.UNSUBSCRIBEFROMSPEECHTOTEXT_METHOD:
			unsubscribeFromSpeechToText(rpcConnection, request);
			break;
		case ProtocolElements.ECHO_METHOD:
			echo(rpcConnection, request);
			break;
		default:
			log.error("Unrecognized request {}", request);
			break;
		}
	}

	private void joinRoom(RpcConnection rpcConnection, Request<JsonObject> request) {

		String sessionId = getStringParam(request, ProtocolElements.JOINROOM_ROOM_PARAM);
		String token = getStringParam(request, ProtocolElements.JOINROOM_TOKEN_PARAM);
		String secret = getStringParam(request, ProtocolElements.JOINROOM_SECRET_PARAM);
		String platform = getStringParam(request, ProtocolElements.JOINROOM_PLATFORM_PARAM);
		String participantPrivateId = rpcConnection.getParticipantPrivateId();

		final io.openvidu.server.core.Session session = sessionManager.getSessionWithNotActive(sessionId);
		if (session == null) {
			log.error("ERROR: Session {} not found", sessionId);
			throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE,
					"Unable to join session. Session " + sessionId + " cannot be found");
		}

		InetAddress remoteAddress = null;
		GeoLocation location = null;
		Object obj = rpcConnection.getSession().getAttributes().get("remoteAddress");
		if (obj != null && obj instanceof InetAddress) {
			remoteAddress = (InetAddress) obj;
			try {
				location = this.geoLocationByIp.getLocationByIp(remoteAddress);
			} catch (IOException e) {
				e.printStackTrace();
				location = new GeoLocation(remoteAddress.getHostAddress());
			} catch (Exception e) {
				log.warn("Couldn't locate IP address {} in geolocation database: {}", remoteAddress.getHostAddress(),
						e.getMessage());
				location = new GeoLocation(remoteAddress.getHostAddress());
			}
		}

		HttpSession httpSession = (HttpSession) rpcConnection.getSession().getAttributes().get("httpSession");

		JsonObject sessions = (JsonObject) httpSession.getAttribute("openviduSessions");
		if (sessions == null) {
			// First time this final user connects to an OpenVidu session in this active
			// WebSocketSession. This is a new final user connecting to OpenVidu Server
			JsonObject json = new JsonObject();
			json.addProperty(sessionId, System.currentTimeMillis());
			httpSession.setAttribute("openviduSessions", json);
		} else {
			// This final user has already been connected to an OpenVidu session in this
			// active WebSocketSession
			if (sessions.has(sessionId)) {
				if (sessionManager.getSession(sessionId) != null) {
					// The previously existing final user is reconnecting to an OpenVidu session
					log.info("Final user reconnecting");
				} else if (sessionManager.getSessionNotActive(sessionId) != null) {
					// The previously existing final user is the first one connecting to a new
					// OpenVidu session that shares a sessionId with a previously closed session
					// (same customSessionId)
					sessions.addProperty(sessionId, System.currentTimeMillis());
				}
			} else {
				// The previously existing final user is connecting to a new session
				sessions.addProperty(sessionId, System.currentTimeMillis());
			}
		}

		boolean recorder = false;
		try {
			recorder = getBooleanParam(request, ProtocolElements.JOINROOM_RECORDER_PARAM);
		} catch (RuntimeException e) {
			// Nothing happens. 'recorder' param to false
		}

		boolean stt = false;
		try {
			stt = getBooleanParam(request, ProtocolElements.JOINROOM_STT_PARAM);
		} catch (RuntimeException e) {
			// Nothing happens. 'stt' param to false
		}

		boolean generateRecorderParticipant = false;
		boolean generateSttParticipant = false;

		if (openviduConfig.isOpenViduSecret(secret)) {

			sessionManager.newInsecureParticipant(participantPrivateId);

			token = IdentifierPrefixes.TOKEN_ID + RandomStringUtils.randomAlphabetic(1).toUpperCase()
					+ RandomStringUtils.randomAlphanumeric(15);
			ConnectionProperties connectionProperties = new ConnectionProperties.Builder().type(ConnectionType.WEBRTC)
					.role(OpenViduRole.SUBSCRIBER).build();

			String connectionId = null;
			if (recorder) {
				generateRecorderParticipant = true;
				connectionId = ProtocolElements.RECORDER_PARTICIPANT_PUBLICID;
			} else if (stt) {
				generateSttParticipant = true;
				connectionId = ProtocolElements.STT_PARTICIPANT_PUBLICID;
			}

			try {
				sessionManager.newTokenForInsecureUser(session, token, connectionProperties, connectionId);
			} catch (Exception e) {
				throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE,
						"Unable to create token for session " + sessionId + ": " + e.getMessage());
			}
		}

		Token tokenObj = session.consumeToken(token);
		if (tokenObj != null) {

			String clientMetadata = getStringParam(request, ProtocolElements.JOINROOM_METADATA_PARAM);
			if (FormatChecker.isServerMetadataFormatCorrect(clientMetadata)) {

				// While closing a session users can't join
				if (session.closingLock.readLock().tryLock()) {
					try {
						if (session.isClosed()) {
							throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE,
									"Unable to join the session. Session " + sessionId + " is closed");
						}
						Participant participant;
						if (generateRecorderParticipant) {
							participant = sessionManager.newRecorderParticipant(session, participantPrivateId, tokenObj,
									clientMetadata);
						} else if (generateSttParticipant) {
							participant = sessionManager.newSttParticipant(session, participantPrivateId, tokenObj,
									clientMetadata);
						} else {
							participant = sessionManager.newParticipant(session, participantPrivateId, tokenObj,
									clientMetadata, location, platform,
									httpSession.getId().substring(0, Math.min(16, httpSession.getId().length())));
							log.info("New Connection {} in Session {} with IP {} and platform {}",
									participant.getParticipantPublicId(), sessionId,
									remoteAddress != null ? remoteAddress.getHostAddress() : "UNKNOWN",
									participant.getPlatform());
						}

						checkSdkVersionCompliancy(request, participant);

						rpcConnection.setSessionId(sessionId);
						sessionManager.joinRoom(participant, sessionId, request.getId());

					} finally {
						session.closingLock.readLock().unlock();
					}
				} else {
					log.error(
							"ERROR: The session {} is in the process of closing while participant {} (privateId) was joining",
							sessionId, participantPrivateId);
					throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE,
							"Unable to join the session. Session " + sessionId + " was in the process of closing");
				}
			} else {
				log.error("ERROR: Metadata format set in client-side is incorrect");
				throw new OpenViduException(Code.USER_METADATA_FORMAT_INVALID_ERROR_CODE, "Unable to join session "
						+ sessionId + ". The metadata received from the client-side has an invalid format");
			}
		} else {
			log.error("ERROR: token not valid");
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to join session " + sessionId + ". Token " + token + " is not valid");
		}
	}

	private void leaveRoom(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "disconnect");
		} catch (OpenViduException e) {
			return;
		}

		sessionManager.leaveRoom(participant, request.getId(), EndReason.disconnect, true);
		log.info("Participant {} has left session {}", participant.getParticipantPublicId(),
				rpcConnection.getSessionId());
	}

	private void publishVideo(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "publish");
		} catch (OpenViduException e) {
			return;
		}

		if (sessionManager.isPublisherInSession(rpcConnection.getSessionId(), participant)) {
			MediaOptions options = sessionManager.generateMediaOptions(request);
			sessionManager.publishVideo(participant, options, request.getId());
		} else {
			log.error("Error: participant {} is not a publisher", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to publish video. The user does not have a valid token");
		}
	}

	private void prepareReceiveVideoFrom(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "prepareReceiveVideoFrom");
		} catch (OpenViduException e) {
			return;
		}

		String senderStreamId = getStringParam(request, ProtocolElements.RECEIVEVIDEO_SENDER_PARAM);
		String senderPublicId = parseSenderPublicIdFromStreamId(senderStreamId);
		boolean reconnect = getBooleanParam(request, ProtocolElements.PREPARERECEIVEVIDEO_RECONNECT_PARAM);

		sessionManager.prepareSubscription(participant, senderPublicId, reconnect, request.getId());
	}

	private void receiveVideoFrom(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "receiveVideoFrom");
		} catch (OpenViduException e) {
			return;
		}

		String senderStreamId = getStringParam(request, ProtocolElements.RECEIVEVIDEO_SENDER_PARAM);
		String senderPublicId = parseSenderPublicIdFromStreamId(senderStreamId);

		if (request.getParams().has(ProtocolElements.RECEIVEVIDEO_SDPOFFER_PARAM)) {
			// Client initiated negotiation (comes with SDP Offer)
			String sdpOffer = getStringParam(request, ProtocolElements.RECEIVEVIDEO_SDPOFFER_PARAM);
			sessionManager.subscribe(participant, senderPublicId, sdpOffer, request.getId(), false);
		} else if (request.getParams().has(ProtocolElements.RECEIVEVIDEO_SDPANSWER_PARAM)) {
			// Server initiated negotiation (comes with SDP Answer)
			String sdpAnswer = getStringParam(request, ProtocolElements.RECEIVEVIDEO_SDPANSWER_PARAM);
			sessionManager.subscribe(participant, senderPublicId, sdpAnswer, request.getId(), true);
		}
	}

	private void unsubscribeFromVideo(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "unsubscribe");
		} catch (OpenViduException e) {
			return;
		}

		String senderName = getStringParam(request, ProtocolElements.UNSUBSCRIBEFROMVIDEO_SENDER_PARAM);
		sessionManager.unsubscribe(participant, senderName, request.getId());
	}

	private void onIceCandidate(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "onIceCandidate");
		} catch (OpenViduException e) {
			return;
		}

		String endpointName = getStringParam(request, ProtocolElements.ONICECANDIDATE_EPNAME_PARAM);
		String candidate = getStringParam(request, ProtocolElements.ONICECANDIDATE_CANDIDATE_PARAM);
		String sdpMid = getStringParam(request, ProtocolElements.ONICECANDIDATE_SDPMIDPARAM);
		int sdpMLineIndex = getIntParam(request, ProtocolElements.ONICECANDIDATE_SDPMLINEINDEX_PARAM);

		log.info(
				"New candidate received from participant {}: {connectionId: \"{}\", sdpMid: {}, sdpMLineIndex: {}, candidate: \"{}\"}",
				participant.getParticipantPublicId(), endpointName, sdpMid, sdpMLineIndex, candidate);

		sessionManager.onIceCandidate(participant, endpointName, candidate, sdpMLineIndex, sdpMid, request.getId());
	}

	private void sendMessage(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "signal");
		} catch (OpenViduException e) {
			return;
		}

		String message = getStringParam(request, ProtocolElements.SENDMESSAGE_MESSAGE_PARAM);
		sessionManager.sendMessage(participant, message, request.getId());
	}

	private void unpublishVideo(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "unpublish");
		} catch (OpenViduException e) {
			return;
		}

		sessionManager.unpublishVideo(participant, null, request.getId(), EndReason.unpublish);
	}

	private void streamPropertyChanged(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "onStreamPropertyChanged");
		} catch (OpenViduException e) {
			return;
		}

		String streamId = getStringParam(request, ProtocolElements.STREAMPROPERTYCHANGED_STREAMID_PARAM);
		String property = getStringParam(request, ProtocolElements.STREAMPROPERTYCHANGED_PROPERTY_PARAM);
		JsonElement newValue = getParam(request, ProtocolElements.STREAMPROPERTYCHANGED_NEWVALUE_PARAM);
		String reason = getStringParam(request, ProtocolElements.STREAMPROPERTYCHANGED_REASON_PARAM);

		sessionManager.streamPropertyChanged(participant, request.getId(), streamId, property, newValue, reason);
	}

	private void forceDisconnect(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "forceDisconnect");
		} catch (OpenViduException e) {
			return;
		}

		if (sessionManager.isModeratorInSession(rpcConnection.getSessionId(), participant)) {
			String connectionId = getStringParam(request, ProtocolElements.FORCEDISCONNECT_CONNECTIONID_PARAM);
			sessionManager.evictParticipant(
					sessionManager.getSession(rpcConnection.getSessionId()).getParticipantByPublicId(connectionId),
					participant, request.getId(), EndReason.forceDisconnectByUser);
		} else {
			log.error("Error: participant {} is not a moderator", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to force disconnect. The user does not have a valid token");
		}
	}

	private void forceUnpublish(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "forceUnpublish");
		} catch (OpenViduException e) {
			return;
		}

		if (sessionManager.isModeratorInSession(rpcConnection.getSessionId(), participant)) {
			String streamId = getStringParam(request, ProtocolElements.FORCEUNPUBLISH_STREAMID_PARAM);
			sessionManager.unpublishStream(sessionManager.getSession(rpcConnection.getSessionId()), streamId,
					participant, request.getId(), EndReason.forceUnpublishByUser);
		} else {
			log.error("Error: participant {} is not a moderator", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to force unpublish. The user does not have a valid token");
		}
	}

	private void applyFilter(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "applyFilter");
		} catch (OpenViduException e) {
			return;
		}

		String filterType = getStringParam(request, ProtocolElements.FILTER_TYPE_PARAM);
		String streamId = getStringParam(request, ProtocolElements.FILTER_STREAMID_PARAM);
		boolean isModerator = this.sessionManager.isModeratorInSession(rpcConnection.getSessionId(), participant);

		// Allow applying filter if the user is a MODERATOR (owning the stream or other
		// user's stream) or if the user is the owner of the stream and has a token
		// configured with this specific filter
		if (isModerator || (this.userIsStreamOwner(rpcConnection.getSessionId(), participant, streamId)
				&& participant.getToken().getKurentoOptions().isFilterAllowed(filterType))) {
			JsonObject filterOptions;
			try {
				filterOptions = JsonParser.parseString(getStringParam(request, ProtocolElements.FILTER_OPTIONS_PARAM))
						.getAsJsonObject();
			} catch (JsonSyntaxException e) {
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"'options' parameter is not a JSON object: " + e.getMessage());
			}
			Participant moderator = isModerator ? participant : null;
			sessionManager.applyFilter(sessionManager.getSession(rpcConnection.getSessionId()), streamId, filterType,
					filterOptions, moderator, request.getId(), "applyFilter");
		} else {
			log.error("Error: participant {} is not a moderator", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to apply filter. The user does not have a valid token");
		}
	}

	private void removeFilter(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "removeFilter");
		} catch (OpenViduException e) {
			return;
		}
		String streamId = getStringParam(request, ProtocolElements.FILTER_STREAMID_PARAM);
		boolean isModerator = this.sessionManager.isModeratorInSession(rpcConnection.getSessionId(), participant);

		// Allow removing filter if the user is a MODERATOR (owning the stream or other
		// user's stream) or if the user is the owner of the stream
		if (isModerator || this.userIsStreamOwner(rpcConnection.getSessionId(), participant, streamId)) {
			Participant moderator = isModerator ? participant : null;
			sessionManager.removeFilter(sessionManager.getSession(rpcConnection.getSessionId()), streamId, moderator,
					request.getId(), "removeFilter");
		} else {
			log.error("Error: participant {} is not a moderator", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to remove filter. The user does not have a valid token");
		}
	}

	private void execFilterMethod(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "execFilterMethod");
		} catch (OpenViduException e) {
			return;
		}
		String streamId = getStringParam(request, ProtocolElements.FILTER_STREAMID_PARAM);
		String filterMethod = getStringParam(request, ProtocolElements.FILTER_METHOD_PARAM);
		JsonObject filterParams = JsonParser.parseString(getStringParam(request, ProtocolElements.FILTER_PARAMS_PARAM))
				.getAsJsonObject();
		boolean isModerator = this.sessionManager.isModeratorInSession(rpcConnection.getSessionId(), participant);

		// Allow executing filter method if the user is a MODERATOR (owning the stream
		// or other user's stream) or if the user is the owner of the stream
		if (isModerator || this.userIsStreamOwner(rpcConnection.getSessionId(), participant, streamId)) {
			Participant moderator = isModerator ? participant : null;
			sessionManager.execFilterMethod(sessionManager.getSession(rpcConnection.getSessionId()), streamId,
					filterMethod, filterParams, moderator, request.getId(), "execFilterMethod");
		} else {
			log.error("Error: participant {} is not a moderator", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to execute filter method. The user does not have a valid token");
		}
	}

	private void addFilterEventListener(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "addFilterEventListener");
		} catch (OpenViduException e) {
			return;
		}
		String streamId = getStringParam(request, ProtocolElements.FILTER_STREAMID_PARAM);
		String eventType = getStringParam(request, ProtocolElements.FILTEREVENTLISTENER_EVENTTYPE_PARAM);
		boolean isModerator = this.sessionManager.isModeratorInSession(rpcConnection.getSessionId(), participant);

		// Allow adding a filter event listener if the user is a MODERATOR (owning the
		// stream or other user's stream) or if the user is the owner of the stream
		if (isModerator || this.userIsStreamOwner(rpcConnection.getSessionId(), participant, streamId)) {
			try {
				sessionManager.addFilterEventListener(sessionManager.getSession(rpcConnection.getSessionId()),
						participant, streamId, eventType);
				this.notificationService.sendResponse(participant.getParticipantPrivateId(), request.getId(),
						new JsonObject());
			} catch (OpenViduException e) {
				this.notificationService.sendErrorResponse(participant.getParticipantPrivateId(), request.getId(),
						new JsonObject(), e);
			}
		} else {
			log.error("Error: participant {} is not a moderator", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to add filter event listener. The user does not have a valid token");
		}
	}

	private void removeFilterEventListener(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "removeFilterEventListener");
		} catch (OpenViduException e) {
			return;
		}
		String streamId = getStringParam(request, ProtocolElements.FILTER_STREAMID_PARAM);
		String eventType = getStringParam(request, ProtocolElements.FILTEREVENTLISTENER_EVENTTYPE_PARAM);
		boolean isModerator = this.sessionManager.isModeratorInSession(rpcConnection.getSessionId(), participant);

		// Allow removing a filter event listener if the user is a MODERATOR (owning the
		// stream or other user's stream) or if the user is the owner of the stream
		if (isModerator || this.userIsStreamOwner(rpcConnection.getSessionId(), participant, streamId)) {
			try {
				sessionManager.removeFilterEventListener(sessionManager.getSession(rpcConnection.getSessionId()),
						participant, streamId, eventType);
				this.notificationService.sendResponse(participant.getParticipantPrivateId(), request.getId(),
						new JsonObject());
			} catch (OpenViduException e) {
				this.notificationService.sendErrorResponse(participant.getParticipantPrivateId(), request.getId(),
						new JsonObject(), e);
			}
		} else {
			log.error("Error: participant {} is not a moderator", participant.getParticipantPublicId());
			throw new OpenViduException(Code.USER_UNAUTHORIZED_ERROR_CODE,
					"Unable to remove filter event listener. The user does not have a valid token");
		}
	}

	private void reconnectStream(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "reconnectStream");
		} catch (OpenViduException e) {
			return;
		}

		String streamId = getStringParam(request, ProtocolElements.RECONNECTSTREAM_STREAM_PARAM);
		boolean isPublisher = streamId.equals(participant.getPublisherStreamId());

		String sdpString = null;
		if (request.getParams().has(ProtocolElements.RECONNECTSTREAM_SDPOFFER_PARAM)) {
			sdpString = getStringParam(request, ProtocolElements.RECONNECTSTREAM_SDPOFFER_PARAM);
		} else if (request.getParams().has(ProtocolElements.RECONNECTSTREAM_SDPSTRING_PARAM)) {
			sdpString = getStringParam(request, ProtocolElements.RECONNECTSTREAM_SDPSTRING_PARAM);
		}

		try {
			if (isPublisher) {
				sessionManager.reconnectPublisher(participant, streamId, sdpString, request.getId());
			} else {
				boolean initByServer = request.getParams().has(ProtocolElements.RECONNECTSTREAM_SDPSTRING_PARAM);
				boolean forciblyReconnectSubscriber = false;
				if (request.getParams().has(ProtocolElements.RECONNECTSTREAM_FORCIBLYRECONNECT_PARAM)) {
					forciblyReconnectSubscriber = getBooleanParam(request,
							ProtocolElements.RECONNECTSTREAM_FORCIBLYRECONNECT_PARAM);
				}
				sessionManager.reconnectSubscriber(participant, streamId, sdpString, request.getId(), initByServer,
						forciblyReconnectSubscriber);
			}
		} catch (OpenViduException e) {
			this.notificationService.sendErrorResponse(participant.getParticipantPrivateId(), request.getId(),
					new JsonObject(), e);
		}
	}

	private void updateVideoData(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant;
		try {
			participant = sanityCheckOfSession(rpcConnection, "videoData");
			int height = getIntParam(request, "height");
			int width = getIntParam(request, "width");
			boolean videoActive = getBooleanParam(request, "videoActive");
			boolean audioActive = getBooleanParam(request, "audioActive");
			sessionManager.onVideoData(participant, request.getId(), height, width, videoActive, audioActive);
		} catch (OpenViduException e) {
			log.error("Error getting video data: {}", e.toString());
		}
	}

	private void subscribeToSpeechToText(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant = sanityCheckOfSession(rpcConnection, "subscribeToSpeechToText");
		String connectionId = RpcHandler.getStringParam(request,
				ProtocolElements.SUBSCRIBETOSPEECHTOTEXT_CONNECTIONID_PARAM);
		String lang = RpcHandler.getStringParam(request, ProtocolElements.SUBSCRIBETOSPEECHTOTEXT_LANG_PARAM);
		sessionManager.onSubscribeToSpeechToText(participant, request.getId(), lang, connectionId);
	}

	private void unsubscribeFromSpeechToText(RpcConnection rpcConnection, Request<JsonObject> request) {
		Participant participant = sanityCheckOfSession(rpcConnection, "unsubscribeFromSpeechToText");
		String connectionId = RpcHandler.getStringParam(request,
				ProtocolElements.UNSUBSCRIBEFROMSPEECHTOTEXT_CONNECTIONID_PARAM);
		sessionManager.onUnsubscribeFromSpeechToText(participant, request.getId(), connectionId);
	}

	private void echo(RpcConnection rpcConnection, Request<JsonObject> request) {
		sessionManager.onEcho(rpcConnection.getParticipantPrivateId(), request.getId());
	}

	public void leaveRoomAfterConnClosed(String participantPrivateId, EndReason reason) {
		try {
			sessionManager.evictParticipant(this.sessionManager.getParticipant(participantPrivateId), null, null,
					reason);
			log.info("Evicted participant with privateId {}", participantPrivateId);
		} catch (OpenViduException e) {
			log.warn("Unable to evict: {}", e.getMessage());
			log.trace("Unable to evict user", e);
		}
	}

	@Override
	public void afterConnectionEstablished(Session rpcSession) throws Exception {
		log.info("After connection established for WebSocket session: {}", rpcSession.getSessionId());
		if (rpcSession instanceof WebSocketServerSession) {
			InetAddress address;
			HttpHeaders headers = ((WebSocketServerSession) rpcSession).getWebSocketSession().getHandshakeHeaders();
			if (headers.containsKey("x-real-ip")) {
				address = InetAddress.getByName(headers.get("x-real-ip").get(0));
			} else {
				address = ((WebSocketServerSession) rpcSession).getWebSocketSession().getRemoteAddress().getAddress();
			}
			rpcSession.getAttributes().put("remoteAddress", address);

			HttpSession httpSession = (HttpSession) ((WebSocketServerSession) rpcSession).getWebSocketSession()
					.getAttributes().get("httpSession");
			rpcSession.getAttributes().put("httpSession", httpSession);
		}
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
			RpcConnection rpc = this.notificationService.immediatelyCloseRpcSession(rpcSessionId);
			if (rpc != null && rpc.getSessionId() != null) {
				io.openvidu.server.core.Session session = this.sessionManager.getSession(rpc.getSessionId());
				if (session != null && session.getParticipantByPrivateId(rpc.getParticipantPrivateId()) != null) {
					log.info(message, rpc.getParticipantPrivateId());
					leaveRoomAfterConnClosed(rpc.getParticipantPrivateId(), EndReason.networkDisconnect);
				}
			}
		}

		if (this.webSocketEOFTransportError.remove(rpcSessionId) != null) {
			log.warn(
					"Evicting participant with private id {} because a transport error took place and its web socket connection is now closed",
					rpcSession.getSessionId());
			this.leaveRoomAfterConnClosed(rpcSessionId, EndReason.networkDisconnect);
		}
	}

	@Override
	public void afterReconnection(Session rpcSession) throws Exception {
		log.info("After reconnection for WebSocket session: {}", rpcSession.getSessionId());
	}

	@Override
	public void handleTransportError(Session rpcSession, Throwable exception) throws Exception {
		if (rpcSession != null) {
			log.error("Transport exception for WebSocket session: {} - Exception: {}", rpcSession.getSessionId(),
					exception.getMessage());
			if ("IOException".equals(exception.getClass().getSimpleName()) && exception.getCause() != null
					&& "Broken pipe".equals(exception.getCause().getMessage())) {
				log.warn("Participant with private id {} unexpectedly closed the websocket", rpcSession.getSessionId());
			}
			if ("EOFException".equals(exception.getClass().getSimpleName())) {
				// Store WebSocket connection interrupted exception for this web socket to
				// automatically evict the participant on "afterConnectionClosed" event
				this.webSocketEOFTransportError.put(rpcSession.getSessionId(), true);
			}
		}
	}

	@Override
	public void handleUncaughtException(Session rpcSession, Exception exception) {
		log.error("Uncaught exception for WebSocket session: {} - Exception: {}",
				rpcSession != null ? rpcSession.getSessionId() : "RpcSession NULL", exception);
	}

	@Override
	public List<String> allowedOrigins() {
		return Arrays.asList("*");
	}

	public static String getStringParam(Request<JsonObject> request, String key) throws RuntimeException {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw missingParamException(request, key);
		}
		return request.getParams().get(key).getAsString();
	}

	public static int getIntParam(Request<JsonObject> request, String key) throws RuntimeException {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw missingParamException(request, key);
		}
		return request.getParams().get(key).getAsInt();
	}

	public static boolean getBooleanParam(Request<JsonObject> request, String key) throws RuntimeException {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw missingParamException(request, key);
		}
		return request.getParams().get(key).getAsBoolean();
	}

	public static JsonElement getParam(Request<JsonObject> request, String key) throws RuntimeException {
		if (request.getParams() == null || request.getParams().get(key) == null) {
			throw missingParamException(request, key);
		}
		return request.getParams().get(key);
	}

	private Participant sanityCheckOfSession(RpcConnection rpcConnection, String methodName) throws OpenViduException {
		String participantPrivateId = rpcConnection.getParticipantPrivateId();
		String sessionId = rpcConnection.getSessionId();
		String errorMsg;

		if (sessionId == null) { // null when afterConnectionClosed
			errorMsg = "No session information found for participant with privateId " + participantPrivateId
					+ ". Using the admin method to evict the user.";
			log.warn(errorMsg);
			leaveRoomAfterConnClosed(participantPrivateId, null);
			throw new OpenViduException(Code.GENERIC_ERROR_CODE, errorMsg);
		} else {
			// Sanity check: don't call RPC method unless the id checks out
			Participant participant = sessionManager.getParticipant(sessionId, participantPrivateId);
			if (participant != null) {
				if (methodName != "videoData") {
					log.info("Participant {} is calling method '{}' in session {}",
							participant.getParticipantPublicId(), methodName, sessionId);
				}
				return participant;
			} else {
				errorMsg = "Participant with private id " + participantPrivateId + " not found in session " + sessionId
						+ ". Using the admin method to evict the user.";
				log.warn(errorMsg);
				leaveRoomAfterConnClosed(participantPrivateId, null);
				throw new OpenViduException(Code.GENERIC_ERROR_CODE, errorMsg);
			}
		}
	}

	private boolean userIsStreamOwner(String sessionId, Participant participant, String streamId) {
		return participant.getParticipantPrivateId()
				.equals(this.sessionManager.getParticipantPrivateIdFromStreamId(sessionId, streamId));
	}

	private String parseSenderPublicIdFromStreamId(String streamId) {
		String senderPublicId;
		// Parse sender public id from stream id
		if (streamId.startsWith(IdentifierPrefixes.STREAM_ID + "IPC_")
				&& streamId.contains(IdentifierPrefixes.IPCAM_ID)) {
			// If IPCAM
			senderPublicId = streamId.substring(streamId.indexOf("_" + IdentifierPrefixes.IPCAM_ID) + 1,
					streamId.length());
		} else {
			// Not IPCAM
			senderPublicId = streamId.substring(streamId.lastIndexOf(IdentifierPrefixes.PARTICIPANT_PUBLIC_ID),
					streamId.length());
		}
		return senderPublicId;
	}

	private void checkSdkVersionCompliancy(Request<JsonObject> request, Participant participant) {
		String clientVersion;
		try {
			clientVersion = getStringParam(request, ProtocolElements.JOINROOM_SDKVERSION_PARAM);
		} catch (RuntimeException e) {
			log.warn(
					"Missing parameter 'sdkVersion'. Cannot check compatibility between openvidu-browser and openvidu-server");
			return;
		}
		final String serverVersion = openviduBuildConfig.getOpenViduServerVersion();
		try {
			new VersionComparator().checkVersionCompatibility(clientVersion, serverVersion);
		} catch (VersionMismatchException e) {
			if (e.isIncompatible()) {

				if (participant.isRecorderParticipant()) {
					log.error(
							"The COMPOSED recording layout is using an incompatible version of openvidu-browser SDK ({}) for this OpenVidu deployment ({}). This may cause the system to malfunction",
							clientVersion, serverVersion);
				} else {
					log.error(
							"Participant {}{}{} has an incompatible version of openvidu-browser SDK ({}) for this OpenVidu deployment ({}). This may cause the system to malfunction",
							participant.getParticipantPublicId(),
							participant.getPlatform() != null ? (" with platform " + participant.getPlatform()) : "",
							participant.getLocation() != null ? (" with IP " + participant.getLocation().getIp()) : "",
							clientVersion, serverVersion);
					log.error(e.getMessage());
					log.error(
							"openvidu-browser SDK is only compatible with the same version or the immediately following minor version of an OpenVidu deployment");
				}

			} else {
				DefaultArtifactVersion v = new DefaultArtifactVersion(serverVersion);

				if (participant.isRecorderParticipant()) {
					log.warn(
							"The COMPOSED recording layout has an older version of openvidu-browser SDK ({}) for this OpenVidu deployment ({}). These versions are still compatible with each other, "
									+ "but client SDK must be updated as soon as possible to {}.x. This recording layout using openvidu-browser {} will become incompatible with the next release of openvidu-server",
							clientVersion, serverVersion, (v.getMajorVersion() + "." + v.getMinorVersion()),
							clientVersion);
				} else {
					log.warn(
							"Participant {} with IP {} and platform {} has an older version of openvidu-browser SDK ({}) for this OpenVidu deployment ({}). "
									+ "These versions are still compatible with each other, but client SDK must be updated as soon as possible to {}.x. This client using "
									+ "openvidu-browser {} will become incompatible with the next release of openvidu-server",
							participant.getParticipantPublicId(), participant.getLocation().getIp(),
							participant.getPlatform(), clientVersion, serverVersion,
							(v.getMajorVersion() + "." + v.getMinorVersion()), clientVersion);
				}
			}
		}
	}

	private static RuntimeException missingParamException(Request<JsonObject> request, String key) {
		String err = "Request element '" + key + "' is missing in RPC method ";
		err += (request != null) ? ("'" + request.getMethod() + "'") : "[NO REQUEST OBJECT]";
		err += ". Check that 'openvidu-server' and 'openvidu-browser' versions are compatible with each other";
		throw new RuntimeException(err);
	}

}
