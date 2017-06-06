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

package io.openvidu.server.core.api.pojo;

/**
 * This POJO holds information about a room participant.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 *
 */
public class UserParticipant {
	
  private String participantId;
  private String userName;
  private String clientMetadata = "";
  private String serverMetadata = "";
  private boolean streaming = false;
  
  private final String METADATA_SEPARATOR = "%/%";

  public UserParticipant(String participantId, String userName, boolean streaming) {
    super();
    this.participantId = participantId;
    this.userName = userName;
    this.streaming = streaming;
  }
  
  public UserParticipant(String participantId, String userName, String clientMetadata, String serverMetadata, boolean streaming) {
    super();
    this.participantId = participantId;
    this.userName = userName;
    this.clientMetadata = clientMetadata;
    this.serverMetadata = serverMetadata;
    this.streaming = streaming;
  }

  public UserParticipant(String participantId, String userName) {
    super();
    this.participantId = participantId;
    this.userName = userName;
  }

  public String getParticipantId() {
    return participantId;
  }

  public void setParticipantId(String participantId) {
    this.participantId = participantId;
  }

  public String getUserName() {
    return userName;
  }

  public void setUserName(String userName) {
    this.userName = userName;
  }

  public String getClientMetadata() {
	return clientMetadata;
  }

  public void setClientMetadata(String clientMetadata) {
	this.clientMetadata = clientMetadata;
  }
  
  public String getServerMetadata() {
	return serverMetadata;
  }

  public void setServerMetadata(String serverMetadata) {
	this.serverMetadata = serverMetadata;
  }

  public boolean isStreaming() {
    return streaming;
  }

  public void setStreaming(boolean streaming) {
    this.streaming = streaming;
  }
  
  public String getFullMetadata(){
	  String fullMetadata;
	  if ((!this.clientMetadata.isEmpty()) && (!this.serverMetadata.isEmpty())){
		  fullMetadata = this.clientMetadata + METADATA_SEPARATOR + this.serverMetadata;
	  }
	  else {
		  fullMetadata = this.clientMetadata + this.serverMetadata;
	  }
	  return fullMetadata;
  }

  @Override
  public int hashCode() {
    final int prime = 31;
    int result = 1;
    result = prime * result + (participantId == null ? 0 : participantId.hashCode());
    result = prime * result + (streaming ? 1231 : 1237);
    result = prime * result + (userName == null ? 0 : userName.hashCode());
    return result;
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null) {
      return false;
    }
    if (!(obj instanceof UserParticipant)) {
      return false;
    }
    UserParticipant other = (UserParticipant) obj;
    if (participantId == null) {
      if (other.participantId != null) {
        return false;
      }
    } else if (!participantId.equals(other.participantId)) {
      return false;
    }
    if (streaming != other.streaming) {
      return false;
    }
    if (userName == null) {
      if (other.userName != null) {
        return false;
      }
    } else if (!userName.equals(other.userName)) {
      return false;
    }
    return true;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("[");
    if (participantId != null) {
      builder.append("participantId=").append(participantId).append(", ");
    }
    if (userName != null) {
      builder.append("userName=").append(userName).append(", ");
    }
    builder.append("streaming=").append(streaming).append("]");
    return builder.toString();
  }
}
