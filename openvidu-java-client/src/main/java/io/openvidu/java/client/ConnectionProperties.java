package io.openvidu.java.client;

import java.net.MalformedURLException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;

/**
 * See
 * {@link io.openvidu.java.client.Session#createConnection(ConnectionProperties)}
 */
public class ConnectionProperties {

	public static class DefaultValues {
		public static final ConnectionType type = ConnectionType.WEBRTC;
		public static final String data = "";
		public static final Boolean record = true;
		public static final OpenViduRole role = OpenViduRole.PUBLISHER;
		public static final KurentoOptions kurentoOptions = null;
		public static final String rtspUri = null;
		public static final Boolean adaptativeBitrate = true;
		public static final Boolean onlyPlayWithSubscribers = true;
		public static final Integer networkCache = 2000;
		public static final List<IceServerProperties> customIceServers = null;
	}

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

	// External Turn Service
	private List<IceServerProperties> customIceServers;

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
		private List<IceServerProperties> customIceServers = new ArrayList<>();
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
					this.rtspUri, this.adaptativeBitrate, this.onlyPlayWithSubscribers, this.networkCache,
					this.customIceServers);
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
		 * "https://docs.openvidu.io/en/stable/advanced-features/recording/#individual-recording-selection">
		 * INDIVIDUAL recording </a>. If not set, by default will be true.
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
		 * 
		 * @throws MalformedURLException
		 */
		public Builder rtspUri(String rtspUri) throws MalformedURLException {
			checkRtspUri(rtspUri);
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

		/**
		 * On certain type of networks, clients using default OpenVidu STUN/TURN server
		 * can not be reached it because firewall rules and network topologies at the
		 * client side. This method allows you to configure your own ICE Server for
		 * specific connections if you need it. This is usually not necessary, only it
		 * is usefull for OpenVidu users behind firewalls which allows traffic from/to
		 * specific ports which may need a custom ICE Server configuration
		 *
		 * Add an ICE Server if in your use case you need this connection to use your
		 * own ICE Server deployment. When the user uses this connection, it will use
		 * the specified ICE Servers defined here.
		 *
		 * The level of precedence for ICE Server configuration on every OpenVidu
		 * connection is:
		 * <ol>
		 * <li>Configured ICE Server using Openvidu.setAdvancedCofiguration() at
		 * openvidu-browser.</li>
		 * <li>Configured ICE server at
		 * {@link io.openvidu.java.client.ConnectionProperties#customIceServers
		 * ConnectionProperties.customIceServers}</li>
		 * <li>Configured ICE Server at global configuration parameter:
		 * OPENVIDU_WEBRTC_ICE_SERVERS</li>
		 * <li>Default deployed Coturn within OpenVidu deployment</li>
		 * </ol>
		 * <br>
		 * If no value is found at level 1, level 2 will be used, and so on until level
		 * 4. <br>
		 * This method is equivalent to level 2 of precedence. <br>
		 * <br>
		 * <strong>Only for
		 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
		 */
		public Builder addCustomIceServer(IceServerProperties iceServerProperties) {
			this.customIceServers.add(iceServerProperties);
			return this;
		}
	}

	ConnectionProperties(ConnectionType type, String data, Boolean record, OpenViduRole role,
			KurentoOptions kurentoOptions, String rtspUri, Boolean adaptativeBitrate, Boolean onlyPlayWithSubscribers,
			Integer networkCache, List<IceServerProperties> customIceServers) {
		this.type = type;
		this.data = data;
		this.record = record;
		this.role = role;
		this.kurentoOptions = kurentoOptions;
		this.rtspUri = rtspUri;
		this.adaptativeBitrate = adaptativeBitrate;
		this.onlyPlayWithSubscribers = onlyPlayWithSubscribers;
		this.networkCache = networkCache;
		this.customIceServers = customIceServers;
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
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" style="display:
	 * inline-block; background-color: rgb(0, 136, 170); color: white; font-weight:
	 * bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size:
	 * 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a> Whether
	 * the streams published by this Connection will be recorded or not. This only
	 * affects <a href=
	 * "https://docs.openvidu.io/en/stable/advanced-features/recording/#individual-recording-selection">
	 * INDIVIDUAL recording </a>.
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

	/**
	 * Returns a list of custom ICE Servers configured for this connection. <br>
	 * <br>
	 * See
	 * {@link io.openvidu.java.client.ConnectionProperties.Builder#addCustomIceServer(IceServerProperties)}
	 * for more information. <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
	 */
	public List<IceServerProperties> getCustomIceServers() {
		return new ArrayList<>(this.customIceServers);
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
		JsonArray customIceServersJsonList = new JsonArray();
		customIceServers.forEach((customIceServer) -> {
			customIceServersJsonList.add(customIceServer.toJson());
		});
		json.add("customIceServers", customIceServersJsonList);

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

	/**
	 * Obtain a {@link ConnectionProperties.Builder} directly from a JSON object in
	 * the form of a Map
	 * 
	 * @return A {@link ConnectionProperties.Builder}
	 * @throws IllegalArgumentException If some parameter has a wrong type or an
	 *                                  invalid value
	 */
	public static ConnectionProperties.Builder fromJson(Map<String, ?> params) throws IllegalArgumentException {

		ConnectionProperties.Builder builder = new ConnectionProperties.Builder();

		if (params == null) {
			params = new HashMap<>();
		}

		String typeString;
		String data;
		try {
			typeString = (String) params.get("type");
			data = (String) params.get("data");
		} catch (ClassCastException e) {
			throw new IllegalArgumentException("Type error in some parameter: " + e.getMessage());
		}

		ConnectionType type;
		try {
			if (typeString != null) {
				type = ConnectionType.valueOf(typeString);
			} else {
				type = DefaultValues.type;
			}
		} catch (IllegalArgumentException e) {
			throw new IllegalArgumentException("Parameter 'type' " + typeString + " is not defined");
		}
		data = data != null ? data : DefaultValues.data;

		// Build COMMON options
		builder.type(type).data(data).record(true);

		OpenViduRole role = null;
		KurentoOptions kurentoOptions = null;

		if (ConnectionType.WEBRTC.equals(type)) {
			String roleString;
			try {
				roleString = (String) params.get("role");
			} catch (ClassCastException e) {
				throw new IllegalArgumentException("Type error in parameter 'role': " + e.getMessage());
			}
			try {
				if (roleString != null) {
					role = OpenViduRole.valueOf(roleString);
				} else {
					role = DefaultValues.role;
				}
			} catch (IllegalArgumentException e) {
				throw new IllegalArgumentException("Parameter role " + params.get("role") + " is not defined");
			}
			JsonObject kurentoOptionsJson = null;
			if (params.get("kurentoOptions") != null) {
				try {
					kurentoOptionsJson = new Gson().toJsonTree(params.get("kurentoOptions"), Map.class)
							.getAsJsonObject();
				} catch (Exception e) {
					throw new IllegalArgumentException(
							"Error in parameter 'kurentoOptions'. It is not a valid JSON object");
				}
			}
			if (kurentoOptionsJson != null) {
				try {
					KurentoOptions.Builder builder2 = new KurentoOptions.Builder();
					if (kurentoOptionsJson.has("videoMaxRecvBandwidth")) {
						builder2.videoMaxRecvBandwidth(kurentoOptionsJson.get("videoMaxRecvBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("videoMinRecvBandwidth")) {
						builder2.videoMinRecvBandwidth(kurentoOptionsJson.get("videoMinRecvBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("videoMaxSendBandwidth")) {
						builder2.videoMaxSendBandwidth(kurentoOptionsJson.get("videoMaxSendBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("videoMinSendBandwidth")) {
						builder2.videoMinSendBandwidth(kurentoOptionsJson.get("videoMinSendBandwidth").getAsInt());
					}
					if (kurentoOptionsJson.has("allowedFilters")) {
						JsonArray filters = kurentoOptionsJson.get("allowedFilters").getAsJsonArray();
						String[] arrayOfFilters = new String[filters.size()];
						Iterator<JsonElement> it = filters.iterator();
						int index = 0;
						while (it.hasNext()) {
							arrayOfFilters[index] = it.next().getAsString();
							index++;
						}
						builder2.allowedFilters(arrayOfFilters);
					}
					kurentoOptions = builder2.build();
				} catch (Exception e) {
					throw new IllegalArgumentException(
							"Type error in some parameter of 'kurentoOptions': " + e.getMessage());
				}
			}

			// Custom Ice Servers
			JsonArray customIceServersJsonArray = null;
			if (params.get("customIceServers") != null) {
				try {
					customIceServersJsonArray = new Gson().toJsonTree(params.get("customIceServers"), List.class)
							.getAsJsonArray();
				} catch (Exception e) {
					throw new IllegalArgumentException(
							"Error in parameter 'customIceServersJson'. It is not a valid JSON object");
				}
			}
			if (customIceServersJsonArray != null) {
				try {
					for (int i = 0; i < customIceServersJsonArray.size(); i++) {
						JsonObject customIceServerJson = customIceServersJsonArray.get(i).getAsJsonObject();
						IceServerProperties.Builder iceServerPropertiesBuilder = new IceServerProperties.Builder();
						iceServerPropertiesBuilder.url(customIceServerJson.get("url").getAsString());
						if (customIceServerJson.has("staticAuthSecret")) {
							iceServerPropertiesBuilder
									.staticAuthSecret(customIceServerJson.get("staticAuthSecret").getAsString());
						}
						if (customIceServerJson.has("username")) {
							iceServerPropertiesBuilder.username(customIceServerJson.get("username").getAsString());
						}
						if (customIceServerJson.has("credential")) {
							iceServerPropertiesBuilder.credential(customIceServerJson.get("credential").getAsString());
						}
						IceServerProperties iceServerProperties = iceServerPropertiesBuilder.build();
						builder.addCustomIceServer(iceServerProperties);
					}
				} catch (Exception e) {
					throw new IllegalArgumentException(
							"Type error in some parameter of 'customIceServers': " + e.getMessage());
				}
			}

			// Build WEBRTC options
			builder.role(role).kurentoOptions(kurentoOptions);

		} else if (ConnectionType.IPCAM.equals(type)) {
			String rtspUri;
			Boolean adaptativeBitrate;
			Boolean onlyPlayWithSubscribers;
			Number networkCache;
			try {
				rtspUri = (String) params.get("rtspUri");
				adaptativeBitrate = (Boolean) params.get("adaptativeBitrate");
				onlyPlayWithSubscribers = (Boolean) params.get("onlyPlayWithSubscribers");
				networkCache = (Number) params.get("networkCache");
			} catch (ClassCastException e) {
				throw new IllegalArgumentException("Type error in some parameter: " + e.getMessage());
			}
			adaptativeBitrate = adaptativeBitrate != null ? adaptativeBitrate : DefaultValues.adaptativeBitrate;
			onlyPlayWithSubscribers = onlyPlayWithSubscribers != null ? onlyPlayWithSubscribers
					: DefaultValues.onlyPlayWithSubscribers;
			networkCache = networkCache != null ? networkCache : DefaultValues.networkCache;
			if (rtspUri != null) {
				try {
					checkRtspUri(rtspUri);
				} catch (MalformedURLException e) {
					throw new IllegalArgumentException("Error in parameter 'rtspUri': " + e.getMessage());
				}
			}

			// Build IPCAM options
			try {
				builder.rtspUri(rtspUri).adaptativeBitrate(adaptativeBitrate)
						.onlyPlayWithSubscribers(onlyPlayWithSubscribers).networkCache(networkCache.intValue()).build();
			} catch (MalformedURLException e) {
				throw new IllegalArgumentException("Type error in some parameter: " + e.getMessage());
			}
		}

		Boolean record;
		try {
			record = (Boolean) params.get("record");
		} catch (ClassCastException e) {
			throw new IllegalArgumentException("Type error in parameter 'record': " + e.getMessage());
		}
		record = record != null ? record : DefaultValues.record;
		builder.record(record);

		return builder;
	}

	/**
	 * @hidden
	 */
	public static URI checkRtspUri(String rtspUri) throws MalformedURLException {
		try {
			URI uri = new URI(rtspUri);
			List<String> allowedSchemes = Arrays.asList("file", "rtsp", "rtsps", "http", "https");
			if (!allowedSchemes.contains(uri.getScheme())) {
				throw new MalformedURLException(
						"RTSP URI does not contain a valid protocol " + allowedSchemes.toString());
			}
			return uri;
		} catch (Exception e) {
			throw new MalformedURLException(e.getMessage());
		}
	}

}
