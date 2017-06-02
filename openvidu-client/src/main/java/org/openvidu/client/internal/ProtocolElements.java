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

package org.openvidu.client.internal;

/**
 * This class defines constant values of client-server messages and their parameters.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class ProtocolElements {

  // ---------------------------- CLIENT REQUESTS -----------------------

  public static final String SENDMESSAGE_ROOM_METHOD = "sendMessage";
  public static final String SENDMESSAGE_USER_PARAM = "userMessage";
  public static final String SENDMESSAGE_ROOM_PARAM = "roomMessage";
  public static final String SENDMESSAGE_MESSAGE_PARAM = "message";

  public static final String LEAVEROOM_METHOD = "leaveRoom";

  public static final String JOINROOM_METHOD = "joinRoom";
  public static final String JOINROOM_USER_PARAM = "user";
  public static final String JOINROOM_TOKEN_PARAM = "token";
  public static final String JOINROOM_ROOM_PARAM = "session";
  public static final String JOINROOM_METADATA_PARAM = "metadata";
  public static final String JOINROOM_DATACHANNELS_PARAM = "dataChannels";
  public static final String JOINROOM_PEERID_PARAM = "id";
  public static final String JOINROOM_PEERSTREAMS_PARAM = "streams";
  public static final String JOINROOM_PEERSTREAMID_PARAM = "id";

  public static final String PUBLISHVIDEO_METHOD = "publishVideo";
  public static final String PUBLISHVIDEO_SDPOFFER_PARAM = "sdpOffer";
  public static final String PUBLISHVIDEO_DOLOOPBACK_PARAM = "doLoopback";
  public static final String PUBLISHVIDEO_SDPANSWER_PARAM = "sdpAnswer";

  public static final String UNPUBLISHVIDEO_METHOD = "unpublishVideo";

  public static final String RECEIVEVIDEO_METHOD = "receiveVideoFrom";
  public static final String RECEIVEVIDEO_SDPOFFER_PARAM = "sdpOffer";
  public static final String RECEIVEVIDEO_SENDER_PARAM = "sender";
  public static final String RECEIVEVIDEO_SDPANSWER_PARAM = "sdpAnswer";

  public static final String UNSUBSCRIBEFROMVIDEO_METHOD = "unsubscribeFromVideo";
  public static final String UNSUBSCRIBEFROMVIDEO_SENDER_PARAM = "sender";

  public static final String ONICECANDIDATE_METHOD = "onIceCandidate";
  public static final String ONICECANDIDATE_EPNAME_PARAM = "endpointName";
  public static final String ONICECANDIDATE_CANDIDATE_PARAM = "candidate";
  public static final String ONICECANDIDATE_SDPMIDPARAM = "sdpMid";
  public static final String ONICECANDIDATE_SDPMLINEINDEX_PARAM = "sdpMLineIndex";

  public static final String CUSTOMREQUEST_METHOD = "customRequest";

  // ---------------------------- SERVER RESPONSES & EVENTS -----------------

  public static final String PARTICIPANTJOINED_METHOD = "participantJoined";
  public static final String PARTICIPANTJOINED_USER_PARAM = "id";
  public static final String PARTICIPANTJOINED_METADATA_PARAM = "metadata";

  public static final String PARTICIPANTLEFT_METHOD = "participantLeft";
  public static final String PARTICIPANTLEFT_NAME_PARAM = "name";

  public static final String PARTICIPANTEVICTED_METHOD = "participantEvicted";

  public static final String PARTICIPANTPUBLISHED_METHOD = "participantPublished";
  public static final String PARTICIPANTPUBLISHED_USER_PARAM = "id";
  public static final String PARTICIPANTPUBLISHED_STREAMS_PARAM = "streams";
  public static final String PARTICIPANTPUBLISHED_STREAMID_PARAM = "id";

  public static final String PARTICIPANTUNPUBLISHED_METHOD = "participantUnpublished";
  public static final String PARTICIPANTUNPUBLISHED_NAME_PARAM = "name";

  public static final String PARTICIPANTSENDMESSAGE_METHOD = "sendMessage";
  public static final String PARTICIPANTSENDMESSAGE_USER_PARAM = "user";
  public static final String PARTICIPANTSENDMESSAGE_ROOM_PARAM = "room";
  public static final String PARTICIPANTSENDMESSAGE_MESSAGE_PARAM = "message";

  public static final String ROOMCLOSED_METHOD = "roomClosed";
  public static final String ROOMCLOSED_ROOM_PARAM = "room";

  public static final String MEDIAERROR_METHOD = "mediaError";
  public static final String MEDIAERROR_ERROR_PARAM = "error";

  public static final String ICECANDIDATE_METHOD = "iceCandidate";
  public static final String ICECANDIDATE_EPNAME_PARAM = "endpointName";
  public static final String ICECANDIDATE_CANDIDATE_PARAM = "candidate";
  public static final String ICECANDIDATE_SDPMID_PARAM = "sdpMid";
  public static final String ICECANDIDATE_SDPMLINEINDEX_PARAM = "sdpMLineIndex";

  public static final String CUSTOM_NOTIFICATION = "custonNotification";
}
