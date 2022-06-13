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

package io.openvidu.server.recording;

import java.util.concurrent.atomic.AtomicBoolean;

import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;

public class Recording {

	private io.openvidu.java.client.Recording.Status status;

	private String id;
	private String sessionId;
	private String uniqueSessionId;
	private long createdAt; // milliseconds (UNIX Epoch time)
	private long size = 0; // bytes
	private double duration = 0; // seconds
	private String url;
	private RecordingProperties recordingProperties;

	public AtomicBoolean recordingNotificationSent = new AtomicBoolean(false);

	public Recording(String sessionId, String uniqueSessionId, String id, RecordingProperties recordingProperties) {
		this.sessionId = sessionId;
		this.uniqueSessionId = uniqueSessionId;
		this.createdAt = System.currentTimeMillis();
		this.id = id;
		this.status = io.openvidu.java.client.Recording.Status.started;
		this.recordingProperties = recordingProperties;
	}

	public Recording(JsonObject json) {
		this.id = json.get("id").getAsString();
		this.sessionId = json.get("sessionId").getAsString();
		if (json.has("uniqueSessionId")) {
			this.uniqueSessionId = json.get("uniqueSessionId").getAsString();
		}
		this.createdAt = json.get("createdAt").getAsLong();
		this.size = json.get("size").getAsLong();
		try {
			this.duration = json.get("duration").getAsDouble();
		} catch (Exception e) {
			this.duration = Long.valueOf((long) json.get("duration").getAsLong()).doubleValue();
		}
		if (json.get("url").isJsonNull()) {
			this.url = null;
		} else {
			this.url = json.get("url").getAsString();
		}

		this.status = io.openvidu.java.client.Recording.Status.valueOf(json.get("status").getAsString());

		Boolean hasAudio = json.get("hasAudio").getAsBoolean();
		Boolean hasVideo = json.get("hasVideo").getAsBoolean();

		io.openvidu.java.client.Recording.OutputMode outputMode = io.openvidu.java.client.Recording.OutputMode
				.valueOf(json.get("outputMode").getAsString());
		RecordingProperties.Builder builder = new RecordingProperties.Builder().name(json.get("name").getAsString())
				.outputMode(outputMode).hasAudio(hasAudio).hasVideo(hasVideo);
		if (RecordingProperties.IS_COMPOSED(outputMode) && hasVideo) {
			if (json.has("resolution")) {
				builder.resolution(json.get("resolution").getAsString());
			}
			if (json.has("frameRate")) {
				builder.frameRate(json.get("frameRate").getAsInt());
			}
			if (json.has("recordingLayout")) {
				RecordingLayout recordingLayout = RecordingLayout.valueOf(json.get("recordingLayout").getAsString());
				builder.recordingLayout(recordingLayout);
				if (RecordingLayout.CUSTOM.equals(recordingLayout) && json.has("customLayout")) {
					builder.customLayout(json.get("customLayout").getAsString());
				}
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

	public String getUniqueSessionId() {
		return uniqueSessionId;
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
		return this.recordingProperties.resolution();
	}

	public int getFrameRate() {
		return this.recordingProperties.frameRate();
	}

	public boolean hasAudio() {
		return this.recordingProperties.hasAudio();
	}

	public boolean hasVideo() {
		return this.recordingProperties.hasVideo();
	}

	public JsonObject toJson(boolean withUniqueSessionId) {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.id);
		json.addProperty("object", "recording");
		json.addProperty("name", this.recordingProperties.name());
		json.addProperty("outputMode", this.getOutputMode().name());
		if (RecordingProperties.IS_COMPOSED(this.recordingProperties.outputMode())
				&& this.recordingProperties.hasVideo()) {
			json.addProperty("resolution", this.recordingProperties.resolution());
			json.addProperty("frameRate", this.recordingProperties.frameRate());
			json.addProperty("recordingLayout", this.recordingProperties.recordingLayout().name());
			if (RecordingLayout.CUSTOM.equals(this.recordingProperties.recordingLayout())) {
				json.addProperty("customLayout", this.recordingProperties.customLayout());
			}
		}
		json.addProperty("sessionId", this.sessionId);
		if (withUniqueSessionId && this.uniqueSessionId != null) {
			json.addProperty("uniqueSessionId", this.uniqueSessionId);
		}
		if (this.recordingProperties.mediaNode() != null) {
			json.addProperty("mediaNode", this.recordingProperties.mediaNode());
		}
		json.addProperty("createdAt", this.createdAt);
		json.addProperty("size", this.size);
		json.addProperty("duration", this.duration);
		json.addProperty("url", this.url);
		json.addProperty("hasAudio", this.recordingProperties.hasAudio());
		json.addProperty("hasVideo", this.recordingProperties.hasVideo());
		json.addProperty("status", this.status.toString());
		return json;
	}

	public void setHasAudio(boolean hasAudio) {
		this.recordingProperties = new RecordingProperties.Builder(this.recordingProperties).hasAudio(hasAudio).build();
	}

	public void setHasVideo(boolean hasVideo) {
		this.recordingProperties = new RecordingProperties.Builder(this.recordingProperties).hasVideo(hasVideo).build();
	}

	public void setResolution(String resolution) {
		this.recordingProperties = new RecordingProperties.Builder(this.recordingProperties).resolution(resolution)
				.build();
	}

	public void setFrameRate(int frameRate) {
		this.recordingProperties = new RecordingProperties.Builder(this.recordingProperties).frameRate(frameRate)
				.build();
	}

}
