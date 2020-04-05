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
 * {@link io.openvidu.java.client.SessionProperties.Builder#defaultRecordingLayout(RecordingLayout)}
 * and
 * {@link io.openvidu.java.client.RecordingProperties.Builder#recordingLayout(RecordingLayout)}
 */
public enum RecordingLayout {

	/**
	 * All the videos are evenly distributed, taking up as much space as possible
	 */
	BEST_FIT,

	/**
	 * <i>(not available yet)</i>
	 */
	PICTURE_IN_PICTURE,

	/**
	 * <i>(not available yet)</i>
	 */
	VERTICAL_PRESENTATION,

	/**
	 * <i>(not available yet)</i>
	 */
	HORIZONTAL_PRESENTATION,

	/**
	 * Use your own custom recording layout. See
	 * <a href="https://docs.openvidu.io/en/stable/advanced-features/recording#custom-recording-layouts"
	 * target="_blank">Custom recording layouts</a> to learn more
	 */
	CUSTOM
}
