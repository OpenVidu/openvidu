package io.openvidu.server.rest;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClientBuilder;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class NgrokRestController {

	private final String NGROK_URL = "http://localhost:4040/api/tunnels";
	private final String NGROK_APP_NAME = "app";
	private final String NGROK_SERVER_NAME = "server";

	private String appUrl = "";
	private String serverUrl = "";
	private JsonObject json;

	HttpClient client = HttpClientBuilder.create().build();

	public String getNgrokAppUrl() throws ClientProtocolException, IOException {

		if (this.appUrl != null && !this.appUrl.isEmpty()) {
			return this.appUrl;
		}

		if (this.json == null) {
			this.json = this.httpRequest();
		}
		
		String appPublicUrl = "";
		
		JsonArray array = this.json.getAsJsonArray("tunnels");
		for (JsonElement el : array) {
			JsonObject elObj = el.getAsJsonObject();
			String name = elObj.get("name").getAsString();
			if (name.equals(NGROK_APP_NAME)) {
				appPublicUrl = elObj.get("public_url").getAsString();
				appPublicUrl = appPublicUrl.replaceFirst("http://", "https://");
				break;
			}
		}

		this.appUrl = appPublicUrl;

		return appPublicUrl;
	}

	public String getNgrokServerUrl() throws ClientProtocolException, IOException {

		if (this.serverUrl != null && !this.serverUrl.isEmpty()) {
			return this.serverUrl;
		}

		if (this.json == null) {
			this.json = this.httpRequest();
		}

		String serverPublicUrl = "";
		
		JsonArray array = this.json.getAsJsonArray("tunnels");
		for (JsonElement el : array) {
			JsonObject elObj = el.getAsJsonObject();
			String name = elObj.get("name").getAsString();
			if (name.equals(NGROK_SERVER_NAME)) {
				serverPublicUrl = elObj.get("public_url").getAsString();
				serverPublicUrl = serverPublicUrl.replaceFirst("http://", "https://");
				break;
			}
		}

		this.serverUrl = serverPublicUrl;

		return serverPublicUrl;
	}

	private JsonObject httpRequest() throws ClientProtocolException, IOException {

		HttpClient client = HttpClientBuilder.create().build();

		HttpGet request = new HttpGet(NGROK_URL);
		HttpResponse response = client.execute(request);
		BufferedReader rd = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));

		StringBuffer result = new StringBuffer();
		String line = "";
		while ((line = rd.readLine()) != null) {
			result.append(line);
		}

		JsonObject responseJson = (JsonObject) new JsonParser().parse(result.toString());

		return responseJson;
	}

}
