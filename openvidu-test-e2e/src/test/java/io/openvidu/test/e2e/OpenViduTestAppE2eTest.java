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

package io.openvidu.test.e2e;

import static org.junit.jupiter.api.Assertions.fail;

import java.io.File;
import java.net.HttpURLConnection;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.BiFunction;
import java.util.stream.Collectors;

import javax.net.ssl.SSLContext;

import org.apache.commons.lang3.RandomStringUtils;
import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.io.HttpClientConnectionManager;
import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactoryBuilder;
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.message.BasicHeader;
import org.apache.hc.core5.ssl.SSLContextBuilder;
import org.apache.hc.core5.ssl.TrustStrategy;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.Alert;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.java.client.Connection;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.IceServerProperties;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Publisher;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.Recording.OutputMode;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingMode;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.java.client.Session;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.RecordingUtils;
import io.openvidu.test.browsers.utils.layout.CustomLayoutHandler;
import io.openvidu.test.browsers.utils.webhook.CustomWebhook;
import io.openvidu.test.e2e.annotations.OnlyKurento;

/**
 * E2E tests for openvidu-testapp.
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 * @since 1.1.1
 */
@Tag("e2e")
@DisplayName("E2E tests for OpenVidu TestApp")
@ExtendWith(SpringExtension.class)
public class OpenViduTestAppE2eTest extends AbstractOpenViduTestappE2eTest {

	@BeforeAll()
	protected static void setupAll() throws Exception {
		checkFfmpegInstallation();
		loadEnvironmentVariables();
		cleanFoldersAndSetUpOpenViduJavaClient();
		getDefaultTranscodingValues();
	}

	@Test
	@DisplayName("One2One Chrome")
	void oneToOneChrome() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		log.info("One2One Chrome");
		oneToOneAux(user);
	}

	@Test
	@DisplayName("One2One Firefox")
	void oneToOneFirefox() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");
		log.info("One2One Firefox");
		oneToOneAux(user);
	}

	@Test
	@DisplayName("One2One Opera")
	@Disabled
	void oneToOneOpera() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("opera");
		log.info("One2One Opera");
		oneToOneAux(user);
	}

	@Test
	@DisplayName("One2One Edge")
	void oneToOneEdge() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("edge");
		log.info("One2One Edge");
		oneToOneAux(user);
	}

	private void oneToOneAux(OpenViduTestappUser user) throws Exception {
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();
		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");
		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2One only audio")
	void oneToOneOnlyAudioSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2One only audio");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getDriver().findElements(By.className("send-video-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, false),
				"Videos were expected to only have audio tracks");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2One only video")
	void oneToOneOnlyVideoSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2One only video");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getDriver().findElements(By.className("send-audio-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true),
				"Videos were expected to only have video tracks");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2Many [Video + Audio]")
	void oneToManyVideoAudioSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2Many [Video + Audio]");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 16);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 4);
	}

	@Test
	@OnlyKurento
	@DisplayName("Unique user remote subscription [Video + Audio]")
	void oneRemoteSubscription() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Unique user remote subscription [Video + Audio]");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Expected 1 video but found " + numberOfVideos);
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Video was expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@OnlyKurento
	@DisplayName("Unique user remote subscription Firefox [Video + Audio]")
	void oneRemoteSubscriptionFirefox() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Unique user remote subscription Firefox [Video + Audio]");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Expected 1 video but found " + numberOfVideos);
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Video was expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@OnlyKurento
	@DisplayName("Unique user remote subscription [ScreenShare + Audio]")
	void oneRemoteSubscriptionScreen() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Unique user remote subscription [ScreenShare + Audio]");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("screen-radio")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Expected 1 video but found " + numberOfVideos);
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Video was expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Many2Many [Video + Audio]")
	void manyToManyVideoAudioSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Many2Many [Video + Audio]");

		WebElement addUser = user.getDriver().findElement(By.id("add-user-btn"));
		for (int i = 0; i < 4; i++) {
			addUser.click();
		}

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 16);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 4);
		user.getEventManager().waitUntilEventReaches("streamCreated", 16);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 16);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(16, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 4);
	}

	@Test
	@DisplayName("Massive session")
	void massiveSessionTest() throws Exception {
		isKurentoRestartTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Massive session");

		final Integer NUMBER_OF_USERS = 7;

		user.getDriver().findElement(By.id("toolbar-scenarios")).sendKeys(Keys.ENTER);

		WebElement one2ManyInput = user.getDriver().findElement(By.id("one2many-input"));
		one2ManyInput.clear();
		one2ManyInput.sendKeys(NUMBER_OF_USERS.toString());

		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getWaiter()
				.until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), NUMBER_OF_USERS * NUMBER_OF_USERS));

		user.getEventManager().waitUntilEventReaches("streamCreated", NUMBER_OF_USERS * NUMBER_OF_USERS);
		user.getEventManager().waitUntilEventReaches("streamPlaying", NUMBER_OF_USERS * NUMBER_OF_USERS);

		this.stopMediaServer(false);

		user.getEventManager().waitUntilEventReaches("sessionDisconnected", NUMBER_OF_USERS);
	}

	@Test
	@DisplayName("Cross-Browser test")
	void crossBrowserTest() throws Exception {

		log.info("Cross-Browser test");

		Thread.UncaughtExceptionHandler h = new Thread.UncaughtExceptionHandler() {
			public void uncaughtException(Thread th, Throwable ex) {
				System.out.println("Uncaught exception: " + ex);
				synchronized (lock) {
					OpenViduTestAppE2eTest.ex = new Exception(ex);
				}
			}
		};

		final CountDownLatch latch = new CountDownLatch(3);

		final BiFunction<OpenViduTestappUser, String, Void> browserTest = (user, browserName) -> {

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.className("join-btn")).click();

			try {
				user.getEventManager().waitUntilEventReaches("connectionCreated", 3, 100, true);
				user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
				user.getEventManager().waitUntilEventReaches("streamCreated", 3);
				user.getEventManager().waitUntilEventReaches("streamPlaying", 3);

				final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
				Assertions.assertEquals(3, numberOfVideos, "Wrong number of videos");
				Assertions
						.assertTrue(
								user.getBrowserUser().assertMediaTracks(
										user.getDriver().findElements(By.tagName("video")), true, true),
								"Videos were expected to have audio and video tracks");

				latch.countDown();
				if (!latch.await(60, TimeUnit.SECONDS)) {
					Assertions.fail("Other browser didn't play the stream within the timeout");
				}

				user.getDriver().findElement(By.id("remove-user-btn")).click();
				user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);

			} catch (Exception e) {
				e.printStackTrace();
				Thread.currentThread().interrupt();
				Assertions.fail("Exception on " + browserName + " participant: " + e.getMessage());
			} finally {
				user.dispose();
			}
			return null;
		};

		Thread threadChrome = new Thread(() -> {
			try {
				browserTest.apply(setupBrowserAndConnectToOpenViduTestapp("chrome"), "Chrome");
			} catch (Exception e) {
				String errMsg = "Error setting up browser: " + e.getMessage();
				System.err.println(errMsg);
				Assertions.fail(errMsg);
				Thread.currentThread().interrupt();
			}
		});
		Thread threadFirefox = new Thread(() -> {
			try {
				browserTest.apply(setupBrowserAndConnectToOpenViduTestapp("firefox"), "Firefox");
			} catch (Exception e) {
				String errMsg = "Error setting up browser: " + e.getMessage();
				System.err.println(errMsg);
				Assertions.fail(errMsg);
				Thread.currentThread().interrupt();
			}
		});
		Thread threadEdge = new Thread(() -> {
			try {
				browserTest.apply(setupBrowserAndConnectToOpenViduTestapp("edge"), "Edge");
			} catch (Exception e) {
				String errMsg = "Error setting up browser: " + e.getMessage();
				System.err.println(errMsg);
				Assertions.fail(errMsg);
				Thread.currentThread().interrupt();
			}
		});
		// Thread threadOpera = new Thread(() -> {
		// try {
		// browserTest.apply(setupBrowserAndConnectToOpenViduTestapp("opera"), "Opera");
		// } catch (Exception e) {
		// String errMsg = "Error setting up browser: " + e.getMessage();
		// System.err.println(errMsg);
		// Assertions.fail(errMsg);
		// Thread.currentThread().interrupt();
		// }
		// });

		threadChrome.setUncaughtExceptionHandler(h);
		threadFirefox.setUncaughtExceptionHandler(h);
		threadEdge.setUncaughtExceptionHandler(h);
		// threadOpera.setUncaughtExceptionHandler(h);
		threadChrome.start();
		threadFirefox.start();
		threadEdge.start();
		// threadOpera.start();
		threadChrome.join();
		threadFirefox.join();
		threadEdge.join();
		// threadOpera.join();

		synchronized (lock) {
			if (OpenViduTestAppE2eTest.ex != null) {
				throw OpenViduTestAppE2eTest.ex;
			}
		}
	}

	@Test
	@DisplayName("Signal message")
	void oneToManySignalMessage() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Signal message");

		WebElement addUser = user.getDriver().findElement(By.id("add-user-btn"));
		for (int i = 0; i < 4; i++) {
			addUser.click();
		}

		user.getDriver().findElements(By.className("publish-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 16);
		user.getDriver().findElements(By.className(("message-btn"))).get(0).click();
		user.getEventManager().waitUntilEventReaches("signal:chat", 4);

		gracefullyLeaveParticipants(user, 4);
	}

	@Test
	@DisplayName("ExceptionEvent test")
	void exceptionEventTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("ExceptionEvent test");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .send-audio-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .join-btn")).click();

		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		// Stop video track
		WebElement video = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		user.getBrowserUser().stopVideoTracksOfVideoElement(video, "#openvidu-instance-0");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();

		user.getEventManager().waitUntilEventReaches("exception", 1);

		Assertions.assertEquals("NO_STREAM_PLAYING_EVENT",
				user.getDriver()
						.findElement(
								By.cssSelector("#openvidu-instance-1 .mat-expansion-panel:last-child .event-content"))
						.getAttribute("textContent"),
				"Wrong ExceptionEvent type");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Subscribe Unsubscribe")
	void subscribeUnsubscribeTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Subscribe Unsubscribe");

		user.getDriver().findElement(By.id("one2one-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .publish-checkbox")).click();

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		// Global unsubscribe-subscribe
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		WebElement subBtn = user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-btn")));
		subBtn.click();

		user.getWaiter()
				.until(ExpectedConditions.not(ExpectedConditions.attributeToBeNotEmpty(subscriberVideo, "srcObject")));
		Assertions.assertFalse(user.getBrowserUser().hasMediaStream(subscriberVideo, "#openvidu-instance-0"),
				"Subscriber video should not have srcObject defined after unsubscribe");

		subBtn.click();
		user.getEventManager().waitUntilEventReaches("streamPlaying", 3);

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		// Video unsubscribe
		subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		Iterable<WebElement> firstVideo = Arrays.asList(subscriberVideo);
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-video-btn"))).click();
		Thread.sleep(1000);
		Assertions.assertTrue(user.getBrowserUser().assertMediaTracks(firstVideo, true, false),
				"Subscriber video was expected to only have audio track");

		// Audio unsubscribe
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-audio-btn"))).click();
		Thread.sleep(1000);
		Assertions.assertTrue(user.getBrowserUser().assertMediaTracks(firstVideo, false, false),
				"Subscriber video was expected to not have video or audio tracks");

		// Video and audio subscribe
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-video-btn"))).click();
		Thread.sleep(1000);
		Assertions.assertTrue(user.getBrowserUser().assertMediaTracks(firstVideo, false, true),
				"Subscriber video was expected to only have video track");
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-audio-btn"))).click();
		Thread.sleep(1000);
		Assertions.assertTrue(user.getBrowserUser().assertMediaTracks(firstVideo, true, true),
				"Subscriber video was expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Publish Unpublish")
	void publishUnpublishTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Publisher unpublish");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		List<WebElement> publishButtons = user.getDriver().findElements(By.className("pub-btn"));
		for (WebElement el : publishButtons) {
			el.click();
		}

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		for (WebElement video : user.getDriver().findElements(By.tagName("video"))) {
			user.getWaiter()
					.until(ExpectedConditions.not(ExpectedConditions.attributeToBeNotEmpty(video, "srcObject")));
			Assertions.assertFalse(user.getBrowserUser().hasMediaStream(video, ""),
					"Videos were expected to lack srcObject property");
		}

		for (WebElement el : publishButtons) {
			el.click();
		}

		user.getEventManager().waitUntilEventReaches("streamCreated", 8);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 8);
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Change publisher dynamically")
	void changePublisherTest() throws Exception {

		Queue<Boolean> threadAssertions = new ConcurrentLinkedQueue<Boolean>();

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateScreenShare");

		log.info("Change publisher dynamically");

		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();

		final CountDownLatch latch1 = new CountDownLatch(2);

		// First publication (audio + video [CAMERA])
		user.getEventManager().on("streamPlaying", (event) -> {
			JsonObject stream = event.get("target").getAsJsonObject().get("stream").getAsJsonObject();
			threadAssertions.add("CAMERA".equals(stream.get("typeOfVideo").getAsString()));
			threadAssertions.add(stream.get("hasAudio").getAsBoolean());

			latch1.countDown();
		});
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		if (!latch1.await(5000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail("Waiting for 2 streamPlaying events to happen in total");
			return;
		}

		user.getEventManager().off("streamPlaying");
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assertions.assertTrue(iter.next(), "Some Event property was wrong");
			iter.remove();
		}

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		final CountDownLatch latch2 = new CountDownLatch(2);

		// Second publication (only video (SCREEN))
		user.getEventManager().on("streamPlaying", (event) -> {
			JsonObject stream = event.get("target").getAsJsonObject().get("stream").getAsJsonObject();
			threadAssertions.add("SCREEN".equals(stream.get("typeOfVideo").getAsString()));
			threadAssertions.add(!stream.get("hasAudio").getAsBoolean());
			latch2.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .change-publisher-btn")).click();

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		if (!latch2.await(5000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail("Waiting for 4 streamPlaying events to happen in total");
			return;
		}

		user.getEventManager().off("streamPlaying");
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assertions.assertTrue(iter.next(), "Some Event property was wrong");
			iter.remove();
		}

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true),
				"Videos were expected to only have video tracks");

		final CountDownLatch latch3 = new CountDownLatch(2);

		// Third publication (audio + video [CAMERA])
		user.getEventManager().on("streamPlaying", (event) -> {
			JsonObject stream = event.get("target").getAsJsonObject().get("stream").getAsJsonObject();
			threadAssertions.add("CAMERA".equals(stream.get("typeOfVideo").getAsString()));
			threadAssertions.add(stream.get("hasAudio").getAsBoolean());
			latch3.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .change-publisher-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 3);
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 6);

		if (!latch3.await(8000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail("Waiting for 6 streamPlaying events to happen in total");
			return;
		}

		user.getEventManager().off("streamPlaying");
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assertions.assertTrue(iter.next(), "Some Event property was wrong");
			iter.remove();
		}

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Replace track")
	void replaceTrackTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Replace track");

		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		final CountDownLatch latch = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			if ("videoTrack".equals(event.get("changedProperty").getAsString())) {
				Assertions.assertEquals("trackReplaced", event.get("reason").getAsString(),
						"Wrong streamPropertyChanged reason for videoTrack");
				latch.countDown();
			}
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .replace-track-btn")).click();
		if (!latch.await(3000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail();
			return;
		}

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video"));
		Map<String, Long> rgbPublisher = user.getBrowserUser().getAverageRgbFromVideo(publisherVideo);
		Map<String, Long> rgbSubscriber = user.getBrowserUser().getAverageRgbFromVideo(subscriberVideo);
		Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbLightGray(rgbPublisher),
				"Publisher video is not average gray");
		Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbLightGray(rgbSubscriber),
				"Subscriber video is not average gray");
	}

	@Test
	@DisplayName("Moderator capabilities")
	void moderatorCapabilitiesTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Moderator capabilities");

		// Add publisher
		user.getDriver().findElement(By.id("add-user-btn")).click();

		// Add subscriber
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();

		// Add and configure moderator (only subscribe)
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .publish-checkbox")).click();
		user.getDriver().findElement(By.id("session-settings-btn-2")).click();
		Thread.sleep(1000);

		user.getDriver().findElement(By.id("radio-btn-mod")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 9);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 3);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 3);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(3, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		// Moderator forces unpublish
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .force-unpub-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 3);

		List<WebElement> videos = user.getDriver().findElements(By.tagName("video"));
		numberOfVideos = videos.size();
		Assertions.assertEquals(1, numberOfVideos, "Expected 1 video but found " + numberOfVideos);
		Assertions.assertFalse(user.getBrowserUser().hasMediaStream(videos.get(0), ""),
				"Publisher video should not have srcObject defined after force unpublish");

		// Publisher publishes again
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 6);

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(3, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		// Moderator forces disconnect of publisher
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .force-disconnect-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 6);
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 2);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 0));

		gracefullyLeaveParticipants(user, 3);
	}

	@Test
	@DisplayName("Stream property changed event")
	void streamPropertyChangedEventTest() throws Exception {

		Queue<Boolean> threadAssertions = new ConcurrentLinkedQueue<Boolean>();

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateScreenShare");

		log.info("Stream property changed event");

		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");

		user.getDriver().findElement(By.id("one2many-btn")).click();
		user.getDriver().findElement(By.className("screen-radio")).click();

		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("radio-btn-mod")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		List<WebElement> joinButtons = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : joinButtons) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		// Give some time for the screen sharing warning to stop resizing the viewport
		Thread.sleep(3000);
		user.getEventManager().clearCurrentEvents("streamPropertyChanged");

		// Unpublish video
		final CountDownLatch latch1 = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			System.out.println(event.toString());
			threadAssertions.add("videoActive".equals(event.get("changedProperty").getAsString()));
			threadAssertions.add("publishVideo".equals(event.get("reason").getAsString()));
			threadAssertions.add(!event.get("newValue").getAsBoolean());
			latch1.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-video-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);

		if (!latch1.await(4000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail();
			return;
		}

		user.getEventManager().off("streamPropertyChanged");
		log.info("Thread assertions for unpublishing video: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assertions.assertTrue(iter.next(), "Some Event property was wrong");
			iter.remove();
		}

		// Unpublish audio
		final CountDownLatch latch2 = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			System.out.println(event.toString());
			threadAssertions.add("audioActive".equals(event.get("changedProperty").getAsString()));
			threadAssertions.add("publishAudio".equals(event.get("reason").getAsString()));
			threadAssertions.add(!event.get("newValue").getAsBoolean());
			latch2.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-audio-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);

		if (!latch2.await(4000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail();
			return;
		}

		user.getEventManager().off("streamPropertyChanged");
		log.info("Thread assertions for unpublishing audio: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assertions.assertTrue(iter.next(), "Some Event property was wrong");
			iter.remove();
		}

		// Resize captured window
		final CountDownLatch latch3 = new CountDownLatch(2);
		int newWidth = 1000;
		int newHeight = 700;

		user.getEventManager().on("streamPropertyChanged", (event) -> {
			String expectedDimensions = "{\"width\":" + newWidth + ",\"height\":" + newHeight + "}";
			System.out.println("Publisher dimensions: " + event.get("newValue").getAsJsonObject().toString());
			System.out.println("Real dimensions of viewport: " + expectedDimensions);
			if ("videoDimensions".equals(event.get("changedProperty").getAsString())
					&& "screenResized".equals(event.get("reason").getAsString())
					&& (expectedDimensions.equals(event.get("newValue").getAsJsonObject().toString()))) {
				latch3.countDown();
			}
		});

		user.getDriver().manage().window().setSize(new Dimension(newWidth, newHeight));

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 6);

		if (!latch3.await(4000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail();
			return;
		}

		user.getEventManager().off("streamPropertyChanged");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@OnlyKurento
	@DisplayName("Stream property changed filter event")
	void streamPropertyChangedFilterEventTest() throws Exception {

		Queue<Boolean> threadAssertions = new ConcurrentLinkedQueue<Boolean>();

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateScreenShare");

		log.info("Stream property changed event");

		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");

		user.getDriver().findElement(By.id("one2many-btn")).click();
		user.getDriver().findElement(By.className("screen-radio")).click();

		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("radio-btn-mod")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		List<WebElement> joinButtons = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : joinButtons) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		// Filter
		final CountDownLatch latch3 = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			// As chrome may change video dimensions, ignore video dimensions event
			if (!"videoDimensions".equals(event.get("changedProperty").getAsString())) {
				threadAssertions.add("filter".equals(event.get("changedProperty").getAsString()));
				threadAssertions.add("applyFilter".equals(event.get("reason").getAsString()));
				threadAssertions.add(!event.has("oldValue"));
				JsonObject newValue = event.get("newValue").getAsJsonObject();
				threadAssertions.add("GStreamerFilter".equals(newValue.get("type").getAsString()));
				JsonObject options = newValue.get("options").getAsJsonObject();
				threadAssertions.add("videobalance saturation=0.0".equals(options.get("command").getAsString()));
				latch3.countDown();
			}

		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .other-operations-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);

		if (!latch3.await(4000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 2);
			fail();
			return;
		}

		user.getEventManager().off("streamPropertyChanged");
		log.info("Thread assertions for applying filter: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assertions.assertTrue(iter.next(), "Some Event property was wrong");
			iter.remove();
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Local browser record")
	void localBrowserRecordTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Local browser record");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Expected 1 video but found " + numberOfVideos);
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Video was expected to have audio and video tracks");

		WebElement recordBtn = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .publisher-rec-btn"));
		recordBtn.click();

		Thread.sleep(2000);

		WebElement pauseRecordBtn = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-0 .publisher-rec-pause-btn"));
		pauseRecordBtn.click();

		Thread.sleep(2000);

		pauseRecordBtn.click();

		Thread.sleep(2000);

		recordBtn.click();

		Thread.sleep(2000);

		user.getWaiter().until(ExpectedConditions.elementToBeClickable(By.cssSelector("#recorder-preview video")));

		try {
			user.getWaiter().until(
					waitForVideoDuration(user.getDriver().findElement(By.cssSelector("#recorder-preview video")), 4));
		} catch (Exception e) {
			System.out.println(getBase64Screenshot(user.getBrowserUser()));
			Assertions.fail(e.getMessage());
		}

		user.getDriver().findElement(By.id("close-record-btn")).click();

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("#recorder-preview video"), 0));

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Composed record")
	void composedRecordTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Composed record");

		final String sessionName = "COMPOSED_RECORDED_SESSION";
		final String resolution = "1200x700";
		final int frameRate = 16;
		final long shmSize = 500000000;

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-0")).clear();
		user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

		// API REST test
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(750);

		// Try to record a non-existing session
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		listEmptyRecordings(user);

		// Try to stop a non-existing recording
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys("FAIL");
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		listEmptyRecordings(user);

		// Try to get a non-existing recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		listEmptyRecordings(user);

		// Try to delete a non-existing recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(750);

		// Join the user to the session
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Expected 1 video but found " + numberOfVideos);
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Video was expected to have audio and video tracks");

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(750);
		user.getDriver().findElement(By.id("rec-properties-btn")).click();
		Thread.sleep(500);
		WebElement resolutionField = user.getDriver().findElement(By.id("recording-resolution-field"));
		resolutionField.clear();
		resolutionField.sendKeys(resolution);
		WebElement frameRateField = user.getDriver().findElement(By.id("recording-framerate-field"));
		frameRateField.clear();
		frameRateField.sendKeys(String.valueOf(frameRate));
		WebElement shmSizeField = user.getDriver().findElement(By.id("recording-shmsize-field"));
		shmSizeField.clear();
		shmSizeField.sendKeys(String.valueOf(shmSize));

		user.getDriver().findElement(By.id("start-recording-btn")).click();

		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

		Thread.sleep(3000);

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		// A new user with PUBLISHER role should trigger recordingStarted event
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-1")).clear();
		user.getDriver().findElement(By.id("session-name-input-1")).sendKeys(sessionName);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .subscribe-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();
		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		// A new user with SUBSCRIBER role should not trigger recordingStarted event
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-2")).clear();
		user.getDriver().findElement(By.id("session-name-input-2")).sendKeys(sessionName);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .publish-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .subscribe-checkbox")).click();
		user.getDriver().findElement(By.id("session-settings-btn-2")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("radio-btn-sub")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .join-btn")).click();
		user.getEventManager().waitUntilEventReaches("connectionCreated", 9);
		user.getEventManager().waitUntilEventReaches("streamCreated", 3);

		// No third recordingStarted event should be triggered for the SUBSCRIBER user
		Thread.sleep(3000);
		Assertions.assertEquals(2, user.getEventManager().getNumEvents("recordingStarted").intValue());

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(sessionName);

		// Try to start an ongoing recording
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [409]"));

		// Try to get an existing recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording got [" + sessionName + "]"));

		// Try to delete an ongoing recording
		user.getDriver().findElement(By.id("delete-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [409]"));

		// List existing recordings (one)
		user.getDriver().findElement(By.id("list-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording list [" + sessionName + "]"));

		// Stop ongoing recording
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStopped", 1);

		String recordingsPath = "/opt/openvidu/recordings/";
		File file1 = new File(recordingsPath + sessionName + "/" + sessionName + ".mp4");
		File file2 = new File(recordingsPath + sessionName + "/" + ".recording." + sessionName);
		File file3 = new File(recordingsPath + sessionName + "/" + sessionName + ".jpg");

		Assertions.assertTrue(file1.exists() && file1.length() > 0,
				"File " + file1.getAbsolutePath() + " does not exist or is empty");
		Assertions.assertTrue(file2.exists() && file2.length() > 0,
				"File " + file2.getAbsolutePath() + " does not exist or is empty");
		Assertions.assertTrue(file3.exists() && file3.length() > 0,
				"File " + file3.getAbsolutePath() + " does not exist or is empty");

		Assertions.assertTrue(
				this.recordingUtils.recordedGreenFileFine(file1,
						new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(sessionName)),
				"Recorded file " + file1.getAbsolutePath() + " is not fine");
		Assertions.assertTrue(this.recordingUtils.thumbnailIsFine(file3, RecordingUtils::checkVideoAverageRgbGreen),
				"Thumbnail " + file3.getAbsolutePath() + " is not fine");

		// Try to get the stopped recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording got [" + sessionName + "]"));

		// Try to list the stopped recording
		user.getDriver().findElement(By.id("list-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording list [" + sessionName + "]"));

		// Delete the recording
		user.getDriver().findElement(By.id("delete-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Recording deleted"));

		Assertions.assertFalse(file1.exists(), "File " + file1.getAbsolutePath() + " shouldn't exist");
		Assertions.assertFalse(file2.exists(), "File " + file2.getAbsolutePath() + " shouldn't exist");
		Assertions.assertFalse(file3.exists(), "File " + file3.getAbsolutePath() + " shouldn't exist");

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(user, 3);
	}

	@Test
	@DisplayName("Composed quick start record")
	void composedQuickStartRecordTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Composed quick start record");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			final String sessionName = "COMPOSED_QUICK_START_RECORDED_SESSION";
			JsonObject event;

			// 1. MANUAL mode and recording explicitly stopped

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-name-input-0")).clear();
			user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("rec-outputmode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-COMPOSED_QUICK_START")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			// Join the subscriber user to the session
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .publish-checkbox")).click();
			user.getDriver().findElement(By.className("join-btn")).click();
			user.getEventManager().waitUntilEventReaches("connectionCreated", 1);

			// Check the recording container is up and running but no ongoing recordings
			checkDockerContainerRunning(RECORDING_IMAGE, 1);
			Assertions.assertEquals(0, OV.listRecordings().size(), "Wrong number of recordings found");

			// Join the publisher user to the session
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-name-input-1")).clear();
			user.getDriver().findElement(By.id("session-name-input-1")).sendKeys(sessionName);
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();

			user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
			user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
			user.getEventManager().waitUntilEventReaches("streamCreated", 2);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

			// Start recording
			OV.fetch();
			String recId = OV.startRecording(sessionName).getId();
			user.getEventManager().waitUntilEventReaches("recordingStarted", 2);
			CustomWebhook.waitForEvent("recordingStatusChanged", 5);
			checkDockerContainerRunning("openvidu/openvidu-recording", 1);

			Thread.sleep(2000);

			Assertions.assertEquals(1, OV.listRecordings().size(), "Wrong number of recordings found");
			OV.stopRecording(recId);
			user.getEventManager().waitUntilEventReaches("recordingStopped", 2);
			checkDockerContainerRunning("openvidu/openvidu-recording", 1);

			Assertions.assertEquals(1, OV.getActiveSessions().size(), "Wrong number of sessions");
			Session session = OV.getActiveSessions().get(0);
			session.close();

			checkDockerContainerRunning("openvidu/openvidu-recording", 0);

			Assertions.assertEquals(Recording.Status.ready, OV.getRecording(sessionName).getStatus(),
					"Wrong recording status");

			// 2. ALWAYS mode and recording stopped by session close up
			CustomWebhook.clean();
			user.getDriver().findElement(By.id("remove-all-users-btn")).click();
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-name-input-0")).clear();
			user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("recording-mode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-ALWAYS")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("rec-outputmode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-COMPOSED_QUICK_START")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.className("join-btn")).click();
			user.getEventManager().waitUntilEventReaches("connectionCreated", 5);
			user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
			user.getEventManager().waitUntilEventReaches("streamCreated", 3);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 3);
			user.getEventManager().waitUntilEventReaches("recordingStarted", 3);

			event = CustomWebhook.waitForEvent("recordingStatusChanged", 5); // started
			Assertions.assertEquals("started", event.get("status").getAsString(),
					"Wrong status in recordingStatusChanged event");

			checkDockerContainerRunning("openvidu/openvidu-recording", 1);

			OV.fetch();
			session = OV.getActiveSessions().get(0);
			session.close();

			checkDockerContainerRunning("openvidu/openvidu-recording", 0);

			Assertions.assertEquals(Recording.Status.ready, OV.getRecording(sessionName + "~1").getStatus(),
					"Wrong recording status");

			// 3. Session closed before recording started should trigger
			CustomWebhook.clean();
			user.getDriver().findElement(By.id("remove-all-users-btn")).click();
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-name-input-0")).clear();
			user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("recording-mode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-ALWAYS")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("rec-outputmode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-COMPOSED_QUICK_START")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.className("join-btn")).click();
			user.getEventManager().waitUntilEventReaches("connectionCreated", 6);
			user.getEventManager().waitUntilEventReaches("accessAllowed", 3);
			user.getEventManager().waitUntilEventReaches("streamCreated", 4);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 4);
			checkDockerContainerRunning("openvidu/openvidu-recording", 1);

			OV.fetch();
			session = OV.getActiveSessions().get(0);
			session.close();

			event = CustomWebhook.waitForEvent("recordingStatusChanged", 1);
			if ("stopped".equals(event.get("status").getAsString())) {
				// Recording hasn't had time to start. Should trigger stopped, started, failed
				event = CustomWebhook.waitForEvent("recordingStatusChanged", 5); // started
				Assertions.assertEquals("started", event.get("status").getAsString(),
						"Wrong status in recordingStatusChanged event");
				event = CustomWebhook.waitForEvent("recordingStatusChanged", 1); // failed
				Assertions.assertEquals("failed", event.get("status").getAsString(),
						"Wrong status in recordingStatusChanged event");
				Assertions.assertEquals(Recording.Status.failed, OV.getRecording(sessionName + "~2").getStatus(),
						"Wrong recording status");
			} else {
				// Recording did have time to start. Should trigger started, stopped, ready
				event = CustomWebhook.waitForEvent("recordingStatusChanged", 5); // started
				Assertions.assertEquals("stopped", event.get("status").getAsString(),
						"Wrong status in recordingStatusChanged event");
				event = CustomWebhook.waitForEvent("recordingStatusChanged", 1); // failed
				Assertions.assertEquals("ready", event.get("status").getAsString(),
						"Wrong status in recordingStatusChanged event");
				Assertions.assertEquals(Recording.Status.ready, OV.getRecording(sessionName + "~2").getStatus(),
						"Wrong recording status");
			}

			checkDockerContainerRunning("openvidu/openvidu-recording", 0);

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("Individual record")
	void individualRecordTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Individual record");

		final String sessionName = "TestSession";
		final String recordingName = "CUSTOM_NAME";

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("rec-properties-btn")).click();
		Thread.sleep(500);

		// Set recording name
		user.getDriver().findElement(By.id("recording-name-field")).sendKeys(recordingName);
		// Set OutputMode to INDIVIDUAL
		user.getDriver().findElement(By.id("rec-outputmode-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-INDIVIDUAL")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.id("start-recording-btn")).click();

		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		List<String> streamIds = activeStreamsOfSession(sessionName);
		for (String strId : streamIds) {
			waitUntilFileExistsAndIsBiggerThan("/opt/openvidu/recordings/" + sessionName + "/" + strId + "."
					+ this.getIndividualRecordingExtension(), 200, 60);
		}

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(sessionName);

		// Try to start an ongoing recording
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [409]"));

		// Try to get an existing recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording got [" + sessionName + "]"));

		// Try to delete an ongoing recording
		user.getDriver().findElement(By.id("delete-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [409]"));

		// List existing recordings (one)
		user.getDriver().findElement(By.id("list-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording list [" + sessionName + "]"));

		// Stop ongoing recording
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStopped", 2);

		String recordingsPath = "/opt/openvidu/recordings/";
		String recPath = recordingsPath + sessionName + "/";

		Recording recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(sessionName);
		this.recordingUtils.checkIndividualRecording(recPath, recording, 2, "opus", "vp8", true);

		// Try to get the stopped recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording got [" + sessionName + "]"));

		// Try to list the stopped recording
		user.getDriver().findElement(By.id("list-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording list [" + sessionName + "]"));

		// Delete the recording
		user.getDriver().findElement(By.id("delete-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Recording deleted"));

		Assertions.assertFalse(new File(recPath).exists(), "Recording folder " + recPath + " shouldn't exist");

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Record cross-browser audio-only and video-only")
	void audioOnlyVideoOnlyRecordTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateScreenShare");

		log.info("Record cross-browser audio-only and video-only");

		final String SESSION_NAME = "TestSession";
		final String RECORDING_COMPOSED_VIDEO = "COMPOSED_VIDEO_ONLY";
		final String RECORDING_INDIVIDUAL_VIDEO = "INDIVIDUAL_VIDEO_ONLY";
		final String RECORDING_INDIVIDUAL_AUDIO = "INDIVIDUAL_AUDIO_ONLY";
		final int RECORDING_DURATION = 5000;

		Thread.UncaughtExceptionHandler h = new Thread.UncaughtExceptionHandler() {
			public void uncaughtException(Thread th, Throwable ex) {
				System.out.println("Uncaught exception: " + ex);
				synchronized (lock) {
					OpenViduTestAppE2eTest.ex = new Exception(ex);
				}
			}
		};

		Thread t = new Thread(() -> {
			OpenViduTestappUser user2 = null;
			try {
				user2 = setupBrowserAndConnectToOpenViduTestapp("firefox");
			} catch (Exception e) {
				String errMsg = "Exception setting up browser: " + e.getMessage();
				System.err.println(errMsg);
				Assertions.fail(errMsg);
				Thread.currentThread().interrupt();
				return;
			}
			user2.getDriver().get(APP_URL);
			WebElement urlInput = user2.getDriver().findElement(By.id("openvidu-url"));
			urlInput.clear();
			urlInput.sendKeys(OPENVIDU_URL);
			WebElement secretInput = user2.getDriver().findElement(By.id("openvidu-secret"));
			secretInput.clear();
			secretInput.sendKeys(OPENVIDU_SECRET);

			user2.getEventManager().startPolling();

			// Firefox user audio + video
			user2.getDriver().findElement(By.id("add-user-btn")).click();

			// Firefox user video-only
			user2.getDriver().findElement(By.id("add-user-btn")).click();
			user2.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .send-audio-checkbox")).click();

			// Join Firefox users
			user2.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

			try {
				user2.getEventManager().waitUntilEventReaches("connectionCreated", 8);
				user2.getEventManager().waitUntilEventReaches("accessAllowed", 2);
				user2.getEventManager().waitUntilEventReaches("streamCreated", 8);
				user2.getEventManager().waitUntilEventReaches("streamPlaying", 8);

				int nVideos = user2.getDriver().findElements(By.tagName("video")).size();
				Assertions.assertEquals(8, nVideos, "Expected 8 videos in Firefox user but found " + nVideos);

				user2.getEventManager().waitUntilEventReaches("recordingStarted", 2);
				user2.getEventManager().waitUntilEventReaches("recordingStopped", 2);

				user2.getEventManager().waitUntilEventReaches("recordingStarted", 4);
				user2.getEventManager().waitUntilEventReaches("recordingStopped", 4);

				user2.getEventManager().waitUntilEventReaches("recordingStarted", 6);
				user2.getEventManager().waitUntilEventReaches("recordingStopped", 6);

				user2.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
				user2.getEventManager().waitUntilEventReaches("connectionDestroyed", 4);
				user2.getDriver().findElement(By.id("remove-user-btn")).click();
				user2.getDriver().findElement(By.id("remove-user-btn")).click();
				user2.getEventManager().waitUntilEventReaches("sessionDisconnected", 2);
			} catch (Exception e) {
				e.printStackTrace();
				user2.dispose();
				Thread.currentThread().interrupt();
			}
			user2.dispose();
		});
		t.setUncaughtExceptionHandler(h);
		t.start();

		// Chrome user screen share only-video
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .screen-radio")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .send-audio-checkbox")).click();

		// Chrome user audio-only
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .send-video-checkbox")).click();

		// Join Chrome users
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 8);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 8);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 8);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(8, numberOfVideos, "Wrong number of videos");

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("rec-properties-btn")).click();
		Thread.sleep(500);

		WebElement recordingNameField = user.getDriver().findElement(By.id("recording-name-field"));

		// Video-only COMPOSED recording
		recordingNameField.clear();
		recordingNameField.sendKeys(RECORDING_COMPOSED_VIDEO);
		user.getDriver().findElement(By.id("rec-hasaudio-checkbox")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + SESSION_NAME + "]"));
		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		Thread.sleep(RECORDING_DURATION);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME);
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 2);

		// Video-only INDIVIDUAL recording
		recordingNameField.clear();
		recordingNameField.sendKeys(RECORDING_INDIVIDUAL_VIDEO);
		Thread.sleep(500);
		user.getDriver().findElement(By.id("rec-outputmode-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-INDIVIDUAL")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + SESSION_NAME + "~1]"));
		user.getEventManager().waitUntilEventReaches("recordingStarted", 4);

		Thread.sleep(RECORDING_DURATION);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME + "~1");
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "~1]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 4);

		// Audio-only INDIVIDUAL recording
		recordingNameField.clear();
		recordingNameField.sendKeys(RECORDING_INDIVIDUAL_AUDIO);
		user.getDriver().findElement(By.id("rec-hasaudio-checkbox")).click();
		user.getDriver().findElement(By.id("rec-hasvideo-checkbox")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + SESSION_NAME + "~2]"));
		user.getEventManager().waitUntilEventReaches("recordingStarted", 6);

		Thread.sleep(RECORDING_DURATION);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME + "~2");
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "~2]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 6);

		String recordingsPath = "/opt/openvidu/recordings/";

		// Check video-only COMPOSED recording
		String recPath = recordingsPath + SESSION_NAME + "/";
		Recording recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME);
		this.recordingUtils.checkMultimediaFile(new File(recPath + recording.getName() + ".mp4"), false, true,
				recording.getDuration(), recording.getResolution(), recording.getFrameRate(), null, "h264", true);

		// Check video-only INDIVIDUAL recording
		recPath = recordingsPath + SESSION_NAME + "~1/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "~1");
		this.recordingUtils.checkIndividualRecording(recPath, recording, 3, "opus", "vp8", true);

		// Check audio-only INDIVIDUAL recording
		recPath = recordingsPath + SESSION_NAME + "~2/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "~2");
		this.recordingUtils.checkIndividualRecording(recPath, recording, 2, "opus", "vp8", true);

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(user, 2);

		t.join();

		synchronized (lock) {
			if (OpenViduTestAppE2eTest.ex != null) {
				throw OpenViduTestAppE2eTest.ex;
			}
		}
	}

	@Test
	@OnlyKurento
	@DisplayName("Record audio-only COMPOSED")
	void audioOnlyComposedRecordTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateScreenShare");

		log.info("Record audio-only COMPOSED");

		final String SESSION_NAME = "TestSession";
		final String RECORDING_NAME = "COMPOSED_AUDIO_ONLY";

		// Chrome user audio + video
		user.getDriver().findElement(By.id("add-user-btn")).click();

		// Chrome user audio-only
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .send-video-checkbox")).click();

		// Chrome user screen share only-video
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .screen-radio")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .send-audio-checkbox")).click();

		// Join Chrome users
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 9);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 3);
		user.getEventManager().waitUntilEventReaches("streamCreated", 9);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 9);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(9, numberOfVideos, "Wrong number of videos");

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("rec-properties-btn")).click();
		Thread.sleep(500);

		WebElement recordingNameField = user.getDriver().findElement(By.id("recording-name-field"));

		// Audio-only COMPOSED recording
		recordingNameField.clear();
		recordingNameField.sendKeys(RECORDING_NAME);
		user.getDriver().findElement(By.id("rec-hasvideo-checkbox")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + SESSION_NAME + "]"));
		user.getEventManager().waitUntilEventReaches("recordingStarted", 3);

		String recordingFilePath = "/opt/openvidu/recordings/" + SESSION_NAME + "/" + RECORDING_NAME + ".webm";
		waitUntilFileExistsAndIsBiggerThan(recordingFilePath, 40, 30);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME);
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 3);

		// Check audio-only COMPOSED recording
		Recording recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME);
		this.recordingUtils.checkMultimediaFile(new File(recordingFilePath), true, false, recording.getDuration(), null,
				null, "opus", null, true);

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(user, 3);
	}

	@Test
	@DisplayName("Custom layout recording")
	void customLayoutRecordTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Custom layout recording");

		final String SESSION_NAME = "CUSTOM_LAYOUT_SESSION";

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-0")).clear();
		user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(SESSION_NAME);

		// Custom layout from local storage
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("recording-mode-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-ALWAYS")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("recording-layout-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-CUSTOM")).click();
		Thread.sleep(500);
		WebElement customLayoutInput = user.getDriver().findElement(By.id("custom-layout-input"));
		customLayoutInput.clear();
		customLayoutInput.sendKeys("layout1");
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

		Thread.sleep(4000);

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME);
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 1);
		user.getDriver().findElement(By.id("close-session-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		String recordingsPath = "/opt/openvidu/recordings/" + SESSION_NAME + "/";
		File file1 = new File(recordingsPath + SESSION_NAME + ".mp4");
		File file2 = new File(recordingsPath + SESSION_NAME + ".jpg");

		Assertions.assertTrue(
				this.recordingUtils.recordedRedFileFine(file1,
						new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME)),
				"Recorded file " + file1.getAbsolutePath() + " is not fine");
		Assertions.assertTrue(this.recordingUtils.thumbnailIsFine(file2, RecordingUtils::checkVideoAverageRgbRed),
				"Thumbnail " + file2.getAbsolutePath() + " is not fine");

		// Custom layout from external URL
		CountDownLatch initLatch = new CountDownLatch(1);
		CustomLayoutHandler.main(new String[0], initLatch);
		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomLayoutHandler.shutDown();
				return;
			}

			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			customLayoutInput = user.getDriver().findElement(By.id("custom-layout-input"));
			customLayoutInput.clear();
			customLayoutInput.sendKeys(EXTERNAL_CUSTOM_LAYOUT_URL + "?" + EXTERNAL_CUSTOM_LAYOUT_PARAMS);
			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

			user.getEventManager().waitUntilEventReaches("connectionCreated", 2);
			user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
			user.getEventManager().waitUntilEventReaches("streamCreated", 2);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 2);
			user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

			Thread.sleep(4000);

			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.id("recording-id-field")).clear();
			user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME + "~1");
			user.getDriver().findElement(By.id("stop-recording-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
					"Recording stopped [" + SESSION_NAME + "~1]"));
			user.getEventManager().waitUntilEventReaches("recordingStopped", 2);
			user.getDriver().findElement(By.id("close-session-btn")).click();
			user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
			user.getEventManager().waitUntilEventReaches("sessionDisconnected", 2);
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);

			recordingsPath = "/opt/openvidu/recordings/" + SESSION_NAME + "~1/";
			file1 = new File(recordingsPath + SESSION_NAME + "~1.mp4");
			file2 = new File(recordingsPath + SESSION_NAME + "~1.jpg");

			Assertions.assertTrue(
					this.recordingUtils.recordedRedFileFine(file1,
							new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "~1")),
					"Recorded file " + file1.getAbsolutePath() + " is not fine");
			Assertions.assertTrue(this.recordingUtils.thumbnailIsFine(file2, RecordingUtils::checkVideoAverageRgbRed),
					"Thumbnail " + file2.getAbsolutePath() + " is not fine");

		} finally {
			CustomLayoutHandler.shutDown();
		}
	}

	@Test
	@DisplayName("REST API: Fetch all, fetch one, force disconnect, force unpublish, close session")
	void restApiFetchForce() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("REST API: Fetch all, fetch one, force disconnect, force unpublish, close session");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("add-user-btn")).click();

		// API REST test
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);

		// Close session (undefined)
		user.getDriver().findElement(By.id("close-session-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Error [Session undefined]"));

		// Fetch one (undefined)
		user.getDriver().findElement(By.id("get-session-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Error [Session undefined]"));

		// Fetch all (no active sessions)
		user.getDriver().findElement(By.id("list-sessions-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value",
				"Number: 0. Changes: false"));

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		// Fetch existing session (change)
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("get-session-btn")).click();

		Thread.sleep(1000);
		System.out.println(user.getDriver().findElement(By.id("api-response-text-area")).getAttribute("value"));

		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value", "Changes: true"));

		// Store connectionId and streamId
		String response = user.getDriver().findElement(By.id("api-response-text-area")).getAttribute("value");
		response = response.replace("Session info fetched {", "{").replace("}. Changes: true", "}");
		JsonObject jsonConnection = JsonParser.parseString(response).getAsJsonObject().get("activeConnections")
				.getAsJsonArray().get(0).getAsJsonObject();
		String connectionId = jsonConnection.get("connectionId").getAsString();
		String streamId = jsonConnection.get("publishers").getAsJsonArray().get(0).getAsJsonObject().get("streamId")
				.getAsString();

		// Fetch all sessions (no change)
		user.getDriver().findElement(By.id("list-sessions-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value",
				"Number: 1. Changes: false"));

		// Force unpublish wrong
		user.getDriver().findElement(By.id("stream-id-field")).clear();
		user.getDriver().findElement(By.id("stream-id-field")).sendKeys("FAIL");
		user.getDriver().findElement(By.id("force-unpublish-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		// Force unpublish right
		user.getDriver().findElement(By.id("stream-id-field")).clear();
		user.getDriver().findElement(By.id("stream-id-field")).sendKeys(streamId);
		user.getDriver().findElement(By.id("force-unpublish-api-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Stream unpublished"));
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(3, numberOfVideos, "Wrong number of videos");

		// Force disconnect wrong
		user.getDriver().findElement(By.id("connection-id-field")).clear();
		user.getDriver().findElement(By.id("connection-id-field")).sendKeys("FAIL");
		user.getDriver().findElement(By.id("force-disconnect-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		// Force disconnect right
		user.getDriver().findElement(By.id("connection-id-field")).clear();
		user.getDriver().findElement(By.id("connection-id-field")).sendKeys(connectionId);
		user.getDriver().findElement(By.id("force-disconnect-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "User disconnected"));
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);

		// Close session
		user.getDriver().findElement(By.id("close-session-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Session closed"));

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 0));

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(user, 1);

	}

	@Test
	@OnlyKurento
	@DisplayName("Video filter test")
	void videoFilterTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Video filter test");

		// Configure publisher
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElements(By.cssSelector("#openvidu-instance-0 .subscribe-checkbox")).get(0).click();
		user.getDriver().findElements(By.cssSelector("#openvidu-instance-0 .send-audio-checkbox")).get(0).click();
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("add-allowed-filter-btn")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		// Configure subscriber
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true),
				"Videos were expected to have a video only track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video"));

		// Analyze Chrome fake video stream without gray filter (GREEN color)
		Map<String, Long> rgb = user.getBrowserUser().getAverageRgbFromVideo(subscriberVideo);
		Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbGreen(rgb), "Video is not average green");

		// Try to apply none allowed filter
		user.getDriver().findElement(By.cssSelector(".other-operations-btn")).click();
		Thread.sleep(1000);

		WebElement filterTypeInput = user.getDriver().findElement(By.id("filter-type-field"));
		filterTypeInput.clear();
		filterTypeInput.sendKeys("NotAllowedFilter");

		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Error [You don't have permissions to apply a filter]"));

		// Try to execute method over not applied filter
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"has no filter applied in session"));

		// Apply allowed video filter
		filterTypeInput.clear();
		filterTypeInput.sendKeys("GStreamerFilter");
		WebElement filterOptionsInput = user.getDriver().findElement(By.id("filter-options-field"));
		filterOptionsInput.clear();
		filterOptionsInput.sendKeys("{\"command\": \"videobalance saturation=0.0\"}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter applied"));

		// Try to apply another filter
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Error [There is already a filter applied"));

		// Analyze Chrome fake video stream with gray filter (GRAY color)
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);
		Thread.sleep(500);
		rgb = user.getBrowserUser().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbGray(rgb), "Video is not average gray");

		// Execute filter method
		WebElement filterMethodInput = user.getDriver().findElement(By.id("filter-method-field"));
		filterMethodInput.clear();
		filterMethodInput.sendKeys("setElementProperty");
		WebElement filterParamsInput = user.getDriver().findElement(By.id("filter-params-field"));
		filterParamsInput.clear();
		filterParamsInput.sendKeys("{\"propertyName\":\"saturation\",\"propertyValue\":\"1.0\"}");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Filter method executed"));

		// Analyze Chrome fake video stream without gray filter (GREEN color)
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);
		Thread.sleep(500);
		rgb = user.getBrowserUser().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbGreen(rgb), "Video is not average green");

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		// Publisher leaves and connects with active filter
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .leave-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
		user.getDriver().findElement(By.id("publisher-settings-btn-0")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .join-btn")).click();
		user.getEventManager().waitUntilEventReaches("connectionCreated", 7);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		// Analyze Chrome fake video stream with gray filter (GRAY color)
		subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video"));
		rgb = user.getBrowserUser().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbGray(rgb), "Video is not average gray");

		// Remove filter
		user.getDriver().findElement(By.cssSelector(".other-operations-btn")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter removed"));
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 6);
		Thread.sleep(1000);

		// Analyze Chrome fake video stream with gray filter (GREEN color)
		rgb = user.getBrowserUser().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbGreen(rgb), "Video is not average green");

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@OnlyKurento
	@DisplayName("Video filter events test")
	void videoFilterEventsTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateFakeVideo");

		log.info("Video filter events test");

		// Configure publisher
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElements(By.cssSelector("#openvidu-instance-0 .subscribe-checkbox")).get(0).click();
		user.getDriver().findElements(By.cssSelector("#openvidu-instance-0 .send-audio-checkbox")).get(0).click();
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);

		WebElement allowedFilterInput = user.getDriver().findElement(By.id("allowed-filter-input"));
		allowedFilterInput.clear();
		allowedFilterInput.sendKeys("ZBarFilter");

		user.getDriver().findElement(By.id("add-allowed-filter-btn")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		// Configure moderator (only subscribe)
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
		user.getDriver().findElement(By.id("session-settings-btn-1")).click();
		Thread.sleep(1000);

		user.getDriver().findElement(By.id("radio-btn-mod")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true),
				"Videos were expected to have only a video track");

		// Publisher applies ZBarCode filter to itself
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .other-operations-btn")).click();
		Thread.sleep(500);
		WebElement input = user.getDriver().findElement(By.id("filter-type-field"));
		input.clear();
		input.sendKeys("ZBarFilter");
		input = user.getDriver().findElement(By.id("filter-options-field"));
		input.clear();
		input.sendKeys("{}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter applied"));

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);

		// Publisher subscribes to CodeFound event for his own stream
		input = user.getDriver().findElement(By.id("filter-event-type-field"));
		input.clear();
		input.sendKeys("CodeFound");
		user.getDriver().findElement(By.id("sub-filter-event-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Filter event listener added"));

		user.getEventManager().waitUntilEventReaches("CodeFound", 2);

		// Publisher unsubscribes from "CodeFound" filter event
		user.getDriver().findElement(By.id("unsub-filter-event-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Filter event listener removed"));

		// In case some filter event was receive while waiting for unsubscription
		user.getEventManager().clearCurrentEvents("CodeFound");

		try {
			// If this active wait finishes successfully, then the removal of the event
			// listener has not worked fine
			user.getEventManager().waitUntilEventReaches("CodeFound", 1, 3, false);
			Assertions.fail("'filterEvent' was received. Filter.removeEventListener() failed");
		} catch (TimeoutException e) {
			log.info("Filter event removal worked fine");
		}

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		// Moderator subscribes to CodeFound event for the Publisher's stream
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .other-operations-btn")).click();
		Thread.sleep(500);
		input = user.getDriver().findElement(By.id("filter-event-type-field"));
		input.clear();
		input.sendKeys("CodeFound");
		user.getDriver().findElement(By.id("sub-filter-event-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Filter event listener added"));

		user.getEventManager().waitUntilEventReaches("CodeFound", 1);

		// Moderator removes the Publisher's filter
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter removed"));

		// In case some filter event was receive while waiting for filter removal
		user.getEventManager().clearCurrentEvents("CodeFound");

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);

		try {
			// If this active wait finishes successfully, then the removal of the filter has
			// not worked fine
			user.getEventManager().waitUntilEventReaches("CodeFound", 1, 3, false);
			Assertions.fail("'filterEvent' was received. Stream.removeFilter() failed");
		} catch (Exception e) {
			System.out.println("Filter removal worked fine");
		}

		gracefullyLeaveParticipants(user, 2);
	}

	private HttpClientBuilder getHttpClientBuilder() {
		HttpClientBuilder builder = HttpClients.custom();
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
		final SSLConnectionSocketFactory sslSocketFactory = SSLConnectionSocketFactoryBuilder.create()
				.setSslContext(sslContext).setHostnameVerifier(NoopHostnameVerifier.INSTANCE).build();
		final HttpClientConnectionManager connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
				.setSSLSocketFactory(sslSocketFactory).build();
		builder.setConnectionManager(connectionManager);
		return builder;
	}

	@Test
	@DisplayName("openvidu-java-client custom HttpClient test")
	void openViduJavaClientCustomHttpClientTest() throws Exception {

		log.info("openvidu-java-client custom HttpClient test");

		// Test all possible combinations: custom Authenticator present and valid,
		// present and wrong and no present; in combination with custom Authorization
		// header present and valid, present and wrong and no present

		final String WRONG_SECRET = "WRONG_SECRET_" + RandomStringUtils.randomAlphanumeric(10);

		final String VALID_BASIC_AUTH = "Basic "
				+ Base64.getEncoder().encodeToString(("OPENVIDUAPP:" + OPENVIDU_SECRET).getBytes());
		final String WRONG_BASIC_AUTH = "Basic "
				+ Base64.getEncoder().encodeToString(("OPENVIDUAPP:" + WRONG_SECRET).getBytes());

		final Collection<Header> VALID_AUTH_HEADER = List
				.of(new BasicHeader(HttpHeaders.AUTHORIZATION, VALID_BASIC_AUTH));
		final Collection<Header> WRONG_AUTH_HEADER = List
				.of(new BasicHeader(HttpHeaders.AUTHORIZATION, WRONG_BASIC_AUTH));

		// 1. No valid certificate with no forgiving SSLContext
		OpenVidu[] customOV = { new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET, HttpClients.custom()) };
		Assertions.assertThrows(OpenViduJavaClientException.class, () -> {
			customOV[0].fetch();
		});

		// 2. No CredentialsProvider, no Authorization header, no secret, 401
		customOV[0] = new OpenVidu(OPENVIDU_URL, getHttpClientBuilder());
		OpenViduHttpException thrown = Assertions.assertThrows(OpenViduHttpException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals(401, thrown.getStatus());

		// 3. No CredentialsProvider, no Authorization header, valid secret, 200
		customOV[0] = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET, getHttpClientBuilder());
		customOV[0].fetch();

		// 4. No CredentialsProvider, no Authorization header, wrong secret, 401
		customOV[0] = new OpenVidu(OPENVIDU_URL, WRONG_SECRET, getHttpClientBuilder());
		thrown = Assertions.assertThrows(OpenViduHttpException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals(401, thrown.getStatus());

		// 5. No CredentialsProvider, wrong Authorization header, no secret, 401
		HttpClientBuilder builder = getHttpClientBuilder();
		builder.setDefaultHeaders(WRONG_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		thrown = Assertions.assertThrows(OpenViduHttpException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals(401, thrown.getStatus());

		// 6. No CredentialsProvider, wrong Authorization header, valid secret, 200
		builder = getHttpClientBuilder();
		builder.setDefaultHeaders(WRONG_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET, builder);
		IllegalStateException thrown2 = Assertions.assertThrows(IllegalStateException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals("AuthScheme is null", thrown2.getMessage());

		// 7. No CredentialsProvider, wrong Authorization header, wrong secret, 401
		builder = getHttpClientBuilder();
		builder.setDefaultHeaders(WRONG_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, WRONG_SECRET, builder);
		thrown2 = Assertions.assertThrows(IllegalStateException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals("AuthScheme is null", thrown2.getMessage());

		// 8. No CredentialsProvider, valid Authorization header, no secret, 200
		builder = getHttpClientBuilder();
		builder.setDefaultHeaders(VALID_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		customOV[0].fetch();

		// 9. No CredentialsProvider, valid Authorization header, valid secret, 200
		builder = getHttpClientBuilder();
		builder.setDefaultHeaders(VALID_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET, builder);
		customOV[0].fetch();

		// 10. No CredentialsProvider, valid Authorization header, wrong secret, 200
		builder = getHttpClientBuilder();
		builder.setDefaultHeaders(VALID_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, WRONG_SECRET, builder);
		customOV[0].fetch();

		// 11. Valid CredentialsProvider, no Authorization header, no secret, 200
		final BasicCredentialsProvider validCredentialsProvider = new BasicCredentialsProvider();
		validCredentialsProvider.setCredentials(new AuthScope(null, -1),
				new UsernamePasswordCredentials("OPENVIDUAPP", OPENVIDU_SECRET.toCharArray()));
		builder = getHttpClientBuilder();
		builder.setDefaultCredentialsProvider(validCredentialsProvider);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		customOV[0].fetch();

		// 12. Valid CredentialsProvider, valid Authorization header, no secret, 200
		builder = getHttpClientBuilder();
		builder.setDefaultCredentialsProvider(validCredentialsProvider);
		builder.setDefaultHeaders(VALID_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		customOV[0].fetch();

		// 13. Valid CredentialsProvider, wrong Authorization header, no secret, 200
		builder = getHttpClientBuilder();
		builder.setDefaultCredentialsProvider(validCredentialsProvider);
		builder.setDefaultHeaders(WRONG_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		thrown2 = Assertions.assertThrows(IllegalStateException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals("AuthScheme is null", thrown2.getMessage());

		// 14. Wrong CredentialsProvider, no Authorization header, no secret, 401
		final BasicCredentialsProvider wrongCredentialsProvider = new BasicCredentialsProvider();
		validCredentialsProvider.setCredentials(new AuthScope(null, -1),
				new UsernamePasswordCredentials("OPENVIDUAPP", WRONG_SECRET.toCharArray()));
		builder = getHttpClientBuilder();
		builder.setDefaultCredentialsProvider(wrongCredentialsProvider);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		thrown = Assertions.assertThrows(OpenViduHttpException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals(401, thrown.getStatus());

		// 15. Wrong CredentialsProvider, valid Authorization header, no secret, 200
		builder = getHttpClientBuilder();
		builder.setDefaultCredentialsProvider(wrongCredentialsProvider);
		builder.setDefaultHeaders(VALID_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		customOV[0].fetch();

		// 16. Wrong CredentialsProvider, wrong Authorization header, no secret
		builder = getHttpClientBuilder();
		builder.setDefaultCredentialsProvider(wrongCredentialsProvider);
		builder.setDefaultHeaders(WRONG_AUTH_HEADER);
		customOV[0] = new OpenVidu(OPENVIDU_URL, builder);
		thrown = Assertions.assertThrows(OpenViduHttpException.class, () -> {
			customOV[0].fetch();
		});
		Assertions.assertEquals(401, thrown.getStatus());
	}

	@Test
	@DisplayName("openvidu-java-client test")
	void openViduJavaClientTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateScreenShare");

		final int width = 1000;
		final int height = 800;
		user.getDriver().manage().window().setSize(new Dimension(width, height));

		log.info("openvidu-java-client test");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		final String customSessionId = "openviduJavaClientSession";
		final String serverDataModerator = "SERVER_DATA_MODERATOR";
		final String serverDataSubscriber = "SERVER_DATA_SUBSCRIBER";
		final String clientDataModerator = "CLIENT_DATA_MODERATOR";
		final String clientDataSubscriber = "CLIENT_DATA_SUBSCRIBER";

		Assertions.assertFalse(OV.fetch(), "OV.fetch() should return false if OV.createSession() has not been called");
		List<Session> sessions = OV.getActiveSessions();
		Assertions.assertEquals(0, sessions.size(), "Expected no active sessions but found " + sessions.size());

		OpenVidu OV2 = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
		SessionProperties props = new SessionProperties.Builder().customSessionId("OTHER_SESSION")
				.recordingMode(RecordingMode.ALWAYS).build();
		OV2.createSession(props);
		Assertions.assertEquals(0, OV.getActiveSessions().size());
		Session session = OV.createSession(new SessionProperties.Builder().customSessionId("OTHER_SESSION")
				.recordingMode(RecordingMode.MANUAL).build());
		Assertions.assertEquals(RecordingMode.ALWAYS, session.getProperties().recordingMode(),
				"OpenVidu#createSession should fetch remote session if it already exists");
		Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false after Session.getActiveSession()");
		session.close();

		SessionProperties properties = new SessionProperties.Builder().customSessionId(customSessionId)
				.mediaMode(MediaMode.ROUTED).recordingMode(RecordingMode.ALWAYS)
				.defaultRecordingProperties(new RecordingProperties.Builder().outputMode(OutputMode.INDIVIDUAL).build())
				.build();
		session = OV.createSession(properties);

		Assertions.assertFalse(session.fetch(), "Session.fetch() should return false after OpenVidu.createSession()");
		Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false after OpenVidu.createSession()");
		sessions = OV.getActiveSessions();
		Assertions.assertEquals(1, sessions.size(), "Expected 1 active session but found " + sessions.size());

		KurentoOptions kurentoOptions = new KurentoOptions.Builder().videoMaxRecvBandwidth(250)
				.allowedFilters(new String[] { "GStreamerFilter" }).build();
		ConnectionProperties moderatorConnectionProperties = new ConnectionProperties.Builder()
				.role(OpenViduRole.MODERATOR).data(serverDataModerator).kurentoOptions(kurentoOptions).build();
		Connection connectionModerator = session.createConnection(moderatorConnectionProperties);

		ConnectionProperties subscriberConnectionProperties = new ConnectionProperties.Builder()
				.type(ConnectionType.WEBRTC).role(OpenViduRole.SUBSCRIBER).data(serverDataSubscriber).build();
		Connection connectionSubscriber = session.createConnection(subscriberConnectionProperties);

		Assertions.assertFalse(session.fetch(), "Session.fetch() should return false after Session.createConnection");
		Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false after Session.fetch()");

		Assertions.assertEquals(0, session.getActiveConnections().size(), "Wrong number of active connections");
		Assertions.assertEquals(2, session.getConnections().size(), "Wrong number of connections");
		Assertions.assertEquals("pending", connectionModerator.getStatus(), "Wrong status property");
		Assertions.assertEquals(OpenViduRole.MODERATOR, connectionModerator.getRole(), "Wrong role property");
		Assertions.assertTrue(connectionModerator.record(), "Wrong record property");
		Assertions.assertNull(connectionModerator.getLocation(), "Wrong location property");
		Assertions.assertNull(connectionModerator.getPlatform(), "Wrong platform property");
		Assertions.assertTrue(connectionModerator.createdAt() > 0, "Wrong createdAt property");
		Assertions.assertNull(connectionModerator.activeAt(), "Wrong activeAt property");
		Assertions.assertNull(connectionModerator.getClientData(), "Wrong clientData property");
		Assertions.assertEquals(0, connectionModerator.getPublishers().size(), "Wrong publishers property");
		Assertions.assertEquals(0, connectionModerator.getSubscribers().size(), "Wrong subscribers property");

		// Set client data 1
		WebElement clientDataInput = user.getDriver().findElement(By.cssSelector("#client-data-input-0"));
		clientDataInput.clear();
		clientDataInput.sendKeys(clientDataModerator);

		// Set token 1
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		WebElement tokeInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokeInput.clear();
		tokeInput.sendKeys(connectionModerator.getToken());

		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		// Set client data 2
		clientDataInput = user.getDriver().findElement(By.cssSelector("#client-data-input-1"));
		clientDataInput.clear();
		clientDataInput.sendKeys(clientDataSubscriber);

		// Set token 2
		user.getDriver().findElement(By.id("session-settings-btn-1")).click();
		Thread.sleep(1000);
		tokeInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokeInput.clear();
		tokeInput.sendKeys(connectionSubscriber.getToken());

		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		// Moderator sends only video
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .active-audio-checkbox")).click();

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser().assertMediaTracks(
				(WebElement) user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video")), false, true,
				"#openvidu-instance-0"), "Moderator video was expected to have audio only track");
		Assertions.assertTrue(user.getBrowserUser().assertMediaTracks(
				(WebElement) user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video")), true, true,
				"#openvidu-instance-1"), "Subscriber video was expected to have audio and video tracks");

		Assertions.assertTrue(OV.fetch(), "Session.fetch() should return true after users connected");
		Assertions.assertFalse(session.fetch(),
				"Session.fetch() should return false after OpenVidu.fetch() has been called");

		// Verify session properties and status
		Assertions.assertEquals(customSessionId, session.getSessionId(), "Wrong sessionId");
		Assertions.assertEquals(RecordingMode.ALWAYS, session.getProperties().recordingMode(), "Wrong recording mode");
		Assertions.assertEquals(Recording.OutputMode.INDIVIDUAL,
				session.getProperties().defaultRecordingProperties().outputMode(), "Wrong default output mode");
		Assertions.assertEquals(false, session.getProperties().defaultRecordingProperties().ignoreFailedStreams(),
				"Wrong default ignoreFailedStreams");
		Assertions.assertTrue(session.isBeingRecorded(), "Session should be being recorded");
		Assertions.assertEquals(2, session.getActiveConnections().size(),
				"Expected 2 active connections but found " + session.getActiveConnections().size());

		// Verify status
		Assertions.assertEquals("active", connectionModerator.getStatus(), "Wrong status for moderator connection");
		Assertions.assertEquals("active", connectionSubscriber.getStatus(), "Wrong status for subscriber connection");

		// Verify createdAt and activeAt
		Assertions.assertTrue(connectionModerator.createdAt() > 0, "Wrong createdAt property");
		Assertions.assertTrue(connectionModerator.activeAt() > 0, "Wrong activeAt property");
		Assertions.assertTrue(connectionModerator.activeAt() > connectionModerator.createdAt(),
				"Wrong activeAt property");

		// Verify platform
		Assertions.assertTrue(connectionModerator.getPlatform().startsWith("Chrome"),
				"Wrong platform for moderator connection");
		Assertions.assertTrue(connectionSubscriber.getPlatform().startsWith("Chrome"),
				"Wrong platform for subscriber connection");

		// Verify publishers
		Assertions.assertEquals(1, connectionModerator.getPublishers().size(), "Expected 1 publisher for connection "
				+ connectionModerator.getConnectionId() + " but found " + connectionModerator.getPublishers().size());
		Assertions.assertEquals(0, connectionSubscriber.getPublishers().size(), "Expected 0 publishers for connection "
				+ connectionSubscriber.getConnectionId() + " but found " + connectionSubscriber.getPublishers().size());

		// Verify subscribers
		Assertions.assertEquals(0, connectionModerator.getSubscribers().size(), "Expected 0 subscribers for connection "
				+ connectionModerator.getConnectionId() + " but found " + connectionModerator.getSubscribers().size());
		Assertions.assertEquals(1, connectionSubscriber.getSubscribers().size(),
				"Expected 1 subscriber for connection " + connectionSubscriber.getConnectionId() + " but found "
						+ connectionSubscriber.getSubscribers().size());
		Assertions.assertEquals(connectionModerator.getPublishers().get(0).getStreamId(),
				connectionSubscriber.getSubscribers().get(0), "Publisher and subscriber should have same streamId");

		// Verify server and client data
		Assertions.assertEquals(serverDataModerator, connectionModerator.getServerData(), "Server data doesn't match");
		Assertions.assertEquals(serverDataSubscriber, connectionSubscriber.getServerData(),
				"Server data doesn't match");
		Assertions.assertEquals(clientDataModerator, connectionModerator.getClientData(), "Client data doesn't match");
		Assertions.assertEquals(clientDataSubscriber, connectionSubscriber.getClientData(),
				"Client data doesn't match");

		// Verify publisher properties
		Publisher pub = connectionModerator.getPublishers().get(0);
		Assertions.assertEquals("{\"width\":640,\"height\":480}", pub.getVideoDimensions());
		Assertions.assertEquals(Integer.valueOf(30), pub.getFrameRate());
		Assertions.assertEquals("CAMERA", pub.getTypeOfVideo());
		Assertions.assertTrue(pub.hasVideo());
		Assertions.assertTrue(pub.isVideoActive());
		Assertions.assertTrue(pub.hasAudio());
		Assertions.assertFalse(pub.isAudioActive());

		waitUntilFileExistsAndIsBiggerThan("/opt/openvidu/recordings/" + customSessionId + "/" + pub.getStreamId() + "."
				+ this.getIndividualRecordingExtension(), 200, 60);

		Assertions.assertFalse(session.fetch(), "Session.fetch() should return false");
		Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false");

		// Change publisher dynamically
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .change-publisher-btn")).click();

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		try {
			// FIX: Chrome now shows an infobar when screen sharing that triggers
			// streamPropertyChanged event for videoDimensions of Publisher
			// Wait until this is triggered to not affect future assertions
			user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 1);
		} catch (Exception e) {
			log.warn(
					"Screen sharing publisher didn't trigger streamPropertyChanged event for videoDimensions (screen sharing infobar)");
		}

		Assertions.assertTrue(session.fetch(), "Session.fetch() should return true after publisher changed");
		Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false after Session.fetch()");

		// Verify new publisher properties
		if (OpenViduRole.MODERATOR.equals(session.getActiveConnections().get(0).getRole())) {
			connectionModerator = session.getActiveConnections().get(0);
			connectionSubscriber = session.getActiveConnections().get(1);
		} else {
			connectionModerator = session.getActiveConnections().get(1);
			connectionSubscriber = session.getActiveConnections().get(0);
		}
		pub = connectionModerator.getPublishers().get(0);

		// Using a local or dockerized browser may vary the height value in 1 unit
		String validDimensions = "{\"width\":" + width + ",\"height\":" + height + "}";

		Assertions.assertTrue(validDimensions.equals(pub.getVideoDimensions()),
				"Wrong video dimensions. Expected: " + validDimensions + " but actual: " + pub.getVideoDimensions());

		Assertions.assertEquals(Integer.valueOf(30), pub.getFrameRate());
		Assertions.assertEquals("SCREEN", pub.getTypeOfVideo());
		Assertions.assertTrue(pub.hasVideo());
		Assertions.assertTrue(pub.isVideoActive());
		Assertions.assertFalse(pub.hasAudio());
		Assertions.assertNull(pub.isAudioActive());

		// Test recording
		RecordingProperties recordingProperties;
		try {
			OV.startRecording("NOT_EXISTS");
			Assertions.fail("Expected OpenViduHttpException");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(404, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}
		Session sessionAux = OV.createSession();
		Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false");
		try {
			OV.startRecording(sessionAux.getSessionId());
			Assertions.fail("Expected OpenViduHttpException");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(406, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		} finally {
			Assertions.assertFalse(sessionAux.fetch(), "Session.fetch() should return false");
			sessionAux.close();
			try {
				sessionAux.fetch();
				Assertions.fail("Expected OpenViduHttpException");
			} catch (OpenViduHttpException e2) {
				Assertions.assertEquals(404, e2.getStatus(), "Wrong HTTP status on Session.fetch()");
			}
			Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false");
		}
		// Recorded session
		try {
			recordingProperties = new RecordingProperties.Builder().hasAudio(false).hasVideo(false).build();
			OV.startRecording(session.getSessionId(), recordingProperties);
			Assertions.fail("Expected OpenViduHttpException");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(409, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}
		try {
			recordingProperties = new RecordingProperties.Builder().resolution("99x1080").build();
			OV.startRecording(session.getSessionId(), recordingProperties);
			Assertions.fail("Expected OpenViduHttpException");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(409, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}
		try {
			OV.startRecording(session.getSessionId());
			Assertions.fail("Expected OpenViduHttpException");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(409, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}

		List<Recording> recordings = OV.listRecordings();
		Assertions.assertEquals(1, recordings.size(), "There should be only 1 recording");
		Recording recording = recordings.get(0);
		Assertions.assertEquals(recording.getId(), recording.getName(), "Recording id and name should be equal");
		Assertions.assertEquals(session.getSessionId(), recording.getId(),
				"Recording id and sessionId should be equal");

		// Check ongoing recording properties
		Assertions.assertEquals(session.getSessionId(), recording.getSessionId(), "Wrong recording session id");
		Assertions.assertEquals(0, recording.getDuration(), 0.0001, "Wrong recording duration");
		Assertions.assertEquals(0, recording.getSize(), "Wrong recording size");
		Assertions.assertNull(recording.getUrl(), "Wrong recording url");
		Assertions.assertEquals(Recording.OutputMode.INDIVIDUAL, recording.getOutputMode(),
				"Wrong recording output mode");
		Assertions.assertEquals(false, recording.ignoreFailedStreams(), "Wrong recording ignoreFailedStreams");
		Assertions.assertNull(recording.getRecordingLayout(), "Wrong recording layout");
		Assertions.assertNull(recording.getCustomLayout(), "Wrong recording custom layout");
		Assertions.assertNull(recording.getResolution(), "Wrong recording resolution");
		Assertions.assertNull(recording.getFrameRate(), "Wrong recording frameRate");
		Assertions.assertEquals(Recording.Status.started, recording.getStatus(), "Wrong recording status");
		Assertions.assertTrue(recording.hasAudio(), "Wrong recording hasAudio");
		Assertions.assertTrue(recording.hasVideo(), "Wrong recording hasVideo");

		// Wait until new stream has been recorded to disk
		session.fetch();
		String streamId = session.getActiveConnections().stream().filter(c -> c.getPublishers().size() > 0).findFirst()
				.get().getPublishers().get(0).getStreamId();
		waitUntilFileExistsAndIsBiggerThan("/opt/openvidu/recordings/" + recording.getId() + "/" + streamId + "."
				+ this.getIndividualRecordingExtension(), 200, 60);

		try {
			OV.stopRecording("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(404, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}
		recording = OV.stopRecording(recording.getId());

		user.getEventManager().waitUntilEventReaches("recordingStopped", 1);

		Assertions.assertTrue(recording.getDuration() > 0,
				"Wrong recording duration. Expected > 0 and was " + recording.getDuration());
		Assertions.assertTrue(recording.getSize() > 0,
				"Wrong recording size. Excepected > 0 and was " + recording.getSize());
		Assertions.assertNotNull(recording.getUrl(), "Wrong recording url");
		Assertions.assertEquals(Recording.Status.ready, recording.getStatus(),
				"Wrong recording status. Expected ready and was " + recording.getStatus().name());
		Assertions.assertFalse(session.isBeingRecorded(), "Session shouldn't be being recorded");
		Assertions.assertFalse(OV.fetch(), "OpenVidu.fetch() should return false");

		this.recordingUtils.checkIndividualRecording("/opt/openvidu/recordings/" + customSessionId + "/", recording, 2,
				"opus", "vp8", false);

		// Not recorded session
		try {
			recordingProperties = new RecordingProperties.Builder().hasAudio(false).hasVideo(false).build();
			OV.startRecording(session.getSessionId(), recordingProperties);
			Assertions.fail("Expected OpenViduHttpException");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(422, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}
		try {
			recordingProperties = new RecordingProperties.Builder().resolution("99x1080").build();
			OV.startRecording(session.getSessionId(), recordingProperties);
			Assertions.fail("Expected OpenViduHttpException");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(422, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .change-publisher-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 3);
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 6);

		Assertions.assertTrue(session.fetch(), "Session.fetch() should return true");

		final String customRecordingName = "CUSTOM_NAME";
		recordingProperties = new RecordingProperties.Builder().outputMode(Recording.OutputMode.COMPOSED)
				.recordingLayout(RecordingLayout.BEST_FIT).resolution("1280x720").hasVideo(true).hasAudio(false)
				.name(customRecordingName).build();

		// Start recording method should block until video exists and size > 0
		Recording recording2 = OV.startRecording(session.getSessionId(), recordingProperties);
		recording2 = OV.stopRecording(recording2.getId());
		Assertions.assertEquals(Recording.Status.ready, recording2.getStatus(), "Wrong recording status");
		OV.deleteRecording(recording2.getId());

		recording2 = OV.startRecording(session.getSessionId(), recordingProperties);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		Assertions.assertEquals(customRecordingName, recording2.getName(), "Wrong recording name");
		Assertions.assertEquals(session.getSessionId() + "~1", recording2.getId(), "Wrong recording id");
		Assertions.assertEquals(session.getSessionId(), recording2.getSessionId(), "Wrong recording session id");
		Assertions.assertEquals(0, recording2.getDuration(), 0.0001, "Wrong recording duration");
		Assertions.assertEquals(0, recording2.getSize(), "Wrong recording size");
		Assertions.assertNull(recording2.getUrl(), "Wrong recording url");
		Assertions.assertEquals(Recording.OutputMode.COMPOSED, recording2.getOutputMode(),
				"Wrong recording output mode");
		Assertions.assertEquals(RecordingLayout.BEST_FIT, recording2.getRecordingLayout(), "Wrong recording layout");
		Assertions.assertNull(recording2.getCustomLayout(), "Wrong recording custom layout");
		Assertions.assertEquals("1280x720", recording2.getResolution(), "Wrong recording resolution");
		Assertions.assertEquals(25, recording2.getFrameRate().intValue(), "Wrong recording frameRate");
		Assertions.assertEquals(Recording.Status.started, recording2.getStatus(), "Wrong recording status");
		Assertions.assertFalse(recording2.hasAudio(), "Wrong recording hasAudio");
		Assertions.assertTrue(recording2.hasVideo(), "Wrong recording hasVideo");

		Thread.sleep(7000);

		recording2 = OV.stopRecording(recording2.getId());

		user.getEventManager().waitUntilEventReaches("recordingStopped", 3);

		Assertions.assertTrue(recording2.getSize() > 0, "Wrong recording size");
		Assertions.assertNotNull(recording2.getUrl(), "Wrong recording url");
		Assertions.assertEquals(Recording.Status.ready, recording2.getStatus(), "Wrong recording status");
		Assertions.assertTrue(recording2.getDuration() > 0, "Wrong recording duration");
		Assertions.assertFalse(session.isBeingRecorded(), "Session shouldn't be being recorded");
		Assertions.assertFalse(session.fetch(), "Session.fetch() should return false");

		String recordingsPath = "/opt/openvidu/recordings/" + customSessionId + "~1/";
		File file1 = new File(recordingsPath + customRecordingName + ".mp4");
		File file2 = new File(recordingsPath + ".recording." + recording2.getId());
		File file3 = new File(recordingsPath + recording2.getId() + ".jpg");

		Assertions.assertTrue(file1.exists() && file1.length() > 0,
				"File " + file1.getAbsolutePath() + " does not exist or is empty");
		Assertions.assertTrue(file2.exists() && file2.length() > 0,
				"File " + file2.getAbsolutePath() + " does not exist or is empty");
		Assertions.assertTrue(file3.exists() && file3.length() > 0,
				"File " + file3.getAbsolutePath() + " does not exist or is empty");

		Assertions.assertTrue(this.recordingUtils.recordedGreenFileFine(file1, recording2),
				"Recorded file " + file1.getAbsolutePath() + " is not fine");
		Assertions.assertTrue(this.recordingUtils.thumbnailIsFine(file3, RecordingUtils::checkVideoAverageRgbGreen),
				"Thumbnail " + file3.getAbsolutePath() + " is not fine");

		try {
			OV.deleteRecording("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(404, e.getStatus(), "Wrong HTTP status on OpenVidu.startRecording()");
		}
		OV.deleteRecording(recording.getId());
		OV.deleteRecording(recording2.getId());

		Assertions.assertEquals(0, OV.listRecordings().size(), "There shouldn't be any recordings");

		try {
			session.forceUnpublish("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(404, e.getStatus(), "Wrong HTTP status on Session.forceUnpublish()");
		}
		try {
			session.forceDisconnect("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(404, e.getStatus(), "Wrong HTTP status on Session.forceDisconnect()");
		}

		if (OpenViduRole.MODERATOR.equals(session.getActiveConnections().get(0).getRole())) {
			connectionModerator = session.getActiveConnections().get(0);
			connectionSubscriber = session.getActiveConnections().get(1);
		} else {
			connectionModerator = session.getActiveConnections().get(1);
			connectionSubscriber = session.getActiveConnections().get(0);
		}
		pub = connectionModerator.getPublishers().get(0);

		// TODO: test delete unused Connection

		session.forceUnpublish(pub);
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 6);
		Assertions.assertFalse(OV.fetch(),
				"OpenVidu.fetch() should return false because Session.forceUnpublish() already updates local objects");

		session.getActiveConnections().forEach(con -> {
			Assertions.assertEquals(0, con.getPublishers().size(), "Wrong number of Publishers");
			Assertions.assertEquals(0, con.getSubscribers().size(), "Wrong number of Subscribers");
		});

		// Delete active Connection
		session.forceDisconnect(connectionModerator);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
		Assertions.assertFalse(OV.fetch(),
				"OpenVidu.fetch() should return false because Session.forceDisconnect() already updates local objects");

		session.close();

		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 2);

		Assertions.assertFalse(OV.fetch(), "Session.fetch() should return true");

		// Delete pending Connection
		session = OV.createSession();
		Connection con = session.createConnection();
		Assertions.assertEquals(1, session.getConnections().size(), "Wrong number of Connections");
		Assertions.assertEquals(0, session.getActiveConnections().size(), "Wrong number of active Connections");
		Assertions.assertFalse(session.fetch());
		session.forceDisconnect(con);
		Assertions.assertEquals(0, session.getConnections().size(), "Wrong number of Connections");
		Assertions.assertEquals(0, session.getActiveConnections().size(), "Wrong number of active Connections");
		Assertions.assertFalse(session.fetch());
	}

	@Test
	@OnlyKurento
	@DisplayName("openvidu-java-client IP cam and transcoding test")
	void openViduJavaClientTestIpCamAndTranscoding() throws Exception {

		SessionProperties properties = new SessionProperties.Builder().mediaMode(MediaMode.ROUTED)
				.recordingMode(RecordingMode.ALWAYS)
				.defaultRecordingProperties(new RecordingProperties.Builder().outputMode(OutputMode.INDIVIDUAL).build())
				.build();
		Session session = OV.createSession(properties);

		Assertions.assertFalse(session.fetch(), "Session.fetch() should return false");
		Assertions.assertFalse(session.isBeingRecorded(), "Wrong recording property");

		// Test IPCAM
		final String rtsp = "rtsp://dummyurl.com";
		Connection ipcamera = session.createConnection(new ConnectionProperties.Builder().type(ConnectionType.IPCAM)
				.rtspUri(rtsp).adaptativeBitrate(false).onlyPlayWithSubscribers(false).networkCache(50).build());

		// Give some time for the recording to start in background
		Thread.sleep(3000);

		// New stream should automatically start recording with ALWAYS recording mode
		Assertions.assertFalse(session.isBeingRecorded(), "Wrong recording property");
		Assertions.assertTrue(session.fetch(), "OpenVidu.fetch() should return true");
		Assertions.assertTrue(session.isBeingRecorded(), "Wrong recording property");

		Assertions.assertFalse(OV.fetch(), "Session.fetch() should return false");
		Assertions.assertEquals(1, session.getActiveConnections().size(), "Wrong number of active connections");
		Assertions.assertEquals(1, session.getConnections().size(), "Wrong number of connections");
		ipcamera = session.getConnection(ipcamera.getConnectionId());
		Assertions.assertEquals("IPCAM", ipcamera.getType().name(), "Wrong type property of Connection object");
		Assertions.assertNull(ipcamera.getRole(), "Property role of an IPCAM connection should be null");
		Assertions.assertEquals(rtsp, ipcamera.getRtspUri(), "Wrong property rtspUri");
		Assertions.assertFalse(ipcamera.adaptativeBitrate(), "Wrong property adaptativeBitrate");
		Assertions.assertFalse(ipcamera.onlyPlayWithSubscribers(), "Wrong property onlyPlayWithSubscribers");
		Assertions.assertEquals(Integer.valueOf(50), ipcamera.getNetworkCache(), "Wrong property networkCache");

		session.close();

		/** Test transcoding defined properties */
		SessionProperties.Builder basePropertiesBuilder = new SessionProperties.Builder().mediaMode(MediaMode.ROUTED)
				.recordingMode(RecordingMode.ALWAYS).defaultRecordingProperties(
						new RecordingProperties.Builder().outputMode(OutputMode.INDIVIDUAL).build());

		SessionProperties propertiesDefaultCodec = basePropertiesBuilder.build();
		SessionProperties propertiesH264AllowTranscoding = basePropertiesBuilder.forcedVideoCodec(VideoCodec.H264)
				.allowTranscoding(true).build();
		SessionProperties propertiesVP9AllowTranscoding = basePropertiesBuilder.forcedVideoCodec(VideoCodec.VP9)
				.allowTranscoding(true).build();

		Session sessionDefaultCodec = OV.createSession(propertiesDefaultCodec);
		Session sessionH264AllowTranscoding = OV.createSession(propertiesH264AllowTranscoding);
		Session sessionVP9AllowTranscoding = OV.createSession(propertiesVP9AllowTranscoding);
		assertTranscodingSessionProperties(sessionDefaultCodec, sessionH264AllowTranscoding,
				sessionVP9AllowTranscoding);

		// Fetch sessions
		Assertions.assertFalse(sessionDefaultCodec.fetch());
		Assertions.assertFalse(sessionH264AllowTranscoding.fetch());
		Assertions.assertFalse(sessionVP9AllowTranscoding.fetch());

		// Check transcoding session properties
		assertTranscodingSessionProperties(sessionDefaultCodec, sessionH264AllowTranscoding,
				sessionVP9AllowTranscoding);

		// Fetch all sessions
		Assertions.assertFalse(OV.fetch());

		// Check transcoding session properties
		assertTranscodingSessionProperties(sessionDefaultCodec, sessionH264AllowTranscoding,
				sessionVP9AllowTranscoding);

		sessionDefaultCodec.close();
		sessionH264AllowTranscoding.close();
		sessionVP9AllowTranscoding.close();
	}

	@Test
	@OnlyKurento
	@DisplayName("REST API test")
	void restApiTest() throws Exception {
		isRecordingTest = true;

		log.info("REST API test");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		// 401
		String wrongCredentials = "Basic "
				+ Base64.getEncoder().encodeToString(("OPENVIDUAPP:WRONG_SECRET").getBytes());
		Assertions.assertEquals(HttpURLConnection.HTTP_UNAUTHORIZED,
				restClient.getAndReturnStatus("/openvidu/api/config", wrongCredentials),
				"Expected unauthorized status");

		/** GET /openvidu/api/sessions (before session created) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/NOT_EXISTS", HttpURLConnection.HTTP_NOT_FOUND);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpURLConnection.HTTP_OK, true, true, true,
				"{'numberOfElements': 0, 'content': []}");

		/** POST /openvidu/api/sessions **/
		// 400
		String body = "{'mediaMode': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'ALWAYS', 'customSessionId': 999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED',  'recordingMode': 'ALWAYS', 'defaultRecordingProperties': 'STR'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'ALWAYS', 'defaultRecordingProperties': {'outputMode': 'NOT_EXISTS'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'ALWAYS', 'defaultRecordingProperties': {'outputMode': 'COMPOSED', 'recordingLayout': 'NOT_EXISTS'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_BAD_REQUEST);

		// 200
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'MANUAL', 'customSessionId': 'CUSTOM_SESSION_ID', 'defaultRecordingProperties': {'outputMode': 'COMPOSED', 'recordingLayout': 'BEST_FIT'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK, true, false, true,
				DEFAULT_JSON_SESSION);
		// Default values
		JsonObject res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{}", HttpURLConnection.HTTP_OK,
				true, false, true, DEFAULT_JSON_SESSION);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/" + res.get("id").getAsString(),
				HttpURLConnection.HTTP_NO_CONTENT);

		// 409
		body = "{'customSessionId': 'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_CONFLICT);

		/** GET /openvidu/api/sessions (after session created) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null, HttpURLConnection.HTTP_OK,
				true, false, true, DEFAULT_JSON_SESSION);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpURLConnection.HTTP_OK, true, true, false,
				"{'numberOfElements': 1, 'content': []}");

		/** GET /openvidu/api/sessions/ID/connection (with no connections) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/NOT_EXISTS/connection",
				HttpURLConnection.HTTP_NOT_FOUND);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null,
				HttpURLConnection.HTTP_OK, true, true, true, "{'numberOfElements':0,'content':[]}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/NOT_EXISTS/connection/NOT_EXISTS",
				HttpURLConnection.HTTP_BAD_REQUEST);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/NOT_EXISTS",
				HttpURLConnection.HTTP_NOT_FOUND);

		/** POST /openvidu/api/tokens **/
		// 400
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 'SERVER_DATA', 'kurentoOptions': false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 'SERVER_DATA', 'kurentoOptions': {'allowedFilters': 'NOT_EXISTS'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpURLConnection.HTTP_BAD_REQUEST);

		// 200
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 'SERVER_DATA', 'kurentoOptions': {'videoMaxSendBandwidth':777,'allowedFilters': ['GStreamerFilter']}}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpURLConnection.HTTP_OK, true, false,
				true, mergeJson(DEFAULT_JSON_TOKEN,
						"{'kurentoOptions':{'videoMaxSendBandwidth':777,'allowedFilters':['STR']}}", new String[0]));
		final String token1 = res.get("token").getAsString();
		Assertions.assertEquals(res.get("id").getAsString(), token1,
				"JSON return value from /openvidu/api/tokens should have equal srtings in 'id' and 'token'");
		Assertions.assertEquals("CUSTOM_SESSION_ID", res.get("session").getAsString(), "Wrong session parameter");
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null,
				HttpURLConnection.HTTP_OK, true, true, false, "{'numberOfElements':1,'content':[]}");
		JsonObject connection1 = res.getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject();
		final String connectionId1 = connection1.get("id").getAsString();
		final long createdAt1 = connection1.get("createdAt").getAsLong();

		/** POST /openvidu/api/sessions/CUSTOM_SESSION_ID/connection **/
		// 400
		body = "{'type':false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'type':'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'type':'WEBRTC','role':123}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'type':'WEBRTC','role':123}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'type':'WEBRTC','role':'MODERATOR','data':true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);

		// 400 - Test some not valid customIceServers configured
		body = "{'customIceServers': [{'url':'bad-ice-server'}]}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);

		body = "{'customIceServers': [{'url':'turn:bad-ice-server'}]}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);

		body = "{'customIceServers': [{'url':'bad-prefix:bad-ice-server'}]}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_BAD_REQUEST);

		// 200
		String kurentoOpts = "'kurentoOptions':{'videoMaxSendBandwidth':777,'allowedFilters':['GStreamerFilter']}";
		body = "{'type':'WEBRTC','role':'MODERATOR','data':'SERVER_DATA'," + kurentoOpts + "}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_OK, true, false, true,
				mergeJson(DEFAULT_JSON_PENDING_CONNECTION, "{" + kurentoOpts + "}", new String[0]));
		restClient.rest(HttpMethod.DELETE,
				"/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + res.get("id").getAsString(),
				HttpURLConnection.HTTP_NO_CONTENT);

		// 200 - Test some good Ice Servers configured
		String goodTurn = "{'url': 'turn:valid-domain.es', 'username': 'user', 'credential': 'pass'}";
		String goodStun = "{'url': 'stun:valid-domain.es:1234'}";
		body = "{ 'customIceServers': [" + goodTurn + "," + goodStun + "]}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_OK, true, false, true, mergeJson(DEFAULT_JSON_PENDING_CONNECTION,
						"{ 'customIceServers': [" + goodTurn + "," + goodStun + "] }", new String[0]));
		restClient.rest(HttpMethod.DELETE,
				"/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + res.get("id").getAsString(),
				HttpURLConnection.HTTP_NO_CONTENT);

		// Default values
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", "{}",
				HttpURLConnection.HTTP_OK);
		final String token2 = res.get("token").getAsString();
		final String connectionId2 = res.get("id").getAsString();

		/** GET /openvidu/api/sessions (with pending connections) **/
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null,
				HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_SESSION);
		Assertions.assertEquals(0, res.get("connections").getAsJsonObject().get("numberOfElements").getAsInt(),
				"GET session should not bring pending connections");
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID?pendingConnections=true", null,
				HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_SESSION);
		Assertions.assertEquals(2, res.get("connections").getAsJsonObject().get("numberOfElements").getAsInt(),
				"GET session should bring pending connections if query params pendingConnections=true");

		/** GET /openvidu/api/sessions/ID/connection (with pending connections) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null,
				HttpURLConnection.HTTP_OK, true, true, false, "{'numberOfElements':2,'content':[]}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId1, null,
				HttpURLConnection.HTTP_OK, true, true, true,
				mergeJson(DEFAULT_JSON_PENDING_CONNECTION,
						"{'id':'" + connectionId1 + "','connectionId':'" + connectionId1
								+ "','sessionId':'CUSTOM_SESSION_ID','token':'" + token1
								+ "','serverData':'SERVER_DATA','role':'MODERATOR'," + kurentoOpts + ",'createdAt':"
								+ createdAt1 + "}",
						new String[0]));

		/** POST /openvidu/api/signal (NOT ACTIVE SESSION) **/
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','to':12}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','to':[],'data':false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','to':[],'data': 'SERVERMESSAGE', 'type': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_NOT_ACCEPTABLE); // No
																												// connections

		/** POST /openvidu/api/recordings/start (NOT ACTIVE SESSION) **/
		// 400
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);

		// 404
		body = "{'session':'SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_NOT_FOUND);
		body = "{'session':'SESSION_ID','name':999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_NOT_FOUND);

		// 406
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_NOT_ACCEPTABLE);

		// 409 (RELAYED media mode)
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'mediaMode':'RELAYED'}",
				HttpURLConnection.HTTP_OK, true, false, false, DEFAULT_JSON_SESSION);
		body = "{'session':'" + res.get("id").getAsString() + "'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_CONFLICT);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/" + res.get("id").getAsString(),
				HttpURLConnection.HTTP_NO_CONTENT);

		// Start session
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		user.getDriver().findElement(By.id("one2one-btn")).click();
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);

		// Set token 1
		WebElement tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokenInput.clear();
		tokenInput.sendKeys(token1);

		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("session-settings-btn-1")).click();
		Thread.sleep(1000);

		// Set token 2
		tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokenInput.clear();
		tokenInput.sendKeys(token2);
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		/** GET /openvidu/api/sessions/ID/connection (with active connections) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null,
				HttpURLConnection.HTTP_OK, true, true, false, "{'numberOfElements':2,'content':[]}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId1, null,
				HttpURLConnection.HTTP_OK, false, true, false,
				"{'id':'" + connectionId1 + "','connectionId':'" + connectionId1
						+ "','object':'connection','type':'WEBRTC','status':'active','sessionId':'CUSTOM_SESSION_ID','token':'"
						+ token1 + "','role':'MODERATOR','serverData':'SERVER_DATA','record':true}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId2, null,
				HttpURLConnection.HTTP_OK, false, true, false,
				"{'id':'" + connectionId2 + "','connectionId':'" + connectionId2
						+ "','object':'connection','type':'WEBRTC','status':'active','sessionId':'CUSTOM_SESSION_ID','token':'"
						+ token2 + "','role':'PUBLISHER','serverData':'','record':true}");

		/** GET /openvidu/api/recordings (before recording started) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings/NOT_EXISTS", HttpURLConnection.HTTP_NOT_FOUND);
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings", null, HttpURLConnection.HTTP_OK, true, true, true,
				"{'count':0,'items':[]}");

		/** POST /openvidu/api/recordings/start (ACTIVE SESSION) **/
		// 400
		body = "{'session': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','name':999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','name':'notalphanumeric@'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'resolution':999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'frameRate':true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_BAD_REQUEST);

		// 422
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME~','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':false,'hasVideo':false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, 422);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'resolution':'1920x2000'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, 422);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'resolution':'99x1080'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, 422);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'frameRate':0}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, 422);
		body = "{'session':'CUSTOM_SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'frameRate':121}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, 422);

		// 200
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_OK, true, false,
				true,
				"{'id':'STR','object':'STR','sessionId':'STR','name':'STR','outputMode':'STR','recordingLayout':'STR','hasAudio':false,'hasVideo':false,'resolution':'STR','frameRate':0,'createdAt':0,'size':0,'duration':0,'url':null,'status':'STR'}");

		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		Thread.sleep(2000);

		// 409 (already recording)
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpURLConnection.HTTP_CONFLICT);

		/** POST /openvidu/api/recordings/stop **/
		// 405
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop", body, HttpURLConnection.HTTP_BAD_METHOD);

		// 404
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/NOT_EXISTS", body,
				HttpURLConnection.HTTP_NOT_FOUND);

		// 200
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings/CUSTOM_SESSION_ID",
				HttpURLConnection.HTTP_CONFLICT);
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/CUSTOM_SESSION_ID", body,
				HttpURLConnection.HTTP_OK, true, false, true,
				"{'id':'STR','object':'STR','sessionId':'STR','name':'STR','outputMode':'STR','recordingLayout':'STR','hasAudio':false,'hasVideo':false,'resolution':'STR','frameRate':0,'createdAt':0,'size':0,'duration':0,'url':'STR','status':'STR'}");
		/** GET /openvidu/api/recordings (after recording created) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings/CUSTOM_SESSION_ID", null, HttpURLConnection.HTTP_OK,
				true, false, true,
				"{'id':'STR','object':'STR','sessionId':'STR','name':'STR','outputMode':'STR','recordingLayout':'STR','hasAudio':false,'hasVideo':false,'resolution':'STR','frameRate':0,'createdAt':0,'size':0,'duration':0,'url':'STR','status':'STR'}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings", null, HttpURLConnection.HTTP_OK, true, true, false,
				"{'count':1,'items':[]}");

		user.getEventManager().waitUntilEventReaches("recordingStopped", 2);

		/** DELETE /openvidu/api/recordings **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings", HttpURLConnection.HTTP_BAD_METHOD);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings/NOT_EXISTS", HttpURLConnection.HTTP_NOT_FOUND);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings/CUSTOM_SESSION_ID",
				HttpURLConnection.HTTP_NO_CONTENT);

		// GET /openvidu/api/recordings should return empty again
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings", null, HttpURLConnection.HTTP_OK, true, true, true,
				"{'count':0,'items':[]}");

		/** DELETE /openvidu/api/sessions/<SESSION_ID>/stream/<STREAM_ID> **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/NOT_EXISTS/stream/NOT_EXISTS",
				HttpURLConnection.HTTP_BAD_REQUEST);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/stream/NOT_EXISTS",
				HttpURLConnection.HTTP_NOT_FOUND);
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null,
				HttpURLConnection.HTTP_OK, true, false, true,
				"{'id':'STR','object':'STR','sessionId':'STR','createdAt':0,'mediaMode':'STR','recordingMode':'STR','defaultRecordingProperties':{'hasVideo':true,'frameRate':25,"
						+ "'hasAudio':true,'shmSize':536870912,'name':'','outputMode':'COMPOSED','resolution':'1280x720','recordingLayout':'BEST_FIT'},'customSessionId':'STR','connections':{'numberOfElements':2,'content'"
						+ ":[{'connectionId':'STR','createdAt':0,'location':'STR','ip':'STR','platform':'STR','token':'STR','role':'STR','serverData':'STR','clientData':'STR','publishers':["
						+ "{'createdAt':0,'streamId':'STR','mediaOptions':{'hasAudio':false,'audioActive':false,'hasVideo':false,'videoActive':false,'typeOfVideo':'STR','frameRate':0,"
						+ "'videoDimensions':'STR','filter':{}}}],'subscribers':[{'createdAt':0,'streamId':'STR','publisher':'STR'}]},{'connectionId':'STR','createdAt':0,'location':'STR','ip':'STR',"
						+ "'platform':'STR','token':'STR','role':'STR','serverData':'STR','clientData':'STR','publishers':[{'createdAt':0,'streamId':'STR','mediaOptions':{'hasAudio':false,"
						+ "'audioActive':false,'hasVideo':false,'videoActive':false,'typeOfVideo':'STR','frameRate':0,'videoDimensions':'STR','filter':{}}}],'subscribers':[{'createdAt':0,'streamId':'STR','publisher':'STR'}]}]},"
						+ "'recording':false,'broadcasting':false,'forcedVideoCodec':'STR','allowTranscoding':false}");
		String streamId = res.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0)
				.getAsJsonObject().get("publishers").getAsJsonArray().get(0).getAsJsonObject().get("streamId")
				.getAsString();
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/stream/" + streamId,
				HttpURLConnection.HTTP_NO_CONTENT);

		final String connectionId = res.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0)
				.getAsJsonObject().get("connectionId").getAsString();

		/** POST /openvidu/api/signal (ACTIVE SESSION) **/
		body = "{'session':'CUSTOM_SESSION_ID','to':['wrongConnectionId']}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_NOT_ACCEPTABLE); // No
																												// valid
		// connectionId
		body = "{'session':'CUSTOM_SESSION_ID','to':['" + connectionId + "','wrongConnectionId']}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_NOT_ACCEPTABLE); // No
																												// valid
		// connectionId
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_OK);
		user.getEventManager().waitUntilEventReaches("signal", 2);
		body = "{'session':'CUSTOM_SESSION_ID','to':[],'type':'server1','data':'SERVER EVENT!'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_OK);
		user.getEventManager().waitUntilEventReaches("signal:server1", 2);
		body = "{'session':'CUSTOM_SESSION_ID','to':['" + connectionId + "'],'type':'server2','data':'SERVER EVENT!'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpURLConnection.HTTP_OK);
		user.getEventManager().waitUntilEventReaches("signal:server2", 1);
		Assertions.assertEquals(1, user.getDriver()
				.findElements(By.xpath("//*[text()='server - signal:server2 - SERVER EVENT!']")).size());

		/** DELETE /openvidu/api/sessions/<SESSION_ID>/connection/<CONNECTION_ID> **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/NOT_EXISTS/connection/NOT_EXISTS",
				HttpURLConnection.HTTP_BAD_REQUEST);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/NOT_EXISTS",
				HttpURLConnection.HTTP_NOT_FOUND);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				HttpURLConnection.HTTP_NO_CONTENT);

		/** DELETE /openvidu/api/sessions **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions", HttpURLConnection.HTTP_BAD_METHOD);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/NOT_EXISTS", HttpURLConnection.HTTP_NOT_FOUND);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID",
				HttpURLConnection.HTTP_NO_CONTENT);

		// GET /openvidu/api/sessions should return empty again
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpURLConnection.HTTP_OK, true, true, true,
				"{'numberOfElements':0,'content':[]}");

		/**
		 * DELETE /openvidu/api/sessions/<SESSION_ID>/connection/<CONNECTION_ID> (unused
		 * token)
		 **/
		body = "{'customSessionId': 'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK);
		body = "{'type': 'WEBRTC', 'role': 'SUBSCRIBER'}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_PENDING_CONNECTION);
		final String connectionIdA = res.get("id").getAsString();
		final String tokenA = res.get("token").getAsString();
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_PENDING_CONNECTION);
		final String connectionIdB = res.get("connectionId").getAsString();
		final String tokenB = res.get("token").getAsString();

		user.getDriver().findElement(By.id("one2one-btn")).click();

		// Set token 1
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokenInput.clear();
		tokenInput.sendKeys(tokenA);
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		// Set token 2
		user.getDriver().findElement(By.id("session-settings-btn-1")).click();
		Thread.sleep(1000);
		tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokenInput.clear();
		tokenInput.sendKeys(tokenB);
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		// Invalidate token
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionIdA,
				HttpURLConnection.HTTP_NO_CONTENT);

		// User should pop up invalid token
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .join-btn")).sendKeys(Keys.ENTER);
		try {
			user.getWaiter().until(ExpectedConditions.alertIsPresent());
			Alert alert = user.getDriver().switchTo().alert();
			Assertions.assertTrue(alert.getText().contains("Token " + tokenA + " is not valid"),
					"Alert does not contain expected text");
			alert.accept();
		} catch (Exception e) {
			Assertions.fail("Alert exception");
		} finally {
			user.getEventManager().resetEventThread(false);
		}

		Thread.sleep(500);
		user.getEventManager().resetEventThread(true);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);

		// connectionId should be equal to the one brought by the token
		Assertions.assertEquals(connectionIdB,
				restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", HttpURLConnection.HTTP_OK)
						.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject()
						.get("connectionId").getAsString(),
				"Wrong connectionId");

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID",
				HttpURLConnection.HTTP_NO_CONTENT);

		// GET /openvidu/api/sessions should return empty again
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpURLConnection.HTTP_OK, true, true, true,
				"{'numberOfElements':0,'content':[]}");

		/** GET /openvidu/api/config **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/config", null, HttpURLConnection.HTTP_OK, false, false, true,
				"{'VERSION':'STR','DOMAIN_OR_PUBLIC_IP':'STR','HTTPS_PORT':0,'OPENVIDU_PUBLICURL':'STR','OPENVIDU_CDR':false,'OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH':0,"
						+ "'OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH':0,'OPENVIDU_STREAMS_FORCED_VIDEO_CODEC':'STR','OPENVIDU_STREAMS_ALLOW_TRANSCODING':false,'OPENVIDU_SESSIONS_GARBAGE_INTERVAL':0,"
						+ "'OPENVIDU_RECORDING':false,'OPENVIDU_RECORDING_VERSION':'STR','OPENVIDU_RECORDING_PATH':'STR','OPENVIDU_RECORDING_PUBLIC_ACCESS':false,'OPENVIDU_RECORDING_NOTIFICATION':'STR',"
						+ "'OPENVIDU_SESSIONS_GARBAGE_THRESHOLD':0,'OPENVIDU_RECORDING_CUSTOM_LAYOUT':'STR','OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT':0,'OPENVIDU_WEBHOOK':false}");

		/** POST /openvidu/api/sessions (default transcoding parameters) **/

		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'MANUAL', 'customSessionId': 'CUSTOM_SESSION_ID', 'defaultRecordingProperties': {'outputMode': 'COMPOSED', 'recordingLayout': 'BEST_FIT'}}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK);

		// Check session info
		Assertions.assertEquals(VideoCodec.valueOf(res.get("forcedVideoCodec").getAsString()), defaultForcedVideoCodec);
		Assertions.assertEquals(res.get("allowTranscoding").getAsBoolean(), defaultAllowTranscoding);

		// Check all sessions data
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", HttpURLConnection.HTTP_OK);
		Assertions.assertEquals(res.get("numberOfElements").getAsInt(), 1);
		Assertions.assertEquals(VideoCodec.valueOf(
				res.get("content").getAsJsonArray().get(0).getAsJsonObject().get("forcedVideoCodec").getAsString()),
				defaultForcedVideoCodec);
		Assertions.assertEquals(
				res.get("content").getAsJsonArray().get(0).getAsJsonObject().get("allowTranscoding").getAsBoolean(),
				defaultAllowTranscoding);

		// Remove session
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID",
				HttpURLConnection.HTTP_NO_CONTENT);

		/** POST /openvidu/api/sessions (define forceCodec and allowTranscoding) **/
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'MANUAL', 'customSessionId': 'CUSTOM_SESSION_ID', 'defaultRecordingProperties': {'outputMode': 'COMPOSED', 'recordingLayout': 'BEST_FIT'}, 'forcedVideoCodec': 'H264', 'allowTranscoding': true}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK);

		Assertions.assertEquals(VideoCodec.valueOf(res.get("forcedVideoCodec").getAsString()), VideoCodec.H264);
		Assertions.assertEquals(res.get("allowTranscoding").getAsBoolean(), true);

		// Check all sessions data
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", HttpURLConnection.HTTP_OK);
		Assertions.assertEquals(res.get("numberOfElements").getAsInt(), 1);
		Assertions.assertEquals(VideoCodec.valueOf(
				res.get("content").getAsJsonArray().get(0).getAsJsonObject().get("forcedVideoCodec").getAsString()),
				VideoCodec.H264);
		Assertions.assertEquals(
				res.get("content").getAsJsonArray().get(0).getAsJsonObject().get("allowTranscoding").getAsBoolean(),
				true);

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID",
				HttpURLConnection.HTTP_NO_CONTENT);
	}

	@Test
	@DisplayName("Media server reconnect no active session test")
	void mediaServerReconnectNoActiveSessionTest() throws Exception {
		isKurentoRestartTest = true;

		log.info("Media server reconnect no active session test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			// TOTAL DISCONNECTION
			// Session should not be affected
			String customSessionId = "RECONNECTION_SESSION";
			OV.createSession(new SessionProperties.Builder().customSessionId(customSessionId).build());
			CustomWebhook.waitForEvent("sessionCreated", 2);
			OV.fetch();
			List<Session> sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());
			this.stopMediaServer(true);
			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());

			// NO MEDIA SERVER
			// Session should be created
			OV.createSession();
			CustomWebhook.waitForEvent("sessionCreated", 2);
			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(2, sessions.size(), "Expected 2 active sessions but found " + sessions.size());

			// RECONNECTION
			// Session should not be affected
			this.startMediaServer(true);
			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(2, sessions.size(), "Expected 2 active sessions but found " + sessions.size());
			this.closeAllSessions(OV);
			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(0, sessions.size(), "Expected no active sessions but found " + sessions.size());

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("Media server reconnect active session no streams test")
	void mediaServerReconnectActiveSessionNoStreamsTest() throws Exception {
		isKurentoRestartTest = true;

		log.info("Media server reconnect active session no streams test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

			// TOTAL DISCONNECTION
			// Session should be destroyed with reason nodeCrashed
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElements(By.className("publish-checkbox")).forEach(el -> el.click());
			user.getDriver().findElement(By.className("join-btn")).click();

			user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
			CustomWebhook.waitForEvent("sessionCreated", 2);
			CustomWebhook.waitForEvent("participantJoined", 2);

			OV.fetch();
			List<Session> sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());
			Assertions.assertEquals(1, sessions.get(0).getActiveConnections().size(),
					"Expected 1 active connection but found " + sessions.get(0).getActiveConnections().size());

			this.stopMediaServer(true);

			user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
			JsonObject event = CustomWebhook.waitForEvent("sessionDestroyed", 2);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");

			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(0, sessions.size(), "Expected no active sessions but found " + sessions.size());
			user.getDriver().findElement(By.id("remove-user-btn")).sendKeys(Keys.ENTER);

			// NO MEDIA SERVER
			// Session should be created, but client's operation joinRoom should fail
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.className("publish-checkbox")).click();
			user.getDriver().findElement(By.className("subscribe-checkbox")).click();
			user.getDriver().findElement(By.className("join-btn")).click();

			try {
				user.getWaiter().until(ExpectedConditions.alertIsPresent());
				Alert alert = user.getDriver().switchTo().alert();
				final String alertMessage = "Error connecting to the session: There is no available Media Node where to initialize session 'TestSession'. Code: 204";
				Assertions.assertTrue(alert.getText().contains(alertMessage),
						"Alert message wrong. Expected to contain: \"" + alertMessage + "\". Actual message: \""
								+ alert.getText() + "\"");
				alert.accept();
			} catch (Exception e) {
				Assertions.fail("Alert exception");
			} finally {
				user.getEventManager().resetEventThread(false);
			}

			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());

			user.getDriver().findElement(By.id("remove-user-btn")).sendKeys(Keys.ENTER);
			this.closeAllSessions(OV);
			CustomWebhook.waitForEvent("sessionDestroyed", 2);

			// RECONNECTION
			// Nothing should happen as long as there were no streams while reconnecting
			// A publisher should be able to publish normally after media server reconnected
			this.startMediaServer(true);

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElements(By.className("publish-checkbox")).forEach(el -> el.click());
			user.getDriver().findElement(By.className("join-btn")).click();

			user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
			CustomWebhook.waitForEvent("sessionCreated", 2);
			CustomWebhook.waitForEvent("participantJoined", 2);

			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());
			Assertions.assertEquals(1, sessions.get(0).getActiveConnections().size(),
					"Expected 1 active connection but found " + sessions.get(0).getActiveConnections().size());

			this.stopMediaServer(false);
			this.startMediaServer(true);

			user.getEventManager().resetEventThread(true);
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();
			user.getEventManager().waitUntilEventReaches("streamCreated", 2);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("Media server reconnect active session with streams test")
	void mediaServerReconnectActiveSessionWithStreamsTest() throws Exception {
		isRecordingTest = true;
		isKurentoRestartTest = true;

		log.info("Media server reconnect active session with streams test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

			// TOTAL DISCONNECTION
			// Streams, Connections and Session should be destroyed with reason
			// "nodeCrashed", with no possible recovery. INDIVIDUAL recording should be
			// properly closed and available with reason "nodeCrashed"
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
			user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.click());

			user.getEventManager().clearAllCurrentEvents();
			user.getEventManager().waitUntilEventReaches("streamPlaying", 2);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 5);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			OV.fetch();
			List<Session> sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());
			Session session = sessions.get(0);
			String streamId = session.getActiveConnections().stream().filter(c -> c.getPublishers().size() > 0)
					.findFirst().get().getPublishers().get(0).getStreamId();

			OV.startRecording(session.getSessionId(),
					new RecordingProperties.Builder().outputMode(OutputMode.INDIVIDUAL).build());
			user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

			waitUntilFileExistsAndIsBiggerThan(
					"/opt/openvidu/recordings/TestSession/" + streamId + "." + this.getIndividualRecordingExtension(),
					200, 60);

			final CountDownLatch latch = new CountDownLatch(2);

			user.getEventManager().on("sessionDisconnected", (ev) -> {
				Assertions.assertEquals("nodeCrashed", ev.get("reason").getAsString(),
						"Expected 'sessionDisconnected' reason 'nodeCrashed'");
				latch.countDown();
			});

			user.getEventManager().clearAllCurrentEvents();
			CustomWebhook.clean();
			this.stopMediaServer(false);

			user.getEventManager().waitUntilEventReaches("sessionDisconnected", 2);
			if (!latch.await(6000, TimeUnit.MILLISECONDS)) {
				gracefullyLeaveParticipants(user, 2);
				fail("Waiting for 2 sessionDisconnected events with reason 'nodeCrashed' to happen in total");
				return;
			}
			user.getEventManager().off("sessionDisconnected");

			JsonObject event = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("participantLeft", 1);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("participantLeft", 1);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 1);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 1);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("sessionDestroyed", 1);
			Assertions.assertEquals("nodeCrashed", event.get("reason").getAsString(), "Wrong reason in webhook event");

			Recording rec = OV.getRecording("TestSession");
			Assertions.assertTrue(rec.getDuration() > 0, "Recording duration is 0");
			Assertions.assertTrue(rec.getSize() > 0, "Recording size is 0");

			this.recordingUtils.checkIndividualRecording("/opt/openvidu/recordings/TestSession/", rec, 1, "opus", "vp8",
					true);

			user.getDriver().findElement(By.id("remove-all-users-btn")).click();
			user.getEventManager().clearAllCurrentEvents();
			this.closeAllSessions(OV);
			deleteAllRecordings(OV);
			CustomWebhook.clean();

			this.startMediaServer(true);

			// RECONNECTION
			// Streams should be destroyed with reason "mediaServerReconnect", but
			// Connections and Session should remain alive. INDIVIDUAL recording should be
			// properly closed and available with reason "mediaServerReconnect"
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
			user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.click());

			user.getEventManager().waitUntilEventReaches("streamPlaying", 2);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 5);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());
			session = sessions.get(0);
			streamId = session.getActiveConnections().stream().filter(c -> c.getPublishers().size() > 0).findFirst()
					.get().getPublishers().get(0).getStreamId();

			OV.startRecording(session.getSessionId(),
					new RecordingProperties.Builder().outputMode(OutputMode.INDIVIDUAL).build());
			user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

			waitUntilFileExistsAndIsBiggerThan(
					"/opt/openvidu/recordings/TestSession/" + streamId + "." + this.getIndividualRecordingExtension(),
					200, 60);

			final CountDownLatch latch2 = new CountDownLatch(4);

			user.getEventManager().on("recordingStopped", (ev) -> {
				Assertions.assertEquals("mediaServerReconnect", ev.get("reason").getAsString(),
						"Expected 'recordingStopped' reason 'mediaServerReconnect'");
				latch2.countDown();
			});
			user.getEventManager().on("streamDestroyed", (ev) -> {
				Assertions.assertEquals("mediaServerReconnect", ev.get("reason").getAsString(),
						"Expected 'streamDestroyed' reason 'mediaServerReconnect'");
				latch2.countDown();
			});

			user.getEventManager().clearAllCurrentEvents();
			CustomWebhook.clean();
			this.stopMediaServer(false);
			this.startMediaServer(false);

			user.getEventManager().waitUntilEventReaches("recordingStopped", 2);
			user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
			if (!latch2.await(6000, TimeUnit.MILLISECONDS)) {
				gracefullyLeaveParticipants(user, 2);
				fail("Waiting for 2 recordingStopped and 2 streamDestroyed events with reason 'mediaServerReconnect' to happen in total");
				return;
			}
			user.getEventManager().off("recordingStopped");
			user.getEventManager().off("streamDestroyed");

			event = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assertions.assertEquals("mediaServerReconnect", event.get("reason").getAsString(),
					"Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assertions.assertEquals("mediaServerReconnect", event.get("reason").getAsString(),
					"Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 1);
			Assertions.assertEquals("mediaServerReconnect", event.get("reason").getAsString(),
					"Wrong reason in webhook event");
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 1);
			Assertions.assertEquals("mediaServerReconnect", event.get("reason").getAsString(),
					"Wrong reason in webhook event");

			rec = OV.getRecording("TestSession");
			Assertions.assertTrue(rec.getDuration() > 0, "Recording duration is 0");
			Assertions.assertTrue(rec.getSize() > 0, "Recording size is 0");

			this.recordingUtils.checkIndividualRecording("/opt/openvidu/recordings/TestSession/", rec, 1, "opus", "vp8",
					true);

			OV.fetch();
			sessions = OV.getActiveSessions();
			Assertions.assertEquals(1, sessions.size(), "Expected 1 active sessions but found " + sessions.size());
			session = sessions.get(0);
			Assertions.assertEquals(2, session.getActiveConnections().size(),
					"Expected 2 active connections but found " + session.getActiveConnections());

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("Webhook test")
	void webhookTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Webhook test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);

			String recordingName = "1234abcABC_-~";
			user.getDriver().findElement(By.id("recording-name-field")).sendKeys(recordingName);
			user.getDriver().findElement(By.id("recording-mode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-ALWAYS")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("rec-outputmode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-INDIVIDUAL")).click();
			Thread.sleep(500);

			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.className("join-btn")).click();

			JsonObject event = CustomWebhook.waitForEvent("sessionCreated", 2);
			Assertions.assertEquals(3 + 1, event.keySet().size(),
					"Wrong number of properties in event 'sessionCreated'");

			event = CustomWebhook.waitForEvent("participantJoined", 2);
			Assertions.assertEquals(10 + 1, event.keySet().size(),
					"Wrong number of properties in event 'participantJoined'");

			event = CustomWebhook.waitForEvent("webrtcConnectionCreated", 4);
			Assertions.assertEquals(12 + 1, event.keySet().size(),
					"Wrong number of properties in event 'webrtcConnectionCreated'");
			String connectionId1 = event.get("connectionId").getAsString();

			event = CustomWebhook.waitForEvent("recordingStatusChanged", 10);
			Assertions.assertEquals(12 + 1, event.keySet().size(),
					"Wrong number of properties in event 'recordingStatusChanged'");
			Assertions.assertEquals("started", event.get("status").getAsString(),
					"Wrong recording status in webhook event");
			Assertions.assertEquals("INDIVIDUAL", event.get("outputMode").getAsString(),
					"Wrong recording outputMode in webhook event");
			Assertions.assertEquals(0, event.get("size").getAsLong(), "Wrong recording size in webhook event");
			Assertions.assertEquals(0, event.get("duration").getAsLong(), "Wrong recording duration in webhook event");
			Assertions.assertEquals(event.get("startTime").getAsLong(), event.get("timestamp").getAsLong(),
					"Wrong recording startTime/timestamp in webhook event");
			Assertions.assertNull(event.get("reason"), "Wrong recording reason in webhook event (should be null)");
			Assertions.assertEquals(recordingName, event.get("name").getAsString(),
					"Wrong recording name in webhook event");

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();

			event = CustomWebhook.waitForEvent("participantJoined", 2);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 12);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 12);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 12);

			String connectionId2 = event.get("connectionId").getAsString();

			// signalSent from client
			long timestamp = System.currentTimeMillis();
			user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .message-btn"))).click();
			user.getEventManager().waitUntilEventReaches("signal:chat", 2);
			event = CustomWebhook.waitForEvent("signalSent", 1);
			Assertions.assertEquals(7 + 1, event.keySet().size(), "Wrong number of properties in event 'signalSent'");
			Assertions.assertEquals("TestSession", event.get("sessionId").getAsString(),
					"Wrong sessionId in webhook event");
			Assertions.assertTrue(event.get("timestamp").getAsLong() > timestamp, "Wrong timestamp in webhook event");
			Assertions.assertEquals(connectionId1, event.get("from").getAsString(), "Wrong from in webhook event");
			Assertions.assertEquals("chat", event.get("type").getAsString(), "Wrong type in webhook event");
			Assertions.assertTrue(!event.get("data").getAsString().isEmpty(), "Wrong data in webhook event");
			Assertions.assertEquals("signalSent", event.get("event").getAsString(),
					"Wrong event name in webhook event");
			JsonArray toArray = event.get("to").getAsJsonArray();
			Assertions.assertEquals(2, toArray.size(), "Wrong to array size");
			Assertions.assertTrue(toArray.contains(JsonParser.parseString(connectionId1)),
					"Wrong to array content in webhook event");
			Assertions.assertTrue(toArray.contains(JsonParser.parseString(connectionId2)),
					"Wrong to array content in webhook event");

			// signalSent from server
			CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
			restClient.rest(HttpMethod.POST, "/openvidu/api/signal",
					"{'session':'TestSession','type':'chat','to':['" + connectionId1 + "'],'data':'SERVER_DATA'}",
					HttpURLConnection.HTTP_OK);
			user.getEventManager().waitUntilEventReaches("signal:chat", 3);
			event = CustomWebhook.waitForEvent("signalSent", 1);
			Assertions.assertEquals(7 + 1, event.keySet().size(), "Wrong number of properties in event 'signalSent'");
			Assertions.assertEquals("TestSession", event.get("sessionId").getAsString(),
					"Wrong sessionId in webhook event");
			Assertions.assertTrue(event.get("timestamp").getAsLong() > timestamp, "Wrong timestamp in webhook event");
			Assertions.assertTrue(event.get("from").isJsonNull(), "Wrong from in webhook event");
			Assertions.assertEquals("chat", event.get("type").getAsString(), "Wrong type in webhook event");
			Assertions.assertEquals("SERVER_DATA", event.get("data").getAsString(), "Wrong data in webhook event");
			Assertions.assertEquals("signalSent", event.get("event").getAsString(),
					"Wrong event name in webhook event");
			toArray = event.get("to").getAsJsonArray();
			Assertions.assertEquals(1, toArray.size(), "Wrong to array size");
			Assertions.assertTrue(toArray.contains(JsonParser.parseString(connectionId1)),
					"Wrong to array content in webhook event");

			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("close-session-btn")).click();
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(1000);

			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2);
			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2);
			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2);
			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2);
			CustomWebhook.waitForEvent("participantLeft", 2);
			CustomWebhook.waitForEvent("participantLeft", 2);
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 2);

			OV.fetch();
			List<Recording> recs = OV.listRecordings();
			Assertions.assertEquals(1, recs.size(), "Wrong number of recording entities");
			Recording rec = recs.get(0);

			Assertions.assertEquals(13 + 1, event.keySet().size(),
					"Wrong number of properties in event 'recordingStatusChanged'");
			Assertions.assertEquals("stopped", event.get("status").getAsString(),
					"Wrong recording status in webhook event");
			Assertions.assertEquals(0, event.get("size").getAsLong(), "Wrong recording outputMode in webhook event");
			Assertions.assertEquals(0, event.get("duration").getAsLong(), "Wrong recording duration in webhook event");
			Assertions.assertEquals("sessionClosedByServer", event.get("reason").getAsString(),
					"Wrong recording reason in webhook event");
			Assertions.assertEquals(rec.getCreatedAt(), event.get("startTime").getAsLong(),
					"Wrong recording startTime in webhook event");

			event = CustomWebhook.waitForEvent("recordingStatusChanged", 2);

			OV.fetch();
			recs = OV.listRecordings();
			Assertions.assertEquals(1, recs.size(), "Wrong number of recording entities");
			rec = recs.get(0);

			Assertions.assertEquals(13 + 1, event.keySet().size(),
					"Wrong number of properties in event 'recordingStatusChanged'");
			Assertions.assertEquals("ready", event.get("status").getAsString(),
					"Wrong recording status in webhook event");
			Assertions.assertTrue(event.get("size").getAsLong() > 0, "Wrong recording size in webhook event");
			Assertions.assertTrue(event.get("duration").getAsLong() > 0, "Wrong recording duration in webhook event");
			Assertions.assertEquals("sessionClosedByServer", event.get("reason").getAsString(),
					"Wrong recording reason in webhook event");
			Assertions.assertEquals(rec.getCreatedAt(), event.get("startTime").getAsLong(),
					"Wrong recording startTime in webhook event");

			event = CustomWebhook.waitForEvent("sessionDestroyed", 2);
			Assertions.assertEquals(6 + 1, event.keySet().size(),
					"Wrong number of properties in event 'sessionDestroyed'");
			Assertions.assertEquals("sessionClosedByServer", event.get("reason").getAsString(),
					"Wrong session destroyed reason in webhook event");

		} catch (TimeoutException e) {
			log.error("Timeout: {}", e.getMessage());
			e.printStackTrace();
			System.out.println(getBase64Screenshot(user.getBrowserUser()));
			Assertions.fail(e.getMessage());
		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@OnlyKurento
	@DisplayName("Webhook filter event test")
	void webhookFilterEventTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeAlternateFakeVideo");

		log.info("Webhook test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);

			WebElement allowedFilterInput = user.getDriver().findElement(By.id("allowed-filter-input"));
			allowedFilterInput.clear();
			allowedFilterInput.sendKeys("ZBarFilter");
			user.getDriver().findElement(By.id("add-allowed-filter-btn")).click();

			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.className("join-btn")).click();

			JsonObject event = CustomWebhook.waitForEvent("sessionCreated", 2);
			Assertions.assertEquals(3 + 1, event.keySet().size(),
					"Wrong number of properties in event 'sessionCreated'");

			event = CustomWebhook.waitForEvent("participantJoined", 2);
			Assertions.assertEquals(10 + 1, event.keySet().size(),
					"Wrong number of properties in event 'participantJoined'");

			event = CustomWebhook.waitForEvent("webrtcConnectionCreated", 4);
			Assertions.assertEquals(12 + 1, event.keySet().size(),
					"Wrong number of properties in event 'webrtcConnectionCreated'");

			// Filter event webhook
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .other-operations-btn")).click();
			Thread.sleep(500);
			WebElement input = user.getDriver().findElement(By.id("filter-type-field"));
			input.clear();
			input.sendKeys("ZBarFilter");
			input = user.getDriver().findElement(By.id("filter-options-field"));
			input.clear();
			input.sendKeys("{}");
			user.getDriver().findElement(By.id("apply-filter-btn")).click();
			user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 1);

			// Apply listener
			input = user.getDriver().findElement(By.id("filter-event-type-field"));
			input.clear();
			input.sendKeys("CodeFound");
			user.getDriver().findElement(By.id("sub-filter-event-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
					"Filter event listener added"));
			CustomWebhook.waitForEvent("filterEventDispatched", 2);
			user.getDriver().findElement(By.id("unsub-filter-event-btn")).click();
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@OnlyKurento
	@DisplayName("IP camera test")
	void ipCameraTest() throws Exception {
		isRecordingTest = true;

		log.info("IP camera test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			// Extra wait time for the webhook endpoint to be ready
			Thread.sleep(3000);

			CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

			// Wrong session [404]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/WRONG_SESSION/connection", "{'type':'IPCAM'}",
					HttpURLConnection.HTTP_NOT_FOUND);

			// Init a session and publish IP camera AS FIRST PARTICIPANT
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId':'IP_CAM_SESSION'}",
					HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_SESSION);

			// No rtspUri [400]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection", "{'type':'IPCAM'}",
					HttpURLConnection.HTTP_BAD_REQUEST);

			// Wrong rtspUri (invalid url format) [400]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection",
					"{'type':'IPCAM','rtspUri': 'NOT_A_URL'}", HttpURLConnection.HTTP_BAD_REQUEST);
			// Wrong adaptativeBitrate [400]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection",
					"{'type':'IPCAM','rtspUri':'rtsp://dummyurl.com','adaptativeBitrate':123,}",
					HttpURLConnection.HTTP_BAD_REQUEST);

			// Publish IP camera. Dummy URL because no user will subscribe to it [200]
			String ipCamBody = "{'type':'IPCAM','rtspUri':'rtsp://dummyurl.com','adaptativeBitrate':true,'onlyPlayWithSubscribers':true,'networkCache':1000,'data':'MY_IP_CAMERA'}";
			JsonObject response = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection",
					ipCamBody, HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_IPCAM_CONNECTION);

			CustomWebhook.waitForEvent("sessionCreated", 1);
			CustomWebhook.waitForEvent("participantJoined", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			Assertions.assertEquals("MY_IP_CAMERA", response.get("serverData").getAsString(),
					"Wrong serverData property");
			Assertions.assertEquals("IPCAM", response.get("platform").getAsString(), "Wrong platform property");
			Assertions.assertEquals(JsonNull.INSTANCE, response.get("role"), "Wrong role property");
			Assertions.assertEquals("IPCAM", response.get("type").getAsString(), "Wrong type property");

			Assertions.assertEquals(1, response.get("publishers").getAsJsonArray().size(),
					"Wrong number of publishers in IPCAM participant");
			JsonObject ipCamPublisher = response.get("publishers").getAsJsonArray().get(0).getAsJsonObject();
			Assertions.assertEquals(4, ipCamPublisher.size(), "Wrong number of properties in IPCAM publisher");
			Assertions.assertEquals("rtsp://dummyurl.com", ipCamPublisher.get("rtspUri").getAsString(),
					"Wrong rtspUri property");
			JsonObject mediaOptions = ipCamPublisher.get("mediaOptions").getAsJsonObject();
			Assertions.assertEquals(11, mediaOptions.size(), "Wrong number of properties in MediaOptions");
			Assertions.assertTrue(mediaOptions.get("adaptativeBitrate").getAsBoolean(),
					"Wrong adaptativeBitrate property");
			Assertions.assertTrue(mediaOptions.get("onlyPlayWithSubscribers").getAsBoolean(),
					"Wrong onlyPlayWithSubscribers property");

			// Can't delete the stream [405]
			restClient.rest(HttpMethod.DELETE,
					"/openvidu/api/sessions/IP_CAM_SESSION/stream/" + ipCamPublisher.get("streamId").getAsString(),
					HttpURLConnection.HTTP_BAD_METHOD);

			// Can delete the connection [204]
			restClient.rest(HttpMethod.DELETE,
					"/openvidu/api/sessions/IP_CAM_SESSION/connection/" + response.get("connectionId").getAsString(),
					HttpURLConnection.HTTP_NO_CONTENT);

			response = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assertions.assertEquals("forceDisconnectByServer", response.get("reason").getAsString(),
					"Wrong reason in webrtcConnectionDestroyed event");
			response = CustomWebhook.waitForEvent("participantLeft", 1);
			Assertions.assertEquals("forceDisconnectByServer", response.get("reason").getAsString(),
					"Wrong reason in participantLeft event");
			CustomWebhook.waitForEvent("sessionDestroyed", 1);

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

			// Record a session to get an MP4 file

			// Init a moderator participant
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("radio-btn-mod")).click();
			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.className("join-btn")).click();
			user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
			user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
			user.getEventManager().waitUntilEventReaches("streamCreated", 1);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 1);
			final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
			Assertions.assertEquals(1, numberOfVideos, "Expected 1 video but found " + numberOfVideos);
			Assertions.assertTrue(user.getBrowserUser()
					.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
					"Video was expected to have audio and video tracks");

			CustomWebhook.waitForEvent("sessionCreated", 1);
			CustomWebhook.waitForEvent("participantJoined", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			// Composed recording to get an MP4 file AUDIO + VIDEO
			String recordingName = "audioVideo";
			response = restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
					"{'session':'TestSession','name':'" + recordingName + "','hasAudio':true,'hasVideo':true}",
					HttpURLConnection.HTTP_OK);
			String recId = response.get("id").getAsString();
			user.getEventManager().waitUntilEventReaches("recordingStarted", 1); // Started
			CustomWebhook.waitForEvent("recordingStatusChanged", 1);

			waitUntilFileExistsAndIsBiggerThan("/opt/openvidu/recordings/" + recId + "/" + recordingName + ".mp4", 200,
					30);

			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/TestSession", HttpURLConnection.HTTP_OK);
			user.getEventManager().waitUntilEventReaches("recordingStopped", 1);
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready

			// Composed recording to get an MP4 file ONLY VIDEO
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
					"{'session':'TestSession','name':'videoOnly','hasAudio':false,'hasVideo':true}",
					HttpURLConnection.HTTP_OK);
			user.getEventManager().waitUntilEventReaches("recordingStarted", 1); // Started
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Started
			Thread.sleep(4000);
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/TestSession~1", HttpURLConnection.HTTP_OK);
			user.getEventManager().waitUntilEventReaches("recordingStopped", 1);
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready

			// Publish the MP4 file as an IPCAM
			String recPath = restClient.rest(HttpMethod.GET, "/openvidu/api/config", HttpURLConnection.HTTP_OK)
					.get("OPENVIDU_RECORDING_PATH").getAsString();
			recPath = recPath.endsWith("/") ? recPath : (recPath + "/");
			String fullRecordingPath = "file://" + recPath + "TestSession/audioVideo.mp4";
			ipCamBody = "{'type':'IPCAM','rtspUri':'" + fullRecordingPath
					+ "','adaptativeBitrate':true,'onlyPlayWithSubscribers':true,'networkCache':1000,'data':'MY_IP_CAMERA'}";

			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/TestSession/connection", ipCamBody,
					HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_IPCAM_CONNECTION);

			user.getEventManager().waitUntilEventReaches("connectionCreated", 2);
			user.getEventManager().waitUntilEventReaches("streamCreated", 2);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

			CustomWebhook.waitForEvent("participantJoined", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			// A moderator should be able to evict the IPCAM participant
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .force-disconnect-btn")).click();
			user.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
			user.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
			response = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assertions.assertEquals("forceDisconnectByUser", response.get("reason").getAsString(),
					"Wrong reason in participantLeft event");
			response = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assertions.assertEquals("forceDisconnectByUser", response.get("reason").getAsString(),
					"Wrong reason in participantLeft event");
			response = CustomWebhook.waitForEvent("participantLeft", 1);
			Assertions.assertEquals("forceDisconnectByUser", response.get("reason").getAsString(),
					"Wrong reason in participantLeft event");
			user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));

			// Publish again the IPCAM
			response = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/TestSession/connection", ipCamBody,
					HttpURLConnection.HTTP_OK, true, false, true, DEFAULT_JSON_IPCAM_CONNECTION);
			user.getEventManager().waitUntilEventReaches("connectionCreated", 3);
			user.getEventManager().waitUntilEventReaches("streamCreated", 3);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 3);
			user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));

			String connectionId = response.get("id").getAsString();
			String streamId = response.get("publishers").getAsJsonArray().get(0).getAsJsonObject().get("streamId")
					.getAsString();

			// Removing browser user shouldn't close the session if IPCAM participant
			// remains

			user.getDriver().findElement(By.id("remove-user-btn")).click();
			user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);

			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 4);
			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			CustomWebhook.waitForEvent("participantLeft", 1);

			restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession", null, HttpURLConnection.HTTP_OK);

			// Test IPCAM individual recording (IPCAM audio+video, recording audio+video)
			response = restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
					"{'session':'TestSession','outputMode':'INDIVIDUAL','hasAudio':true,'hasVideo':true}",
					HttpURLConnection.HTTP_OK);
			recId = response.get("id").getAsString();
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Started

			waitUntilFileExistsAndIsBiggerThan(
					"/opt/openvidu/recordings/" + recId + "/" + streamId + "." + this.getIndividualRecordingExtension(),
					200, 60);

			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/" + recId, HttpURLConnection.HTTP_OK);
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready

			Recording recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(recId);
			this.recordingUtils.checkIndividualRecording(recPath + recId + "/", recording, 1, "opus", "vp8", true);

			// Test IPCAM individual recording (IPCAM video only, recording audio and video)

			// Disconnect audio+video IPCAM
			restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession/connection/" + connectionId,
					HttpURLConnection.HTTP_NO_CONTENT);

			// Session is closed (create new session)
			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			CustomWebhook.waitForEvent("participantLeft", 1);
			CustomWebhook.waitForEvent("sessionDestroyed", 1);

			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId':'TestSession'}",
					HttpURLConnection.HTTP_OK);

			// Publish video only IPCAM
			fullRecordingPath = "file://" + recPath + "TestSession~1/videoOnly.mp4";
			ipCamBody = "{'type':'IPCAM','rtspUri':'" + fullRecordingPath + "'}";
			response = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/TestSession/connection", ipCamBody,
					HttpURLConnection.HTTP_OK);
			CustomWebhook.waitForEvent("sessionCreated", 1);
			CustomWebhook.waitForEvent("participantJoined", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			// Record audio and video
			// TODO: THIS SHOULD WORK
//			response = restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
//					"{'session':'TestSession','outputMode':'INDIVIDUAL','hasAudio':true,'hasVideo':true}",
//					HttpURLConnection.HTTP_OK);
//			recId = response.get("id").getAsString();
//			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Started
//
//			Thread.sleep(2000);
//			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/TestSession~2", HttpURLConnection.HTTP_OK);
//			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
//			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready
//
//			recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(recId);
//			this.checkIndividualRecording(recPath + recId + "/", recording, 1, "opus", "vp8", true);

			restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession", HttpURLConnection.HTTP_NO_CONTENT);

			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 4);
			CustomWebhook.waitForEvent("participantLeft", 1);
			CustomWebhook.waitForEvent("sessionDestroyed", 1);

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("OpenVidu SDK fetch test")
	void openviduSdkFetchTest() throws Exception {
		isRecordingTest = true;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("OpenVidu SDK fetch test");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);

		Session session = OV.createSession();
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, true, true);
		checkNodeFetchChanged(user, true, false);

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId':'REST_SESSION'}",
				HttpURLConnection.HTTP_OK);
		Assertions.assertTrue(OV.fetch(), "Java fetch should be true");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		Assertions.assertFalse(session.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, true, true);
		checkNodeFetchChanged(user, true, false);

		Connection connection = session.createConnection();
		Assertions.assertFalse(session.fetch(), "Java fetch should be false");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, true, true);
		checkNodeFetchChanged(user, true, false);

		// OpenVidu CE does not support Session#updateConnection method
		try {
			session.updateConnection(connection.getConnectionId(), new ConnectionProperties.Builder().build());
			Assertions.fail("Expected exception was not thrown by OpenVidu Java Client");
		} catch (OpenViduHttpException e) {
			Assertions.assertEquals(HttpURLConnection.HTTP_BAD_METHOD, e.getStatus(), "Wrong OpenViduException status");
		} catch (Exception e) {
			Assertions.fail("Wrong exception type thrown by OpenVidu Java Client");
		}

		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", "{'session':'REST_SESSION'}",
				HttpURLConnection.HTTP_OK);
		Assertions.assertFalse(session.fetch(), "Fetch should be true");
		Assertions.assertTrue(OV.fetch(), "Fetch should be false");
		checkNodeFetchChanged(user, true, true);
		checkNodeFetchChanged(user, true, false);

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/REST_SESSION", HttpURLConnection.HTTP_NO_CONTENT);
		Assertions.assertFalse(session.fetch(), "Java fetch should be true");
		Assertions.assertTrue(OV.fetch(), "Java fetch should be true");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, true, true);
		checkNodeFetchChanged(user, true, false);

		// Set token and join session
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		WebElement tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokenInput.clear();
		tokenInput.sendKeys(connection.getToken());
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);

		Assertions.assertTrue(OV.fetch(), "Java fetch should be true");
		Assertions.assertFalse(session.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, false, true);
		checkNodeFetchChanged(user, true, false);
		checkNodeFetchChanged(user, true, false);

		// Modify connection properties
		user.getDriver().findElement(By.id("record-checkbox")).click();
		user.getDriver().findElement(By.id("token-role-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-MODERATOR")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("connection-data-field")).sendKeys("MY_SERVER_DATA");

		// Create Connection with openvidu-node-client
		long timestamp = System.currentTimeMillis();
		final String successMessage = "Connection created: ";
		user.getDriver().findElement(By.id("crate-connection-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value", successMessage));
		String value = user.getDriver().findElement(By.id("api-response-text-area")).getAttribute("value");
		// Check openvidu-node-client Connection properties
		JsonObject connectionJson = JsonParser
				.parseString(value.substring(value.lastIndexOf(successMessage) + successMessage.length()))
				.getAsJsonObject();
		JsonObject connectionProperties = connectionJson.get("connectionProperties").getAsJsonObject();
		String connectionId = connectionJson.get("connectionId").getAsString();
		Assertions.assertEquals("pending", connectionJson.get("status").getAsString(),
				"Wrong status Connection property");
		Assertions.assertTrue(connectionJson.get("createdAt").getAsLong() > timestamp,
				"Wrong createdAt Connection property");
		Assertions.assertTrue(connectionJson.get("activeAt").isJsonNull(), "Wrong activeAt Connection property");
		Assertions.assertTrue(connectionJson.get("location").isJsonNull(), "Wrong location Connection property");
		Assertions.assertTrue(connectionJson.get("ip").isJsonNull(), "Wrong ip Connection property");
		Assertions.assertTrue(connectionJson.get("platform").isJsonNull(), "Wrong platform Connection property");
		Assertions.assertTrue(connectionJson.get("clientData").isJsonNull(), "Wrong clientData Connection property");
		Assertions.assertTrue(connectionJson.get("publishers").getAsJsonArray().size() == 0,
				"Wrong publishers Connection property");
		Assertions.assertTrue(connectionJson.get("subscribers").getAsJsonArray().size() == 0,
				"Wrong subscribers Connection property");
		Assertions.assertTrue(connectionJson.get("token").getAsString().contains(session.getSessionId()),
				"Wrong token Connection property");
		Assertions.assertEquals(10, connectionProperties.keySet().size(),
				"Wrong number of keys in connectionProperties");
		Assertions.assertTrue(connectionProperties.get("customIceServers").getAsJsonArray().size() == 0,
				"Wrong customIceServer property");
		Assertions.assertEquals(ConnectionType.WEBRTC.name(), connectionProperties.get("type").getAsString(),
				"Wrong type property");
		Assertions.assertEquals("MY_SERVER_DATA", connectionProperties.get("data").getAsString(),
				"Wrong data property");
		Assertions.assertFalse(connectionProperties.get("record").getAsBoolean(), "Wrong record property");
		Assertions.assertEquals(OpenViduRole.MODERATOR.name(), connectionProperties.get("role").getAsString(),
				"Wrong role property");
		Assertions.assertTrue(connectionProperties.get("kurentoOptions").isJsonNull(), "Wrong kurentoOptions property");
		Assertions.assertTrue(connectionProperties.get("rtspUri").isJsonNull(), "Wrong rtspUri property");
		Assertions.assertTrue(connectionProperties.get("adaptativeBitrate").isJsonNull(),
				"Wrong adaptativeBitrate property");
		Assertions.assertTrue(connectionProperties.get("onlyPlayWithSubscribers").isJsonNull(),
				"Wrong onlyPlayWithSubscribers property");
		Assertions.assertTrue(connectionProperties.get("networkCache").isJsonNull(), "Wrong networkCache property");

		Assertions.assertTrue(session.fetch(), "Java fetch should be true");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, true, false);
		checkNodeFetchChanged(user, false, false);
		checkNodeFetchChanged(user, true, false);

		// Delete Connection with openvidu-node-client
		user.getDriver().findElement(By.id("connection-id-field")).clear();
		user.getDriver().findElement(By.id("connection-id-field")).sendKeys(connectionId);
		user.getDriver().findElement(By.id("force-disconnect-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "User disconnected"));
		Assertions.assertTrue(OV.fetch(), "Java fetch should be true");
		Assertions.assertFalse(session.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, false, false);
		checkNodeFetchChanged(user, true, false);
		checkNodeFetchChanged(user, false, false);

		// RECORD
		user.getDriver().findElement(By.id("rec-properties-btn")).click();
		user.getDriver().findElement(By.id("rec-hasvideo-checkbox")).click();
		user.getDriver().findElement(By.id("rec-outputmode-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-INDIVIDUAL")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

		// Node SDK should return false as the recording has been started with it
		checkNodeFetchChanged(user, false, false);
		checkNodeFetchChanged(user, true, false);
		checkNodeFetchChanged(user, true, false);
		// Java SDK should return true as it doesn't know about the recording yet
		Assertions.assertTrue(session.fetch(), "Java fetch should be true");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");

		OV.stopRecording(session.getSessionId());
		user.getEventManager().waitUntilEventReaches("recordingStopped", 1);
		// Java SDK should return false as the recording has been stopped with it
		Assertions.assertFalse(session.fetch(), "Java fetch should be false");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		// Node SDK should return true as it doesn't know about the recording stopped
		checkNodeFetchChanged(user, false, true);
		checkNodeFetchChanged(user, false, false);
		checkNodeFetchChanged(user, true, false);

		// NEW SUBSCRIBER
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-1")).clear();
		user.getDriver().findElement(By.id("session-name-input-1")).sendKeys(session.getSessionId());
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		Assertions.assertTrue(OV.fetch(), "Java fetch should be true");
		Assertions.assertFalse(session.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, true, true);
		checkNodeFetchChanged(user, true, false);
		checkNodeFetchChanged(user, false, false);

		// MODIFY STREAM
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-video-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		Assertions.assertTrue(session.fetch(), "Java fetch should be true");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, false, true);
		checkNodeFetchChanged(user, true, false);
		checkNodeFetchChanged(user, false, false);

		// REMOVE STREAM
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .sub-btn")).click();
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		Assertions.assertTrue(OV.fetch(), "Java fetch should be true");
		Assertions.assertFalse(session.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, true, true);
		checkNodeFetchChanged(user, true, false);
		checkNodeFetchChanged(user, false, false);

		// REMOVE USER
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .leave-btn")).click();
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		Assertions.assertTrue(session.fetch(), "Java fetch should be true");
		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		checkNodeFetchChanged(user, false, true);
		checkNodeFetchChanged(user, false, false);
	}

	@Test
	@DisplayName("Custom Ice Server connection tests from openvidu-java-client")
	void customIceServerConnectionJavaClientTest() throws Exception {
		customIceServerTest("openvidu-java-client");
	}

	@Test
	@DisplayName("Custom Ice Server connection tests from openvidu-node-client")
	void customIceServerConnectionNodeClientTest() throws Exception {
		customIceServerTest("openvidu-node-client");
	}

	private void customIceServerTest(String client) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		// ------
		// 1. Initialize connection with Custom Ice Servers from openvidu-java-client
		// ------
		Session session = OV.createSession();
		String sessionId1 = session.getSessionId();

		Assertions.assertFalse(OV.fetch(), "Java fetch should be false");
		Assertions.assertFalse(session.fetch(), "Session fetch should be false");
		user.getDriver().findElement(By.id("add-user-btn")).click();
		WebElement sessionName1 = user.getDriver().findElement(By.id("session-name-input-0"));
		sessionName1.clear();
		sessionName1.sendKeys(session.getSessionId());
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		session.fetch();
		Assertions.assertEquals(session.getActiveConnections().size(), 1);

		// Add second user with connection using custom ice servers
		Connection connection1 = createConnWithCustomIceServer(session, user, client);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		WebElement sessionName2 = user.getDriver().findElement(By.id("session-name-input-1"));
		sessionName2.clear();
		sessionName2.sendKeys(sessionId1);

		user.getDriver().findElement(By.id("session-settings-btn-1")).click();
		Thread.sleep(1000);

		WebElement token1Input = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		token1Input.clear();
		token1Input.sendKeys(connection1.getToken());

		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElements(By.className("join-btn")).stream().filter(el -> el.isEnabled())
				.forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		// ------
		// 2. Check that the IceServer is correctly setup on RTCPeerConnections created.
		// This will ensure that the property
		// is reached in WebRTC browser related objects
		// ------
		List<WebElement> iceConfiguredButtons = user.getDriver()
				.findElements(By.className("ice-config-button-" + connection1.getConnectionId()));
		for (WebElement iceConfigured : iceConfiguredButtons) {
			iceConfigured.click();
			Thread.sleep(1000);
			for (int i = 0; i < connection1.getCustomIceServers().size(); i++) {
				IceServerProperties customIceServer = connection1.getCustomIceServers().get(i);
				String foundIceUrl = user.getDriver().findElement(By.id("ice-server-url-" + i)).getText();
				String foundIceUsername = null, foundIceCred = null;
				List<WebElement> foundIceUsernameWebElem = user.getDriver()
						.findElements(By.id("ice-server-username-" + i));
				List<WebElement> foundIceCredWebElem = user.getDriver()
						.findElements(By.id("ice-server-credential-" + i));
				if (foundIceUsernameWebElem.size() == 1) {
					foundIceUsername = foundIceUsernameWebElem.get(0).getText();
				}
				if (foundIceCredWebElem.size() == 1) {
					foundIceCred = foundIceCredWebElem.get(0).getText();
				}
				Assertions.assertEquals(foundIceUrl, customIceServer.getUrl());
				Assertions.assertEquals(foundIceUsername, customIceServer.getUsername());
				Assertions.assertEquals(foundIceCred, customIceServer.getCredential());
			}
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(1000);
		}

		// ------
		// 3. Check that the data in openvidu-node-client is correctly fetched
		// ------
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		checkNodeFetchChanged(user, false, true);
		checkNodeFetchChanged(user, false, false);
		checkNodeFetchChanged(user, true, false);

		// ------
		// 4. Check if Ice Servers are correctly received in openvidu-node-client
		// ------
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("session-info-btn-0")).click();
		Thread.sleep(500);

		// 4.1. Get all session data
		JsonObject res = JsonParser
				.parseString(user.getDriver().findElement(By.id("session-text-area")).getAttribute("value"))
				.getAsJsonObject();

		JsonArray connectionsJsonArray = res.get("connections").getAsJsonArray();
		boolean foundConnection = false;
		for (JsonElement connectionJson : connectionsJsonArray) {
			// 4.2. Of all connections, get only the one created with openvidu-java-client
			// with customIceServers added
			// Check if connection is the one configured from java client
			String connectionId = connectionJson.getAsJsonObject().get("connectionId").getAsString();
			if (connectionId.equals(connection1.getConnectionId())) {
				// 4.3. If connection with custom ice server is found, get the property with all
				// customIceServers
				foundConnection = true;
				JsonArray customIceServersJsonArray = connectionJson.getAsJsonObject().get("connectionProperties")
						.getAsJsonObject().get("customIceServers").getAsJsonArray();
				for (IceServerProperties customIceServer : connection1.getCustomIceServers()) {
					// 4.4 Compare both list, the one created with openvidu-java-client with the one
					// received from openvidu-node-client
					boolean foundIceServer = false;
					Iterator<JsonElement> customIceServersJsonIterator = customIceServersJsonArray.iterator();
					while (customIceServersJsonIterator.hasNext() && !foundIceServer) {
						// 4.5 When the custom ICE server is found in the openvidu-node-client object,
						// compare it with the
						// openvidu-java-client object
						JsonObject customIceJsonObject = customIceServersJsonIterator.next().getAsJsonObject();
						String url = customIceJsonObject.get("url").getAsString();
						if (url.equals(customIceServer.getUrl())) {
							foundIceServer = true;
							Assertions.assertEquals(customIceServer.getUrl(),
									customIceJsonObject.get("url").getAsString());
							if (customIceJsonObject.get("username") != null) {
								Assertions.assertEquals(customIceServer.getUsername(),
										customIceJsonObject.get("username").getAsString());
							}
							if (customIceJsonObject.get("credential") != null) {
								Assertions.assertEquals(customIceServer.getCredential(),
										customIceJsonObject.get("credential").getAsString());
							}
						}
					}
					// 4.6 Assert that the custom Ice Server was found on the openvidu-node-client
					// connection object
					Assertions.assertTrue(foundIceServer);
				}
			}

		}
		// 4.7 Assert that the connection was found on the openvidu-node-client session
		// object, to fail in case it was not registered
		Assertions.assertTrue(foundConnection);
	}

	private Connection createConnWithCustomIceServer(Session session, OpenViduTestappUser user, String fromClient)
			throws OpenViduJavaClientException, OpenViduHttpException, InterruptedException {
		if (fromClient.equals("openvidu-java-client")) {
			IceServerProperties iceServerProperties1 = new IceServerProperties.Builder().url("turn:turn-server.com")
					.username("usertest").credential("credtest").build();
			IceServerProperties iceServerProperties2 = new IceServerProperties.Builder().url("stun:1.2.3.4:1234")
					.build();
			ConnectionProperties connectionProperties = new ConnectionProperties.Builder()
					.addCustomIceServer(iceServerProperties1).addCustomIceServer(iceServerProperties2).build();
			return session.createConnection(connectionProperties);
		} else if (fromClient.equals("openvidu-node-client")) {
			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("num-ice-servers-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("num-ice-servers-2")).click();
			Thread.sleep(500);
			WebElement iceUrl1 = user.getDriver().findElement(By.id("ice-server-url-0"));
			WebElement iceUsername1 = user.getDriver().findElement(By.id("ice-server-username-0"));
			WebElement iceCredential1 = user.getDriver().findElement(By.id("ice-server-credential-0"));
			WebElement iceUrl2 = user.getDriver().findElement(By.id("ice-server-url-1"));
			iceUrl1.clear();
			iceUsername1.clear();
			iceCredential1.clear();
			iceUrl2.clear();
			iceUrl1.sendKeys("turn:turn-server.com");
			iceUsername1.sendKeys("usertest");
			iceCredential1.sendKeys("credtest");
			iceUrl2.sendKeys("stun:1.2.3.4:1234");

			// Create connection
			user.getDriver().findElement(By.id("crate-connection-api-btn")).click();
			Thread.sleep(1000);
			String responseAreaText = user.getDriver().findElement(By.id("api-response-text-area"))
					.getAttribute("value");
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);
			String connectionCreatedPrefix = "Connection created: ";
			Assertions.assertTrue(responseAreaText.startsWith(connectionCreatedPrefix));
			String connectionStringResponse = responseAreaText.split(connectionCreatedPrefix, 2)[1];
			JsonObject connectionJsonResponse = JsonParser.parseString(connectionStringResponse).getAsJsonObject();
			String connectionId = connectionJsonResponse.get("connectionId").getAsString();
			Assertions.assertTrue(session.fetch());
			Assertions.assertFalse(session.fetch());
			Assertions.assertFalse(OV.fetch());
			for (Connection connection : session.getConnections()) {
				if (connection.getConnectionId().equals(connectionId)) {
					return connection;
				}
			}
			return null;
		} else {
			return null;
		}
	}

	@Test
	@OnlyKurento
	@DisplayName("Force codec default config")
	void forceDefaultCodec() throws Exception {
		log.info("Force codec default config");
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.forceCodecGenericE2eTest(user);
	}

	@Test
	@OnlyKurento
	@DisplayName("Force valid codec VP8 - Not Allow Transcoding")
	void forceValidCodecNotAllowTranscodingVP8Test() throws Exception {
		log.info("Force codec Chrome - Force VP8 - Not Allow Transcoding");
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.forceCodecGenericE2eTest(user, VideoCodec.VP8, false);
		user.getDriver().close();
	}

	@Test
	@OnlyKurento
	@DisplayName("Force valid codec H264 - Not Allow Transcoding")
	void forceValidCodecNotAllowTranscodingH264Test() throws Exception {
		log.info("Force codec Chrome - Force H264 - Not Allow Transcoding");
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.forceCodecGenericE2eTest(user, VideoCodec.H264, false);
		user.getDriver().close();
	}

	@Test
	@OnlyKurento
	@DisplayName("Force valid codec VP8 - Allow Transcoding")
	void forceValidCodecAllowTranscodingVP8Test() throws Exception {
		log.info("Force codec Chrome - Force VP8 - Allow Transcoding");
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.forceCodecGenericE2eTest(user, VideoCodec.VP8, true);
		user.getDriver().close();
	}

	@Test
	@OnlyKurento
	@DisplayName("Force valid codec H264 - Allow Transcoding")
	void forceValidCodecAllowTranscodingH264Test() throws Exception {
		log.info("Force codec Chrome - Force H264 - Allow Transcoding");
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.forceCodecGenericE2eTest(user, VideoCodec.H264, true);
		user.getDriver().close();
	}

	@Test
	@OnlyKurento
	@DisplayName("Force not valid codec - Not Allow Transcoding")
	void forceCodecNotValidCodecNotAllowTranscoding() throws Exception {
		// Start firefox with OpenH264 disabled to check not supported codecs
		log.info("Force codec Firefox - Force H264 - Allow Transcoding - Disabled H264 in Firefox");
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefoxDisabledOpenH264");
		this.forceNotSupportedCodec(user, VideoCodec.H264, false);
	}

	@Test
	@DisplayName("Force not valid codec - Allow Transcoding")
	void forceCodecNotValidCodecAllowTranscoding() throws Exception {
		// Start firefox with OpenH264 disabled to check not supported codecs
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefoxDisabledOpenH264");
		log.info("Force codec Firefox - Force H264 - Allow Transcoding - Disabled H264 in Firefox");
		this.forceNotSupportedCodec(user, VideoCodec.H264, true);
	}

	private void checkNodeFetchChanged(OpenViduTestappUser user, boolean global, boolean hasChanged) {
		final String textAreaId = "api-response-text-area";
		By textAreaLocator = By.id(textAreaId);
		user.getDriver().findElement(By.id("clear-response-text-area-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(textAreaLocator, "value", ""));
		user.getDriver().findElement(By.id(global ? "list-sessions-btn" : "get-session-btn")).click();
		user.getWaiter().until(new NodeFetchHasChanged(hasChanged));
	}

	private class NodeFetchHasChanged implements ExpectedCondition<Boolean> {

		private boolean hasChanged;

		public NodeFetchHasChanged(boolean hasChanged) {
			this.hasChanged = hasChanged;
		}

		@Override
		public Boolean apply(WebDriver driver) {
			return driver.findElement(By.id("api-response-text-area")).getAttribute("value")
					.endsWith("Changes: " + hasChanged);
		}
	}

	/**
	 * Test default config of forced codec and allowTranscoding
	 */
	private void forceCodecGenericE2eTest(OpenViduTestappUser user) throws Exception {
		forceCodecGenericE2eTest(user, null, null);
	}

	/**
	 * Test to force specified codec and allowTranscoding
	 *
	 * @param codec            codec to force. If null, default value in openvidu
	 *                         config will be used.
	 * @param allowTranscoding If true, allow transcoding. If null, default value in
	 *                         openvidu config will be used.
	 */
	private void forceCodecGenericE2eTest(OpenViduTestappUser user, VideoCodec codec, Boolean allowTranscoding)
			throws Exception {
		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		String sessionName = "CUSTOM_SESSION_" + ((codec != null) ? codec.name() : "DEFAULT_FORCE_CODEC");

		// Configure Session to force Codec
		user.getDriver().findElement(By.id("add-user-btn")).click();
		WebElement sessionName1 = user.getDriver().findElement(By.id("session-name-input-0"));
		sessionName1.clear();
		sessionName1.sendKeys(sessionName);
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);

		if (codec != null) {
			user.getDriver().findElement(By.id("forced-video-codec-select")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("option-" + codec.name())).click();
		}
		if (allowTranscoding != null && allowTranscoding) {
			user.getDriver().findElement(By.id("allow-transcoding-checkbox")).click();
		}

		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		// Join Session
		user.getDriver().findElement(By.id("add-user-btn")).click();
		WebElement sessionName2 = user.getDriver().findElement(By.id("session-name-input-1"));
		sessionName2.clear();
		sessionName2.sendKeys(sessionName);

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		// Load properties from session object of node-client
		user.getDriver().findElement(By.id("session-info-btn-0")).click();
		Thread.sleep(500);
		JsonObject res = JsonParser
				.parseString(user.getDriver().findElement(By.id("session-text-area")).getAttribute("value"))
				.getAsJsonObject();
		VideoCodec sessionCodecNodeClient = VideoCodec
				.valueOf(res.get("properties").getAsJsonObject().get("forcedVideoCodec").getAsString());
		boolean sessionAllowTranscodingNodeClient = res.get("properties").getAsJsonObject().get("allowTranscoding")
				.getAsBoolean();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");

		// Assert Selected Codec in node-client session object
		if (codec != null) {
			// If specified codec, assert selected codec
			Assertions.assertEquals(codec, sessionCodecNodeClient);
		} else {
			// If not specified, assert default codec
			Assertions.assertEquals(defaultForcedVideoCodec, sessionCodecNodeClient);
		}

		// Assert Selected allow transcoding in node-client session object
		if (allowTranscoding != null) {
			// If specified allowTranscoding, assert selected
			Assertions.assertEquals(allowTranscoding, sessionAllowTranscodingNodeClient);
		} else {
			// If not specified, assert default allowTranscoding
			Assertions.assertEquals(defaultAllowTranscoding, sessionAllowTranscodingNodeClient);
		}

		// Check browser codecs
		VideoCodec codecToCheck = (codec != null) ? codec : defaultForcedVideoCodec;

		// Validate the codec to check for special cases:
		// * MEDIA_SERVER_PREFERRED means to use the codec that is preferred by the
		// media server.
		// * NONE means to use the codec that is preferred by the web browser.
		// Because this test is always run only for Kurento and Chrome, we know what to
		// select here.
		if (codecToCheck == VideoCodec.MEDIA_SERVER_PREFERRED) {
			// Kurento preferred video codec is VP8.
			codecToCheck = VideoCodec.VP8;
		} else if (codecToCheck == VideoCodec.NONE) {
			// Chrome preferred video codec is VP8.
			codecToCheck = VideoCodec.VP8;
		}

		List<WebElement> statsButtons = user.getDriver().findElements(By.className("stats-button"));
		for (WebElement statButton : statsButtons) {
			statButton.click();
			Thread.sleep(750);
			String videoCodecUsed = user.getDriver().findElement(By.id("video-codec-used")).getText();
			Assertions.assertEquals("video/" + codecToCheck, videoCodecUsed);
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);
		}

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/" + sessionName, HttpURLConnection.HTTP_NO_CONTENT);
	}

	/**
	 * Force codec not allowed by opened browser
	 *
	 * @throws Exception
	 */
	private void forceNotSupportedCodec(OpenViduTestappUser user, VideoCodec codec, boolean allowTranscoding)
			throws Exception {
		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		String sessionName = "CUSTOM_SESSION_CODEC_NOT_SUPPORTED";

		// Configure Session to force Codec
		user.getDriver().findElement(By.id("add-user-btn")).click();
		WebElement sessionNameElem = user.getDriver().findElement(By.id("session-name-input-0"));
		sessionNameElem.clear();
		sessionNameElem.sendKeys(sessionName);
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);

		user.getDriver().findElement(By.id("forced-video-codec-select")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("option-" + codec.name())).click();

		if (allowTranscoding) {
			user.getDriver().findElement(By.id("allow-transcoding-checkbox")).click();
		}

		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		if (allowTranscoding) {
			// If transcoding is enabled everything should work fine

			// Join another user
			user.getDriver().findElement(By.id("add-user-btn")).click();
			WebElement sessionName2 = user.getDriver().findElement(By.id("session-name-input-1"));
			sessionName2.clear();
			sessionName2.sendKeys(sessionName);

			List<WebElement> joinButtons = user.getDriver().findElements(By.className("join-btn"));
			for (WebElement el : joinButtons) {
				Thread.sleep(5000);
				el.sendKeys(Keys.ENTER);
			}

			user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
			user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
			user.getEventManager().waitUntilEventReaches("streamCreated", 4);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

			final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
			Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
			Assertions.assertTrue(user.getBrowserUser()
					.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
					"Videos were expected to have audio and video tracks");

		} else {
			// If transcoding not allowed it should return an alert with error
			user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
			try {
				user.getWaiter().until(ExpectedConditions.alertIsPresent());
				Alert alert = user.getDriver().switchTo().alert();
				Assertions.assertTrue(alert.getText().contains("Error forcing codec: '" + codec.name() + "'"),
						"Alert does not contain expected text");
				alert.accept();
			} catch (Exception e) {
				Assertions.fail("Alert exception");
			} finally {
				user.getEventManager().resetEventThread(false);
			}
		}

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/" + sessionName, HttpURLConnection.HTTP_NO_CONTENT);
		Thread.sleep(1000);
	}

	private void assertTranscodingSessionProperties(Session sessionDefaultCodec, Session sessionH264AllowTranscoding,
			Session sessionVP9AllowTranscoding) {
		// Check session with default transcoding params
		Assertions.assertEquals(defaultForcedVideoCodec, sessionDefaultCodec.getProperties().forcedVideoCodec(),
				"Wrong default forcedVideoCodec");
		Assertions.assertEquals(defaultAllowTranscoding, sessionDefaultCodec.getProperties().isTranscodingAllowed(),
				"Wrong default allowTranscoding");

		// Check session which use H264 and allow transcoding
		Assertions.assertEquals(VideoCodec.H264, sessionH264AllowTranscoding.getProperties().forcedVideoCodec(),
				"Wrong default forcedVideoCodec");
		Assertions.assertEquals(true, sessionH264AllowTranscoding.getProperties().isTranscodingAllowed(),
				"Wrong default allowTranscoding");

		// Check session which use VP9 and allow transcoding
		Assertions.assertEquals(VideoCodec.VP9, sessionVP9AllowTranscoding.getProperties().forcedVideoCodec(),
				"Wrong default forcedVideoCodec");
		Assertions.assertEquals(true, sessionVP9AllowTranscoding.getProperties().isTranscodingAllowed(),
				"Wrong default allowTranscoding");
	}

	private List<String> activeStreamsOfSession(String sessionId)
			throws OpenViduJavaClientException, OpenViduHttpException {
		OV.fetch();
		return OV.getActiveSessions().stream().filter(s -> sessionId.equals(s.getSessionId())).findFirst().get()
				.getActiveConnections().stream().filter(c -> c.getPublishers().size() > 0).map(c -> c.getPublishers())
				.flatMap(Collection::stream).map(p -> p.getStreamId()).collect(Collectors.toList());
	}

}
