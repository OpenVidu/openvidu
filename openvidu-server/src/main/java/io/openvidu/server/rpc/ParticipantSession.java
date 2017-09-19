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
 *
 */

package io.openvidu.server.rpc;

/**
 * Participant information that should be stored in the WebSocket session.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class ParticipantSession {
  public static final String SESSION_KEY = "participant";

  private String participantName;
  private String roomName;
  private boolean dataChannels = false;

  public ParticipantSession() {
  }

  public String getParticipantName() {
    return participantName;
  }

  public void setParticipantName(String participantName) {
    this.participantName = participantName;
  }

  public String getRoomName() {
    return roomName;
  }

  public void setRoomName(String roomName) {
    this.roomName = roomName;
  }

  public boolean useDataChannels() {
    return dataChannels;
  }

  public void setDataChannels(boolean dataChannels) {
    this.dataChannels = dataChannels;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("[");
    if (participantName != null) {
      builder.append("participantName=").append(participantName).append(", ");
    }
    if (roomName != null) {
      builder.append("roomName=").append(roomName).append(", ");
    }
    builder.append("useDataChannels=").append(dataChannels);
    builder.append("]");
    return builder.toString();
  }
}
