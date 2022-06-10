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

import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * See {@link io.openvidu.java.client.Session#getConnections()}
 */
public class Connection {

	private String connectionId;
	private String status;
	private Long createdAt;
	private Long activeAt;
	private String location;
	private String ip;
	private String platform;
	private String clientData;
	private ConnectionProperties connectionProperties;
	private String token;

	protected Map<String, Publisher> publishers = new ConcurrentHashMap<>();
	protected List<String> subscribers = new ArrayList<>();

	protected Connection(JsonObject json) {
		this.resetWithJson(json);
	}

	/**
	 * Returns the identifier of the Connection. You can call methods
	 * {@link io.openvidu.java.client.Session#forceDisconnect(String)} or
	 * {@link io.openvidu.java.client.Session#updateConnection(String, ConnectionProperties)}
	 * passing this property as parameter
	 */
	public String getConnectionId() {
		return connectionId;
	}

	/**
	 * Returns the status of the Connection. Can be:
	 * <ul>
	 * <li><code>pending</code>: if the Connection is waiting for any user to use
	 * its internal token to connect to the session, calling method
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html#connect">
	 *   Session.connect
	 * </a> in OpenVidu Browser.</li>
	 * <li><code>active</code>: if the internal token of the Connection has already
	 * been used by some user to connect to the session, and it cannot be used
	 * again.</li>
	 */
	public String getStatus() {
		return this.status;
	}

	/**
	 * Timestamp when this Connection was created, in UTC milliseconds (ms since Jan
	 * 1, 1970, 00:00:00 UTC)
	 */
	public Long createdAt() {
		return this.createdAt;
	}

	/**
	 * Timestamp when this Connection was taken by a user (passing from status
	 * "pending" to "active"), in UTC milliseconds (ms since Jan 1, 1970, 00:00:00
	 * UTC)
	 */
	public Long activeAt() {
		return this.activeAt;
	}

	/**
	 * Returns the type of Connection.
	 */
	public ConnectionType getType() {
		return this.connectionProperties.getType();
	}

	/**
	 * Returns the data associated to the Connection on the server-side. This value
	 * is set with {@link io.openvidu.java.client.TokenOptions.Builder#data(String)}
	 * when calling {@link io.openvidu.java.client.Session#generateToken()}
	 */
	public String getServerData() {
		return this.connectionProperties.getData();
	}

	/**
	 * Whether the streams published by this Connection will be recorded or not.
	 * This only affects
	 * <a href="https://docs.openvidu.io/en/stable/advanced-features/recording/#individual-recording-selection">
	 *   INDIVIDUAL recording
	 * </a>.
	 */
	public boolean record() {
		return this.connectionProperties.record();
	}

	/**
	 * Returns the role of the Connection.
	 *
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
	 */
	public OpenViduRole getRole() {
		return this.connectionProperties.getRole();
	}

	/**
	 * Returns the RTSP URI of the Connection.
	 *
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
	 */
	public String getRtspUri() {
		return this.connectionProperties.getRtspUri();
	}

	/**
	 * Whether the Connection uses adaptative bitrate (and therefore adaptative
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
		return this.connectionProperties.adaptativeBitrate();
	}

	/**
	 * Whether the IP camera stream of this Connection will only be enabled when
	 * some user is subscribed to it, or not. This allows you to reduce power
	 * consumption and network bandwidth in your server while nobody is asking to
	 * receive the camera's video. On the counterpart, first user subscribing to the
	 * IP camera stream will take a little longer to receive its video.
	 *
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
	 */
	public Boolean onlyPlayWithSubscribers() {
		return this.connectionProperties.onlyPlayWithSubscribers();
	}

	/**
	 * Returns the size of the buffer of the endpoint receiving the IP camera's
	 * stream, in milliseconds. The smaller it is, the less delay the signal will
	 * have, but more problematic will be in unstable networks. Use short buffers
	 * only if there is a quality connection between the IP camera and OpenVidu
	 * Server.
	 *
	 * <br>
	 * <br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#IPCAM}</strong>
	 */
	public Integer getNetworkCache() {
		return this.connectionProperties.getNetworkCache();
	}

	/**
	 * Returns a list of custom ICE Servers configured for this connection.
	 * <br><br>
	 * See {@link io.openvidu.java.client.ConnectionProperties.Builder#addCustomIceServer(IceServerProperties)} for more
	 * information.
	 * <br><br>
	 * <strong>Only for
	 * {@link io.openvidu.java.client.ConnectionType#WEBRTC}</strong>
	 */
	public List<IceServerProperties> getCustomIceServers() {
		return this.connectionProperties.getCustomIceServers();
	}

	/**
	 * Returns the token string associated to the Connection. This is the value that
	 * must be sent to the client-side to be consumed in OpenVidu Browser method
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html#connect">
	 *   Session.connect
	 * </a>.
	 */
	public String getToken() {
		return this.token;
	}

	/**
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/"
	 * style="display: inline-block; background-color: rgb(0, 136, 170); color:
	 * white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius:
	 * 3px; font-size: 13px; line-height:21px; font-family: Montserrat,
	 * sans-serif">PRO</a>
	 *
	 * Returns the geo location of the connection, with the following format:
	 * <code>"CITY, COUNTRY"</code> (<code>"unknown"</code> if it wasn't possible to
	 * locate it)
	 */
	public String getLocation() {
		return location;
	}

	/**
	 * Returns the IP of the connection, as seen by OpenVidu Server
	 */
	public String getIp() {
		return ip;
	}

	/**
	 * Returns a complete description of the platform used by the participant to
	 * connect to the session
	 */
	public String getPlatform() {
		return platform;
	}

	/**
	 * Returns the data associated to the connection on the client-side. This value
	 * is set with second parameter of method
	 * <a href="https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html#connect">
	 *   Session.connect
	 * </a> in OpenVidu Browser
	 */
	public String getClientData() {
		return clientData;
	}

	/**
	 * Returns the list of Publisher objects this particular Connection is
	 * publishing to the Session (each Publisher object has one Stream, uniquely
	 * identified by its <code>streamId</code>). You can call
	 * {@link io.openvidu.java.client.Session#forceUnpublish(Publisher)} passing any
	 * of this values as parameter
	 */
	public List<Publisher> getPublishers() {
		return new ArrayList<>(this.publishers.values());
	}

	/**
	 * Returns the list of streams (their <code>streamId</code> properties) this
	 * particular Connection is subscribed to. Each one always corresponds to one
	 * Publisher of some other Connection: each string of the returned list must be
	 * equal to the returned value of some
	 * {@link io.openvidu.java.client.Publisher#getStreamId()}
	 */
	public List<String> getSubscribers() {
		return this.subscribers;
	}

	protected JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("connectionId", this.getConnectionId());
		json.addProperty("status", this.getStatus());
		json.addProperty("createdAt", this.createdAt());
		json.addProperty("activeAt", this.activeAt());
		json.addProperty("location", this.getLocation());
		json.addProperty("ip", this.getIp());
		json.addProperty("platform", this.getPlatform());
		json.addProperty("clientData", this.getClientData());
		json.addProperty("token", this.getToken());

		JsonObject jsonConnectionProperties = this.connectionProperties.toJson("");
		jsonConnectionProperties.remove("session");
		json.addProperty("serverData", jsonConnectionProperties.get("data").getAsString());
		jsonConnectionProperties.remove("data");
		jsonConnectionProperties.entrySet().forEach(entry -> {
			json.add(entry.getKey(), entry.getValue());
		});

		JsonArray pubs = new JsonArray();
		this.getPublishers().forEach(p -> {
			pubs.add(p.toJson());
		});
		JsonArray subs = new JsonArray();
		this.getSubscribers().forEach(s -> {
			subs.add(s);
		});
		json.add("publishers", pubs);
		json.add("subscribers", subs);
		return json;
	}

	protected void overrideConnectionProperties(ConnectionProperties newConnectionProperties) {
		ConnectionProperties.Builder builder = new ConnectionProperties.Builder();
		// For now only properties role and record can be updated
		if (newConnectionProperties.getRole() != null) {
			builder.role(newConnectionProperties.getRole());
		} else {
			builder.role(this.connectionProperties.getRole());
		}
		if (newConnectionProperties.record() != null) {
			builder.record(newConnectionProperties.record());
		} else {
			builder.record(this.connectionProperties.record());
		}
		// Keep old configuration in the rest of properties
		try {
			builder.type(this.connectionProperties.getType()).data(this.connectionProperties.getData())
					.kurentoOptions(this.connectionProperties.getKurentoOptions())
					.rtspUri(this.connectionProperties.getRtspUri());
		} catch (MalformedURLException e) {
		}
		if (this.connectionProperties.adaptativeBitrate() != null) {
			builder.adaptativeBitrate(this.connectionProperties.adaptativeBitrate());
		}
		if (this.connectionProperties.onlyPlayWithSubscribers() != null) {
			builder.onlyPlayWithSubscribers(this.connectionProperties.onlyPlayWithSubscribers());
		}
		if (this.connectionProperties.getNetworkCache() != null) {
			builder.networkCache(this.connectionProperties.getNetworkCache());
		}
		if (this.connectionProperties.getCustomIceServers() != null
				&& !this.connectionProperties.getCustomIceServers().isEmpty()) {
			for (IceServerProperties iceServerProperties : this.connectionProperties.getCustomIceServers()) {
				builder.addCustomIceServer(iceServerProperties);
			}
		}
		this.connectionProperties = builder.build();
	}

	protected void setSubscribers(List<String> subscribers) {
		this.subscribers = subscribers;
	}

	protected Connection resetWithJson(JsonObject json) {

		this.connectionId = json.get("connectionId").getAsString();
		this.status = json.get("status").getAsString();
		this.token = !json.get("token").isJsonNull() ? json.get("token").getAsString() : null;

		if (!json.get("publishers").isJsonNull()) {
			JsonArray jsonArrayPublishers = json.get("publishers").getAsJsonArray();

			// 1. Set to store fetched publishers and later remove closed ones
			Set<String> fetchedPublisherIds = new HashSet<>();
			jsonArrayPublishers.forEach(publisherJsonElement -> {

				JsonObject publisherJson = publisherJsonElement.getAsJsonObject();
				Publisher publisherObj = new Publisher(publisherJson);
				String id = publisherObj.getStreamId();
				fetchedPublisherIds.add(id);

				// 2. Update existing Publisher
				this.publishers.computeIfPresent(id, (pId, p) -> {
					p = p.resetWithJson(publisherJson);
					return p;
				});

				// 3. Add new Publisher
				this.publishers.computeIfAbsent(id, pId -> {
					return publisherObj;
				});
			});

			// 4. Remove closed connections from local collection
			this.publishers.entrySet().removeIf(entry -> !fetchedPublisherIds.contains(entry.getValue().getStreamId()));
		}

		if (!json.get("subscribers").isJsonNull()) {
			JsonArray jsonArraySubscribers = json.get("subscribers").getAsJsonArray();

			// 1. Array to store fetched Subscribers and later remove closed ones
			Set<String> fetchedSubscriberIds = new HashSet<>();
			jsonArraySubscribers.forEach(subscriber -> {

				String sub = subscriber.getAsJsonObject().get("streamId").getAsString();
				fetchedSubscriberIds.add(sub);

				if (!this.subscribers.contains(sub)) {
					// 2. Add new Subscriber
					this.subscribers.add(sub);
				}
			});

			// 3. Remove closed Subscribers from local collection
			this.subscribers.removeIf(subId -> !fetchedSubscriberIds.contains(subId));
		}

		if (!json.get("createdAt").isJsonNull()) {
			this.createdAt = json.get("createdAt").getAsLong();
		}
		if (!json.get("activeAt").isJsonNull()) {
			this.activeAt = json.get("activeAt").getAsLong();
		}
		if (!json.get("location").isJsonNull()) {
			this.location = json.get("location").getAsString();
		}
		if (!json.get("ip").isJsonNull()) {
			this.ip = json.get("ip").getAsString();
		}
		if (!json.get("platform").isJsonNull()) {
			this.platform = json.get("platform").getAsString();
		}
		if (!json.get("clientData").isJsonNull()) {
			this.clientData = json.get("clientData").getAsString();
		}

		// COMMON
		ConnectionType type = ConnectionType.valueOf(json.get("type").getAsString());
		String data = (json.has("serverData") && !json.get("serverData").isJsonNull())
				? json.get("serverData").getAsString()
				: null;
		Boolean record = (json.has("record") && !json.get("record").isJsonNull()) ? json.get("record").getAsBoolean()
				: null;

		// WEBRTC
		OpenViduRole role = (json.has("role") && !json.get("role").isJsonNull())
				? OpenViduRole.valueOf(json.get("role").getAsString())
				: null;

		List<IceServerProperties> customIceServers = new ArrayList<>();
		if (json.has("customIceServers") && json.get("customIceServers").isJsonArray()) {
			JsonArray customIceServersJsonArray = json.get("customIceServers").getAsJsonArray();
			customIceServersJsonArray.forEach(iceJsonElem -> {
				JsonObject iceJsonObj = iceJsonElem.getAsJsonObject();
				String url = (iceJsonObj.has("url") && !iceJsonObj.get("url").isJsonNull())
						? iceJsonObj.get("url").getAsString()
						: null;
				String username = (iceJsonObj.has("username") && !iceJsonObj.get("username").isJsonNull())
						? iceJsonObj.get("username").getAsString()
						: null;
				String credential = (iceJsonObj.has("credential") && !iceJsonObj.get("credential").isJsonNull())
						? iceJsonObj.get("credential").getAsString()
						: null;
				customIceServers.add(
						new IceServerProperties.Builder().url(url).username(username).credential(credential).build());
			});
		}

		// IPCAM
		String rtspUri = (json.has("rtspUri") && !json.get("rtspUri").isJsonNull()) ? json.get("rtspUri").getAsString()
				: null;
		Boolean adaptativeBitrate = (json.has("adaptativeBitrate") && !json.get("adaptativeBitrate").isJsonNull())
				? json.get("adaptativeBitrate").getAsBoolean()
				: null;
		Boolean onlyPlayWithSubscribers = (json.has("onlyPlayWithSubscribers")
				&& !json.get("onlyPlayWithSubscribers").isJsonNull())
						? json.get("onlyPlayWithSubscribers").getAsBoolean()
						: null;
		Integer networkCache = (json.has("networkCache") && !json.get("networkCache").isJsonNull())
				? json.get("networkCache").getAsInt()
				: null;

		this.connectionProperties = new ConnectionProperties(type, data, record, role, null, rtspUri, adaptativeBitrate,
				onlyPlayWithSubscribers, networkCache, customIceServers);

		return this;
	}

}
