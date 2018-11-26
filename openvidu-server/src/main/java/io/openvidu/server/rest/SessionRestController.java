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

package io.openvidu.server.rest;

import java.util.Collection;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingMode;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.ParticipantRole;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.core.KurentoTokenOptions;
import io.openvidu.server.recording.ComposedRecordingService;
import io.openvidu.server.recording.Recording;

/**
 *
 * @author Pablo Fuente Pérez
 */
@RestController
@CrossOrigin
@RequestMapping("/api")
public class SessionRestController {

	@Autowired
	private SessionManager sessionManager;

	@Autowired
	private ComposedRecordingService recordingService;

	@Autowired
	private OpenviduConfig openviduConfig;

	@RequestMapping(value = "/sessions", method = RequestMethod.POST)
	public ResponseEntity<?> getSessionId(@RequestBody(required = false) Map<?, ?> params) {

		SessionProperties.Builder builder = new SessionProperties.Builder();
		String customSessionId = null;

		if (params != null) {
			String mediaModeString = (String) params.get("mediaMode");
			String recordingModeString = (String) params.get("recordingMode");
			String defaultRecordingLayoutString = (String) params.get("defaultRecordingLayout");
			String defaultCustomLayout = (String) params.get("defaultCustomLayout");

			customSessionId = (String) params.get("customSessionId");

			try {

				// Safe parameter retrieval. Default values if not defined
				if (recordingModeString != null) {
					RecordingMode recordingMode = RecordingMode.valueOf(recordingModeString);
					builder = builder.recordingMode(recordingMode);
				} else {
					builder = builder.recordingMode(RecordingMode.MANUAL);
				}
				if (defaultRecordingLayoutString != null) {
					RecordingLayout defaultRecordingLayout = RecordingLayout.valueOf(defaultRecordingLayoutString);
					builder = builder.defaultRecordingLayout(defaultRecordingLayout);
				} else {
					builder.defaultRecordingLayout(RecordingLayout.BEST_FIT);
				}
				if (mediaModeString != null) {
					MediaMode mediaMode = MediaMode.valueOf(mediaModeString);
					builder = builder.mediaMode(mediaMode);
				} else {
					builder = builder.mediaMode(MediaMode.ROUTED);
				}
				if (customSessionId != null && !customSessionId.isEmpty()) {
					builder = builder.customSessionId(customSessionId);
				}
				builder = builder.defaultCustomLayout((defaultCustomLayout != null) ? defaultCustomLayout : "");

			} catch (IllegalArgumentException e) {
				return this.generateErrorResponse("RecordingMode " + params.get("recordingMode") + " | "
						+ "Default RecordingLayout " + params.get("defaultRecordingLayout") + " | " + "MediaMode "
						+ params.get("mediaMode") + " are not defined", "/api/tokens", HttpStatus.BAD_REQUEST);
			}
		}

		SessionProperties sessionProperties = builder.build();

		String sessionId;
		if (customSessionId != null && !customSessionId.isEmpty()) {
			if (sessionManager.sessionidTokenTokenobj.putIfAbsent(customSessionId, new ConcurrentHashMap<>()) != null) {
				return new ResponseEntity<>(HttpStatus.CONFLICT);
			}
			sessionId = customSessionId;
		} else {
			sessionId = sessionManager.generateRandomChain();
			sessionManager.sessionidTokenTokenobj.putIfAbsent(sessionId, new ConcurrentHashMap<>());
		}

		Long creationTime = System.currentTimeMillis();
		sessionManager.storeSessionId(sessionId, creationTime, sessionProperties);
		JsonObject responseJson = new JsonObject();
		responseJson.addProperty("id", sessionId);
		responseJson.addProperty("createdAt", creationTime);

		return new ResponseEntity<>(responseJson.toString(), getResponseHeaders(), HttpStatus.OK);
	}

	@RequestMapping(value = "/sessions/{sessionId}", method = RequestMethod.GET)
	public ResponseEntity<?> getSession(@PathVariable("sessionId") String sessionId,
			@RequestParam(value = "webRtcStats", defaultValue = "false", required = false) boolean webRtcStats) {
		Session session = this.sessionManager.getSession(sessionId);
		if (session != null) {
			JsonObject response = (webRtcStats == true) ? session.withStatsToJson() : session.toJson();
			response.addProperty("recording", this.recordingService.sessionIsBeingRecorded(sessionId));
			return new ResponseEntity<>(response.toString(), getResponseHeaders(), HttpStatus.OK);
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/sessions", method = RequestMethod.GET)
	public ResponseEntity<?> listSessions(
			@RequestParam(value = "webRtcStats", defaultValue = "false", required = false) boolean webRtcStats) {
		Collection<Session> sessions = this.sessionManager.getSessionObjects();
		JsonObject json = new JsonObject();
		JsonArray jsonArray = new JsonArray();
		sessions.forEach(s -> {
			JsonObject sessionJson = (webRtcStats == true) ? s.withStatsToJson() : s.toJson();
			sessionJson.addProperty("recording", this.recordingService.sessionIsBeingRecorded(s.getSessionId()));
			jsonArray.add(sessionJson);
		});
		json.addProperty("numberOfElements", sessions.size());
		json.add("content", jsonArray);
		return new ResponseEntity<>(json.toString(), getResponseHeaders(), HttpStatus.OK);
	}

	@RequestMapping(value = "/sessions/{sessionId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> closeSession(@PathVariable("sessionId") String sessionId) {
		Session session = this.sessionManager.getSession(sessionId);
		if (session != null) {
			this.sessionManager.closeSession(sessionId, "sessionClosedByServer");
			return new ResponseEntity<>(HttpStatus.NO_CONTENT);
		} else {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/connection/{connectionId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> disconnectParticipant(@PathVariable("sessionId") String sessionId,
			@PathVariable("connectionId") String participantPublicId) {
		Session session = this.sessionManager.getSession(sessionId);
		if (session != null) {
			Participant participant = session.getParticipantByPublicId(participantPublicId);
			if (participant != null) {
				this.sessionManager.evictParticipant(participant, null, null, "forceDisconnectByServer");
				return new ResponseEntity<>(HttpStatus.NO_CONTENT);
			} else {
				return new ResponseEntity<>(HttpStatus.NOT_FOUND);
			}
		} else {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
	}

	@RequestMapping(value = "/sessions/{sessionId}/stream/{streamId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> unpublishStream(@PathVariable("sessionId") String sessionId,
			@PathVariable("streamId") String streamId) {
		Session session = this.sessionManager.getSession(sessionId);
		if (session != null) {
			if (this.sessionManager.unpublishStream(session, streamId, null, null, "forceUnpublishByServer")) {
				return new ResponseEntity<>(HttpStatus.NO_CONTENT);
			} else {
				return new ResponseEntity<>(HttpStatus.NOT_FOUND);
			}
		} else {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
	}

	@RequestMapping(value = "/tokens", method = RequestMethod.POST)
	public ResponseEntity<String> newToken(@RequestBody Map<?, ?> params) {
		try {
			String sessionId = (String) params.get("session");
			String roleString = (String) params.get("role");
			String metadata = (String) params.get("data");

			JsonObject kurentoOptions = null;

			if (params.get("kurentoOptions") != null) {
				kurentoOptions = new JsonParser().parse(params.get("kurentoOptions").toString()).getAsJsonObject();
			}

			ParticipantRole role;
			try {
				if (roleString != null) {
					role = ParticipantRole.valueOf(roleString);
				} else {
					role = ParticipantRole.PUBLISHER;
				}
			} catch (IllegalArgumentException e) {
				return this.generateErrorResponse("Role " + params.get("role") + " is not defined", "/api/tokens",
						HttpStatus.BAD_REQUEST);
			}

			KurentoTokenOptions kurentoTokenOptions = null;
			if (kurentoOptions != null) {
				try {
					kurentoTokenOptions = new KurentoTokenOptions(kurentoOptions);
				} catch (Exception e) {
					return this.generateErrorResponse("Error in some parameter of 'kurentoOptions'", "/api/tokens",
							HttpStatus.BAD_REQUEST);
				}
			}

			metadata = (metadata != null) ? metadata : "";

			String token = sessionManager.newToken(sessionId, role, metadata, kurentoTokenOptions);
			JsonObject responseJson = new JsonObject();
			responseJson.addProperty("id", token);
			responseJson.addProperty("session", sessionId);
			responseJson.addProperty("role", role.toString());
			responseJson.addProperty("data", metadata);
			responseJson.addProperty("token", token);

			if (kurentoOptions != null) {
				JsonObject kurentoOptsResponse = new JsonObject();
				if (kurentoTokenOptions.getVideoMaxRecvBandwidth() != null) {
					kurentoOptsResponse.addProperty("videoMaxRecvBandwidth",
							kurentoTokenOptions.getVideoMaxRecvBandwidth());
				}
				if (kurentoTokenOptions.getVideoMinRecvBandwidth() != null) {
					kurentoOptsResponse.addProperty("videoMinRecvBandwidth",
							kurentoTokenOptions.getVideoMinRecvBandwidth());
				}
				if (kurentoTokenOptions.getVideoMaxSendBandwidth() != null) {
					kurentoOptsResponse.addProperty("videoMaxSendBandwidth",
							kurentoTokenOptions.getVideoMaxSendBandwidth());
				}
				if (kurentoTokenOptions.getVideoMinSendBandwidth() != null) {
					kurentoOptsResponse.addProperty("videoMinSendBandwidth",
							kurentoTokenOptions.getVideoMinSendBandwidth());
				}
				if (kurentoTokenOptions.getAllowedFilters().length > 0) {
					JsonArray filters = new JsonArray();
					for (String filter : kurentoTokenOptions.getAllowedFilters()) {
						filters.add(filter);
					}
					kurentoOptsResponse.add("allowedFilters", filters);
				}
				responseJson.add("kurentoOptions", kurentoOptsResponse);
			}
			return new ResponseEntity<>(responseJson.toString(), getResponseHeaders(), HttpStatus.OK);
		} catch (OpenViduException e) {
			return this.generateErrorResponse(e.getMessage(), "/api/tokens", HttpStatus.BAD_REQUEST);
		}
	}

	@RequestMapping(value = "/recordings/start", method = RequestMethod.POST)
	public ResponseEntity<?> startRecordingSession(@RequestBody Map<?, ?> params) {

		String sessionId = (String) params.get("session");
		String name = (String) params.get("name");
		String recordingLayoutString = (String) params.get("recordingLayout");
		String customLayout = (String) params.get("customLayout");

		if (sessionId == null) {
			// "session" parameter not found
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		if (!this.openviduConfig.isRecordingModuleEnabled()) {
			// OpenVidu Server configuration property "openvidu.recording" is set to false
			return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
		}

		Session session = sessionManager.getSession(sessionId);

		if (session == null) {
			// Session does not exist
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
		if (session.getParticipants().isEmpty()) {
			// Session has no participants
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		if (!(session.getSessionProperties().mediaMode().equals(MediaMode.ROUTED))
				|| this.recordingService.sessionIsBeingRecorded(session.getSessionId())) {
			// Session is not in ROUTED MediMode or it is already being recorded
			return new ResponseEntity<>(HttpStatus.CONFLICT);
		}

		RecordingLayout recordingLayout;
		if (recordingLayoutString == null || recordingLayoutString.isEmpty()) {
			// "recordingLayout" parameter not defined. Use global layout from
			// SessionProperties (it is always configured as it has RecordingLayout.BEST_FIT
			// as default value)
			recordingLayout = session.getSessionProperties().defaultRecordingLayout();
		} else {
			recordingLayout = RecordingLayout.valueOf(recordingLayoutString);
		}

		customLayout = (customLayout == null || customLayout.isEmpty())
				? session.getSessionProperties().defaultCustomLayout()
				: customLayout;

		Recording startedRecording = this.recordingService.startRecording(session, new RecordingProperties.Builder()
				.name(name).recordingLayout(recordingLayout).customLayout(customLayout).build());
		return new ResponseEntity<>(startedRecording.toJson().toString(), getResponseHeaders(), HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/stop/{recordingId}", method = RequestMethod.POST)
	public ResponseEntity<?> stopRecordingSession(@PathVariable("recordingId") String recordingId) {

		if (recordingId == null) {
			// "recordingId" parameter not found
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		Recording recording = recordingService.getStartedRecording(recordingId);

		if (recording == null) {
			if (recordingService.getStartingRecording(recordingId) != null) {
				// Recording is still starting
				return new ResponseEntity<>(HttpStatus.NOT_ACCEPTABLE);
			}
			// Recording does not exist
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
		if (!this.recordingService.sessionIsBeingRecorded(recording.getSessionId())) {
			// Session is not being recorded
			return new ResponseEntity<>(HttpStatus.CONFLICT);
		}

		Session session = sessionManager.getSession(recording.getSessionId());

		Recording stoppedRecording = this.recordingService.stopRecording(session, recording.getId(),
				"recordingStoppedByServer");

		if (session != null) {
			sessionManager.evictParticipant(
					session.getParticipantByPublicId(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID), null, null,
					"EVICT_RECORDER");
		}

		return new ResponseEntity<>(stoppedRecording.toJson().toString(), getResponseHeaders(), HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/{recordingId}", method = RequestMethod.GET)
	public ResponseEntity<?> getRecording(@PathVariable("recordingId") String recordingId) {
		try {
			Recording recording = this.recordingService.getAllRecordings().stream()
					.filter(rec -> rec.getId().equals(recordingId)).findFirst().get();
			if (Recording.Status.started.equals(recording.getStatus())
					&& recordingService.getStartingRecording(recording.getId()) != null) {
				recording.setStatus(Recording.Status.starting);
			}
			return new ResponseEntity<>(recording.toJson().toString(), getResponseHeaders(), HttpStatus.OK);
		} catch (NoSuchElementException e) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@RequestMapping(value = "/recordings", method = RequestMethod.GET)
	public ResponseEntity<?> getAllRecordings() {
		Collection<Recording> recordings = this.recordingService.getAllRecordings();
		JsonObject json = new JsonObject();
		JsonArray jsonArray = new JsonArray();
		recordings.forEach(rec -> {
			if (Recording.Status.started.equals(rec.getStatus())
					&& recordingService.getStartingRecording(rec.getId()) != null) {
				rec.setStatus(Recording.Status.starting);
			}
			jsonArray.add(rec.toJson());
		});
		json.addProperty("count", recordings.size());
		json.add("items", jsonArray);
		return new ResponseEntity<>(json.toString(), getResponseHeaders(), HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/{recordingId}", method = RequestMethod.DELETE)
	public ResponseEntity<?> deleteRecording(@PathVariable("recordingId") String recordingId) {
		return new ResponseEntity<>(this.recordingService.deleteRecordingFromHost(recordingId, false));
	}

	private ResponseEntity<String> generateErrorResponse(String errorMessage, String path, HttpStatus status) {
		JsonObject responseJson = new JsonObject();
		responseJson.addProperty("timestamp", System.currentTimeMillis());
		responseJson.addProperty("status", status.value());
		responseJson.addProperty("error", status.getReasonPhrase());
		responseJson.addProperty("message", errorMessage);
		responseJson.addProperty("path", path);
		return new ResponseEntity<>(responseJson.toString(), getResponseHeaders(), status);
	}

	private HttpHeaders getResponseHeaders() {
		HttpHeaders responseHeaders = new HttpHeaders();
		responseHeaders.setContentType(MediaType.APPLICATION_JSON);
		return responseHeaders;
	}
}
