/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

/**
 * See {@link io.openvidu.java.client.OpenVidu#createSession(SessionProperties)}
 */
public class SessionProperties {

	private MediaMode mediaMode;
	private RecordingMode recordingMode;
	private RecordingLayout defaultRecordingLayout;
	private String defaultCustomLayout;
	private String customSessionId;

	/**
	 * Builder for {@link io.openvidu.java.client.SessionProperties}
	 */
	public static class Builder {

		private MediaMode mediaMode = MediaMode.ROUTED;
		private RecordingMode recordingMode = RecordingMode.MANUAL;
		private RecordingLayout defaultRecordingLayout = RecordingLayout.BEST_FIT;
		private String defaultCustomLayout = "";
		private String customSessionId = "";

		/**
		 * Returns the {@link io.openvidu.java.client.SessionProperties} object properly
		 * configured
		 */
		public SessionProperties build() {
			return new SessionProperties(this.mediaMode, this.recordingMode, this.defaultRecordingLayout,
					this.defaultCustomLayout, this.customSessionId);
		}

		/**
		 * Call this method to set how the media streams will be sent and received by
		 * your clients: routed through OpenVidu Media Server
		 * (<code>MediaMode.ROUTED</code>) or attempting direct p2p connections
		 * (<code>MediaMode.RELAYED</code>, <i>not available yet</i>)
		 * 
		 * Default value is <code>MediaMode.ROUTED</code>
		 */
		public SessionProperties.Builder mediaMode(MediaMode mediaMode) {
			this.mediaMode = mediaMode;
			return this;
		}

		/**
		 * Call this method to set whether the Session will be automatically recorded
		 * (<code>RecordingMode.ALWAYS</code>) or not
		 * (<code>RecordingMode.MANUAL</code>)
		 * 
		 * Default value is <code>RecordingMode.MANUAL</code>
		 */
		public SessionProperties.Builder recordingMode(RecordingMode recordingMode) {
			this.recordingMode = recordingMode;
			return this;
		}

		/**
		 * Call this method to set the the default value used to initialize property
		 * {@link io.openvidu.java.client.RecordingProperties#recordingLayout()} of
		 * every recording of this session. You can easily override this value later
		 * when initializing a {@link io.openvidu.java.client.Recording} by calling
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#recordingLayout(RecordingLayout)}
		 * with any other value
		 * 
		 * Default value is <code>RecordingLayout.BEST_FIT</code>
		 */
		public SessionProperties.Builder defaultRecordingLayout(RecordingLayout layout) {
			this.defaultRecordingLayout = layout;
			return this;
		}

		/**
		 * Call this method to set the default value used to initialize property
		 * {@link io.openvidu.java.client.RecordingProperties#customLayout()} of every
		 * recording of this session. You can easily override this value later when
		 * initializing a {@link io.openvidu.java.client.Recording} by calling
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#customLayout(String)}
		 * with any other value
		 */
		public SessionProperties.Builder defaultCustomLayout(String path) {
			this.defaultCustomLayout = path;
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

	}

	protected SessionProperties() {
		this.mediaMode = MediaMode.ROUTED;
		this.recordingMode = RecordingMode.MANUAL;
		this.defaultRecordingLayout = RecordingLayout.BEST_FIT;
		this.defaultCustomLayout = "";
		this.customSessionId = "";
	}

	private SessionProperties(MediaMode mediaMode, RecordingMode recordingMode, RecordingLayout layout,
			String defaultCustomLayout, String customSessionId) {
		this.mediaMode = mediaMode;
		this.recordingMode = recordingMode;
		this.defaultRecordingLayout = layout;
		this.defaultCustomLayout = defaultCustomLayout;
		this.customSessionId = customSessionId;
	}

	/**
	 * Defines whether the Session will be automatically recorded
	 * (<code>RecordingMode.ALWAYS</code>) or not
	 * (<code>RecordingMode.MANUAL</code>)
	 */
	public RecordingMode recordingMode() {
		return this.recordingMode;
	}

	/**
	 * Defines how the media streams will be sent and received by your clients:
	 * routed through OpenVidu Media Server (<code>MediaMode.ROUTED</code>) or
	 * attempting direct p2p connections (<code>MediaMode.RELAYED</code>, <i>not
	 * available yet</i>)
	 */
	public MediaMode mediaMode() {
		return this.mediaMode;
	}

	/**
	 * Defines the default value used to initialize property
	 * {@link io.openvidu.java.client.RecordingProperties#recordingLayout()} of
	 * every recording of this session. You can easily override this value later
	 * when initializing a {@link io.openvidu.java.client.Recording} by calling
	 * {@link io.openvidu.java.client.RecordingProperties.Builder#recordingLayout(RecordingLayout)}
	 * with any other value
	 */
	public RecordingLayout defaultRecordingLayout() {
		return this.defaultRecordingLayout;
	}

	/**
	 * Defines the default value used to initialize property
	 * {@link io.openvidu.java.client.RecordingProperties#customLayout()} of every
	 * recording of this session. You can easily override this value later when
	 * initializing a {@link io.openvidu.java.client.Recording} by calling
	 * {@link io.openvidu.java.client.RecordingProperties.Builder#customLayout(String)}
	 * with any other value
	 */
	public String defaultCustomLayout() {
		return this.defaultCustomLayout;
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

}