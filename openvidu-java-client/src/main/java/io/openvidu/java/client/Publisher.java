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

package io.openvidu.java.client;

import com.google.gson.JsonObject;

/**
 * See {@link io.openvidu.java.client.Connection#getPublishers()}.
 *
 * <br>
 * This is a backend representation of a published media stream (see
 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
 *   OpenVidu Browser Stream class
 * </a>).
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

	protected Publisher(JsonObject json) {
		this.resetWithJson(json);
	}

	/**
	 * Returns the unique identifier of the
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> associated to this Publisher. Each Publisher is
	 * paired with only one Stream, so you can identify each Publisher by its
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html#streamId">
	 *   <code>Stream.streamId</code>
	 * </a>
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
	 * See properties of <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> object in OpenVidu Browser library to find out more
	 */
	public boolean hasVideo() {
		return this.hasVideo;
	}

	/**
	 * See properties of
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> object in OpenVidu Browser library to find out more
	 */
	public boolean hasAudio() {
		return this.hasAudio;
	}

	/**
	 * See properties of
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> object in OpenVidu Browser library to find out more
	 */
	public Boolean isAudioActive() {
		return this.audioActive;
	}

	/**
	 * See properties of
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> object in OpenVidu Browser library to find out more
	 */
	public Boolean isVideoActive() {
		return this.videoActive;
	}

	/**
	 * See properties of
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> object in OpenVidu Browser library to find out more
	 */
	public Integer getFrameRate() {
		return this.frameRate;
	}

	/**
	 * See properties of
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> object in OpenVidu Browser library to find out more
	 */
	public String getTypeOfVideo() {
		return this.typeOfVideo;
	}

	/**
	 * See properties of
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Stream.html">
	 *   Stream
	 * </a> object in OpenVidu Browser library to find out more
	 */
	public String getVideoDimensions() {
		return this.videoDimensions;
	}

	protected JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("streamId", this.streamId);
		json.addProperty("hasAudio", this.hasAudio());
		json.addProperty("hasVideo", this.hasVideo());
		json.addProperty("audioActive", this.isAudioActive());
		json.addProperty("videoActive", this.isVideoActive());
		json.addProperty("frameRate", this.getFrameRate());
		json.addProperty("typeOfVideo", this.getTypeOfVideo());
		json.addProperty("videoDimensions", this.getVideoDimensions());
		return json;
	}

	protected Publisher resetWithJson(JsonObject json) {
		this.streamId = json.get("streamId").getAsString();
		this.createdAt = json.get("createdAt").getAsLong();

		if (json.has("mediaOptions") && !json.get("mediaOptions").isJsonNull()) {
			JsonObject mediaOptions = json.get("mediaOptions").getAsJsonObject();
			this.hasAudio = mediaOptions.get("hasAudio").getAsBoolean();
			this.hasVideo = mediaOptions.get("hasVideo").getAsBoolean();
			if (mediaOptions.has("audioActive") && !mediaOptions.get("audioActive").isJsonNull()) {
				this.audioActive = mediaOptions.get("audioActive").getAsBoolean();
			}
			if (mediaOptions.has("videoActive") && !mediaOptions.get("videoActive").isJsonNull()) {
				this.videoActive = mediaOptions.get("videoActive").getAsBoolean();
			}
			if (mediaOptions.has("frameRate") && !mediaOptions.get("frameRate").isJsonNull()) {
				this.frameRate = mediaOptions.get("frameRate").getAsInt();
			}
			if (mediaOptions.has("typeOfVideo") && !mediaOptions.get("typeOfVideo").isJsonNull()) {
				this.typeOfVideo = mediaOptions.get("typeOfVideo").getAsString();
			}
			if (mediaOptions.has("videoDimensions") && !mediaOptions.get("videoDimensions").isJsonNull()) {
				this.videoDimensions = mediaOptions.get("videoDimensions").getAsString();
			}
		}

		return this;
	}

}
