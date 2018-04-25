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

import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import io.openvidu.java.client.OpenViduException.Code;

public class Session {

	private HttpClient httpClient;
	private String urlOpenViduServer;
	private String sessionId;
	private SessionProperties properties;

	final static String API_SESSIONS = "api/sessions";
	final static String API_TOKENS = "api/tokens";

	protected Session(HttpClient httpClient, String urlOpenViduServer) throws OpenViduException {
		this.httpClient = httpClient;
		this.urlOpenViduServer = urlOpenViduServer;
		this.properties = new SessionProperties();
		this.sessionId = this.getSessionId();
	}

	protected Session(HttpClient httpClient, String urlOpenViduServer, SessionProperties properties) {
		this.httpClient = httpClient;
		this.urlOpenViduServer = urlOpenViduServer;
		this.properties = properties;
		this.sessionId = this.getSessionId();
	}

	/**
	 * Gets the unique identifier of the Session. This translates into a new request
	 * to OpenVidu Server if this Session has no <code>sessionId</code> yet or
	 * simply returns the existing value if it has already been retrieved
	 *
	 * @return The sessionId
	 */
	@SuppressWarnings("unchecked")
	public String getSessionId() throws OpenViduException {

		if (this.hasSessionId()) {
			return this.sessionId;
		}

		try {
			HttpPost request = new HttpPost(this.urlOpenViduServer + API_SESSIONS);

			JSONObject json = new JSONObject();
			json.put("mediaMode", properties.mediaMode().name());
			json.put("recordingMode", properties.recordingMode().name());
			json.put("defaultRecordingLayout", properties.defaultRecordingLayout().name());
			json.put("defaultCustomLayout", properties.defaultCustomLayout());
			StringEntity params = new StringEntity(json.toString());

			request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
			request.setEntity(params);

			HttpResponse response = httpClient.execute(request);
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				System.out.println("Returning a SESSIONID");
				String id = "";
				id = (String) httpResponseToJson(response).get("id");
				this.sessionId = id;
				return id;
			} else {
				throw new OpenViduException(Code.SESSIONID_CANNOT_BE_CREATED_ERROR_CODE, Integer.toString(statusCode));
			}
		} catch (Exception e) {
			throw new OpenViduException(Code.SESSIONID_CANNOT_BE_CREATED_ERROR_CODE,
					"Unable to generate a sessionId: " + e.getMessage());
		}

	}

	/**
	 * Gets a new token associated to Session object with default values for
	 * {@link io.openvidu.java.client.TokenOptions}. This always translates into a
	 * new request to OpenVidu Server
	 *
	 * @returns The generated token
	 */
	public String generateToken() throws OpenViduException {
		return this.generateToken(new TokenOptions.Builder().role(OpenViduRole.PUBLISHER).build());
	}

	/**
	 * Gets a new token associated to Session object configured with
	 * <code>tokenOptions</code>. This always translates into a new request to
	 * OpenVidu Server
	 *
	 * @returns The generated token
	 */
	@SuppressWarnings("unchecked")
	public String generateToken(TokenOptions tokenOptions) throws OpenViduException {

		if (!this.hasSessionId()) {
			this.getSessionId();
		}

		try {
			HttpPost request = new HttpPost(this.urlOpenViduServer + API_TOKENS);

			JSONObject json = new JSONObject();
			json.put("session", this.sessionId);
			json.put("role", tokenOptions.getRole().name());
			json.put("data", tokenOptions.getData());
			StringEntity params = new StringEntity(json.toString());

			request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
			request.setEntity(params);

			HttpResponse response = httpClient.execute(request);

			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				System.out.println("Returning a TOKEN");
				return (String) httpResponseToJson(response).get("id");
			} else {
				throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE, Integer.toString(statusCode));
			}

		} catch (Exception e) {
			throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE,
					"Unable to generate a token: " + e.getMessage());
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

	private JSONObject httpResponseToJson(HttpResponse response) throws ParseException, IOException {
		JSONParser parser = new JSONParser();
		return (JSONObject) parser.parse(EntityUtils.toString(response.getEntity()));
	}

}
