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
 * See
 * {@link io.openvidu.java.client.SessionProperties.Builder#mediaMode(MediaMode)}
 */
public enum MediaMode {
	/**
	 * <i>(not available yet)</i> The session will attempt to transmit streams
	 * directly between clients
	 */
	RELAYED,

	/**
	 * The session will transmit streams using OpenVidu Media Node
	 */
	ROUTED
}
