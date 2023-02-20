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
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.SSLContext;

import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.classic.methods.HttpDelete;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.io.HttpClientConnectionManager;
import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactoryBuilder;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.HttpException;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.ParseException;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.ssl.SSLContextBuilder;
import org.apache.hc.core5.ssl.TrustStrategy;
import org.apache.hc.core5.util.TimeValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

public class OpenVidu {

	private static final Logger log = LoggerFactory.getLogger(OpenVidu.class);

	protected String hostname;
	protected CloseableHttpClient httpClient;
	protected Map<String, Session> activeSessions = new ConcurrentHashMap<>();

	protected final static String API_PATH = "openvidu/api";
	protected final static String API_SESSIONS = API_PATH + "/sessions";
	protected final static String API_TOKENS = API_PATH + "/tokens";
	protected final static String API_RECORDINGS = API_PATH + "/recordings";
	protected final static String API_RECORDINGS_START = API_RECORDINGS + "/start";
	protected final static String API_RECORDINGS_STOP = API_RECORDINGS + "/stop";
	protected final static String API_BROADCAST = API_PATH + "/broadcast";
	protected final static String API_BROADCAST_START = API_BROADCAST + "/start";
	protected final static String API_BROADCAST_STOP = API_BROADCAST + "/stop";

	/**
	 * @param hostname URL where your OpenVidu deployment is up an running. It must
	 *                 be the full URL (e.g. <code>https://12.34.56.78:1234/</code>)
	 * 
	 * @param secret   Secret configured in your OpenVidu deployment
	 */
	public OpenVidu(String hostname, String secret) {

		testHostname(hostname);
		this.hostname = hostname;
		if (!this.hostname.endsWith("/")) {
			this.hostname += "/";
		}

		TrustStrategy trustStrategy = new TrustStrategy() {
			@Override
			public boolean isTrusted(X509Certificate[] chain, String authType) throws CertificateException {
				return true;
			}
		};

		final BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
		credentialsProvider.setCredentials(new AuthScope(null, -1),
				new UsernamePasswordCredentials("OPENVIDUAPP", secret.toCharArray()));

		SSLContext sslContext;
		try {
			sslContext = new SSLContextBuilder().loadTrustMaterial(null, trustStrategy).build();
		} catch (KeyManagementException | NoSuchAlgorithmException | KeyStoreException e) {
			throw new RuntimeException(e);
		}
		final SSLConnectionSocketFactory sslSocketFactory = SSLConnectionSocketFactoryBuilder.create()
				.setHostnameVerifier(NoopHostnameVerifier.INSTANCE).setSslContext(sslContext).build();

		final HttpClientConnectionManager connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
				.setSSLSocketFactory(sslSocketFactory).setConnectionTimeToLive(TimeValue.ofSeconds(30)).build();

		RequestConfig requestConfig = RequestConfig.custom().setConnectTimeout(30, TimeUnit.SECONDS)
				.setConnectionRequestTimeout(30, TimeUnit.SECONDS).setResponseTimeout(30, TimeUnit.SECONDS).build();

		this.httpClient = HttpClients.custom().setConnectionManager(connectionManager)
				.setDefaultRequestConfig(requestConfig).setDefaultCredentialsProvider(credentialsProvider).build();
	}

	/**
	 * @param hostname URL where your OpenVidu deployment is up an running. It must
	 *                 be the full URL (e.g. <code>https://12.34.56.78:1234/</code>)
	 * 
	 * @param secret   Secret configured in your OpenVidu deployment
	 * 
	 * @param builder  An instance of <a href=
	 *                 "https://hc.apache.org/httpcomponents-client-5.2.x/current/httpclient5/apidocs/org/apache/hc/client5/http/impl/classic/HttpClientBuilder.html"
	 *                 target=
	 *                 "_blank">org.apache.hc.client5.http.impl.classic.HttpClientBuilder</a>.
	 *                 This overrides the internal HTTP client in use. This method
	 *                 allows you to custom configure the HTTP client to your needs.
	 *                 This may be interesting for many reasons, including:
	 *                 <ul>
	 *                 <li>Adding custom HTTP headers</li>
	 *                 <li>Adding proxy configuration</li>
	 *                 <li>Customizing the SSLContext</li>
	 *                 <li>Modifying the connection timeouts</li>
	 *                 <li>Setting up a cookie store</li>
	 *                 </ul>
	 *                 This method will override any <a href=
	 *                 "https://hc.apache.org/httpcomponents-client-5.2.x/current/httpclient5/apidocs/org/apache/hc/client5/http/auth/CredentialsProvider.html"
	 *                 target="_blank">CredentialsProvider</a> of the
	 *                 {@code builder} with a <a href=
	 *                 "https://hc.apache.org/httpcomponents-client-5.2.x/current/httpclient5/apidocs/org/apache/hc/client5/http/impl/auth/BasicCredentialsProvider.html"
	 *                 target="_blank">BasicCredentialsProvider</a> built with the
	 *                 param {@code secret}, which is the default configuration.
	 */
	public OpenVidu(String hostname, String secret, HttpClientBuilder builder) {

		testHostname(hostname);
		this.hostname = hostname;
		if (!this.hostname.endsWith("/")) {
			this.hostname += "/";
		}

		final BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
		credentialsProvider.setCredentials(new AuthScope(null, -1),
				new UsernamePasswordCredentials("OPENVIDUAPP", secret.toCharArray()));
		this.httpClient = builder.setDefaultCredentialsProvider(credentialsProvider).build();
	}

	/**
	 * @param hostname URL where your OpenVidu deployment is up an running. It must
	 *                 be the full URL (e.g. <code>https://12.34.56.78:1234/</code>)
	 * 
	 * @param builder  An instance of <a href=
	 *                 "https://hc.apache.org/httpcomponents-client-5.2.x/current/httpclient5/apidocs/org/apache/hc/client5/http/impl/classic/HttpClientBuilder.html"
	 *                 target=
	 *                 "_blank">org.apache.hc.client5.http.impl.classic.HttpClientBuilder</a>.
	 *                 This overrides the internal HTTP client in use. This method
	 *                 allows you to custom configure the HTTP client to your needs.
	 *                 This may be interesting for many reasons, including:
	 *                 <ul>
	 *                 <li>Adding custom HTTP headers</li>
	 *                 <li>Adding proxy configuration</li>
	 *                 <li>Customizing the SSLContext</li>
	 *                 <li>Modifying the connection timeouts</li>
	 *                 <li>Setting up a cookie store</li>
	 *                 </ul>
	 */
	public OpenVidu(String hostname, HttpClientBuilder builder) {

		testHostname(hostname);
		this.hostname = hostname;
		if (!this.hostname.endsWith("/")) {
			this.hostname += "/";
		}

		this.httpClient = builder.build();
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
			throws OpenViduHttpException, OpenViduJavaClientException {

		final HttpClientResponseHandler<Recording> responseHandler = new HttpClientResponseHandler<Recording>() {
			@Override
			public Recording handleResponse(final ClassicHttpResponse response) throws IOException, HttpException {
				final int status = response.getCode();
				if (status == HttpStatus.SC_OK) {
					Recording r = new Recording(httpResponseEntityToJson(response.getEntity()));
					Session activeSession = activeSessions.get(r.getSessionId());
					if (activeSession != null) {
						activeSession.setIsBeingRecorded(true);
					} else {
						log.warn(
								"No active session found for sessionId '{}'. This instance of OpenVidu Java Client didn't create this session",
								r.getSessionId());
					}
					return r;
				} else {
					throw openViduHttpException(status);
				}
			}
		};

		JsonObject json = properties.toJson();
		json.addProperty("session", sessionId);
		StringEntity params = new StringEntity(json.toString(), StandardCharsets.UTF_8);

		HttpPost request = new HttpPost(this.hostname + API_RECORDINGS_START);
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
		request.setEntity(params);

		try {
			return this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
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

		final HttpClientResponseHandler<Recording> responseHandler = new HttpClientResponseHandler<Recording>() {
			@Override
			public Recording handleResponse(final ClassicHttpResponse response) throws IOException, HttpException {
				final int status = response.getCode();
				if (status == HttpStatus.SC_OK) {
					Recording r = new Recording(httpResponseEntityToJson(response.getEntity()));
					Session activeSession = activeSessions.get(r.getSessionId());
					if (activeSession != null) {
						activeSession.setIsBeingRecorded(false);
					} else {
						log.warn(
								"No active session found for sessionId '{}'. This instance of OpenVidu Java Client didn't create this session",
								r.getSessionId());
					}
					return r;
				} else {
					throw openViduHttpException(status);
				}
			}
		};

		HttpPost request = new HttpPost(this.hostname + API_RECORDINGS_STOP + "/" + recordingId);

		try {
			return this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
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

		final HttpClientResponseHandler<Recording> responseHandler = new HttpClientResponseHandler<Recording>() {
			@Override
			public Recording handleResponse(final ClassicHttpResponse response) throws IOException, HttpException {
				final int status = response.getCode();
				if (status == HttpStatus.SC_OK) {
					return new Recording(httpResponseEntityToJson(response.getEntity()));
				} else {
					throw openViduHttpException(status);
				}
			}
		};

		HttpGet request = new HttpGet(this.hostname + API_RECORDINGS + "/" + recordingId);

		try {
			return this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
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

		final HttpClientResponseHandler<List<Recording>> responseHandler = new HttpClientResponseHandler<List<Recording>>() {
			@Override
			public List<Recording> handleResponse(final ClassicHttpResponse response)
					throws IOException, HttpException {
				final int status = response.getCode();
				if (status == HttpStatus.SC_OK) {
					List<Recording> recordings = new ArrayList<>();
					JsonObject json = httpResponseEntityToJson(response.getEntity());
					JsonArray array = json.get("items").getAsJsonArray();
					array.forEach(item -> {
						recordings.add(new Recording(item.getAsJsonObject()));
					});
					return recordings;
				} else {
					throw openViduHttpException(status);
				}
			}
		};

		HttpGet request = new HttpGet(this.hostname + API_RECORDINGS);

		try {
			return this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
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

		final HttpClientResponseHandler<Void> responseHandler = new HttpClientResponseHandler<Void>() {
			@Override
			public Void handleResponse(final ClassicHttpResponse response) throws IOException, HttpException {
				final int status = response.getCode();
				if (status != HttpStatus.SC_NO_CONTENT) {
					throw openViduHttpException(status);
				}
				return null;
			}
		};

		HttpDelete request = new HttpDelete(this.hostname + API_RECORDINGS + "/" + recordingId);

		try {
			this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
		}
	}

	/**
	 * Starts the broadcast of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId    The sessionId of the session you want to start
	 *                     broadcasting
	 * @param broadcastUrl The URL where to broadcast
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#start-broadcast">REST
	 *                                     API</a>)
	 */
	public void startBroadcast(String sessionId, String broadcastUrl)
			throws OpenViduJavaClientException, OpenViduHttpException {
		this.startBroadcast(sessionId, broadcastUrl, new RecordingProperties.Builder().build());
	}

	/**
	 * Starts the broadcast of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId    The sessionId of the session you want to start
	 *                     broadcasting
	 * @param broadcastUrl The URL where to broadcast
	 * @param properties   The configuration for this broadcast. It uses a subset of
	 *                     the {@link io.openvidu.java.client.RecordingProperties}:
	 *                     <ul>
	 *                     <li>{@link RecordingProperties.Builder#hasAudio(boolean)}</li>
	 *                     <li>{@link RecordingProperties.Builder#resolution(String)}</li>
	 *                     <li>{@link RecordingProperties.Builder#frameRate(int)}</li>
	 *                     <li>{@link RecordingProperties.Builder#recordingLayout(RecordingLayout)}</li>
	 *                     <li>{@link RecordingProperties.Builder#customLayout(String)}</li>
	 *                     <li>{@link RecordingProperties.Builder#shmSize(long)}</li>
	 *                     <li>{@link RecordingProperties.Builder#mediaNode(String)}</li>
	 *                     </ul>
	 * 
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#start-broadcast">REST
	 *                                     API</a>)
	 */
	public void startBroadcast(String sessionId, String broadcastUrl, RecordingProperties properties)
			throws OpenViduJavaClientException, OpenViduHttpException {
		final HttpClientResponseHandler<Void> responseHandler = new HttpClientResponseHandler<Void>() {
			@Override
			public Void handleResponse(final ClassicHttpResponse response) throws IOException, HttpException {
				final int status = response.getCode();
				if (status == HttpStatus.SC_OK) {
					Session activeSession = activeSessions.get(sessionId);
					if (activeSession != null) {
						activeSession.setIsBeingBroadcasted(true);
					} else {
						log.warn(
								"No active session found for sessionId '{}'. This instance of OpenVidu Java Client didn't create this session",
								sessionId);
					}
				} else {
					throw openViduHttpException(status);
				}
				return null;
			}
		};

		JsonObject json = properties.toJson();
		json.addProperty("session", sessionId);
		json.addProperty("broadcastUrl", broadcastUrl);
		StringEntity params = new StringEntity(json.toString(), StandardCharsets.UTF_8);

		HttpPost request = new HttpPost(this.hostname + API_BROADCAST_START);
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
		request.setEntity(params);

		try {
			this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
		}
	}

	/**
	 * Stops the broadcast of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId The sessionId of the session you want to stop broadcasting
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException       The status code carries a specific
	 *                                     meaning
	 *                                     {@link io.openvidu.java.client.OpenViduHttpException#getStatus()}
	 *                                     (see <a href=
	 *                                     "/en/stable/reference-docs/REST-API/#stop-broadcast">REST
	 *                                     API</a>)
	 */
	public void stopBroadcast(String sessionId) throws OpenViduJavaClientException, OpenViduHttpException {
		final HttpClientResponseHandler<Void> responseHandler = new HttpClientResponseHandler<Void>() {
			@Override
			public Void handleResponse(final ClassicHttpResponse response) throws IOException, HttpException {
				final int status = response.getCode();
				if (status == HttpStatus.SC_OK) {
					Session activeSession = activeSessions.get(sessionId);
					if (activeSession != null) {
						activeSession.setIsBeingBroadcasted(false);
					} else {
						log.warn(
								"No active session found for sessionId '{}'. This instance of OpenVidu Java Client didn't create this session",
								sessionId);
					}
					return null;
				} else {
					throw openViduHttpException(status);
				}
			}
		};

		JsonObject json = new JsonObject();
		json.addProperty("session", sessionId);
		StringEntity params = new StringEntity(json.toString(), StandardCharsets.UTF_8);

		HttpPost request = new HttpPost(this.hostname + API_BROADCAST_STOP);
		request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
		request.setEntity(params);

		try {
			this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
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

		final OpenVidu thisOV = this;
		final HttpClientResponseHandler<Boolean> responseHandler = new HttpClientResponseHandler<Boolean>() {
			@Override
			public Boolean handleResponse(final ClassicHttpResponse response) throws IOException, HttpException {
				final int status = response.getCode();
				if (status == HttpStatus.SC_OK) {

					JsonObject jsonSessions = httpResponseEntityToJson(response.getEntity());
					JsonArray jsonArraySessions = jsonSessions.get("content").getAsJsonArray();

					// Boolean to store if any Session has changed
					final boolean[] hasChanged = { false };

					// 1. Set to store fetched sessionIds and later remove closed ones
					Set<String> fetchedSessionIds = new HashSet<>();
					jsonArraySessions.forEach(sessionJsonElement -> {

						JsonObject sessionJson = sessionJsonElement.getAsJsonObject();
						final Session sessionObj = new Session(thisOV, sessionJson);
						String id = sessionObj.getSessionId();
						fetchedSessionIds.add(id);

						// 2. Update existing Session
						activeSessions.computeIfPresent(id, (sId, s) -> {
							String beforeJSON = s.toJson();
							s = s.resetWithJson(sessionJson);
							String afterJSON = s.toJson();
							boolean changed = !beforeJSON.equals(afterJSON);
							hasChanged[0] = hasChanged[0] || changed;
							log.info("Available session '{}' info fetched. Any change: {}", id, changed);
							return s;
						});

						// 3. Add new Session
						activeSessions.computeIfAbsent(id, sId -> {
							log.info("New session '{}' fetched", id);
							hasChanged[0] = true;
							return sessionObj;
						});
					});

					// 4. Remove closed sessions from local collection
					activeSessions.entrySet().removeIf(entry -> {
						if (fetchedSessionIds.contains(entry.getKey())) {
							return false;
						} else {
							log.info("Removing closed session {}", entry.getKey());
							hasChanged[0] = true;
							return true;
						}
					});

					log.info("Active sessions info fetched: {}", activeSessions.keySet());
					return hasChanged[0];
				} else {
					throw openViduHttpException(status);
				}
			}
		};

		HttpGet request = new HttpGet(this.hostname + API_SESSIONS + "?pendingConnections=true");

		try {
			return this.httpClient.execute(request, responseHandler);
		} catch (IOException e) {
			throw ioExceptionToOpenViduHttpException(e);
		}
	}

	protected static JsonObject httpResponseEntityToJson(HttpEntity responseEntity) throws IOException {
		try {
			JsonObject json = new Gson().fromJson(EntityUtils.toString(responseEntity, StandardCharsets.UTF_8),
					JsonObject.class);
			return json;
		} catch (JsonSyntaxException | ParseException | IOException e) {
			JsonObject json = new JsonObject();
			json.addProperty("openviduExceptionType", OpenViduJavaClientException.class.getSimpleName());
			json.addProperty("openviduExceptionMessage", e.getMessage());
			throw new IOException(json.toString(), e.getCause());
		}
	}

	protected static IOException openViduHttpException(int status) {
		JsonObject json = new JsonObject();
		json.addProperty("openviduExceptionType", OpenViduHttpException.class.getSimpleName());
		json.addProperty("openviduExceptionMessage", status);
		return new IOException(json.toString());
	}

	protected static IOException openViduException(OpenViduException exception) {
		JsonObject json = new JsonObject();
		json.addProperty("openviduExceptionType", exception.getClass().getSimpleName());
		json.addProperty("openviduExceptionMessage", exception.getMessage());
		return new IOException(json.toString());
	}

	protected static OpenViduHttpException ioExceptionToOpenViduHttpException(IOException exception)
			throws OpenViduJavaClientException {
		JsonObject json;
		try {
			String message = exception.getMessage();
			json = JsonParser.parseString(message).getAsJsonObject();
		} catch (Exception e) {
			throw new OpenViduJavaClientException(exception.getMessage(), exception.getCause());
		}
		if (json.has("openviduExceptionType")) {
			String openviduExceptionType = json.get("openviduExceptionType").getAsString();
			if (OpenViduJavaClientException.class.getSimpleName().equals(openviduExceptionType)) {
				throw new OpenViduJavaClientException(json.get("openviduExceptionMessage").getAsString());
			} else if (OpenViduHttpException.class.getSimpleName().equals(openviduExceptionType)) {
				return new OpenViduHttpException(json.get("openviduExceptionMessage").getAsInt());
			} else {
				log.error("Unknown OpenVidu Exception: " + openviduExceptionType);
				throw new OpenViduJavaClientException(exception.getMessage(), exception.getCause());
			}
		} else {
			// Unlikely case when an unknown exception has a JSON format message
			throw new OpenViduJavaClientException(exception.getMessage(), exception.getCause());
		}
	}

	private void testHostname(String hostnameStr) {
		try {
			new URL(hostnameStr);
		} catch (MalformedURLException e) {
			throw new RuntimeException("The hostname \"" + hostnameStr + "\" is not a valid URL: " + e.getMessage());
		}
	}

}