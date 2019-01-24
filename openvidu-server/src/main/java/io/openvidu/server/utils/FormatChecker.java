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

package io.openvidu.server.utils;

public class FormatChecker {

	public boolean isAcceptableRecordingResolution(String stringResolution) {
		// Matches every string with format "AxB", being A and B any number not starting
		// with 0 and 3 digits long or 4 digits long if they start with 1
		return stringResolution.matches("^(?!(0))(([0-9]{3})|1([0-9]{3}))x(?!0)(([0-9]{3})|1([0-9]{3}))$");
	}
	
	public boolean isServerMetadataFormatCorrect(String metadata) {
		return true;
	}

}
