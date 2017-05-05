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

package org.openvidu.demo;

import java.io.IOException;
import java.util.SortedMap;

import org.kurento.client.FaceOverlayFilter;
import org.kurento.client.MediaElement;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.message.Request;
import org.openvidu.server.core.NotificationRoomManager;
import org.openvidu.server.core.api.pojo.ParticipantRequest;
import org.openvidu.server.rpc.JsonRpcUserControl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

/**
 * User control that applies a media filter when publishing video.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 */
public class DemoJsonRpcUserControl extends JsonRpcUserControl {

  private static final String SESSION_ATTRIBUTE_FILTER = "customFilter";
  private static final String MARKER_ID = "markerFilterId";

  private static final Logger log = LoggerFactory.getLogger(DemoJsonRpcUserControl.class);

  private KmsFilterType filterType = KmsFilterType.HAT;

  private String hatUrl;
  private float offsetXPercent;
  private float offsetYPercent;
  private float widthPercent;
  private float heightPercent;

  private SortedMap<Integer, String> markerUrls;

  public DemoJsonRpcUserControl(NotificationRoomManager roomManager) {
    //super(roomManager);
  }

  public void setFilterType(KmsFilterType type) {
    this.filterType = type;
  }

  public void setHatUrl(String hatUrl) {
    this.hatUrl = hatUrl;
    log.info("Hat URL: {}", hatUrl);
  }

  public void setMarkerUrls(SortedMap<Integer, String> urls) {
    this.markerUrls = urls;
    log.info("Marker URL: {}", markerUrls);
  }

  public void setHatCoords(JsonObject hatCoords) {
    if (hatCoords.get("offsetXPercent") != null) {
      offsetXPercent = hatCoords.get("offsetXPercent").getAsFloat();
    }
    if (hatCoords.get("offsetYPercent") != null) {
      offsetYPercent = hatCoords.get("offsetYPercent").getAsFloat();
    }
    if (hatCoords.get("widthPercent") != null) {
      widthPercent = hatCoords.get("widthPercent").getAsFloat();
    }
    if (hatCoords.get("heightPercent") != null) {
      heightPercent = hatCoords.get("heightPercent").getAsFloat();
    }
    log.info("Hat coords:\n\toffsetXPercent = {}\n\toffsetYPercent = {}"
            + "\n\twidthPercent = {}\n\theightPercent = {}", offsetXPercent, offsetYPercent,
        widthPercent, heightPercent);
  }

  @Override
  public void customRequest(Transaction transaction, Request<JsonObject> request,
      ParticipantRequest participantRequest) {
    try {
      if (request.getParams() == null
          || request.getParams().get(filterType.getCustomRequestParam()) == null) {
        throw new RuntimeException(
            "Request element '" + filterType.getCustomRequestParam() + "' is missing");
      }
      switch (filterType) {
        case MARKER:
          handleMarkerRequest(transaction, request, participantRequest);
          break;
        case HAT:
        default:
          handleHatRequest(transaction, request, participantRequest);
      }
    } catch (Exception e) {
      log.error("Unable to handle custom request", e);
      try {
        transaction.sendError(e);
      } catch (IOException e1) {
        log.warn("Unable to send error response", e1);
      }
    }
  }

  private void handleHatRequest(Transaction transaction, Request<JsonObject> request,
      ParticipantRequest participantRequest) throws IOException {
    boolean filterOn = request.getParams().get(filterType.getCustomRequestParam()).getAsBoolean();
    String pid = participantRequest.getParticipantId();
    if (filterOn) {
      if (transaction.getSession().getAttributes().containsKey(SESSION_ATTRIBUTE_FILTER)) {
        throw new RuntimeException(filterType + " filter already on");
      }
      log.info("Applying {} filter to session {}", filterType, pid);

      FaceOverlayFilter filter =
          new FaceOverlayFilter.Builder(roomManager.getPipeline(pid)).build();
      filter.setOverlayedImage(this.hatUrl, this.offsetXPercent, this.offsetYPercent,
          this.widthPercent, this.heightPercent);

      addFilter(transaction, pid, filter);
    } else {
      removeFilter(transaction, pid);
    }
    transaction.sendResponse(new JsonObject());
  }

  private void handleMarkerRequest(final Transaction transaction, Request<JsonObject> request,
      ParticipantRequest participantRequest) throws IOException {
    Integer currentUrlIndex =
        request.getParams().get(filterType.getCustomRequestParam()).getAsInt();
    String pid = participantRequest.getParticipantId();

    roomManager.updateFilter(roomManager.getRoomManager().getRoomName(pid), MARKER_ID);

    JsonObject result = new JsonObject();
    // TODO: Change RPC to remove next index requirement
    // result.addProperty(filterType.getCustomRequestParam(), 0);
    transaction.sendResponse(result);
  }

  private void addFilter(Transaction transaction, String pid, MediaElement filter) {
    roomManager.addMediaElement(pid, filter);
    transaction.getSession().getAttributes().put(SESSION_ATTRIBUTE_FILTER, filter);
  }

  private void removeFilter(Transaction transaction, String pid) {
    if (!transaction.getSession().getAttributes().containsKey(SESSION_ATTRIBUTE_FILTER)) {
      throw new RuntimeException("This user has no " + filterType + " filter yet");
    }
    log.info("Removing {} filter from session {}", filterType, pid);
    roomManager.removeMediaElement(pid,
        (MediaElement) transaction.getSession().getAttributes().get(SESSION_ATTRIBUTE_FILTER));
    transaction.getSession().getAttributes().remove(SESSION_ATTRIBUTE_FILTER);
  }
}
