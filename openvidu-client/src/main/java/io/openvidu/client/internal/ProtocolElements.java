/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

package io.openvidu.client.internal;

/**
 * This class defines constant values of client-server messages and their
 * parameters.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class ProtocolElements {

	// ---------------------------- CLIENT REQUESTS -----------------------

	public static final String SENDMESSAGE_ROOM_METHOD = "sendMessage";
	public static final String SENDMESSAGE_MESSAGE_PARAM = "message";

	public static final String LEAVEROOM_METHOD = "leaveRoom";

	public static final String JOINROOM_METHOD = "joinRoom";
	public static final String JOINROOM_USER_PARAM = "user";
	public static final String JOINROOM_TOKEN_PARAM = "token";
	public static final String JOINROOM_ROOM_PARAM = "session";
	public static final String JOINROOM_METADATA_PARAM = "metadata";
	public static final String JOINROOM_SECRET_PARAM = "secret";
	public static final String JOINROOM_PLATFORM_PARAM = "platform";
	public static final String JOINROOM_RECORDER_PARAM = "recorder";

	public static final String JOINROOM_PEERID_PARAM = "id";
	public static final String JOINROOM_PEERCREATEDAT_PARAM = "createdAt";
	public static final String JOINROOM_PEERSTREAMS_PARAM = "streams";
	public static final String JOINROOM_PEERSTREAMID_PARAM = "id";
	public static final String JOINROOM_PEERSTREAMHASAUDIO_PARAM = "hasAudio";
	public static final String JOINROOM_PEERSTREAMHASVIDEO_PARAM = "hasVideo";
	public static final String JOINROOM_PEERSTREAMAUDIOACTIVE_PARAM = "audioActive";
	public static final String JOINROOM_PEERSTREAMVIDEOACTIVE_PARAM = "videoActive";
	public static final String JOINROOM_PEERSTREAMTYPEOFVIDEO_PARAM = "typeOfVideo";
	public static final String JOINROOM_PEERSTREAMFRAMERATE_PARAM = "frameRate";
	public static final String JOINROOM_PEERSTREAMVIDEODIMENSIONS_PARAM = "videoDimensions";
	public static final String JOINROOM_PEERSTREAMFILTER_PARAM = "filter";

	public static final String PUBLISHVIDEO_METHOD = "publishVideo";
	public static final String PUBLISHVIDEO_SDPOFFER_PARAM = "sdpOffer";
	public static final String PUBLISHVIDEO_DOLOOPBACK_PARAM = "doLoopback";
	public static final String PUBLISHVIDEO_SDPANSWER_PARAM = "sdpAnswer";
	public static final String PUBLISHVIDEO_STREAMID_PARAM = "id";
	public static final String PUBLISHVIDEO_CREATEDAT_PARAM = "createdAt";
	public static final String PUBLISHVIDEO_HASAUDIO_PARAM = "hasAudio";
	public static final String PUBLISHVIDEO_HASVIDEO_PARAM = "hasVideo";
	public static final String PUBLISHVIDEO_AUDIOACTIVE_PARAM = "audioActive";
	public static final String PUBLISHVIDEO_VIDEOACTIVE_PARAM = "videoActive";
	public static final String PUBLISHVIDEO_TYPEOFVIDEO_PARAM = "typeOfVideo";
	public static final String PUBLISHVIDEO_FRAMERATE_PARAM = "frameRate";
	public static final String PUBLISHVIDEO_VIDEODIMENSIONS_PARAM = "videoDimensions";
	public static final String PUBLISHVIDEO_KURENTOFILTER_PARAM = "filter";

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

	public static final String STREAMPROPERTYCHANGED_METHOD = "streamPropertyChanged";
	public static final String STREAMPROPERTYCHANGED_CONNECTIONID_PARAM = "connectionId";
	public static final String STREAMPROPERTYCHANGED_STREAMID_PARAM = "streamId";
	public static final String STREAMPROPERTYCHANGED_PROPERTY_PARAM = "property";
	public static final String STREAMPROPERTYCHANGED_NEWVALUE_PARAM = "newValue";
	public static final String STREAMPROPERTYCHANGED_REASON_PARAM = "reason";

	public static final String FORCEDISCONNECT_METHOD = "forceDisconnect";
	public static final String FORCEDISCONNECT_CONNECTIONID_PARAM = "connectionId";

	public static final String FORCEUNPUBLISH_METHOD = "forceUnpublish";
	public static final String FORCEUNPUBLISH_STREAMID_PARAM = "streamId";

	public static final String APPLYFILTER_METHOD = "applyFilter";
	public static final String FILTER_STREAMID_PARAM = "streamId";
	public static final String FILTER_TYPE_PARAM = "type";
	public static final String FILTER_OPTIONS_PARAM = "options";
	public static final String FILTER_METHOD_PARAM = "method";
	public static final String FILTER_PARAMS_PARAM = "params";
	public static final String EXECFILTERMETHOD_METHOD = "execFilterMethod";
	public static final String EXECFILTERMETHOD_LASTEXECMETHOD_PARAM = "lastExecMethod";
	public static final String REMOVEFILTER_METHOD = "removeFilter";
	public static final String ADDFILTEREVENTLISTENER_METHOD = "addFilterEventListener";
	public static final String REMOVEFILTEREVENTLISTENER_METHOD = "removeFilterEventListener";

	public static final String FILTEREVENTDISPATCHED_METHOD = "filterEventDispatched";
	public static final String FILTEREVENTLISTENER_CONNECTIONID_PARAM = "connectionId";
	public static final String FILTEREVENTLISTENER_STREAMID_PARAM = "streamId";
	public static final String FILTEREVENTLISTENER_FILTERTYPE_PARAM = "filterType";
	public static final String FILTEREVENTLISTENER_EVENTTYPE_PARAM = "eventType";
	public static final String FILTEREVENTLISTENER_DATA_PARAM = "data";

	// ---------------------------- SERVER RESPONSES & EVENTS -----------------

	public static final String PARTICIPANTJOINED_METHOD = "participantJoined";
	public static final String PARTICIPANTJOINED_USER_PARAM = "id";
	public static final String PARTICIPANTJOINED_CREATEDAT_PARAM = "createdAt";
	public static final String PARTICIPANTJOINED_METADATA_PARAM = "metadata";

	public static final String PARTICIPANTLEFT_METHOD = "participantLeft";
	public static final String PARTICIPANTLEFT_NAME_PARAM = "connectionId";
	public static final String PARTICIPANTLEFT_REASON_PARAM = "reason";

	public static final String PARTICIPANTEVICTED_METHOD = "participantEvicted";
	public static final String PARTICIPANTEVICTED_CONNECTIONID_PARAM = "connectionId";
	public static final String PARTICIPANTEVICTED_REASON_PARAM = "reason";

	public static final String PARTICIPANTPUBLISHED_METHOD = "participantPublished";
	public static final String PARTICIPANTPUBLISHED_USER_PARAM = "id";
	public static final String PARTICIPANTPUBLISHED_STREAMS_PARAM = "streams";
	public static final String PARTICIPANTPUBLISHED_STREAMID_PARAM = "id";
	public static final String PARTICIPANTPUBLISHED_CREATEDAT_PARAM = "createdAt";
	public static final String PARTICIPANTPUBLISHED_HASAUDIO_PARAM = "hasAudio";
	public static final String PARTICIPANTPUBLISHED_HASVIDEO_PARAM = "hasVideo";
	public static final String PARTICIPANTPUBLISHED_AUDIOACTIVE_PARAM = "audioActive";
	public static final String PARTICIPANTPUBLISHED_VIDEOACTIVE_PARAM = "videoActive";
	public static final String PARTICIPANTPUBLISHED_TYPEOFVIDEO_PARAM = "typeOfVideo";
	public static final String PARTICIPANTPUBLISHED_FRAMERATE_PARAM = "frameRate";
	public static final String PARTICIPANTPUBLISHED_VIDEODIMENSIONS_PARAM = "videoDimensions";
	public static final String PARTICIPANTPUBLISHED_FILTER_PARAM = "filter";

	public static final String PARTICIPANTUNPUBLISHED_METHOD = "participantUnpublished";
	public static final String PARTICIPANTUNPUBLISHED_NAME_PARAM = "connectionId";
	public static final String PARTICIPANTUNPUBLISHED_REASON_PARAM = "reason";

	public static final String PARTICIPANTSENDMESSAGE_METHOD = "sendMessage";
	public static final String PARTICIPANTSENDMESSAGE_DATA_PARAM = "data";
	public static final String PARTICIPANTSENDMESSAGE_FROM_PARAM = "from";
	public static final String PARTICIPANTSENDMESSAGE_TYPE_PARAM = "type";

	public static final String ROOMCLOSED_METHOD = "roomClosed";
	public static final String ROOMCLOSED_ROOM_PARAM = "sessionId";

	public static final String MEDIAERROR_METHOD = "mediaError";
	public static final String MEDIAERROR_ERROR_PARAM = "error";

	public static final String ICECANDIDATE_METHOD = "iceCandidate";
	public static final String ICECANDIDATE_SENDERCONNECTIONID_PARAM = "senderConnectionId";
	public static final String ICECANDIDATE_EPNAME_PARAM = "endpointName";
	public static final String ICECANDIDATE_CANDIDATE_PARAM = "candidate";
	public static final String ICECANDIDATE_SDPMID_PARAM = "sdpMid";
	public static final String ICECANDIDATE_SDPMLINEINDEX_PARAM = "sdpMLineIndex";

	public static final String RECORDINGSTARTED_METHOD = "recordingStarted";
	public static final String RECORDINGSTARTED_ID_PARAM = "id";
	public static final String RECORDINGSTARTED_NAME_PARAM = "name";
	public static final String RECORDINGSTOPPED_REASON_PARAM = "reason";

	public static final String RECORDINGSTOPPED_METHOD = "recordingStopped";
	public static final String RECORDINGSTOPPED_ID_PARAM = "id";

	public static final String CUSTOM_NOTIFICATION = "custonNotification";

	public static final String RECORDER_PARTICIPANT_PUBLICID = "RECORDER";
}
