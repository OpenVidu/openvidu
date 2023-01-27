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

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.http.HttpClient;
import java.net.http.HttpClient.Builder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedTrustManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class OpenVidu {

	private static final Logger log = LoggerFactory.getLogger(OpenVidu.class);

	protected String hostname;
	protected HttpClient httpClient;
	protected Map<String, Session> activeSessions = new ConcurrentHashMap<>();
	protected long requestTimeout = 30000;
	protected Map<String, String> headers = new HashMap<>();

	protected final static String API_PATH = "openvidu/api";
	protected final static String API_SESSIONS = API_PATH + "/sessions";
	protected final static String API_TOKENS = API_PATH + "/tokens";
	protected final static String API_RECORDINGS = API_PATH + "/recordings";
	protected final static String API_RECORDINGS_START = API_RECORDINGS + "/start";
	protected final static String API_RECORDINGS_STOP = API_RECORDINGS + "/stop";

	private String defaultBasicAuth;

	/**
	 * @param hostname URL where your OpenVidu deployment is up an running. It must
	 *                 be the full URL (e.g. <code>https://12.34.56.78:1234/</code>)
	 * 
	 * @param secret   Secret configured in your OpenVidu deployment
	 */
	public OpenVidu(String hostname, String secret) {

		testHostname(hostname);
		setDefaultBasicAuth(secret);

		this.hostname = hostname;
		if (!this.hostname.endsWith("/")) {
			this.hostname += "/";
		}

		SSLContext sslContext;
		try {
			sslContext = SSLContext.getInstance("TLS");
			sslContext.init(null, new TrustManager[] { new X509ExtendedTrustManager() {
				public X509Certificate[] getAcceptedIssuers() {
					return null;
				}

				public void checkClientTrusted(final X509Certificate[] a_certificates, final String a_auth_type) {
				}

				public void checkServerTrusted(final X509Certificate[] a_certificates, final String a_auth_type) {
				}

				public void checkClientTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final Socket a_socket) {
				}

				public void checkServerTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final Socket a_socket) {
				}

				public void checkClientTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final SSLEngine a_engine) {
				}

				public void checkServerTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final SSLEngine a_engine) {
				}
			} }, null);
		} catch (KeyManagementException | NoSuchAlgorithmException e) {
			throw new RuntimeException(e);
		}

		Builder b = HttpClient.newBuilder();
		b.sslContext(sslContext);
		b.connectTimeout(Duration.ofSeconds(30));
		this.httpClient = b.build();
	}

	/**
	 * @param hostname   URL where your OpenVidu deployment is up an running. It
	 *                   must be the full URL (e.g.
	 *                   <code>https://12.34.56.78:1234/</code>)
	 * @param httpClient Object of class <a target="_blank" href=
	 *                   "https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpClient.html">java.net.http.HttpClient</a>.
	 *                   This overrides the internal HTTP client in use. This method
	 *                   allows you to custom configure the HTTP client to your
	 *                   needs. This may be interesting for many reasons, including:
	 *                   <ul>
	 *                   <li>Adding proxy configuration</li>
	 *                   <li>Customizing the SSLContext</li>
	 *                   <li>Modifying the connection timeout</li>
	 *                   <li>Adding a cookie handler</li>
	 *                   </ul>
	 */
	public OpenVidu(String hostname, String secret, HttpClient httpClient) {

		testHostname(hostname);
		setDefaultBasicAuth(secret);

		this.hostname = hostname;
		if (!this.hostname.endsWith("/")) {
			this.hostname += "/";
		}

		Builder b = HttpClient.newBuilder();
		if (httpClient.authenticator().isPresent()) {
			log.warn(
					"The provided HttpClient contains a custom java.net.Authenticator. OpenVidu deployments require all HTTP requests to have an Authorization header with Basic Auth, with username \"OPENVIDUAPP\" and password your OpenVidu deployment's secret (configuration parameter OPENVIDU_SECRET). The default Authenticator adds this header. Make sure that your custom Authenticator does so as well or that you add it explicitly via OpenVidu#setRequestHeaders, or you will receive 401 responses");
			b.authenticator(httpClient.authenticator().get());
		}
		if (httpClient.connectTimeout().isPresent()) {
			b.connectTimeout(httpClient.connectTimeout().get());
		}
		if (httpClient.cookieHandler().isPresent()) {
			b.cookieHandler(httpClient.cookieHandler().get());
		}
		if (httpClient.executor().isPresent()) {
			b.executor(httpClient.executor().get());
		}
		if (httpClient.proxy().isPresent()) {
			b.proxy(httpClient.proxy().get());
		}
		b.followRedirects(httpClient.followRedirects());
		b.sslContext(httpClient.sslContext());
		b.sslParameters(httpClient.sslParameters());
		b.version(httpClient.version());

		this.httpClient = b.build();
	}

	/**
	 * Returns the current request timeout configured for all requests.
	 */
	public long getRequestTimeout() {
		return this.requestTimeout;
	}

	/**
	 * Sets the request timeout for all HTTP requests. This is the same as setting
	 * the <a target="_blank" href=
	 * "https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpRequest.html#timeout()">HttpRequest.timeout()</a>
	 * property for all requests. The default value is 30000 ms.
	 * 
	 * @param requestTimeout Timeout in milliseconds
	 */
	public void setRequestTimeout(long requestTimeout) {
		this.requestTimeout = requestTimeout;
	}

	/**
	 * Returns the current collection of custom headers configured for all requests.
	 */
	public Map<String, String> getRequestHeaders() {
		return this.headers;
	}

	/**
	 * Sets custom HTTP headers for all requests. Will override any previous value.
	 * 
	 * @param headers Header names and values
	 */
	public void setRequestHeaders(Map<String, String> headers) {
		this.headers = headers;
	}

	/**
	 * Creates an OpenVidu session with the default settings
	 * 
	 * @return The created session
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public Session createSession() throws OpenViduJavaClientException, OpenViduHttpException {
		Session s = new Session(this);
		this.activeSessions.put(s.getSessionId(), s);
		return s;
	}

	/**
	 * Creates an OpenVidu session
	 * 
	 * @param properties The specific configuration for this session
	 * 
	 * @return The created session
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#post-session">REST
	 *                                     API</a>). This method will never return a
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException}
	 *                                     with status 409. If a session with the
	 *                                     same <code>customSessionId</code> already
	 *                                     exists in OpenVidu Server, a
	 *                                     {@link io.openvidu.java.client.Session#fetch()}
	 *                                     operation is performed in the background
	 *                                     and the updated Session object is
	 *                                     returned.
	 */
	public Session createSession(SessionProperties properties)
			throws OpenViduJavaClientException, OpenViduHttpException {
		Session s = new Session(this, properties);
		this.activeSessions.put(s.getSessionId(), s);
		return s;
	}

	/**
	 * Starts the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId  The sessionId of the session you want to start recording
	 * @param properties The configuration for this recording
	 *
	 * @return The new created session
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#post-recording-start">REST
	 *                                     API</a>)
	 */
	public Recording startRecording(String sessionId, RecordingProperties properties)
			throws OpenViduJavaClientException, OpenViduHttpException {

		try {
			JsonObject json = properties.toJson();
			json.addProperty("session", sessionId);

			HttpRequest request = addHeaders(
					HttpRequest.newBuilder().POST(HttpRequest.BodyPublishers.ofString(json.toString()))
							.uri(new URI(this.hostname + API_RECORDINGS_START))
							.setHeader("Content-Type", "application/json").timeout(Duration.ofMillis(requestTimeout)))
					.build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if ((response.statusCode() == HttpURLConnection.HTTP_OK)) {
				Recording r = new Recording(Utils.httpResponseToJson(response));
				Session activeSession = this.activeSessions.get(r.getSessionId());
				if (activeSession != null) {
					activeSession.setIsBeingRecorded(true);
				} else {
					log.warn(
							"No active session found for sessionId '{}'. This instance of OpenVidu Java Client didn't create this session",
							r.getSessionId());
				}
				return r;
			} else {
				throw new OpenViduHttpException(response.statusCode());
			}

		} catch (URISyntaxException | IOException | InterruptedException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
	}

	/**
	 * Starts the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId The sessionId of the session you want to start recording
	 * @param name      The name you want to give to the video file.
	 *                  <strong>WARNING: this parameter follows an overwriting
	 *                  policy.</strong> If you name two recordings the same, the
	 *                  newest MP4 file will overwrite the oldest one
	 *
	 * @return The started recording. If this method successfully returns the
	 *         Recording object it means that the recording can be stopped with
	 *         guarantees
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#post-recording-start">REST
	 *                                     API</a>)
	 */
	public Recording startRecording(String sessionId, String name)
			throws OpenViduJavaClientException, OpenViduHttpException {
		if (name == null) {
			name = "";
		}
		return this.startRecording(sessionId, new RecordingProperties.Builder().name(name).build());
	}

	/**
	 * Starts the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId The sessionId of the session you want to start recording
	 *
	 * @return The started recording. If this method successfully returns the
	 *         Recording object it means that the recording can be stopped with
	 *         guarantees
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#post-recording-start">REST
	 *                                     API</a>)
	 */
	public Recording startRecording(String sessionId) throws OpenViduJavaClientException, OpenViduHttpException {
		return this.startRecording(sessionId, "");
	}

	/**
	 * Stops the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param recordingId The id property of the recording you want to stop
	 *
	 * @return The stopped recording
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#post-recording-stop">REST
	 *                                     API</a>)
	 */
	public Recording stopRecording(String recordingId) throws OpenViduJavaClientException, OpenViduHttpException {

		try {
			HttpRequest request = addHeaders(HttpRequest.newBuilder().POST(HttpRequest.BodyPublishers.noBody())
					.uri(new URI(this.hostname + API_RECORDINGS_STOP + "/" + recordingId))
					.timeout(Duration.ofMillis(requestTimeout))).build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if (response.statusCode() == HttpURLConnection.HTTP_OK) {
				Recording r = new Recording(Utils.httpResponseToJson(response));
				Session activeSession = this.activeSessions.get(r.getSessionId());
				if (activeSession != null) {
					activeSession.setIsBeingRecorded(false);
				} else {
					log.warn(
							"No active session found for sessionId '{}'. This instance of OpenVidu Java Client didn't create this session",
							r.getSessionId());
				}
				return r;
			} else {
				throw new OpenViduHttpException(response.statusCode());
			}
		} catch (URISyntaxException | IOException | InterruptedException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
	}

	/**
	 * Gets an existing recording
	 *
	 * @param recordingId The id property of the recording you want to retrieve
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#get-recording">REST
	 *                                     API</a>)
	 */
	public Recording getRecording(String recordingId) throws OpenViduJavaClientException, OpenViduHttpException {

		try {
			HttpRequest request = addHeaders(
					HttpRequest.newBuilder().GET().uri(new URI(this.hostname + API_RECORDINGS + "/" + recordingId))
							.timeout(Duration.ofMillis(requestTimeout)))
					.build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if (response.statusCode() == HttpURLConnection.HTTP_OK) {
				return new Recording(Utils.httpResponseToJson(response));
			} else {
				throw new OpenViduHttpException(response.statusCode());
			}
		} catch (URISyntaxException | IOException | InterruptedException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
	}

	/**
	 * Lists all existing recordings
	 *
	 * @return A {@link java.util.List} with all existing recordings
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	public List<Recording> listRecordings() throws OpenViduJavaClientException, OpenViduHttpException {

		try {
			HttpRequest request = addHeaders(HttpRequest.newBuilder().GET().uri(new URI(this.hostname + API_RECORDINGS))
					.timeout(Duration.ofMillis(requestTimeout))).build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if (response.statusCode() == HttpURLConnection.HTTP_OK) {
				List<Recording> recordings = new ArrayList<>();
				JsonObject json = Utils.httpResponseToJson(response);
				JsonArray array = json.get("items").getAsJsonArray();
				array.forEach(item -> {
					recordings.add(new Recording(item.getAsJsonObject()));
				});
				return recordings;
			} else {
				throw new OpenViduHttpException(response.statusCode());
			}
		} catch (URISyntaxException | IOException | InterruptedException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
	}

	/**
	 * Deletes a recording. The recording must have status
	 * {@link io.openvidu.java.client.Recording.Status#stopped},
	 * {@link io.openvidu.java.client.Recording.Status#ready} or
	 * {@link io.openvidu.java.client.Recording.Status#failed}
	 *
	 * @param recordingId The id property of the recording you want to delete
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#delete-recording">REST
	 *                                     API</a>)
	 */
	public void deleteRecording(String recordingId) throws OpenViduJavaClientException, OpenViduHttpException {

		try {
			HttpRequest request = addHeaders(
					HttpRequest.newBuilder().DELETE().uri(new URI(this.hostname + API_RECORDINGS + "/" + recordingId))
							.timeout(Duration.ofMillis(requestTimeout)))
					.build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if (response.statusCode() != HttpURLConnection.HTTP_NO_CONTENT) {
				throw new OpenViduHttpException(response.statusCode());
			}
		} catch (URISyntaxException | IOException | InterruptedException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
	}

	/**
	 * Returns the list of active sessions. <strong>This value will remain unchanged
	 * since the last time method {@link io.openvidu.java.client.OpenVidu#fetch()}
	 * was called</strong>. Exceptions to this rule are:
	 * <ul>
	 * <li>Calling
	 * {@link io.openvidu.java.client.OpenVidu#createSession(SessionProperties)
	 * OpenVidu.createSession} automatically adds the new Session object to the
	 * local collection.</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#fetch()} updates that
	 * specific Session status</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#close()} automatically
	 * removes the Session from the list of active Sessions</li>
	 * <li>Calling
	 * {@link io.openvidu.java.client.Session#forceDisconnect(Connection)}
	 * automatically updates the inner affected connections for that specific
	 * Session</li>
	 * <li>Calling {@link io.openvidu.java.client.Session#forceUnpublish(Publisher)}
	 * automatically updates the inner affected connections for that specific
	 * Session</li>
	 * <li>Calling
	 * {@link io.openvidu.java.client.Session#updateConnection(String, ConnectionProperties)}
	 * automatically updates the inner affected connection for that specific
	 * Session</li>
	 * <li>Calling {@link io.openvidu.java.client.OpenVidu#startRecording(String)}
	 * and {@link io.openvidu.java.client.OpenVidu#stopRecording(String)}
	 * automatically updates the recording status of the Session
	 * ({@link io.openvidu.java.client.Session#isBeingRecorded()})</li>
	 * </ul>
	 * <br>
	 * To get the list of active sessions with their current actual value, you must
	 * call first {@link io.openvidu.java.client.OpenVidu#fetch()} and then
	 * {@link io.openvidu.java.client.OpenVidu#getActiveSessions()}
	 */
	public List<Session> getActiveSessions() {
		return new ArrayList<>(this.activeSessions.values());
	}

	/**
	 * Returns an active session. This method has the same behavior and restrictions
	 * as {@link io.openvidu.java.client.OpenVidu#getActiveSessions()}, but it just
	 * returns a single Session instead of the complete list of Sessions
	 * 
	 * @param sessionId
	 * @return
	 */
	public Session getActiveSession(String sessionId) {
		return this.activeSessions.get(sessionId);
	}

	/**
	 * Updates every property of every active Session with the current status they
	 * have in OpenVidu Server. After calling this method you can access the updated
	 * list of active sessions by calling
	 * {@link io.openvidu.java.client.OpenVidu#getActiveSessions()}
	 * 
	 * @return true if any Session status has changed with respect to the server,
	 *         false if not. This applies to any property or sub-property of any of
	 *         the sessions locally stored in OpenVidu Java Client
	 * 
	 * @throws OpenViduHttpException
	 * @throws OpenViduJavaClientException
	 */
	public boolean fetch() throws OpenViduJavaClientException, OpenViduHttpException {

		try {
			HttpRequest request = addHeaders(HttpRequest.newBuilder().GET()
					.uri(new URI(this.hostname + API_SESSIONS + "?pendingConnections=true"))
					.timeout(Duration.ofMillis(requestTimeout))).build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if (response.statusCode() == HttpURLConnection.HTTP_OK) {

				JsonObject jsonSessions = Utils.httpResponseToJson(response);
				JsonArray jsonArraySessions = jsonSessions.get("content").getAsJsonArray();

				// Boolean to store if any Session has changed
				final boolean[] hasChanged = { false };

				// 1. Set to store fetched sessionIds and later remove closed ones
				Set<String> fetchedSessionIds = new HashSet<>();
				jsonArraySessions.forEach(sessionJsonElement -> {

					JsonObject sessionJson = sessionJsonElement.getAsJsonObject();
					final Session sessionObj = new Session(this, sessionJson);
					String id = sessionObj.getSessionId();
					fetchedSessionIds.add(id);

					// 2. Update existing Session
					this.activeSessions.computeIfPresent(id, (sId, s) -> {
						String beforeJSON = s.toJson();
						s = s.resetWithJson(sessionJson);
						String afterJSON = s.toJson();
						boolean changed = !beforeJSON.equals(afterJSON);
						hasChanged[0] = hasChanged[0] || changed;
						log.info("Available session '{}' info fetched. Any change: {}", id, changed);
						return s;
					});

					// 3. Add new Session
					this.activeSessions.computeIfAbsent(id, sId -> {
						log.info("New session '{}' fetched", id);
						hasChanged[0] = true;
						return sessionObj;
					});
				});

				// 4. Remove closed sessions from local collection
				this.activeSessions.entrySet().removeIf(entry -> {
					if (fetchedSessionIds.contains(entry.getKey())) {
						return false;
					} else {
						log.info("Removing closed session {}", entry.getKey());
						hasChanged[0] = true;
						return true;
					}
				});

				log.info("Active sessions info fetched: {}", this.activeSessions.keySet());
				return hasChanged[0];

			} else {
				throw new OpenViduHttpException(response.statusCode());
			}

		} catch (URISyntaxException | IOException | InterruptedException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}
	}

	protected HttpRequest.Builder addHeaders(HttpRequest.Builder builder) {
		// HTTP header names are case insensitive
		Map<String, String> headersLowerCase = new HashMap<>();
		this.headers.forEach((k, v) -> headersLowerCase.put(k.toLowerCase(), v));
		if (!headersLowerCase.containsKey("authorization")) {
			// There is no custom Authorization header. Add default Basic Auth for OpenVidu
			headersLowerCase.put("authorization", this.defaultBasicAuth);
		}
		headersLowerCase.forEach((k, v) -> builder.setHeader(k, v));
		return builder;
	}

	private void testHostname(String hostnameStr) {
		try {
			new URL(hostnameStr);
		} catch (MalformedURLException e) {
			throw new RuntimeException("The hostname \"" + hostnameStr + "\" is not a valid URL: " + e.getMessage());
		}
	}

	private void setDefaultBasicAuth(String secret) {
		this.defaultBasicAuth = "Basic " + Base64.getEncoder().encodeToString(("OPENVIDUAPP:" + secret).getBytes());
	}
}
