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

import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

/**
 * See {@link io.openvidu.java.client.OpenVidu#startRecording(String)}
 */
public class Recording {

	/**
	 * See {@link io.openvidu.java.client.Recording#getStatus()}
	 */
	public enum Status {

		/**
		 * The recording is starting (cannot be stopped). Some recording may not go
		 * through this status and directly reach "started" status
		 */
		starting,

		/**
		 * The recording has started and is going on
		 */
		started,

		/**
		 * The recording has stopped and is being processed. At some point it will reach
		 * "ready" status
		 */
		stopped,

		/**
		 * The recording has finished being processed and is available for download
		 * through property {@link Recording#getUrl}
		 */
		ready,

		/**
		 * The recording has failed. This status may be reached from "starting",
		 * "started" and "stopped" status
		 */
		failed;
	}

	/**
	 * See {@link io.openvidu.java.client.Recording#getOutputMode()}
	 */
	public enum OutputMode {

		/**
		 * Record all streams in a grid layout in a single archive
		 */
		COMPOSED,

		/**
		 * Record each stream individually
		 */
		INDIVIDUAL,

		/**
		 * Works the same way as COMPOSED mode, but the necessary recorder service
		 * module will start some time in advance and won't be terminated once a
		 * specific session recording has ended. This module will remain up and running
		 * as long as the session remains active.<br>
		 * <br>
		 *
		 * <ul>
		 * <li><strong>Pros vs COMPOSED</strong>: the process of starting the recording
		 * will be noticeably faster. This can be very useful in use cases where a
		 * session needs to be recorded multiple times over time, when a better response
		 * time is usually desirable.</li>
		 * <li><strong>Cons vs COMPOSED</strong>: for every session initialized with
		 * COMPOSED_QUICK_START recording output mode, extra CPU power will be required
		 * in OpenVidu Server. The recording module will be continuously rendering all
		 * of the streams being published to the session even when the session is not
		 * being recorded. And that is for every session configured with
		 * COMPOSED_QUICK_START.</li>
		 * </ul>
		 */
		COMPOSED_QUICK_START;
	}

	private Recording.Status status;

	private String id;
	private String sessionId;
	private long createdAt; // milliseconds (UNIX Epoch time)
	private long size; // bytes
	private double duration; // seconds
	private String url;
	private RecordingProperties recordingProperties;

	protected Recording(JsonObject json) {
		this.id = json.get("id").getAsString();
		this.sessionId = json.get("sessionId").getAsString();
		this.createdAt = json.get("createdAt").getAsLong();
		this.size = json.get("size").getAsLong();
		this.duration = json.get("duration").getAsDouble();
		JsonElement urlElement = json.get("url");
		if (!urlElement.isJsonNull()) {
			this.url = urlElement.getAsString();
		}
		this.status = Recording.Status.valueOf(json.get("status").getAsString());

		RecordingProperties.Builder builder = RecordingProperties
				.fromJson(new Gson().fromJson(json.toString(), Map.class), null);
		this.recordingProperties = builder.build();
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
	 * Name of the recording. The video file will be named after this property
	 */
	public String getName() {
		return this.recordingProperties.name();
	}

	/**
	 * <code>true</code> if the recording has an audio track, <code>false</code>
	 * otherwise (currently fixed to true)
	 */
	public boolean hasAudio() {
		return this.recordingProperties.hasAudio();
	}

	/**
	 * <code>true</code> if the recording has a video track, <code>false</code>
	 * otherwise (currently fixed to true)
	 */
	public boolean hasVideo() {
		return this.recordingProperties.hasVideo();
	}

	/**
	 * Mode of recording: COMPOSED for a single archive in a grid layout or
	 * INDIVIDUAL for one archive for each stream
	 */
	public OutputMode getOutputMode() {
		return this.recordingProperties.outputMode();
	}

	/**
	 * The layout used in this recording. Only applicable if
	 * {@link io.openvidu.java.client.Recording.OutputMode} is
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START} and
	 * {@link Recording#hasVideo()} is true
	 */
	public RecordingLayout getRecordingLayout() {
		return this.recordingProperties.recordingLayout();
	}

	/**
	 * The custom layout used in this recording. Only applicable if
	 * {@link io.openvidu.java.client.Recording.OutputMode} is
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START},
	 * {@link Recording#hasVideo()} is true and
	 * {@link io.openvidu.java.client.RecordingProperties.Builder#customLayout(String)}
	 * has been called
	 */
	public String getCustomLayout() {
		return this.recordingProperties.customLayout();
	}

	/**
	 * Whether failed streams were ignored when the recording process started or
	 * not. Only applicable if {@link io.openvidu.java.client.Recording.OutputMode}
	 * is {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL}
	 */
	public boolean ignoreFailedStreams() {
		return this.recordingProperties.ignoreFailedStreams();
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
	 * <code>null</code> until recording reaches "ready" or "failed" status. If
	 * <a href="https://docs.openvidu.io/en/stable/reference-docs/openvidu-config/">
	 * OpenVidu configuration </a> property
	 * <code>OPENVIDU_RECORDING_PUBLIC_ACCESS</code> is false, this path will be
	 * secured with OpenVidu credentials
	 */
	public String getUrl() {
		return url;
	}

	/**
	 * Resolution of the video file. Only applicable if
	 * {@link io.openvidu.java.client.Recording.OutputMode} is
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START} and
	 * {@link Recording#hasVideo()} is true
	 */
	public String getResolution() {
		return this.recordingProperties.resolution();
	}

	/**
	 * Frame rate of the video file. Only applicable if
	 * {@link io.openvidu.java.client.Recording.OutputMode} is
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START} and
	 * {@link Recording#hasVideo()} is true
	 */
	public Integer getFrameRate() {
		return this.recordingProperties.frameRate();
	}

}
