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

package io.openvidu.java.client;

import org.json.simple.JSONObject;

/**
 * See {@link io.openvidu.java.client.Connection#getPublishers()}.
 * 
 * <br>
 * This is a backend representation of a published media stream (see
 * <a href="/api/openvidu-browser/classes/stream.html" target="_blank"> OpenVidu
 * Browser Stream class</a>).
 */
public class Publisher {

	private String streamId;
	private long createdAt;
	private boolean hasVideo;
	private boolean hasAudio;
	private Boolean audioActive;
	private Boolean videoActive;
	private Integer frameRate;
	private String typeOfVideo;
	private String videoDimensions;

	protected Publisher(String streamId, long createdAt, boolean hasAudio, boolean hasVideo, Object audioActive,
			Object videoActive, Object frameRate, Object typeOfVideo, Object videoDimensions) {
		this.streamId = streamId;
		this.createdAt = createdAt;
		this.hasAudio = hasAudio;
		this.hasVideo = hasVideo;
		this.audioActive = (Boolean) audioActive;
		this.videoActive = (Boolean) videoActive;
		if (frameRate != null) {
			this.frameRate = ((Long) frameRate).intValue();
		}
		this.typeOfVideo = (String) typeOfVideo;
		this.videoDimensions = (String) videoDimensions;
	}

	/**
	 * Returns the unique identifier of the
	 * <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> associated to this Publisher. Each Publisher is paired
	 * with only one Stream, so you can identify each Publisher by its
	 * <a href="/api/openvidu-browser/classes/stream.html#streamid" target=
	 * "_blank"><code>Stream.streamId</code></a>
	 */
	public String getStreamId() {
		return streamId;
	}

	/**
	 * Timestamp when this Publisher started publishing, in UTC milliseconds (ms
	 * since Jan 1, 1970, 00:00:00 UTC)
	 */
	public long createdAt() {
		return this.createdAt;
	}

	/**
	 * See properties of <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> object in OpenVidu Browser library to find out more
	 */
	public boolean hasVideo() {
		return this.hasVideo;
	}

	/**
	 * See properties of <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> object in OpenVidu Browser library to find out more
	 */
	public boolean hasAudio() {
		return this.hasAudio;
	}

	/**
	 * See properties of <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> object in OpenVidu Browser library to find out more
	 */
	public Boolean isAudioActive() {
		return this.audioActive;
	}

	/**
	 * See properties of <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> object in OpenVidu Browser library to find out more
	 */
	public Boolean isVideoActive() {
		return this.videoActive;
	}

	/**
	 * See properties of <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> object in OpenVidu Browser library to find out more
	 */
	public Integer getFrameRate() {
		return this.frameRate;
	}

	/**
	 * See properties of <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> object in OpenVidu Browser library to find out more
	 */
	public String getTypeOfVideo() {
		return this.typeOfVideo;
	}

	/**
	 * See properties of <a href="/api/openvidu-browser/classes/stream.html" target=
	 * "_blank">Stream</a> object in OpenVidu Browser library to find out more
	 */
	public String getVideoDimensions() {
		return this.videoDimensions;
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
