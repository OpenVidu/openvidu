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

package io.openvidu.server.kurento.endpoint;

import org.kurento.client.MediaEvent;
import org.kurento.client.MediaType;

import com.google.gson.JsonObject;

import io.openvidu.server.core.Participant;

public class KmsMediaEvent extends KmsEvent {

	MediaType mediaType;

	public KmsMediaEvent(MediaEvent event, Participant participant, String endpointName, MediaType mediaType,
			long createdAt) {
		super(event, participant, endpointName, createdAt);
		this.mediaType = mediaType;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("mediaType", this.mediaType.name());
		return json;
	}

}
