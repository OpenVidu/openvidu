/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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

import org.json.simple.JSONObject;

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

	public Recording(JSONObject json) {
		this.id = (String) json.get("id");
		this.sessionId = (String) json.get("sessionId");
		this.createdAt = (long) json.get("createdAt");
		this.size = (long) json.get("size");
		this.duration = (double) json.get("duration");
		this.url = (String) json.get("url");
		this.hasAudio = (boolean) json.get("hasAudio");
		this.hasVideo = (boolean) json.get("hasVideo");
		this.status = Status.valueOf((String) json.get("status"));
		this.recordingProperties = new RecordingProperties.Builder().name((String) json.get("name"))
				.recordingLayout(RecordingLayout.valueOf((String) json.get("recordingLayout"))).build();
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

	@SuppressWarnings("unchecked")
	public JSONObject toJson() {
		JSONObject json = new JSONObject();
		json.put("id", this.id);
		json.put("name", this.recordingProperties.name());
		json.put("recordingLayout", this.recordingProperties.recordingLayout().name());
		json.put("sessionId", this.sessionId);
		json.put("createdAt", this.createdAt);
		json.put("size", this.size);
		json.put("duration", this.duration);
		json.put("url", this.url);
		json.put("hasAudio", this.hasAudio);
		json.put("hasVideo", this.hasVideo);
		json.put("status", this.status.toString());
		return json;
	}

}
