/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

package io.openvidu.server.recording;

/**
 * Defines which users should receive the Session recording notifications on the
 * client side (recordingStarted, recordingStopped)
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public enum RecordingNotification {

	/*
	 * No user of the session will receive recording events
	 */
	none,

	/*
	 * Only users with role MODERATOR will receive recording events
	 */
	moderator,

	/*
	 * Users with role MODERATOR or PUBLISHER will receive recording events
	 */
	publisher_moderator,

	/*
	 * All users of to the session will receive recording events
	 */
	all

}
