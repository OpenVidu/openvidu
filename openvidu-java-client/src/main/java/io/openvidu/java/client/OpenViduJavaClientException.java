/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

package io.openvidu.java.client;

/**
 * Defines unexpected internal errors in OpenVidu Java Client
 */
public class OpenViduJavaClientException extends OpenViduException {

	private static final long serialVersionUID = 1L;

	protected OpenViduJavaClientException(String message) {
		super(message);
	}

	protected OpenViduJavaClientException(String message, Throwable cause) {
		super(message, cause);
	}

}
