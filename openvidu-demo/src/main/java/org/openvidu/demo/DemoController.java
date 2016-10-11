/*
 * (C) Copyright 2016 Kurento (http://kurento.org/)
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
 *
 */
package org.openvidu.demo;

import org.kurento.commons.PropertiesManager;
import org.openvidu.client.OpenViduException;
import org.openvidu.server.core.NotificationRoomManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Rest controller for the room demo app.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.0.0
 */
@RestController
public class DemoController {

  private static final Logger log = LoggerFactory.getLogger(DemoController.class);

  private final static boolean DEMO_LOOPBACK_REMOTE = PropertiesManager
      .getProperty("demo.loopback.remote", false);
  private final static boolean DEMO_LOOPBACK_AND_LOCAL = PropertiesManager
      .getProperty("demo.loopback.andLocal", false);

  private static ClientConfig config;

  static {
    config = new ClientConfig();
    config.setLoopbackRemote(DEMO_LOOPBACK_REMOTE);
    config.setLoopbackAndLocal(DEMO_LOOPBACK_AND_LOCAL);
    config.setFilterRequestParam(
        KmsFilterType.parseType(OpenViduSampleApp.DEMO_FILTER_TYPE).getCustomRequestParam());
    log.info("Set client config: {}", config);
  }

  @Autowired
  private NotificationRoomManager roomManager;

  @ResponseStatus(value = HttpStatus.NOT_FOUND)
  public class ResourceNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public ResourceNotFoundException(String msg) {
      super(msg);
    }
  }

  @RequestMapping("/close")
  public void closeRoom(@RequestParam("room") String room) {
    log.warn("Trying to close the room '{}'", room);
    if (!roomManager.getRooms().contains(room)) {
      log.warn("Unable to close room '{}', not found.", room);
      throw new ResourceNotFoundException("Room '" + room + "' not found");
    }
    try {
      roomManager.closeRoom(room);
    } catch (OpenViduException e) {
      log.warn("Error closing room {}", room, e);
      throw new ResourceNotFoundException(e.getMessage());
    }
  }

  @RequestMapping("/getClientConfig")
  public ClientConfig clientConfig() {
    log.debug("Sending client config {}", config);
    return config;
  }
}
