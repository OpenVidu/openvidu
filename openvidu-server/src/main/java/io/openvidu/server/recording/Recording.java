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

package io.openvidu.server.recording;

import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;

public class Recording {

	public enum Status {
		starting, // The recording is starting (cannot be stopped)
		started, // The recording has started and is going on
		stopped, // The recording has finished OK
		available, // The recording is available for downloading. This status is reached for all
					// stopped recordings if property 'openvidu.recording.public-access' is true
		failed; // The recording has failed
	}

	private Recording.Status status;

	private String id;
	private String sessionId;
	private long createdAt; // milliseconds (UNIX Epoch time)
	private long size = 0; // bytes
	private double duration = 0; // seconds
	private String url;
	private boolean hasAudio = true;
	private boolean hasVideo = true;
	private RecordingProperties recordingProperties;

	public Recording(String sessionId, String id, RecordingProperties recordingProperties) {
		this.sessionId = sessionId;
		this.createdAt = System.currentTimeMillis();
		this.id = id;
		this.status = Status.started;
		this.recordingProperties = recordingProperties;
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
		this.status = Status.valueOf(json.get("status").getAsString());
		this.recordingProperties = new RecordingProperties.Builder().name(json.get("name").getAsString())
				.recordingLayout(RecordingLayout.valueOf(json.get("recordingLayout").getAsString())).build();
	}

	public Status getStatus() {
		return status;
	}

	public void setStatus(Status status) {
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

	public RecordingLayout getRecordingLayout() {
		return this.recordingProperties.recordingLayout();
	}

	public String getCustomLayout() {
		return this.recordingProperties.customLayout();
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
		json.addProperty("recordingLayout", this.recordingProperties.recordingLayout().name());
		if (RecordingLayout.CUSTOM.equals(this.recordingProperties.recordingLayout())) {
			json.addProperty("customLayout", this.recordingProperties.customLayout());
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
