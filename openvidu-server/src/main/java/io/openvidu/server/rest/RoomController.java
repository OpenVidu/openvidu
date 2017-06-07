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
package io.openvidu.server.rest;

import static org.kurento.commons.PropertiesManager.getProperty;

import java.util.Map;
import java.util.Set;
import org.json.simple.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import io.openvidu.client.OpenViduException;
import io.openvidu.server.core.NotificationRoomManager;
import io.openvidu.server.security.ParticipantRole;

/**
 *
 * @author Raquel Díaz González
 */
@RestController
@RequestMapping("/api")
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
  
  @RequestMapping(value = "/sessions", method = RequestMethod.POST)
  public ResponseEntity<JSONObject> getSessionId() {
	  String sessionId = roomManager.newSessionId();
	  JSONObject responseJson = new JSONObject();
	  responseJson.put("id", sessionId);
	  return new ResponseEntity<JSONObject>(responseJson, HttpStatus.OK);
  }
  
  @RequestMapping(value = "/tokens", method = RequestMethod.POST)
  public ResponseEntity<JSONObject> newToken(@RequestBody Map sessionIdRoleMetadata) { // {0: sessionID, 1: role, 2: metadata}
	  String errorMessage = "";
	  try {
		  String sessionId = (String) sessionIdRoleMetadata.get("session");
		  ParticipantRole role = ParticipantRole.valueOf((String) sessionIdRoleMetadata.get("role"));
		  String metadata = (String) sessionIdRoleMetadata.get("data");
		  String token = roomManager.newToken(sessionId, role, metadata);
		  JSONObject responseJson = new JSONObject();
		  responseJson.put("id", token);
		  responseJson.put("session", sessionId);
		  responseJson.put("role", role.toString());
		  responseJson.put("data", metadata);
		  responseJson.put("token", token);
		  return new ResponseEntity<JSONObject>(responseJson, HttpStatus.OK);
	  }
	  catch (IllegalArgumentException e){
		  return this.generateErrorResponse("Role " + sessionIdRoleMetadata.get("1") + " is not defined");
	  } catch (OpenViduException e) {
		  return this.generateErrorResponse("Metadata [" + sessionIdRoleMetadata.get("2") + "] unexpected format. Max length allowed is 1000 chars");
	  }
  }
  
  private ResponseEntity<JSONObject> generateErrorResponse(String errorMessage){
	  JSONObject responseJson = new JSONObject();
	  responseJson.put("timestamp", System.currentTimeMillis());
	  responseJson.put("status", HttpStatus.BAD_REQUEST.value());
	  responseJson.put("error", HttpStatus.BAD_REQUEST.getReasonPhrase());
	  responseJson.put("message", errorMessage);
	  responseJson.put("path", "/newToken");
	  return new ResponseEntity<JSONObject>(responseJson, HttpStatus.BAD_REQUEST);
  }
}
