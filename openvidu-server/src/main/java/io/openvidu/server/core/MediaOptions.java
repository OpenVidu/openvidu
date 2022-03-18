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

package io.openvidu.server.core;

import com.google.gson.JsonObject;

import io.openvidu.server.kurento.endpoint.KurentoFilter;

public class MediaOptions {

	protected Boolean hasAudio;
	protected Boolean hasVideo;
	protected Boolean audioActive;
	protected Boolean videoActive;
	protected String typeOfVideo;
	protected Integer frameRate;
	protected String videoDimensions;
	protected KurentoFilter filter;

	public MediaOptions(Boolean hasAudio, Boolean hasVideo, Boolean audioActive, Boolean videoActive,
			String typeOfVideo, Integer frameRate, String videoDimensions, KurentoFilter filter) {
		this.hasAudio = hasAudio;
		this.hasVideo = hasVideo;
		this.audioActive = audioActive;
		this.videoActive = videoActive;
		this.typeOfVideo = typeOfVideo;
		this.frameRate = frameRate;
		this.videoDimensions = videoDimensions;
		this.filter = filter;
	}

	public boolean hasAudio() {
		return this.hasAudio;
	}

	public boolean hasVideo() {
		return this.hasVideo;
	}

	public boolean isAudioActive() {
		return this.hasAudio && this.audioActive;
	}

	public boolean isVideoActive() {
		return this.hasVideo && this.videoActive;
	}

	public String getTypeOfVideo() {
		return this.typeOfVideo;
	}

	public Integer getFrameRate() {
		return this.frameRate;
	}

	public String getVideoDimensions() {
		return this.videoDimensions;
	}

	public KurentoFilter getFilter() {
		return this.filter;
	}

	public void setFilter(KurentoFilter filter) {
		this.filter = filter;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("hasAudio", this.hasAudio);
		if (hasAudio)
			json.addProperty("audioActive", this.audioActive);
		json.addProperty("hasVideo", this.hasVideo);
		if (hasVideo) {
			json.addProperty("videoActive", this.videoActive);
			json.addProperty("typeOfVideo", this.typeOfVideo);
			json.addProperty("frameRate", this.frameRate);
			json.addProperty("videoDimensions", this.videoDimensions);
		}
		json.add("filter", this.filter != null ? this.filter.toJson() : new JsonObject());
		if (this.filter != null) {
			((JsonObject) json.get("filter")).add("lastExecMethod",
					this.filter.getLastExecMethod() != null ? this.filter.getLastExecMethod().toJson()
							: new JsonObject());
		}
		return json;
	}

}
