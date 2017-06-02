/*
 * (C) Copyright 2015 Kurento (http://kurento.org/)
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

package org.openvidu.server.core;

import javax.annotation.PreDestroy;

import java.util.Set;

import org.kurento.client.MediaElement;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaType;
import org.openvidu.client.OpenViduException;
import org.openvidu.client.OpenViduException.Code;
import org.openvidu.server.core.RoomManager.JoinRoomReturnValue;
import org.openvidu.server.core.api.KurentoClientSessionInfo;
import org.openvidu.server.core.api.MutedMediaType;
import org.openvidu.server.core.api.NotificationRoomHandler;
import org.openvidu.server.core.api.pojo.ParticipantRequest;
import org.openvidu.server.core.api.pojo.UserParticipant;
import org.openvidu.server.core.internal.DefaultKurentoClientSessionInfo;
import org.openvidu.server.security.ParticipantRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * The Kurento room manager represents an SDK for any developer that wants to implement the Room
 * server-side application. They can build their application on top of the manager's Java API and
 * implement their desired business logic without having to consider room or media-specific details.
 * <p/>
 * It will trigger events which when handled, should notify the client side with the execution
 * result of the requested actions (for client-originated requests).
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class NotificationRoomManager {
  private final Logger log = LoggerFactory.getLogger(NotificationRoomManager.class);
  
  @Autowired
  private NotificationRoomHandler notificationRoomHandler;
  
  @Autowired
  private RoomManager internalManager;

  public NotificationRoomManager() {
    super();
  }

  // ----------------- CLIENT-ORIGINATED REQUESTS ------------

  /**
   * Calls
   * {@link RoomManager#joinRoom(String userName, String roomName, boolean dataChannels, * boolean webParticipant, KurentoClientSessionInfo kcSessionInfo, String participantId)}
   * with a {@link DefaultKurentoClientSessionInfo} bean as implementation of the
   * {@link KurentoClientSessionInfo}.
   *
   * @param request instance of {@link ParticipantRequest} POJO containing the participant's id
   *                and a
   *                request id (optional identifier of the request at the communications level,
   *                included
   *                when responding back to the client)
   * @see RoomManager#joinRoom(String, String, boolean, boolean, KurentoClientSessionInfo, String)
   */
  public void joinRoom(String userName, String roomId, boolean dataChannels,
      boolean webParticipant, ParticipantRequest request) {
    Set<UserParticipant> existingParticipants = null;
    UserParticipant newParticipant = null;
    try {
      KurentoClientSessionInfo kcSessionInfo =
          new DefaultKurentoClientSessionInfo(request.getParticipantId(), roomId);
      
      JoinRoomReturnValue returnValue = internalManager
          .joinRoom(userName, roomId, dataChannels, webParticipant, kcSessionInfo,
              request.getParticipantId());
      existingParticipants = returnValue.existingParticipants;
      newParticipant = returnValue.newParticipant;
      
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error joining/creating room {}", userName, roomId, e);
      notificationRoomHandler.onParticipantJoined(request, roomId, null, null, e);
    }
    if (existingParticipants != null) {
      notificationRoomHandler
          .onParticipantJoined(request, roomId, newParticipant, existingParticipants, null);
    }
  }

  /**
   * @param request instance of {@link ParticipantRequest} POJO
   * @see RoomManager#leaveRoom(String)
   */
  public void leaveRoom(ParticipantRequest request) {
    String pid = request.getParticipantId();
    Set<UserParticipant> remainingParticipants = null;
    String roomName = null;
    String userName = null;
    try {
      roomName = internalManager.getRoomName(pid);
      userName = internalManager.getParticipantName(pid);
      remainingParticipants = internalManager.leaveRoom(pid);
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error leaving room {}", userName, roomName, e);
      notificationRoomHandler.onParticipantLeft(request, null, null, e);
    }
    if (remainingParticipants != null) {
      notificationRoomHandler.onParticipantLeft(request, userName, remainingParticipants, null);
    }
  }

  /**
   * @param request instance of {@link ParticipantRequest} POJO
   * @see RoomManager#publishMedia(String, boolean, String, MediaElement, MediaType, boolean, *
   * MediaElement...)
   */
  public void publishMedia(ParticipantRequest request, boolean isOffer, String sdp,
      MediaElement loopbackAlternativeSrc, MediaType loopbackConnectionType, boolean doLoopback,
      MediaElement... mediaElements) {
    String pid = request.getParticipantId();
    String userName = null;
    Set<UserParticipant> participants = null;
    String sdpAnswer = null;
    try {
      userName = internalManager.getParticipantName(pid);
      sdpAnswer = internalManager
          .publishMedia(request.getParticipantId(), isOffer, sdp, loopbackAlternativeSrc,
              loopbackConnectionType, doLoopback, mediaElements);
      participants = internalManager.getParticipants(internalManager.getRoomName(pid));
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error publishing media", userName, e);
      notificationRoomHandler.onPublishMedia(request, null, null, null, e);
    }
    if (sdpAnswer != null) {
      notificationRoomHandler.onPublishMedia(request, userName, sdpAnswer, participants, null);
    }
  }

  /**
   * @param request instance of {@link ParticipantRequest} POJO
   * @see RoomManager#publishMedia(String, String, boolean, MediaElement...)
   */
  public void publishMedia(ParticipantRequest request, String sdpOffer, boolean doLoopback,
      MediaElement... mediaElements) {
    this.publishMedia(request, true, sdpOffer, null, null, doLoopback, mediaElements);
  }

  /**
   * @param request instance of {@link ParticipantRequest} POJO
   * @see RoomManager#unpublishMedia(String)
   */
  public void unpublishMedia(ParticipantRequest request) {
    String pid = request.getParticipantId();
    String userName = null;
    Set<UserParticipant> participants = null;
    boolean unpublished = false;
    try {
      userName = internalManager.getParticipantName(pid);
      internalManager.unpublishMedia(pid);
      unpublished = true;
      participants = internalManager.getParticipants(internalManager.getRoomName(pid));
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error unpublishing media", userName, e);
      notificationRoomHandler.onUnpublishMedia(request, null, null, e);
    }
    if (unpublished) {
      notificationRoomHandler.onUnpublishMedia(request, userName, participants, null);
    }
  }

  /**
   * @param request instance of {@link ParticipantRequest} POJO
   * @see RoomManager#subscribe(String, String, String)
   */
  public void subscribe(String remoteName, String sdpOffer, ParticipantRequest request) {
    String pid = request.getParticipantId();
    String userName = null;
    String sdpAnswer = null;
    try {
      userName = internalManager.getParticipantName(pid);
      sdpAnswer = internalManager.subscribe(remoteName, sdpOffer, pid);
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error subscribing to {}", userName, remoteName, e);
      notificationRoomHandler.onSubscribe(request, null, e);
    }
    if (sdpAnswer != null) {
      notificationRoomHandler.onSubscribe(request, sdpAnswer, null);
    }
  }

  /**
   * @param request instance of {@link ParticipantRequest} POJO
   * @see RoomManager#unsubscribe(String, String)
   */
  public void unsubscribe(String remoteName, ParticipantRequest request) {
    String pid = request.getParticipantId();
    String userName = null;
    boolean unsubscribed = false;
    try {
      userName = internalManager.getParticipantName(pid);
      internalManager.unsubscribe(remoteName, pid);
      unsubscribed = true;
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error unsubscribing from {}", userName, remoteName, e);
      notificationRoomHandler.onUnsubscribe(request, e);
    }
    if (unsubscribed) {
      notificationRoomHandler.onUnsubscribe(request, null);
    }
  }

  /**
   * @see RoomManager#onIceCandidate(String, String, int, String, String)
   */
  public void onIceCandidate(String endpointName, String candidate, int sdpMLineIndex,
      String sdpMid, ParticipantRequest request) {
    String pid = request.getParticipantId();
    String userName = null;
    try {
      userName = internalManager.getParticipantName(pid);
      internalManager.onIceCandidate(endpointName, candidate, sdpMLineIndex, sdpMid,
          request.getParticipantId());
      notificationRoomHandler.onRecvIceCandidate(request, null);
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error receiving ICE " + "candidate (epName={}, candidate={})",
          userName, endpointName, candidate, e);
      notificationRoomHandler.onRecvIceCandidate(request, e);
    }
  }

  /**
   * Used by clients to send written messages to all other participants in the room.<br/>
   * <strong>Side effects:</strong> The room event handler should acknowledge the client's request
   * by sending an empty message. Should also send notifications to the all participants in the room
   * with the message and its sender.
   *
   * @param message  message contents
   * @param userName name or identifier of the user in the room
   * @param roomName room's name
   * @param request  instance of {@link ParticipantRequest} POJO
   */
  public void sendMessage(String message, String userName, String roomName,
      ParticipantRequest request) {
    log.debug("Request [SEND_MESSAGE] message={} ({})", message, request);
    try {
      if (!internalManager.getParticipantName(request.getParticipantId()).equals(userName)) {
        throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
            "Provided username '" + userName + "' differs from the participant's name");
      }
      if (!internalManager.getRoomName(request.getParticipantId()).equals(roomName)) {
        throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE,
            "Provided room name '" + roomName + "' differs from the participant's room");
      }
      notificationRoomHandler.onSendMessage(request, message, userName, roomName,
          internalManager.getParticipants(roomName), null);
    } catch (OpenViduException e) {
      log.warn("PARTICIPANT {}: Error sending message", userName, e);
      notificationRoomHandler.onSendMessage(request, null, null, null, null, e);
    }
  }

  // ----------------- APPLICATION-ORIGINATED REQUESTS ------------

  /**
   * @see RoomManager#close()
   */
  @PreDestroy
  public void close() {
    if (!internalManager.isClosed()) {
      internalManager.close();
    }
  }

  /**
   * @see RoomManager#getRooms()
   */
  public Set<String> getRooms() {
    return internalManager.getRooms();
  }

  /**
   * @see RoomManager#getParticipants(String)
   */
  public Set<UserParticipant> getParticipants(String roomName) throws OpenViduException {
    return internalManager.getParticipants(roomName);
  }

  /**
   * @see RoomManager#getPublishers(String)
   */
  public Set<UserParticipant> getPublishers(String roomName) throws OpenViduException {
    return internalManager.getPublishers(roomName);
  }

  /**
   * @see RoomManager#getSubscribers(String)
   */
  public Set<UserParticipant> getSubscribers(String roomName) throws OpenViduException {
    return internalManager.getSubscribers(roomName);
  }

  /**
   * @see RoomManager#getPeerPublishers(String)
   */
  public Set<UserParticipant> getPeerPublishers(String participantId) throws OpenViduException {
    return internalManager.getPeerPublishers(participantId);
  }

  /**
   * @see RoomManager#getPeerSubscribers(String)
   */
  public Set<UserParticipant> getPeerSubscribers(String participantId) throws OpenViduException {
    return internalManager.getPeerSubscribers(participantId);
  }

  /**
   * @see RoomManager#createRoom(KurentoClientSessionInfo)
   */
  public void createRoom(KurentoClientSessionInfo kcSessionInfo) throws OpenViduException {
    internalManager.createRoom(kcSessionInfo);
  }

  /**
   * @see RoomManager#getPipeline(String)
   */
  public MediaPipeline getPipeline(String participantId) throws OpenViduException {
    return internalManager.getPipeline(participantId);
  }

  /**
   * Application-originated request to remove a participant from the room. <br/>
   * <strong>Side effects:</strong> The room event handler should notify the user that she has been
   * evicted. Should also send notifications to all other participants about the one that's just
   * been evicted.
   *
   * @see RoomManager#leaveRoom(String)
   */
  public void evictParticipant(String participantId) throws OpenViduException {
    UserParticipant participant = internalManager.getParticipantInfo(participantId);
    Set<UserParticipant> remainingParticipants = internalManager.leaveRoom(participantId);
    notificationRoomHandler.onParticipantLeft(participant.getUserName(), remainingParticipants);
    notificationRoomHandler.onParticipantEvicted(participant);
  }

  /**
   * @see RoomManager#closeRoom(String)
   */
  public void closeRoom(String roomName) throws OpenViduException {
    Set<UserParticipant> participants = internalManager.closeRoom(roomName);
    notificationRoomHandler.onRoomClosed(roomName, participants);
  }

  /**
   * @see RoomManager#generatePublishOffer(String)
   */
  public String generatePublishOffer(String participantId) throws OpenViduException {
    return internalManager.generatePublishOffer(participantId);
  }

  /**
   * @see RoomManager#addMediaElement(String, MediaElement)
   */
  public void addMediaElement(String participantId, MediaElement element) throws OpenViduException {
    internalManager.addMediaElement(participantId, element);
  }

  /**
   * @see RoomManager#addMediaElement(String, MediaElement, MediaType)
   */
  public void addMediaElement(String participantId, MediaElement element, MediaType type)
      throws OpenViduException {
    internalManager.addMediaElement(participantId, element, type);
  }

  /**
   * @see RoomManager#removeMediaElement(String, MediaElement)
   */
  public void removeMediaElement(String participantId, MediaElement element) throws OpenViduException {
    internalManager.removeMediaElement(participantId, element);
  }

  /**
   * @see RoomManager#mutePublishedMedia(MutedMediaType, String)
   */
  public void mutePublishedMedia(MutedMediaType muteType, String participantId)
      throws OpenViduException {
    internalManager.mutePublishedMedia(muteType, participantId);
  }

  /**
   * @see RoomManager#unmutePublishedMedia(String)
   */
  public void unmutePublishedMedia(String participantId) throws OpenViduException {
    internalManager.unmutePublishedMedia(participantId);
  }

  /**
   * @see RoomManager#muteSubscribedMedia(String, MutedMediaType, String)
   */
  public void muteSubscribedMedia(String remoteName, MutedMediaType muteType, String participantId)
      throws OpenViduException {
    internalManager.muteSubscribedMedia(remoteName, muteType, participantId);
  }

  /**
   * @see RoomManager#unmuteSubscribedMedia(String, String)
   */
  public void unmuteSubscribedMedia(String remoteName, String participantId) throws OpenViduException {
    internalManager.unmuteSubscribedMedia(remoteName, participantId);
  }

  public RoomManager getRoomManager() {
    return internalManager;
  }

  public void updateFilter(String roomId, String filterId) {
    internalManager.updateFilter(roomId, filterId);
  }
  
  
  
  public String newSessionId(){
	  return this.internalManager.newSessionId();
  }
  
  public String newToken(String sessionId, ParticipantRole role, String metaData){
	  return this.internalManager.newToken(sessionId, role, metaData);
  }
  
  public String newRandomUserName(String token, String roomId){
	  return this.internalManager.newRandomUserName(token, roomId);
  }
}
