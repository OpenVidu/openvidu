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
package org.openvidu.server.rest;

import static org.kurento.commons.PropertiesManager.getProperty;

import java.util.Set;

import org.openvidu.server.core.NotificationRoomManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author Raquel Díaz González
 */
@RestController
public class RoomController {

  private static final int UPDATE_SPEAKER_INTERVAL_DEFAULT = 1800;
  private static final int THRESHOLD_SPEAKER_DEFAULT = -50;

  @Autowired
  private NotificationRoomManager roomManager;

  @RequestMapping("/getAllRooms")
  public Set<String> getAllRooms() {
    return roomManager.getRooms();
  }

  @RequestMapping("/getUpdateSpeakerInterval")
  public Integer getUpdateSpeakerInterval() {
    return Integer.valueOf(getProperty("updateSpeakerInterval", UPDATE_SPEAKER_INTERVAL_DEFAULT));
  }

  @RequestMapping("/getThresholdSpeaker")
  public Integer getThresholdSpeaker() {
    return Integer.valueOf(getProperty("thresholdSpeaker", THRESHOLD_SPEAKER_DEFAULT));
  }
  
  @RequestMapping("/getSessionId")
  public ResponseEntity<String> getSessionId() {
	  return new ResponseEntity<String>("SUPER_SESSIONID", HttpStatus.OK);
  }
  
  @RequestMapping("/getToken")
  public ResponseEntity<String> getToken() {
	  return new ResponseEntity<String>("SUPER_TOKEN", HttpStatus.OK);
  }
}
