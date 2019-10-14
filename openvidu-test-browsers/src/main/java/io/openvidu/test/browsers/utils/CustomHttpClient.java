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

package io.openvidu.test.browsers.utils;

import java.io.IOException;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Map;

import javax.net.ssl.SSLContext;

import org.apache.http.client.HttpClient;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
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

	public CustomHttpClient(String url, String user, String pass) throws Exception {
		this.openviduUrl = url.replaceFirst("/*$", "");
		this.headerAuth = "Basic " + Base64.getEncoder().encodeToString((user + ":" + pass).getBytes());

		SSLContext sslContext = null;
		try {
			sslContext = new SSLContextBuilder().loadTrustMaterial(null, new TrustSelfSignedStrategy() {
				public boolean isTrusted(X509Certificate[] chain, String authType) throws CertificateException {
					return true;
				}
			}).build();
		} catch (KeyManagementException | NoSuchAlgorithmException | KeyStoreException e) {
			throw new Exception("Error building custom HttpClient: " + e.getMessage());
		}
		HttpClient unsafeHttpClient = HttpClients.custom().setSSLContext(sslContext)
				.setSSLHostnameVerifier(new NoopHostnameVerifier()).build();
		Unirest.setHttpClient(unsafeHttpClient);
	}

	public int getAndReturnStatus(String path, String credentials) throws Exception {
		path = openviduUrl + (path.startsWith("/") ? path : ("/" + path));
		return Unirest.get(path).header("Authorization", credentials).asJson().getStatus();
	}

	public JSONObject rest(HttpMethod method, String path, int status) throws Exception {
		return this.commonRest(method, path, null, status);
	}

	public JSONObject rest(HttpMethod method, String path, String body, int status) throws Exception {
		return this.commonRest(method, path, body, status);
	}

	public JSONObject rest(HttpMethod method, String path, String body, int status, boolean exactReturnedFields,
			String jsonReturnedValue) throws Exception {
		JSONObject json = this.commonRest(method, path, body, status);
		JSONObject jsonObjExpected = null;
		jsonReturnedValue.replaceAll("'", "\"");
		try {
			jsonObjExpected = new JSONObject(jsonReturnedValue);
		} catch (JSONException e1) {
			throw new Exception("Expected json element is a string without a JSON format: " + jsonReturnedValue);
		}

		if (exactReturnedFields) {
			if (jsonObjExpected.length() != json.length()) {
				throw new Exception(
						"Error in number of keys in JSON response to POST (" + json.toString() + ")" + path);
			}
		}
		for (String key : jsonObjExpected.keySet()) {
			Class<?> c1 = jsonObjExpected.get(key).getClass();
			Class<?> c2 = json.get(key).getClass();

			c1 = unifyNumberType(c1);
			c2 = unifyNumberType(c2);

			if (!c1.equals(c2)) {
				throw new Exception("Wrong class of property " + key);
			}
		}
		return json;
	}

	public JSONObject rest(HttpMethod method, String path, String body, int status, boolean exactReturnedFields,
			Map<String, ?> jsonResponse) throws Exception {
		org.json.JSONObject json = this.commonRest(method, path, body, status);

		if (exactReturnedFields) {
			if (jsonResponse.size() != json.length())
				throw new Exception("Error in number of keys in JSON response to POST " + path);
		}

		for (Map.Entry<String, ?> entry : jsonResponse.entrySet()) {
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
						if (((String) value) != json.getString(entry.getKey())) {
							throw new Exception("JSON field " + entry.getKey() + " has not expected value. Expected: "
									+ value + ". Actual: " + json.getString(entry.getKey()));
						}
					}
				}
			} else if (value instanceof Integer) {
				if (((int) value) != json.getInt(entry.getKey())) {
					throw new Exception("JSON field " + entry.getKey() + " has not expected value. Expected: " + value
							+ ". Actual: " + json.getInt(entry.getKey()));
				}
			} else if (value instanceof Long) {
				if (((long) value) != json.getLong(entry.getKey())) {
					throw new Exception("JSON field " + entry.getKey() + " has not expected value. Expected: " + value
							+ ". Actual: " + json.getLong(entry.getKey()));
				}
			} else if (value instanceof Double) {
				if (((double) value) != json.getDouble(entry.getKey())) {
					throw new Exception("JSON field " + entry.getKey() + " has not expected value. Expected: " + value
							+ ". Actual: " + json.getDouble(entry.getKey()));
				}
			} else if (value instanceof Boolean) {
				if (((boolean) value) != json.getBoolean(entry.getKey())) {
					throw new Exception("JSON field " + entry.getKey() + " has not expected value. Expected: " + value
							+ ". Actual: " + json.getBoolean(entry.getKey()));
				}
			} else if (value instanceof JSONArray) {
				json.getJSONArray(entry.getKey());
			} else if (value instanceof JSONObject) {
				json.getJSONObject(entry.getKey());
			} else {
				throw new Exception("JSON response field cannot be parsed: " + entry.toString());
			}
		}
		return json;
	}

	public void shutdown() throws IOException {
		Unirest.shutdown();
	}

	private org.json.JSONObject commonRest(HttpMethod method, String path, String body, int status) throws Exception {
		HttpResponse<?> jsonResponse = null;
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
			case PATCH:
			default:
				request = Unirest.patch(path);
				break;
			}
			((HttpRequestWithBody) request).header("Content-Type", "application/json").body(body.replaceAll("'", "\""));
		} else {
			switch (method) {
			case GET:
				request = Unirest.get(path);
				request.header("Content-Type", "application/x-www-form-urlencoded");
				break;
			case POST:
				request = Unirest.post(path);
				break;
			case DELETE:
				request = Unirest.delete(path);
				request.header("Content-Type", "application/x-www-form-urlencoded");
				break;
			default:
				break;
			}
		}

		request = request.header("Authorization", this.headerAuth);
		try {
			jsonResponse = request.asJson();
			if (jsonResponse.getBody() != null) {
				json = ((JsonNode) jsonResponse.getBody()).getObject();
			}
		} catch (UnirestException e) {
			try {
				if (e.getCause().getCause().getCause() instanceof org.json.JSONException) {
					try {
						jsonResponse = request.asString();
					} catch (UnirestException e1) {
						throw new Exception("Error sending request to " + path + ": " + e.getMessage());
					}
				} else {
					throw new Exception("Error sending request to " + path + ": " + e.getMessage());
				}
			} catch (NullPointerException e2) {
				throw new Exception("Error sending request to " + path + ": " + e.getMessage());
			}
		}

		if (jsonResponse.getStatus() == 500) {
			log.error("Internal Server Error: {}", jsonResponse.getBody().toString());
		}

		if (status != jsonResponse.getStatus()) {
			throw new Exception(path + " expected to return status " + status + " but got " + jsonResponse.getStatus());
		}

		return json;
	}

	private Class<?> unifyNumberType(Class<?> myClass) {
		if (Number.class.isAssignableFrom(myClass)) {
			return Number.class;
		}
		return myClass;
	}

}
