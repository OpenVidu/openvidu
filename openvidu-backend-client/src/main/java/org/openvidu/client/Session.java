package org.openvidu.client;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.openvidu.client.OpenViduException.Code;

public class Session {
	
	private HttpClient httpClient;
	private String urlOpenViduServer;
	private String sessionId;
	
	protected Session(HttpClient httpClient, String urlOpenViduServer) throws OpenViduException {
    	this.httpClient = httpClient;
    	this.urlOpenViduServer = urlOpenViduServer;
		this.sessionId = this.getSessionId();
    }
	
	public String getSessionId() throws OpenViduException {
		
		if (this.hasSessionId()) {
			return this.sessionId;
		}

		try {
			HttpResponse response = httpClient.execute(new HttpGet(this.urlOpenViduServer + "getSessionId"));
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)){
				System.out.println("Returning a SESSIONID");
				String id = "";
				id = this.httpResponseToString(response);
				this.sessionId = id;
				return id;
			} else {
				throw new OpenViduException(Code.SESSIONID_CANNOT_BE_CREATED_ERROR_CODE, Integer.toString(statusCode));
			}
		} catch (Exception e) {
			throw new OpenViduException(Code.SESSIONID_CANNOT_BE_CREATED_ERROR_CODE, "Unable to generate a sessionID: " + e.getMessage());
		}
		
	}
	
	public String generateToken() throws OpenViduException {
		return this.generateToken(new TokenOptions.Builder().role(OpenViduRole.PUBLISHER).build());
	}
	
	public String generateToken(TokenOptions tokenOptions) throws OpenViduException {
		
		if (!this.hasSessionId()){
			this.getSessionId();
		}
		
		try {
			
			JSONObject json = new JSONObject();
			json.put(0, this.sessionId);
			json.put(1, tokenOptions.getRole().name());
			json.put(2, tokenOptions.getData());
			
			HttpPost request = 	new HttpPost(this.urlOpenViduServer + "newToken");
			StringEntity params = new StringEntity(json.toString());
			request.addHeader("content-type", "application/json");
		    request.setEntity(params);
			
			HttpResponse response = httpClient.execute(request);
			
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)){
				System.out.println("Returning a TOKEN");
				return this.httpResponseToString(response);
			} else {
				throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE, Integer.toString(statusCode));
			}
			
		} catch (Exception e) {
			throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE, "Unable to generate a token: " + e.getMessage());
		}
	}
	
	@Override
	public String toString() {
		return this.sessionId;
	}
	
	private String httpResponseToString(HttpResponse response) throws IOException, ParseException{
		BufferedReader rd = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
    	StringBuffer buf = new StringBuffer();
    	String line = "";
		while ((line = rd.readLine()) != null) {
		    buf.append(line);
		}
		JSONParser parser = new JSONParser();
		return ((String) ((JSONObject) parser.parse(buf.toString())).get("0"));
    }
	
	private boolean hasSessionId() {
		return (this.sessionId != null && !this.sessionId.isEmpty());
	}

}
