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

package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingLayout;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.recording.Recording;

public class CDREventRecording extends CDREventEnd {

	private Recording recording;

	// recordingStarted
	public CDREventRecording(String sessionId, Recording recording) {
		super(CDREventName.recordingStarted, sessionId, recording.getCreatedAt());
		this.recording = recording;
	}

	// recordingStopped
	public CDREventRecording(CDREventRecording event, Recording recording, EndReason reason) {
		super(CDREventName.recordingStopped, event == null ? recording.getSessionId() : event.getSessionId(),
				event == null ? recording.getCreatedAt() : event.getTimestamp(), reason);
		this.recording = recording;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("id", this.recording.getId());
		json.addProperty("name", this.recording.getName());
		json.addProperty("outputMode", this.recording.getOutputMode().name());
		if (io.openvidu.java.client.Recording.OutputMode.COMPOSED.equals(this.recording.getOutputMode())
				&& this.recording.hasVideo()) {
			json.addProperty("resolution", this.recording.getResolution());
			json.addProperty("recordingLayout", this.recording.getRecordingLayout().name());
			if (RecordingLayout.CUSTOM.equals(this.recording.getRecordingLayout())
					&& this.recording.getCustomLayout() != null && !this.recording.getCustomLayout().isEmpty()) {
				json.addProperty("customLayout", this.recording.getCustomLayout());
			}
		}
		json.addProperty("hasAudio", this.recording.hasAudio());
		json.addProperty("hasVideo", this.recording.hasVideo());
		json.addProperty("size", this.recording.getSize());
		json.addProperty("duration", this.recording.getDuration());
		return json;
	}

	public Recording getRecording() {
		return this.recording;
	}

}
