/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

package io.openvidu.test.e2e.utils;

import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Map;
import java.util.Map.Entry;

import javax.net.ssl.SSLContext;

import org.apache.http.HttpStatus;
import org.apache.http.client.HttpClient;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Assert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.mashape.unirest.http.HttpMethod;
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.JsonNode;
import com.mashape.unirest.http.Unirest;
import com.mashape.unirest.http.exceptions.UnirestException;
import com.mashape.unirest.request.HttpRequest;
import com.mashape.unirest.request.HttpRequestWithBody;

public class CustomHttpClient {

	private static final Logger log = LoggerFactory.getLogger(CustomHttpClient.class);

	private String openviduUrl;
	private String headerAuth;

	public CustomHttpClient(String openviduUrl, String openviduSecret) {
		this.openviduUrl = openviduUrl.replaceFirst("/*$", "");
		this.headerAuth = "Basic " + Base64.getEncoder().encodeToString(("OPENVIDUAPP:" + openviduSecret).getBytes());

		SSLContext sslContext = null;
		try {
			sslContext = new SSLContextBuilder().loadTrustMaterial(null, new TrustSelfSignedStrategy() {
				public boolean isTrusted(X509Certificate[] chain, String authType) throws CertificateException {
					return true;
				}
			}).build();
		} catch (KeyManagementException | NoSuchAlgorithmException | KeyStoreException e) {
			Assert.fail("Error building custom HttpClient: " + e.getMessage());
		}
		HttpClient unsafeHttpClient = HttpClients.custom().setSSLContext(sslContext)
				.setSSLHostnameVerifier(new NoopHostnameVerifier()).build();
		Unirest.setHttpClient(unsafeHttpClient);
	}

	public void testAuthorizationError() {
		try {
			String wrongCredentials = "Basic "
					+ Base64.getEncoder().encodeToString(("OPENVIDUAPP:WRONG_SECRET").getBytes());
			Assert.assertEquals("Expected 401 status (unauthorized)", HttpStatus.SC_UNAUTHORIZED, Unirest
					.get(openviduUrl + "/config").header("Authorization", wrongCredentials).asJson().getStatus());
		} catch (UnirestException e) {
			Assert.fail("Error testing UNAUTHORIZED rest method: " + e.getMessage());
		}
	}

	public JSONObject rest(HttpMethod method, String path, int status) {
		return this.commonRest(method, path, null, status);
	}

	public JSONObject rest(HttpMethod method, String path, String body, int status) {
		return this.commonRest(method, path, body, status);
	}

	public JSONObject rest(HttpMethod method, String path, String body, int status, boolean exactReturnedFields,
			String jsonReturnedValue) {
		JSONObject json = this.commonRest(method, path, body, status);
		JSONObject jsonObjExpected = null;
		jsonReturnedValue.replaceAll("'", "\"");
		try {
			jsonObjExpected = new JSONObject((String) jsonReturnedValue);
		} catch (JSONException e1) {
			Assert.fail("Expected json element is a string without a JSON format: " + jsonReturnedValue);
		}

		if (exactReturnedFields) {
			Assert.assertEquals("Error in number of keys in JSON response to POST (" + json.toString() + ")" + path, jsonObjExpected.length(),
					json.length());
		}
		for (String key : jsonObjExpected.keySet()) {
			json.get(key);
		}
		return json;
	}

	public JSONObject rest(HttpMethod method, String path, String body, int status, boolean exactReturnedFields,
			Map<String, ?> jsonResponse) {
		org.json.JSONObject json = this.commonRest(method, path, body, status);

		if (exactReturnedFields) {
			Assert.assertEquals("Error in number of keys in JSON response to POST " + path, jsonResponse.size(),
					json.length());
		}

		for (Entry<String, ?> entry : jsonResponse.entrySet()) {
			Object value = entry.getValue();

			if (value instanceof String) {
				try {
					JSONObject jsonObjExpected = new JSONObject((String) value);
					JSONObject jsonObjActual = json.getJSONObject(entry.getKey());
					// COMPARE

				} catch (JSONException e1) {
					try {
						JSONArray jsonArrayExpected = new JSONArray((String) value);
						JSONArray jsonArrayActual = json.getJSONArray(entry.getKey());
						// COMPARE

					} catch (JSONException e2) {
						Assert.assertEquals("JSON field " + entry.getKey() + " has not expected value", (String) value,
								json.getInt(entry.getKey()));
					}
				}
			} else if (value instanceof Integer) {
				Assert.assertEquals("JSON field " + entry.getKey() + " has not expected value", (int) value,
						json.getInt(entry.getKey()));
			} else if (value instanceof Long) {
				Assert.assertEquals("JSON field " + entry.getKey() + " has not expected value", (long) value,
						json.getLong(entry.getKey()));
			} else if (value instanceof Double) {
				Assert.assertEquals("JSON field " + entry.getKey() + " has not expected value", (double) value,
						json.getDouble(entry.getKey()), 0.001);
			} else if (value instanceof Boolean) {
				Assert.assertEquals("JSON field " + entry.getKey() + " has not expected value", (boolean) value,
						json.getBoolean(entry.getKey()));
			} else if (value instanceof JSONArray) {
				json.getJSONArray(entry.getKey());
			} else if (value instanceof JSONObject) {
				json.getJSONObject(entry.getKey());
			} else {
				Assert.fail("JSON response field cannot be parsed: " + entry.toString());
			}
		}
		return json;
	}

	private org.json.JSONObject commonRest(HttpMethod method, String path, String body, int status) {
		HttpResponse<JsonNode> jsonResponse = null;
		org.json.JSONObject json = null;
		path = openviduUrl + (path.startsWith("/") ? path : ("/" + path));

		HttpRequest request = null;
		if (body != null && !body.isEmpty()) {
			switch (method) {
			case POST:
				request = Unirest.post(path);
				break;
			case PUT:
				request = Unirest.put(path);
				break;
			default:
				break;
			}
			((HttpRequestWithBody) request).header("Content-Type", "application/json").body(body.replaceAll("'", "\""));
		} else {
			switch (method) {
			case GET:
				request = Unirest.get(path);
				break;
			case POST:
				request = Unirest.post(path);
				break;
			case DELETE:
				request = Unirest.delete(path);
				break;
			default:
				break;
			}
			request.header("Content-Type", "application/x-www-form-urlencoded");
		}
		try {
			jsonResponse = request.header("Authorization", this.headerAuth).asJson();
			if (jsonResponse.getBody() != null) {
				json = jsonResponse.getBody().getObject();
			}
		} catch (UnirestException e) {
			log.error(e.getMessage());
			Assert.fail("Error sending request to " + path + ": " + e.getMessage());
		}
		if (jsonResponse.getStatus() == 500) {
			log.error("Internal Server Error: {}", jsonResponse.getBody().toString());
		}
		Assert.assertEquals(path + " expected to return status " + status, status, jsonResponse.getStatus());
		return json;
	}
}
