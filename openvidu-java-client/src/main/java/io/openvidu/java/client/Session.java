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
import org.apache.http.client.methods.HttpPatch;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;

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

	protected Session(OpenVidu openVidu, JsonObject json) {
		this.openVidu = openVidu;
		this.resetSessionWithJson(json);
	}

	/**
	 * Gets the unique identifier of the Session.
	 *
	 * @return The sessionId
	 */
	public String getSessionId() {
		return this.sessionId;
	}

	/**
	 * Timestamp when this session was created, in UTC milliseconds (ms since Jan 1,
	 * 1970, 00:00:00 UTC).
	 */
	public long createdAt() {
		return this.createdAt;
	}

	/**
	 * @deprecated Use {@link Session#createToken() Session.createToken()} instead
	 *             to get a {@link io.openvidu.java.client.Token} object.
	 *
	 * @return The generated token String
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	@Deprecated
	public String generateToken() throws OpenViduJavaClientException, OpenViduHttpException {
		return createToken().getToken();
	}

	/**
	 * @deprecated Use
	 *             {@link Session#createToken(io.openvidu.java.client.TokenOptions)
	 *             Session.createToken(TokenOptions)} instead to get a
	 *             {@link io.openvidu.java.client.Token} object.
	 *
	 * @return The generated token String
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	@Deprecated
	public String generateToken(TokenOptions tokenOptions) throws OpenViduJavaClientException, OpenViduHttpException {
		return createToken(tokenOptions).getToken();
	}

	/**
	 * Gets a new token object associated to Session object with default values for
	 * {@link io.openvidu.java.client.TokenOptions}. The token string value to send
	 * to the client side can be retrieved with
	 * {@link io.openvidu.java.client.Token#getToken() Token.getToken()}. <br>
	 * <br>
	 * You can use method {@link io.openvidu.java.client.Token#getConnectionId()
	 * Token.getConnectionId()} to get the connection identifier that will be given
	 * to the user consuming the token. With <code>connectionId</code> you can call
	 * the following methods without having to fetch and search for the actual
	 * {@link io.openvidu.java.client.Connection Connection} object:
	 * <ul>
	 * <li>Call {@link io.openvidu.java.client.Session#forceDisconnect(String)
	 * Session.forceDisconnect()} to invalidate the token if no client has used it
	 * yet or force the connected client to leave the session if it has.</li>
	 * <li>Call
	 * {@link io.openvidu.java.client.Session#updateConnection(String, TokenOptions)
	 * Session.updateConnection()} to update the
	 * {@link io.openvidu.java.client.Connection Connection} options. And this is
	 * valid for unused tokens, but also for already used tokens, so you can
	 * dynamically change the connection options on the fly.</li>
	 * </ul>
	 *
	 * @return The generated {@link io.openvidu.java.client.Token Token} object.
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public Token createToken() throws OpenViduJavaClientException, OpenViduHttpException {
		return createToken(new TokenOptions.Builder().data("").role(OpenViduRole.PUBLISHER).record(true).build());
	}

	/**
	 * Gets a new token object associated to Session object configured with
	 * <code>tokenOptions</code>. The token string value to send to the client side
	 * can be retrieved with {@link io.openvidu.java.client.Token#getToken()
	 * Token.getToken()}. <br>
	 * <br>
	 * You can use method {@link io.openvidu.java.client.Token#getConnectionId()
	 * Token.getConnectionId()} to get the connection identifier that will be given
	 * to the user consuming the token. With <code>connectionId</code> you can call
	 * the following methods without having to fetch and search for the actual
	 * {@link io.openvidu.java.client.Connection Connection} object:
	 * <ul>
	 * <li>Call {@link io.openvidu.java.client.Session#forceDisconnect(String)
	 * Session.forceDisconnect()} to invalidate the token if no client has used it
	 * yet or force the connected client to leave the session if it has.</li>
	 * <li>Call
	 * {@link io.openvidu.java.client.Session#updateConnection(String, TokenOptions)
	 * Session.updateConnection()} to update the
	 * {@link io.openvidu.java.client.Connection Connection} options. And this is
	 * valid for unused tokens, but also for already used tokens, so you can
	 * dynamically change the user connection options on the fly.</li>
	 * </ul>
	 *
	 * @return The generated {@link io.openvidu.java.client.Token Token} object.
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public Token createToken(TokenOptions tokenOptions) throws OpenViduJavaClientException, OpenViduHttpException {
		if (!this.hasSessionId()) {
			this.getSessionId();
		}

		HttpPost request = new HttpPost(this.openVidu.hostname + OpenVidu.API_TOKENS);

		StringEntity params;
		try {
			params = new StringEntity(tokenOptions.toJsonObject(sessionId).toString());
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
				Token token = new Token(httpResponseToJson(response));
				log.info("Returning a TOKEN: {}", token.getToken());
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
	 * participant.
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
	 * {@link io.openvidu.java.client.Session#forceDisconnect(Connection)},
	 * {@link io.openvidu.java.client.Session#forceUnpublish(Publisher)} or
	 * {@link io.openvidu.java.client.Session#updateConnection(String, TokenOptions)}.<br>
	 * <br>
	 * 
	 * To update all Session objects owned by OpenVidu object at once, call
	 * {@link io.openvidu.java.client.OpenVidu#fetch()}.
	 * 
	 * @return true if the Session status has changed with respect to the server,
	 *         false if not. This applies to any property or sub-property of the
	 *         object.
	 * 
	 * @throws OpenViduHttpException
	 * @throws OpenViduJavaClientException
	 */
	public boolean fetch() throws OpenViduJavaClientException, OpenViduHttpException {
		final String beforeJSON = this.toJson();
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
				final String afterJSON = this.toJson();
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
	 * <code>"forceDisconnectByServer"</code>. <br>
	 * <br>
	 * 
	 * You can get <code>connection</code> parameter with
	 * {@link io.openvidu.java.client.Session#fetch()} and then
	 * {@link io.openvidu.java.client.Session#getActiveConnections()}.<br>
	 * <br>
	 * 
	 * This method automatically updates the properties of the local affected
	 * objects. This means that there is no need to call
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void forceDisconnect(Connection connection) throws OpenViduJavaClientException, OpenViduHttpException {
		this.forceDisconnect(connection.getConnectionId());
	}

	/**
	 * Forces the user with Connection <code>connectionId</code> to leave the
	 * session, or invalidates the {@link Token} associated with that
	 * <code>connectionId</code> if no user has used it yet. <br>
	 * <br>
	 * 
	 * In the first case you can get <code>connectionId</code> parameter from
	 * {@link io.openvidu.java.client.Connection#getConnectionId()
	 * Connection.getConnectionId()}. Connection objects can be listed with
	 * {@link io.openvidu.java.client.Session#getActiveConnections()
	 * Session.getActiveConnections()} (remember to use first
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} to fetch the
	 * current active connections from OpenVidu Server). As a result, OpenVidu
	 * Browser will trigger the proper events on the client-side
	 * (<code>streamDestroyed</code>, <code>connectionDestroyed</code>,
	 * <code>sessionDisconnected</code>) with reason set to
	 * <code>"forceDisconnectByServer"</code>. <br>
	 * <br>
	 * 
	 * In the second case you can get <code>connectionId</code> parameter from a
	 * {@link Token} with {@link Token#getConnectionId()}. As a result, the token
	 * will be invalidated and no user will be able to connect to the session with
	 * it. <br>
	 * <br>
	 * 
	 * This method automatically updates the properties of the local affected
	 * objects. This means that there is no need to call
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.
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
	 * set to <code>"forceUnpublishByServer"</code>. <br>
	 * <br>
	 * 
	 * You can get <code>publisher</code> parameter with
	 * {@link io.openvidu.java.client.Session#getActiveConnections()} and then for
	 * each Connection you can call
	 * {@link io.openvidu.java.client.Connection#getPublishers()}. Remember to call
	 * {@link io.openvidu.java.client.Session#fetch()} before to fetch the current
	 * actual properties of the Session from OpenVidu Server.<br>
	 * <br>
	 * 
	 * This method automatically updates the properties of the local affected
	 * objects. This means that there is no need to call
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.
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
	 * set to <code>"forceUnpublishByServer"</code>. <br>
	 * <br>
	 * 
	 * You can get <code>streamId</code> parameter with
	 * {@link io.openvidu.java.client.Session#getActiveConnections()} and then for
	 * each Connection you can call
	 * {@link io.openvidu.java.client.Connection#getPublishers()}. Finally
	 * {@link io.openvidu.java.client.Publisher#getStreamId()}) will give you the
	 * <code>streamId</code>. Remember to call
	 * {@link io.openvidu.java.client.Session#fetch()} before to fetch the current
	 * actual properties of the Session from OpenVidu Server.<br>
	 * <br>
	 * 
	 * This method automatically updates the properties of the local affected
	 * objects. This means that there is no need to call
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.
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
	 * Updates the properties of a Connection with a
	 * {@link io.openvidu.java.client.ConnectionOptions} object. Only these
	 * properties can be updated:
	 * <ul>
	 * <li>{@link io.openvidu.java.client.ConnectionOptions.Builder#role(OpenViduRole)
	 * ConnectionOptions.Builder.role(OpenViduRole)}</li>
	 * <li>{@link io.openvidu.java.client.ConnectionOptions.Builder#record(boolean)
	 * ConnectionOptions.Builder.record(boolean)}</li>
	 * </ul>
	 * <br>
	 * 
	 * The <code>connectionId</code> parameter can be obtained from a Connection
	 * object with {@link io.openvidu.java.client.Connection#getConnectionId()
	 * Connection.getConnectionId()}, in which case the updated properties will
	 * modify an active Connection. But <code>connectionId</code> can also be
	 * obtained from a Token with {@link Token#getConnectionId()}, which allows
	 * modifying a still not used token.<br>
	 * <br>
	 * 
	 * This method automatically updates the properties of the local affected
	 * objects. This means that there is no need to call
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.
	 * 
	 * @param connectionId      The Connection (or a still not used Token) to modify
	 * @param connectionOptions A ConnectionOptions object with the new values to
	 *                          apply
	 * 
	 * @return The updated {@link io.openvidu.java.client.Connection Connection}
	 *         object
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public Connection updateConnection(String connectionId, ConnectionOptions connectionOptions)
			throws OpenViduJavaClientException, OpenViduHttpException {

		HttpPatch request = new HttpPatch(
				this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId + "/connection/" + connectionId);

		StringEntity params;
		try {
			params = new StringEntity(connectionOptions.toJsonObject(this.sessionId).toString());
		} catch (UnsupportedEncodingException e1) {
			throw new OpenViduJavaClientException(e1.getMessage(), e1.getCause());
		}
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
		request.setEntity(params);

		HttpResponse response;
		try {
			response = this.openVidu.httpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		try {
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				log.info("Connection {} updated", connectionId);
			} else if ((statusCode == org.apache.http.HttpStatus.SC_NO_CONTENT)) {
				log.info("Properties of Connection {} remain the same", connectionId);
			} else {
				throw new OpenViduHttpException(statusCode);
			}
			JsonObject json = httpResponseToJson(response);

			// Update the actual Connection object with the new options
			Connection existingConnection = this.activeConnections.get(connectionId);

			if (existingConnection == null) {
				// The updated Connection is not available in local map
				Connection newConnection = new Connection(json);
				this.activeConnections.put(connectionId, newConnection);
				return newConnection;
			} else {
				// The updated Connection was available in local map
				existingConnection.overrideConnectionOptions(connectionOptions);
				return existingConnection;
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
	 * automatically updates each affected local Connection object.</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceDisconnect(String)}
	 * automatically updates each affected local Connection object.</li>
	 * <li>Calling
	 * {@link io.openvidu.java.client.Session#updateConnection(String, TokenOptions)}
	 * automatically updates the attributes of the affected local Connection
	 * object.</li>
	 * </ul>
	 * <br>
	 * To get the list of active connections with their current actual value, you
	 * must call first {@link io.openvidu.java.client.Session#fetch()} and then
	 * {@link io.openvidu.java.client.Session#getActiveConnections()}.
	 */
	public List<Connection> getActiveConnections() {
		return new ArrayList<>(this.activeConnections.values());
	}

	/**
	 * Returns whether the session is being recorded or not.
	 */
	public boolean isBeingRecorded() {
		return this.recording;
	}

	/**
	 * Returns the properties defining the session.
	 */
	public SessionProperties getProperties() {
		return this.properties;
	}

	private boolean hasSessionId() {
		return (this.sessionId != null && !this.sessionId.isEmpty());
	}

	private void getSessionIdHttp() throws OpenViduJavaClientException, OpenViduHttpException {
		if (this.hasSessionId()) {
			return;
		}

		HttpPost request = new HttpPost(this.openVidu.hostname + OpenVidu.API_SESSIONS);

		JsonObject json = new JsonObject();
		json.addProperty("mediaMode", properties.mediaMode().name());
		json.addProperty("recordingMode", properties.recordingMode().name());
		json.addProperty("defaultOutputMode", properties.defaultOutputMode().name());
		json.addProperty("defaultRecordingLayout", properties.defaultRecordingLayout().name());
		json.addProperty("defaultCustomLayout", properties.defaultCustomLayout());
		json.addProperty("customSessionId", properties.customSessionId());
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
				JsonObject responseJson = httpResponseToJson(response);
				this.sessionId = responseJson.get("id").getAsString();
				this.createdAt = responseJson.get("createdAt").getAsLong();
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

	private JsonObject httpResponseToJson(HttpResponse response) throws OpenViduJavaClientException {
		JsonObject json;
		try {
			json = new Gson().fromJson(EntityUtils.toString(response.getEntity()), JsonObject.class);
		} catch (JsonSyntaxException | IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
		return json;
	}

	protected void setIsBeingRecorded(boolean recording) {
		this.recording = recording;
	}

	protected Session resetSessionWithJson(JsonObject json) {
		this.sessionId = json.get("sessionId").getAsString();
		this.createdAt = json.get("createdAt").getAsLong();
		this.recording = json.get("recording").getAsBoolean();
		SessionProperties.Builder builder = new SessionProperties.Builder()
				.mediaMode(MediaMode.valueOf(json.get("mediaMode").getAsString()))
				.recordingMode(RecordingMode.valueOf(json.get("recordingMode").getAsString()))
				.defaultOutputMode(Recording.OutputMode.valueOf(json.get("defaultOutputMode").getAsString()));
		if (json.has("defaultRecordingLayout")) {
			builder.defaultRecordingLayout(RecordingLayout.valueOf(json.get("defaultRecordingLayout").getAsString()));
		}
		if (json.has("defaultCustomLayout")) {
			builder.defaultCustomLayout(json.get("defaultCustomLayout").getAsString());
		}
		if (this.properties != null && this.properties.customSessionId() != null) {
			builder.customSessionId(this.properties.customSessionId());
		} else if (json.has("customSessionId")) {
			builder.customSessionId(json.get("customSessionId").getAsString());
		}
		this.properties = builder.build();
		JsonArray jsonArrayConnections = (json.get("connections").getAsJsonObject()).get("content").getAsJsonArray();
		this.activeConnections.clear();
		jsonArrayConnections.forEach(connectionJsonElement -> {
			Connection connectionObj = new Connection(connectionJsonElement.getAsJsonObject());
			this.activeConnections.put(connectionObj.getConnectionId(), connectionObj);
		});
		return this;
	}

	protected String toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("sessionId", this.sessionId);
		json.addProperty("createdAt", this.createdAt);
		json.addProperty("customSessionId", this.properties.customSessionId());
		json.addProperty("recording", this.recording);
		json.addProperty("mediaMode", this.properties.mediaMode().name());
		json.addProperty("recordingMode", this.properties.recordingMode().name());
		json.addProperty("defaultOutputMode", this.properties.defaultOutputMode().name());
		json.addProperty("defaultRecordingLayout", this.properties.defaultRecordingLayout().name());
		json.addProperty("defaultCustomLayout", this.properties.defaultCustomLayout());
		JsonObject connections = new JsonObject();
		connections.addProperty("numberOfElements", this.getActiveConnections().size());
		JsonArray jsonArrayConnections = new JsonArray();
		this.getActiveConnections().forEach(con -> {
			jsonArrayConnections.add(con.toJson());
		});
		connections.add("content", jsonArrayConnections);
		json.add("connections", connections);
		return json.toString();
	}

}
