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

package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

public class CDREvent {

	protected String sessionId;
	protected Long timeStamp;
	private CDREventName eventName;

	public CDREvent(CDREventName eventName, String sessionId, Long timeStamp) {
		this.eventName = eventName;
		this.sessionId = sessionId;
		this.timeStamp = timeStamp;
	}

	public String getSessionId() {
		return this.sessionId;
	}

	public Long getTimestamp() {
		return this.timeStamp;
	}

	public CDREventName getEventName() {
		return this.eventName;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("sessionId", this.sessionId);
		json.addProperty("timestamp", this.timeStamp);
		return json;
	}

	@Override
	public String toString() {
		JsonObject root = new JsonObject();
		root.add(this.eventName.name(), this.toJson());
		return root.toString();
	}

}
