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

package io.openvidu.server.kurento.core;

import com.google.gson.JsonObject;

import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.kurento.endpoint.KurentoFilter;

public class KurentoMediaOptions extends MediaOptions {

	public String sdpOffer;
	public boolean doLoopback;

	// IPCAM properties
	public String rtspUri;
	public Boolean adaptativeBitrate;
	public Boolean onlyPlayWithSubscribers;
	public Integer networkCache;

	public KurentoMediaOptions(String sdpOffer, Boolean hasAudio, Boolean hasVideo, Boolean audioActive,
			Boolean videoActive, String typeOfVideo, Integer frameRate, String videoDimensions, KurentoFilter filter,
			boolean doLoopback) {
		super(hasAudio, hasVideo, audioActive, videoActive, typeOfVideo, frameRate, videoDimensions, filter);
		this.sdpOffer = sdpOffer;
		this.doLoopback = doLoopback;
	}

	public KurentoMediaOptions(String sdpOffer, Boolean hasAudio, Boolean hasVideo, Boolean audioActive,
			Boolean videoActive, String typeOfVideo, Integer frameRate, String videoDimensions, KurentoFilter filter,
			boolean doLoopback, String rtspUri, Boolean adaptativeBitrate, Boolean onlyPlayWithSubscribers,
			Integer networkCache) {
		super(hasAudio, hasVideo, audioActive, videoActive, typeOfVideo, frameRate, videoDimensions, filter);
		this.sdpOffer = sdpOffer;
		this.doLoopback = doLoopback;
		this.rtspUri = rtspUri;
		this.adaptativeBitrate = adaptativeBitrate;
		this.onlyPlayWithSubscribers = onlyPlayWithSubscribers;
		this.networkCache = networkCache;
	}

	public KurentoMediaOptions(Boolean hasAudio, Boolean hasVideo, Boolean audioActive, Boolean videoActive,
			String typeOfVideo, Integer frameRate, String videoDimensions, KurentoFilter filter,
			KurentoMediaOptions streamProperties) {
		super(hasAudio, hasVideo, audioActive, videoActive, typeOfVideo, frameRate, videoDimensions, filter);
		this.sdpOffer = streamProperties.sdpOffer;
		this.doLoopback = streamProperties.doLoopback;
		this.rtspUri = streamProperties.rtspUri;
		this.adaptativeBitrate = streamProperties.adaptativeBitrate;
		this.onlyPlayWithSubscribers = streamProperties.onlyPlayWithSubscribers;
		this.networkCache = streamProperties.networkCache;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		if (adaptativeBitrate != null) {
			json.addProperty("adaptativeBitrate", adaptativeBitrate);
		}
		if (onlyPlayWithSubscribers != null) {
			json.addProperty("onlyPlayWithSubscribers", onlyPlayWithSubscribers);
		}
		if (networkCache != null) {
			json.addProperty("networkCache", networkCache);
		}
		return json;
	}

}
