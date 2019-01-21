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

package io.openvidu.client;

import static io.openvidu.client.internal.ProtocolElements.CUSTOMREQUEST_METHOD;
import static io.openvidu.client.internal.ProtocolElements.JOINROOM_METHOD;
import static io.openvidu.client.internal.ProtocolElements.JOINROOM_PEERID_PARAM;
import static io.openvidu.client.internal.ProtocolElements.JOINROOM_PEERSTREAMID_PARAM;
import static io.openvidu.client.internal.ProtocolElements.JOINROOM_PEERSTREAMS_PARAM;
import static io.openvidu.client.internal.ProtocolElements.JOINROOM_ROOM_PARAM;
import static io.openvidu.client.internal.ProtocolElements.JOINROOM_USER_PARAM;
import static io.openvidu.client.internal.ProtocolElements.LEAVEROOM_METHOD;
import static io.openvidu.client.internal.ProtocolElements.ONICECANDIDATE_CANDIDATE_PARAM;
import static io.openvidu.client.internal.ProtocolElements.ONICECANDIDATE_EPNAME_PARAM;
import static io.openvidu.client.internal.ProtocolElements.ONICECANDIDATE_METHOD;
import static io.openvidu.client.internal.ProtocolElements.ONICECANDIDATE_SDPMIDPARAM;
import static io.openvidu.client.internal.ProtocolElements.ONICECANDIDATE_SDPMLINEINDEX_PARAM;
import static io.openvidu.client.internal.ProtocolElements.PUBLISHVIDEO_DOLOOPBACK_PARAM;
import static io.openvidu.client.internal.ProtocolElements.PUBLISHVIDEO_METHOD;
import static io.openvidu.client.internal.ProtocolElements.PUBLISHVIDEO_SDPANSWER_PARAM;
import static io.openvidu.client.internal.ProtocolElements.PUBLISHVIDEO_SDPOFFER_PARAM;
import static io.openvidu.client.internal.ProtocolElements.RECEIVEVIDEO_METHOD;
import static io.openvidu.client.internal.ProtocolElements.RECEIVEVIDEO_SDPANSWER_PARAM;
import static io.openvidu.client.internal.ProtocolElements.RECEIVEVIDEO_SDPOFFER_PARAM;
import static io.openvidu.client.internal.ProtocolElements.RECEIVEVIDEO_SENDER_PARAM;
import static io.openvidu.client.internal.ProtocolElements.SENDMESSAGE_MESSAGE_PARAM;
import static io.openvidu.client.internal.ProtocolElements.SENDMESSAGE_ROOM_METHOD;
import static io.openvidu.client.internal.ProtocolElements.UNPUBLISHVIDEO_METHOD;
import static io.openvidu.client.internal.ProtocolElements.UNSUBSCRIBEFROMVIDEO_METHOD;
import static io.openvidu.client.internal.ProtocolElements.UNSUBSCRIBEFROMVIDEO_SENDER_PARAM;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.eclipse.jetty.util.ssl.SslContextFactory;
import org.kurento.jsonrpc.client.JsonRpcClient;
import org.kurento.jsonrpc.client.JsonRpcClientWebSocket;
import org.kurento.jsonrpc.client.JsonRpcWSConnectionListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.internal.JsonRoomUtils;
import io.openvidu.client.internal.Notification;

/**
 * Java client for the room server.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class OpenViduClient {

  private static final Logger log = LoggerFactory.getLogger(OpenViduClient.class);

  private JsonRpcClient client;
  private ServerJsonRpcHandler handler;

  public OpenViduClient(String wsUri) {
    this(new JsonRpcClientWebSocket(wsUri, new JsonRpcWSConnectionListener() {

      @Override
      public void reconnected(boolean sameServer) {
      }

      @Override
      public void disconnected() {
        log.warn("JsonRpcWebsocket connection: Disconnected");
      }

      @Override
      public void connectionFailed() {
        log.warn("JsonRpcWebsocket connection: Connection failed");
      }

      @Override
      public void connected() {
      }

      @Override
      public void reconnecting() {
        log.warn("JsonRpcWebsocket connection: is reconnecting");
      }
    }, new SslContextFactory(true)));
  }

  public OpenViduClient(JsonRpcClient client) {
    this.client = client;
    this.handler = new ServerJsonRpcHandler();
    this.client.setServerRequestHandler(this.handler);
  }

  public OpenViduClient(JsonRpcClient client, ServerJsonRpcHandler handler) {
    this.client = client;
    this.handler = handler;
    this.client.setServerRequestHandler(this.handler);
  }

  public void close() throws IOException {
    this.client.close();
  }

  public Map<String, List<String>> joinRoom(String roomName, String userName)
      throws IOException {
        
    JsonObject params = new JsonObject();
    params.addProperty(JOINROOM_ROOM_PARAM, roomName);
    params.addProperty(JOINROOM_USER_PARAM, userName);

    JsonElement result = client.sendRequest(JOINROOM_METHOD, params);
    Map<String, List<String>> peers = new HashMap<String, List<String>>();
    JsonArray jsonPeers = JsonRoomUtils.getResponseProperty(result, "value", JsonArray.class);
    if (jsonPeers.size() > 0) {
      Iterator<JsonElement> peerIt = jsonPeers.iterator();
      while (peerIt.hasNext()) {
        JsonElement peer = peerIt.next();
        String peerId = JsonRoomUtils.getResponseProperty(peer, JOINROOM_PEERID_PARAM,
            String.class);
        List<String> streams = new ArrayList<String>();
        JsonArray jsonStreams = JsonRoomUtils.getResponseProperty(peer, JOINROOM_PEERSTREAMS_PARAM,
            JsonArray.class, true);
        if (jsonStreams != null) {
          Iterator<JsonElement> streamIt = jsonStreams.iterator();
          while (streamIt.hasNext()) {
            streams.add(JsonRoomUtils.getResponseProperty(streamIt.next(),
                JOINROOM_PEERSTREAMID_PARAM, String.class));
          }
        }
        peers.put(peerId, streams);
      }
    }
    return peers;
  }

  public void leaveRoom() throws IOException {
    client.sendRequest(LEAVEROOM_METHOD, new JsonObject());
  }

  public String publishVideo(String sdpOffer, boolean doLoopback) throws IOException {
    JsonObject params = new JsonObject();
    params.addProperty(PUBLISHVIDEO_SDPOFFER_PARAM, sdpOffer);
    params.addProperty(PUBLISHVIDEO_DOLOOPBACK_PARAM, doLoopback);
    JsonElement result = client.sendRequest(PUBLISHVIDEO_METHOD, params);
    return JsonRoomUtils.getResponseProperty(result, PUBLISHVIDEO_SDPANSWER_PARAM, String.class);
  }

  public void unpublishVideo() throws IOException {
    client.sendRequest(UNPUBLISHVIDEO_METHOD, new JsonObject());
  }

  // sender should look like 'username_streamId'
  public String receiveVideoFrom(String sender, String sdpOffer) throws IOException {
    JsonObject params = new JsonObject();
    params.addProperty(RECEIVEVIDEO_SENDER_PARAM, sender);
    params.addProperty(RECEIVEVIDEO_SDPOFFER_PARAM, sdpOffer);
    JsonElement result = client.sendRequest(RECEIVEVIDEO_METHOD, params);
    return JsonRoomUtils.getResponseProperty(result, RECEIVEVIDEO_SDPANSWER_PARAM, String.class);
  }

  // sender should look like 'username_streamId'
  public void unsubscribeFromVideo(String sender) throws IOException {
    JsonObject params = new JsonObject();
    params.addProperty(UNSUBSCRIBEFROMVIDEO_SENDER_PARAM, sender);
    client.sendRequest(UNSUBSCRIBEFROMVIDEO_METHOD, params);
  }

  public void onIceCandidate(String endpointName, String candidate, String sdpMid,
      int sdpMLineIndex) throws IOException {
    JsonObject params = new JsonObject();
    params.addProperty(ONICECANDIDATE_EPNAME_PARAM, endpointName);
    params.addProperty(ONICECANDIDATE_CANDIDATE_PARAM, candidate);
    params.addProperty(ONICECANDIDATE_SDPMIDPARAM, sdpMid);
    params.addProperty(ONICECANDIDATE_SDPMLINEINDEX_PARAM, sdpMLineIndex);
    client.sendRequest(ONICECANDIDATE_METHOD, params);
  }

  public void sendMessage(String userName, String roomName, String message) throws IOException {
    JsonObject params = new JsonObject();
    params.addProperty(SENDMESSAGE_MESSAGE_PARAM, message);
    client.sendRequest(SENDMESSAGE_ROOM_METHOD, params);
  }

  public JsonElement customRequest(JsonObject customReqParams) throws IOException {
    return client.sendRequest(CUSTOMREQUEST_METHOD, customReqParams);
  }

  /**
   * Polls the notifications list maintained by this client to obtain new events sent by server.
   * This method blocks until there is a notification to return. This is a one-time operation for
   * the returned element.
   *
   * @return a server notification object, null when interrupted while waiting
   */
  public Notification getServerNotification() {
    return this.handler.getNotification();
  }
}
