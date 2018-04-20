package io.openvidu.java.client;

import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.json.simple.JSONObject;

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

	@SuppressWarnings("unchecked")
	public String getSessionId() throws OpenViduException {

		if (this.hasSessionId()) {
			return this.sessionId;
		}

		try {
			HttpPost request = new HttpPost(this.urlOpenViduServer + API_SESSIONS);
			
			JSONObject json = new JSONObject();
			json.put("defaultRecordingLayout", properties.defaultRecordingLayout().name());
			json.put("recordingMode", properties.recordingMode().name());
			json.put("mediaMode", properties.mediaMode().name());
			StringEntity params = new StringEntity(json.toString());
			
			request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
			request.setEntity(params);
			
			HttpResponse response = httpClient.execute(request);
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				System.out.println("Returning a SESSIONID");
				String id = "";
				id = (String) OpenVidu.httpResponseToJson(response).get("id");
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

	public String generateToken() throws OpenViduException {
		return this.generateToken(new TokenOptions.Builder().role(OpenViduRole.PUBLISHER).build());
	}

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
				return (String) OpenVidu.httpResponseToJson(response).get("id");
			} else {
				throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE, Integer.toString(statusCode));
			}

		} catch (Exception e) {
			throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE,
					"Unable to generate a token: " + e.getMessage());
		}
	}

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

}
