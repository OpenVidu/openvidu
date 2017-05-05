/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
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

import java.util.List;
import java.util.Map.Entry;
import java.util.SortedMap;
import java.util.TreeMap;

import org.kurento.commons.ConfigFileManager;
import org.kurento.commons.PropertiesManager;
import org.kurento.jsonrpc.JsonUtils;
import org.openvidu.server.OpenViduServer;
import org.openvidu.server.core.NotificationRoomManager;
import org.openvidu.server.kms.KmsManager;
import org.openvidu.server.rpc.JsonRpcUserControl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.Bean;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import static org.kurento.commons.PropertiesManager.getPropertyJson;

/**
 * Demo application for Kurento Room, extends the Room Server application class. Uses the Room
 * Client JS library for the web client, which is built with AngularJS and lumx.
 *
 * @author Micael Gallego (micael.gallego@gmail.com)
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 5.0.0
 */
public class OpenViduSampleApp extends OpenViduServer {

  private static final Logger log = LoggerFactory.getLogger(OpenViduSampleApp.class);

  public final static String KROOMDEMO_CFG_FILENAME = "kurento-room-demo.conf.json";

  private static JsonObject DEFAULT_HAT_COORDS = new JsonObject();
  private static JsonObject DEFAULT_MARKER_URLS = new JsonObject();

  static {
    ConfigFileManager.loadConfigFile(KROOMDEMO_CFG_FILENAME);
    DEFAULT_HAT_COORDS.addProperty("offsetXPercent", -0.35F);
    DEFAULT_HAT_COORDS.addProperty("offsetYPercent", -1.2F);
    DEFAULT_HAT_COORDS.addProperty("widthPercent", 1.6F);
    DEFAULT_HAT_COORDS.addProperty("heightPercent", 1.6F);

    DEFAULT_MARKER_URLS.addProperty("0", "kurento-rect-logo.png");
  }

  private static final String IMG_FOLDER = "img/";

  private final static String DEFAULT_APP_SERVER_URL =
      PropertiesManager.getProperty("app.uri", "https://localhost:8443");
  private final static String APP_SERVER_URL =
      System.getProperty("app.server.url", DEFAULT_APP_SERVER_URL);

  private final Integer DEMO_KMS_NODE_LIMIT = PropertiesManager.getProperty("demo.kmsLimit", 1000);
  private final String DEMO_AUTH_REGEX = PropertiesManager.getProperty("demo.authRegex");

  public final static String DEMO_FILTER_TYPE =
      PropertiesManager.getProperty("demo.filterType", "hat");

  private final String DEMO_HAT_URL =
      PropertiesManager.getProperty("demo.hatUrl", "mario-wings.png");
  private final JsonObject DEMO_HAT_COORDS = PropertiesManager
      .getPropertyJson("demo.hatCoords", DEFAULT_HAT_COORDS.toString(), JsonObject.class);

  private final JsonObject DEMO_MARKER_URLS = PropertiesManager
      .getPropertyJson("demo.markerUrls", DEFAULT_MARKER_URLS.toString(), JsonObject.class);

  @Override
  public KmsManager kmsManager() {
    JsonArray kmsUris = getPropertyJson(OpenViduServer.KMSS_URIS_PROPERTY,
        OpenViduServer.KMSS_URIS_DEFAULT, JsonArray.class);
    List<String> kmsWsUris = JsonUtils.toStringList(kmsUris);

    log.info("Configuring Kurento Room Server to use the following kmss: {}", kmsWsUris);

    FixedNKmsManager fixedKmsManager = new FixedNKmsManager(kmsWsUris, DEMO_KMS_NODE_LIMIT);
    fixedKmsManager.setAuthRegex(DEMO_AUTH_REGEX);
    log.debug("Authorization regex for new rooms: {}", DEMO_AUTH_REGEX);
    return fixedKmsManager;
  }

  @Override
  public JsonRpcUserControl userControl() {
    DemoJsonRpcUserControl uc = new DemoJsonRpcUserControl(notificationRoomManager());

    KmsFilterType type = KmsFilterType.parseType(DEMO_FILTER_TYPE);
    log.info("Configuring demo with filter type: {} (parsed is {})", DEMO_FILTER_TYPE, type);

    uc.setFilterType(type);

    switch (type) {
      case MARKER:
        SortedMap<Integer, String> sortedUrls = new TreeMap<>();
        getMarkerUrls(sortedUrls);
        uc.setMarkerUrls(sortedUrls);
        break;
      case HAT:
      default:
        uc.setHatUrl(getFullUrl(DEMO_HAT_URL));
        uc.setHatCoords(DEMO_HAT_COORDS);
    }

    return uc;
  }

  @Bean
  public NotificationRoomManager notificationRoomManager() {
    DemoNotificationRoomHandler notificationRoomHandler =
        new DemoNotificationRoomHandler(notificationService());

    KmsFilterType type = KmsFilterType.parseType(DEMO_FILTER_TYPE);

    switch (type) {
      case MARKER:
        SortedMap<Integer, String> sortedUrls = new TreeMap<>();
        getMarkerUrls(sortedUrls);

        notificationRoomHandler.setMarkerUrls(sortedUrls);
        break;
      default:
    }

    return new NotificationRoomManager();
  }

  private void getMarkerUrls(SortedMap<Integer, String> sortedUrls) {
    for (Entry<String, JsonElement> entry : DEMO_MARKER_URLS.entrySet()) {
      try {
        Integer order = Integer.parseInt(entry.getKey());
        if (order < 0) {
          throw new Exception("Illegal configuration, marker url index has to be positive");
        }
        String url = entry.getValue().getAsString();
        sortedUrls.put(order, getFullUrl(url));
      } catch (Exception e) {
        log.warn("Unable to process marker url [{}] from config file {}", entry,
            KROOMDEMO_CFG_FILENAME, e);
      }
    }
  }

  private static String getFullUrl(String url) {
    if (APP_SERVER_URL.endsWith("/")) {
      return APP_SERVER_URL + IMG_FOLDER + url;
    } else {
      return APP_SERVER_URL + "/" + IMG_FOLDER + url;
    }
  }

  public static void main(String[] args) throws Exception {
    log.info("Using /dev/urandom for secure random generation");
    System.setProperty("java.security.egd", "file:/dev/./urandom");
    SpringApplication.run(OpenViduSampleApp.class, args);
  }
}
