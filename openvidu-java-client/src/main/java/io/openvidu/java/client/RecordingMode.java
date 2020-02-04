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
 * {@link io.openvidu.java.client.SessionProperties.Builder#recordingMode(RecordingMode)}
 */
public enum RecordingMode {

	/**
	 * The session is recorded automatically as soon as the first client publishes a
	 * stream to the session. It is automatically stopped after last user leaves the
	 * session (or until you call
	 * {@link io.openvidu.java.client.OpenVidu#stopRecording(String)}).
	 */
	ALWAYS,

	/**
	 * The session is not recorded automatically. To record the session, you must
	 * call {@link io.openvidu.java.client.OpenVidu#startRecording(String)} method.
	 * To stop the recording, you must call
	 * {@link io.openvidu.java.client.OpenVidu#stopRecording(String)}.
	 */
	MANUAL;
}
