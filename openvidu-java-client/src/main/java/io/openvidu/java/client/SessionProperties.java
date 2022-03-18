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
	private VideoCodec forcedVideoCodecResolved;
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
		private VideoCodec forcedVideoCodec = VideoCodec.MEDIA_SERVER_PREFERRED;
		private VideoCodec forcedVideoCodecResolved = VideoCodec.NONE;
		private Boolean allowTranscoding = false;

		/**
		 * Returns the {@link io.openvidu.java.client.SessionProperties} object properly
		 * configured
		 */
		public SessionProperties build() {
			return new SessionProperties(this.mediaMode, this.recordingMode, this.defaultRecordingProperties,
					this.customSessionId, this.mediaNode, this.forcedVideoCodec, this.forcedVideoCodecResolved,
					this.allowTranscoding);
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
		 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/"
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
		 * Define which video codec will be forcibly used for this session.
		 * This forces all browsers/clients to use the same codec, which would
		 * avoid transcoding in the media server (Kurento only). If
		 * <code>forcedVideoCodec</code> is set to NONE, no codec will be forced.
		 *
		 * If the browser/client is not compatible with the specified codec, and
		 * {@link #allowTranscoding(Boolean)} is <code>false</code>, an
		 * exception will occur.
		 *
		 * If defined here, this parameter has prevalence over
		 * OPENVIDU_STREAMS_FORCED_VIDEO_CODEC.
		 *
		 * Default is {@link VideoCodec#MEDIA_SERVER_PREFERRED}.
		 */
		public SessionProperties.Builder forcedVideoCodec(VideoCodec forcedVideoCodec) {
			this.forcedVideoCodec = forcedVideoCodec;
			return this;
		}

		/**
		 * Actual video codec that will be forcibly used for this session.
		 * This is the same as <code>forcedVideoCodec</code>, except when its
		 * value is {@link VideoCodec#MEDIA_SERVER_PREFERRED}: in that case,
		 * OpenVidu Server will fill this property with a resolved value,
		 * depending on what is the configured media server.
		 */
		public SessionProperties.Builder forcedVideoCodecResolved(VideoCodec forcedVideoCodec) {
			this.forcedVideoCodecResolved = forcedVideoCodec;
			return this;
		}

		/**
		 * Call this method to define if you want to allow transcoding in the media
		 * server or not when {@link #forcedVideoCodec(VideoCodec)} is not compatible
		 * with the browser/client.<br>
		 * If defined here, this parameter has prevalence over
		 * OPENVIDU_STREAMS_ALLOW_TRANSCODING. OPENVIDU_STREAMS_ALLOW_TRANSCODING
		 * default is 'false'
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
			VideoCodec forcedVideoCodec, VideoCodec forcedVideoCodecResolved, Boolean allowTranscoding) {
		this.mediaMode = mediaMode;
		this.recordingMode = recordingMode;
		this.defaultRecordingProperties = defaultRecordingProperties;
		this.customSessionId = customSessionId;
		this.mediaNode = mediaNode;
		this.forcedVideoCodec = forcedVideoCodec;
		this.forcedVideoCodecResolved = forcedVideoCodecResolved;
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
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/"
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
	 * Defines which video codec is being forced to be used in the browser/client.
	 * This is the raw value that was configured. It might get resolved into a
	 * different one for actual usage in the server.
	 */
	public VideoCodec forcedVideoCodec() {
		return this.forcedVideoCodec;
	}

	/**
	 * Defines which video codec is being forced to be used in the browser/client.
	 * This is the resolved value, for actual usage in the server.
	 *
	 * @hidden
	 */
	public VideoCodec forcedVideoCodecResolved() {
		return this.forcedVideoCodecResolved;
	}

	/**
	 * Defines if transcoding is allowed or not when {@link #forcedVideoCodec} is
	 * not a compatible codec with the browser/client.
	 */
	public Boolean isTranscodingAllowed() {
		return this.allowTranscoding;
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("mediaMode", this.mediaMode.name());
		json.addProperty("recordingMode", this.recordingMode.name());
		json.add("defaultRecordingProperties", this.defaultRecordingProperties.toJson());
		json.addProperty("customSessionId", this.customSessionId);
		if (this.mediaNode != null && !this.mediaNode.isEmpty()) {
			JsonObject mediaNodeJson = new JsonObject();
			mediaNodeJson.addProperty("id", this.mediaNode);
			json.add("mediaNode", mediaNodeJson);
		}
		if (this.forcedVideoCodec != null) {
			json.addProperty("forcedVideoCodec", this.forcedVideoCodec.name());
		}
		if (this.forcedVideoCodecResolved != null) {
			json.addProperty("forcedVideoCodecResolved", this.forcedVideoCodecResolved.name());
		}
		if (this.allowTranscoding != null) {
			json.addProperty("allowTranscoding", this.allowTranscoding);
		}
		return json;
	}

}
