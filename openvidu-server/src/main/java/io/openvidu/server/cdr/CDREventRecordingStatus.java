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

import io.openvidu.java.client.Recording.Status;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.recording.Recording;

public class CDREventRecordingStatus extends CDREventRecording {

	private Status status;

	public CDREventRecordingStatus(String sessionId, Recording recording, Status status) {
		super(sessionId, recording);
		this.eventName = CDREventName.recordingStatusChanged;
		this.status = status;
	}

	public CDREventRecordingStatus(CDREventRecording recordingStartedEvent, Recording recording, EndReason finalReason,
			long timestamp, Status status) {
		super(recordingStartedEvent, recording, finalReason, timestamp);
		this.eventName = CDREventName.recordingStatusChanged;
		this.status = status;
	}

	public Status getStatus() {
		return status;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("status", this.status.name());
		return json;
	}

}
