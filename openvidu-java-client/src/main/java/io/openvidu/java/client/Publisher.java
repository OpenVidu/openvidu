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

package io.openvidu.java.client;

import org.json.simple.JSONObject;

/**
 * See {@link io.openvidu.java.client.Connection#getPublishers()}
 */
public class Publisher {

	class MediaOptions {

		protected MediaOptions(boolean hasAudio, boolean hasVideo, Boolean audioActive, Boolean videoActive,
				Integer frameRate, String typeOfVideo, String videoDimensions) {
			this.hasAudio = hasAudio;
			this.hasVideo = hasVideo;
			this.audioActive = audioActive;
			this.videoActive = videoActive;
			this.frameRate = frameRate;
			this.typeOfVideo = typeOfVideo;
			this.videoDimensions = videoDimensions;
		}

		boolean hasVideo;
		boolean hasAudio;
		Boolean audioActive;
		Boolean videoActive;
		Integer frameRate;
		String typeOfVideo;
		String videoDimensions;

	}

	private String streamId;
	private MediaOptions mediaOptions;

	public Publisher(String streamId, boolean hasAudio, boolean hasVideo, Object audioActive, Object videoActive,
			Object frameRate, Object typeOfVideo, Object videoDimensions) {
		this.streamId = streamId;
		Boolean audioActiveAux = null;
		Boolean videoActiveAux = null;
		Integer frameRateAux = null;
		String typeOfVideoAux = null;
		String videoDimensionsAux = null;
		if (hasAudio) {
			audioActiveAux = (boolean) audioActive;
		}
		if (hasVideo) {
			videoActiveAux = (boolean) videoActive;
			if (frameRate != null) {
				frameRateAux = ((Long) frameRate).intValue();
			}
			typeOfVideoAux = (String) typeOfVideo;
			videoDimensionsAux = (String) videoDimensions;
		}
		this.mediaOptions = new MediaOptions(hasAudio, hasVideo, audioActiveAux, videoActiveAux, frameRateAux,
				typeOfVideoAux, videoDimensionsAux);
	}

	public String getStreamId() {
		return streamId;
	}

	public boolean hasVideo() {
		return this.mediaOptions.hasVideo;
	}

	public boolean hasAudio() {
		return this.mediaOptions.hasAudio;
	}

	public Boolean isAudioActive() {
		return this.mediaOptions.audioActive;
	}

	public Boolean isVideoActive() {
		return this.mediaOptions.videoActive;
	}

	public Integer getFrameRate() {
		return this.mediaOptions.frameRate;
	}

	public String getTypeOfVideo() {
		return this.mediaOptions.typeOfVideo;
	}

	public String getVideoDimensions() {
		return this.mediaOptions.videoDimensions;
	}

	@SuppressWarnings("unchecked")
	protected JSONObject toJson() {
		JSONObject json = new JSONObject();
		json.put("streamId", this.streamId);
		json.put("hasAudio", this.hasAudio());
		json.put("hasVideo", this.hasVideo());
		json.put("audioActive", this.isAudioActive());
		json.put("videoActive", this.isVideoActive());
		json.put("frameRate", this.getFrameRate());
		json.put("typeOfVideo", this.getTypeOfVideo());
		json.put("videoDimensions", this.getVideoDimensions());
		return json;
	}

}
