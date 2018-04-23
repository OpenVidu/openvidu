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

package io.openvidu.java.client;

import org.json.simple.JSONObject;

public class Recording {

	public enum Status {
		starting, // The recording is starting (cannot be stopped)
		started, // The recording has started and is going on
		stopped, // The recording has finished OK
		available, // The recording is available for downloading. This status is reached for all
					// stopped recordings if property 'openvidu.recording.free-access' is true
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

	public Recording(JSONObject json) {
		this.id = (String) json.get("id");
		this.sessionId = (String) json.get("sessionId");
		this.createdAt = (long) json.get("createdAt");
		this.size = (long) json.get("size");
		this.duration = (double) json.get("duration");
		this.url = (String) json.get("url");
		this.hasAudio = (boolean) json.get("hasAudio");
		this.hasVideo = (boolean) json.get("hasVideo");
		this.status = Recording.Status.valueOf((String) json.get("status"));
		this.recordingProperties = new RecordingProperties.Builder().name((String) json.get("name"))
				.recordingLayout(RecordingLayout.valueOf((String) json.get("layout"))).build();
	}

	public Recording.Status getStatus() {
		return status;
	}

	public String getId() {
		return id;
	}

	public String getName() {
		return this.recordingProperties.name();
	}

	public RecordingLayout getLayout() {
		return this.recordingProperties.recordingLayout();
	}

	public String getSessionId() {
		return sessionId;
	}

	public long getCreatedAt() {
		return createdAt;
	}

	public long getSize() {
		return size;
	}

	public double getDuration() {
		return duration;
	}

	public String getUrl() {
		return url;
	}

	public boolean hasAudio() {
		return hasAudio;
	}

	public boolean hasVideo() {
		return hasVideo;
	}

}
