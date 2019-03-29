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
 *
 */

package io.openvidu.client;

import org.kurento.jsonrpc.JsonRpcErrorException;

public class OpenViduException extends JsonRpcErrorException {
	private static final long serialVersionUID = 1L;

	public static enum Code {
		GENERIC_ERROR_CODE(999),

		TRANSPORT_ERROR_CODE(803), TRANSPORT_RESPONSE_ERROR_CODE(802), TRANSPORT_REQUEST_ERROR_CODE(801),

		MEDIA_TYPE_STREAM_INCOMPATIBLE_WITH_RECORDING_PROPERTIES_ERROR_CODE(309),
		MEDIA_TYPE_RECORDING_PROPERTIES_ERROR_CODE(308), MEDIA_MUTE_ERROR_CODE(307),
		MEDIA_NOT_A_WEB_ENDPOINT_ERROR_CODE(306), MEDIA_RTP_ENDPOINT_ERROR_CODE(305),
		MEDIA_WEBRTC_ENDPOINT_ERROR_CODE(304), MEDIA_ENDPOINT_ERROR_CODE(303), MEDIA_SDP_ERROR_CODE(302),
		MEDIA_GENERIC_ERROR_CODE(301),

		ROOM_CANNOT_BE_CREATED_ERROR_CODE(204), ROOM_CLOSED_ERROR_CODE(203), ROOM_NOT_FOUND_ERROR_CODE(202),
		ROOM_GENERIC_ERROR_CODE(201),

		USER_NOT_STREAMING_ERROR_CODE(105), EXISTING_USER_IN_ROOM_ERROR_CODE(104), USER_CLOSED_ERROR_CODE(103),
		USER_NOT_FOUND_ERROR_CODE(102), USER_GENERIC_ERROR_CODE(10),

		USER_UNAUTHORIZED_ERROR_CODE(401), ROLE_NOT_FOUND_ERROR_CODE(402), SESSIONID_CANNOT_BE_CREATED_ERROR_CODE(403),
		TOKEN_CANNOT_BE_CREATED_ERROR_CODE(404), EXISTING_FILTER_ALREADY_APPLIED_ERROR_CODE(405),
		FILTER_NOT_APPLIED_ERROR_CODE(406), FILTER_EVENT_LISTENER_NOT_FOUND(407),

		USER_METADATA_FORMAT_INVALID_ERROR_CODE(500),

		SIGNAL_FORMAT_INVALID_ERROR_CODE(600), SIGNAL_TO_INVALID_ERROR_CODE(601),
		SIGNAL_MESSAGE_INVALID_ERROR_CODE(602),

		DOCKER_NOT_FOUND(709), RECORDING_PATH_NOT_VALID(708), RECORDING_FILE_EMPTY_ERROR(707),
		RECORDING_DELETE_ERROR_CODE(706), RECORDING_LIST_ERROR_CODE(705), RECORDING_STOP_ERROR_CODE(704),
		RECORDING_START_ERROR_CODE(703), RECORDING_REPORT_ERROR_CODE(702), RECORDING_COMPLETION_ERROR_CODE(701);

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
		return super.toString();
	}

}
