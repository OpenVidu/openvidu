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

package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.java.client.Recording.Status;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.recording.Recording;

public class CDREventRecordingStatusChanged extends CDREventEnd {

	private Recording recording;
	private Status status;

	public CDREventRecordingStatusChanged(Recording recording, Long startTime, EndReason reason, Long timestamp,
			Status status) {
		super(CDREventName.recordingStatusChanged, recording.getSessionId(), recording.getUniqueSessionId(), startTime,
				reason, timestamp);
		this.recording = recording;
		this.status = status;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("id", this.recording.getId());
		json.addProperty("name", this.recording.getName());
		json.addProperty("outputMode", this.recording.getOutputMode().name());
		if (RecordingProperties.IS_COMPOSED(this.recording.getOutputMode()) && this.recording.hasVideo()) {
			json.addProperty("resolution", this.recording.getResolution());
			json.addProperty("frameRate", this.recording.getFrameRate());
			json.addProperty("recordingLayout", this.recording.getRecordingLayout().name());
			if (RecordingLayout.CUSTOM.equals(this.recording.getRecordingLayout())
					&& this.recording.getCustomLayout() != null && !this.recording.getCustomLayout().isEmpty()) {
				json.addProperty("customLayout", this.recording.getCustomLayout());
			}
			if (this.recording.getRecordingProperties().mediaNode() != null) {
				json.addProperty("media_node_id", this.recording.getRecordingProperties().mediaNode());
			}
		}
		json.addProperty("hasAudio", this.recording.hasAudio());
		json.addProperty("hasVideo", this.recording.hasVideo());
		json.addProperty("size", this.recording.getSize());
		json.addProperty("duration", this.recording.getDuration());
		json.addProperty("status", this.status.name());
		return json;
	}

}
