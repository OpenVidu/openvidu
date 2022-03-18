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

import org.apache.commons.lang3.StringUtils;
import org.kurento.client.RecorderEndpoint;

import com.google.gson.JsonObject;

import io.openvidu.server.kurento.core.KurentoParticipant;

public class RecorderEndpointWrapper {

	private RecorderEndpoint recorder;
	private KurentoParticipant kParticipant;
	private String name;
	private String fileExtension;
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

	public RecorderEndpointWrapper(RecorderEndpoint recorder, KurentoParticipant kParticipant, String recordingId,
			String name, String fileExtension) {
		this.name = name;
		this.fileExtension = fileExtension;
		this.recorder = recorder;
		this.kParticipant = kParticipant;
		this.recordingId = recordingId;
		this.connectionId = kParticipant.getParticipantPublicId();
		this.streamId = kParticipant.getPublisherStreamId();
		this.clientData = kParticipant.getClientMetadata();
		this.serverData = kParticipant.getServerMetadata();
		this.hasAudio = kParticipant.getPublisher().getMediaOptions().hasAudio();
		this.hasVideo = kParticipant.getPublisher().getMediaOptions().hasVideo();
		this.typeOfVideo = kParticipant.getPublisher().getMediaOptions().getTypeOfVideo();
	}

	public RecorderEndpointWrapper(JsonObject json, String fileExtension) {
		String nameAux = json.get("name").getAsString();
		// If the name includes the extension, remove it
		this.name = StringUtils.removeEnd(nameAux, fileExtension);
		this.fileExtension = fileExtension;
		this.connectionId = json.get("connectionId").getAsString();
		this.streamId = json.get("streamId").getAsString();
		this.clientData = (json.has("clientData") && !json.get("clientData").isJsonNull())
				? json.get("clientData").getAsString()
				: null;
		this.serverData = json.get("serverData").getAsString();
		this.startTime = json.get("startTime").getAsLong();
		this.endTime = json.get("endTime").getAsLong();
		this.size = json.get("size").getAsLong();
		this.hasAudio = json.get("hasAudio").getAsBoolean();
		this.hasVideo = json.get("hasVideo").getAsBoolean();
		if (this.hasVideo) {
			this.typeOfVideo = json.get("typeOfVideo").getAsString();
		}
	}

	public RecorderEndpoint getRecorder() {
		return recorder;
	}

	public KurentoParticipant getParticipant() {
		return this.kParticipant;
	}

	public String getName() {
		return this.name;
	}

	public String getNameWithExtension() {
		return this.name + fileExtension;
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
		json.addProperty("name", this.getNameWithExtension());
		json.addProperty("connectionId", this.getConnectionId());
		json.addProperty("streamId", this.getStreamId());
		json.addProperty("clientData", this.getClientData());
		json.addProperty("serverData", this.getServerData());
		json.addProperty("startTime", this.getStartTime());
		json.addProperty("endTime", this.getEndTime());
		json.addProperty("duration", this.getEndTime() - this.getStartTime());
		json.addProperty("size", this.getSize());
		json.addProperty("hasAudio", this.hasAudio());
		json.addProperty("hasVideo", this.hasVideo());
		if (this.hasVideo()) {
			json.addProperty("typeOfVideo", this.getTypeOfVideo());
		}
		return json;
	}

}
