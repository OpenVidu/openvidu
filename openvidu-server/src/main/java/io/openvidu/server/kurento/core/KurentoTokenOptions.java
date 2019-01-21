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

package io.openvidu.server.kurento.core;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class KurentoTokenOptions {

	private Integer videoMaxRecvBandwidth;
	private Integer videoMinRecvBandwidth;
	private Integer videoMaxSendBandwidth;
	private Integer videoMinSendBandwidth;
	private Map<String, Boolean> allowedFilters = new ConcurrentHashMap<>();

	public KurentoTokenOptions(JsonObject options) {
		if (options.has("videoMaxRecvBandwidth")) {
			this.videoMaxRecvBandwidth = options.get("videoMaxRecvBandwidth").getAsInt();
		}
		if (options.has("videoMinRecvBandwidth")) {
			this.videoMinRecvBandwidth = options.get("videoMinRecvBandwidth").getAsInt();
		}
		if (options.has("videoMaxSendBandwidth")) {
			this.videoMaxSendBandwidth = options.get("videoMaxSendBandwidth").getAsInt();
		}
		if (options.has("videoMinSendBandwidth")) {
			this.videoMinSendBandwidth = options.get("videoMinSendBandwidth").getAsInt();
		}
		if (options.has("allowedFilters")) {
			JsonArray filters = options.get("allowedFilters").getAsJsonArray();
			Iterator<JsonElement> it = filters.iterator();
			while (it.hasNext()) {
				this.allowedFilters.put(it.next().getAsString(), true);
			}
		}
	}

	public Integer getVideoMaxRecvBandwidth() {
		return videoMaxRecvBandwidth;
	}

	public Integer getVideoMinRecvBandwidth() {
		return videoMinRecvBandwidth;
	}

	public Integer getVideoMaxSendBandwidth() {
		return videoMaxSendBandwidth;
	}

	public Integer getVideoMinSendBandwidth() {
		return videoMinSendBandwidth;
	}

	public String[] getAllowedFilters() {
		return allowedFilters.keySet().stream().toArray(String[]::new);
	}

	public boolean isFilterAllowed(String filterType) {
		return this.allowedFilters.containsKey(filterType);
	}

}
