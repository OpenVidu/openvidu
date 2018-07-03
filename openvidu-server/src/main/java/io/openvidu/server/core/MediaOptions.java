/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

import org.json.simple.JSONObject;

public class MediaOptions {

	protected Boolean hasAudio;
	protected Boolean hasVideo;
	protected Boolean audioActive;
	protected Boolean videoActive;
	protected String typeOfVideo;
	protected Integer frameRate;
	protected String videoDimensions;

	public MediaOptions(Boolean hasAudio, Boolean hasVideo, Boolean audioActive, Boolean videoActive,
			String typeOfVideo, Integer frameRate, String videoDimensions) {
		this.hasAudio = hasAudio;
		this.hasVideo = hasVideo;
		this.audioActive = audioActive;
		this.videoActive = videoActive;
		this.typeOfVideo = typeOfVideo;
		this.frameRate = frameRate;
		this.videoDimensions = videoDimensions;
	}

	@SuppressWarnings("unchecked")
	public JSONObject toJson() {
		JSONObject json = new JSONObject();
		json.put("hasAudio", this.hasAudio);
		if (hasAudio)
			json.put("audioActive", this.audioActive);
		json.put("hasVideo", this.hasVideo);
		if (hasVideo)
			json.put("videoActive", this.videoActive);
		if (this.hasVideo && this.videoActive) {
			json.put("typeOfVideo", this.typeOfVideo);
			json.put("frameRate", this.frameRate);
			json.put("videoDimensions", this.videoDimensions);
		}
		return json;
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

}
