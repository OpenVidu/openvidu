package io.openvidu.java.client.test;

import java.net.Authenticator;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.InetSocketAddress;
import java.net.PasswordAuthentication;
import java.net.ProxySelector;
import java.net.http.HttpClient;
import java.net.http.HttpClient.Redirect;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Executors;

import javax.net.ssl.SSLContext;

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
	public void buildWithHttpClientWithoutAuthenticator() {
		HttpClient.Builder builder = HttpClient.newBuilder();
		builder.connectTimeout(Duration.ofMillis(10000));
		ProxySelector proxy = ProxySelector.of(new InetSocketAddress("https://my.proxy.hostname/", 4444));
		builder.proxy(proxy);
		builder.followRedirects(Redirect.ALWAYS);
		SSLContext sslContext = null;
		try {
			sslContext = SSLContext.getInstance("TLSv1.2");
			sslContext.init(null, null, null);
		} catch (Exception e) {
		}
		builder.sslContext(sslContext);
		builder.executor(Executors.newFixedThreadPool(1));
		builder.cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ORIGINAL_SERVER));
		OpenVidu OV = new OpenVidu("https://localhost:4443/", "MY_SECRET", builder.build());
		Assertions.assertEquals(30000, OV.getRequestTimeout());
		Assertions.assertTrue(OV.getRequestHeaders().isEmpty());
		OV.setRequestTimeout(5000);
		OV.setRequestHeaders(Map.of("header1", "value1", "header2", "value2"));
		Assertions.assertEquals(5000, OV.getRequestTimeout());
		Assertions.assertEquals(2, OV.getRequestHeaders().size());
	}

	@Test
	public void buildWithHttpClientWithAuthenticator() {
		Authenticator authenticator = new Authenticator() {
			@Override
			protected PasswordAuthentication getPasswordAuthentication() {
				return new PasswordAuthentication("OPENVIDUAPP", "secret".toCharArray());
			}
		};
		HttpClient.Builder builder = HttpClient.newBuilder().authenticator(authenticator);
		new OpenVidu("https://localhost:4443/", "MY_SECRET", builder.build());
	}

}
