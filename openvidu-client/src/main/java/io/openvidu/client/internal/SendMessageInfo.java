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
 * @see Notification
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class SendMessageInfo extends Notification {

  private String room;
  private String user;
  private String message;

  public SendMessageInfo(String room, String user, String message) {
    super(ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD);
    this.room = room;
    this.user = user;
    this.message = message;
  }

  public String getRoom() {
    return room;
  }

  public void setRoom(String room) {
    this.room = room;
  }

  public String getUser() {
    return user;
  }

  public void setUser(String user) {
    this.user = user;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("[");
    if (getMethod() != null) {
      builder.append("method=").append(getMethod()).append(", ");
    }
    if (room != null) {
      builder.append("room=").append(room).append(", ");
    }
    if (user != null) {
      builder.append("user=").append(user).append(", ");
    }
    if (message != null) {
      builder.append("message=").append(message);
    }
    builder.append("]");
    return builder.toString();
  }
}
