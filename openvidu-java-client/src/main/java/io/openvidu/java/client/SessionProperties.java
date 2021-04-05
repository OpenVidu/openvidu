/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import com.google.gson.JsonObject;

/**
 * See {@link io.openvidu.java.client.OpenVidu#createSession(SessionProperties)}
 */
public class SessionProperties {

	private MediaMode mediaMode;
	private RecordingMode recordingMode;
	private RecordingProperties defaultRecordingProperties;
	private String customSessionId;
	private String mediaNode;
	private VideoCodec forcedVideoCodec;
	private Boolean allowTranscoding;

	/**
	 * Builder for {@link io.openvidu.java.client.SessionProperties}
	 */
	public static class Builder {

		private MediaMode mediaMode = MediaMode.ROUTED;
		private RecordingMode recordingMode = RecordingMode.MANUAL;
		private RecordingProperties defaultRecordingProperties = new RecordingProperties.Builder().build();
		private String customSessionId = "";
		private String mediaNode;
		private VideoCodec forcedVideoCodec = VideoCodec.VP8;
		private Boolean allowTranscoding = false;

		/**
		 * Returns the {@link io.openvidu.java.client.SessionProperties} object properly
		 * configured
		 */
		public SessionProperties build() {
			return new SessionProperties(this.mediaMode, this.recordingMode, this.defaultRecordingProperties,
					this.customSessionId, this.mediaNode, this.forcedVideoCodec, this.allowTranscoding);
		}

		/**
		 * Call this method to set how the media streams will be sent and received by
		 * your clients: routed through OpenVidu Media Node
		 * (<code>MediaMode.ROUTED</code>) or attempting direct p2p connections
		 * (<code>MediaMode.RELAYED</code>, <i>not available yet</i>)<br>
		 * Default value is <code>MediaMode.ROUTED</code>
		 */
		public SessionProperties.Builder mediaMode(MediaMode mediaMode) {
			this.mediaMode = mediaMode;
			return this;
		}

		/**
		 * Call this method to set whether the Session will be automatically recorded
		 * ({@link RecordingMode#ALWAYS}) or not ({@link RecordingMode#MANUAL})<br>
		 * Default value is {@link RecordingMode#MANUAL}
		 */
		public SessionProperties.Builder recordingMode(RecordingMode recordingMode) {
			this.recordingMode = recordingMode;
			return this;
		}

		/**
		 * Call this method to set the default recording properties of this session. You
		 * can easily override this value later when starting a
		 * {@link io.openvidu.java.client.Recording} by providing new
		 * {@link RecordingProperties}<br>
		 * Default values defined in {@link RecordingProperties} class.
		 */
		public SessionProperties.Builder defaultRecordingProperties(RecordingProperties defaultRecordingProperties) {
			this.defaultRecordingProperties = defaultRecordingProperties;
			return this;
		}

		/**
		 * Call this method to fix the sessionId that will be assigned to the session.
		 * You can take advantage of this property to facilitate the mapping between
		 * OpenVidu Server 'session' entities and your own 'session' entities. If this
		 * parameter is undefined or an empty string, OpenVidu Server will generate a
		 * random sessionId for you.
		 */
		public SessionProperties.Builder customSessionId(String customSessionId) {
			this.customSessionId = customSessionId;
			return this;
		}

		/**
		 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank"
		 * style="display: inline-block; background-color: rgb(0, 136, 170); color:
		 * white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius:
		 * 3px; font-size: 13px; line-height:21px; font-family: Montserrat,
		 * sans-serif">PRO</a> Call this method to force the session to be hosted in the
		 * Media Node with identifier <code>mediaNodeId</code>
		 */
		public SessionProperties.Builder mediaNode(String mediaNodeId) {
			this.mediaNode = mediaNodeId;
			return this;
		}

		/**
		 * Call this method to define which video codec do you want to be forcibly used
		 * for this session. This allows browsers/clients to use the same codec avoiding
		 * transcoding in the media server. If the browser/client is not compatible with
		 * the specified codec and {@link #allowTranscoding(Boolean)} is
		 * <code>false</code> and exception will occur. If forcedVideoCodec is set to
		 * NONE, no codec will be forced.<br>
		 * Default value is {@link VideoCodec#VP8}
		 */
		public SessionProperties.Builder forcedVideoCodec(VideoCodec forcedVideoCodec) {
			this.forcedVideoCodec = forcedVideoCodec;
			return this;
		}

		/**
		 * Call this method to define if you want to allow transcoding in the media
		 * server or not when {@link #forcedVideoCodec(VideoCodec)} is not compatible
		 * with the browser/client.<br>
		 * Default value is false
		 */
		public SessionProperties.Builder allowTranscoding(Boolean allowTranscoding) {
			this.allowTranscoding = allowTranscoding;
			return this;
		}

	}

	protected SessionProperties() {
		this.mediaMode = MediaMode.ROUTED;
		this.recordingMode = RecordingMode.MANUAL;
		this.defaultRecordingProperties = new RecordingProperties.Builder().build();
		this.customSessionId = "";
		this.mediaNode = "";
	}

	private SessionProperties(MediaMode mediaMode, RecordingMode recordingMode,
			RecordingProperties defaultRecordingProperties, String customSessionId, String mediaNode,
			VideoCodec forcedVideoCodec, Boolean allowTranscoding) {
		this.mediaMode = mediaMode;
		this.recordingMode = recordingMode;
		this.defaultRecordingProperties = defaultRecordingProperties;
		this.customSessionId = customSessionId;
		this.mediaNode = mediaNode;
		this.forcedVideoCodec = forcedVideoCodec;
		this.allowTranscoding = allowTranscoding;
	}

	/**
	 * Defines how the media streams will be sent and received by your clients:
	 * routed through OpenVidu Media Node (<code>MediaMode.ROUTED</code>) or
	 * attempting direct p2p connections (<code>MediaMode.RELAYED</code>, <i>not
	 * available yet</i>)
	 */
	public MediaMode mediaMode() {
		return this.mediaMode;
	}

	/**
	 * Defines whether the Session will be automatically recorded
	 * ({@link RecordingMode#ALWAYS}) or not ({@link RecordingMode#MANUAL})
	 */
	public RecordingMode recordingMode() {
		return this.recordingMode;
	}

	/**
	 * Defines the default recording properties of this session. You can easily
	 * override this value later when starting a
	 * {@link io.openvidu.java.client.Recording} by providing new
	 * {@link RecordingProperties}
	 */
	public RecordingProperties defaultRecordingProperties() {
		return this.defaultRecordingProperties;
	}

	/**
	 * Fixes the value of the sessionId property of the Session. You can take
	 * advantage of this property to facilitate the mapping between OpenVidu Server
	 * 'session' entities and your own 'session' entities. If this parameter is
	 * undefined or an empty string, OpenVidu Server will generate a random
	 * sessionId for you.
	 */
	public String customSessionId() {
		return this.customSessionId;
	}

	/**
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank"
	 * style="display: inline-block; background-color: rgb(0, 136, 170); color:
	 * white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius:
	 * 3px; font-size: 13px; line-height:21px; font-family: Montserrat,
	 * sans-serif">PRO</a> The Media Node where to host the session. The default
	 * option if this property is not defined is the less loaded Media Node at the
	 * moment the first user joins the session.
	 */
	public String mediaNode() {
		return this.mediaNode;
	}

	/**
	 * Defines which video codec is being forced to be used in the browser/client
	 */
	public VideoCodec forcedVideoCodec() {
		return this.forcedVideoCodec;
	}

	/**
	 * Defines if transcoding is allowed or not when {@link #forcedVideoCodec} is
	 * not a compatible codec with the browser/client.
	 */
	public Boolean isTranscodingAllowed() {
		return this.allowTranscoding;
	}

	protected JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("mediaMode", mediaMode().name());
		json.addProperty("recordingMode", recordingMode().name());
		json.addProperty("customSessionId", customSessionId());
		json.add("defaultRecordingProperties", defaultRecordingProperties.toJson());
		if (mediaNode() != null) {
			JsonObject mediaNodeJson = new JsonObject();
			mediaNodeJson.addProperty("id", mediaNode());
			json.add("mediaNode", mediaNodeJson);
		}
		if (forcedVideoCodec() != null) {
			json.addProperty("forcedVideoCodec", forcedVideoCodec().name());
		}
		if (isTranscodingAllowed() != null) {
			json.addProperty("allowTranscoding", isTranscodingAllowed());
		}
		return json;
	}

}