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

import java.util.Map.Entry;

import org.kurento.jsonrpc.Props;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class JsonUtils {

	public Props fromJsonObjectToProps(JsonObject params) {
		Props props = new Props();
		for (Entry<String, JsonElement> entry : params.entrySet()) {
			if (entry.getValue().isJsonPrimitive()) {
				props.add(entry.getKey(), entry.getValue().getAsString());
			} else if (entry.getValue().isJsonObject()) {
				props.add(entry.getKey(), fromJsonObjectToProps(entry.getValue().getAsJsonObject()));
			}
		}
		return props;
	}

}
