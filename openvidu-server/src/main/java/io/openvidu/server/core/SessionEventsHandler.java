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

package io.openvidu.server.core;

import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.kurento.client.GenericMediaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduBuildInfo;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.kurento.endpoint.KurentoFilter;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.rpc.RpcNotificationService;

public class SessionEventsHandler {

	private static final Logger log = LoggerFactory.getLogger(SessionEventsHandler.class);

	@Autowired
	protected RpcNotificationService rpcNotificationService;

	@Autowired
	protected CallDetailRecord CDR;

	@Autowired
	protected OpenviduConfig openviduConfig;

	@Autowired
	protected OpenviduBuildInfo openviduBuildConfig;

	protected Map<String, Recording> recordingsToSendClientEvents = new ConcurrentHashMap<>();

	public void onSessionCreated(Session session) {
		CDR.recordSessionCreated(session);
	}

	public void onSessionClosed(String sessionId, EndReason reason) {
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
			participantJson.addProperty(ProtocolElements.JOINROOM_PEERCREATEDAT_PARAM,
					existingParticipant.getActiveAt());

			// Metadata associated to each existing participant
			participantJson.addProperty(ProtocolElements.JOINROOM_METADATA_PARAM,
					existingParticipant.getFullMetadata());

			if (existingParticipant.isStreaming()) {

				KurentoParticipant kParticipant = (KurentoParticipant) existingParticipant;

				JsonObject stream = new JsonObject();
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMID_PARAM,
						existingParticipant.getPublisherStreamId());
				stream.addProperty(ProtocolElements.JOINROOM_PEERCREATEDAT_PARAM,
						kParticipant.getPublisher().createdAt());
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMHASAUDIO_PARAM,
						kParticipant.getPublisherMediaOptions().hasAudio);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMHASVIDEO_PARAM,
						kParticipant.getPublisherMediaOptions().hasVideo);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMVIDEOACTIVE_PARAM,
						kParticipant.getPublisherMediaOptions().videoActive);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMAUDIOACTIVE_PARAM,
						kParticipant.getPublisherMediaOptions().audioActive);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMVIDEOACTIVE_PARAM,
						kParticipant.getPublisherMediaOptions().videoActive);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMTYPEOFVIDEO_PARAM,
						kParticipant.getPublisherMediaOptions().typeOfVideo);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMFRAMERATE_PARAM,
						kParticipant.getPublisherMediaOptions().frameRate);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMVIDEODIMENSIONS_PARAM,
						kParticipant.getPublisherMediaOptions().videoDimensions);
				JsonElement filter = kParticipant.getPublisherMediaOptions().getFilter() != null
						? kParticipant.getPublisherMediaOptions().getFilter().toJson()
						: new JsonObject();
				stream.add(ProtocolElements.JOINROOM_PEERSTREAMFILTER_PARAM, filter);

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
				notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_CREATEDAT_PARAM, participant.getActiveAt());
				notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM,
						participant.getFullMetadata());

				rpcNotificationService.sendNotification(existingParticipant.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTJOINED_METHOD, notifParams);
			}
		}
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_USER_PARAM, participant.getParticipantPublicId());
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_CREATEDAT_PARAM, participant.getActiveAt());
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM, participant.getFullMetadata());
		result.add(ProtocolElements.PARTICIPANTJOINED_VALUE_PARAM, resultArray);

		result.addProperty(ProtocolElements.PARTICIPANTJOINED_SESSION_PARAM, participant.getSessionId());
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_VERSION_PARAM,
				openviduBuildConfig.getOpenViduServerVersion());
		if (participant.getToken() != null) {
			result.addProperty(ProtocolElements.PARTICIPANTJOINED_RECORD_PARAM, participant.getToken().record());
			if (participant.getToken().getRole() != null) {
				result.addProperty(ProtocolElements.PARTICIPANTJOINED_ROLE_PARAM,
						participant.getToken().getRole().name());
			}
			result.addProperty(ProtocolElements.PARTICIPANTJOINED_COTURNIP_PARAM, openviduConfig.getCoturnIp());
			if (participant.getToken().getTurnCredentials() != null) {
				result.addProperty(ProtocolElements.PARTICIPANTJOINED_TURNUSERNAME_PARAM,
						participant.getToken().getTurnCredentials().getUsername());
				result.addProperty(ProtocolElements.PARTICIPANTJOINED_TURNCREDENTIAL_PARAM,
						participant.getToken().getTurnCredentials().getCredential());
			}
		}

		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);
	}

	public void onParticipantLeft(Participant participant, String sessionId, Set<Participant> remainingParticipants,
			Integer transactionId, OpenViduException error, EndReason reason) {
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
		params.addProperty(ProtocolElements.PARTICIPANTLEFT_REASON_PARAM, reason != null ? reason.name() : "");

		for (Participant p : remainingParticipants) {
			rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
					ProtocolElements.PARTICIPANTLEFT_METHOD, params);
		}

		if (transactionId != null) {
			// No response when the participant is forcibly evicted instead of voluntarily
			// leaving the session
			rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
		}

		if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(participant.getParticipantPublicId())) {
			CDR.recordParticipantLeft(participant, sessionId, reason);
		}
	}

	public void onPublishMedia(Participant participant, String streamId, Long createdAt, String sessionId,
			MediaOptions mediaOptions, String sdpAnswer, Set<Participant> participants, Integer transactionId,
			OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		JsonObject result = new JsonObject();
		result.addProperty(ProtocolElements.PUBLISHVIDEO_SDPANSWER_PARAM, sdpAnswer);
		result.addProperty(ProtocolElements.PUBLISHVIDEO_STREAMID_PARAM, streamId);
		result.addProperty(ProtocolElements.PUBLISHVIDEO_CREATEDAT_PARAM, createdAt);
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_USER_PARAM, participant.getParticipantPublicId());
		JsonObject stream = new JsonObject();

		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_STREAMID_PARAM, streamId);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_CREATEDAT_PARAM, createdAt);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_HASAUDIO_PARAM, mediaOptions.hasAudio);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_HASVIDEO_PARAM, mediaOptions.hasVideo);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_AUDIOACTIVE_PARAM, mediaOptions.audioActive);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_VIDEOACTIVE_PARAM, mediaOptions.videoActive);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_TYPEOFVIDEO_PARAM, mediaOptions.typeOfVideo);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_FRAMERATE_PARAM, mediaOptions.frameRate);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_VIDEODIMENSIONS_PARAM, mediaOptions.videoDimensions);
		JsonElement filter = mediaOptions.getFilter() != null ? mediaOptions.getFilter().toJson() : new JsonObject();
		stream.add(ProtocolElements.JOINROOM_PEERSTREAMFILTER_PARAM, filter);

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

	public void onUnpublishMedia(Participant participant, Set<Participant> participants, Participant moderator,
			Integer transactionId, OpenViduException error, EndReason reason) {
		boolean isRpcFromModerator = transactionId != null && moderator != null;
		boolean isRpcFromOwner = transactionId != null && moderator == null;

		if (isRpcFromModerator) {
			if (error != null) {
				rpcNotificationService.sendErrorResponse(moderator.getParticipantPrivateId(), transactionId, null,
						error);
				return;
			}
			rpcNotificationService.sendResponse(moderator.getParticipantPrivateId(), transactionId, new JsonObject());
		}

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTUNPUBLISHED_NAME_PARAM, participant.getParticipantPublicId());
		params.addProperty(ProtocolElements.PARTICIPANTUNPUBLISHED_REASON_PARAM, reason != null ? reason.name() : "");

		for (Participant p : participants) {
			if (p.getParticipantPrivateId().equals(participant.getParticipantPrivateId())) {
				// Send response to the affected participant
				if (!isRpcFromOwner) {
					rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
							ProtocolElements.PARTICIPANTUNPUBLISHED_METHOD, params);
				} else {
					if (error != null) {
						rpcNotificationService.sendErrorResponse(p.getParticipantPrivateId(), transactionId, null,
								error);
						return;
					}
					rpcNotificationService.sendResponse(p.getParticipantPrivateId(), transactionId, new JsonObject());
				}
			} else {
				if (error == null) {
					// Send response to every other user in the session different than the affected
					// participant
					rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
							ProtocolElements.PARTICIPANTUNPUBLISHED_METHOD, params);
				}
			}
		}
	}

	public void onSubscribe(Participant participant, Session session, String sdpAnswer, Integer transactionId,
			OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		JsonObject result = new JsonObject();
		result.addProperty(ProtocolElements.RECEIVEVIDEO_SDPANSWER_PARAM, sdpAnswer);
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);

		if (ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(participant.getParticipantPublicId())) {
			recordingsToSendClientEvents.computeIfPresent(session.getSessionId(), (key, value) -> {
				sendRecordingStartedNotification(session, value);
				return null;
			});
		}
	}

	public void onUnsubscribe(Participant participant, Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
	}

	public void onSendMessage(Participant participant, JsonObject message, Set<Participant> participants,
			String sessionId, Integer transactionId, OpenViduException error) {

		boolean isRpcCall = transactionId != null;
		if (isRpcCall) {
			if (error != null) {
				rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null,
						error);
				return;
			}
		}

		String from = null;
		String type = null;
		String data = null;

		JsonObject params = new JsonObject();
		if (message.has("data")) {
			data = message.get("data").getAsString();
			params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_DATA_PARAM, data);
		}
		if (message.has("type")) {
			type = message.get("type").getAsString();
			params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_TYPE_PARAM, type);
		}
		if (participant != null) {
			from = participant.getParticipantPublicId();
			params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_FROM_PARAM, from);
		}

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
				toSet.add(p.getParticipantPublicId());
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD, params);
			}
		} else {
			Set<String> participantPublicIds = participants.stream().map(Participant::getParticipantPublicId)
					.collect(Collectors.toSet());
			if (participantPublicIds.containsAll(toSet)) {
				for (String to : toSet) {
					Optional<Participant> p = participants.stream().filter(x -> to.equals(x.getParticipantPublicId()))
							.findFirst();
					rpcNotificationService.sendNotification(p.get().getParticipantPrivateId(),
							ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD, params);
				}
			} else {
				throw new OpenViduException(Code.SIGNAL_TO_INVALID_ERROR_CODE,
						"Signal \"to\" field invalid format: some connectionId does not exist in this session");
			}
		}

		if (isRpcCall) {
			rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
		}

		CDR.recordSignalSent(sessionId, from, toSet.toArray(new String[toSet.size()]), type, data);
	}

	public void onStreamPropertyChanged(Participant participant, Integer transactionId, Set<Participant> participants,
			String streamId, String property, JsonElement newValue, String reason) {

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_CONNECTIONID_PARAM,
				participant.getParticipantPublicId());
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_STREAMID_PARAM, streamId);
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_PROPERTY_PARAM, property);
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_NEWVALUE_PARAM, newValue.toString());
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_REASON_PARAM, reason);

		for (Participant p : participants) {
			if (p.getParticipantPrivateId().equals(participant.getParticipantPrivateId())) {
				rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId,
						new JsonObject());
			} else {
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.STREAMPROPERTYCHANGED_METHOD, params);
			}
		}
	}

	public void onRecvIceCandidate(Participant participant, Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
	}

	public void onForceDisconnect(Participant moderator, Participant evictedParticipant, Set<Participant> participants,
			Integer transactionId, OpenViduException error, EndReason reason) {

		boolean isRpcCall = transactionId != null;
		if (isRpcCall) {
			if (error != null) {
				rpcNotificationService.sendErrorResponse(moderator.getParticipantPrivateId(), transactionId, null,
						error);
				return;
			}
			rpcNotificationService.sendResponse(moderator.getParticipantPrivateId(), transactionId, new JsonObject());
		}

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTEVICTED_CONNECTIONID_PARAM,
				evictedParticipant.getParticipantPublicId());
		params.addProperty(ProtocolElements.PARTICIPANTEVICTED_REASON_PARAM, reason != null ? reason.name() : "");

		if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(evictedParticipant.getParticipantPublicId())) {
			// Do not send a message when evicting RECORDER participant
			rpcNotificationService.sendNotification(evictedParticipant.getParticipantPrivateId(),
					ProtocolElements.PARTICIPANTEVICTED_METHOD, params);
		}
		for (Participant p : participants) {
			if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(evictedParticipant.getParticipantPublicId())) {
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTEVICTED_METHOD, params);
			}
		}
	}

	public void sendRecordingStartedNotification(Session session, Recording recording) {
		if (recording.recordingNotificationSent.compareAndSet(false, true)) {
			// Filter participants by roles according to "OPENVIDU_RECORDING_NOTIFICATION"
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
	}

	public void sendRecordingStoppedNotification(Session session, Recording recording, EndReason reason) {

		// Be sure to clean this map (this should return null)
		recordingsToSendClientEvents.remove(session.getSessionId());

		// Filter participants by roles according to "OPENVIDU_RECORDING_NOTIFICATION"
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
		params.addProperty(ProtocolElements.RECORDINGSTOPPED_REASON_PARAM, reason != null ? reason.name() : "");

		for (Participant p : filteredParticipants) {
			rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
					ProtocolElements.RECORDINGSTOPPED_METHOD, params);
		}
	}

	public void onFilterChanged(Participant participant, Participant moderator, Integer transactionId,
			Set<Participant> participants, String streamId, KurentoFilter filter, OpenViduException error,
			String filterReason) {
		boolean isRpcFromModerator = transactionId != null && moderator != null;

		if (isRpcFromModerator) {
			// A moderator forced the application of the filter
			if (error != null) {
				rpcNotificationService.sendErrorResponse(moderator.getParticipantPrivateId(), transactionId, null,
						error);
				return;
			}
			rpcNotificationService.sendResponse(moderator.getParticipantPrivateId(), transactionId, new JsonObject());
		}

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_CONNECTIONID_PARAM,
				participant.getParticipantPublicId());
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_STREAMID_PARAM, streamId);
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_PROPERTY_PARAM, "filter");
		JsonObject filterJson = new JsonObject();
		if (filter != null) {
			filterJson.addProperty(ProtocolElements.FILTER_TYPE_PARAM, filter.getType());
			filterJson.add(ProtocolElements.FILTER_OPTIONS_PARAM, filter.getOptions());
			if (filter.getLastExecMethod() != null) {
				filterJson.add(ProtocolElements.EXECFILTERMETHOD_LASTEXECMETHOD_PARAM,
						filter.getLastExecMethod().toJson());
			}
		}
		params.add(ProtocolElements.STREAMPROPERTYCHANGED_NEWVALUE_PARAM, filterJson);
		params.addProperty(ProtocolElements.STREAMPROPERTYCHANGED_REASON_PARAM, filterReason);

		for (Participant p : participants) {
			if (p.getParticipantPrivateId().equals(participant.getParticipantPrivateId())) {
				// Affected participant
				if (isRpcFromModerator) {
					// Force by moderator. Send notification to affected participant
					rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
							ProtocolElements.STREAMPROPERTYCHANGED_METHOD, params);
				} else {
					// Send response to participant
					if (error != null) {
						rpcNotificationService.sendErrorResponse(p.getParticipantPrivateId(), transactionId, null,
								error);
						return;
					}
					rpcNotificationService.sendResponse(p.getParticipantPrivateId(), transactionId, new JsonObject());
				}
			} else {
				// Send response to every other user in the session different than the affected
				// participant or the moderator
				if (error == null && (moderator == null
						|| !p.getParticipantPrivateId().equals(moderator.getParticipantPrivateId()))) {
					rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
							ProtocolElements.STREAMPROPERTYCHANGED_METHOD, params);
				}
			}
		}
	}

	public void onFilterEventDispatched(String sessionId, String connectionId, String streamId, String filterType,
			GenericMediaEvent event, Set<Participant> participants, Set<String> subscribedParticipants) {

		CDR.recordFilterEventDispatched(sessionId, connectionId, streamId, filterType, event);

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.FILTEREVENTLISTENER_CONNECTIONID_PARAM, connectionId);
		params.addProperty(ProtocolElements.FILTEREVENTLISTENER_STREAMID_PARAM, streamId);
		params.addProperty(ProtocolElements.FILTEREVENTLISTENER_FILTERTYPE_PARAM, filterType);
		params.addProperty(ProtocolElements.FILTEREVENTLISTENER_EVENTTYPE_PARAM, event.getType());
		params.addProperty(ProtocolElements.FILTEREVENTLISTENER_DATA_PARAM, event.getData().toString());

		for (Participant p : participants) {
			if (subscribedParticipants.contains(p.getParticipantPublicId())) {
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.FILTEREVENTDISPATCHED_METHOD, params);
			}
		}
	}

	public void onVideoData(Participant participant, Integer transactionId, Integer height, Integer width,
			Boolean videoActive, Boolean audioActive) {
		participant.setVideoHeight(height);
		participant.setVideoWidth(width);
		participant.setVideoActive(videoActive);
		participant.setAudioActive(audioActive);
		log.info(
				"Video data of participant {} was initialized. height:{}, width:{}, isVideoActive: {}, isAudioActive: {}",
				participant.getParticipantPublicId(), height, width, videoActive, audioActive);
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
	}

	public void closeRpcSession(String participantPrivateId) {
		this.rpcNotificationService.closeRpcSession(participantPrivateId);
	}

	public void storeRecordingToSendClientEvent(Recording recording) {
		recordingsToSendClientEvents.put(recording.getSessionId(), recording);
	}

	public void onNetworkQualityLevelChanged(Session session, JsonObject params) {
	}

	public void onConnectionPropertyChanged(Participant participant, String property, Object newValue) {
	}

	protected Set<Participant> filterParticipantsByRole(OpenViduRole[] roles, Set<Participant> participants) {
		return participants.stream().filter(part -> {
			if (ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(part.getParticipantPublicId())) {
				return false;
			}
			boolean isRole = false;
			for (OpenViduRole role : roles) {
				isRole = role.equals(part.getToken().getRole());
				if (isRole)
					break;
			}
			return isRole;
		}).collect(Collectors.toSet());
	}

}
