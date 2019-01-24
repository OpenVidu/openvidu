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

import org.kurento.client.RecorderEndpoint;

import com.google.gson.JsonObject;

public class RecorderEndpointWrapper {

	private RecorderEndpoint recorder;
	private String connectionId;
	private String recordingId;
	private String streamId;
	private String clientData;
	private String serverData;
	private boolean hasAudio;
	private boolean hasVideo;
	private String typeOfVideo;

	private long startTime;
	private long endTime;
	private long size;

	public RecorderEndpointWrapper(RecorderEndpoint recorder, String connectionId, String recordingId, String streamId,
			String clientData, String serverData, boolean hasAudio, boolean hasVideo, String typeOfVideo) {
		this.recorder = recorder;
		this.connectionId = connectionId;
		this.recordingId = recordingId;
		this.streamId = streamId;
		this.clientData = clientData;
		this.serverData = serverData;
		this.hasAudio = hasAudio;
		this.hasVideo = hasVideo;
		this.typeOfVideo = typeOfVideo;
	}

	public RecorderEndpoint getRecorder() {
		return recorder;
	}

	public String getConnectionId() {
		return connectionId;
	}

	public String getRecordingId() {
		return recordingId;
	}

	public String getStreamId() {
		return streamId;
	}

	public String getClientData() {
		return clientData;
	}

	public String getServerData() {
		return serverData;
	}

	public long getStartTime() {
		return startTime;
	}

	public void setStartTime(long startTime) {
		this.startTime = startTime;
	}

	public long getEndTime() {
		return endTime;
	}

	public void setEndTime(long endTime) {
		this.endTime = endTime;
	}

	public long getSize() {
		return size;
	}

	public void setSize(long size) {
		this.size = size;
	}

	public boolean hasAudio() {
		return hasAudio;
	}

	public boolean hasVideo() {
		return hasVideo;
	}

	public String getTypeOfVideo() {
		return typeOfVideo;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("connectionId", this.connectionId);
		json.addProperty("streamId", this.streamId);
		json.addProperty("clientData", this.clientData);
		json.addProperty("serverData", this.serverData);
		json.addProperty("startTime", this.startTime);
		json.addProperty("endTime", this.endTime);
		json.addProperty("duration", this.endTime - this.startTime);
		json.addProperty("size", this.size);
		json.addProperty("hasAudio", this.hasAudio);
		json.addProperty("hasVideo", this.hasVideo);
		if (this.hasVideo) {
			json.addProperty("typeOfVideo", this.typeOfVideo);
		}
		return json;
	}

}
