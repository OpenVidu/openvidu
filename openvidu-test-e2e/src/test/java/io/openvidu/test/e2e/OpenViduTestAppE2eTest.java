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

package io.openvidu.test.e2e;

import static org.junit.Assert.fail;
import static org.openqa.selenium.OutputType.BASE64;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import javax.imageio.ImageIO;

import org.apache.commons.io.FileUtils;
import org.jcodec.api.FrameGrab;
import org.jcodec.api.JCodecException;
import org.jcodec.common.model.Picture;
import org.jcodec.scale.AWTUtil;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.junit.Assert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.platform.runner.JUnitPlatform;
import org.junit.runner.RunWith;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.Keys;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.stream.JsonReader;

import io.github.bonigarcia.SeleniumExtension;
import io.github.bonigarcia.wdm.WebDriverManager;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import io.openvidu.test.e2e.browser.BrowserUser;
import io.openvidu.test.e2e.browser.ChromeAndroidUser;
import io.openvidu.test.e2e.browser.ChromeUser;
import io.openvidu.test.e2e.browser.FirefoxUser;
import io.openvidu.test.e2e.browser.OperaUser;
import io.openvidu.test.e2e.utils.CommandLineExecuter;
import io.openvidu.test.e2e.utils.MultimediaFileMetadata;
import io.openvidu.test.e2e.utils.Unzipper;

/**
 * E2E tests for openvidu-testapp.
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 * @since 1.1.1
 */
@Tag("e2e")
@DisplayName("E2E tests for OpenVidu TestApp")
@ExtendWith(SeleniumExtension.class)
@RunWith(JUnitPlatform.class)
public class OpenViduTestAppE2eTest {

	static String OPENVIDU_SECRET = "MY_SECRET";
	static String OPENVIDU_URL = "https://localhost:4443/";
	static String APP_URL = "http://localhost:4200/";
	static Exception ex = null;
	private final Object lock = new Object();

	private static final Logger log = LoggerFactory.getLogger(OpenViduTestAppE2eTest.class);

	BrowserUser user;
	Collection<BrowserUser> otherUsers = new ArrayList<>();
	volatile static boolean isRecordingTest;
	private static OpenVidu OV;

	@BeforeAll()
	static void setupAll() {

		String ffmpegOutput = new CommandLineExecuter().executeCommand("which ffmpeg");
		if (ffmpegOutput == null || ffmpegOutput.isEmpty()) {
			log.error("ffmpeg package is not installed in the host machine");
			Assert.fail();
			return;
		} else {
			log.info("ffmpeg is installed and accesible");
		}

		WebDriverManager.chromedriver().setup();
		WebDriverManager.firefoxdriver().setup();

		String appUrl = System.getProperty("APP_URL");
		if (appUrl != null) {
			APP_URL = appUrl;
		}
		log.info("Using URL {} to connect to openvidu-testapp", APP_URL);

		String openviduUrl = System.getProperty("OPENVIDU_URL");
		if (openviduUrl != null) {
			OPENVIDU_URL = openviduUrl;
		}
		log.info("Using URL {} to connect to openvidu-server", OPENVIDU_URL);

		String openvidusecret = System.getProperty("OPENVIDU_SECRET");
		if (openvidusecret != null) {
			OPENVIDU_SECRET = openvidusecret;
		}
		log.info("Using secret {} to connect to openvidu-server", OPENVIDU_SECRET);

		try {
			log.info("Cleaning folder /opt/openvidu/recordings");
			FileUtils.cleanDirectory(new File("/opt/openvidu/recordings"));
		} catch (IOException e) {
			log.error(e.getMessage());
		}
		OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
	}

	void setupBrowser(String browser) {

		switch (browser) {
		case "chrome":
			this.user = new ChromeUser("TestUser", 50);
			break;
		case "firefox":
			this.user = new FirefoxUser("TestUser", 50);
			break;
		case "opera":
			this.user = new OperaUser("TestUser", 50);
			break;
		case "chromeAndroid":
			this.user = new ChromeAndroidUser("TestUser", 50);
			break;
		case "chromeAlternateScreenShare":
			this.user = new ChromeUser("TestUser", 50, "OpenVidu TestApp");
			break;
		default:
			this.user = new ChromeUser("TestUser", 50);
		}

		user.getDriver().get(APP_URL);

		WebElement urlInput = user.getDriver().findElement(By.id("openvidu-url"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		WebElement secretInput = user.getDriver().findElement(By.id("openvidu-secret"));
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);

		user.getEventManager().startPolling();
	}

	void setupChromeWithFakeVideo(Path videoFileLocation) {
		this.user = new ChromeUser("TestUser", 50, videoFileLocation);
		user.getDriver().get(APP_URL);
		WebElement urlInput = user.getDriver().findElement(By.id("openvidu-url"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		WebElement secretInput = user.getDriver().findElement(By.id("openvidu-secret"));
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);
		user.getEventManager().startPolling();
	}

	@AfterEach
	void dispose() {
		user.dispose();
		Iterator<BrowserUser> it = otherUsers.iterator();
		while (it.hasNext()) {
			BrowserUser other = it.next();
			other.dispose();
			it.remove();
		}
		try {
			OV.fetch();
		} catch (OpenViduJavaClientException | OpenViduHttpException e1) {
			log.error("Error fetching sessions: {}", e1.getMessage());
		}
		OV.getActiveSessions().forEach(session -> {
			try {
				session.close();
				log.info("Session {} successfully closed", session.getSessionId());
			} catch (OpenViduJavaClientException e) {
				log.error("Error closing session: {}", e.getMessage());
			} catch (OpenViduHttpException e) {
				log.error("Error closing session: {}", e.getMessage());
			}
		});
		if (isRecordingTest) {
			try {
				FileUtils.cleanDirectory(new File("/opt/openvidu/recordings"));
			} catch (IOException e) {
				log.error(e.getMessage());
			}
			isRecordingTest = false;
		}
	}

	@Test
	@DisplayName("One2One Chrome [Video + Audio]")
	void oneToOneVideoAudioSessionChrome() throws Exception {

		setupBrowser("chrome");

		log.info("One2One Chrome [Video + Audio]");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 4);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("One2One [Audio]")
	void oneToOneAudioSession() throws Exception {

		setupBrowser("chrome");

		log.info("One2One [Audio]");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getDriver().findElements(By.className("send-video-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		System.out.println(this.getBase64Screenshot(user));

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 4);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, false));

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("One2One [Video]")
	void oneToOneVideoSession() throws Exception {

		setupBrowser("chrome");

		log.info("One2One [Video]");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getDriver().findElements(By.className("send-audio-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 4);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				false, true));

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("One2Many [Video + Audio]")
	void oneToManyVideoAudioSession() throws Exception {

		setupBrowser("chrome");

		log.info("One2Many [Video + Audio]");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 16);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 4);
		user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true);

		gracefullyLeaveParticipants(4);
	}

	@Test
	@DisplayName("Unique user remote subscription [Video + Audio]")
	void oneRemoteSubscription() throws Exception {

		setupBrowser("chrome");

		log.info("Unique user remote subscription [Video + Audio]");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 1);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(1);
	}

	@Test
	@DisplayName("Unique user remote subscription Firefox [Video + Audio]")
	void oneRemoteSubscriptionFirefox() throws Exception {

		setupBrowser("firefox");

		log.info("Unique user remote subscription Firefox [Video + Audio]");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);

		Thread.sleep(3000);

		gracefullyLeaveParticipants(1);
	}

	@Test
	@DisplayName("Unique user remote subscription [ScreenShare + Audio]")
	void oneRemoteSubscriptionScreen() throws Exception {

		setupBrowser("chrome");

		log.info("Unique user remote subscription [ScreenShare + Audio]");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("screen-radio")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 1);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(1);
	}

	@Test
	@DisplayName("Many2Many [Video + Audio]")
	void manyToManyVideoAudioSession() throws Exception {

		setupBrowser("chrome");

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

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 16);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(4);
	}

	@Test
	@DisplayName("One2One Firefox [Video + Audio]")
	void oneToOneVideoAudioSessionFirefox() throws Exception {

		setupBrowser("firefox");

		log.info("One2One Firefox [Video + Audio]");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 4);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Cross-Browser test")
	void crossBrowserTest() throws Exception {

		setupBrowser("chrome");

		log.info("Cross-Browser test");

		Thread.UncaughtExceptionHandler h = new Thread.UncaughtExceptionHandler() {
			public void uncaughtException(Thread th, Throwable ex) {
				System.out.println("Uncaught exception: " + ex);
				synchronized (lock) {
					OpenViduTestAppE2eTest.ex = new Exception(ex);
				}
			}
		};

		Thread t = new Thread(() -> {
			BrowserUser user2 = new FirefoxUser("TestUser", 30);
			otherUsers.add(user2);
			user2.getDriver().get(APP_URL);
			WebElement urlInput = user2.getDriver().findElement(By.id("openvidu-url"));
			urlInput.clear();
			urlInput.sendKeys(OPENVIDU_URL);
			WebElement secretInput = user2.getDriver().findElement(By.id("openvidu-secret"));
			secretInput.clear();
			secretInput.sendKeys(OPENVIDU_SECRET);

			user2.getEventManager().startPolling();

			user2.getDriver().findElement(By.id("add-user-btn")).click();
			user2.getDriver().findElement(By.className("join-btn")).click();
			try {
				user2.getEventManager().waitUntilEventReaches("connectionCreated", 2);
				user2.getEventManager().waitUntilEventReaches("accessAllowed", 1);
				user2.getEventManager().waitUntilEventReaches("streamCreated", 2);
				user2.getEventManager().waitUntilEventReaches("streamPlaying", 2);

				Assert.assertEquals(user2.getDriver().findElements(By.tagName("video")).size(), 2);
				Assert.assertTrue(user2.getEventManager()
						.assertMediaTracks(user2.getDriver().findElements(By.tagName("video")), true, true));

				user2.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
				user2.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
				user2.getDriver().findElement(By.id("remove-user-btn")).click();
				user2.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
			} catch (Exception e) {
				e.printStackTrace();
				user2.dispose();
				Thread.currentThread().interrupt();
			}
			user2.dispose();
		});
		t.setUncaughtExceptionHandler(h);
		t.start();

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 2);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 2);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(1);

		t.join();

		synchronized (lock) {
			if (OpenViduTestAppE2eTest.ex != null) {
				throw OpenViduTestAppE2eTest.ex;
			}
		}
	}

	@Test
	@DisplayName("Signal message")
	void oneToManySignalMessage() throws Exception {

		setupBrowser("chrome");

		log.info("Signal message");

		WebElement addUser = user.getDriver().findElement(By.id("add-user-btn"));
		for (int i = 0; i < 4; i++) {
			addUser.click();
		}

		user.getDriver().findElements(By.className("publish-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 16);
		user.getDriver().findElements(By.className(("message-btn"))).get(0).click();
		user.getEventManager().waitUntilEventReaches("signal", 4);

		gracefullyLeaveParticipants(4);

	}

	@Test
	@DisplayName("Subscribe Unsubscribe")
	void subscribeUnsubscribeTest() throws Exception {

		setupBrowser("chrome");

		log.info("Subscribe Unsubscribe");

		user.getDriver().findElement(By.id("one2one-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .publish-checkbox")).click();

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 2);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		// Global unsubscribe-subscribe
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		WebElement subBtn = user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-btn")));
		subBtn.click();

		user.getWaiter()
				.until(ExpectedConditions.not(ExpectedConditions.attributeToBeNotEmpty(subscriberVideo, "srcObject")));
		Assert.assertFalse(user.getEventManager().hasMediaStream(subscriberVideo));

		subBtn.click();
		user.getEventManager().waitUntilEventReaches("streamPlaying", 3);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 2);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		// Video unsubscribe
		subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		Iterable<WebElement> firstVideo = Arrays.asList(subscriberVideo);
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-video-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(firstVideo, true, false));

		// Audio unsubscribe

		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-audio-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(firstVideo, false, false));

		// Video and audio subscribe

		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-video-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(firstVideo, false, true));
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-audio-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(firstVideo, true, true));

		gracefullyLeaveParticipants(2);

	}

	@Test
	@DisplayName("Publish Unpublish")
	void publishUnpublishTest() throws Exception {

		setupBrowser("chrome");

		log.info("Signal message");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 4));
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		Thread.sleep(2000);

		List<WebElement> publishButtons = user.getDriver().findElements(By.className("pub-btn"));
		for (WebElement el : publishButtons) {
			el.click();
		}

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		for (WebElement video : user.getDriver().findElements(By.tagName("video"))) {
			user.getWaiter()
					.until(ExpectedConditions.not(ExpectedConditions.attributeToBeNotEmpty(video, "srcObject")));
			Assert.assertFalse(user.getEventManager().hasMediaStream(video));
		}

		for (WebElement el : publishButtons) {
			el.click();
			Thread.sleep(1000);
		}

		user.getEventManager().waitUntilEventReaches("streamCreated", 8);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 8);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(2);

	}

	@Test
	@DisplayName("Change publisher dynamically")
	void changePublisherTest() throws Exception {

		Queue<Boolean> threadAssertions = new ConcurrentLinkedQueue<Boolean>();

		setupBrowser("chrome");

		log.info("Change publisher dynamically");

		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();

		final CountDownLatch latch1 = new CountDownLatch(2);

		// First publication (audio + video [CAMERA])
		user.getEventManager().on("streamPlaying", (event) -> {
			if (event.get("eventContent") != null) {
				threadAssertions.add(((String) event.get("eventContent")).contains("CAMERA"));
			}
			latch1.countDown();
		});
		user.getDriver().findElement(By.id("one2many-btn")).click();

		Thread.sleep(2000);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		if (!latch1.await(8000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail();
			return;
		}

		user.getEventManager().off("streamPlaying");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		Thread.sleep(2000);

		final CountDownLatch latch2 = new CountDownLatch(2);

		// Second publication (only video (SCREEN))
		user.getEventManager().on("streamPlaying", (event) -> {
			if (event.get("eventContent") != null) {
				threadAssertions.add(((String) event.get("eventContent")).contains("SCREEN"));
			}
			latch2.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .change-publisher-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		if (!latch2.await(8000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail();
			return;
		}

		user.getEventManager().off("streamPlaying");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				false, true));

		Thread.sleep(2000);

		final CountDownLatch latch3 = new CountDownLatch(2);

		// Third publication (audio + video [CAMERA])
		user.getEventManager().on("streamPlaying", (event) -> {
			if (event.get("eventContent") != null) {
				threadAssertions.add(((String) event.get("eventContent")).contains("CAMERA"));
			}
			latch3.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .change-publisher-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 3);
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 6);

		if (!latch3.await(8000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail();
			return;
		}

		user.getEventManager().off("streamPlaying");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		gracefullyLeaveParticipants(2);

	}

	@Test
	@DisplayName("Moderator capabilities")
	void moderatorCapabilitiesTest() throws Exception {

		setupBrowser("chrome");

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

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 3));
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		// Moderator forces unpublish
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .force-unpub-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 3);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));

		// Publisher publishes again
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 6);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 3));
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		// Moderator forces disconnect of publisher
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .force-disconnect-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 6);
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 2);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 0));

		gracefullyLeaveParticipants(3);

	}

	@Test
	@DisplayName("Stream property changed event")
	void streamPropertyChangedEventTest() throws Exception {

		Queue<Boolean> threadAssertions = new ConcurrentLinkedQueue<Boolean>();

		setupBrowser("chromeAlternateScreenShare");

		log.info("Stream property changed event");

		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");

		user.getDriver().findElement(By.id("one2many-btn")).click();
		user.getDriver().findElement(By.className("screen-radio")).click();

		List<WebElement> joinButtons = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : joinButtons) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		// Unpublish video
		final CountDownLatch latch1 = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			threadAssertions.add(((String) event.get("eventContent")).contains("videoActive [false]"));
			latch1.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-video-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);

		if (!latch1.await(5000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail();
			return;
		}

		user.getEventManager().off("streamPropertyChanged");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		// Unpublish audio
		final CountDownLatch latch2 = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			threadAssertions.add(((String) event.get("eventContent")).contains("audioActive [false]"));
			latch2.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-audio-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);

		if (!latch2.await(5000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail();
			return;
		}

		user.getEventManager().off("streamPropertyChanged");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		// Resize captured window
		final CountDownLatch latch3 = new CountDownLatch(2);
		int newWidth = 1500;
		int newHeight = 500;

		final long[] expectedWidthHeight = new long[2];

		user.getEventManager().on("streamPropertyChanged", (event) -> {
			threadAssertions.add(((String) event.get("eventContent")).contains("videoDimensions [{\"width\":"
					+ expectedWidthHeight[0] + ",\"height\":" + expectedWidthHeight[1] + "}]"));
			latch3.countDown();
		});

		user.getDriver().manage().window().setSize(new Dimension(newWidth, newHeight));

		String widthAndHeight = user.getEventManager().getDimensionOfViewport();
		JSONObject obj = (JSONObject) new JSONParser().parse(widthAndHeight);

		expectedWidthHeight[0] = (long) obj.get("width");
		expectedWidthHeight[1] = (long) obj.get("height") - 1;

		System.out.println("New viewport dimension: " + obj.toJSONString());

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 6);

		if (!latch3.await(5000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail();
			return;
		}

		user.getEventManager().off("streamPropertyChanged");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Local record")
	void localRecordTest() throws Exception {

		setupBrowser("chrome");

		log.info("Local record");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

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

		user.getWaiter().until(ExpectedConditions.elementToBeClickable(By.cssSelector("#recorder-preview video")));

		user.getWaiter().until(
				waitForVideoDuration(user.getDriver().findElement(By.cssSelector("#recorder-preview video")), 4));

		user.getDriver().findElement(By.id("close-record-btn")).click();

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("#recorder-preview video"), 0));

		gracefullyLeaveParticipants(1);
	}

	@Test
	@DisplayName("Remote composed record")
	void remoteComposedRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chrome");

		log.info("Remote composed record");

		final String sessionName = "COMPOSED_RECORDED_SESSION";
		final String resolution = "1280x720";

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-0")).clear();
		user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

		// API REST test
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);

		// Try to record a non-existing session
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		listEmptyRecordings();

		// Try to stop a non-existing recording
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys("FAIL");
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		listEmptyRecordings();

		// Try to get a non-existing recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		listEmptyRecordings();

		// Try to delete a non-existing recording
		user.getDriver().findElement(By.id("get-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);

		// Join the user to the session
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("rec-properties-btn")).click();
		Thread.sleep(500);
		WebElement resolutionField = user.getDriver().findElement(By.id("recording-resolution-field"));
		resolutionField.clear();
		resolutionField.sendKeys(resolution);

		user.getDriver().findElement(By.id("start-recording-btn")).click();

		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

		Thread.sleep(5000);

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

		Assert.assertTrue(file1.exists() && file1.length() > 0);
		Assert.assertTrue(file2.exists() && file2.length() > 0);
		Assert.assertTrue(file3.exists() && file3.length() > 0);

		Assert.assertTrue(
				this.recordedFileFine(file1, new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(sessionName)));
		Assert.assertTrue(this.thumbnailIsFine(file3));

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

		Assert.assertFalse(file1.exists());
		Assert.assertFalse(file2.exists());
		Assert.assertFalse(file3.exists());

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(1);
	}

	@Test
	@DisplayName("Remote individual record")
	void remoteIndividualRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chrome");

		log.info("Remote individual record");

		final String sessionName = "TestSession";
		final String recordingName = "CUSTOM_NAME";

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-0")).clear();
		user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

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

		Thread.sleep(5000);

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
		this.checkIndividualRecording(recPath, recording, 2, "opus", "vp8");

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

		Assert.assertFalse(new File(recPath).exists());

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Remote record cross-browser audio-only and video-only")
	void remoteRecordAudioOnlyVideoOnlyTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chromeAlternateScreenShare");

		log.info("Remote record cross-browser audio-only and video-only");

		final String SESSION_NAME = "TestSession";
		final String RECORDING_COMPOSED_VIDEO = "COMPOSED_VIDEO_ONLY";
		final String RECORDING_COMPOSED_AUDIO = "COMPOSED_AUDIO_ONLY";
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
			BrowserUser user2 = new FirefoxUser("FirefoxUser", 30);
			otherUsers.add(user2);
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
				user2.getEventManager().waitUntilEventReaches("connectionCreated", 4);
				user2.getEventManager().waitUntilEventReaches("accessAllowed", 2);
				user2.getEventManager().waitUntilEventReaches("streamCreated", 8);
				user2.getEventManager().waitUntilEventReaches("streamPlaying", 8);

				Assert.assertEquals(user2.getDriver().findElements(By.tagName("video")).size(), 8);

				user2.getEventManager().waitUntilEventReaches("recordingStarted", 2);
				user2.getEventManager().waitUntilEventReaches("recordingStopped", 2);

				user2.getEventManager().waitUntilEventReaches("recordingStarted", 4);
				user2.getEventManager().waitUntilEventReaches("recordingStopped", 4);

				user2.getEventManager().waitUntilEventReaches("recordingStarted", 6);
				user2.getEventManager().waitUntilEventReaches("recordingStopped", 6);

				user2.getEventManager().waitUntilEventReaches("recordingStarted", 8);
				user2.getEventManager().waitUntilEventReaches("recordingStopped", 8);

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

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 8);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 8);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 8);

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

		// Audio-only COMPOSED recording
		recordingNameField.clear();
		recordingNameField.sendKeys(RECORDING_COMPOSED_AUDIO);
		user.getDriver().findElement(By.id("rec-hasaudio-checkbox")).click();
		user.getDriver().findElement(By.id("rec-hasvideo-checkbox")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + SESSION_NAME + "-1]"));
		user.getEventManager().waitUntilEventReaches("recordingStarted", 4);

		Thread.sleep(RECORDING_DURATION);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME + "-1");
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "-1]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 4);

		// Video-only INDIVIDUAL recording
		recordingNameField.clear();
		recordingNameField.sendKeys(RECORDING_INDIVIDUAL_VIDEO);
		user.getDriver().findElement(By.id("rec-hasaudio-checkbox")).click();
		user.getDriver().findElement(By.id("rec-hasvideo-checkbox")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("rec-outputmode-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-INDIVIDUAL")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + SESSION_NAME + "-2]"));
		user.getEventManager().waitUntilEventReaches("recordingStarted", 6);

		Thread.sleep(RECORDING_DURATION);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME + "-2");
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "-2]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 6);

		// Audio-only INDIVIDUAL recording
		recordingNameField.clear();
		recordingNameField.sendKeys(RECORDING_INDIVIDUAL_AUDIO);
		user.getDriver().findElement(By.id("rec-hasaudio-checkbox")).click();
		user.getDriver().findElement(By.id("rec-hasvideo-checkbox")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + SESSION_NAME + "-3]"));
		user.getEventManager().waitUntilEventReaches("recordingStarted", 8);

		Thread.sleep(RECORDING_DURATION);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME + "-3");
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + SESSION_NAME + "-3]"));
		user.getEventManager().waitUntilEventReaches("recordingStopped", 8);

		String recordingsPath = "/opt/openvidu/recordings/";

		// Check video-only COMPOSED recording
		String recPath = recordingsPath + SESSION_NAME + "/";
		Recording recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME);
		this.checkMultimediaFile(new File(recPath + recording.getName() + ".mp4"), false, true, recording.getDuration(),
				recording.getResolution(), null, "h264");

		// Check audio-only COMPOSED recording
		recPath = recordingsPath + SESSION_NAME + "-1/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "-1");
		this.checkMultimediaFile(new File(recPath + recording.getName() + ".webm"), true, false,
				recording.getDuration(), null, "opus", null);

		// Check video-only INDIVIDUAL recording
		recPath = recordingsPath + SESSION_NAME + "-2/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "-2");
		this.checkIndividualRecording(recPath, recording, 3, "opus", "vp8");

		// Check audio-only INDIVIDUAL recording
		recPath = recordingsPath + SESSION_NAME + "-3/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "-3");
		this.checkIndividualRecording(recPath, recording, 2, "opus", "vp8");

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(2);

		t.join();

		synchronized (lock) {
			if (OpenViduTestAppE2eTest.ex != null) {
				throw OpenViduTestAppE2eTest.ex;
			}
		}
	}

	@Test
	@DisplayName("REST API: Fetch all, fetch one, force disconnect, force unpublish, close session")
	void restApiFetchForce() throws Exception {
		setupBrowser("chrome");

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

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		// Fetch existing session (change)
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("get-session-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value", "Changes: true"));

		// Store connectionId and streamId
		String response = user.getDriver().findElement(By.id("api-response-text-area")).getAttribute("value");
		JSONObject json = (JSONObject) ((JSONArray) new JSONParser().parse(response.split("%")[1])).get(0);
		String connectionId = (String) json.keySet().iterator().next();
		String streamId = (String) ((JSONObject) ((JSONArray) json.get(connectionId)).get(0)).get("streamId");

		// Fetch all sessions (no change)
		user.getDriver().findElement(By.id("list-sessions-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value",
				"Number: 1. Changes: false"));

		// Force unpublish wrong
		user.getDriver().findElement(By.id("resource-id-field")).clear();
		user.getDriver().findElement(By.id("resource-id-field")).sendKeys("FAIL");
		user.getDriver().findElement(By.id("force-unpublish-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		// Force unpublish right
		user.getDriver().findElement(By.id("resource-id-field")).clear();
		user.getDriver().findElement(By.id("resource-id-field")).sendKeys(streamId);
		user.getDriver().findElement(By.id("force-unpublish-api-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Stream unpublished"));
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);

		// Force disconnect wrong
		user.getDriver().findElement(By.id("resource-id-field")).clear();
		user.getDriver().findElement(By.id("resource-id-field")).sendKeys("FAIL");
		user.getDriver().findElement(By.id("force-disconnect-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

		// Force disconnect right
		user.getDriver().findElement(By.id("resource-id-field")).clear();
		user.getDriver().findElement(By.id("resource-id-field")).sendKeys(connectionId);
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

		gracefullyLeaveParticipants(1);

	}

	@Test
	@DisplayName("Video filter test")
	void videoFilterTest() throws Exception {

		setupBrowser("chrome");

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

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 2);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				false, true));

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video"));

		// Analyze Chrome fake video stream without gray filter (GREEN color)
		Map<String, Long> rgb = user.getEventManager().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assert.assertTrue(checkVideoAverageRgbGreen(rgb));

		// Try to apply none allowed filter
		user.getDriver().findElement(By.cssSelector(".filter-btn")).click();
		WebElement filterTypeInput = user.getDriver().findElement(By.id("filter-type-field"));
		filterTypeInput.clear();
		filterTypeInput.sendKeys("NotAllowedFilter");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
				"Error [You don't have permissions to apply a filter]"));

		// Try to execute method over not applied filter
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
				"has no filter applied in session"));

		// Apply allowed video filter
		filterTypeInput.clear();
		filterTypeInput.sendKeys("GStreamerFilter");
		WebElement filterOptionsInput = user.getDriver().findElement(By.id("filter-options-field"));
		filterOptionsInput.clear();
		filterOptionsInput.sendKeys("{\"command\": \"videobalance saturation=0.0\"}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value", "Filter applied"));

		// Try to apply another filter
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
				"already has a filter applied in session"));

		// Analyze Chrome fake video stream with gray filter (GRAY color)
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);
		Thread.sleep(500);
		rgb = user.getEventManager().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assert.assertTrue(checkVideoAverageRgbGray(rgb));

		// Execute filter method
		WebElement filterMethodInput = user.getDriver().findElement(By.id("filter-method-field"));
		filterMethodInput.clear();
		filterMethodInput.sendKeys("setElementProperty");
		WebElement filterParamsInput = user.getDriver().findElement(By.id("filter-params-field"));
		filterParamsInput.clear();
		filterParamsInput.sendKeys("{\"propertyName\":\"saturation\",\"propertyValue\":\"1.0\"}");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
				"Filter method executed"));

		// Analyze Chrome fake video stream without gray filter (GREEN color)
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);
		Thread.sleep(500);
		rgb = user.getEventManager().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assert.assertTrue(checkVideoAverageRgbGreen(rgb));

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
		rgb = user.getEventManager().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assert.assertTrue(checkVideoAverageRgbGray(rgb));

		// Remove filter
		user.getDriver().findElement(By.cssSelector(".filter-btn")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value", "Filter removed"));
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 6);
		Thread.sleep(1000);

		// Analyze Chrome fake video stream with gray filter (GREEN color)
		rgb = user.getEventManager().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assert.assertTrue(checkVideoAverageRgbGreen(rgb));

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Video filter events test")
	void videoFilterEventsTest() throws Exception {

		setupChromeWithFakeVideo(Paths.get("/opt/openvidu/barcode.y4m"));

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

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 2);
		// Assert no audio track only for the moderator incoming video
		Assert.assertTrue(user.getEventManager().assertMediaTracks(
				user.getDriver().findElements(By.cssSelector("#openvidu-instance-1 video")), false, true));

		// Publisher applies ZBarCode filter to itself
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .filter-btn")).click();
		Thread.sleep(500);
		WebElement input = user.getDriver().findElement(By.id("filter-type-field"));
		input.clear();
		input.sendKeys("ZBarFilter");
		input = user.getDriver().findElement(By.id("filter-options-field"));
		input.clear();
		input.sendKeys("{}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value", "Filter applied"));

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);

		// Publisher subscribes to CodeFound event for his own stream
		input = user.getDriver().findElement(By.id("filter-event-type-field"));
		input.clear();
		input.sendKeys("CodeFound");
		user.getDriver().findElement(By.id("sub-filter-event-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
				"Filter event listener added"));

		user.getEventManager().waitUntilEventReaches("filterEvent", 2);

		// Publisher unsubscribes from "CodeFound" filter event
		user.getDriver().findElement(By.id("unsub-filter-event-btn")).click();

		try {
			// If this active wait finishes successfully, then the removal of the event
			// listener has not worked fine
			user.getEventManager().waitUntilEventReaches("filterEvent", 3, 3, false);
			Assert.fail("'filterEvent' was received. Filter.removeEventListener() failed");
		} catch (Exception e) {
			System.out.println("Filter event removal worked fine");
		}

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		// Moderator subscribes to CodeFound event for the Publisher's stream
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .filter-btn")).click();
		Thread.sleep(500);
		input = user.getDriver().findElement(By.id("filter-event-type-field"));
		input.clear();
		input.sendKeys("CodeFound");
		user.getDriver().findElement(By.id("sub-filter-event-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
				"Filter event listener added"));

		user.getEventManager().waitUntilEventReaches("filterEvent", 4);

		// Moderator removes the Publisher's filter
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value", "Filter removed"));
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);

		try {
			// If this active wait finishes successfully, then the removal of the filter has
			// not worked fine
			user.getEventManager().waitUntilEventReaches("filterEvent", 5, 3, false);
			Assert.fail("'filterEvent' was received. Stream.removeFilter() failed");
		} catch (Exception e) {
			System.out.println("Filter removal worked fine");
		}

		gracefullyLeaveParticipants(2);
	}

	private void listEmptyRecordings() {
		// List existing recordings (empty)
		user.getDriver().findElement(By.id("list-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Recording list []"));
	}

	private ExpectedCondition<Boolean> waitForVideoDuration(WebElement element, int durationInSeconds) {
		return new ExpectedCondition<Boolean>() {
			@Override
			public Boolean apply(WebDriver input) {
				return element.getAttribute("duration").matches(
						durationInSeconds - 1 + "\\.[8-9][0-9]{0,5}|" + durationInSeconds + "\\.[0-2][0-9]{0,5}");
			}
		};
	}

	private boolean checkVideoAverageRgbGreen(Map<String, Long> rgb) {
		// GREEN color: {r < 15, g > 130, b <15}
		return (rgb.get("r") < 15) && (rgb.get("g") > 130) && (rgb.get("b") < 15);
	}

	private boolean checkVideoAverageRgbGray(Map<String, Long> rgb) {
		// GRAY color: {r < 50, g < 50, b < 50} and the absolute difference between them
		// not greater than 2
		return (rgb.get("r") < 50) && (rgb.get("g") < 50) && (rgb.get("b") < 50)
				&& (Math.abs(rgb.get("r") - rgb.get("g")) <= 2) && (Math.abs(rgb.get("r") - rgb.get("b")) <= 2)
				&& (Math.abs(rgb.get("b") - rgb.get("g")) <= 2);
	}

	private void gracefullyLeaveParticipants(int numberOfParticipants) throws Exception {
		int accumulatedConnectionDestroyed = 0;
		for (int j = 1; j <= numberOfParticipants; j++) {
			user.getDriver().findElement(By.id("remove-user-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("sessionDisconnected", j);
			accumulatedConnectionDestroyed = (j != numberOfParticipants)
					? (accumulatedConnectionDestroyed + numberOfParticipants - j)
					: (accumulatedConnectionDestroyed);
			user.getEventManager().waitUntilEventReaches("connectionDestroyed", accumulatedConnectionDestroyed);
		}
	}

	private String getBase64Screenshot(BrowserUser user) throws Exception {
		String screenshotBase64 = ((TakesScreenshot) user.getDriver()).getScreenshotAs(BASE64);
		return "data:image/png;base64," + screenshotBase64;
	}

	private boolean recordedFileFine(File file, Recording recording) {
		this.checkMultimediaFile(file, true, true, recording.getDuration(), recording.getResolution(), "aac", "h264");

		boolean isFine = false;
		Picture frame;
		try {
			// Get a frame at 75% duration and check that it has the expected color
			frame = FrameGrab.getFrameAtSec(file, (double) (recording.getDuration() * 0.75));
			BufferedImage image = AWTUtil.toBufferedImage(frame);
			Map<String, Long> colorMap = this.averageColor(image);

			Assert.assertEquals(image.getWidth() + "x" + image.getHeight(), recording.getResolution());

			log.info("Recording map color: {}", colorMap.toString());
			isFine = this.checkVideoAverageRgbGreen(colorMap);
		} catch (IOException | JCodecException e) {
			log.warn("Error getting frame from video recording: {}", e.getMessage());
			isFine = false;
		}
		return isFine;
	}

	private void checkIndividualRecording(String recPath, Recording recording, int numberOfVideoFiles,
			String audioDecoder, String videoDecoder) {

		// Should be only 2 files: zip and metadata
		File folder = new File(recPath);
		Assert.assertEquals(folder.listFiles().length, 2);

		File file1 = new File(recPath + recording.getName() + ".zip");
		File file2 = new File(recPath + ".recording." + recording.getId());

		Assert.assertTrue(file1.exists() && file1.length() > 0);
		Assert.assertTrue(file2.exists() && file2.length() > 0);

		List<File> unzippedWebmFiles = new Unzipper().unzipFile(recPath, recording.getName() + ".zip");

		log.info("Expected {} video files and ZIP file has {}", numberOfVideoFiles, unzippedWebmFiles.size());
		Assert.assertEquals(numberOfVideoFiles, unzippedWebmFiles.size());

		File jsonSyncFile = new File(recPath + recording.getName() + ".json");
		Assert.assertTrue(jsonSyncFile.exists() && jsonSyncFile.length() > 0);
		JsonObject jsonSyncMetadata;
		try {
			Gson gson = new Gson();
			JsonReader reader = new JsonReader(new FileReader(jsonSyncFile));
			jsonSyncMetadata = gson.fromJson(reader, JsonObject.class);
		} catch (Exception e) {
			log.error("Cannot read JSON sync metadata file from {}. Error: {}", jsonSyncFile.getAbsolutePath(),
					e.getMessage());
			Assert.fail();
			return;
		}

		long totalFileSize = 0;
		JsonArray syncArray = jsonSyncMetadata.get("files").getAsJsonArray();
		for (File webmFile : unzippedWebmFiles) {
			totalFileSize += webmFile.length();
			Assert.assertTrue(webmFile.exists() && webmFile.length() > 0);
			double durationInSeconds = 0;
			boolean found = false;
			for (int i = 0; i < syncArray.size(); i++) {
				JsonObject j = syncArray.get(i).getAsJsonObject();
				if (webmFile.getName().contains(j.get("streamId").getAsString())) {
					durationInSeconds = (double) (j.get("endTimeOffset").getAsDouble()
							- j.get("startTimeOffset").getAsDouble()) / 1000;
					found = true;
					break;
				}
			}
			Assert.assertTrue(found);
			log.info("Duration of {} according to sync metadata json file: {} s", webmFile.getName(),
					durationInSeconds);
			this.checkMultimediaFile(webmFile, recording.hasAudio(), recording.hasVideo(), durationInSeconds,
					recording.getResolution(), audioDecoder, videoDecoder);
			webmFile.delete();
		}
		Assert.assertEquals(recording.getSize(), totalFileSize);

		jsonSyncFile.delete();
	}

	private void checkMultimediaFile(File file, boolean hasAudio, boolean hasVideo, double duration, String resolution,
			String audioDecoder, String videoDecoder) {
		// Check tracks, duration, resolution, framerate and decoders
		MultimediaFileMetadata metadata = new MultimediaFileMetadata(file.getAbsolutePath());

		if (hasVideo) {
			if (hasAudio) {
				Assert.assertTrue(metadata.hasAudio() && metadata.hasVideo());
				Assert.assertTrue(metadata.getAudioDecoder().toLowerCase().contains(audioDecoder));
			} else {
				Assert.assertTrue(metadata.hasVideo());
				Assert.assertFalse(metadata.hasAudio());
			}
			if (resolution != null) {
				Assert.assertEquals(resolution, metadata.getVideoWidth() + "x" + metadata.getVideoHeight());
			}
			Assert.assertTrue(metadata.getVideoDecoder().toLowerCase().contains(videoDecoder));
		} else if (hasAudio) {
			Assert.assertTrue(metadata.hasAudio());
			Assert.assertFalse(metadata.hasVideo());
			Assert.assertTrue(metadata.getAudioDecoder().toLowerCase().contains(audioDecoder));
		} else {
			Assert.fail("Cannot check a file witho no audio and no video");
		}
		// Check duration with 1 decimal precision
		DecimalFormat df = new DecimalFormat("#0.0");
		df.setRoundingMode(RoundingMode.UP);
		log.info("Duration of {} according to ffmpeg: {} s", file.getName(), metadata.getDuration());
		log.info("Duration of {} according to 'duration' property: {} s", file.getName(), duration);
		log.info("Difference in s duration: {}", Math.abs(metadata.getDuration() - duration));
		Assert.assertTrue(Math.abs((metadata.getDuration() - duration)) < 0.3);
	}

	private boolean thumbnailIsFine(File file) {
		boolean isFine = false;
		BufferedImage image = null;
		try {
			image = ImageIO.read(file);
		} catch (IOException e) {
			log.error(e.getMessage());
			return false;
		}
		log.info("Recording thumbnail dimensions: {}x{}", image.getWidth(), image.getHeight());
		Map<String, Long> colorMap = this.averageColor(image);
		log.info("Thumbnail map color: {}", colorMap.toString());
		isFine = this.checkVideoAverageRgbGreen(colorMap);
		return isFine;
	}

	private Map<String, Long> averageColor(BufferedImage bi) {
		int x0 = 0;
		int y0 = 0;
		int w = bi.getWidth();
		int h = bi.getHeight();
		int x1 = x0 + w;
		int y1 = y0 + h;
		long sumr = 0, sumg = 0, sumb = 0;
		for (int x = x0; x < x1; x++) {
			for (int y = y0; y < y1; y++) {
				Color pixel = new Color(bi.getRGB(x, y));
				sumr += pixel.getRed();
				sumg += pixel.getGreen();
				sumb += pixel.getBlue();
			}
		}
		int num = w * h;
		Map<String, Long> colorMap = new HashMap<>();
		colorMap.put("r", (long) (sumr / num));
		colorMap.put("g", (long) (sumg / num));
		colorMap.put("b", (long) (sumb / num));
		return colorMap;
	}

}
