/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;

import javax.net.ssl.SSLContext;

import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.ssl.TrustStrategy;
import org.apache.http.util.EntityUtils;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class OpenVidu {

	private String urlOpenViduServer;
	private String secret;
	private HttpClient myHttpClient;

	final static String API_RECORDINGS = "api/recordings";
	final static String API_RECORDINGS_START = "/start";
	final static String API_RECORDINGS_STOP = "/stop";

	/**
	 * @param urlOpenViduServer
	 *            Public accessible IP where your instance of OpenVidu Server is up
	 *            an running
	 * @param secret
	 *            Secret used on OpenVidu Server initialization
	 */
	public OpenVidu(String urlOpenViduServer, String secret) {

		this.urlOpenViduServer = urlOpenViduServer;

		if (!this.urlOpenViduServer.endsWith("/")) {
			this.urlOpenViduServer += "/";
		}

		this.secret = secret;

		TrustStrategy trustStrategy = new TrustStrategy() {
			@Override
			public boolean isTrusted(X509Certificate[] chain, String authType) throws CertificateException {
				return true;
			}
		};

		CredentialsProvider provider = new BasicCredentialsProvider();
		UsernamePasswordCredentials credentials = new UsernamePasswordCredentials("OPENVIDUAPP", this.secret);
		provider.setCredentials(AuthScope.ANY, credentials);

		SSLContext sslContext;

		try {
			sslContext = new SSLContextBuilder().loadTrustMaterial(null, trustStrategy).build();
		} catch (KeyManagementException | NoSuchAlgorithmException | KeyStoreException e) {
			throw new RuntimeException(e);
		}

		this.myHttpClient = HttpClients.custom().setSSLHostnameVerifier(NoopHostnameVerifier.INSTANCE)
				.setSSLContext(sslContext).setDefaultCredentialsProvider(provider).build();

	}

	/**
	 * Creates an OpenVidu session with the default settings
	 * 
	 * @return The created session
	 * 
	 * @throws OpenViduJavaClientException
	 */
	public Session createSession() throws OpenViduJavaClientException {
		Session s = new Session(myHttpClient, urlOpenViduServer);
		return s;
	}

	/**
	 * Creates an OpenVidu session
	 * 
	 * @param properties
	 *            The specific configuration for this session
	 * 
	 * @return The created session
	 * 
	 * @throws OpenViduJavaClientException
	 */
	public Session createSession(SessionProperties properties) throws OpenViduJavaClientException {
		Session s = new Session(myHttpClient, urlOpenViduServer, properties);
		return s;
	}

	/**
	 * Starts the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId
	 *            The sessionId of the session you want to start recording
	 * @param name
	 *            The name you want to give to the video file. You can access this
	 *            same value in your clients on recording events (recordingStarted,
	 *            recordingStopped)
	 * @param properties
	 *            The configuration for this recording
	 *
	 * @return The new created session
	 * 
	 * @throws OpenViduJavaClientException
	 */
	@SuppressWarnings("unchecked")
	public Recording startRecording(String sessionId, RecordingProperties properties)
			throws OpenViduJavaClientException {

		HttpPost request = new HttpPost(this.urlOpenViduServer + API_RECORDINGS + API_RECORDINGS_START);

		JSONObject json = new JSONObject();
		json.put("session", sessionId);
		json.put("name", properties.name());
		json.put("recordingLayout", (properties.recordingLayout() != null) ? properties.recordingLayout().name() : "");
		json.put("customLayout", (properties.customLayout() != null) ? properties.customLayout() : "");
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
			response = myHttpClient.execute(request);
		} catch (IOException e2) {
			throw new OpenViduJavaClientException(e2.getMessage(), e2.getCause());
		}

		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
			return new Recording(httpResponseToJson(response));
		} else {
			throw new OpenViduJavaClientException("Unexpected response from OpenVidu Server: " + statusCode);
		}
	}

	/**
	 * Starts the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId
	 *            The sessionId of the session you want to start recording
	 * @param name
	 *            The name you want to give to the video file. You can access this
	 *            same value in your clients on recording events (recordingStarted,
	 *            recordingStopped)
	 *
	 * @return The started recording. If this method successfully returns the
	 *         Recording object it means that the recording can be stopped with
	 *         guarantees
	 * 
	 * @throws OpenViduJavaClientException
	 */
	public Recording startRecording(String sessionId, String name) throws OpenViduJavaClientException {
		if (name == null) {
			name = "";
		}
		return this.startRecording(sessionId, new RecordingProperties.Builder().name(name).build());
	}

	/**
	 * Starts the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param sessionId
	 *            The sessionId of the session you want to start recording
	 *
	 * @return The started recording. If this method successfully returns the
	 *         Recording object it means that the recording can be stopped with
	 *         guarantees
	 * 
	 * @throws OpenViduJavaClientException
	 */
	public Recording startRecording(String sessionId) throws OpenViduJavaClientException {
		return this.startRecording(sessionId, "");
	}

	/**
	 * Stops the recording of a {@link io.openvidu.java.client.Session}
	 *
	 * @param recordingId
	 *            The id property of the recording you want to stop
	 *
	 * @return The stopped recording
	 * 
	 * @throws OpenViduJavaClientException
	 */
	public Recording stopRecording(String recordingId) throws OpenViduJavaClientException {
		HttpPost request = new HttpPost(
				this.urlOpenViduServer + API_RECORDINGS + API_RECORDINGS_STOP + "/" + recordingId);
		HttpResponse response;
		try {
			response = myHttpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
			return new Recording(httpResponseToJson(response));
		} else {
			throw new OpenViduJavaClientException("Unexpected response from OpenVidu Server: " + statusCode);
		}
	}

	/**
	 * Gets an existing recording
	 *
	 * @param recordingId
	 *            The id property of the recording you want to retrieve
	 * 
	 * @throws OpenViduJavaClientException
	 */
	public Recording getRecording(String recordingId) throws OpenViduJavaClientException {
		HttpGet request = new HttpGet(this.urlOpenViduServer + API_RECORDINGS + "/" + recordingId);
		HttpResponse response;
		try {
			response = myHttpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
			return new Recording(httpResponseToJson(response));
		} else {
			throw new OpenViduJavaClientException("Unexpected response from OpenVidu Server: " + statusCode);
		}
	}

	/**
	 * Lists all existing recordings
	 *
	 * @return A {@link java.util.List} with all existing recordings
	 * 
	 * @throws OpenViduJavaClientException
	 */
	@SuppressWarnings("unchecked")
	public List<Recording> listRecordings() throws OpenViduJavaClientException {
		HttpGet request = new HttpGet(this.urlOpenViduServer + API_RECORDINGS);
		HttpResponse response;
		try {
			response = myHttpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
			List<Recording> recordings = new ArrayList<>();
			JSONObject json = httpResponseToJson(response);
			JSONArray array = (JSONArray) json.get("items");
			array.forEach(item -> {
				recordings.add(new Recording((JSONObject) item));
			});
			return recordings;
		} else {
			throw new OpenViduJavaClientException("Unexpected response from OpenVidu Server: " + statusCode);
		}
	}

	/**
	 * Deletes a recording. The recording must have status
	 * {@link io.openvidu.java.client.Recording.Status#stopped} or
	 * {@link io.openvidu.java.client.Recording.Status#available}
	 *
	 * @param recordingId
	 * 
	 * @throws OpenViduJavaClientException
	 */
	public void deleteRecording(String recordingId) throws OpenViduJavaClientException {
		HttpDelete request = new HttpDelete(this.urlOpenViduServer + API_RECORDINGS + "/" + recordingId);
		HttpResponse response;
		try {
			response = myHttpClient.execute(request);
		} catch (IOException e) {
			throw new OpenViduJavaClientException(e.getMessage(), e.getCause());
		}

		int statusCode = response.getStatusLine().getStatusCode();
		if (!(statusCode == org.apache.http.HttpStatus.SC_NO_CONTENT)) {
			throw new OpenViduJavaClientException("Unexpected response from OpenVidu Server: " + statusCode);
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

}
