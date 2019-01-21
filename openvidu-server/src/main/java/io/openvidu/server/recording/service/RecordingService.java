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

package io.openvidu.server.recording.service;

import io.openvidu.client.OpenViduException;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Session;
import io.openvidu.server.recording.Recording;

public abstract class RecordingService {

	protected OpenviduConfig openviduConfig;
	protected RecordingManager recordingManager;

	RecordingService(RecordingManager recordingManager, OpenviduConfig openviduConfig) {
		this.recordingManager = recordingManager;
		this.openviduConfig = openviduConfig;
	}

	public abstract Recording startRecording(Session session, RecordingProperties properties) throws OpenViduException;

	public abstract Recording stopRecording(Session session, Recording recording, String reason);

	protected RecordingProperties setFinalRecordingName(Session session, RecordingProperties properties) {
		// TODO Auto-generated method stub
		return null;
	}

	protected PropertiesRecordingId setFinalRecordingNameAndGetFreeRecordingId(Session session,
			RecordingProperties properties) {
		String recordingId = this.recordingManager.getFreeRecordingId(session.getSessionId(),
				this.getShortSessionId(session));
		if (properties.name() == null || properties.name().isEmpty()) {
			// No name provided for the recording file. Use recordingId
			RecordingProperties.Builder builder = new RecordingProperties.Builder().name(recordingId)
					.outputMode(properties.outputMode());
			if (io.openvidu.java.client.Recording.OutputMode.COMPOSED.equals(properties.outputMode())) {
				builder.recordingLayout(properties.recordingLayout());
				if (RecordingLayout.CUSTOM.equals(properties.recordingLayout())) {
					builder.customLayout(properties.customLayout());
				}
			}
			properties = builder.build();
		}
		return new PropertiesRecordingId(properties, recordingId);
	}

	protected String getShortSessionId(Session session) {
		return session.getSessionId().substring(session.getSessionId().lastIndexOf('/') + 1,
				session.getSessionId().length());
	}

	/**
	 * Simple wrapper for returning update RecordingProperties and a free
	 * recordingId when starting a new recording
	 */
	protected class PropertiesRecordingId {

		RecordingProperties properties;
		String recordingId;

		PropertiesRecordingId(RecordingProperties properties, String recordingId) {
			this.properties = properties;
			this.recordingId = recordingId;
		}
	}

}
