package io.openvidu.server.core;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

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
import io.openvidu.server.rpc.RpcNotificationService;

public class SessionEventsHandler {

	@Autowired
	protected RpcNotificationService rpcNotificationService;

	@Autowired
	protected InfoHandler infoHandler;

	@Autowired
	protected CallDetailRecord CDR;
	
	@Autowired
	protected OpenviduConfig openviduConfig;

	public void onSessionClosed(String sessionId, Set<Participant> participants) {
		JsonObject notifParams = new JsonObject();
		notifParams.addProperty(ProtocolElements.ROOMCLOSED_ROOM_PARAM, sessionId);
		for (Participant participant : participants) {
			rpcNotificationService.sendNotification(participant.getParticipantPrivateId(),
					ProtocolElements.ROOMCLOSED_METHOD, notifParams);
		}
	}

	public void onParticipantJoined(Participant participant, Integer transactionId,
			Set<Participant> existingParticipants, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}

		JsonObject result = new JsonObject();
		JsonArray resultArray = new JsonArray();
		for (Participant p : existingParticipants) {
			JsonObject participantJson = new JsonObject();
			participantJson.addProperty(ProtocolElements.JOINROOM_PEERID_PARAM, p.getParticipantPublicId());

			// Metadata associated to each existing participant
			participantJson.addProperty(ProtocolElements.JOINROOM_METADATA_PARAM, p.getFullMetadata());

			if (p.isStreaming()) {

				String streamId = "";
				if ("SCREEN".equals(p.getTypeOfVideo())) {
					streamId = "SCREEN";
				} else if (p.isVideoActive()) {
					streamId = "CAMERA";
				} else if (p.isAudioActive()) {
					streamId = "MICRO";
				}

				JsonObject stream = new JsonObject();
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMID_PARAM,
						p.getParticipantPublicId() + "_" + streamId);
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMAUDIOACTIVE_PARAM, p.isAudioActive());
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMVIDEOACTIVE_PARAM, p.isVideoActive());
				stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMTYPEOFVIDEO_PARAM, p.getTypeOfVideo());

				JsonArray streamsArray = new JsonArray();
				streamsArray.add(stream);
				participantJson.add(ProtocolElements.JOINROOM_PEERSTREAMS_PARAM, streamsArray);
			}
			resultArray.add(participantJson);

			JsonObject notifParams = new JsonObject();

			// Metadata associated to new participant
			notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_USER_PARAM,
					participant.getParticipantPublicId());
			notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM, participant.getFullMetadata());

			rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
					ProtocolElements.PARTICIPANTJOINED_METHOD, notifParams);
		}
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_USER_PARAM, participant.getParticipantPublicId());
		result.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM, participant.getFullMetadata());
		result.add("value", resultArray);

		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);
	}

	public void onParticipantLeft(Participant participant, Integer transactionId,
			Set<Participant> remainingParticipants, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		
		boolean isPublishing = false;
		if (openviduConfig.isCdrEnabled()) {
			isPublishing = CDR.stopPublisher(participant.getParticipantPublicId());
			CDR.stopAllSubscriptions(participant.getParticipantPublicId());
		}

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTLEFT_NAME_PARAM, participant.getParticipantPublicId());
		for (Participant p : remainingParticipants) {
			rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
					ProtocolElements.PARTICIPANTLEFT_METHOD, params);
			
			if (isPublishing && openviduConfig.isCdrEnabled()) {
				CDR.stopSubscriber(p.getParticipantPublicId(), participant.getParticipantPublicId());
			}
		}

		if (transactionId != null) {
			// No response when the participant is forcibly evicted instead of voluntarily
			// leaving the session
			rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
		}
		rpcNotificationService.closeRpcSession(participant.getParticipantPrivateId());

	}

	public void onPublishMedia(Participant participant, String sessionId, Integer transactionId, MediaOptions mediaOptions,
			String sdpAnswer, Set<Participant> participants, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		JsonObject result = new JsonObject();
		result.addProperty(ProtocolElements.PUBLISHVIDEO_SDPANSWER_PARAM, sdpAnswer);
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_USER_PARAM, participant.getParticipantPublicId());
		JsonObject stream = new JsonObject();

		String streamId = "";
		if ("SCREEN".equals(mediaOptions.typeOfVideo)) {
			streamId = "SCREEN";
		} else if (mediaOptions.videoActive) {
			streamId = "CAMERA";
		} else if (mediaOptions.audioActive) {
			streamId = "MICRO";
		}

		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_STREAMID_PARAM,
				participant.getParticipantPublicId() + "_" + streamId);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_AUDIOACTIVE_PARAM, mediaOptions.audioActive);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_VIDEOACTIVE_PARAM, mediaOptions.videoActive);
		stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_TYPEOFVIDEO_PARAM, mediaOptions.typeOfVideo);

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

		if (openviduConfig.isCdrEnabled()) {
			CDR.recordNewPublisher(participant, sessionId, mediaOptions);
		}
	}

	public void onUnpublishMedia(Participant participant, Set<Participant> participants, Integer transactionId,
			OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());
		
		if (openviduConfig.isCdrEnabled()) {
			CDR.stopPublisher(participant.getParticipantPublicId());
		}

		JsonObject params = new JsonObject();
		params.addProperty(ProtocolElements.PARTICIPANTUNPUBLISHED_NAME_PARAM, participant.getParticipantPublicId());

		for (Participant p : participants) {
			if (p.getParticipantPrivateId().equals(participant.getParticipantPrivateId())) {
				continue;
			} else {
				rpcNotificationService.sendNotification(p.getParticipantPrivateId(),
						ProtocolElements.PARTICIPANTUNPUBLISHED_METHOD, params);
				if (openviduConfig.isCdrEnabled()) {
					CDR.stopSubscriber(p.getParticipantPublicId(), participant.getParticipantPublicId());
				}
			}
		}
	}

	public void onSubscribe(Participant participant, String sessionId, String senderName, String sdpAnswer, Integer transactionId,
			OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		JsonObject result = new JsonObject();
		result.addProperty(ProtocolElements.RECEIVEVIDEO_SDPANSWER_PARAM, sdpAnswer);
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, result);

		if (openviduConfig.isCdrEnabled()) {
			CDR.recordNewSubscriber(participant, sessionId, senderName);
		}
	}

	public void onUnsubscribe(Participant participant, String senderName, Integer transactionId, OpenViduException error) {
		if (error != null) {
			rpcNotificationService.sendErrorResponse(participant.getParticipantPrivateId(), transactionId, null, error);
			return;
		}
		rpcNotificationService.sendResponse(participant.getParticipantPrivateId(), transactionId, new JsonObject());

		if (openviduConfig.isCdrEnabled()) {
			CDR.stopSubscriber(participant.getParticipantPublicId(), senderName);
		}
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

	public InfoHandler getInfoHandler() {
		return this.infoHandler;
	}
}
