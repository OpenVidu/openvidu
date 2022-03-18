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

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class KurentoFilter {

	public class KurentoFilterMethod {

		String method;
		JsonObject params;

		protected KurentoFilterMethod(String method, JsonObject params) {
			this.method = method;
			this.params = params;
		}

		public JsonObject toJson() {
			JsonObject json = new JsonObject();
			json.addProperty("method", lastExecMethod.method);
			json.add("params", lastExecMethod.params);
			return json;
		}
	}

	String type;
	JsonObject options;
	KurentoFilterMethod lastExecMethod;

	public KurentoFilter(String type, JsonObject options) {
		this.type = type;
		this.options = options;
	}

	public KurentoFilter(String type, JsonObject options, String method, JsonObject params) {
		this.type = type;
		this.options = options;
		this.lastExecMethod = new KurentoFilterMethod(method, params);
	}

	public KurentoFilter(JsonElement json) {
		JsonObject jsonObject = json.getAsJsonObject();
		this.type = jsonObject.get("type").getAsString();
		this.options = jsonObject.get("options").getAsJsonObject();
	}

	public String getType() {
		return type;
	}

	public JsonObject getOptions() {
		return options;
	}

	public KurentoFilterMethod getLastExecMethod() {
		return this.lastExecMethod;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("type", type);
		json.add("options", options);
		json.add("lastExecMethod", this.lastExecMethod != null ? this.lastExecMethod.toJson() : new JsonObject());
		return json;
	}

}
