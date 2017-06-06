package io.openvidu.server.rest;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClientBuilder;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class NgrokController {

	private final String NGROK_URL = "http://localhost:4040/api/tunnels";

	HttpClient client = HttpClientBuilder.create().build();

	public String getNgrokPublicUrl() throws ClientProtocolException, IOException {
		HttpClient client = HttpClientBuilder.create().build();

		HttpGet request = new HttpGet(NGROK_URL);
		HttpResponse response = client.execute(request);
		BufferedReader rd = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));

		StringBuffer result = new StringBuffer();
		String line = "";
		while ((line = rd.readLine()) != null) {
			result.append(line);
		}
		JsonObject json = (JsonObject) new JsonParser().parse(result.toString());
		String publicUrl = json.getAsJsonArray("tunnels").get(0).getAsJsonObject().get("public_url").getAsString();
		publicUrl = publicUrl.replaceFirst("http://", "https://");
		
		return publicUrl;
	}

}
