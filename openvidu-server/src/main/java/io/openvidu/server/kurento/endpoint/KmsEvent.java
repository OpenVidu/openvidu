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

package io.openvidu.server.kurento.endpoint;

import org.kurento.client.ErrorEvent;
import org.kurento.client.MediaEvent;
import org.kurento.client.RaiseBaseEvent;

import com.google.gson.JsonObject;

public class KmsEvent {

	long timestamp;
	long msSinceCreation;
	String endpoint;
	RaiseBaseEvent event;

	public KmsEvent(RaiseBaseEvent event, String endpointName, long createdAt) {
		this.event = event;
		this.endpoint = endpointName;
		this.timestamp = System.currentTimeMillis();
		this.msSinceCreation = this.timestamp - createdAt;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();

		if (event instanceof ErrorEvent) {
			ErrorEvent errorEvent = (ErrorEvent) event;
			json.addProperty("eventType", errorEvent.getType());
			json.addProperty("errorCode", errorEvent.getErrorCode());
			json.addProperty("description", errorEvent.getDescription());
		} else {
			MediaEvent mediaEvent = (MediaEvent) event;
			json.addProperty("eventType", mediaEvent.getType());
		}

		json.addProperty("timestamp", timestamp);
		json.addProperty("msSinceEndpointCreation", msSinceCreation);
		json.addProperty("endpoint", this.endpoint);
		return json;
	}

}