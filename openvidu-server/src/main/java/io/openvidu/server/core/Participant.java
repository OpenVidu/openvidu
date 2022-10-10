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

package io.openvidu.server.core;

import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import com.google.gson.JsonObject;

import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.server.kurento.endpoint.EndpointType;
import io.openvidu.server.utils.GeoLocation;

public class Participant {

	enum ParticipantStatus {

		/**
		 * The participant has not called Session.publish in the client side yet. The
		 * internal token is available.
		 */
		pending,

		/**
		 * The participant has called Session.publish in the client side and a WebSocket
		 * connection is established. The internal token has been consumed and cannot be
		 * used again.
		 */
		active
	}

	protected String finalUserId; // ID to match this connection with a final user (HttpSession id)
	protected String participantPrivateId; // ID to identify the user on server (org.kurento.jsonrpc.Session.id)
	protected String participantPublicId; // ID to identify the user on clients
	protected String sessionId; // ID of the session to which the participant belongs
	protected String uniqueSessionId;
	protected ParticipantStatus status; // Status of the connection
	protected Long activeAt; // Timestamp when this connection entered status "active"
	protected String clientMetadata = ""; // Metadata provided on client side
	protected Token token; // Token associated to this participant
	protected GeoLocation location; // Location of the participant
	protected String platform; // Platform used by the participant to connect to the session
	protected EndpointType endpointType; // Type of participant (web participant, IP cam participant...)

	// TODO
	// Unify with "PublisherEndpoint.MediaOptions"
	// Also unify "streamPropertyChanged" and "videoData" RPCs when possible
	protected Integer videoWidth = 0;
	protected Integer videoHeight = 0;
	protected Boolean videoActive = false;
	protected Boolean audioActive = false;
	protected Long publishedAt = null; // Timestamp when this participant was published

	protected boolean streaming = false;
	protected volatile boolean closed = false;

	private final String METADATA_SEPARATOR = "%/%";

	/**
	 * This lock protects the initialization of a RecorderEndpoint when INDIVIDUAL
	 * recording
	 */
	public Lock singleRecordingLock = new ReentrantLock();

	public Participant(String finalUserId, String participantPrivateId, String participantPublicId, String sessionId,
			String uniqueSessionId, Token token, String clientMetadata, GeoLocation location, String platform,
			EndpointType endpointType, Long activeAt) {
		this.finalUserId = finalUserId;
		this.participantPrivateId = participantPrivateId;
		this.participantPublicId = participantPublicId;
		this.sessionId = sessionId;
		this.uniqueSessionId = uniqueSessionId;
		this.status = ParticipantStatus.active;
		this.token = token;
		if (activeAt != null) {
			this.activeAt = activeAt;
		} else {
			this.activeAt = System.currentTimeMillis();
		}
		if (clientMetadata != null) {
			this.clientMetadata = clientMetadata;
		}
		this.location = location;
		this.platform = platform;
		this.endpointType = endpointType;
	}

	public String getFinalUserId() {
		return finalUserId;
	}

	public String getParticipantPrivateId() {
		return participantPrivateId;
	}

	public void setParticipantPrivateId(String participantPrivateId) {
		this.participantPrivateId = participantPrivateId;
	}

	public String getParticipantPublicId() {
		return participantPublicId;
	}

	public void setParticipantPublicId(String participantPublicId) {
		this.participantPublicId = participantPublicId;
	}

	public String getSessionId() {
		return sessionId;
	}

	public String getUniqueSessionId() {
		return uniqueSessionId;
	}

	public Long getActiveAt() {
		return this.activeAt;
	}

	public String getClientMetadata() {
		return clientMetadata;
	}

	public void setClientMetadata(String clientMetadata) {
		this.clientMetadata = clientMetadata;
	}

	public String getServerMetadata() {
		return this.token.getServerMetadata();
	}

	public Token getToken() {
		return this.token;
	}

	public GeoLocation getLocation() {
		return this.location;
	}

	public void setLocation(GeoLocation location) {
		this.location = location;
	}

	public String getPlatform() {
		return this.platform;
	}

	public void setPlatform(String platform) {
		this.platform = platform;
	}

	public EndpointType getEndpointType() {
		return this.endpointType;
	}

	public Integer getVideoWidth() {
		return videoWidth;
	}

	public void setVideoWidth(Integer videoWidth) {
		this.videoWidth = videoWidth;
	}

	public Integer getVideoHeight() {
		return videoHeight;
	}

	public void setVideoHeight(Integer videoHeight) {
		this.videoHeight = videoHeight;
	}

	public Boolean isVideoActive() {
		return videoActive;
	}

	public void setVideoActive(Boolean videoActive) {
		this.videoActive = videoActive;
	}

	public Boolean isAudioActive() {
		return audioActive;
	}

	public void setPublishedAt(Long publishedAt) {
		this.publishedAt = publishedAt;
	}

	public Long getPublishedAt() {
		return publishedAt;
	}

	public void setAudioActive(Boolean audioActive) {
		this.audioActive = audioActive;
	}

	public boolean isStreaming() {
		return streaming;
	}

	public boolean isClosed() {
		return closed;
	}

	public boolean isIpcam() {
		return this.platform != null && this.platform.equals("IPCAM")
				&& this.participantPrivateId.startsWith(IdentifierPrefixes.IPCAM_ID);
	}

	public boolean isRecorderParticipant() {
		return ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(this.participantPublicId);
	}

	public boolean isSttParticipant() {
		return ProtocolElements.STT_PARTICIPANT_PUBLICID.equals(this.participantPublicId);
	}

	public boolean isRecorderOrSttParticipant() {
		return (this.isRecorderParticipant() || this.isSttParticipant());
	}

	public String getPublisherStreamId() {
		return null;
	}

	public String getFullMetadata() {
		String fullMetadata = "";
		if (this.clientMetadata != null && !this.clientMetadata.isEmpty()) {
			// Client data defined
			fullMetadata += this.clientMetadata;
		}
		if (this.token.getServerMetadata() != null && !this.token.getServerMetadata().isEmpty()) {
			// Server data defined
			if (fullMetadata.isEmpty()) {
				// Only server data
				fullMetadata += this.token.getServerMetadata();
			} else {
				// Both client data and server data
				fullMetadata += METADATA_SEPARATOR + this.token.getServerMetadata();
			}
		}
		return fullMetadata;
	}

	public void deleteIpcamProperties() {
		this.clientMetadata = null;
		this.token.setToken(null);
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + (participantPrivateId == null ? 0 : participantPrivateId.hashCode());
		result = prime * result + (streaming ? 1231 : 1237);
		result = prime * result + (participantPublicId == null ? 0 : participantPublicId.hashCode());
		return result;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj) {
			return true;
		}
		if (obj == null) {
			return false;
		}
		if (!(obj instanceof Participant)) {
			return false;
		}
		Participant other = (Participant) obj;
		if (participantPrivateId == null) {
			if (other.participantPrivateId != null) {
				return false;
			}
		} else if (!participantPrivateId.equals(other.participantPrivateId)) {
			return false;
		}
		if (streaming != other.streaming) {
			return false;
		}
		if (participantPublicId == null) {
			if (other.participantPublicId != null) {
				return false;
			}
		} else if (!participantPublicId.equals(other.participantPublicId)) {
			return false;
		}
		return true;
	}

	@Override
	public String toString() {
		StringBuilder builder = new StringBuilder();
		builder.append("[");
		if (participantPrivateId != null) {
			builder.append("participantPrivateId=").append(participantPrivateId).append(", ");
		}
		if (participantPublicId != null) {
			builder.append("participantPublicId=").append(participantPublicId).append(", ");
		}
		builder.append("streaming=").append(streaming).append("]");
		return builder.toString();
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		// COMMON
		json.addProperty("id", this.participantPublicId);
		json.addProperty("object", "connection");
		json.addProperty("status", this.status.name());
		json.addProperty("connectionId", this.participantPublicId); // TODO: deprecated. Better use only "id"
		json.addProperty("sessionId", this.sessionId);
		json.addProperty("createdAt", this.token.getCreatedAt());
		json.addProperty("activeAt", this.activeAt);
		json.addProperty("location", this.location != null ? this.location.toString() : "unknown");
		json.addProperty("ip", this.location != null ? this.location.getIp() : null);
		json.addProperty("platform", this.platform);
		if (this.token.getToken() != null) {
			json.addProperty("token", this.token.getToken());
		} else {
			json.add("token", null);
		}
		// Add all ConnectionProperties
		JsonObject connectionPropertiesJson = this.token.getConnectionPropertiesWithFinalJsonFormat();
		connectionPropertiesJson.entrySet().forEach(entry -> {
			json.add(entry.getKey(), entry.getValue());
		});
		json.addProperty("clientData", this.clientMetadata);
		return json;
	}

	public JsonObject withStatsToJson() {
		return null;
	}

}
