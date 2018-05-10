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

public class Recording {

	public enum Status {

		/**
		 * The recording is starting (cannot be stopped)
		 */
		starting,

		/**
		 * The recording has started and is going on
		 */
		started,

		/**
		 * The recording has finished OK
		 */
		stopped,

		/**
		 * The recording is available for downloading. This status is reached for all
		 * stopped recordings if
		 * <a href="https://openvidu.io/docs/reference-docs/openvidu-server-params/"
		 * target="_blank">OpenVidu Server configuration</a> property
		 * <code>openvidu.recording.public-access</code> is true
		 */
		available,

		/**
		 * The recording has failed
		 */
		failed;
	}

	private Recording.Status status;

	private String id;
	private String sessionId;
	private long createdAt; // milliseconds (UNIX Epoch time)
	private long size; // bytes
	private double duration; // seconds
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
				.recordingLayout(RecordingLayout.valueOf((String) json.get("recordingLayout"))).build();
	}

	/**
	 * Status of the recording
	 */
	public Recording.Status getStatus() {
		return status;
	}

	/**
	 * Recording unique identifier
	 */
	public String getId() {
		return id;
	}

	/**
	 * Name of the recording. The video file will be named after this property. You
	 * can access this same value in your clients on recording events
	 * (<code>recordingStarted</code>, <code>recordingStopped</code>)
	 */
	public String getName() {
		return this.recordingProperties.name();
	}

	/**
	 * The layout used in this recording
	 */
	public RecordingLayout getRecordingLayout() {
		return this.recordingProperties.recordingLayout();
	}

	/**
	 * Session associated to the recording
	 */
	public String getSessionId() {
		return sessionId;
	}

	/**
	 * Time when the recording started in UTC milliseconds
	 */
	public long getCreatedAt() {
		return createdAt;
	}

	/**
	 * Size of the recording in bytes (0 until the recording is stopped)
	 */
	public long getSize() {
		return size;
	}

	/**
	 * Duration of the recording in seconds (0 until the recording is stopped)
	 */
	public double getDuration() {
		return duration;
	}

	/**
	 * URL of the recording. You can access the file from there. It is
	 * <code>null</code> until recording is stopped or if
	 * <a href="https://openvidu.io/docs/reference-docs/openvidu-server-params/"
	 * target="_blank">OpenVidu Server configuration</a> property
	 * <code>openvidu.recording.public-access</code> is false
	 */
	public String getUrl() {
		return url;
	}

	/**
	 * <code>true</code> if the recording has an audio track, <code>false</code>
	 * otherwise (currently fixed to true)
	 */
	public boolean hasAudio() {
		return hasAudio;
	}

	/**
	 * <code>true</code> if the recording has a video track, <code>false</code>
	 * otherwise (currently fixed to true)
	 */
	public boolean hasVideo() {
		return hasVideo;
	}

}
