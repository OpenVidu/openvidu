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
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 *
 * @see Notification
 */
public class MediaErrorInfo extends Notification {

  private String description;

  public MediaErrorInfo(String description) {
    super(ProtocolElements.MEDIAERROR_METHOD);
    this.description = description;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("[");
    if (getMethod() != null) {
      builder.append("method=").append(getMethod()).append(", ");
    }
    if (description != null) {
      builder.append("description=").append(description);
    }
    builder.append("]");
    return builder.toString();
  }
}
