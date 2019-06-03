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

package io.openvidu.java.client;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Session {

	private static final Logger log = LoggerFactory.getLogger(Session.class);

	private String sessionId;
	private long createdAt;
	private OpenVidu openVidu;
	private SessionProperties properties;
	private Map<String, Connection> activeConnections = new ConcurrentHashMap<>();
	private boolean recording = false;

	protected Session(OpenVidu openVidu) throws OpenViduJavaClientException, OpenViduHttpException {
		this.openVidu = openVidu;
		this.properties = new SessionProperties.Builder().build();
		this.getSessionIdHttp();
	}

	protected Session(OpenVidu openVidu, SessionProperties properties)
			throws OpenViduJavaClientException, OpenViduHttpException {
		this.openVidu = openVidu;
		this.properties = properties;
		this.getSessionIdHttp();
	}

	protected Session(OpenVidu openVidu, JSONObject json) {
		this.openVidu = openVidu;
		this.resetSessionWithJson(json);
	}

	/**
	 * Gets the unique identifier of the Session
	 *
	 * @return The sessionId
	 */
	public String getSessionId() {
		return this.sessionId;
	}

	/**
	 * Timestamp when this session was created, in UTC milliseconds (ms since Jan 1,
	 * 1970, 00:00:00 UTC)
	 */
	public long createdAt() {
		return this.createdAt;
	}

	/**
	 * Gets a new token associated to Session object with default values for
	 * {@link io.openvidu.java.client.TokenOptions}. This always translates into a
	 * new request to OpenVidu Server
	 *
	 * @return The generated token
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public String generateToken() throws OpenViduJavaClientException, OpenViduHttpException {
		return this.generateToken(new TokenOptions.Builder().role(OpenViduRole.PUBLISHER).build());
	}

	/**
	 * Gets a new token associated to Session object configured with
	 * <code>tokenOptions</code>. This always translates into a new request to
	 * OpenVidu Server
	 *
	 * @return The generated token
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	@SuppressWarnings("unchecked")
	public String generateToken(TokenOptions tokenOptions) throws OpenViduJavaClientException, OpenViduHttpException {

		if (!this.hasSessionId()) {
			this.getSessionId();
		}

		HttpPost request = new HttpPost(this.openVidu.hostname + OpenVidu.API_TOKENS);

		JSONObject json = new JSONObject();
		json.put("session", this.sessionId);
		json.put("role", tokenOptions.getRole().name());
		json.put("data", tokenOptions.getData());
		if (tokenOptions.getKurentoOptions() != null) {
			JSONObject kurentoOptions = new JSONObject();
			if (tokenOptions.getKurentoOptions().getVideoMaxRecvBandwidth() != null) {
				kurentoOptions.put("videoMaxRecvBandwidth",
						tokenOptions.getKurentoOptions().getVideoMaxRecvBandwidth());
			}
			if (tokenOptions.getKurentoOptions().getVideoMinRecvBandwidth() != null) {
				kurentoOptions.put("videoMinRecvBandwidth",
						tokenOptions.getKurentoOptions().getVideoMinRecvBandwidth());
			}
			if (tokenOptions.getKurentoOptions().getVideoMaxSendBandwidth() != null) {
				kurentoOptions.put("videoMaxSendBandwidth",
						tokenOptions.getKurentoOptions().getVideoMaxSendBandwidth());
			}
			if (tokenOptions.getKurentoOptions().getVideoMinSendBandwidth() != null) {
				kurentoOptions.put("videoMinSendBandwidth",
						tokenOptions.getKurentoOptions().getVideoMinSendBandwidth());
			}
			if (tokenOptions.getKurentoOptions().getAllowedFilters().length > 0) {
				JSONArray allowedFilters = new JSONArray();
				for (String filter : tokenOptions.getKurentoOptions().getAllowedFilters()) {
					allowedFilters.add(filter);
				}
				kurentoOptions.put("allowedFilters", allowedFilters);
			}
			json.put("kurentoOptions", kurentoOptions);
		}
		StringEntity params;
		try {
			params = new StringEntity(json.toString());
		} catch (UnsupportedEncodingException e1) {
			throw new OpenViduJavaClientException(e1.getMessage(), e1.getCause());
		}

		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
		request.setEntity(params);

		HttpResponse response;
		try {
			response = this.openVidu.httpClient.execute(request);
		} catch (IOException e2) {
			throw new OpenViduJavaClientException(e2.getMessage(), e2.getCause());
		}

		try {
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				String token = (String) httpResponseToJson(response).get("id");
				log.info("Returning a TOKEN: {}", token);
				return token;
			} else {
				throw new OpenViduHttpException(statusCode);
			}
		} finally {
			EntityUtils.consumeQuietly(response.getEntity());
		}
	}

	/**
	 * Gracefully closes the Session: unpublishes all streams and evicts every
	 * participant
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void close() throws OpenViduJavaClientException, OpenViduHttpException {
		HttpDelete request = new HttpDelete(this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId);
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded");

		HttpResponse response;
		try {
			response = this.openVidu.httpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		try {
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_NO_CONTENT)) {
				this.openVidu.activeSessions.remove(this.sessionId);
				log.info("Session {} closed", this.sessionId);
			} else {
				throw new OpenViduHttpException(statusCode);
			}
		} finally {
			EntityUtils.consumeQuietly(response.getEntity());
		}
	}

	/**
	 * Updates every property of the Session with the current status it has in
	 * OpenVidu Server. This is especially useful for getting the list of active
	 * connections to the Session
	 * ({@link io.openvidu.java.client.Session#getActiveConnections()}) and use
	 * those values to call
	 * {@link io.openvidu.java.client.Session#forceDisconnect(Connection)} or
	 * {@link io.openvidu.java.client.Session#forceUnpublish(Publisher)}. <br>
	 * 
	 * To update every Session object owned by OpenVidu object, call
	 * {@link io.openvidu.java.client.OpenVidu#fetch()}
	 * 
	 * @return true if the Session status has changed with respect to the server,
	 *         false if not. This applies to any property or sub-property of the
	 *         object
	 * 
	 * @throws OpenViduHttpException
	 * @throws OpenViduJavaClientException
	 */
	public boolean fetch() throws OpenViduJavaClientException, OpenViduHttpException {
		String beforeJSON = this.toJson();
		HttpGet request = new HttpGet(this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId);
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded");

		HttpResponse response;
		try {
			response = this.openVidu.httpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		try {
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				this.resetSessionWithJson(httpResponseToJson(response));
				String afterJSON = this.toJson();
				boolean hasChanged = !beforeJSON.equals(afterJSON);
				log.info("Session info fetched for session '{}'. Any change: {}", this.sessionId, hasChanged);
				return hasChanged;
			} else {
				throw new OpenViduHttpException(statusCode);
			}
		} finally {
			EntityUtils.consumeQuietly(response.getEntity());
		}
	}

	/**
	 * Forces the user represented by <code>connection</code> to leave the session.
	 * OpenVidu Browser will trigger the proper events on the client-side
	 * (<code>streamDestroyed</code>, <code>connectionDestroyed</code>,
	 * <code>sessionDisconnected</code>) with reason set to
	 * "forceDisconnectByServer" <br>
	 * 
	 * You can get <code>connection</code> parameter with
	 * {@link io.openvidu.java.client.Session#fetch()} and then
	 * {@link io.openvidu.java.client.Session#getActiveConnections()}
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void forceDisconnect(Connection connection) throws OpenViduJavaClientException, OpenViduHttpException {
		this.forceDisconnect(connection.getConnectionId());
	}

	/**
	 * Forces the user with Connection <code>connectionId</code> to leave the
	 * session. OpenVidu Browser will trigger the proper events on the client-side
	 * (<code>streamDestroyed</code>, <code>connectionDestroyed</code>,
	 * <code>sessionDisconnected</code>) with reason set to
	 * "forceDisconnectByServer" <br>
	 * 
	 * You can get <code>connectionId</code> parameter with
	 * {@link io.openvidu.java.client.Session#fetch()} (use
	 * {@link io.openvidu.java.client.Connection#getConnectionId()} to get the
	 * `connectionId` you want)
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void forceDisconnect(String connectionId) throws OpenViduJavaClientException, OpenViduHttpException {
		HttpDelete request = new HttpDelete(
				this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId + "/connection/" + connectionId);
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded");

		HttpResponse response = null;
		try {
			response = this.openVidu.httpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		try {
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_NO_CONTENT)) {
				// Remove connection from activeConnections map
				Connection connectionClosed = this.activeConnections.remove(connectionId);
				// Remove every Publisher of the closed connection from every subscriber list of
				// other connections
				if (connectionClosed != null) {
					for (Publisher publisher : connectionClosed.getPublishers()) {
						String streamId = publisher.getStreamId();
						for (Connection connection : this.activeConnections.values()) {
							connection.setSubscribers(connection.getSubscribers().stream()
									.filter(subscriber -> !streamId.equals(subscriber)).collect(Collectors.toList()));
						}
					}
				} else {
					log.warn(
							"The closed connection wasn't fetched in OpenVidu Java Client. No changes in the collection of active connections of the Session");
				}
				log.info("Connection {} closed", connectionId);
			} else {
				throw new OpenViduHttpException(statusCode);
			}
		} finally

		{
			EntityUtils.consumeQuietly(response.getEntity());
		}
	}

	/**
	 * Forces some user to unpublish a Stream. OpenVidu Browser will trigger the
	 * proper events on the client-side (<code>streamDestroyed</code>) with reason
	 * set to "forceUnpublishByServer".<br>
	 * 
	 * You can get <code>publisher</code> parameter with
	 * {@link io.openvidu.java.client.Session#getActiveConnections()} and then for
	 * each Connection you can call
	 * {@link io.openvidu.java.client.Connection#getPublishers()}. Remember to call
	 * {@link io.openvidu.java.client.Session#fetch()} before to fetch the current
	 * actual properties of the Session from OpenVidu Server
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void forceUnpublish(Publisher publisher) throws OpenViduJavaClientException, OpenViduHttpException {
		this.forceUnpublish(publisher.getStreamId());
	}

	/**
	 * Forces some user to unpublish a Stream. OpenVidu Browser will trigger the
	 * proper events on the client-side (<code>streamDestroyed</code>) with reason
	 * set to "forceUnpublishByServer". <br>
	 * 
	 * You can get <code>streamId</code> parameter with
	 * {@link io.openvidu.java.client.Session#getActiveConnections()} and then for
	 * each Connection you can call
	 * {@link io.openvidu.java.client.Connection#getPublishers()}. Finally
	 * {@link io.openvidu.java.client.Publisher#getStreamId()}) will give you the
	 * <code>streamId</code>. Remember to call
	 * {@link io.openvidu.java.client.Session#fetch()} before to fetch the current
	 * actual properties of the Session from OpenVidu Server
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void forceUnpublish(String streamId) throws OpenViduJavaClientException, OpenViduHttpException {
		HttpDelete request = new HttpDelete(
				this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId + "/stream/" + streamId);
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded");

		HttpResponse response;
		try {
			response = this.openVidu.httpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		try {
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_NO_CONTENT)) {
				for (Connection connection : this.activeConnections.values()) {
					// Try to remove the Publisher from the Connection publishers collection
					if (connection.publishers.remove(streamId) != null) {
						continue;
					}
					// Try to remove the Publisher from the Connection subscribers collection
					connection.subscribers.remove(streamId);
				}
				log.info("Stream {} unpublished", streamId);
			} else {
				throw new OpenViduHttpException(statusCode);
			}
		} finally {
			EntityUtils.consumeQuietly(response.getEntity());
		}
	}

	/**
	 * Returns the list of active connections to the session. <strong>This value
	 * will remain unchanged since the last time method
	 * {@link io.openvidu.java.client.Session#fetch()} was called</strong>.
	 * Exceptions to this rule are:
	 * <ul>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceUnpublish(String)}
	 * updates each affected Connection status</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceDisconnect(String)}
	 * updates each affected Connection status</li>
	 * </ul>
	 * <br>
	 * To get the list of active connections with their current actual value, you
	 * must call first {@link io.openvidu.java.client.Session#fetch()} and then
	 * {@link io.openvidu.java.client.Session#getActiveConnections()}
	 */
	public List<Connection> getActiveConnections() {
		return new ArrayList<>(this.activeConnections.values());
	}

	/**
	 * Returns whether the session is being recorded or not
	 */
	public boolean isBeingRecorded() {
		return this.recording;
	}

	/**
	 * Returns the properties defining the session
	 */
	public SessionProperties getProperties() {
		return this.properties;
	}

	@Override
	public String toString() {
		return this.sessionId;
	}

	private boolean hasSessionId() {
		return (this.sessionId != null && !this.sessionId.isEmpty());
	}

	@SuppressWarnings("unchecked")
	private void getSessionIdHttp() throws OpenViduJavaClientException, OpenViduHttpException {
		if (this.hasSessionId()) {
			return;
		}

		HttpPost request = new HttpPost(this.openVidu.hostname + OpenVidu.API_SESSIONS);

		JSONObject json = new JSONObject();
		json.put("mediaMode", properties.mediaMode().name());
		json.put("recordingMode", properties.recordingMode().name());
		json.put("defaultOutputMode", properties.defaultOutputMode().name());
		json.put("defaultRecordingLayout", properties.defaultRecordingLayout().name());
		json.put("defaultCustomLayout", properties.defaultCustomLayout());
		json.put("customSessionId", properties.customSessionId());
		StringEntity params = null;
		try {
			params = new StringEntity(json.toString());
		} catch (UnsupportedEncodingException e1) {
			throw new OpenViduJavaClientException(e1.getMessage(), e1.getCause());
		}

		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
		request.setEntity(params);

		HttpResponse response;
		try {
			response = this.openVidu.httpClient.execute(request);
		} catch (IOException e2) {
			throw new OpenViduJavaClientException(e2.getMessage(), e2.getCause());
		}
		try {
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				JSONObject responseJson = httpResponseToJson(response);
				this.sessionId = (String) responseJson.get("id");
				this.createdAt = (long) responseJson.get("createdAt");
				log.info("Session '{}' created", this.sessionId);
			} else if (statusCode == org.apache.http.HttpStatus.SC_CONFLICT) {
				// 'customSessionId' already existed
				this.sessionId = properties.customSessionId();
			} else {
				throw new OpenViduHttpException(statusCode);
			}
		} finally {
			EntityUtils.consumeQuietly(response.getEntity());
		}
	}

	private JSONObject httpResponseToJson(HttpResponse response) throws OpenViduJavaClientException {
		JSONParser parser = new JSONParser();
		JSONObject json;
		try {
			json = (JSONObject) parser.parse(EntityUtils.toString(response.getEntity()));
		} catch (org.apache.http.ParseException | ParseException | IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
		return json;
	}

	protected void setIsBeingRecorded(boolean recording) {
		this.recording = recording;
	}

	@SuppressWarnings("unchecked")
	protected Session resetSessionWithJson(JSONObject json) {
		this.sessionId = (String) json.get("sessionId");
		this.createdAt = (long) json.get("createdAt");
		this.recording = (boolean) json.get("recording");
		SessionProperties.Builder builder = new SessionProperties.Builder()
				.mediaMode(MediaMode.valueOf((String) json.get("mediaMode")))
				.recordingMode(RecordingMode.valueOf((String) json.get("recordingMode")))
				.defaultOutputMode(Recording.OutputMode.valueOf((String) json.get("defaultOutputMode")));
		if (json.containsKey("defaultRecordingLayout")) {
			builder.defaultRecordingLayout(RecordingLayout.valueOf((String) json.get("defaultRecordingLayout")));
		}
		if (json.containsKey("defaultCustomLayout")) {
			builder.defaultCustomLayout((String) json.get("defaultCustomLayout"));
		}
		if (this.properties != null && this.properties.customSessionId() != null) {
			builder.customSessionId(this.properties.customSessionId());
		} else if (json.containsKey("customSessionId")) {
			builder.customSessionId((String) json.get("customSessionId"));
		}
		this.properties = builder.build();
		JSONArray jsonArrayConnections = (JSONArray) ((JSONObject) json.get("connections")).get("content");
		this.activeConnections.clear();
		jsonArrayConnections.forEach(connection -> {
			JSONObject con = (JSONObject) connection;

			Map<String, Publisher> publishers = new ConcurrentHashMap<>();
			JSONArray jsonArrayPublishers = (JSONArray) con.get("publishers");
			jsonArrayPublishers.forEach(publisher -> {
				JSONObject pubJson = (JSONObject) publisher;
				JSONObject mediaOptions = (JSONObject) pubJson.get("mediaOptions");
				Publisher pub = new Publisher((String) pubJson.get("streamId"), (long) pubJson.get("createdAt"),
						(boolean) mediaOptions.get("hasAudio"), (boolean) mediaOptions.get("hasVideo"),
						mediaOptions.get("audioActive"), mediaOptions.get("videoActive"), mediaOptions.get("frameRate"),
						mediaOptions.get("typeOfVideo"), mediaOptions.get("videoDimensions"));
				publishers.put(pub.getStreamId(), pub);
			});

			List<String> subscribers = new ArrayList<>();
			JSONArray jsonArraySubscribers = (JSONArray) con.get("subscribers");
			jsonArraySubscribers.forEach(subscriber -> {
				subscribers.add((String) ((JSONObject) subscriber).get("streamId"));
			});

			this.activeConnections.put((String) con.get("connectionId"),
					new Connection((String) con.get("connectionId"), (long) con.get("createdAt"),
							OpenViduRole.valueOf((String) con.get("role")), (String) con.get("token"),
							(String) con.get("location"), (String) con.get("platform"), (String) con.get("serverData"),
							(String) con.get("clientData"), publishers, subscribers));
		});
		return this;
	}

	@SuppressWarnings("unchecked")
	protected String toJson() {
		JSONObject json = new JSONObject();
		json.put("sessionId", this.sessionId);
		json.put("createdAt", this.createdAt);
		json.put("customSessionId", this.properties.customSessionId());
		json.put("recording", this.recording);
		json.put("mediaMode", this.properties.mediaMode().name());
		json.put("recordingMode", this.properties.recordingMode().name());
		json.put("defaultOutputMode", this.properties.defaultOutputMode().name());
		json.put("defaultRecordingLayout", this.properties.defaultRecordingLayout().name());
		json.put("defaultCustomLayout", this.properties.defaultCustomLayout());
		JSONObject connections = new JSONObject();
		connections.put("numberOfElements", this.getActiveConnections().size());
		JSONArray jsonArrayConnections = new JSONArray();
		this.getActiveConnections().forEach(con -> {
			JSONObject c = new JSONObject();
			c.put("connectionId", con.getConnectionId());
			c.put("role", con.getRole().name());
			c.put("token", con.getToken());
			c.put("clientData", con.getClientData());
			c.put("serverData", con.getServerData());
			JSONArray pubs = new JSONArray();
			con.getPublishers().forEach(p -> {
				pubs.add(p.toJson());
			});
			JSONArray subs = new JSONArray();
			con.getSubscribers().forEach(s -> {
				subs.add(s);
			});
			c.put("publishers", pubs);
			c.put("subscribers", subs);
			jsonArrayConnections.add(c);
		});
		connections.put("content", jsonArrayConnections);
		json.put("connections", connections);
		return json.toJSONString();
	}

}
