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

package io.openvidu.server.rest;

import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
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
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.IceServerProperties;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.Recording.OutputMode;
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
	public ResponseEntity<?> initializeSession(@RequestBody(required = false) Map<String, ?> params) {

		log.info("REST API: POST {}/sessions {}", RequestMappings.API, params != null ? params.toString() : "{}");

		SessionProperties sessionProperties;
		try {
			sessionProperties = getSessionPropertiesFromParams(params).build();
		} catch (Exception e) {
			return SessionRestController.generateErrorResponse(e.getMessage(), "/sessions", HttpStatus.BAD_REQUEST);
		}

		String sessionId;
		Lock sessionLock = null;

		try {
			if (sessionProperties.customSessionId() != null && !sessionProperties.customSessionId().isEmpty()) {
				// Session has custom session id
				sessionId = sessionProperties.customSessionId();
				Session session = sessionManager.getSessionWithNotActive(sessionProperties.customSessionId());
				if (session != null) {
					// The session appears to already exist
					if (session.closingLock.readLock().tryLock()) {
						// The session indeed exists and is not being closed
						try {
							log.warn("Session {} is already created", sessionProperties.customSessionId());
							return new ResponseEntity<>(HttpStatus.CONFLICT);
						} finally {
							session.closingLock.readLock().unlock();
						}
					} else {
						// The session exists but is being closed
						log.warn("Session {} is in the process of closing while calling POST {}/sessions", sessionId,
								RequestMappings.API);
						try {
							if (session.closingLock.writeLock().tryLock(15, TimeUnit.SECONDS)) {
								if (sessionManager
										.getSessionWithNotActive(sessionProperties.customSessionId()) != null) {
									// Other thread took the lock before and rebuilt the closing session
									session.closingLock.writeLock().unlock();
									return new ResponseEntity<>(HttpStatus.CONFLICT);
								} else {
									// This thread will rebuild the closing session
									sessionLock = session.closingLock.writeLock();
								}
							} else {
								log.error("Timeout waiting for Session {} closing lock to be available", sessionId);
							}
						} catch (InterruptedException e) {
							log.error("InterruptedException while waiting for Session {} closing lock to be available",
									sessionId);
						}

					}
				}
			} else {
				sessionId = IdentifierPrefixes.SESSION_ID + RandomStringUtils.randomAlphabetic(1).toUpperCase()
						+ RandomStringUtils.randomAlphanumeric(9);
			}

			Session sessionNotActive = sessionManager.storeSessionNotActive(sessionId, sessionProperties);
			if (sessionNotActive == null) {
				return new ResponseEntity<>(HttpStatus.CONFLICT);
			} else {
				log.info("New session {} created {}", sessionId, this.sessionManager.getSessionsWithNotActive().stream()
						.map(Session::getSessionId).collect(Collectors.toList()).toString());
				return new ResponseEntity<>(sessionNotActive.toJson(false, false).toString(),
						RestUtils.getResponseHeaders(), HttpStatus.OK);
			}
		} finally {
			if (sessionLock != null) {
				sessionLock.unlock();
			}
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}", method = RequestMethod.GET)
	public ResponseEntity<?> getSession(@PathVariable("sessionId") String sessionId,
			@RequestParam(value = "pendingConnections", defaultValue = "false", required = false) boolean pendingConnections,
			@RequestParam(value = "webRtcStats", defaultValue = "false", required = false) boolean webRtcStats) {

		log.info("REST API: GET {}/sessions/{}", RequestMappings.API, sessionId);

		Session session = this.sessionManager.getSession(sessionId);
		if (session != null) {
			try {
				JsonObject response = session.toJson(pendingConnections, webRtcStats);
				return new ResponseEntity<>(response.toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
			} catch (OpenViduException e) {
				if (e.getCodeValue() == Code.ROOM_CLOSED_ERROR_CODE.getValue()) {
					log.warn("Session closed while calling GET {}/sessions/{}", RequestMappings.API, sessionId);
					return new ResponseEntity<>(HttpStatus.NOT_FOUND);
				} else {
					throw e;
				}
			}
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
			try {
				JsonObject sessionJson = session.toJson(pendingConnections, webRtcStats);
				jsonArray.add(sessionJson);
			} catch (OpenViduException e) {
				if (e.getCodeValue() != Code.ROOM_CLOSED_ERROR_CODE.getValue()) {
					throw e;
				}
			}
		});
		json.addProperty("numberOfElements", jsonArray.size());
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
					return SessionRestController.generateErrorResponse(errorMsg, "/sessions", HttpStatus.BAD_REQUEST);
				}
			} catch (InterruptedException e) {
				String errorMsg = "InterruptedException while waiting for Session " + sessionId
						+ " closing lock to be available for closing from DELETE " + RequestMappings.API + "/sessions";
				log.error(errorMsg);
				return SessionRestController.generateErrorResponse(errorMsg, "/sessions", HttpStatus.BAD_REQUEST);
			}
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/connection", method = RequestMethod.POST)
	public ResponseEntity<?> initializeConnection(@PathVariable("sessionId") String sessionId,
			@RequestBody(required = false) Map<String, ?> params) {

		log.info("REST API: POST {} {}", RequestMappings.API + "/sessions/" + sessionId + "/connection",
				params != null ? params.toString() : "{}");

		Session session = this.sessionManager.getSessionWithNotActive(sessionId);
		if (session == null) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}

		ConnectionProperties connectionProperties;
		try {
			connectionProperties = getConnectionPropertiesFromParams(params).build();
		} catch (Exception e) {
			return SessionRestController.generateErrorResponse(e.getMessage(), "/sessions/" + sessionId + "/connection",
					HttpStatus.BAD_REQUEST);
		}
		switch (connectionProperties.getType()) {
		case WEBRTC:
			return this.newWebrtcConnection(session, connectionProperties);
		case IPCAM:
			return this.newIpcamConnection(session, connectionProperties);
		default:
			return SessionRestController.generateErrorResponse("Wrong type parameter", "/sessions/" + sessionId + "/connection",
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
	public ResponseEntity<?> startRecording(@RequestBody Map<String, ?> params) {

		if (params == null) {
			return SessionRestController.generateErrorResponse("Error in body parameters. Cannot be empty", "/recordings/start",
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
			return SessionRestController.generateErrorResponse("Type error in parameter \"session\"", "/recordings/start",
					HttpStatus.BAD_REQUEST);
		}

		if (sessionId == null) {
			// "session" parameter not found
			return SessionRestController.generateErrorResponse("\"session\" parameter is mandatory", "/recordings/start",
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
		} catch (IllegalStateException e) {
			return SessionRestController.generateErrorResponse(e.getMessage(), "/sessions", HttpStatus.UNPROCESSABLE_ENTITY);
		} catch (RuntimeException e) {
			return SessionRestController.generateErrorResponse(e.getMessage(), "/sessions", HttpStatus.BAD_REQUEST);
		}

		try {
			Recording startedRecording = this.recordingManager.startRecording(session, recordingProperties);
			return new ResponseEntity<>(startedRecording.toJson(false).toString(), RestUtils.getResponseHeaders(),
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

		return new ResponseEntity<>(stoppedRecording.toJson(false).toString(), RestUtils.getResponseHeaders(),
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
			return new ResponseEntity<>(recording.toJson(false).toString(), RestUtils.getResponseHeaders(),
					HttpStatus.OK);
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
			jsonArray.add(rec.toJson(false));
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
	public ResponseEntity<String> newToken(@RequestBody Map<String, ?> params) {

		if (params == null) {
			return SessionRestController.generateErrorResponse("Error in body parameters. Cannot be empty", "/tokens",
					HttpStatus.BAD_REQUEST);
		}

		log.info("REST API: POST {}/tokens {}", RequestMappings.API, params.toString());

		String sessionId;
		try {
			sessionId = (String) params.get("session");
		} catch (ClassCastException e) {
			return SessionRestController.generateErrorResponse("Type error in some parameter", "/tokens", HttpStatus.BAD_REQUEST);
		}

		if (sessionId == null) {
			return SessionRestController.generateErrorResponse("\"session\" parameter is mandatory", "/tokens", HttpStatus.BAD_REQUEST);
		}

		log.warn("Token API is deprecated. Use Connection API instead (POST {}/sessions/{}/connection)",
				RequestMappings.API, sessionId);

		final Session session = this.sessionManager.getSessionWithNotActive(sessionId);
		if (session == null) {
			return SessionRestController.generateErrorResponse("Session " + sessionId + " not found", "/tokens", HttpStatus.NOT_FOUND);
		}

		ConnectionProperties connectionProperties;
		params.remove("record");
		try {
			connectionProperties = getConnectionPropertiesFromParams(params).build();
		} catch (Exception e) {
			return SessionRestController.generateErrorResponse(e.getMessage(), "/sessions/" + sessionId + "/connection",
					HttpStatus.BAD_REQUEST);
		}
		ResponseEntity<?> entity = this.newWebrtcConnection(session, connectionProperties);
		JsonObject jsonResponse = JsonParser.parseString(entity.getBody().toString()).getAsJsonObject();

		if (jsonResponse.has("error")) {
			return SessionRestController.generateErrorResponse(jsonResponse.get("message").getAsString(), "/tokens",
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
	public ResponseEntity<?> signal(@RequestBody Map<String, ?> params) {

		if (params == null) {
			return SessionRestController.generateErrorResponse("Error in body parameters. Cannot be empty", "/signal",
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
			return SessionRestController.generateErrorResponse("Type error in some parameter", "/signal", HttpStatus.BAD_REQUEST);
		}

		JsonObject completeMessage = new JsonObject();

		if (sessionId == null) {
			// "session" parameter not found
			return SessionRestController.generateErrorResponse("\"session\" parameter is mandatory", "/signal", HttpStatus.BAD_REQUEST);
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
				return SessionRestController.generateErrorResponse("\"to\" parameter is not a valid JSON array", "/signal",
						HttpStatus.BAD_REQUEST);
			}
		}

		try {
			sessionManager.sendMessage(completeMessage.toString(), session);
		} catch (OpenViduException e) {
			return SessionRestController.generateErrorResponse("\"to\" array has no valid connection identifiers", "/signal",
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
						connectionProperties.getKurentoOptions(), connectionProperties.getCustomIceServers());

				log.info("Generated token {}", token.getToken());

				return new ResponseEntity<>(token.toJsonAsParticipant().toString(), RestUtils.getResponseHeaders(),
						HttpStatus.OK);
			} catch (Exception e) {
				return SessionRestController.generateErrorResponse(
						"Error creating Connection for session " + session.getSessionId() + ": " + e.getMessage(),
						REQUEST_PATH, HttpStatus.INTERNAL_SERVER_ERROR);
			} finally {
				session.closingLock.readLock().unlock();
			}
		} else {
			log.error("Session {} is in the process of closing. Connection couldn't be created",
					session.getSessionId());
			return SessionRestController.generateErrorResponse("Session " + session.getSessionId() + " not found", REQUEST_PATH,
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
		KurentoMediaOptions mediaOptions = new KurentoMediaOptions(null, hasAudio, hasVideo, audioActive, videoActive,
				typeOfVideo, frameRate, videoDimensions, null, false, connectionProperties.getRtspUri(),
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
				return SessionRestController.generateErrorResponse("\"rtspUri\" parameter is not a valid rtsp uri", REQUEST_PATH,
						HttpStatus.BAD_REQUEST);
			} catch (Exception e) {
				return SessionRestController.generateErrorResponse(e.getMessage(), REQUEST_PATH, HttpStatus.INTERNAL_SERVER_ERROR);
			} finally {
				session.closingLock.readLock().unlock();
			}
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	protected SessionProperties.Builder getSessionPropertiesFromParams(Map<String, ?> params) throws Exception {

		SessionProperties.Builder builder = SessionProperties.fromJson(params);

		if (params != null) {

			String forcedVideoCodecStr;
			Boolean allowTranscoding;
			try {
				forcedVideoCodecStr = (String) params.get("forcedVideoCodec");
				allowTranscoding = (Boolean) params.get("allowTranscoding");
			} catch (ClassCastException e) {
				throw new Exception("Type error in some parameter: " + e.getMessage());
			}

			// Parse obtained values into actual types
			VideoCodec forcedVideoCodec = null;
			try {
				forcedVideoCodec = VideoCodec.valueOf(forcedVideoCodecStr);
			} catch (NullPointerException e) {
				// Not an error: "forcedVideoCodec" was not provided in params
			} catch (IllegalArgumentException e) {
				throw new Exception("Invalid value for parameter 'forcedVideoCodec': " + e.getMessage());
			}

			try {

				if (forcedVideoCodec == null) {
					forcedVideoCodec = openviduConfig.getOpenviduForcedCodec();
				}
				builder = builder.forcedVideoCodec(forcedVideoCodec);
				if (forcedVideoCodec == VideoCodec.MEDIA_SERVER_PREFERRED) {
					switch (openviduConfig.getMediaServer()) {
					case mediasoup:
						builder = builder.forcedVideoCodecResolved(VideoCodec.NONE);
						break;
					case kurento:
					default:
						builder = builder.forcedVideoCodecResolved(VideoCodec.VP8);
						break;
					}
				} else {
					builder = builder.forcedVideoCodecResolved(forcedVideoCodec);
				}

				if (allowTranscoding != null) {
					builder = builder.allowTranscoding(allowTranscoding);
				} else {
					builder = builder.allowTranscoding(openviduConfig.isOpenviduAllowingTranscoding());
				}

			} catch (IllegalArgumentException e) {
				throw new Exception("Some parameter is not valid. " + e.getMessage());
			}
		}
		return builder;
	}

	protected ConnectionProperties.Builder getConnectionPropertiesFromParams(Map<String, ?> params) throws Exception {

		ConnectionProperties.Builder builder = ConnectionProperties.fromJson(params);

		ConnectionType type = ConnectionProperties.fromJson(params).build().getType();

		if (ConnectionType.WEBRTC.equals(type)) {
			if (params != null && params.get("customIceServers") == null
					&& !openviduConfig.getWebrtcIceServersBuilders().isEmpty()) {
				// If not defined in Connection, check if defined in OpenVidu global config
				for (IceServerProperties.Builder iceServerPropertiesBuilder : openviduConfig
						.getWebrtcIceServersBuilders()) {
					IceServerProperties.Builder configIceBuilder = iceServerPropertiesBuilder.clone();
					builder.addCustomIceServer(configIceBuilder.build());
				}
			}
		}

		return builder;
	}

	protected RecordingProperties.Builder getRecordingPropertiesFromParams(Map<String, ?> params, Session session)
			throws RuntimeException {
		RecordingProperties.Builder builder = RecordingProperties.fromJson(params,
				session.getSessionProperties().defaultRecordingProperties());
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

	public static ResponseEntity<String> generateErrorResponse(String errorMessage, String path, HttpStatus status) {
		JsonObject responseJson = new JsonObject();
		responseJson.addProperty("timestamp", System.currentTimeMillis());
		responseJson.addProperty("status", status.value());
		responseJson.addProperty("error", status.getReasonPhrase());
		responseJson.addProperty("message", errorMessage);
		responseJson.addProperty("path", RequestMappings.API + path);
		log.warn("REST API error response to path {} ({}): {}", path, status.value(), errorMessage);
		return new ResponseEntity<>(responseJson.toString(), RestUtils.getResponseHeaders(), status);
	}

}
