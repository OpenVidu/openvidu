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
 */

package io.openvidu.server.core.api.pojo;

/**
 * This POJO uniquely identifies a participant's request.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 *
 */
public class ParticipantRequest {
  private String requestId = null;
  private String participantId = null;

  public ParticipantRequest(String participantId, String requestId) {
    super();
    this.requestId = requestId;
    this.participantId = participantId;
  }

  public String getRequestId() {
    return requestId;
  }

  public void setRequestId(String id) {
    this.requestId = id;
  }

  public String getParticipantId() {
    return participantId;
  }

  public void setParticipantId(String participantId) {
    this.participantId = participantId;
  }

  @Override
  public int hashCode() {
    final int prime = 31;
    int result = 1;
    result = prime * result + (requestId == null ? 0 : requestId.hashCode());
    result = prime * result + (participantId == null ? 0 : participantId.hashCode());
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
    if (!(obj instanceof ParticipantRequest)) {
      return false;
    }
    ParticipantRequest other = (ParticipantRequest) obj;
    if (requestId == null) {
      if (other.requestId != null) {
        return false;
      }
    } else if (!requestId.equals(other.requestId)) {
      return false;
    }
    if (participantId == null) {
      if (other.participantId != null) {
        return false;
      }
    } else if (!participantId.equals(other.participantId)) {
      return false;
    }
    return true;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("[");
    if (requestId != null) {
      builder.append("requestId=").append(requestId).append(", ");
    }
    if (participantId != null) {
      builder.append("participantId=").append(participantId);
    }
    builder.append("]");
    return builder.toString();
  }
}
