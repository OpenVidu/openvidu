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

import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.kurento.client.IceCandidate;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaElement;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaType;
import org.kurento.client.RtpEndpoint;
import org.kurento.client.WebRtcEndpoint;
import org.openvidu.client.OpenViduException;
import org.openvidu.client.OpenViduException.Code;
import org.openvidu.server.InfoHandler;
import org.openvidu.server.core.api.KurentoClientProvider;
import org.openvidu.server.core.api.KurentoClientSessionInfo;
import org.openvidu.server.core.api.MutedMediaType;
import org.openvidu.server.core.api.RoomHandler;
import org.openvidu.server.core.api.pojo.UserParticipant;
import org.openvidu.server.core.endpoint.SdpType;
import org.openvidu.server.core.internal.Participant;
import org.openvidu.server.core.internal.Room;
import org.openvidu.server.security.ParticipantRole;
import org.openvidu.server.security.Token;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * The Kurento room manager represents an SDK for any developer that wants to implement the Room
 * server-side application. They can build their application on top of the manager's Java API and
 * implement their desired business logic without having to consider room or media-specific details.
 * <p/>
 * The application is in control of notifying any remote parties with the outcome of executing the
 * requested actions.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class RoomManager {
	
  public class JoinRoomReturnValue {
	  public UserParticipant newParticipant;
	  public Set<UserParticipant> existingParticipants;
	  
	  public JoinRoomReturnValue(UserParticipant newParticipant, Set<UserParticipant> existingParticipants){
		  this.newParticipant = newParticipant;
		  this.existingParticipants = existingParticipants;
	  }
  }
	
  private final Logger log = LoggerFactory.getLogger(RoomManager.class);
  
  @Autowired
  private RoomHandler roomHandler;
  
  @Autowired
  private KurentoClientProvider kcProvider;

  private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<String, Room>();
  
  private final ConcurrentMap<String, ConcurrentHashMap<String, Token>> sessionIdToken = new ConcurrentHashMap<>();

  @Value("${openvidu.security}")
  private boolean SECURITY_ENABLED;
  
  private volatile boolean closed = false;

  public RoomManager() {
    super();
  }

  /**
   * Represents a client's request to join a room. The room must exist in order to perform the
   * join.<br/>
   * <strong>Dev advice:</strong> Send notifications to the existing participants in the room to
   * inform about the new peer.
   *
   * @param userName       name or identifier of the user in the room. Will be used to identify
   *                       her WebRTC media
   *                       peer (from the client-side).
   * @param roomName       name or identifier of the room
   * @param dataChannels   enables data channels (if webParticipant)
   * @param webParticipant if <strong>true</strong>, the internal media endpoints will use the
   *                       trickle ICE
   *                       mechanism when establishing connections with external media peers (
   *                       {@link WebRtcEndpoint}); if <strong>false</strong>, the media endpoint
   *                       will be a
   *                       {@link RtpEndpoint}, with no ICE implementation
   * @param webParticipant
   * @param kcSessionInfo  sessionInfo bean to be used to create the room in case it doesn't
   *                       exist (if null, the
   *                       room will not be created)
   * @param participantId  identifier of the participant
   * @return set of existing peers of type {@link UserParticipant}, can be empty if first
   * @throws OpenViduException on error while joining (like the room is not found or is closing)
   */
  public JoinRoomReturnValue joinRoom(String token, String roomId, boolean dataChannels,
      boolean webParticipant, KurentoClientSessionInfo kcSessionInfo, String participantId)
      throws OpenViduException {
    log.debug("Request [JOIN_ROOM] user={}, room={}, web={} " + "kcSessionInfo.room={} ({})",
    		token, roomId, webParticipant,
        kcSessionInfo != null ? kcSessionInfo.getRoomName() : null, participantId);
    Room room = rooms.get(roomId);
    if (room == null && kcSessionInfo != null) {
      createRoom(kcSessionInfo);
    }
    room = rooms.get(roomId);
    if (room == null) {
      log.warn("Room '{}' not found");
      throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE,
          "Room '" + roomId + "' was not found, must be created before '" + roomId
              + "' can join");
    }
    if (room.isClosed()) {
      log.warn("'{}' is trying to join room '{}' but it is closing", token, roomId);
      throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE,
          "'" + token + "' is trying to join room '" + roomId + "' but it is closing");
    }
    Set<UserParticipant> existingParticipants = getParticipants(roomId);
    UserParticipant newParticipant = room.join(participantId, token, getTokenClientMetadata(token, roomId), getTokenServerMetadata(token, roomId), dataChannels, webParticipant);
    return new JoinRoomReturnValue(newParticipant, existingParticipants);
  }

  /**
   * Represents a client's notification that she's leaving the room. Will also close the room if
   * there're no more peers.<br/>
   * <strong>Dev advice:</strong> Send notifications to the other participants in the room to inform
   * about the one that's just left.
   *
   * @param participantId identifier of the participant
   * @return set of remaining peers of type {@link UserParticipant}, if empty this method has closed
   * the room
   * @throws OpenViduException on error leaving the room
   */
  public Set<UserParticipant> leaveRoom(String participantId) throws OpenViduException {
    log.debug("Request [LEAVE_ROOM] ({})", participantId);
    Participant participant = getParticipant(participantId);
    Room room = participant.getRoom();
    String roomName = room.getName();
    if (room.isClosed()) {
      log.warn("'{}' is trying to leave from room '{}' but it is closing", participant.getName(),
          roomName);
      throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE,
          "'" + participant.getName() + "' is trying to leave from room '" + roomName
              + "' but it is closing");
    }
    room.leave(participantId);
    
    if (this.sessionIdToken.get(roomName) != null){
      this.sessionIdToken.get(roomName).remove(participant.getName());
    }
    
    showMap();
    
    Set<UserParticipant> remainingParticipants = null;
    try {
      remainingParticipants = getParticipants(roomName);
    } catch (OpenViduException e) {
      log.debug("Possible collision when closing the room '{}' (not found)");
      remainingParticipants = Collections.emptySet();
    }
    if (remainingParticipants.isEmpty()) {
      log.debug("No more participants in room '{}', removing it and closing it", roomName);
      room.close();
      rooms.remove(roomName);
      
      sessionIdToken.remove(roomName);
      
      showMap();
      
      log.warn("Room '{}' removed and closed", roomName);
    }
    return remainingParticipants;
  }

  /**
   * Represents a client's request to start streaming her local media to anyone inside the room. The
   * media elements should have been created using the same pipeline as the publisher's. The
   * streaming media endpoint situated on the server can be connected to itself thus realizing what
   * is known as a loopback connection. The loopback is performed after applying all additional
   * media elements specified as parameters (in the same order as they appear in the params list).
   * <p>
   * <br/>
   * <strong>Dev advice:</strong> Send notifications to the existing participants in the room to
   * inform about the new stream that has been published. Answer to the peer's request by sending it
   * the SDP response (answer or updated offer) generated by the WebRTC endpoint on the server.
   *
   * @param participantId          identifier of the participant
   * @param isOffer                if true, the sdp is an offer from remote, otherwise is the
   *                               answer to the offer
   *                               generated previously by the server endpoint
   * @param sdp                    SDP String <strong>offer</strong> or <strong>answer</strong>,
   *                               that's been generated by
   *                               the client's WebRTC peer
   * @param loopbackAlternativeSrc instead of connecting the endpoint to itself, use this
   *                               {@link MediaElement} as source
   * @param loopbackConnectionType the connection type for the loopback; if null, will stream
   *                               both audio and video media
   * @param doLoopback             loopback flag
   * @param mediaElements          variable array of media elements (filters, recorders, etc.)
   *                               that are connected between
   *                               the source WebRTC endpoint and the subscriber endpoints
   * @return the SDP response generated by the WebRTC endpoint on the server (answer to the client's
   * offer or the updated offer previously generated by the server endpoint)
   * @throws OpenViduException on error
   */
  public String publishMedia(String participantId, boolean isOffer, String sdp,
      MediaElement loopbackAlternativeSrc, MediaType loopbackConnectionType, boolean doLoopback,
      MediaElement... mediaElements) throws OpenViduException {
    log.debug("Request [PUBLISH_MEDIA] isOffer={} sdp={} "
            + "loopbackAltSrc={} lpbkConnType={} doLoopback={} mediaElements={} ({})", isOffer, sdp,
        loopbackAlternativeSrc == null, loopbackConnectionType, doLoopback, mediaElements,
        participantId);

    SdpType sdpType = isOffer ? SdpType.OFFER : SdpType.ANSWER;
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    Room room = participant.getRoom();

    participant.createPublishingEndpoint();

    for (MediaElement elem : mediaElements) {
      participant.getPublisher().apply(elem);
    }

    String sdpResponse = participant
        .publishToRoom(sdpType, sdp, doLoopback, loopbackAlternativeSrc, loopbackConnectionType);
    if (sdpResponse == null) {
      throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
          "Error generating SDP response for publishing user " + name);
    }

    room.newPublisher(participant);
    return sdpResponse;
  }

  /**
   * Same as
   * {@link #publishMedia(String, boolean, String, MediaElement, MediaType, boolean, MediaElement...)}
   * where the sdp String is an offer generated by the remote peer, the published stream will be
   * used for loopback (if required) and no specific type of loopback connection.
   *
   * @see #publishMedia(String, boolean, String, boolean, MediaElement, MediaElement...)
   */
  public String publishMedia(String participantId, String sdp, boolean doLoopback,
      MediaElement... mediaElements) throws OpenViduException {
    return publishMedia(participantId, true, sdp, null, null, doLoopback, mediaElements);
  }

  /**
   * Same as
   * {@link #publishMedia(String, boolean, String, MediaElement, MediaType, boolean, MediaElement...)}
   * , using as loopback the published stream and no specific type of loopback connection.
   *
   * @see #publishMedia(String, boolean, String, boolean, MediaElement, MediaElement...)
   */
  public String publishMedia(String participantId, boolean isOffer, String sdp, boolean doLoopback,
      MediaElement... mediaElements) throws OpenViduException {
    return publishMedia(participantId, isOffer, sdp, null, null, doLoopback, mediaElements);
  }

  /**
   * Represents a client's request to initiate the media connection from the server-side (generate
   * the SDP offer and send it back to the client) and must be followed by processing the SDP answer
   * from the client in order to establish the streaming.
   *
   * @param participantId identifier of the participant
   * @return the SDP offer generated by the WebRTC endpoint on the server
   * @throws OpenViduException on error
   * @see #publishMedia(String, String, boolean, MediaElement...)
   */
  public String generatePublishOffer(String participantId) throws OpenViduException {
    log.debug("Request [GET_PUBLISH_SDP_OFFER] ({})", participantId);

    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    Room room = participant.getRoom();

    participant.createPublishingEndpoint();

    String sdpOffer = participant.preparePublishConnection();
    if (sdpOffer == null) {
      throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
          "Error generating SDP offer for publishing user " + name);
    }

    room.newPublisher(participant);
    return sdpOffer;
  }

  /**
   * Represents a client's request to stop publishing her media stream. All media elements on the
   * server-side connected to this peer will be disconnected and released. The peer is left ready
   * for publishing her media in the future.<br/>
   * <strong>Dev advice:</strong> Send notifications to the existing participants in the room to
   * inform that streaming from this endpoint has ended.
   *
   * @param participantId identifier of the participant
   * @throws OpenViduException on error
   */
  public void unpublishMedia(String participantId) throws OpenViduException {
    log.debug("Request [UNPUBLISH_MEDIA] ({})", participantId);
    Participant participant = getParticipant(participantId);
    if (!participant.isStreaming()) {
      throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
          "Participant '" + participant.getName() + "' is not streaming media");
    }
    Room room = participant.getRoom();
    participant.unpublishMedia();
    room.cancelPublisher(participant);
  }

  /**
   * Represents a client's request to receive media from room participants that published their
   * media. Will have the same result when a publisher requests its own media stream.<br/>
   * <strong>Dev advice:</strong> Answer to the peer's request by sending it the SDP answer
   * generated by the the receiving WebRTC endpoint on the server.
   *
   * @param remoteName    identification of the remote stream which is effectively the peer's
   *                      name (participant)
   * @param sdpOffer      SDP offer String generated by the client's WebRTC peer
   * @param participantId identifier of the participant
   * @return the SDP answer generated by the receiving WebRTC endpoint on the server
   * @throws OpenViduException on error
   */
  public String subscribe(String remoteName, String sdpOffer, String participantId)
      throws OpenViduException {
    log.debug("Request [SUBSCRIBE] remoteParticipant={} sdpOffer={} ({})", remoteName, sdpOffer,
        participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();

    Room room = participant.getRoom();

    Participant senderParticipant = room.getParticipantByName(remoteName);
    if (senderParticipant == null) {
      log.warn("PARTICIPANT {}: Requesting to recv media from user {} "
          + "in room {} but user could not be found", name, remoteName, room.getName());
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "User '" + remoteName + " not found in room '" + room.getName() + "'");
    }
    if (!senderParticipant.isStreaming()) {
      log.warn("PARTICIPANT {}: Requesting to recv media from user {} "
          + "in room {} but user is not streaming media", name, remoteName, room.getName());
      throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
          "User '" + remoteName + " not streaming media in room '" + room.getName() + "'");
    }

    String sdpAnswer = participant.receiveMediaFrom(senderParticipant, sdpOffer);
    if (sdpAnswer == null) {
      throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
          "Unable to generate SDP answer when subscribing '" + name + "' to '" + remoteName + "'");
    }
    return sdpAnswer;
  }

  /**
   * Represents a client's request to stop receiving media from the remote peer.
   *
   * @param remoteName    identification of the remote stream which is effectively the peer's
   *                      name (participant)
   * @param participantId identifier of the participant
   * @throws OpenViduException on error
   */
  public void unsubscribe(String remoteName, String participantId) throws OpenViduException {
    log.debug("Request [UNSUBSCRIBE] remoteParticipant={} ({})", remoteName, participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    Room room = participant.getRoom();
    Participant senderParticipant = room.getParticipantByName(remoteName);
    if (senderParticipant == null) {
      log.warn("PARTICIPANT {}: Requesting to unsubscribe from user {} "
          + "in room {} but user could not be found", name, remoteName, room.getName());
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "User " + remoteName + " not found in room " + room.getName());
    }
    participant.cancelReceivingMedia(remoteName);
  }

  /**
   * Request that carries info about an ICE candidate gathered on the client side. This information
   * is required to implement the trickle ICE mechanism. Should be triggered or called whenever an
   * icecandidate event is created by a RTCPeerConnection.
   *
   * @param endpointName  the name of the peer whose ICE candidate was gathered
   * @param candidate     the candidate attribute information
   * @param sdpMLineIndex the index (starting at zero) of the m-line in the SDP this candidate is
   *                      associated
   *                      with
   * @param sdpMid        media stream identification, "audio" or "video", for the m-line this
   *                      candidate is
   *                      associated with
   * @param participantId identifier of the participant
   * @throws OpenViduException on error
   */
  public void onIceCandidate(String endpointName, String candidate, int sdpMLineIndex,
      String sdpMid, String participantId) throws OpenViduException {
    log.debug("Request [ICE_CANDIDATE] endpoint={} candidate={} " + "sdpMLineIdx={} sdpMid={} ({})",
        endpointName, candidate, sdpMLineIndex, sdpMid, participantId);
    Participant participant = getParticipant(participantId);
    participant.addIceCandidate(endpointName, new IceCandidate(candidate, sdpMid, sdpMLineIndex));
  }

  /**
   * Applies a media element (filter, recorder, mixer, etc.) to media that is currently streaming or
   * that might get streamed sometime in the future. The element should have been created using the
   * same pipeline as the publisher's.
   *
   * @param participantId identifier of the owner of the stream
   * @param element       media element to be added
   * @throws OpenViduException in case the participant doesn't exist, has been closed or on error
   *                       when applying the
   *                       filter
   */
  public void addMediaElement(String participantId, MediaElement element) throws OpenViduException {
    addMediaElement(participantId, element, null);
  }

  /**
   * Applies a media element (filter, recorder, mixer, etc.) to media that is currently streaming or
   * that might get streamed sometime in the future. The element should have been created using the
   * same pipeline as the publisher's. The media connection can be of any type, that is audio,
   * video, data or any (when the parameter is null).
   *
   * @param participantId identifier of the owner of the stream
   * @param element       media element to be added
   * @param type          the connection type (null is accepted, has the same result as calling
   *                      {@link #addMediaElement(String, MediaElement)})
   * @throws OpenViduException in case the participant doesn't exist, has been closed or on error
   *                       when applying the filter
   */
  public void addMediaElement(String participantId, MediaElement element, MediaType type)
      throws OpenViduException {
    log.debug("Add media element {} (connection type: {}) to participant {}", element.getId(), type,
        participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    if (participant.isClosed()) {
      throw new OpenViduException(Code.USER_CLOSED_ERROR_CODE,
          "Participant '" + name + "' has been closed");
    }
    participant.shapePublisherMedia(element, type);
  }

  /**
   * Disconnects and removes media element (filter, recorder, etc.) from a media stream.
   *
   * @param participantId identifier of the participant
   * @param element       media element to be removed
   * @throws OpenViduException in case the participant doesn't exist, has been closed or on error
   *                       when removing the
   *                       filter
   */
  public void removeMediaElement(String participantId, MediaElement element) throws OpenViduException {
    log.debug("Remove media element {} from participant {}", element.getId(), participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    if (participant.isClosed()) {
      throw new OpenViduException(Code.USER_CLOSED_ERROR_CODE,
          "Participant '" + name + "' has been closed");
    }
    participant.getPublisher().revert(element);
  }

  /**
   * Mutes the streamed media of this publisher in a selective manner.
   *
   * @param muteType      which leg should be disconnected (audio, video or both)
   * @param participantId identifier of the participant
   * @throws OpenViduException in case the participant doesn't exist, has been closed, is not
   *                       publishing or on error
   *                       when performing the mute operation
   */
  public void mutePublishedMedia(MutedMediaType muteType, String participantId)
      throws OpenViduException {
    log.debug("Request [MUTE_PUBLISHED] muteType={} ({})", muteType, participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    if (participant.isClosed()) {
      throw new OpenViduException(Code.USER_CLOSED_ERROR_CODE,
          "Participant '" + name + "' has been closed");
    }
    if (!participant.isStreaming()) {
      throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
          "Participant '" + name + "' is not streaming media");
    }
    participant.mutePublishedMedia(muteType);
  }

  /**
   * Reverts the effects of the mute operation.
   *
   * @param participantId identifier of the participant
   * @throws OpenViduException in case the participant doesn't exist, has been closed, is not
   *                       publishing or on error
   *                       when reverting the mute operation
   */
  public void unmutePublishedMedia(String participantId) throws OpenViduException {
    log.debug("Request [UNMUTE_PUBLISHED] muteType={} ({})", participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    if (participant.isClosed()) {
      throw new OpenViduException(Code.USER_CLOSED_ERROR_CODE,
          "Participant '" + name + "' has been closed");
    }
    if (!participant.isStreaming()) {
      throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
          "Participant '" + name + "' is not streaming media");
    }
    participant.unmutePublishedMedia();
  }

  /**
   * Mutes the incoming media stream from the remote publisher in a selective manner.
   *
   * @param remoteName    identification of the remote stream which is effectively the peer's
   *                      name (participant)
   * @param muteType      which leg should be disconnected (audio, video or both)
   * @param participantId identifier of the participant
   * @throws OpenViduException in case the participant doesn't exist, has been closed, is not
   *                       publishing or on error
   *                       when performing the mute operation
   */
  public void muteSubscribedMedia(String remoteName, MutedMediaType muteType, String participantId)
      throws OpenViduException {
    log.debug("Request [MUTE_SUBSCRIBED] remoteParticipant={} muteType={} ({})", remoteName,
        muteType, participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    Room room = participant.getRoom();
    Participant senderParticipant = room.getParticipantByName(remoteName);
    if (senderParticipant == null) {
      log.warn("PARTICIPANT {}: Requesting to mute streaming from {} "
          + "in room {} but user could not be found", name, remoteName, room.getName());
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "User " + remoteName + " not found in room " + room.getName());
    }
    if (!senderParticipant.isStreaming()) {
      log.warn("PARTICIPANT {}: Requesting to mute streaming from {} "
          + "in room {} but user is not streaming media", name, remoteName, room.getName());
      throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
          "User '" + remoteName + " not streaming media in room '" + room.getName() + "'");
    }
    participant.muteSubscribedMedia(senderParticipant, muteType);
  }

  /**
   * Reverts any previous mute operation.
   *
   * @param remoteName    identification of the remote stream which is effectively the peer's
   *                      name (participant)
   * @param participantId identifier of the participant
   * @throws OpenViduException in case the participant doesn't exist, has been closed or on error
   *                       when reverting the
   *                       mute operation
   */
  public void unmuteSubscribedMedia(String remoteName, String participantId) throws OpenViduException {
    log.debug("Request [UNMUTE_SUBSCRIBED] remoteParticipant={} ({})", remoteName, participantId);
    Participant participant = getParticipant(participantId);
    String name = participant.getName();
    Room room = participant.getRoom();
    Participant senderParticipant = room.getParticipantByName(remoteName);
    if (senderParticipant == null) {
      log.warn("PARTICIPANT {}: Requesting to unmute streaming from {} "
          + "in room {} but user could not be found", name, remoteName, room.getName());
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "User " + remoteName + " not found in room " + room.getName());
    }
    if (!senderParticipant.isStreaming()) {
      log.warn("PARTICIPANT {}: Requesting to unmute streaming from {} "
          + "in room {} but user is not streaming media", name, remoteName, room.getName());
      throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
          "User '" + remoteName + " not streaming media in room '" + room.getName() + "'");
    }
    participant.unmuteSubscribedMedia(senderParticipant);
  }

  // ----------------- ADMIN (DIRECT or SERVER-SIDE) REQUESTS ------------

  /**
   * Closes all resources. This method has been annotated with the @PreDestroy directive
   * (javax.annotation package) so that it will be automatically called when the RoomManager
   * instance is container-managed. <br/>
   * <strong>Dev advice:</strong> Send notifications to all participants to inform that their room
   * has been forcibly closed.
   *
   * @see RoomManager#closeRoom(String)
   */
  @PreDestroy
  public void close() {
    closed = true;
    log.info("Closing all rooms");
    for (String roomName : rooms.keySet()) {
      try {
        closeRoom(roomName);
      } catch (Exception e) {
        log.warn("Error closing room '{}'", roomName, e);
      }
    }
  }

  /**
   * @return true after {@link #close()} has been called
   */
  public boolean isClosed() {
    return closed;
  }

  /**
   * Returns all currently active (opened) rooms.
   *
   * @return set of the rooms' identifiers (names)
   */
  public Set<String> getRooms() {
    return new HashSet<String>(rooms.keySet());
  }

  /**
   * Returns all the participants inside a room.
   *
   * @param roomName name or identifier of the room
   * @return set of {@link UserParticipant} POJOS (an instance contains the participant's identifier
   * and her user name)
   * @throws OpenViduException in case the room doesn't exist
   */
  public Set<UserParticipant> getParticipants(String roomName) throws OpenViduException {
    Room room = rooms.get(roomName);
    if (room == null) {
      throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Room '" + roomName + "' not found");
    }
    Collection<Participant> participants = room.getParticipants();
    Set<UserParticipant> userParts = new HashSet<UserParticipant>();
    for (Participant p : participants) {
      if (!p.isClosed()) {
        userParts.add(new UserParticipant(p.getId(), p.getName(), p.getClientMetadata(), p.getServerMetadata(), p.isStreaming()));
      }
    }
    return userParts;
  }

  /**
   * Returns all the publishers (participants streaming their media) inside a room.
   *
   * @param roomName name or identifier of the room
   * @return set of {@link UserParticipant} POJOS representing the existing publishers
   * @throws OpenViduException in case the room doesn't exist
   */
  public Set<UserParticipant> getPublishers(String roomName) throws OpenViduException {
    Room r = rooms.get(roomName);
    if (r == null) {
      throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Room '" + roomName + "' not found");
    }
    Collection<Participant> participants = r.getParticipants();
    Set<UserParticipant> userParts = new HashSet<UserParticipant>();
    for (Participant p : participants) {
      if (!p.isClosed() && p.isStreaming()) {
        userParts.add(new UserParticipant(p.getId(), p.getName(), true));
      }
    }
    return userParts;
  }

  /**
   * Returns all the subscribers (participants subscribed to a least one stream of another user)
   * inside a room. A publisher which subscribes to its own stream (loopback) and will not be
   * included in the returned values unless it requests explicitly a connection to another user's
   * stream.
   *
   * @param roomName name or identifier of the room
   * @return set of {@link UserParticipant} POJOS representing the existing subscribers
   * @throws OpenViduException in case the room doesn't exist
   */
  public Set<UserParticipant> getSubscribers(String roomName) throws OpenViduException {
    Room r = rooms.get(roomName);
    if (r == null) {
      throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Room '" + roomName + "' not found");
    }
    Collection<Participant> participants = r.getParticipants();
    Set<UserParticipant> userParts = new HashSet<UserParticipant>();
    for (Participant p : participants) {
      if (!p.isClosed() && p.isSubscribed()) {
        userParts.add(new UserParticipant(p.getId(), p.getName(), p.isStreaming()));
      }
    }
    return userParts;
  }

  /**
   * Returns the peer's publishers (participants from which the peer is receiving media). The own
   * stream doesn't count.
   *
   * @param participantId identifier of the participant
   * @return set of {@link UserParticipant} POJOS representing the publishers this participant is
   * currently subscribed to
   * @throws OpenViduException in case the participant doesn't exist
   */
  public Set<UserParticipant> getPeerPublishers(String participantId) throws OpenViduException {
    Participant participant = getParticipant(participantId);
    if (participant == null) {
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "No participant with id '" + participantId + "' was found");
    }
    Set<String> subscribedEndpoints = participant.getConnectedSubscribedEndpoints();
    Room room = participant.getRoom();
    Set<UserParticipant> userParts = new HashSet<UserParticipant>();
    for (String epName : subscribedEndpoints) {
      Participant p = room.getParticipantByName(epName);
      userParts.add(new UserParticipant(p.getId(), p.getName()));
    }
    return userParts;
  }

  /**
   * Returns the peer's subscribers (participants towards the peer is streaming media). The own
   * stream doesn't count.
   *
   * @param participantId identifier of the participant
   * @return set of {@link UserParticipant} POJOS representing the participants subscribed to this
   * peer
   * @throws OpenViduException in case the participant doesn't exist
   */
  public Set<UserParticipant> getPeerSubscribers(String participantId) throws OpenViduException {
    Participant participant = getParticipant(participantId);
    if (participant == null) {
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "No participant with id '" + participantId + "' was found");
    }
    if (!participant.isStreaming()) {
      throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
          "Participant with id '" + participantId + "' is not a publisher yet");
    }
    Set<UserParticipant> userParts = new HashSet<UserParticipant>();
    Room room = participant.getRoom();
    String endpointName = participant.getName();
    for (Participant p : room.getParticipants()) {
      if (p.equals(participant)) {
        continue;
      }
      Set<String> subscribedEndpoints = p.getConnectedSubscribedEndpoints();
      if (subscribedEndpoints.contains(endpointName)) {
        userParts.add(new UserParticipant(p.getId(), p.getName()));
      }
    }
    return userParts;
  }

  /**
   * Checks if a participant is currently streaming media.
   *
   * @param participantId identifier of the participant
   * @return true if the participant is streaming media, false otherwise
   * @throws OpenViduException in case the participant doesn't exist or has been closed
   */
  public boolean isPublisherStreaming(String participantId) throws OpenViduException {
    Participant participant = getParticipant(participantId);
    if (participant == null) {
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "No participant with id '" + participantId + "' was found");
    }
    if (participant.isClosed()) {
      throw new OpenViduException(Code.USER_CLOSED_ERROR_CODE,
          "Participant '" + participant.getName() + "' has been closed");
    }
    return participant.isStreaming();
  }

  /**
   * Creates a room if it doesn't already exist. The room's name will be indicated by the session
   * info bean.
   *
   * @param kcSessionInfo bean that will be passed to the {@link KurentoClientProvider} in order
   *                      to obtain the
   *                      {@link KurentoClient} that will be used by the room
   * @throws OpenViduException in case of error while creating the room
   */
  public void createRoom(KurentoClientSessionInfo kcSessionInfo) throws OpenViduException {
    String roomName = kcSessionInfo.getRoomName();
    Room room = rooms.get(kcSessionInfo);
    if (room != null) {
      throw new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
          "Room '" + roomName + "' already exists");
    }
    KurentoClient kurentoClient = kcProvider.getKurentoClient(kcSessionInfo);

    room = new Room(roomName, kurentoClient, roomHandler, kcProvider.destroyWhenUnused());

    Room oldRoom = rooms.putIfAbsent(roomName, room);
    if (oldRoom != null) {
      log.warn("Room '{}' has just been created by another thread", roomName);
      return;
      // throw new RoomException(
      // Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
      // "Room '"
      // + roomName
      // + "' already exists (has just been created by another thread)");
    }
    String kcName = "[NAME NOT AVAILABLE]";
    if (kurentoClient.getServerManager() != null) {
      kcName = kurentoClient.getServerManager().getName();
    }
    log.warn("No room '{}' exists yet. Created one " + "using KurentoClient '{}'.", roomName,
        kcName);
    
    this.roomHandler.getInfoHandler().sendInfo("New room " + roomName);
    
  }

  /**
   * Closes an existing room by releasing all resources that were allocated for the room. Once
   * closed, the room can be reopened (will be empty and it will use another Media Pipeline).
   * Existing participants will be evicted. <br/>
   * <strong>Dev advice:</strong> The room event handler should send notifications to the existing
   * participants in the room to inform that the room was forcibly closed.
   *
   * @param roomName name or identifier of the room
   * @return set of {@link UserParticipant} POJOS representing the room's participants
   * @throws OpenViduException in case the room doesn't exist or has been already closed
   */
  public Set<UserParticipant> closeRoom(String roomName) throws OpenViduException {
    Room room = rooms.get(roomName);
    if (room == null) {
      throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, "Room '" + roomName + "' not found");
    }
    if (room.isClosed()) {
      throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE,
          "Room '" + roomName + "' already closed");
    }
    Set<UserParticipant> participants = getParticipants(roomName);
    // copy the ids as they will be removed from the map
    Set<String> pids = new HashSet<String>(room.getParticipantIds());
    for (String pid : pids) {
      try {
        room.leave(pid);
      } catch (OpenViduException e) {
        log.warn("Error evicting participant with id '{}' from room '{}'", pid, roomName, e);
      }
    }
    room.close();
    rooms.remove(roomName);
    
    sessionIdToken.remove(roomName);
    
    log.warn("Room '{}' removed and closed", roomName);
    return participants;
  }

  /**
   * Returns the media pipeline used by the participant.
   *
   * @param participantId identifier of the participant
   * @return the Media Pipeline object
   * @throws OpenViduException in case the participant doesn't exist
   */
  public MediaPipeline getPipeline(String participantId) throws OpenViduException {
    Participant participant = getParticipant(participantId);
    if (participant == null) {
      throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
          "No participant with id '" + participantId + "' was found");
    }
    return participant.getPipeline();
  }

  /**
   * Finds the room's name of a given participant.
   *
   * @param participantId identifier of the participant
   * @return the name of the room
   * @throws OpenViduException in case the participant doesn't exist
   */
  public String getRoomName(String participantId) throws OpenViduException {
    Participant participant = getParticipant(participantId);
    return participant.getRoom().getName();
  }

  /**
   * Finds the participant's username.
   *
   * @param participantId identifier of the participant
   * @return the participant's name
   * @throws OpenViduException in case the participant doesn't exist
   */
  public String getParticipantName(String participantId) throws OpenViduException {
    Participant participant = getParticipant(participantId);
    return participant.getName();
  }

  /**
   * Searches for the participant using her identifier and returns the corresponding
   * {@link UserParticipant} POJO.
   *
   * @param participantId identifier of the participant
   * @return {@link UserParticipant} POJO containing the participant's name and identifier
   * @throws OpenViduException in case the participant doesn't exist
   */
  public UserParticipant getParticipantInfo(String participantId) throws OpenViduException {
    Participant participant = getParticipant(participantId);
    return new UserParticipant(participantId, participant.getName());
  }

  // ------------------ HELPERS ------------------------------------------

  private Participant getParticipant(String pid) throws OpenViduException {
    for (Room r : rooms.values()) {
      if (!r.isClosed()) {
        if (r.getParticipantIds().contains(pid) && r.getParticipant(pid) != null) {
          return r.getParticipant(pid);
        }
      }
    }
    throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
        "No participant with id '" + pid + "' was found");
  }

  public void updateFilter(String roomId, String filterId) {
    Room room = rooms.get(roomId);

    room.updateFilter(filterId);
  }
  
  
  
  
  private void showMap(){
	  System.out.println("------------------------------");
	  System.out.println(this.sessionIdToken.toString());
	  System.out.println("------------------------------");
  }
  
  public String getRoomNameFromParticipantId(String pid){
	  return getParticipant(pid).getRoom().getName();
  }
  
  public boolean isParticipantInRoom(String token, String roomId) throws OpenViduException {
    if (SECURITY_ENABLED) {
      if (this.sessionIdToken.get(roomId) != null) {
        return this.sessionIdToken.get(roomId).containsKey(token);
      } else{
        return false;
      }
    } else {
    	this.sessionIdToken.putIfAbsent(roomId, new ConcurrentHashMap<>());
    	if (this.sessionIdToken.get(roomId).containsKey(token)){
    		// If the user already exists
    		throw new OpenViduException(Code.EXISTING_USER_IN_ROOM_ERROR_CODE, "The user " + token + " already exists in room " + roomId);
    	} else {
	    	this.sessionIdToken.get(roomId).put(token, new Token(token));
	    	return true;
    	}
    }
  }
  
  public boolean isPublisherInRoom(String token, String roomId) {
    if (SECURITY_ENABLED) {
      if (this.sessionIdToken.get(roomId) != null){
        if (this.sessionIdToken.get(roomId).get(token) != null){
          return (this.sessionIdToken.get(roomId).get(token).getRole().equals(ParticipantRole.PUBLISHER));
        } else {
          return false;
        }
      } else{
        return false;
      }
    } else {
      return true;
    }
  }
  
  public String getTokenClientMetadata(String token, String roomId) throws OpenViduException {
	  if (this.sessionIdToken.get(roomId) != null){
	        if (this.sessionIdToken.get(roomId).get(token) != null){
	          return this.sessionIdToken.get(roomId).get(token).getClientMetadata();
	        } else {
	        	throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE, roomId);
	        }
	  } else {
		  throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, token);
	  }
  }
  
  public String getTokenServerMetadata(String token, String roomId) throws OpenViduException {
	  if (this.sessionIdToken.get(roomId) != null){
	        if (this.sessionIdToken.get(roomId).get(token) != null){
	          return this.sessionIdToken.get(roomId).get(token).getServerMetadata();
	        } else {
	        	throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE, roomId);
	        }
	  } else {
		  throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, token);
	  }
  }
  
  public void setTokenClientMetadata(String token, String roomId, String metadata)  throws OpenViduException {
	  if (this.sessionIdToken.get(roomId) != null){
	        if (this.sessionIdToken.get(roomId).get(token) != null){
	          this.sessionIdToken.get(roomId).get(token).setClientMetadata(metadata);
	        } else {
	        	throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE, roomId);
	        }
	  } else {
		  throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE, token);
	  }
  }
  
  public String newSessionId(){
	  String sessionId = new BigInteger(130, new SecureRandom()).toString(32);
	  this.sessionIdToken.put(sessionId, new ConcurrentHashMap<>());
	  showMap();
	  return sessionId;
  }
  
  public String newToken(String roomId, ParticipantRole role, String metadata){
	  if (this.sessionIdToken.get(roomId) != null) {
		  if(metadataFormatCorrect(metadata)){
			  String token = new BigInteger(130, new SecureRandom()).toString(32);
			  if (SECURITY_ENABLED) { // Store the token only if security is enabled
				  this.sessionIdToken.get(roomId).put(token, new Token(token, role, metadata));
			  }
			  showMap();
			  return token;
		  }
		  else {
			  throw new OpenViduException(Code.GENERIC_ERROR_CODE, "Data invalid format. Max length allowed is 1000 chars");
		  }
	  } else {
		  System.out.println("Error: the sessionId [" + roomId + "] is not valid");
		  throw new OpenViduException(Code.ROOM_NOT_FOUND_ERROR_CODE,
				  "[" + roomId +"] is not a valid sessionId");
	  }
  }
  
  public boolean metadataFormatCorrect(String metadata){
	  // Max 1000 chars
	  return (metadata.length() <= 1000);
  }
}
