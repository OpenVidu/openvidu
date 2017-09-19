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

package io.openvidu.server.core.api;

import java.util.Set;

import org.kurento.client.MediaElement;

import io.openvidu.client.OpenViduException;
import io.openvidu.server.core.NotificationRoomManager;
import io.openvidu.server.core.api.pojo.ParticipantRequest;
import io.openvidu.server.core.api.pojo.UserParticipant;

/**
 * Through this interface, the room API passes the execution result of client-originated requests to
 * the application and from there to the clients. It's the application's duty to respect this
 * contract.
 * <p/>
 * Extends {@link RoomHandler} interface so that the clients are also notified of spontaneous media
 * events.
 *
 * @see RoomHandler
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public interface NotificationRoomHandler extends RoomHandler {

  /**
   * Called as a result of
   * {@link NotificationRoomManager#joinRoom(String, String, ParticipantRequest)} . The new
   * participant should be responded with all the available information: the existing peers and, for
   * any publishers, their stream names. The current peers should receive a notification of the join
   * event.
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param roomName
   *          the room's name
   * @param newUserName
   *          the new user
   * @param existingParticipants
   *          instances of {@link UserParticipant} POJO representing the already existing peers
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the join was unsuccessful and the user should be responded accordingly.
   */
  void onParticipantJoined(ParticipantRequest request, String roomName, UserParticipant newParticipant,
      Set<UserParticipant> existingParticipants, OpenViduException error);

  /**
   * Called as a result of
   * {@link NotificationRoomManager#leaveRoom(String, String, ParticipantRequest)} . The user should
   * receive an acknowledgement if the operation completed successfully, and the remaining peers
   * should be notified of this event.
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param userName
   *          the departing user's name
   * @param remainingParticipants
   *          instances of {@link UserParticipant} representing the remaining participants in the
   *          room
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the operation was unsuccessful and the user should be responded
   *          accordingly.
   */
  void onParticipantLeft(ParticipantRequest request, String userName,
      Set<UserParticipant> remainingParticipants, OpenViduException error);

  /**
   * Called as a result of {@link NotificationRoomManager#evictParticipant(String)}
   * (application-originated action). The remaining peers should be notified of this event.
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param userName
   *          the departing user's name
   * @param remainingParticipants
   *          instances of {@link UserParticipant} representing the remaining participants in the
   *          room
   */
  void onParticipantLeft(String userName, Set<UserParticipant> remainingParticipants);

  /**
   * Called as a result of
   * {@link NotificationRoomManager#publishMedia(String, ParticipantRequest, MediaElement...)} . The
   * user should receive the generated SPD answer from the local WebRTC endpoint, and the other
   * peers should be notified of this event.
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param publisherName
   *          the user name
   * @param sdpAnswer
   *          String with generated SPD answer from the local WebRTC endpoint
   * @param participants
   *          instances of {@link UserParticipant} for ALL the participants in the room (includes
   *          the publisher)
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the operation was unsuccessful and the user should be responded
   *          accordingly.
   */
  void onPublishMedia(ParticipantRequest request, String publisherName, String sdpAnswer,
      boolean audioOnly, Set<UserParticipant> participants, OpenViduException error);

  /**
   * Called as a result of {@link NotificationRoomManager#unpublishMedia(ParticipantRequest)}. The
   * user should receive an acknowledgement if the operation completed successfully, and all other
   * peers in the room should be notified of this event.
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param publisherName
   *          the user name
   * @param participants
   *          instances of {@link UserParticipant} for ALL the participants in the room (includes
   *          the publisher)
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the operation was unsuccessful and the user should be responded
   *          accordingly.
   */
  void onUnpublishMedia(ParticipantRequest request, String publisherName,
      Set<UserParticipant> participants, OpenViduException error);

  /**
   * Called as a result of
   * {@link NotificationRoomManager#subscribe(String, String, ParticipantRequest)} . The user should
   * be responded with generated SPD answer from the local WebRTC endpoint.
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param sdpAnswer
   *          String with generated SPD answer from the local WebRTC endpoint
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the operation was unsuccessful and the user should be responded
   *          accordingly.
   */
  void onSubscribe(ParticipantRequest request, String sdpAnswer, OpenViduException error);

  /**
   * Called as a result of {@link NotificationRoomManager#unsubscribe(String, ParticipantRequest)}.
   * The user should receive an acknowledgement if the operation completed successfully (no error).
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the operation was unsuccessful and the user should be responded
   *          accordingly.
   */
  void onUnsubscribe(ParticipantRequest request, OpenViduException error);

  /**
   * Called as a result of
   * {@link NotificationRoomManager#sendMessage(String, String, String, ParticipantRequest)} . The
   * user should receive an acknowledgement if the operation completed successfully, and all the
   * peers in the room should be notified with the message contents and its origin.
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param message
   *          String with the message body
   * @param userName
   *          name of the peer that sent it
   * @param roomName
   *          the current room name
   * @param participants
   *          instances of {@link UserParticipant} for ALL the participants in the room (includes
   *          the sender)
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the operation was unsuccessful and the user should be responded
   *          accordingly.
   */
  void onSendMessage(ParticipantRequest request, String message, String userName, String roomName,
      Set<UserParticipant> participants, OpenViduException error);

  /**
   * Called as a result of
   * {@link NotificationRoomManager#onIceCandidate(String, String, int, String, ParticipantRequest)}
   * . The user should receive an acknowledgement if the operation completed successfully (no
   * error).
   *
   * @param request
   *          instance of {@link ParticipantRequest} POJO to identify the user and the request
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message. If not
   *          null, then the operation was unsuccessful and the user should be responded
   *          accordingly.
   */
  void onRecvIceCandidate(ParticipantRequest request, OpenViduException error);

  /**
   * Called as a result of {@link NotificationRoomManager#closeRoom(String)} -
   * application-originated method, not as a consequence of a client request. All resources on the
   * server, associated with the room, have been released. The existing participants in the room
   * should be notified of this event so that the client-side application acts accordingly.
   *
   * @param roomName
   *          the room that's just been closed
   * @param participants
   *          instances of {@link UserParticipant} POJO representing the peers of the closed room
   */
  void onRoomClosed(String roomName, Set<UserParticipant> participants);

  /**
   * Called as a result of {@link NotificationRoomManager#evictParticipant(String)} -
   * application-originated method, not as a consequence of a client request. The participant should
   * be notified so that the client-side application would terminate gracefully.
   *
   * @param participant
   *          instance of {@link UserParticipant} POJO representing the evicted peer
   */
  void onParticipantEvicted(UserParticipant participant);
}
