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

import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.kurento.core.KurentoMediaOptions;

public class CDREventWebrtcConnection extends CDREventEnd implements Comparable<CDREventWebrtcConnection> {

	String streamId;
	Participant participant;
	MediaOptions mediaOptions;
	String receivingFrom;

	// webrtcConnectionCreated
	public CDREventWebrtcConnection(String sessionId, String uniqueSessionId, String streamId, Participant participant,
			MediaOptions mediaOptions, String receivingFrom, Long timestamp) {
		super(CDREventName.webrtcConnectionCreated, sessionId, uniqueSessionId, timestamp);
		this.streamId = streamId;
		this.participant = participant;
		this.mediaOptions = mediaOptions;
		this.receivingFrom = receivingFrom;
	}

	// webrtcConnectionDestroyed
	public CDREventWebrtcConnection(CDREventWebrtcConnection event, EndReason reason, Long timestamp) {
		super(CDREventName.webrtcConnectionDestroyed, event.getSessionId(), event.getUniqueSessionId(),
				event.getTimestamp(), reason, timestamp);
		this.streamId = event.streamId;
		this.participant = event.participant;
		this.mediaOptions = event.mediaOptions;
		this.receivingFrom = event.receivingFrom;
	}

	public Participant getParticipant() {
		return this.participant;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("streamId", this.streamId);
		// TODO: remove deprecated "participantId" when possible
		json.addProperty("participantId", this.participant.getParticipantPublicId());
		json.addProperty("connectionId", this.participant.getParticipantPublicId());
		if (this.receivingFrom != null) {
			json.addProperty("connection", "INBOUND");
			json.addProperty("receivingFrom", this.receivingFrom);
		} else {
			json.addProperty("connection", "OUTBOUND");
			if (mediaOptions instanceof KurentoMediaOptions) {
				KurentoMediaOptions kMediaOptions = (KurentoMediaOptions) mediaOptions;
				if (kMediaOptions.rtspUri != null) {
					json.addProperty("rtspUri", kMediaOptions.rtspUri);
					json.addProperty("adaptativeBitrate", kMediaOptions.adaptativeBitrate);
					json.addProperty("networkCache", kMediaOptions.networkCache);
					json.addProperty("onlyPlayWithSubscribers", kMediaOptions.onlyPlayWithSubscribers);
				}
			}
		}
		if (this.mediaOptions.hasVideo()) {
			json.addProperty("videoSource", this.mediaOptions.getTypeOfVideo());
			json.addProperty("videoFramerate", this.mediaOptions.getFrameRate());
			json.addProperty("videoDimensions", this.mediaOptions.getVideoDimensions());
		}
		json.addProperty("audioEnabled", this.mediaOptions.hasAudio());
		json.addProperty("videoEnabled", this.mediaOptions.hasVideo());
		return json;
	}

	public int compareTo(CDREventWebrtcConnection other) {
		if (this.participant.getParticipantPublicId().equals(other.participant.getParticipantPublicId())) {
			if (this.receivingFrom != null && other.receivingFrom != null) {
				if (this.receivingFrom.equals(other.receivingFrom)) {
					return 0;
				} else {
					return 1;
				}
			} else {
				if (this.receivingFrom == null && other.receivingFrom == null) {
					return 0;
				} else {
					return 1;
				}
			}
		}
		return 1;
	}

}
