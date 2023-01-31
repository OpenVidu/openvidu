package io.openvidu.java.client.test;

import java.util.List;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.SSLContext;

import org.apache.hc.client5.http.auth.AuthCache;
import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.auth.BasicAuthCache;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.impl.auth.BasicScheme;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.impl.routing.DefaultProxyRoutePlanner;
import org.apache.hc.client5.http.io.HttpClientConnectionManager;
import org.apache.hc.client5.http.protocol.HttpClientContext;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactoryBuilder;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.message.BasicHeader;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import io.openvidu.java.client.OpenVidu;

public class OpenViduConstructorTest {

	@Test
	public void wrongHostname() {
		RuntimeException thrown = Assertions.assertThrows(RuntimeException.class, () -> {
			new OpenVidu("WRONG_URL", "MY_SECRET");
		});
		Assertions.assertEquals("The hostname \"WRONG_URL\" is not a valid URL: no protocol: WRONG_URL",
				thrown.getMessage());
	}

	@Test
	public void buildWithCustomHttpClient() {

		HttpClientBuilder builder = HttpClients.custom();

		// Custom header
		BasicHeader header = new BasicHeader(HttpHeaders.CONTENT_TYPE, "application/json");
		builder.setDefaultHeaders(List.of(header));

		// Custom request timeout
		RequestConfig requestConfig = RequestConfig.custom().setConnectionRequestTimeout(5, TimeUnit.SECONDS).build();
		builder.setDefaultRequestConfig(requestConfig);

		// Custom proxy to authenticate
		HttpHost proxy = new HttpHost("https://localhost/", 8090);
		DefaultProxyRoutePlanner routePlanner = new DefaultProxyRoutePlanner(proxy);

		BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
		credentialsProvider.setCredentials(new AuthScope(proxy),
				new UsernamePasswordCredentials("username_admin", "secret_password".toCharArray()));

		AuthCache authCache = new BasicAuthCache();
		BasicScheme basicAuth = new BasicScheme();
		authCache.put(proxy, basicAuth);
		HttpClientContext context = HttpClientContext.create();
		context.setCredentialsProvider(credentialsProvider);
		context.setAuthCache(authCache);

		builder.setRoutePlanner(routePlanner);

		// Custom SSLContext
		SSLContext sslContext = null;
		try {
			sslContext = SSLContext.getInstance("TLSv1.2");
			sslContext.init(null, null, null);
		} catch (Exception e) {
		}
		final SSLConnectionSocketFactory sslSocketFactory = SSLConnectionSocketFactoryBuilder.create()
				.setSslContext(sslContext).build();
		final HttpClientConnectionManager connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
				.setSSLSocketFactory(sslSocketFactory).build();
		builder.setConnectionManager(connectionManager);

		// Custom CredentialsProvider
		final BasicCredentialsProvider customCredentialsProvider = new BasicCredentialsProvider();
		customCredentialsProvider.setCredentials(new AuthScope(null, -1),
				new UsernamePasswordCredentials("OPENVIDUAPP", "MY_SECRET".toCharArray()));
		builder.setDefaultCredentialsProvider(customCredentialsProvider);

		new OpenVidu("https://localhost", "MY_SECRET");
		new OpenVidu("https://localhost", "MY_SECRET", builder);
		new OpenVidu("https://localhost", builder);
	}

}
