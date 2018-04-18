/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
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
import java.util.Set;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingMode;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.core.ParticipantRole;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.ComposedRecordingService;

/**
 *
 * @author Pablo Fuente Pérez
 */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class SessionRestController {

	@Autowired
	private SessionManager sessionManager;

	@Autowired
	private ComposedRecordingService recordingService;

	@RequestMapping(value = "/sessions", method = RequestMethod.GET)
	public Set<String> getAllSessions() {
		return sessionManager.getSessions();
	}

	@SuppressWarnings("unchecked")
	@RequestMapping(value = "/sessions", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> getSessionId(@RequestBody(required = false) Map<?, ?> params) {

		SessionProperties.Builder builder = new SessionProperties.Builder();
		if (params != null) {
			String recordingModeString = (String) params.get("recordingMode");
			String recordingLayoutString = (String) params.get("recordingLayout");
			String mediaModeString = (String) params.get("mediaMode");

			try {
				if (recordingModeString != null) {
					RecordingMode recordingMode = RecordingMode.valueOf(recordingModeString);
					builder = builder.recordingMode(recordingMode);
				}
				if (recordingLayoutString != null) {
					RecordingLayout recordingLayout = RecordingLayout.valueOf(recordingLayoutString);
					builder = builder.recordingLayout(recordingLayout);
				}
				if (mediaModeString != null) {
					MediaMode mediaMode = MediaMode.valueOf(mediaModeString);
					builder = builder.mediaMode(mediaMode);
				}
			} catch (IllegalArgumentException e) {
				return this.generateErrorResponse("RecordingMode " + params.get("recordingMode") + " | " + "RecordingLayout "
						+ params.get("recordingLayout") + " | " + "MediaMode " + params.get("mediaMode")
						+ " are not defined", "/api/tokens", HttpStatus.BAD_REQUEST);
			}
		}

		SessionProperties sessionProperties = builder.build();

		String sessionId = sessionManager.newSessionId(sessionProperties);
		JSONObject responseJson = new JSONObject();
		responseJson.put("id", sessionId);
		return new ResponseEntity<>(responseJson, HttpStatus.OK);
	}

	@SuppressWarnings("unchecked")
	@RequestMapping(value = "/tokens", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> newToken(@RequestBody Map<?, ?> params) {
		try {

			String sessionId = (String) params.get("session");
			ParticipantRole role = ParticipantRole.valueOf((String) params.get("role"));
			String metadata = (String) params.get("data");

			String token = sessionManager.newToken(sessionId, role, metadata);
			JSONObject responseJson = new JSONObject();
			responseJson.put("id", token);
			responseJson.put("session", sessionId);
			responseJson.put("role", role.toString());
			responseJson.put("data", metadata);
			responseJson.put("token", token);
			return new ResponseEntity<>(responseJson, HttpStatus.OK);

		} catch (IllegalArgumentException e) {
			return this.generateErrorResponse("Role " + params.get("role") + " is not defined", "/api/tokens",
					HttpStatus.BAD_REQUEST);
		} catch (OpenViduException e) {
			return this.generateErrorResponse(
					"Metadata [" + params.get("data") + "] unexpected format. Max length allowed is 10000 chars",
					"/api/tokens", HttpStatus.BAD_REQUEST);
		}
	}

	@RequestMapping(value = "/recordings/start", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> startRecordingSession(@RequestBody Map<?, ?> params) {

		String sessionId = (String) params.get("session");

		if (sessionId == null) {
			// "session" parameter not found
			return new ResponseEntity<JSONObject>(HttpStatus.BAD_REQUEST);
		}

		Session session = sessionManager.getSession(sessionId);

		if (session == null) {
			// Session does not exist
			return new ResponseEntity<JSONObject>(HttpStatus.NOT_FOUND);
		}
		if (session.getParticipants().isEmpty()) {
			// Session has no participants
			return new ResponseEntity<JSONObject>(HttpStatus.BAD_REQUEST);
		}
		if (!(session.getSessionProperties().mediaMode().equals(MediaMode.ROUTED))
				|| this.recordingService.sessionIsBeingRecorded(session.getSessionId())) {
			// Session is not in ROUTED MediMode or it is already being recorded
			return new ResponseEntity<JSONObject>(HttpStatus.CONFLICT);
		}

		Recording startedRecording = this.recordingService.startRecording(session);
		return new ResponseEntity<>(startedRecording.toJson(), HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/stop/{recordingId}", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> stopRecordingSession(@PathVariable("recordingId") String recordingId) {

		if (recordingId == null) {
			// "recordingId" parameter not found
			return new ResponseEntity<JSONObject>(HttpStatus.BAD_REQUEST);
		}

		Recording recording = recordingService.getStartedRecording(recordingId);

		if (recording == null) {
			if (recordingService.getStartingRecording(recordingId) != null) {
				// Recording is still starting
				return new ResponseEntity<JSONObject>(HttpStatus.NOT_ACCEPTABLE);
			}
			// Recording does not exist
			return new ResponseEntity<JSONObject>(HttpStatus.NOT_FOUND);
		}
		if (!this.recordingService.sessionIsBeingRecorded(recording.getSessionId())) {
			// Session is not being recorded
			return new ResponseEntity<JSONObject>(HttpStatus.CONFLICT);
		}
		
		Session session = sessionManager.getSession(recording.getSessionId());
		
		Recording stoppedRecording = this.recordingService
				.stopRecording(session);
		
		sessionManager.evictParticipant(session.getParticipantByPublicId(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID).getParticipantPrivateId(), "EVICT_RECORDER");
		
		return new ResponseEntity<>(stoppedRecording.toJson(), HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/{recordingId}", method = RequestMethod.GET)
	public ResponseEntity<JSONObject> getRecording(@PathVariable("recordingId") String recordingId) {
		try {
			Recording recording = this.recordingService.getAllRecordings().stream()
					.filter(rec -> rec.getId().equals(recordingId)).findFirst().get();
			if (Recording.Status.started.equals(recording.getStatus())
					&& recordingService.getStartingRecording(recording.getId()) != null) {
				recording.setStatus(Recording.Status.starting);
			}
			return new ResponseEntity<>(recording.toJson(), HttpStatus.OK);
		} catch (NoSuchElementException e) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}
	}

	@SuppressWarnings("unchecked")
	@RequestMapping(value = "/recordings", method = RequestMethod.GET)
	public ResponseEntity<JSONObject> getAllRecordings() {
		Collection<Recording> recordings = this.recordingService.getAllRecordings();
		JSONObject json = new JSONObject();
		JSONArray jsonArray = new JSONArray();
		recordings.forEach(rec -> {
			if (Recording.Status.started.equals(rec.getStatus())
					&& recordingService.getStartingRecording(rec.getId()) != null) {
				rec.setStatus(Recording.Status.starting);
			}
			jsonArray.add(rec.toJson());
		});
		json.put("count", recordings.size());
		json.put("items", jsonArray);
		return new ResponseEntity<>(json, HttpStatus.OK);
	}

	@RequestMapping(value = "/recordings/{recordingId}", method = RequestMethod.DELETE)
	public ResponseEntity<JSONObject> deleteRecording(@PathVariable("recordingId") String recordingId) {
		return new ResponseEntity<>(this.recordingService.deleteRecordingFromHost(recordingId));
	}

	@SuppressWarnings("unchecked")
	private ResponseEntity<JSONObject> generateErrorResponse(String errorMessage, String path, HttpStatus status) {
		JSONObject responseJson = new JSONObject();
		responseJson.put("timestamp", System.currentTimeMillis());
		responseJson.put("status", status.value());
		responseJson.put("error", status.getReasonPhrase());
		responseJson.put("message", errorMessage);
		responseJson.put("path", path);
		return new ResponseEntity<JSONObject>(responseJson, status);
	}
}
