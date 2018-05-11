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

import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class Session {

	private HttpClient httpClient;
	private String urlOpenViduServer;
	private String sessionId;
	private SessionProperties properties;

	final static String API_SESSIONS = "api/sessions";
	final static String API_TOKENS = "api/tokens";

	protected Session(HttpClient httpClient, String urlOpenViduServer)
			throws OpenViduJavaClientException, OpenViduHttpException {
		this.httpClient = httpClient;
		this.urlOpenViduServer = urlOpenViduServer;
		this.properties = new SessionProperties();
		this.getSessionIdHttp();
	}

	protected Session(HttpClient httpClient, String urlOpenViduServer, SessionProperties properties)
			throws OpenViduJavaClientException, OpenViduHttpException {
		this.httpClient = httpClient;
		this.urlOpenViduServer = urlOpenViduServer;
		this.properties = properties;
		this.getSessionIdHttp();
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
	 * Gets a new token associated to Session object with default values for
	 * {@link io.openvidu.java.client.TokenOptions}. This always translates into a
	 * new request to OpenVidu Server
	 *
	 * @returns The generated token
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
	 * @returns The generated token
	 * 
	 * @throws OpenViduJavaClientException
	 * @throws OpenViduHttpException
	 */
	@SuppressWarnings("unchecked")
	public String generateToken(TokenOptions tokenOptions) throws OpenViduJavaClientException, OpenViduHttpException {

		if (!this.hasSessionId()) {
			this.getSessionId();
		}

		HttpPost request = new HttpPost(this.urlOpenViduServer + API_TOKENS);

		JSONObject json = new JSONObject();
		json.put("session", this.sessionId);
		json.put("role", tokenOptions.getRole().name());
		json.put("data", tokenOptions.getData());
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
			response = httpClient.execute(request);
		} catch (IOException e2) {
			throw new OpenViduJavaClientException(e2.getMessage(), e2.getCause());
		}

		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
			System.out.println("Returning a TOKEN");
			return (String) httpResponseToJson(response).get("id");
		} else {
			throw new OpenViduHttpException(statusCode);
		}
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

		HttpPost request = new HttpPost(this.urlOpenViduServer + API_SESSIONS);

		JSONObject json = new JSONObject();
		json.put("mediaMode", properties.mediaMode().name());
		json.put("recordingMode", properties.recordingMode().name());
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
			response = httpClient.execute(request);
		} catch (IOException e2) {
			throw new OpenViduJavaClientException(e2.getMessage(), e2.getCause());
		}
		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
			System.out.println("Returning a SESSIONID");
			String id = (String) httpResponseToJson(response).get("id");
			this.sessionId = id;
		} else {
			throw new OpenViduHttpException(statusCode);
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
