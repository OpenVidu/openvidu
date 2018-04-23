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

import io.openvidu.java.client.OpenViduException.Code;

public class OpenVidu {

	private String urlOpenViduServer;
	private String secret;
	private HttpClient myHttpClient;

	final static String API_RECORDINGS = "api/recordings";
	final static String API_RECORDINGS_START = "/start";
	final static String API_RECORDINGS_STOP = "/stop";

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

	public Session createSession() throws OpenViduException {
		Session s = new Session(myHttpClient, urlOpenViduServer);
		return s;
	}

	public Session createSession(SessionProperties properties) throws OpenViduException {
		Session s = new Session(myHttpClient, urlOpenViduServer, properties);
		return s;
	}

	@SuppressWarnings("unchecked")
	public Recording startRecording(String sessionId, RecordingProperties properties) throws OpenViduException {
		try {
			HttpPost request = new HttpPost(this.urlOpenViduServer + API_RECORDINGS + API_RECORDINGS_START);

			JSONObject json = new JSONObject();
			json.put("session", sessionId);
			json.put("name", properties.name());
			json.put("recordingLayout",
					(properties.recordingLayout() != null) ? properties.recordingLayout().name() : "");
			json.put("customLayout",
					(properties.customLayout() != null) ? properties.customLayout() : "");
			StringEntity params = new StringEntity(json.toString());

			request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
			request.setEntity(params);

			HttpResponse response = myHttpClient.execute(request);

			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				return new Recording(OpenVidu.httpResponseToJson(response));
			} else {
				throw new OpenViduException(Code.RECORDING_START_ERROR_CODE, Integer.toString(statusCode));
			}
		} catch (Exception e) {
			throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
					"Unable to start recording for session '" + sessionId + "': " + e.getMessage());
		}
	}

	public Recording startRecording(String sessionId, String name) throws OpenViduException {
		if (name == null) {
			name = "";
		}
		return this.startRecording(sessionId, new RecordingProperties.Builder().name(name).build());
	}

	public Recording startRecording(String sessionId) throws OpenViduException {
		return this.startRecording(sessionId, "");
	}

	public Recording stopRecording(String recordingId) throws OpenViduException {
		try {
			HttpPost request = new HttpPost(
					this.urlOpenViduServer + API_RECORDINGS + API_RECORDINGS_STOP + "/" + recordingId);
			HttpResponse response = myHttpClient.execute(request);

			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				return new Recording(OpenVidu.httpResponseToJson(response));
			} else {
				throw new OpenViduException(Code.RECORDING_STOP_ERROR_CODE, Integer.toString(statusCode));
			}
		} catch (Exception e) {
			throw new OpenViduException(Code.RECORDING_STOP_ERROR_CODE,
					"Unable to stop recording '" + recordingId + "': " + e.getMessage());
		}
	}

	public Recording getRecording(String recordingId) throws OpenViduException {
		try {
			HttpGet request = new HttpGet(this.urlOpenViduServer + API_RECORDINGS + "/" + recordingId);
			HttpResponse response = myHttpClient.execute(request);

			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				return new Recording(OpenVidu.httpResponseToJson(response));
			} else {
				throw new OpenViduException(Code.RECORDING_LIST_ERROR_CODE, Integer.toString(statusCode));
			}
		} catch (Exception e) {
			throw new OpenViduException(Code.RECORDING_LIST_ERROR_CODE,
					"Unable to get recording '" + recordingId + "': " + e.getMessage());
		}
	}

	@SuppressWarnings("unchecked")
	public List<Recording> listRecordings() throws OpenViduException {
		try {
			HttpGet request = new HttpGet(this.urlOpenViduServer + API_RECORDINGS);
			HttpResponse response = myHttpClient.execute(request);

			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				List<Recording> recordings = new ArrayList<>();
				JSONObject json = OpenVidu.httpResponseToJson(response);
				JSONArray array = (JSONArray) json.get("items");
				array.forEach(item -> {
					recordings.add(new Recording((JSONObject) item));
				});
				return recordings;
			} else {
				throw new OpenViduException(Code.RECORDING_LIST_ERROR_CODE, Integer.toString(statusCode));
			}
		} catch (Exception e) {
			throw new OpenViduException(Code.RECORDING_LIST_ERROR_CODE, "Unable to list recordings: " + e.getMessage());
		}
	}

	public void deleteRecording(String recordingId) throws OpenViduException {
		try {
			HttpDelete request = new HttpDelete(this.urlOpenViduServer + API_RECORDINGS + "/" + recordingId);
			HttpResponse response = myHttpClient.execute(request);

			int statusCode = response.getStatusLine().getStatusCode();
			if (!(statusCode == org.apache.http.HttpStatus.SC_NO_CONTENT)) {
				throw new OpenViduException(Code.RECORDING_DELETE_ERROR_CODE, Integer.toString(statusCode));
			}
		} catch (Exception e) {
			throw new OpenViduException(Code.RECORDING_DELETE_ERROR_CODE,
					"Unable to delete recording '" + recordingId + "': " + e.getMessage());
		}
	}

	public static JSONObject httpResponseToJson(HttpResponse response) throws ParseException, IOException {
		JSONParser parser = new JSONParser();
		return (JSONObject) parser.parse(EntityUtils.toString(response.getEntity()));
	}

}
