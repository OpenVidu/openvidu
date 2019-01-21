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
public class IceCandidateInfo extends Notification {

  private IceCandidate iceCandidate;
  private String endpointName;

  public IceCandidateInfo(IceCandidate iceCandidate, String endpointName) {
    super(ProtocolElements.ICECANDIDATE_METHOD);
    this.iceCandidate = iceCandidate;
    this.endpointName = endpointName;
  }

  public IceCandidate getIceCandidate() {
    return iceCandidate;
  }

  public void setIceCandidate(IceCandidate iceCandidate) {
    this.iceCandidate = iceCandidate;
  }

  public String getEndpointName() {
    return endpointName;
  }

  public void setEndpointName(String endpointName) {
    this.endpointName = endpointName;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("[");
    if (getMethod() != null) {
      builder.append("method=").append(getMethod()).append(", ");
    }
    if (endpointName != null) {
      builder.append("endpointName=").append(endpointName).append(", ");
    }
    if (iceCandidate != null) {
      builder.append("iceCandidate=[sdpMLineIndex= ").append(iceCandidate.getSdpMLineIndex())
          .append(", sdpMid=").append(iceCandidate.getSdpMid()).append(", candidate=")
          .append(iceCandidate.getCandidate()).append("]");
    }
    builder.append("]");
    return builder.toString();
  }

}
