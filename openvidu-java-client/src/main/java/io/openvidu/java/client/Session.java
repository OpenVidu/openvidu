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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
	private Map<String, Connection> connections = new ConcurrentHashMap<>();
	private boolean recording = false;

	protected Session(OpenVidu openVidu) throws OpenViduJavaClientException, OpenViduHttpException {
		this.openVidu = openVidu;
		this.properties = new SessionProperties.Builder().build();
		this.getSessionHttp();
	}

	protected Session(OpenVidu openVidu, SessionProperties properties)
			throws OpenViduJavaClientException, OpenViduHttpException {
		this.openVidu = openVidu;
		this.properties = properties;
		this.getSessionHttp();
	}

	protected Session(OpenVidu openVidu, JsonObject json) {
		this.openVidu = openVidu;
		this.resetWithJson(json);
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
	 * @deprecated Use {@link Session#createConnection() Session.createConnection()}
	 *             instead to get a {@link io.openvidu.java.client.Connection}
	 *             object.
	 *
	 * @return The generated token String
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	@Deprecated
	public String generateToken() throws OpenViduJavaClientException, OpenViduHttpException {
		return generateToken(new TokenOptions.Builder().data("").role(OpenViduRole.PUBLISHER).build());
	}

	/**
	 * @deprecated Use
	 *             {@link Session#createConnection(io.openvidu.java.client.ConnectionProperties)
	 *             Session.createConnection(ConnectionProperties)} instead to get a
	 *             {@link io.openvidu.java.client.Connection} object.
	 *
	 * @return The generated token String
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	@Deprecated
	public String generateToken(TokenOptions tokenOptions) throws OpenViduJavaClientException, OpenViduHttpException {
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
				String token = httpResponseToJson(response).get("id").getAsString();
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
	 * Same as
	 * {@link io.openvidu.java.client.Session#createConnection(ConnectionProperties)}
	 * but with default ConnectionProperties values.
	 *
	 * @return The generated {@link io.openvidu.java.client.Connection Connection}
	 *         object.
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public Connection createConnection() throws OpenViduJavaClientException, OpenViduHttpException {
		return createConnection(
				new ConnectionProperties.Builder().data("").role(OpenViduRole.PUBLISHER).record(true).build());
	}

	/**
	 * Creates a new Connection object associated to Session object and configured
	 * with <code>connectionProperties</code>. Each user connecting to the Session
	 * requires a Connection. The token string value to send to the client side can
	 * be retrieved with {@link io.openvidu.java.client.Connection#getToken()
	 * Connection.getToken()}.
	 *
	 * @return The generated {@link io.openvidu.java.client.Connection Connection}
	 *         object.
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public Connection createConnection(ConnectionProperties connectionProperties)
			throws OpenViduJavaClientException, OpenViduHttpException {
		if (!this.hasSessionId()) {
			this.getSessionId();
		}

		HttpPost request = new HttpPost(
				this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId + "/connection");

		StringEntity params;
		try {
			params = new StringEntity(connectionProperties.toJson(sessionId).toString());
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
				Connection connection = new Connection(httpResponseToJson(response));
				this.connections.put(connection.getConnectionId(), connection);
				return connection;
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
	 * {@link io.openvidu.java.client.Session#updateConnection(String, ConnectionProperties)}.<br>
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
		HttpGet request = new HttpGet(
				this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId + "?pendingConnections=true");
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
				this.resetWithJson(httpResponseToJson(response));
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
	 * Removes the Connection from the Session. This can translate into a forced
	 * eviction of a user from the Session if the Connection had status
	 * <code>active</code>, or into a token invalidation if no user had taken the
	 * Connection yet (status <code>pending</code>). <br>
	 * <br>
	 * 
	 * In the first case, OpenVidu Browser will trigger the proper events on the
	 * client-side (<code>streamDestroyed</code>, <code>connectionDestroyed</code>,
	 * <code>sessionDisconnected</code>) with reason set to
	 * <code>"forceDisconnectByServer"</code>. <br>
	 * <br>
	 * 
	 * In the second case, the token of the Connection will be invalidated and no
	 * user will be able to connect to the session with it. <br>
	 * <br>
	 * 
	 * This method automatically updates the properties of the local affected
	 * objects. This means that there is no need to call
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} or
	 * {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.
	 * 
	 * @param connection The Connection to remove
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void forceDisconnect(Connection connection) throws OpenViduJavaClientException, OpenViduHttpException {
		this.forceDisconnect(connection.getConnectionId());
	}

	/**
	 * Same as {@link io.openvidu.java.client.Session#forceDisconnect(Connection)
	 * forceDisconnect(ConnectionProperties)} but providing the
	 * {@link io.openvidu.java.client.Connection#getConnectionId() connectionId}
	 * instead of the Connection object.
	 * 
	 * @param connectionId The identifier of the Connection object to remove
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
				Connection connectionClosed = this.connections.remove(connectionId);
				// Remove every Publisher of the closed connection from every subscriber list of
				// other connections
				if (connectionClosed != null) {
					for (Publisher publisher : connectionClosed.getPublishers()) {
						String streamId = publisher.getStreamId();
						for (Connection connection : this.connections.values()) {
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
	 * Forces some Connection to unpublish a Stream. OpenVidu Browser will trigger
	 * the proper events in the client-side (<code>streamDestroyed</code>) with
	 * reason set to <code>"forceUnpublishByServer"</code>. <br>
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
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} or
	 * {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.
	 * 
	 * @param publisher The Publisher object to unpublish
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public void forceUnpublish(Publisher publisher) throws OpenViduJavaClientException, OpenViduHttpException {
		this.forceUnpublish(publisher.getStreamId());
	}

	/**
	 * Same as {@link io.openvidu.java.client.Session#forceUnpublish(Publisher)
	 * forceUnpublish(Publisher)} but providing the
	 * {@link io.openvidu.java.client.Publisher#getStreamId() streamId} instead of
	 * the Publisher object.
	 * 
	 * @param streamId The identifier of the Publisher object to remove
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
				for (Connection connection : this.connections.values()) {
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
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank"
	 * style="display: inline-block; background-color: rgb(0, 136, 170); color:
	 * white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius:
	 * 3px; font-size: 13px; line-height:21px; font-family: Montserrat,
	 * sans-serif">PRO</a> Updates the properties of a Connection with a
	 * {@link io.openvidu.java.client.ConnectionProperties} object. Only these
	 * properties can be updated:
	 * <ul>
	 * <li>{@link io.openvidu.java.client.ConnectionProperties.Builder#role(OpenViduRole)
	 * ConnectionProperties.Builder.role(OpenViduRole)}</li>
	 * <li>{@link io.openvidu.java.client.ConnectionProperties.Builder#record(boolean)
	 * ConnectionProperties.Builder.record(boolean)}</li>
	 * </ul>
	 * <br>
	 * 
	 * This method automatically updates the properties of the local affected
	 * objects. This means that there is no need to call
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} or
	 * {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()} to see the
	 * changes consequence of the execution of this method applied in the local
	 * objects.<br>
	 * <br>
	 * 
	 * The affected client will trigger one <a href=
	 * "/en/stable/api/openvidu-browser/classes/connectionpropertychangedevent.html"
	 * target="_blank">ConnectionPropertyChangedEvent</a> for each modified
	 * property.
	 * 
	 * @param connectionId         The Connection to modify
	 * @param connectionProperties A ConnectionProperties object with the new values
	 *                             to apply
	 * 
	 * @return The updated {@link io.openvidu.java.client.Connection Connection}
	 *         object
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public Connection updateConnection(String connectionId, ConnectionProperties connectionProperties)
			throws OpenViduJavaClientException, OpenViduHttpException {

		HttpPatch request = new HttpPatch(
				this.openVidu.hostname + OpenVidu.API_SESSIONS + "/" + this.sessionId + "/connection/" + connectionId);

		StringEntity params;
		try {
			params = new StringEntity(connectionProperties.toJson(this.sessionId).toString());
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
			Connection existingConnection = this.connections.get(connectionId);

			if (existingConnection == null) {
				// The updated Connection is not available in local map
				Connection newConnection = new Connection(json);
				this.connections.put(connectionId, newConnection);
				return newConnection;
			} else {
				// The updated Connection was available in local map
				existingConnection.overrideConnectionProperties(connectionProperties);
				return existingConnection;
			}

		} finally {
			EntityUtils.consumeQuietly(response.getEntity());
		}
	}

	/**
	 * Returns a Connection of the Session. This method only returns the local
	 * available object and does not query OpenVidu Server. To get the current
	 * actual value you must call first
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} or
	 * {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()}.
	 * 
	 * @param id The Connection to get
	 * 
	 * @return The {@link io.openvidu.java.client.Connection Connection} object, or
	 *         <code>null</code> if no Connection is found for param <code>id</code>
	 */
	public Connection getConnection(String id) {
		return this.connections.get(id);
	}

	/**
	 * Returns all the Connections of the Session. This method only returns the
	 * local available objects and does not query OpenVidu Server. To get the
	 * current actual value you must call first
	 * {@link io.openvidu.java.client.Session#fetch() Session.fetch()} or
	 * {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()}.
	 * 
	 * <strong>The list of Connections will remain unchanged since the last time
	 * method {@link io.openvidu.java.client.Session#fetch() Session.fetch()} or
	 * {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()} was
	 * called</strong>. Exceptions to this rule are:
	 * <ul>
	 * <li>Calling
	 * {@link io.openvidu.java.client.Session#createConnection(ConnectionProperties)
	 * createConnection(ConnectionProperties)} automatically adds the new Connection
	 * object to the local collection.</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceUnpublish(String)}
	 * automatically updates each affected local Connection object.</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceDisconnect(String)}
	 * automatically updates each affected local Connection object.</li>
	 * <li>Calling
	 * {@link io.openvidu.java.client.Session#updateConnection(String, ConnectionProperties)}
	 * automatically updates the attributes of the affected local Connection
	 * object.</li>
	 * </ul>
	 * <br>
	 * To get the list of connections with their current actual value, you must call
	 * first {@link io.openvidu.java.client.Session#fetch() Session.fetch()} or
	 * {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()}.
	 */
	public List<Connection> getConnections() {
		return this.connections.values().stream().collect(Collectors.toList());
	}

	/**
	 * Returns the list of active Connections of the Session. These are the
	 * Connections returning <code>active</code> in response to
	 * {@link io.openvidu.java.client.Connection#getStatus()}. This method only
	 * returns the local available objects and does not query OpenVidu Server.
	 * <strong>The list of active Connections will remain unchanged since the last
	 * time method {@link io.openvidu.java.client.Session#fetch() Session.fetch()}
	 * or {@link io.openvidu.java.client.OpenVidu#fetch() OpenVidu.fetch()} was
	 * called</strong>. Exceptions to this rule are:
	 * <ul>
	 * <li>Calling
	 * {@link io.openvidu.java.client.Session#createConnection(ConnectionProperties)
	 * createConnection(ConnectionProperties)} automatically adds the new Connection
	 * object to the local collection.</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceUnpublish(String)}
	 * automatically updates each affected local Connection object.</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceDisconnect(String)}
	 * automatically updates each affected local Connection object.</li>
	 * <li>Calling
	 * {@link io.openvidu.java.client.Session#updateConnection(String, ConnectionProperties)}
	 * automatically updates the attributes of the affected local Connection
	 * object.</li>
	 * </ul>
	 * <br>
	 * To get the list of active connections with their current actual value, you
	 * must call first {@link io.openvidu.java.client.Session#fetch()
	 * Session.fetch()} or {@link io.openvidu.java.client.OpenVidu#fetch()
	 * OpenVidu.fetch()} OpenVidu.fetch()}.
	 */
	public List<Connection> getActiveConnections() {
		return this.connections.values().stream().filter(con -> "active".equals(con.getStatus()))
				.collect(Collectors.toList());
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

	private void getSessionHttp() throws OpenViduJavaClientException, OpenViduHttpException {
		if (this.hasSessionId()) {
			return;
		}

		HttpPost request = new HttpPost(this.openVidu.hostname + OpenVidu.API_SESSIONS);
		StringEntity params = null;
		try {
			params = new StringEntity(properties.toJson().toString());
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

				// forcedVideoCodec and allowTranscoding values are configured in OpenVidu Server
				// via configuration or session
				VideoCodec forcedVideoCodec = VideoCodec.valueOf(responseJson.get("forcedVideoCodec").getAsString());
				Boolean allowTranscoding = responseJson.get("allowTranscoding").getAsBoolean();

				SessionProperties responseProperties = new SessionProperties.Builder()
						.customSessionId(properties.customSessionId())
						.mediaMode(properties.mediaMode())
						.recordingMode(properties.recordingMode())
						.defaultOutputMode(properties.defaultOutputMode())
						.defaultRecordingLayout(properties.defaultRecordingLayout())
						.defaultCustomLayout(properties.defaultCustomLayout())
						.mediaNode(properties.mediaNode())
						.forcedVideoCodec(forcedVideoCodec)
						.allowTranscoding(allowTranscoding)
						.build();

				this.properties = responseProperties;
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

	protected Session resetWithJson(JsonObject json) {
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
		if (json.has("customSessionId")) {
			builder.customSessionId(json.get("customSessionId").getAsString());
		}

		if (json.has("forcedVideoCodec")) {
			builder.forcedVideoCodec(VideoCodec.valueOf(json.get("forcedVideoCodec").getAsString()));
		}
		if (json.has("allowTranscoding")) {
			builder.allowTranscoding(json.get("allowTranscoding").getAsBoolean());
		}

		this.properties = builder.build();
		JsonArray jsonArrayConnections = (json.get("connections").getAsJsonObject()).get("content").getAsJsonArray();

		// 1. Set to store fetched connections and later remove closed ones
		Set<String> fetchedConnectionIds = new HashSet<>();
		jsonArrayConnections.forEach(connectionJsonElement -> {

			JsonObject connectionJson = connectionJsonElement.getAsJsonObject();
			Connection connectionObj = new Connection(connectionJson);
			String id = connectionObj.getConnectionId();
			fetchedConnectionIds.add(id);

			// 2. Update existing Connection
			this.connections.computeIfPresent(id, (cId, c) -> {
				c = c.resetWithJson(connectionJson);
				return c;
			});

			// 3. Add new Connection
			this.connections.computeIfAbsent(id, cId -> {
				return connectionObj;
			});
		});

		// 4. Remove closed connections from local collection
		this.connections.entrySet()
				.removeIf(entry -> !fetchedConnectionIds.contains(entry.getValue().getConnectionId()));
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
		if(this.properties.forcedVideoCodec() != null) {
			json.addProperty("forcedVideoCodec", this.properties.forcedVideoCodec().name());
		}
		if (this.properties.isTranscodingAllowed() != null) {
			json.addProperty("allowTranscoding", this.properties.isTranscodingAllowed());
		}
		JsonObject connections = new JsonObject();
		connections.addProperty("numberOfElements", this.getConnections().size());
		JsonArray jsonArrayConnections = new JsonArray();
		this.getConnections().forEach(con -> {
			jsonArrayConnections.add(con.toJson());
		});
		connections.add("content", jsonArrayConnections);
		json.add("connections", connections);
		return json.toString();
	}

}
