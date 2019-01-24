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

package io.openvidu.server.recording;

import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;

public class Recording {

	private io.openvidu.java.client.Recording.Status status;

	private String id;
	private String sessionId;
	private long createdAt; // milliseconds (UNIX Epoch time)
	private long size = 0; // bytes
	private double duration = 0; // seconds
	private String url;
	private String resolution;
	private boolean hasAudio = true;
	private boolean hasVideo = true;
	private RecordingProperties recordingProperties;

	public Recording(String sessionId, String id, RecordingProperties recordingProperties) {
		this.sessionId = sessionId;
		this.createdAt = System.currentTimeMillis();
		this.id = id;
		this.status = io.openvidu.java.client.Recording.Status.started;
		this.recordingProperties = recordingProperties;
		this.resolution = this.recordingProperties.resolution();
		this.hasAudio = this.recordingProperties.hasAudio();
		this.hasVideo = this.recordingProperties.hasVideo();
	}

	public Recording(JsonObject json) {
		this.id = json.get("id").getAsString();
		this.sessionId = json.get("sessionId").getAsString();
		this.createdAt = json.get("createdAt").getAsLong();
		this.size = json.get("size").getAsLong();
		try {
			this.duration = json.get("duration").getAsDouble();
		} catch (Exception e) {
			this.duration = new Long((long) json.get("duration").getAsLong()).doubleValue();
		}
		if (json.get("url").isJsonNull()) {
			this.url = null;
		} else {
			this.url = json.get("url").getAsString();
		}
		this.hasAudio = json.get("hasAudio").getAsBoolean();
		this.hasVideo = json.get("hasVideo").getAsBoolean();
		this.status = io.openvidu.java.client.Recording.Status.valueOf(json.get("status").getAsString());

		io.openvidu.java.client.Recording.OutputMode outputMode = io.openvidu.java.client.Recording.OutputMode
				.valueOf(json.get("outputMode").getAsString());
		RecordingProperties.Builder builder = new RecordingProperties.Builder().name(json.get("name").getAsString())
				.outputMode(outputMode).hasAudio(this.hasAudio).hasVideo(this.hasVideo);
		if (io.openvidu.java.client.Recording.OutputMode.COMPOSED.equals(outputMode) && this.hasVideo) {
			this.resolution = json.get("resolution").getAsString();
			builder.resolution(this.resolution);
			RecordingLayout recordingLayout = RecordingLayout.valueOf(json.get("recordingLayout").getAsString());
			builder.recordingLayout(recordingLayout);
			if (RecordingLayout.CUSTOM.equals(recordingLayout)) {
				builder.customLayout(json.get("customLayout").getAsString());
			}
		}
		this.recordingProperties = builder.build();
	}

	public io.openvidu.java.client.Recording.Status getStatus() {
		return status;
	}

	public void setStatus(io.openvidu.java.client.Recording.Status status) {
		this.status = status;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getName() {
		return this.recordingProperties.name();
	}

	public io.openvidu.java.client.Recording.OutputMode getOutputMode() {
		return this.recordingProperties.outputMode();
	}

	public RecordingLayout getRecordingLayout() {
		return this.recordingProperties.recordingLayout();
	}

	public String getCustomLayout() {
		return this.recordingProperties.customLayout();
	}

	public RecordingProperties getRecordingProperties() {
		return this.recordingProperties;
	}

	public String getSessionId() {
		return sessionId;
	}

	public void setSessionId(String sessionId) {
		this.sessionId = sessionId;
	}

	public long getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(long createdAt) {
		this.createdAt = createdAt;
	}

	public long getSize() {
		return size;
	}

	public void setSize(long l) {
		this.size = l;
	}

	public double getDuration() {
		return duration;
	}

	public void setDuration(double duration) {
		this.duration = duration;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public String getResolution() {
		return resolution;
	}

	public void setResolution(String resolution) {
		this.resolution = resolution;
	}

	public boolean hasAudio() {
		return hasAudio;
	}

	public void setHasAudio(boolean hasAudio) {
		this.hasAudio = hasAudio;
	}

	public boolean hasVideo() {
		return hasVideo;
	}

	public void setHasVideo(boolean hasVideo) {
		this.hasVideo = hasVideo;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.id);
		json.addProperty("name", this.recordingProperties.name());
		json.addProperty("outputMode", this.getOutputMode().name());
		if (io.openvidu.java.client.Recording.OutputMode.COMPOSED.equals(this.recordingProperties.outputMode())
				&& this.hasVideo) {
			json.addProperty("resolution", this.resolution);
			json.addProperty("recordingLayout", this.recordingProperties.recordingLayout().name());
			if (RecordingLayout.CUSTOM.equals(this.recordingProperties.recordingLayout())) {
				json.addProperty("customLayout", this.recordingProperties.customLayout());
			}
		}
		json.addProperty("sessionId", this.sessionId);
		json.addProperty("createdAt", this.createdAt);
		json.addProperty("size", this.size);
		json.addProperty("duration", this.duration);
		json.addProperty("url", this.url);
		json.addProperty("hasAudio", this.hasAudio);
		json.addProperty("hasVideo", this.hasVideo);
		json.addProperty("status", this.status.toString());
		return json;
	}

}
