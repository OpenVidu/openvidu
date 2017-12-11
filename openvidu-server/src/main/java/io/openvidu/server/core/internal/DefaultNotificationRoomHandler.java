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
 */

package io.openvidu.server.core.internal;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.kurento.client.IceCandidate;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.server.InfoHandler;
import io.openvidu.server.core.api.NotificationRoomHandler;
import io.openvidu.server.core.api.UserNotificationService;
import io.openvidu.server.core.api.pojo.ParticipantRequest;
import io.openvidu.server.core.api.pojo.UserParticipant;

/**
 * Default implementation that assumes that JSON-RPC messages specification was used for the
 * client-server communications.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class DefaultNotificationRoomHandler implements NotificationRoomHandler {

  private UserNotificationService notifService;
  
  @Autowired
  private InfoHandler infoHandler;

  public DefaultNotificationRoomHandler(UserNotificationService notifService) {
    this.notifService = notifService;
  }

  @Override
  public void onRoomClosed(String roomName, Set<UserParticipant> participants) {
    JsonObject notifParams = new JsonObject();
    notifParams.addProperty(ProtocolElements.ROOMCLOSED_ROOM_PARAM, roomName);
    for (UserParticipant participant : participants) {
      notifService
          .sendNotification(participant.getParticipantId(), ProtocolElements.ROOMCLOSED_METHOD,
              notifParams);
    }
  }

  @Override
  public void onParticipantJoined(ParticipantRequest request, String roomName, UserParticipant newParticipant,
      Set<UserParticipant> existingParticipants, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }
    
    JsonObject result = new JsonObject();
    JsonArray resultArray = new JsonArray();
    for (UserParticipant participant : existingParticipants) {
      JsonObject participantJson = new JsonObject();
      participantJson
          .addProperty(ProtocolElements.JOINROOM_PEERID_PARAM, participant.getUserName());
      
      // Metadata associated to each existing participant
      participantJson
      	  .addProperty(ProtocolElements.JOINROOM_METADATA_PARAM, participant.getFullMetadata());
      
      if (participant.isStreaming()) {
        JsonObject stream = new JsonObject();
        stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMID_PARAM, "webcam");
        stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMAUDIOACTIVE_PARAM, participant.isAudioActive());
        stream.addProperty(ProtocolElements.JOINROOM_PEERSTREAMVIDEOACTIVE_PARAM, participant.isVideoActive());
        JsonArray streamsArray = new JsonArray();
        streamsArray.add(stream);
        participantJson.add(ProtocolElements.JOINROOM_PEERSTREAMS_PARAM, streamsArray);
      }
      resultArray.add(participantJson);

      JsonObject notifParams = new JsonObject();
      
      // Metadata associated to new participant
      notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_USER_PARAM, newParticipant.getUserName());
      notifParams.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM, newParticipant.getFullMetadata());
      
      notifService.sendNotification(participant.getParticipantId(),
          ProtocolElements.PARTICIPANTJOINED_METHOD, notifParams);
    }
    result.addProperty(ProtocolElements.PARTICIPANTJOINED_USER_PARAM, newParticipant.getUserName());
    result.addProperty(ProtocolElements.PARTICIPANTJOINED_METADATA_PARAM, newParticipant.getFullMetadata());
    result.add("value", resultArray);
    
    notifService.sendResponse(request, result);
  }

  @Override
  public void onParticipantLeft(ParticipantRequest request, String userName,
      Set<UserParticipant> remainingParticipants, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }

    JsonObject params = new JsonObject();
    params.addProperty(ProtocolElements.PARTICIPANTLEFT_NAME_PARAM, userName);
    for (UserParticipant participant : remainingParticipants) {
      notifService
          .sendNotification(participant.getParticipantId(), ProtocolElements.PARTICIPANTLEFT_METHOD,
              params);
    }

    notifService.sendResponse(request, new JsonObject());
    notifService.closeSession(request);
  }

  @Override
  public void onPublishMedia(ParticipantRequest request, String publisherName, String sdpAnswer,
      boolean audioActive, boolean videoActive, Set<UserParticipant> participants, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }
    JsonObject result = new JsonObject();
    result.addProperty(ProtocolElements.PUBLISHVIDEO_SDPANSWER_PARAM, sdpAnswer);
    notifService.sendResponse(request, result);

    JsonObject params = new JsonObject();
    params.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_USER_PARAM, publisherName);
    JsonObject stream = new JsonObject();
    stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_STREAMID_PARAM, "webcam");
    stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_AUDIOACTIVE_PARAM, audioActive);
        stream.addProperty(ProtocolElements.PARTICIPANTPUBLISHED_VIDEOACTIVE_PARAM, videoActive);
    JsonArray streamsArray = new JsonArray();
    streamsArray.add(stream);
    params.add(ProtocolElements.PARTICIPANTPUBLISHED_STREAMS_PARAM, streamsArray);

    for (UserParticipant participant : participants) {
      if (participant.getParticipantId().equals(request.getParticipantId())) {
        continue;
      } else {
        notifService.sendNotification(participant.getParticipantId(),
            ProtocolElements.PARTICIPANTPUBLISHED_METHOD, params);
      }
    }
  }

  @Override
  public void onUnpublishMedia(ParticipantRequest request, String publisherName,
      Set<UserParticipant> participants, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }
    notifService.sendResponse(request, new JsonObject());

    JsonObject params = new JsonObject();
    params.addProperty(ProtocolElements.PARTICIPANTUNPUBLISHED_NAME_PARAM, publisherName);

    for (UserParticipant participant : participants) {
      if (participant.getParticipantId().equals(request.getParticipantId())) {
        continue;
      } else {
        notifService.sendNotification(participant.getParticipantId(),
            ProtocolElements.PARTICIPANTUNPUBLISHED_METHOD, params);
      }
    }
  }

  @Override
  public void onSubscribe(ParticipantRequest request, String sdpAnswer, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }
    JsonObject result = new JsonObject();
    result.addProperty(ProtocolElements.RECEIVEVIDEO_SDPANSWER_PARAM, sdpAnswer);
    notifService.sendResponse(request, result);
  }

  @Override
  public void onUnsubscribe(ParticipantRequest request, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }
    notifService.sendResponse(request, new JsonObject());
  }

  @Override
  public void onSendMessage(ParticipantRequest request, JsonObject message, String userName,
      String roomName, Set<UserParticipant> participants, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }

    JsonObject params = new JsonObject();
    params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_DATA_PARAM, message.get("data").getAsString());
    params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_FROM_PARAM, userName);
    params.addProperty(ProtocolElements.PARTICIPANTSENDMESSAGE_TYPE_PARAM, message.get("type").getAsString());
    
    Set<String> toSet = new HashSet<String>();
    
    if (message.has("to")) {
	    JsonArray toJson = message.get("to").getAsJsonArray();
	    for (int i=0; i < toJson.size(); i++) {
	    	JsonElement el = toJson.get(i);
	    	if (el.isJsonNull()) {
	    		throw new OpenViduException(Code.SIGNAL_TO_INVALID_ERROR_CODE, "Signal \"to\" field invalid format: null");
	    	}
	        toSet.add(el.getAsString());
	    }
    }
    
    if (toSet.isEmpty()) {
    	for (UserParticipant participant : participants) {
    		notifService.sendNotification(participant.getParticipantId(),
    	          ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD, params);
        }
    } else {
    	Set<String> participantNames = participants.stream()
    			.map(UserParticipant::getUserName)
    			.collect(Collectors.toSet());
    	for (String to : toSet) {
    		if (participantNames.contains(to)) {
				Optional<UserParticipant> p = participants.stream()
	                    .filter(x -> to.equals(x.getUserName()))
	                    .findFirst();
      	      notifService.sendNotification(p.get().getParticipantId(),
      	          ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD, params);
          	} else {
          		throw new OpenViduException(Code.SIGNAL_TO_INVALID_ERROR_CODE, "Signal \"to\" field invalid format: Connection [" + to + "] does not exist");
          	}
    	}
    }
    
    notifService.sendResponse(request, new JsonObject());
  }

  @Override
  public void onRecvIceCandidate(ParticipantRequest request, OpenViduException error) {
    if (error != null) {
      notifService.sendErrorResponse(request, null, error);
      return;
    }

    notifService.sendResponse(request, new JsonObject());
  }

  @Override
  public void onParticipantLeft(String userName, Set<UserParticipant> remainingParticipants) {
    JsonObject params = new JsonObject();
    params.addProperty(ProtocolElements.PARTICIPANTLEFT_NAME_PARAM, userName);
    for (UserParticipant participant : remainingParticipants) {
      notifService
          .sendNotification(participant.getParticipantId(), ProtocolElements.PARTICIPANTLEFT_METHOD,
              params);
    }
  }

  @Override
  public void onParticipantEvicted(UserParticipant participant) {
    notifService.sendNotification(participant.getParticipantId(),
        ProtocolElements.PARTICIPANTEVICTED_METHOD, new JsonObject());
  }

  // ------------ EVENTS FROM ROOM HANDLER -----

  @Override
  public void onIceCandidate(String roomName, String participantId, String endpointName,
      IceCandidate candidate) {
    JsonObject params = new JsonObject();
    params.addProperty(ProtocolElements.ICECANDIDATE_EPNAME_PARAM, endpointName);
    params.addProperty(ProtocolElements.ICECANDIDATE_SDPMLINEINDEX_PARAM,
        candidate.getSdpMLineIndex());
    params.addProperty(ProtocolElements.ICECANDIDATE_SDPMID_PARAM, candidate.getSdpMid());
    params.addProperty(ProtocolElements.ICECANDIDATE_CANDIDATE_PARAM, candidate.getCandidate());
    notifService.sendNotification(participantId, ProtocolElements.ICECANDIDATE_METHOD, params);
  }

  @Override
  public void onPipelineError(String roomName, Set<String> participantIds, String description) {
    JsonObject notifParams = new JsonObject();
    notifParams.addProperty(ProtocolElements.MEDIAERROR_ERROR_PARAM, description);
    for (String pid : participantIds) {
      notifService.sendNotification(pid, ProtocolElements.MEDIAERROR_METHOD, notifParams);
    }
  }

  @Override
  public void onMediaElementError(String roomName, String participantId, String description) {
    JsonObject notifParams = new JsonObject();
    notifParams.addProperty(ProtocolElements.MEDIAERROR_ERROR_PARAM, description);
    notifService.sendNotification(participantId, ProtocolElements.MEDIAERROR_METHOD, notifParams);
  }

  @Override
  public void updateFilter(String roomName, Participant participant, String filterId,
      String state) {
  }

  @Override
  public String getNextFilterState(String filterId, String state) {
    return null;
  }
  
  @Override
  public InfoHandler getInfoHandler(){
	  return this.infoHandler;
  }
}
