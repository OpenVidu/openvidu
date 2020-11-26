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

package io.openvidu.server.rest;

import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.apache.commons.lang3.RandomStringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Recording.OutputMode;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingMode;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.IdentifierPrefixes;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.Token;
import io.openvidu.server.kurento.core.KurentoMediaOptions;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.utils.RecordingUtils;
import io.openvidu.server.utils.RestUtils;

/**
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@RestController
@CrossOrigin
@ConditionalOnMissingBean(name = "sessionRestControllerPro")
@RequestMapping(RequestMappings.API)
public class SessionRestController {

	private static final Logger log = LoggerFactory.getLogger(SessionRestController.class);

	@Autowired
	protected SessionManager sessionManager;

	@Autowired
	protected RecordingManager recordingManager;

	@Autowired
	protected OpenviduConfig openviduConfig;

	@RequestMapping(value = "/sessions", method = RequestMethod.POST)
	public ResponseEntity<?> initializeSession(@RequestBody(required = false) Map<?, ?> params) {

		log.info("REST API: POST {}/sessions {}", RequestMappings.API, params != null ? params.toString() : "{}");

		SessionProperties sessionProperties;
		try {
			sessionProperties = getSessionPropertiesFromParams(params).build();
		} catch (Exception e) {
			return this.generateErrorResponse(e.getMessage(), "/sessions", HttpStatus.BAD_REQUEST);
		}

		String sessionId;
		if (sessionProperties.customSessionId() != null && !sessionProperties.customSessionId().isEmpty()) {
			if (sessionManager.getSessionWithNotActive(sessionProperties.customSessionId()) != null) {
				return new ResponseEntity<>(HttpStatus.CONFLICT);
			}
			sessionId = sessionProperties.customSessionId();
		} else {
			sessionId = IdentifierPrefixes.SESSION_ID + RandomStringUtils.randomAlphabetic(1).toUpperCase()
					+ RandomStringUtils.randomAlphanumeric(9);
		}

		Session sessionNotActive = sessionManager.storeSessionNotActive(sessionId, sessionProperties);
		log.info("New session {} initialized {}", sessionId, this.sessionManager.getSessionsWithNotActive().stream()
				.map(Session::getSessionId).collect(Collectors.toList()).toString());

		return new ResponseEntity<>(sessionNotActive.toJson(false, false).toString(), RestUtils.getResponseHeaders(),
				HttpStatus.OK);
	}

	@RequestMapping(value = "/sessions/{sessionId}", method = RequestMethod.GET)
	public ResponseEntity<?> getSession(@PathVariable("sessionId") String sessionId,
			@RequestParam(value = "pendingConnections", defaultValue = "false", required = false) boolean pendingConnections,
			@RequestParam(value = "webRtcStats", defaultValue = "false", required = false) boolean webRtcStats) {

		log.info("REST API: GET {}/sessions/{}", RequestMappings.API, sessionId);

		Session session = this.sessionManager.getSession(sessionId);
		if (session != null) {
			JsonObject response = session.toJson(pendingConnections, webRtcStats);
			return new ResponseEntity<>(response.toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
		} else {
			Session sessionNotActive = this.sessionManager.getSessionNotActive(sessionId);
			if (sessionNotActive != null) {
				JsonObject response = sessionNotActive.toJson(pendingConnections, webRtcStats);
				return new ResponseEntity<>(response.toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
			} else {
				return new ResponseEntity<>(HttpStatus.NOT_FOUND);
			}
		}
	}

	@RequestMapping(value = "/sessions", method = RequestMethod.GET)
	public ResponseEntity<?> listSessions(
			@RequestParam(value = "pendingConnections", defaultValue = "false", required = false) boolean pendingConnections,
			@RequestParam(value = "webRtcStats", defaultValue = "false", required = false) boolean webRtcStats) {

		log.info("REST API: GET {}/sessions", RequestMappings.API);

		Collection<Session> sessions = this.sessionManager.getSessionsWithNotActive();
		JsonObject json = new JsonObject();
		JsonArray jsonArray = new JsonArray();
		sessions.forEach(session -> {
			JsonObject sessionJson = session.toJson(pendingConnections, webRtcStats);
			jsonArray.add(sessionJson);
		});
		json.addProperty("numberOfElements", sessions.size());
		json.add("content", jsonArray);
		return new ResponseEntity<>(json.toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
	}

	@RequestMapping(value = "/sessions/{sessionId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> closeSession(@PathVariable("sessionId") String sessionId) {

		log.info("REST API: DELETE {}/sessions/{}", RequestMappings.API, sessionId);

		Session session = this.sessionManager.getSession(sessionId);
		if (session != null) {
			this.sessionManager.closeSession(sessionId, EndReason.sessionClosedByServer);
			return new ResponseEntity<>(HttpStatus.NO_CONTENT);
		}

		Session sessionNotActive = this.sessionManager.getSessionNotActive(sessionId);
		if (sessionNotActive != null) {
			try {
				if (sessionNotActive.closingLock.writeLock().tryLock(15, TimeUnit.SECONDS)) {
					try {
						if (sessionNotActive.isClosed()) {
							return new ResponseEntity<>(HttpStatus.NOT_FOUND);
						}
						this.sessionManager.closeSessionAndEmptyCollections(sessionNotActive,
								EndReason.sessionClosedByServer, true);
						return new ResponseEntity<>(HttpStatus.NO_CONTENT);
					} finally {
						sessionNotActive.closingLock.writeLock().unlock();
					}
				} else {
					String errorMsg = "Timeout waiting for Session " + sessionId
							+ " closing lock to be available for closing from DELETE " + RequestMappings.API
							+ "/sessions";
					log.error(errorMsg);
					return this.generateErrorResponse(errorMsg, "/sessions", HttpStatus.BAD_REQUEST);
				}
			} catch (InterruptedException e) {
				String errorMsg = "InterruptedException while waiting for Session " + sessionId
						+ " closing lock to be available for closing from DELETE " + RequestMappings.API + "/sessions";
				log.error(errorMsg);
				return this.generateErrorResponse(errorMsg, "/sessions", HttpStatus.BAD_REQUEST);
			}
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/connection", method = RequestMethod.POST)
	public ResponseEntity<?> initializeConnection(@PathVariable("sessionId") String sessionId,
			@RequestBody Map<?, ?> params) {

		log.info("REST API: POST {} {}", RequestMappings.API + "/sessions/" + sessionId + "/connection",
				params.toString());

		Session session = this.sessionManager.getSessionWithNotActive(sessionId);
		if (session == null) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}

		ConnectionProperties connectionProperties;
		try {
			connectionProperties = getConnectionPropertiesFromParams(params).build();
		} catch (Exception e) {
			return this.generateErrorResponse(e.getMessage(), "/sessions/" + sessionId + "/connection",
					HttpStatus.BAD_REQUEST);
		}
		switch (connectionProperties.getType()) {
		case WEBRTC:
			return this.newWebrtcConnection(session, connectionProperties);
		case IPCAM:
			return this.newIpcamConnection(session, connectionProperties);
		default:
			return this.generateErrorResponse("Wrong type parameter", "/sessions/" + sessionId + "/connection",
					HttpStatus.BAD_REQUEST);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/connection/{connectionId}", method = RequestMethod.GET)
	public ResponseEntity<?> getConnection(@PathVariable("sessionId") String sessionId,
			@PathVariable("connectionId") String connectionId) {

		log.info("REST API: GET {}/sessions/{}/connection/{}", RequestMappings.API, sessionId, connectionId);

		Session session = this.sessionManager.getSessionWithNotActive(sessionId);
		if (session != null) {
			Participant p = session.getParticipantByPublicId(connectionId);
			if (p != null) {
				return new ResponseEntity<>(p.toJson().toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
			} else {
				Token t = getTokenFromConnectionId(connectionId, session.getTokenIterator());
				if (t != null) {
					return new ResponseEntity<>(t.toJsonAsParticipant().toString(), RestUtils.getResponseHeaders(),
							HttpStatus.OK);
				} else {
					return new ResponseEntity<>(HttpStatus.NOT_FOUND);
				}
			}
		} else {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/connection", method = RequestMethod.GET)
	public ResponseEntity<?> listConnections(@PathVariable("sessionId") String sessionId,
			@RequestParam(value = "pendingConnections", defaultValue = "true", required = false) boolean pendingConnections,
			@RequestParam(value = "webRtcStats", defaultValue = "false", required = false) boolean webRtcStats) {

		log.info("REST API: GET {}/sessions/{}/connection", RequestMappings.API, sessionId);

		Session session = this.sessionManager.getSessionWithNotActive(sessionId);

		if (session != null) {
			JsonObject json = new JsonObject();
			JsonArray jsonArray = session.getSnapshotOfConnectionsAsJsonArray(pendingConnections, webRtcStats);
			json.addProperty("numberOfElements", jsonArray.size());
			json.add("content", jsonArray);
			return new ResponseEntity<>(json.toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/connection/{connectionId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> closeConnection(@PathVariable("sessionId") String sessionId,
			@PathVariable("connectionId") String participantPublicId) {

		log.info("REST API: DELETE {}/sessions/{}/connection/{}", RequestMappings.API, sessionId, participantPublicId);

		Session session = this.sessionManager.getSessionWithNotActive(sessionId);
		if (session == null) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		Participant participant = session.getParticipantByPublicId(participantPublicId);
		if (participant != null) {
			this.sessionManager.evictParticipant(participant, null, null, EndReason.forceDisconnectByServer);
			return new ResponseEntity<>(HttpStatus.NO_CONTENT);
		} else {
			// Try to delete unused token
			if (session.deleteTokenFromConnectionId(participantPublicId)) {
				return new ResponseEntity<>(HttpStatus.NO_CONTENT);
			} else {
				return new ResponseEntity<>(HttpStatus.NOT_FOUND);
			}
		}
	}

	@RequestMapping(value = "/recordings/start", method = RequestMethod.POST)
	public ResponseEntity<?> startRecording(@RequestBody Map<?, ?> params) {

		if (params == null) {
			return this.generateErrorResponse("Error in body parameters. Cannot be empty", "/recordings/start",
					HttpStatus.BAD_REQUEST);
		}

		log.info("REST API: POST {}/recordings/start {}", RequestMappings.API, params.toString());

		if (!this.openviduConfig.isRecordingModuleEnabled()) {
			// OpenVidu Server configuration property "OPENVIDU_RECORDING" is set to false
			return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
		}

		String sessionId;
		try {
			sessionId = (String) params.get("session");
		} catch (Exception e) {
			return this.generateErrorResponse("Type error in parameter \"session\"", "/recordings/start",
					HttpStatus.BAD_REQUEST);
		}

		if (sessionId == null) {
			// "session" parameter not found
			return this.generateErrorResponse("\"session\" parameter is mandatory", "/recordings/start",
					HttpStatus.BAD_REQUEST);
		}

		Session session = sessionManager.getSession(sessionId);
		if (session == null) {
			session = sessionManager.getSessionNotActive(sessionId);
			if (session != null) {
				if (!(MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode()))
						|| this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
					// Session is not in ROUTED MediaMode or it is already being recorded
					return new ResponseEntity<>(HttpStatus.CONFLICT);
				} else {
					// Session is not active (no connected participants)
					return new ResponseEntity<>(HttpStatus.NOT_ACCEPTABLE);
				}
			}
			// Session does not exist
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
		if (!(MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode()))
				|| this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
			// Session is not in ROUTED MediMode or it is already being recorded
			return new ResponseEntity<>(HttpStatus.CONFLICT);
		}
		if (session.getParticipants().isEmpty()) {
			// Session is not active (no connected participants)
			return new ResponseEntity<>(HttpStatus.NOT_ACCEPTABLE);
		}

		RecordingProperties recordingProperties;
		try {
			recordingProperties = getRecordingPropertiesFromParams(params, session).build();
		} catch (RuntimeException e) {
			return this.generateErrorResponse(e.getMessage(), "/sessions", HttpStatus.UNPROCESSABLE_ENTITY);
		} catch (Exception e) {
			return this.generateErrorResponse(e.getMessage(), "/sessions", HttpStatus.BAD_REQUEST);
		}

		try {
			Recording startedRecording = this.recordingManager.startRecording(session, recordingProperties);
			return new ResponseEntity<>(startedRecording.toJson().toString(), RestUtils.getResponseHeaders(),
					HttpStatus.OK);
		} catch (OpenViduException e) {
			HttpStatus status = e.getCodeValue() == Code.MEDIA_NODE_STATUS_WRONG.getValue()
					? HttpStatus.SERVICE_UNAVAILABLE
					: HttpStatus.INTERNAL_SERVER_ERROR;
			return new ResponseEntity<>("Error starting recording: " + e.getMessage(), RestUtils.getResponseHeaders(),
					status);
		}
	}

	@RequestMapping(value = "/recordings/stop/{recordingId}", method = RequestMethod.POST)
	public ResponseEntity<?> stopRecording(@PathVariable("recordingId") String recordingId) {

		log.info("REST API: POST {}/recordings/stop/{}", RequestMappings.API, recordingId);

		if (!this.openviduConfig.isRecordingModuleEnabled()) {
			// OpenVidu Server configuration property "OPENVIDU_RECORDING" is set to false
			return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
		}

		Recording recording = recordingManager.getStartedRecording(recordingId);

		if (recording == null) {
			if (recordingManager.getStartingRecording(recordingId) != null) {
				// Recording is still starting
				return new ResponseEntity<>(HttpStatus.NOT_ACCEPTABLE);
			}
			// Recording does not exist
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
		if (!this.recordingManager.sessionIsBeingRecorded(recording.getSessionId())) {
			// Session is not being recorded
			return new ResponseEntity<>(HttpStatus.CONFLICT);
		}

		Session session = sessionManager.getSession(recording.getSessionId());

		Recording stoppedRecording;
		try {
			stoppedRecording = this.recordingManager.stopRecording(session, recording.getId(),
					EndReason.recordingStoppedByServer);
		} catch (Exception e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
		}

		session.recordingManuallyStopped.set(true);

		if (session != null && !session.isClosed() && OutputMode.COMPOSED.equals(recording.getOutputMode())
				&& recording.hasVideo()) {
			sessionManager.evictParticipant(
					session.getParticipantByPublicId(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID), null, null, null);
		}

		return new ResponseEntity<>(stoppedRecording.toJson().toString(), RestUtils.getResponseHeaders(),
				HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/{recordingId}", method = RequestMethod.GET)
	public ResponseEntity<?> getRecording(@PathVariable("recordingId") String recordingId) {

		log.info("REST API: GET {}/recordings/{}", RequestMappings.API, recordingId);

		if (!this.openviduConfig.isRecordingModuleEnabled()) {
			// OpenVidu Server configuration property "OPENVIDU_RECORDING" is set to false
			return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
		}

		try {
			Recording recording = this.recordingManager.getRecording(recordingId);
			if (io.openvidu.java.client.Recording.Status.started.equals(recording.getStatus())
					&& recordingManager.getStartingRecording(recording.getId()) != null) {
				recording.setStatus(io.openvidu.java.client.Recording.Status.starting);
			}
			return new ResponseEntity<>(recording.toJson().toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
		} catch (Exception e) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/recordings", method = RequestMethod.GET)
	public ResponseEntity<?> listRecordings() {

		log.info("REST API: GET {}/recordings", RequestMappings.API);

		if (!this.openviduConfig.isRecordingModuleEnabled()) {
			// OpenVidu Server configuration property "OPENVIDU_RECORDING" is set to false
			return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
		}

		Collection<Recording> recordings = this.recordingManager.getAllRecordings();
		JsonObject json = new JsonObject();
		JsonArray jsonArray = new JsonArray();
		recordings.forEach(rec -> {
			if (io.openvidu.java.client.Recording.Status.started.equals(rec.getStatus())
					&& recordingManager.getStartingRecording(rec.getId()) != null) {
				rec.setStatus(io.openvidu.java.client.Recording.Status.starting);
			}
			jsonArray.add(rec.toJson());
		});
		json.addProperty("count", recordings.size());
		json.add("items", jsonArray);
		return new ResponseEntity<>(json.toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/{recordingId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> deleteRecording(@PathVariable("recordingId") String recordingId) {

		log.info("REST API: DELETE {}/recordings/{}", RequestMappings.API, recordingId);

		if (!this.openviduConfig.isRecordingModuleEnabled()) {
			// OpenVidu Server configuration property "OPENVIDU_RECORDING" is set to false
			return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
		}

		return new ResponseEntity<>(this.recordingManager.deleteRecordingFromHost(recordingId, false));
	}

	@RequestMapping(value = "/tokens", method = RequestMethod.POST)
	public ResponseEntity<String> newToken(@RequestBody Map<?, ?> params) {

		if (params == null) {
			return this.generateErrorResponse("Error in body parameters. Cannot be empty", "/tokens",
					HttpStatus.BAD_REQUEST);
		}

		log.info("REST API: POST {}/tokens {}", RequestMappings.API, params.toString());

		String sessionId;
		try {
			sessionId = (String) params.get("session");
		} catch (ClassCastException e) {
			return this.generateErrorResponse("Type error in some parameter", "/tokens", HttpStatus.BAD_REQUEST);
		}

		if (sessionId == null) {
			return this.generateErrorResponse("\"session\" parameter is mandatory", "/tokens", HttpStatus.BAD_REQUEST);
		}

		log.warn("Token API is deprecated. Use Connection API instead (POST {}/sessions/{}/connection)",
				RequestMappings.API, sessionId);

		final Session session = this.sessionManager.getSessionWithNotActive(sessionId);
		if (session == null) {
			return this.generateErrorResponse("Session " + sessionId + " not found", "/tokens", HttpStatus.NOT_FOUND);
		}

		ConnectionProperties connectionProperties;
		params.remove("record");
		try {
			connectionProperties = getConnectionPropertiesFromParams(params).build();
		} catch (Exception e) {
			return this.generateErrorResponse(e.getMessage(), "/sessions/" + sessionId + "/connection",
					HttpStatus.BAD_REQUEST);
		}
		ResponseEntity<?> entity = this.newWebrtcConnection(session, connectionProperties);
		JsonObject jsonResponse = JsonParser.parseString(entity.getBody().toString()).getAsJsonObject();

		if (jsonResponse.has("error")) {
			return this.generateErrorResponse(jsonResponse.get("message").getAsString(), "/tokens",
					HttpStatus.valueOf(jsonResponse.get("status").getAsInt()));
		} else {
			String connectionId = jsonResponse.get("id").getAsString();
			Token token = getTokenFromConnectionId(connectionId, session.getTokenIterator());
			return new ResponseEntity<>(token.toJson().toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/stream/{streamId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> unpublishStream(@PathVariable("sessionId") String sessionId,
			@PathVariable("streamId") String streamId) {

		log.info("REST API: DELETE {}/sessions/{}/stream/{}", RequestMappings.API, sessionId, streamId);

		Session session = this.sessionManager.getSessionWithNotActive(sessionId);
		if (session == null) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		session = this.sessionManager.getSession(sessionId);
		if (session != null) {

			final String participantPrivateId = this.sessionManager.getParticipantPrivateIdFromStreamId(sessionId,
					streamId);

			if (participantPrivateId == null) {
				return new ResponseEntity<>(HttpStatus.NOT_FOUND);
			}

			Participant participant = this.sessionManager.getParticipant(participantPrivateId);
			if (participant.isIpcam()) {
				return new ResponseEntity<>(HttpStatus.METHOD_NOT_ALLOWED);
			}

			this.sessionManager.unpublishStream(session, streamId, null, null, EndReason.forceUnpublishByServer);
			return new ResponseEntity<>(HttpStatus.NO_CONTENT);
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/signal", method = RequestMethod.POST)
	public ResponseEntity<?> signal(@RequestBody Map<?, ?> params) {

		if (params == null) {
			return this.generateErrorResponse("Error in body parameters. Cannot be empty", "/signal",
					HttpStatus.BAD_REQUEST);
		}

		log.info("REST API: POST {}/signal {}", RequestMappings.API, params.toString());

		String sessionId;
		String type;
		ArrayList<String> to;
		String data;
		try {
			sessionId = (String) params.get("session");
			to = (ArrayList<String>) params.get("to");
			type = (String) params.get("type");
			data = (String) params.get("data");
		} catch (ClassCastException e) {
			return this.generateErrorResponse("Type error in some parameter", "/signal", HttpStatus.BAD_REQUEST);
		}

		JsonObject completeMessage = new JsonObject();

		if (sessionId == null) {
			// "session" parameter not found
			return this.generateErrorResponse("\"session\" parameter is mandatory", "/signal", HttpStatus.BAD_REQUEST);
		}
		Session session = sessionManager.getSession(sessionId);
		if (session == null) {
			session = sessionManager.getSessionNotActive(sessionId);
			if (session != null) {
				// Session is not active (no connected participants)
				return new ResponseEntity<>(HttpStatus.NOT_ACCEPTABLE);
			}
			// Session does not exist
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}

		if (type != null) {
			completeMessage.addProperty("type", type);
		}

		if (data != null) {
			completeMessage.addProperty("data", data);
		}

		if (to != null) {
			try {
				Gson gson = new GsonBuilder().create();
				JsonArray toArray = gson.toJsonTree(to).getAsJsonArray();
				completeMessage.add("to", toArray);
			} catch (IllegalStateException exception) {
				return this.generateErrorResponse("\"to\" parameter is not a valid JSON array", "/signal",
						HttpStatus.BAD_REQUEST);
			}
		}

		try {
			sessionManager.sendMessage(completeMessage.toString(), sessionId);
		} catch (OpenViduException e) {
			return this.generateErrorResponse("\"to\" array has no valid connection identifiers", "/signal",
					HttpStatus.NOT_ACCEPTABLE);
		}

		return new ResponseEntity<>(HttpStatus.OK);
	}

	protected ResponseEntity<?> newWebrtcConnection(Session session, ConnectionProperties connectionProperties) {

		final String REQUEST_PATH = "/sessions/" + session.getSessionId() + "/connection";

		// While closing a session tokens can't be generated
		if (session.closingLock.readLock().tryLock()) {
			try {
				Token token = sessionManager.newToken(session, connectionProperties.getRole(),
						connectionProperties.getData(), connectionProperties.record(),
						connectionProperties.getKurentoOptions());
				return new ResponseEntity<>(token.toJsonAsParticipant().toString(), RestUtils.getResponseHeaders(),
						HttpStatus.OK);
			} catch (Exception e) {
				return this.generateErrorResponse(
						"Error creating Connection for session " + session.getSessionId() + ": " + e.getMessage(),
						REQUEST_PATH, HttpStatus.INTERNAL_SERVER_ERROR);
			} finally {
				session.closingLock.readLock().unlock();
			}
		} else {
			log.error("Session {} is in the process of closing. Connection couldn't be created",
					session.getSessionId());
			return this.generateErrorResponse("Session " + session.getSessionId() + " not found", REQUEST_PATH,
					HttpStatus.NOT_FOUND);
		}
	}

	protected ResponseEntity<?> newIpcamConnection(Session session, ConnectionProperties connectionProperties) {

		final String REQUEST_PATH = "/sessions/" + session.getSessionId() + "/connection";

		boolean hasAudio = true;
		boolean hasVideo = true;
		boolean audioActive = true;
		boolean videoActive = true;
		String typeOfVideo = ConnectionType.IPCAM.name();
		Integer frameRate = null;
		String videoDimensions = null;
		KurentoMediaOptions mediaOptions = new KurentoMediaOptions(true, null, hasAudio, hasVideo, audioActive,
				videoActive, typeOfVideo, frameRate, videoDimensions, null, false, connectionProperties.getRtspUri(),
				connectionProperties.adaptativeBitrate(), connectionProperties.onlyPlayWithSubscribers(),
				connectionProperties.getNetworkCache());

		// While closing a session IP cameras can't be published
		if (session.closingLock.readLock().tryLock()) {
			try {
				if (session.isClosed()) {
					return new ResponseEntity<>(HttpStatus.NOT_FOUND);
				}
				Participant ipcamParticipant = this.sessionManager.publishIpcam(session, mediaOptions,
						connectionProperties);
				return new ResponseEntity<>(ipcamParticipant.toJson().toString(), RestUtils.getResponseHeaders(),
						HttpStatus.OK);
			} catch (MalformedURLException e) {
				return this.generateErrorResponse("\"rtspUri\" parameter is not a valid rtsp uri", REQUEST_PATH,
						HttpStatus.BAD_REQUEST);
			} catch (Exception e) {
				return this.generateErrorResponse(e.getMessage(), REQUEST_PATH, HttpStatus.INTERNAL_SERVER_ERROR);
			} finally {
				session.closingLock.readLock().unlock();
			}
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	protected SessionProperties.Builder getSessionPropertiesFromParams(Map<?, ?> params) throws Exception {

		SessionProperties.Builder builder = new SessionProperties.Builder();
		String customSessionId = null;

		if (params != null) {

			String mediaModeString;
			String recordingModeString;
			String defaultOutputModeString;
			String defaultRecordingLayoutString;
			String defaultCustomLayout;
			String forcedVideoCodec;
			Boolean allowTranscoding;
			try {
				mediaModeString = (String) params.get("mediaMode");
				recordingModeString = (String) params.get("recordingMode");
				defaultOutputModeString = (String) params.get("defaultOutputMode");
				defaultRecordingLayoutString = (String) params.get("defaultRecordingLayout");
				defaultCustomLayout = (String) params.get("defaultCustomLayout");
				customSessionId = (String) params.get("customSessionId");
				forcedVideoCodec = (String) params.get("forcedVideoCodec");
				allowTranscoding = (Boolean) params.get("allowTranscoding");
			} catch (ClassCastException e) {
				throw new Exception("Type error in some parameter: " + e.getMessage());
			}

			try {
				// Safe parameter retrieval. Default values if not defined
				if (recordingModeString != null) {
					RecordingMode recordingMode = RecordingMode.valueOf(recordingModeString);
					builder = builder.recordingMode(recordingMode);
				} else {
					builder = builder.recordingMode(RecordingMode.MANUAL);
				}
				if (defaultOutputModeString != null) {
					OutputMode defaultOutputMode = OutputMode.valueOf(defaultOutputModeString);
					builder = builder.defaultOutputMode(defaultOutputMode);
				} else {
					builder.defaultOutputMode(OutputMode.COMPOSED);
				}
				if (defaultRecordingLayoutString != null) {
					RecordingLayout defaultRecordingLayout = RecordingLayout.valueOf(defaultRecordingLayoutString);
					builder = builder.defaultRecordingLayout(defaultRecordingLayout);
				} else {
					builder.defaultRecordingLayout(RecordingLayout.BEST_FIT);
				}
				if (defaultCustomLayout != null) {
					builder.defaultCustomLayout(defaultCustomLayout);
				} else {
					builder.defaultCustomLayout("");
				}
				if (mediaModeString != null) {
					MediaMode mediaMode = MediaMode.valueOf(mediaModeString);
					builder = builder.mediaMode(mediaMode);
				} else {
					builder = builder.mediaMode(MediaMode.ROUTED);
				}
				if (customSessionId != null && !customSessionId.isEmpty()) {
					if (!sessionManager.formatChecker.isValidCustomSessionId(customSessionId)) {
						throw new Exception(
								"Parameter 'customSessionId' is wrong. Must be an alphanumeric string [a-zA-Z0-9_-]");
					}
					builder = builder.customSessionId(customSessionId);
				}
				if (forcedVideoCodec != null) {
					builder = builder.forcedVideoCodec(VideoCodec.valueOf(forcedVideoCodec));
				} else {
					builder = builder.forcedVideoCodec(openviduConfig.getOpenviduForcedCodec());
				}
				if (allowTranscoding != null) {
					builder = builder.allowTranscoding(allowTranscoding);
				} else {
					builder = builder.allowTranscoding(openviduConfig.isOpenviduAllowingTranscoding());
				}

			} catch (IllegalArgumentException e) {
				throw new Exception("RecordingMode " + params.get("recordingMode") + " | " + "Default OutputMode "
						+ params.get("defaultOutputMode") + " | " + "Default RecordingLayout "
						+ params.get("defaultRecordingLayout") + " | " + "MediaMode " + params.get("mediaMode")
						+ ". Some parameter is not defined");
			}
		}
		return builder;
	}

	protected ConnectionProperties.Builder getConnectionPropertiesFromParams(Map<?, ?> params) throws Exception {

		ConnectionProperties.Builder builder = new ConnectionProperties.Builder();

		String typeString;
		String data;
		try {
			typeString = (String) params.get("type");
			data = (String) params.get("data");
		} catch (ClassCastException e) {
			throw new Exception("Type error in some parameter: " + e.getMessage());
		}

		ConnectionType type;
		try {
			if (typeString != null) {
				type = ConnectionType.valueOf(typeString);
			} else {
				type = ConnectionType.WEBRTC;
			}
		} catch (IllegalArgumentException e) {
			throw new Exception("Parameter 'type' " + typeString + " is not defined");
		}
		data = data != null ? data : "";

		// Build COMMON options
		builder.type(type).data(data).record(true);

		OpenViduRole role = null;
		KurentoOptions kurentoOptions = null;

		if (ConnectionType.WEBRTC.equals(type)) {
			String roleString;
			try {
				roleString = (String) params.get("role");
			} catch (ClassCastException e) {
				throw new Exception("Type error in parameter 'role': " + e.getMessage());
			}
			try {
				if (roleString != null) {
					role = OpenViduRole.valueOf(roleString);
				} else {
					role = OpenViduRole.PUBLISHER;
				}
			} catch (IllegalArgumentException e) {
				throw new Exception("Parameter role " + params.get("role") + " is not defined");
			}
			JsonObject kurentoOptionsJson = null;
			if (params.get("kurentoOptions") != null) {
				try {
					kurentoOptionsJson = JsonParser.parseString(params.get("kurentoOptions").toString())
							.getAsJsonObject();
				} catch (Exception e) {
					throw new Exception("Error in parameter 'kurentoOptions'. It is not a valid JSON object");
				}
			}
			if (kurentoOptionsJson != null) {
				try {
					KurentoOptions.Builder builder2 = new KurentoOptions.Builder();
					if (kurentoOptionsJson.has("videoMaxRecvBandwidth")) {
						builder2.videoMaxRecvBandwidth(kurentoOptionsJson.get("videoMaxRecvBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("videoMinRecvBandwidth")) {
						builder2.videoMinRecvBandwidth(kurentoOptionsJson.get("videoMinRecvBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("videoMaxSendBandwidth")) {
						builder2.videoMaxSendBandwidth(kurentoOptionsJson.get("videoMaxSendBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("videoMinSendBandwidth")) {
						builder2.videoMinSendBandwidth(kurentoOptionsJson.get("videoMinSendBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("allowedFilters")) {
						JsonArray filters = kurentoOptionsJson.get("allowedFilters").getAsJsonArray();
						String[] arrayOfFilters = new String[filters.size()];
						Iterator<JsonElement> it = filters.iterator();
						int index = 0;
						while (it.hasNext()) {
							arrayOfFilters[index] = it.next().getAsString();
							index++;
						}
						builder2.allowedFilters(arrayOfFilters);
					}
					kurentoOptions = builder2.build();
				} catch (Exception e) {
					throw new Exception("Type error in some parameter of 'kurentoOptions': " + e.getMessage());
				}
			}

			// Build WEBRTC options
			builder.role(role).kurentoOptions(kurentoOptions);

		} else if (ConnectionType.IPCAM.equals(type)) {
			String rtspUri;
			Boolean adaptativeBitrate;
			Boolean onlyPlayWithSubscribers;
			Integer networkCache;
			try {
				rtspUri = (String) params.get("rtspUri");
				adaptativeBitrate = (Boolean) params.get("adaptativeBitrate");
				onlyPlayWithSubscribers = (Boolean) params.get("onlyPlayWithSubscribers");
				networkCache = (Integer) params.get("networkCache");
			} catch (ClassCastException e) {
				throw new Exception("Type error in some parameter: " + e.getMessage());
			}
			adaptativeBitrate = adaptativeBitrate != null ? adaptativeBitrate : true;
			onlyPlayWithSubscribers = onlyPlayWithSubscribers != null ? onlyPlayWithSubscribers : true;
			networkCache = networkCache != null ? networkCache : 2000;

			// Build IPCAM options
			builder.rtspUri(rtspUri).adaptativeBitrate(adaptativeBitrate)
					.onlyPlayWithSubscribers(onlyPlayWithSubscribers).networkCache(networkCache).build();
		}

		return builder;
	}

	protected RecordingProperties.Builder getRecordingPropertiesFromParams(Map<?, ?> params, Session session)
			throws Exception {

		RecordingProperties.Builder builder = new RecordingProperties.Builder();

		String sessionId;
		String name;
		String outputModeString;
		String resolution;
		Boolean hasAudio;
		Boolean hasVideo;
		String recordingLayoutString;
		String customLayout;
		Long shmSize = null;
		try {
			sessionId = (String) params.get("session");
			name = (String) params.get("name");
			outputModeString = (String) params.get("outputMode");
			resolution = (String) params.get("resolution");
			hasAudio = (Boolean) params.get("hasAudio");
			hasVideo = (Boolean) params.get("hasVideo");
			recordingLayoutString = (String) params.get("recordingLayout");
			customLayout = (String) params.get("customLayout");
			if (params.get("shmSize") != null) {
				shmSize = Long.parseLong(params.get("shmSize").toString());
			}
		} catch (ClassCastException | NumberFormatException e) {
			throw new Exception("Type error in some parameter: " + e.getMessage());
		}

		if (sessionId == null) {
			// "session" parameter not found
			throw new Exception("\"session\" parameter is mandatory");
		}

		if (name != null && !name.isEmpty()) {
			if (!sessionManager.formatChecker.isValidRecordingName(name)) {
				throw new Exception("Parameter 'name' is wrong. Must be an alphanumeric string [a-zA-Z0-9_-]");
			}
		}

		OutputMode finalOutputMode = OutputMode.COMPOSED;
		RecordingLayout recordingLayout = null;
		if (outputModeString != null && !outputModeString.isEmpty()) {
			try {
				finalOutputMode = OutputMode.valueOf(outputModeString);
			} catch (Exception e) {
				throw new Exception("Type error in parameter 'outputMode'");
			}
		}
		if (RecordingUtils.IS_COMPOSED(finalOutputMode)) {
			if (resolution != null && !sessionManager.formatChecker.isAcceptableRecordingResolution(resolution)) {
				throw new RuntimeException(
						"Wrong 'resolution' parameter. Acceptable values from 100 to 1999 for both width and height");
			}
			if (recordingLayoutString != null && !recordingLayoutString.isEmpty()) {
				try {
					recordingLayout = RecordingLayout.valueOf(recordingLayoutString);
				} catch (Exception e) {
					throw new Exception("Type error in parameter 'recordingLayout'");
				}
			}
		}
		if ((hasAudio != null && hasVideo != null) && !hasAudio && !hasVideo) {
			// Cannot start a recording with both "hasAudio" and "hasVideo" to false
			throw new RuntimeException("Cannot start a recording with both \"hasAudio\" and \"hasVideo\" set to false");
		}

		// If outputMode is COMPOSED when defaultOutputMode is COMPOSED_QUICK_START,
		// change outputMode to COMPOSED_QUICK_START (and vice versa)
		OutputMode defaultOutputMode = session.getSessionProperties().defaultOutputMode();
		if (OutputMode.COMPOSED_QUICK_START.equals(defaultOutputMode) && OutputMode.COMPOSED.equals(finalOutputMode)) {
			finalOutputMode = OutputMode.COMPOSED_QUICK_START;
		} else if (OutputMode.COMPOSED.equals(defaultOutputMode)
				&& OutputMode.COMPOSED_QUICK_START.equals(finalOutputMode)) {
			finalOutputMode = OutputMode.COMPOSED;
		}

		builder.outputMode(
				finalOutputMode == null ? session.getSessionProperties().defaultOutputMode() : finalOutputMode);
		if (RecordingUtils.IS_COMPOSED(finalOutputMode)) {
			builder.resolution(resolution != null ? resolution : "1920x1080"); // resolution == null ?
																				// sessionProperties.defaultRecordingResolution)
																				// : resolution));
			builder.recordingLayout(recordingLayout == null ? session.getSessionProperties().defaultRecordingLayout()
					: recordingLayout);
			if (RecordingLayout.CUSTOM.equals(recordingLayout)) {
				builder.customLayout(
						customLayout == null ? session.getSessionProperties().defaultCustomLayout() : customLayout);
			}
			if (shmSize != null) {
				if (shmSize < 134217728L) {
					throw new RuntimeException("Wrong \"shmSize\" parameter. Must be 134217728 (128 MB) minimum");
				}
				builder.shmSize(shmSize);
			}
		}
		builder.name(name).hasAudio(hasAudio != null ? hasAudio : true).hasVideo(hasVideo != null ? hasVideo : true);
		return builder;
	}

	protected Token getTokenFromConnectionId(String connectionId, Iterator<Entry<String, Token>> iterator) {
		boolean found = false;
		Token token = null;
		while (iterator.hasNext() && !found) {
			Token tAux = iterator.next().getValue();
			found = tAux.getConnectionId().equals(connectionId);
			if (found) {
				token = tAux;
			}
		}
		return token;
	}

	protected ResponseEntity<String> generateErrorResponse(String errorMessage, String path, HttpStatus status) {
		JsonObject responseJson = new JsonObject();
		responseJson.addProperty("timestamp", System.currentTimeMillis());
		responseJson.addProperty("status", status.value());
		responseJson.addProperty("error", status.getReasonPhrase());
		responseJson.addProperty("message", errorMessage);
		responseJson.addProperty("path", RequestMappings.API + path);
		return new ResponseEntity<>(responseJson.toString(), RestUtils.getResponseHeaders(), status);
	}

}
