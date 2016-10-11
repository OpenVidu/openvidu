package org.openvidu.demo;

import java.util.SortedMap;

import org.kurento.client.Continuation;
import org.kurento.client.Filter;
import org.kurento.module.markerdetector.ArMarkerdetector;
import org.openvidu.client.internal.ProtocolElements;
import org.openvidu.server.core.api.UserNotificationService;
import org.openvidu.server.core.internal.DefaultNotificationRoomHandler;
import org.openvidu.server.core.internal.Participant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

public class DemoNotificationRoomHandler extends DefaultNotificationRoomHandler {

  private static final Logger log = LoggerFactory.getLogger(DemoNotificationRoomHandler.class);
  private SortedMap<Integer, String> markerUrls;

  private UserNotificationService notifService;

  public DemoNotificationRoomHandler(UserNotificationService notifService) {
    super(notifService);

    this.notifService = notifService;
  }

  @Override
  public void updateFilter(String roomName, Participant participant, String filterId,
      String state) {
    Integer newState = -1;

    if (state != null) {
      newState = Integer.parseInt(state);
    }

    String url = markerUrls.get(newState);

    JsonObject notificationParams = new JsonObject();
    notificationParams.addProperty("MarkerFilterState", newState);

    notifService.sendNotification(participant.getId(), ProtocolElements.CUSTOM_NOTIFICATION,
        notificationParams);

    ArMarkerdetector newFilter;
    Filter filter = participant.getFilterElement(filterId);

    if (filter == null) {
      newFilter = new ArMarkerdetector.Builder(participant.getPipeline()).build();
      log.info("New {} filter for participant {}", filterId, participant.getId());
      participant.addFilterElement(filterId, newFilter);
    } else {
      log.info("Reusing {} filter in participant {}", filterId, participant.getId());
      newFilter = (ArMarkerdetector) filter;
    }

    if (url != null) {
      newFilter.setOverlayImage(url, new Continuation<Void>() {
        @Override
        public void onSuccess(Void result) throws Exception {

        }

        @Override
        public void onError(Throwable cause) throws Exception {

        }
      });
      newFilter.setOverlayScale(1.0F, new Continuation<Void>() {
        @Override
        public void onSuccess(Void result) throws Exception {

        }

        @Override
        public void onError(Throwable cause) throws Exception {

        }
      });
    } else {
      newFilter.setOverlayScale(0.0001F, new Continuation<Void>() {
        @Override
        public void onSuccess(Void result) throws Exception {

        }

        @Override
        public void onError(Throwable cause) throws Exception {

        }
      });
    }
  }

  @Override
  public String getNextFilterState(String filterId, String oldState) {
    Integer currentUrlIndex;

    if (oldState == null) {
      currentUrlIndex = -1;
    } else {
      currentUrlIndex = Integer.parseInt(oldState);
    }

    Integer nextIndex = -1; // disable filter

    if (currentUrlIndex < markerUrls.firstKey()) {
      nextIndex = markerUrls.firstKey(); // enable filter using first URL
    } else if (currentUrlIndex < markerUrls.lastKey()) {
      nextIndex = markerUrls.tailMap(currentUrlIndex + 1).firstKey();
    }

    return nextIndex.toString();
  }

  public void setMarkerUrls(SortedMap<Integer, String> markerUrls) {
    this.markerUrls = markerUrls;
  }
}
