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
 * Wrapper for server events.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public abstract class Notification {

  public enum Method {
    ICECANDIDATE_METHOD(ProtocolElements.ICECANDIDATE_METHOD), MEDIAERROR_METHOD(
        ProtocolElements.MEDIAERROR_METHOD), PARTICIPANTJOINED_METHOD(
        ProtocolElements.PARTICIPANTJOINED_METHOD), PARTICIPANTLEFT_METHOD(
        ProtocolElements.PARTICIPANTLEFT_METHOD), PARTICIPANTEVICTED_METHOD(
        ProtocolElements.PARTICIPANTEVICTED_METHOD), PARTICIPANTPUBLISHED_METHOD(
        ProtocolElements.PARTICIPANTPUBLISHED_METHOD), PARTICIPANTUNPUBLISHED_METHOD(
        ProtocolElements.PARTICIPANTUNPUBLISHED_METHOD), ROOMCLOSED_METHOD(
        ProtocolElements.ROOMCLOSED_METHOD), PARTICIPANTSENDMESSAGE_METHOD(
        ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD);

    private String methodValue;

    private Method(String val) {
      this.methodValue = val;
    }

    public String getMethodValue() {
      return methodValue;
    }

    public static Method getFromValue(String val) {
      for (Method m : Method.values()) {
        if (m.methodValue.equals(val)) {
          return m;
        }
      }
      return null;
    }

    @Override
    public String toString() {
      return getMethodValue().toString();
    }
  }

  private Method method;

  public Notification(Method method) {
    this.setMethod(method);
  }

  public Notification(String methodValue) {
    this(Method.getFromValue(methodValue));
  }

  public Method getMethod() {
    return method;
  }

  public void setMethod(Method method) {
    this.method = method;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("[");
    if (method != null) {
      builder.append("method=").append(method);
    }
    builder.append("]");
    return builder.toString();
  }
}
