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
 *
 */

package io.openvidu.client;

import org.kurento.jsonrpc.JsonRpcErrorException;

public class OpenViduException extends JsonRpcErrorException {
  private static final long serialVersionUID = 1L;

  public static enum Code {
    GENERIC_ERROR_CODE(999),

    TRANSPORT_ERROR_CODE(803), TRANSPORT_RESPONSE_ERROR_CODE(802), TRANSPORT_REQUEST_ERROR_CODE(
        801),

    MEDIA_MUTE_ERROR_CODE(307), MEDIA_NOT_A_WEB_ENDPOINT_ERROR_CODE(
        306), MEDIA_RTP_ENDPOINT_ERROR_CODE(305), MEDIA_WEBRTC_ENDPOINT_ERROR_CODE(
            304), MEDIA_ENDPOINT_ERROR_CODE(
                303), MEDIA_SDP_ERROR_CODE(302), MEDIA_GENERIC_ERROR_CODE(301),

    ROOM_CANNOT_BE_CREATED_ERROR_CODE(204), ROOM_CLOSED_ERROR_CODE(203), ROOM_NOT_FOUND_ERROR_CODE(
        202), ROOM_GENERIC_ERROR_CODE(201),

    USER_NOT_STREAMING_ERROR_CODE(105), EXISTING_USER_IN_ROOM_ERROR_CODE(
        104), USER_CLOSED_ERROR_CODE(
            103), USER_NOT_FOUND_ERROR_CODE(102), USER_GENERIC_ERROR_CODE(101),
    
    USER_UNAUTHORIZED_ERROR_CODE(401), ROLE_NOT_FOUND_ERROR_CODE(402),
    	SESSIONID_CANNOT_BE_CREATED_ERROR_CODE(403), TOKEN_CANNOT_BE_CREATED_ERROR_CODE(404),
    	
    USER_METADATA_FORMAT_INVALID_ERROR_CODE(500);

    private int value;

    private Code(int value) {
      this.value = value;
    }

    public int getValue() {
      return this.value;
    }
  }

  private Code code = Code.GENERIC_ERROR_CODE;

  public OpenViduException(Code code, String message) {
    super(code.getValue(), message);
    this.code = code;
  }

  public int getCodeValue() {
    return code.getValue();
  }

  @Override
  public String toString() {
    return "CODE: " + getCodeValue() + ". EXCEPTION: " + super.toString();
  }

}
