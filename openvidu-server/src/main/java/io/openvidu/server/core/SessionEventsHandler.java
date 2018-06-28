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

package io.openvidu.server.core;

import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.InfoHandler;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.rpc.RpcNotificationService;

public class SessionEventsHandler {

	private static final Logger log = LoggerFactory.getLogger(SessionEventsHandler.class);

	@Autowired
	protected RpcNotificationService rpcNotificationService;

	@Autowired
	protected InfoHandler infoHandler;

	@Autowired
	protected CallDetailRecord CDR;

	@Autowired
	protected OpenviduConfig openviduConfig;

	Map<String, Recording> recordingsStarted = new ConcurrentHashMap<>();

	ReentrantLock lock = new ReentrantLock();

	public void onSessionCreated(String sessionId) {
		CDR.recordSessionCreated(sessionId);
	}

	public void onSessionClosed(String sessionId, String reason) {
		CDR.recordSessionDestroyed(sessionId, reason);
	}

	public void onParticipantJoined(Participant participant, String sessionId, Set<Participant> existingParticipants,
			Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}

		JsonObject result = new JsonObject();
		JsonArray resultArray = new JsonArray();

		for (Participant existingParticipant : existingParticipants) {
			JsonObject participantJson = new JsonObject();
			participantJson.addProperty(ProtocolElements.JOINROOM_PEERID_PARAM,
					existingParticipant.getParticipantPublicId());

			// Metadata associated to each existing participant
			participantJson.addProperty(ProtocolElements.JOINROOM_METADATA_PARAM,
					existingParticipant.getFullMetadata());

			if (existingParticipant.isStreaming()) {
				
				KurentoParticipant kParticipant = (KurentoParticipant) existingParticipant;
				
				JsonObject stream = new JsonObject();
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMID_PARAM,
						existingParticipant.getPublisherStremId());
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMAUDIOACTIVE_PARAM,
						kParticipant.getPublisherMediaOptions().audioActive);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMVIDEOACTIVE_PARAM,
						kParticipant.getPublisherMediaOptions().videoActive);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMTYPEOFVIDEO_PARAM,
						kParticipant.getPublisherMediaOptions().typeOfVideo);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMFRAMERATE_PARAM,
						kParticipant.getPublisherMediaOptions().frameRate);

				JsonArray streamsArray = new JsonArray();
				streamsArray.add(stream);
				participantJson.add(ProtocolElements.JOINROOM_PEERSTREAMS_PARAM, streamsArray);
			}

			// Avoid emitting 'connectionCreated' event of existing RECORDER participant in
			// openvidu-browser in newly joined participants
			if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(existingParticipant.getParticipantPublicId())) {
				resultArray.add(participantJson);
			}

			// If RECORDER participant has joined do NOT send 'participantJoined'
			// notification to existing participants. 'recordingStarted' will be sent to all
			// existing participants when recorder first subscribe to a stream
			if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(participant.getParticipantPublicId())) {
				JsonObject notifParams = new JsonObject();

				// Metadata associated to new participant
				notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_USER_PARAM,
						participant.getParticipantPublicId());
				notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM,
						participant.getFullMetadata());

				rpcNotificationService.sendNotification(existingParticipant.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTJOINED_METHOD, notifParams);
			}
		}
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_USER_PARAM, participant.getParticipantPublicId());
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM, participant.getFullMetadata());
		result.add("value", resultArray);

		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);
	}

	public void onParticipantLeft(Participant participant, String sessionId, Set<Participant> remainingParticipants,
			Integer transactionId, OpenViduException error, String reason) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}

		if (ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(participant.getParticipantPublicId())) {
			// RECORDER participant
			return;
		}

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTLEFT_NAME_PARAM, participant.getParticipantPublicId());
		params.addProperty(ProtocolElements.PARTICIPANTLEFT_REASON_PARAM, reason);

		for (Participant p : remainingParticipants) {
			rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
					ProtocolElements.PARTICIPANTLEFT_METHOD, params);
		}

		if (transactionId != null) {
			// No response when the participant is forcibly evicted instead of voluntarily
			// leaving the session
			rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
		}
	}

	public void onPublishMedia(Participant participant, String streamId, String sessionId, MediaOptions mediaOptions, String sdpAnswer,
			Set<Participant> participants, Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		JsonObject result = new JsonObject();
		result.addProperty(ProtocolElements.PUBLISHVIDEO_SDPANSWER_PARAM, sdpAnswer);
		result.addProperty(ProtocolElements.PUBLISHVIDEO_STREAMID_PARAM, streamId);
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_USER_PARAM, participant.getParticipantPublicId());
		JsonObject stream = new JsonObject();

		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_STREAMID_PARAM, streamId);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_AUDIOACTIVE_PARAM, mediaOptions.audioActive);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_VIDEOACTIVE_PARAM, mediaOptions.videoActive);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_TYPEOFVIDEO_PARAM, mediaOptions.typeOfVideo);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_FRAMERATE_PARAM, mediaOptions.frameRate);

		JsonArray streamsArray = new JsonArray();
		streamsArray.add(stream);
		params.add(ProtocolElements.PARTICIPANTPUBLISHED_STREAMS_PARAM, streamsArray);

		for (Participant p : participants) {
			if (p.getParticipantPrivateId().equals(participant.getParticipantPrivateId())) {
				continue;
			} else {
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTPUBLISHED_METHOD, params);
			}
		}
	}

	public void onUnpublishMedia(Participant participant, Set<Participant> participants, Integer transactionId,
			OpenViduException error, String reason) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTUNPUBLISHED_NAME_PARAM, participant.getParticipantPublicId());
		params.addProperty(ProtocolElements.PARTICIPANTUNPUBLISHED_REASON_PARAM, reason);

		for (Participant p : participants) {
			if (p.getParticipantPrivateId().equals(participant.getParticipantPrivateId())) {
				continue;
			} else {
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTUNPUBLISHED_METHOD, params);
			}
		}
	}

	public void onSubscribe(Participant participant, Session session, String senderName, String sdpAnswer,
			Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		JsonObject result = new JsonObject();
		result.addProperty(ProtocolElements.RECEIVEVIDEO_SDPANSWER_PARAM, sdpAnswer);
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);

		if (ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(participant.getParticipantPublicId())) {
			lock.lock();
			try {
				Recording recording = this.recordingsStarted.remove(session.getSessionId());
				if (recording != null) {
					// RECORDER participant is now receiving video from the first publisher
					this.sendRecordingStartedNotification(session, recording);
				}
			} finally {
				lock.unlock();
			}
		}
	}

	public void onUnsubscribe(Participant participant, String senderName, Integer transactionId,
			OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
	}

	public void onSendMessage(Participant participant, JsonObject message, Set<Participant> participants,
			Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_DATA_PARAM, message.get("data").getAsString());
		params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_FROM_PARAM, participant.getParticipantPublicId());
		params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_TYPE_PARAM, message.get("type").getAsString());

		Set<String> toSet = new HashSet<String>();

		if (message.has("to")) {
			JsonArray toJson = message.get("to").getAsJsonArray();
			for (int i = 0; i < toJson.size(); i++) {
				JsonElement el = toJson.get(i);
				if (el.isJsonNull()) {
					throw new OpenViduException(Code.SIGNAL_TO_INVALID_ERROR_CODE,
							"Signal \"to\" field invalid format: null");
				}
				toSet.add(el.getAsString());
			}
		}

		if (toSet.isEmpty()) {
			for (Participant p : participants) {
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD, params);
			}
		} else {
			Set<String> participantPublicIds = participants.stream().map(Participant::getParticipantPublicId)
					.collect(Collectors.toSet());
			for (String to : toSet) {
				if (participantPublicIds.contains(to)) {
					Optional<Participant> p = participants.stream().filter(x -> to.equals(x.getParticipantPublicId()))
							.findFirst();
					rpcNotificationService.sendNotification(p.get().getParticipantPrivateId(),
							ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD, params);
				} else {
					throw new OpenViduException(Code.SIGNAL_TO_INVALID_ERROR_CODE,
							"Signal \"to\" field invalid format: Connection [" + to + "] does not exist");
				}
			}
		}

		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
	}

	public void onRecvIceCandidate(Participant participant, Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
	}

	public void onParticipantEvicted(Participant participant) {
		rpcNotificationService.sendNotification(participant.getParticipantPrivateId(),
				ProtocolElements.PARTICIPANTEVICTED_METHOD, new JsonObject());
	}

	public void sendRecordingStartedNotification(Session session, Recording recording) {

		CDR.recordRecordingStarted(session.getSessionId(), recording);

		// Filter participants by roles according to "openvidu.recording.notification"
		Set<Participant> filteredParticipants = this.filterParticipantsByRole(
				this.openviduConfig.getRolesFromRecordingNotification(), session.getParticipants());

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.RECORDINGSTARTED_ID_PARAM, recording.getId());
		params.addProperty(ProtocolElements.RECORDINGSTARTED_NAME_PARAM, recording.getName());

		for (Participant p : filteredParticipants) {
			rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
					ProtocolElements.RECORDINGSTARTED_METHOD, params);
		}
	}

	public void sendRecordingStoppedNotification(Session session, Recording recording) {

		CDR.recordRecordingStopped(session.getSessionId(), recording);

		// Be sure to clean this map (this should return null)
		this.recordingsStarted.remove(session.getSessionId());

		// Filter participants by roles according to "openvidu.recording.notification"
		Set<Participant> existingParticipants;
		try {
			existingParticipants = session.getParticipants();
		} catch (OpenViduException exception) {
			// Session is already closed. This happens when RecordingMode.ALWAYS and last
			// participant has left the session. No notification needs to be sent
			log.warn("Session already closed when trying to send 'recordingStopped' notification");
			return;
		}
		Set<Participant> filteredParticipants = this.filterParticipantsByRole(
				this.openviduConfig.getRolesFromRecordingNotification(), existingParticipants);

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.RECORDINGSTOPPED_ID_PARAM, recording.getId());
		params.addProperty(ProtocolElements.RECORDINGSTARTED_NAME_PARAM, recording.getName());

		for (Participant p : filteredParticipants) {
			rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
					ProtocolElements.RECORDINGSTOPPED_METHOD, params);
		}
	}

	public void closeRpcSession(String participantPrivateId) {
		this.rpcNotificationService.closeRpcSession(participantPrivateId);
	}

	public void setRecordingStarted(String sessionId, Recording recording) {
		this.recordingsStarted.put(sessionId, recording);
	}

	public InfoHandler getInfoHandler() {
		return this.infoHandler;
	}

	private Set<Participant> filterParticipantsByRole(ParticipantRole[] roles, Set<Participant> participants) {
		return participants.stream().filter(part -> {
			boolean isRole = false;
			for (ParticipantRole role : roles) {
				isRole = role.equals(part.getToken().getRole());
				if (isRole)
					break;
			}
			return isRole;
		}).collect(Collectors.toSet());
	}

}
