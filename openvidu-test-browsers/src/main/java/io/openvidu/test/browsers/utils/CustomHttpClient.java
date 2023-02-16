/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublisher;
import java.net.http.HttpResponse;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Map.Entry;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedTrustManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSyntaxException;

public class CustomHttpClient {

	private static final Logger log = LoggerFactory.getLogger(CustomHttpClient.class);

	private String openviduUrl;
	private String headerAuth;
	private HttpClient client;

	public CustomHttpClient(String url) throws Exception {
		this(url, null, null);
	}

	public CustomHttpClient(String url, String user, String pass) throws Exception {
		this.openviduUrl = url.replaceFirst("/*$", "");

		if (user != null && pass != null) {
			this.headerAuth = "Basic " + Base64.getEncoder().encodeToString((user + ":" + pass).getBytes());
		}

		SSLContext sslContext;
		try {
			sslContext = SSLContext.getInstance("TLS");
			sslContext.init(null, new TrustManager[] { new X509ExtendedTrustManager() {
				public X509Certificate[] getAcceptedIssuers() {
					return null;
				}

				public void checkClientTrusted(final X509Certificate[] a_certificates, final String a_auth_type) {
				}

				public void checkServerTrusted(final X509Certificate[] a_certificates, final String a_auth_type) {
				}

				public void checkClientTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final Socket a_socket) {
				}

				public void checkServerTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final Socket a_socket) {
				}

				public void checkClientTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final SSLEngine a_engine) {
				}

				public void checkServerTrusted(final X509Certificate[] a_certificates, final String a_auth_type,
						final SSLEngine a_engine) {
				}
			} }, null);
		} catch (KeyManagementException | NoSuchAlgorithmException e) {
			throw new RuntimeException(e);
		}

		this.client = HttpClient.newBuilder().sslContext(sslContext).build();
	}

	public int getAndReturnStatus(String path, String credentials) throws Exception {
		path = openviduUrl + (path.startsWith("/") ? path : ("/" + path));
		return client
				.send(HttpRequest.newBuilder().GET().uri(new URI(path)).build(), HttpResponse.BodyHandlers.ofString())
				.statusCode();
	}

	public JsonObject rest(HttpMethod method, String path, int status) throws Exception {
		return this.commonRest(method, path, null, status);
	}

	public JsonObject rest(HttpMethod method, String path, String body, int status) throws Exception {
		return this.commonRest(method, path, body, status);
	}

	public String restString(HttpMethod method, String path, String body, int status) throws Exception {
		return this.commonRestString(method, path, body, status);
	}

	/**
	 * "matchKeys" to true for the returned JSON to have the exact same keys as the
	 * expected JSON (same number, position and name). If false, then any key
	 * existing in the expected JSON must exist in the returned JSON, but the
	 * returned JSON may have extra keys not available in expected JSON.
	 * 
	 * "matchValues" to true for the returned JSON to have the exact same value in
	 * all the key-value pairs declared in the expected JSON. If the returned JSON
	 * does not have any of the keys of the expected JSON, an Error is thrown. The
	 * value comparison applies to NULL, JSON arrays, JSON objects or primitive
	 * values, at all nested levels.
	 * 
	 * "matchArrays" to true for the returned JSON to have the exact same JSON array
	 * as value that any array property of the expected JSON. That includes value
	 * and order. To false to check only that JSON array is the type of the returned
	 * value, but not to check its content. If "matchValues" is false, then this
	 * property will not have effect and shall be considered false.
	 */
	public JsonObject rest(HttpMethod method, String path, String body, int status, boolean matchKeys,
			boolean matchValues, boolean matchArrays, String jsonReturnedValue) throws Exception {
		JsonObject jsonExpected = null;
		jsonReturnedValue = jsonReturnedValue.replaceAll("'", "\"");
		try {
			jsonExpected = JsonParser.parseString(jsonReturnedValue).getAsJsonObject();
		} catch (JsonSyntaxException e1) {
			throw new Exception("Expected JSON element is a string without a JSON format: " + jsonReturnedValue);
		}
		JsonObject jsonActual = this.commonRest(method, path, body, status);
		check(jsonExpected, jsonActual, matchKeys, matchValues, matchArrays);
		return jsonActual;

	}

	public static void check(JsonObject jsonExpected, JsonObject jsonActual, boolean matchKeys, boolean matchValues,
			boolean matchArrays) throws Exception {
		if (matchKeys) {
			checkSameKeys(jsonExpected, jsonActual, null, matchValues, matchArrays);
		} else {
			for (String key : jsonExpected.keySet()) {
				JsonElement elExpected = jsonExpected.get(key);
				JsonElement elActual = jsonActual.get(key);
				if (elActual == null) {
					throw new Exception(
							"Expected property \"" + key + "\" did not exist in actual JSON " + jsonActual.toString());
				}
				checkSameType(elExpected, elActual, key, matchValues);
			}
		}
	}

	public static void checkSameKeys(JsonElement expected, JsonElement actual, String parent, boolean matchValues,
			boolean matchArrays) throws Exception {
		if (!expected.isJsonObject()) {
			if (expected.isJsonArray()) {
				JsonArray expectedArray = expected.getAsJsonArray();
				JsonArray actualArray = actual.getAsJsonArray();
				if (matchArrays) {
					checkSameType(expectedArray, actualArray, parent, matchValues);
				}
			} else {
				checkSameType(expected, actual, parent, matchValues);
			}
		} else {
			JsonObject exp = expected.getAsJsonObject();
			JsonObject act = actual.getAsJsonObject();
			if (exp.size() != act.size()) {
				throw new Exception("Error in number of keys in JSON object. Expected " + exp.size() + ". Actual: "
						+ act.size() + ". Actual object: " + act.toString());
			}
			for (Entry<String, JsonElement> entry : exp.entrySet()) {
				String key = entry.getKey();
				if (!act.has(key)) {
					throw new Exception("Property \"" + key + "\" is missing in actual object " + act.toString());
				}
				checkSameKeys(entry.getValue(), act.get(key), key, matchValues, matchArrays);
			}
		}
	}

	public static void checkSameType(JsonElement expected, JsonElement actual, String key, boolean checkAlsoSameValue)
			throws Exception {
		if (!expected.getClass().equals(actual.getClass())) {
			throw new Exception("Expected JSON element \"" + key
					+ "\" has not the same class as the actual JSON element. Expected: "
					+ expected.getClass().getSimpleName() + ". Actual: " + actual.getClass().getSimpleName());
		}
		if (expected.isJsonNull()) {
			if (!actual.isJsonNull()) {
				throw new Exception("Actual JSON element should be null");
			}
		}
		if (expected.isJsonArray()) {
			if (!actual.isJsonArray()) {
				throw new Exception("Actual JSON element should be a JSON array");
			}
			JsonArray arrayExpected = expected.getAsJsonArray();
			JsonArray arrayActual = actual.getAsJsonArray();
			if (checkAlsoSameValue && !arrayExpected.equals(arrayActual)) {
				throw new Exception("Property \"" + key + "\" expected an array " + arrayExpected.toString()
						+ " but found " + arrayActual.toString());
			}
		}
		if (expected.isJsonObject()) {
			if (!actual.isJsonObject()) {
				throw new Exception("Actual JSON element should be a JSON object");
			}
			JsonObject objectExpected = expected.getAsJsonObject();
			JsonObject objectActual = actual.getAsJsonObject();
			if (checkAlsoSameValue && !objectExpected.equals(objectActual)) {
				throw new Exception("Property \"" + key + "\" expected a JSON object " + objectExpected.toString()
						+ " but found " + objectActual.toString());
			}
		}
		if (expected.isJsonPrimitive()) {
			JsonPrimitive primitive1 = expected.getAsJsonPrimitive();
			JsonPrimitive primitive2 = actual.getAsJsonPrimitive();
			if (primitive1.isString()) {
				String string1 = primitive1.getAsString();
				String string2 = primitive2.getAsString();
				if (checkAlsoSameValue && !string1.equals(string2)) {
					throw new Exception("Property \"" + key + "\" expected " + string1 + " but was " + string2);
				}
			}
			if (primitive1.isBoolean()) {
				boolean boolean1 = primitive1.getAsBoolean();
				boolean boolean2 = primitive2.getAsBoolean();
				if (checkAlsoSameValue && !boolean1 == boolean2) {
					throw new Exception("Property \"" + key + "\" expected " + boolean1 + " but was " + boolean2);
				}
			}
			if (primitive1.isNumber()) {
				Number number1 = primitive1.getAsNumber();
				Number number2 = primitive2.getAsNumber();
				if (checkAlsoSameValue && !number1.equals(number2)) {
					throw new Exception("Property \"" + key + "\" expected " + number1 + " but was " + number2);
				}
			}
		}
	}

	private JsonObject commonRest(HttpMethod method, String path, String body, int status) throws Exception {
		String stringResponse = this.commonRestString(method, path, body, status);
		if (stringResponse == null) {
			return null;
		}
		JsonElement jsonElement = null;
		try {
			jsonElement = JsonParser.parseString(stringResponse);
		} catch (JsonParseException e) {
			System.out.println("Response is not a JSON element: " + stringResponse);
		}
		JsonObject json = null;
		if (jsonElement != null) {
			try {
				json = jsonElement.getAsJsonObject();
			} catch (IllegalStateException e) {
				System.out.println("Response is not a JSON object: " + stringResponse);
			}
		}
		return json;
	}

	public String commonRestString(HttpMethod method, String path, String body, int status) throws Exception {
		path = openviduUrl + (path.startsWith("/") ? path : ("/" + path));

		HttpRequest.Builder builder = HttpRequest.newBuilder().uri(new URI(path));
		if (body != null && !body.isEmpty()) {
			body = body.replaceAll("'", "\"");
			BodyPublisher bodyPublisher = HttpRequest.BodyPublishers.ofString(body);
			switch (method) {
			case POST:
				builder = builder.POST(bodyPublisher);
				break;
			case PUT:
				builder = builder.PUT(bodyPublisher);
				break;
			case PATCH:
			default:
				builder = builder.method("PATCH", bodyPublisher);
				break;
			}
			builder.setHeader("Content-Type", "application/json");
		} else {
			switch (method) {
			case GET:
				builder = builder.GET();
				builder.setHeader("Content-Type", "application/x-www-form-urlencoded");
				break;
			case POST:
				builder = builder.POST(HttpRequest.BodyPublishers.noBody());
				break;
			case DELETE:
				builder = builder.DELETE();
				builder.setHeader("Content-Type", "application/x-www-form-urlencoded");
				break;
			case PUT:
				builder = builder.PUT(HttpRequest.BodyPublishers.noBody());
			default:
				break;
			}
		}

		if (this.headerAuth != null) {
			builder.setHeader("Authorization", this.headerAuth);
		}
		HttpResponse<String> response;
		try {
			response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
		} catch (Exception e) {
			throw new Exception("Error sending request to " + path + ": " + e.getMessage());
		}

		if (response.statusCode() == 500) {
			log.error("Internal Server Error: {}", response.body());
		}

		if (status != response.statusCode()) {
			try {
				System.err.println(response.body());
			} catch (Exception e) {
			}
			throw new Exception(path + " expected to return status " + status + " but got " + response.statusCode());
		}

		return response.body();
	}

}
