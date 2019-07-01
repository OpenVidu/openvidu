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

package io.openvidu.server.webhook;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.SSLContext;

import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.message.BasicHeader;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.ssl.TrustStrategy;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

import io.openvidu.server.cdr.CDREvent;
import io.openvidu.server.cdr.CDREventName;

public class HttpWebhookSender {

	private static final Logger log = LoggerFactory.getLogger(HttpWebhookSender.class);

	private HttpClient httpClient;
	private String httpEndpoint;
	private List<Header> customHeaders;
	private List<CDREventName> events;

	public HttpWebhookSender(String httpEndpoint, List<Header> headers, List<CDREventName> events) {
		this.httpEndpoint = httpEndpoint;
		this.events = events;

		this.customHeaders = new ArrayList<>();
		boolean contentTypeHeaderAdded = false;
		for (Header header : headers) {
			this.customHeaders.add(header);
			if (!contentTypeHeaderAdded && HttpHeaders.CONTENT_TYPE.equals(header.getName())
					&& "application/json".equals(header.getValue())) {
				contentTypeHeaderAdded = true;
			}
		}
		if (!contentTypeHeaderAdded) {
			this.customHeaders.add(new BasicHeader(HttpHeaders.CONTENT_TYPE, "application/json"));
		}

		TrustStrategy trustStrategy = new TrustStrategy() {
			@Override
			public boolean isTrusted(X509Certificate[] chain, String authType) throws CertificateException {
				return true;
			}
		};

		SSLContext sslContext;

		try {
			sslContext = new SSLContextBuilder().loadTrustMaterial(null, trustStrategy).build();
		} catch (KeyManagementException | NoSuchAlgorithmException | KeyStoreException e) {
			throw new RuntimeException(e);
		}

		RequestConfig.Builder requestBuilder = RequestConfig.custom();
		requestBuilder = requestBuilder.setConnectTimeout(30000);
		requestBuilder = requestBuilder.setConnectionRequestTimeout(30000);

		this.httpClient = HttpClientBuilder.create().setDefaultRequestConfig(requestBuilder.build())
				.setConnectionTimeToLive(30, TimeUnit.SECONDS).setSSLHostnameVerifier(NoopHostnameVerifier.INSTANCE)
				.setSSLContext(sslContext).build();
	}

	/**
	 * @throws IOException If: A) The HTTP connection cannot be established to the
	 *                     endpoint B) The response received from the endpoint is
	 *                     not 200
	 */
	public void sendHttpPostCallback(CDREvent event) throws IOException {

		if (!this.events.contains(event.getEventName())) {
			return;
		}

		HttpPost request = new HttpPost(httpEndpoint);

		StringEntity params = null;
		try {
			JsonObject jsonEvent = event.toJson();
			jsonEvent.addProperty("event", event.getEventName().name());
			params = new StringEntity(jsonEvent.toString());
		} catch (UnsupportedEncodingException e) {
			log.error("Cannot create StringEntity from JSON CDREvent. Default HTTP charset is not supported");
		}

		for (Header header : this.customHeaders) {
			request.setHeader(header);
		}
		request.setEntity(params);

		HttpResponse response = null;
		try {
			response = this.httpClient.execute(request);
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK)) {
				log.info("Event {} successfully posted to uri {}", event.getEventName().name(), this.httpEndpoint);
			} else {
				log.error("Unexpected HTTP status from callback endpoint {}: expected 200, received {}", httpEndpoint,
						statusCode);
				throw new IOException("Unexpected HTTP status " + statusCode);
			}
		} catch (ClientProtocolException e) {
			String message = "ClientProtocolException posting event [" + event.getEventName().name() + "] to endpoint "
					+ httpEndpoint + ": " + e.getMessage();
			log.error(message);
			throw new ClientProtocolException(message);
		} catch (IOException e) {
			String message = "IOException posting event [" + event.getEventName().name() + "] to endpoint "
					+ httpEndpoint + ": " + e.getMessage();
			log.error(message);
			throw new IOException(message);
		} finally {
			if (response != null) {
				EntityUtils.consumeQuietly(response.getEntity());
			}
		}
	}

}
