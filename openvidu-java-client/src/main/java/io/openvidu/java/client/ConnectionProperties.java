package io.openvidu.java.client;

import com.google.gson.JsonNull;
import com.google.gson.JsonObject;

/**
 * See
 * {@link io.openvidu.java.client.Session#createConnection(ConnectionProperties)}
 */
public class ConnectionProperties {

	private ConnectionType type;
	// COMMON
	private String data;
	private Boolean record;
	// WEBRTC
	private OpenViduRole role;
	private KurentoOptions kurentoOptions;
	// IPCAM
	private String rtspUri;
	private Boolean adaptativeBitrate;
	private Boolean onlyPlayWithSubscribers;
	private Integer networkCache;

	/**
	 * 
	 * Builder for {@link io.openvidu.java.client.ConnectionProperties}
	 *
	 */
	public static class Builder {

		private ConnectionType type;
		// COMMON
		private String data;
		private Boolean record;
		// WEBRTC
		private OpenViduRole role;
		private KurentoOptions kurentoOptions;
		// IPCAM
		private String rtspUri;
		private Boolean adaptativeBitrate;
		private Boolean onlyPlayWithSubscribers;
		private Integer networkCache;

		/**
		 * Builder for {@link io.openvidu.java.client.ConnectionProperties}.
		 */
		public ConnectionProperties build() {
			return new ConnectionProperties(this.type, this.data, this.record, this.role, this.kurentoOptions,
					this.rtspUri, this.adaptativeBitrate, this.onlyPlayWithSubscribers, this.networkCache);
		}

		/**
		 * Call this method to set the type of Connection. The
		 * {@link io.openvidu.java.client.ConnectionType} dictates what properties will
		 * have effect:
		 * <ul>
		 * <li>{@link io.openvidu.java.client.ConnectionType#WEBRTC}:
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#data(String)
		 * data},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#record(boolean)
		 * record},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#role(OpenViduRole)
		 * role},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#kurentoOptions(KurentoOptions)
		 * kurentoOptions}</li>
		 * <li>{@link io.openvidu.java.client.ConnectionType#IPCAM}:
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#data(String)
		 * data},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#record(boolean)
		 * record},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#rtspUri(String)
		 * rtspUri},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#adaptativeBitrate(boolean)
		 * adaptativeBitrate},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#onlyPlayWithSubscribers(boolean)
		 * onlyPlayWithSubscribers},
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#networkCache(int)
		 * networkCache}</li>
		 * </ul>
		 * If not set by default will be
		 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}.
		 */
		public Builder type(ConnectionType type) {
			this.type = type;
			return this;
		}

		/**
		 * Call this method to set the secure (server-side) data associated to this
		 * Connection. Every client will receive this data in property
		 * <code>Connection.data</code>. Object <code>Connection</code> can be retrieved
		 * by subscribing to event <code>connectionCreated</code> of Session object in
		 * your clients.
		 * <ul>
		 * <li>If you have provided no data in your clients when calling method
		 * <code>Session.connect(TOKEN, DATA)</code> (<code>DATA</code> not defined),
		 * then <code>Connection.data</code> will only have this
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#data(String)}
		 * property.</li>
		 * <li>If you have provided some data when calling
		 * <code>Session.connect(TOKEN, DATA)</code> (<code>DATA</code> defined), then
		 * <code>Connection.data</code> will have the following structure:
		 * <code>&quot;CLIENT_DATA%/%SERVER_DATA&quot;</code>, being
		 * <code>CLIENT_DATA</code> the second parameter passed in OpenVidu Browser in
		 * method <code>Session.connect</code> and <code>SERVER_DATA</code> this
		 * {@link io.openvidu.java.client.ConnectionProperties.Builder#data(String)}
		 * property.</li>
		 * </ul>
		 */
		public Builder data(String data) {
			this.data = data;
			return this;
		}

		/**
		 * Call this method to flag the streams published by this Connection to be
		 * recorded or not. This only affects <a href=
		 * "https://docs.openvidu.io/en/stable/advanced-features/recording#selecting-streams-to-be-recorded"
		 * target="_blank">INDIVIDUAL recording</a>. If not set by default will be true.
		 */
		public Builder record(boolean record) {
			this.record = record;
			return this;
		}

		/**
		 * Call this method to set the role assigned to this Connection. If not set by
		 * default will be {@link io.openvidu.java.client.OpenViduRole#PUBLISHER
		 * PUBLISHER}.
		 * 
		 * <br>
		 * <br>
		 * <strong>Only for
		 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
		 */
		public Builder role(OpenViduRole role) {
			this.role = role;
			return this;
		}

		/**
		 * Call this method to set a {@link io.openvidu.java.client.KurentoOptions}
		 * object for this Connection.
		 * 
		 * <br>
		 * <br>
		 * <strong>Only for
		 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
		 */
		public Builder kurentoOptions(KurentoOptions kurentoOptions) {
			this.kurentoOptions = kurentoOptions;
			return this;
		}

		/**
		 * Call this method to set the RTSP URI of an IP camera. For example:
		 * <code>rtsp://your.camera.ip:7777/path</code>
		 * 
		 * <br>
		 * <br>
		 * <strong>Only for
		 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
		 */
		public Builder rtspUri(String rtspUri) {
			this.rtspUri = rtspUri;
			return this;
		}

		/**
		 * Call this method to set whether to use adaptative bitrate (and therefore
		 * adaptative quality) or not. For local network connections that do not require
		 * media transcoding this can be disabled to save CPU power. If you are not sure
		 * if transcoding might be necessary, setting this property to false <strong>may
		 * result in media connections not being established</strong>. Default to
		 * <code>true</code>.
		 * 
		 * <br>
		 * <br>
		 * <strong>Only for
		 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
		 */
		public Builder adaptativeBitrate(boolean adaptativeBitrate) {
			this.adaptativeBitrate = adaptativeBitrate;
			return this;
		}

		/**
		 * Call this method to set whether to enable the IP camera stream only when some
		 * user is subscribed to it, or not. This allows you to reduce power consumption
		 * and network bandwidth in your server while nobody is asking to receive the
		 * camera's video. On the counterpart, first user subscribing to the IP camera
		 * stream will take a little longer to receive its video. Default to
		 * <code>true</code>.
		 * 
		 * <br>
		 * <br>
		 * <strong>Only for
		 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
		 */
		public Builder onlyPlayWithSubscribers(boolean onlyPlayWithSubscribers) {
			this.onlyPlayWithSubscribers = onlyPlayWithSubscribers;
			return this;
		}

		/**
		 * Call this method to set the size of the buffer of the endpoint receiving the
		 * IP camera's stream, in milliseconds. The smaller it is, the less delay the
		 * signal will have, but more problematic will be in unstable networks. Use
		 * short buffers only if there is a quality connection between the IP camera and
		 * OpenVidu Server. Default to <code>2000</code>.
		 * 
		 * <br>
		 * <br>
		 * <strong>Only for
		 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
		 */
		public Builder networkCache(int networkCache) {
			this.networkCache = networkCache;
			return this;
		}
	}

	ConnectionProperties(ConnectionType type, String data, Boolean record, OpenViduRole role,
			KurentoOptions kurentoOptions, String rtspUri, Boolean adaptativeBitrate, Boolean onlyPlayWithSubscribers,
			Integer networkCache) {
		this.type = type;
		this.data = data;
		this.record = record;
		this.role = role;
		this.kurentoOptions = kurentoOptions;
		this.rtspUri = rtspUri;
		this.adaptativeBitrate = adaptativeBitrate;
		this.onlyPlayWithSubscribers = onlyPlayWithSubscribers;
		this.networkCache = networkCache;
	}

	/**
	 * Returns the type of Connection.
	 */
	public ConnectionType getType() {
		return this.type;
	}

	/**
	 * Returns the secure (server-side) metadata assigned to this Connection.
	 */
	public String getData() {
		return this.data;
	}

	/**
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank"
	 * style="display: inline-block; background-color: rgb(0, 136, 170); color:
	 * white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius:
	 * 3px; font-size: 13px; line-height:21px; font-family: Montserrat,
	 * sans-serif">PRO</a> Whether the streams published by this Connection will be
	 * recorded or not. This only affects <a href=
	 * "https://docs.openvidu.io/en/stable/advanced-features/recording#selecting-streams-to-be-recorded"
	 * target="_blank">INDIVIDUAL recording</a>.
	 */
	public Boolean record() {
		return this.record;
	}

	/**
	 * Returns the role assigned to this Connection.
	 * 
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
	 */
	public OpenViduRole getRole() {
		return this.role;
	}

	/**
	 * Returns the KurentoOptions assigned to this Connection.
	 * 
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
	 */
	public KurentoOptions getKurentoOptions() {
		return this.kurentoOptions;
	}

	/**
	 * Returns the RTSP URI of this Connection.
	 * 
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
	 */
	public String getRtspUri() {
		return this.rtspUri;
	}

	/**
	 * Whether this Connection uses adaptative bitrate (and therefore adaptative
	 * quality) or not. For local network connections that do not require media
	 * transcoding this can be disabled to save CPU power. If you are not sure if
	 * transcoding might be necessary, setting this property to false <strong>may
	 * result in media connections not being established</strong>.
	 * 
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
	 */
	public Boolean adaptativeBitrate() {
		return this.adaptativeBitrate;
	}

	/**
	 * Whether to enable the IP camera stream only when some user is subscribed to
	 * it. This allows you to reduce power consumption and network bandwidth in your
	 * server while nobody is asking to receive the camera's video. On the
	 * counterpart, first user subscribing to the IP camera stream will take a
	 * little longer to receive its video.
	 * 
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
	 */
	public Boolean onlyPlayWithSubscribers() {
		return this.onlyPlayWithSubscribers;
	}

	/**
	 * Size of the buffer of the endpoint receiving the IP camera's stream, in
	 * milliseconds. The smaller it is, the less delay the signal will have, but
	 * more problematic will be in unstable networks. Use short buffers only if
	 * there is a quality connection between the IP camera and OpenVidu Server.
	 * 
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
	 */
	public Integer getNetworkCache() {
		return this.networkCache;
	}

	public JsonObject toJson(String sessionId) {
		JsonObject json = new JsonObject();
		json.addProperty("session", sessionId);
		// COMMON
		if (getType() != null) {
			json.addProperty("type", getType().name());
		} else {
			json.add("type", JsonNull.INSTANCE);
		}
		if (getData() != null) {
			json.addProperty("data", getData());
		} else {
			json.add("data", JsonNull.INSTANCE);
		}
		if (record() != null) {
			json.addProperty("record", record());
		} else {
			json.add("record", JsonNull.INSTANCE);
		}
		// WEBRTC
		if (getRole() != null) {
			json.addProperty("role", getRole().name());
		} else {
			json.add("role", JsonNull.INSTANCE);
		}
		if (this.kurentoOptions != null) {
			json.add("kurentoOptions", kurentoOptions.toJson());
		} else {
			json.add("kurentoOptions", JsonNull.INSTANCE);
		}
		// IPCAM
		if (getRtspUri() != null) {
			json.addProperty("rtspUri", getRtspUri());
		} else {
			json.add("rtspUri", JsonNull.INSTANCE);
		}
		if (adaptativeBitrate() != null) {
			json.addProperty("adaptativeBitrate", adaptativeBitrate());
		} else {
			json.add("adaptativeBitrate", JsonNull.INSTANCE);
		}
		if (onlyPlayWithSubscribers() != null) {
			json.addProperty("onlyPlayWithSubscribers", onlyPlayWithSubscribers());
		} else {
			json.add("onlyPlayWithSubscribers", JsonNull.INSTANCE);
		}
		if (getNetworkCache() != null) {
			json.addProperty("networkCache", getNetworkCache());
		} else {
			json.add("networkCache", JsonNull.INSTANCE);
		}
		return json;
	}

}
