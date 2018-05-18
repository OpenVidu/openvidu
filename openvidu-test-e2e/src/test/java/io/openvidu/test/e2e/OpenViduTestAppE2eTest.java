/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

import static java.lang.invoke.MethodHandles.lookup;
import static org.slf4j.LoggerFactory.getLogger;
import static org.openqa.selenium.OutputType.BASE64;
import org.slf4j.Logger;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.regex.Pattern;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.runner.RunWith;
import org.junit.platform.runner.JUnitPlatform;
import org.junit.Assert;

import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.ExpectedConditions;

import io.github.bonigarcia.SeleniumExtension;
import io.github.bonigarcia.wdm.ChromeDriverManager;
import io.github.bonigarcia.wdm.FirefoxDriverManager;

import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.Session;
import io.openvidu.test.e2e.browser.BrowserUser;
import io.openvidu.test.e2e.browser.ChromeUser;
import io.openvidu.test.e2e.browser.FirefoxUser;

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

	final static Logger log = getLogger(lookup().lookupClass());

	BrowserUser user;

	@BeforeAll()
	static void setupAll() {
		ChromeDriverManager.getInstance().setup();
		FirefoxDriverManager.getInstance().setup();

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
	}

	void setupBrowser(String browser) {

		switch (browser) {
		case "chrome":
			this.user = new ChromeUser("TestUser", 50);
			break;
		case "firefox":
			this.user = new FirefoxUser("TestUser", 50);
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

	@AfterEach
	void dispose() {
		user.dispose();
	}

	@Test
	@DisplayName("One2One Chrome [Video + Audio]")
	void oneToOneVideoAudioSessionChrome() throws Exception {

		setupBrowser("chrome");

		log.info("One2One Chrome [Video + Audio]");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("videoPlaying", 4);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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

		List<WebElement> l1 = user.getDriver().findElements(By.className("send-video-checkbox"));
		for (WebElement el : l1) {
			el.click();
		}

		List<WebElement> l2 = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : l2) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("videoElementCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("videoPlaying", 4);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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

		List<WebElement> l1 = user.getDriver().findElements(By.className("send-audio-checkbox"));
		for (WebElement el : l1) {
			el.click();
		}

		List<WebElement> l2 = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : l2) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("videoElementCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("videoPlaying", 4);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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

		user.getEventManager().waitUntilEventReaches("videoPlaying", 4);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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
		user.getEventManager().waitUntilEventReaches("videoElementCreated", 1);
		user.getEventManager().waitUntilEventReaches("remoteVideoPlaying", 1);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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
		user.getEventManager().waitUntilEventReaches("videoElementCreated", 1);
		user.getEventManager().waitUntilEventReaches("remoteVideoPlaying", 1);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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

		List<WebElement> l = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : l) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("connectionCreated", 16);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 4);
		user.getEventManager().waitUntilEventReaches("videoElementCreated", 16);
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("videoPlaying", 16);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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

		user.getEventManager().waitUntilEventReaches("videoPlaying", 4);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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
				user2.getEventManager().waitUntilEventReaches("videoPlaying", 2);
				Assert.assertTrue(user2.getEventManager()
						.assertMediaTracks(user2.getDriver().findElements(By.tagName("video")), true, true));
				user2.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
				user2.getDriver().findElement(By.id("remove-user-btn")).click();
				user2.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
			} catch (Exception e) {
				e.printStackTrace();
				Thread.currentThread().interrupt();
			}
			user2.dispose();
		});
		t.setUncaughtExceptionHandler(h);
		t.start();

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("videoPlaying", 2);

		try {
			System.out.println(getBase64Screenshot(user));
		} catch (Exception e) {
			e.printStackTrace();
		}

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

		List<WebElement> publishCheckboxes = user.getDriver().findElements(By.className("publish-checkbox"));
		for (WebElement el : publishCheckboxes) {
			el.click();
		}

		List<WebElement> joinButtons = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : joinButtons) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("connectionCreated", 16);
		user.getDriver().findElements(By.className(("message-btn"))).get(0).click();
		user.getEventManager().waitUntilEventReaches("signal", 4);

		gracefullyLeaveParticipants(4);

	}

	@Test
	@DisplayName("Subscribe Unsubscribe")
	void subscribeUnsubscribeTest() throws Exception {

		setupBrowser("chrome");

		log.info("Signal message");

		user.getDriver().findElement(By.id("one2one-btn")).click();
		user.getDriver().findElements(By.className("publish-checkbox")).get(0).click();

		List<WebElement> joinButtons = user.getDriver().findElements(By.className("join-btn"));
		for (WebElement el : joinButtons) {
			el.sendKeys(Keys.ENTER);
		}

		user.getEventManager().waitUntilEventReaches("videoPlaying", 2);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 2);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		// Global unsubscribe-subscribe

		user.getDriver().findElements(By.className(("sub-btn"))).get(0).click();
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));
		user.getDriver().findElements(By.className(("sub-btn"))).get(0).click();
		user.getEventManager().waitUntilEventReaches("videoPlaying", 3);

		Assert.assertEquals(user.getDriver().findElements(By.tagName("video")).size(), 2);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		// Video unsubscribe

		Iterable<WebElement> firstVideo = Arrays.asList(user.getDriver().findElements(By.tagName("video")).get(0));
		user.getDriver().findElements(By.className(("sub-video-btn"))).get(0).click();
		Thread.sleep(1000);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(firstVideo, true, false));

		// Audio unsubscribe

		user.getDriver().findElements(By.className(("sub-audio-btn"))).get(0).click();
		Thread.sleep(1000);
		Assert.assertTrue(user.getEventManager().assertMediaTracks(firstVideo, false, false));

		// Video and audio subscribe

		user.getDriver().findElements(By.className(("sub-video-btn"))).get(0).click();
		user.getDriver().findElements(By.className(("sub-audio-btn"))).get(0).click();
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

		user.getEventManager().waitUntilEventReaches("videoPlaying", 4);

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		Thread.sleep(2000);

		List<WebElement> publishButtons = user.getDriver().findElements(By.className("publish-btn"));
		for (WebElement el : publishButtons) {
			el.click();
		}

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 0));

		for (WebElement el : publishButtons) {
			el.click();
			Thread.sleep(1000);
		}

		user.getEventManager().waitUntilEventReaches("videoPlaying", 8);
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

		// First publication (audio + video [CAMERA])
		user.getEventManager().on("videoPlaying", (event) -> {
			threadAssertions.add(((String) event.get("eventContent")).contains("CAMERA"));
		});
		user.getDriver().findElement(By.id("one2many-btn")).click();

		Thread.sleep(2000);

		user.getEventManager().waitUntilEventReaches("videoPlaying", 2);
		user.getEventManager().off("videoPlaying");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		Thread.sleep(2000);

		// Second publication (only video (SCREEN))
		user.getEventManager().on("videoPlaying", (event) -> {
			threadAssertions.add(((String) event.get("eventContent")).contains("SCREEN"));
		});
		user.getDriver().findElements(By.className("change-publisher-btn")).get(0).click();
		user.getEventManager().waitUntilEventReaches("videoPlaying", 4);
		user.getEventManager().off("videoPlaying");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				false, true));

		Thread.sleep(2000);

		// Third publication (audio + video [CAMERA])
		user.getEventManager().on("videoPlaying", (event) -> {
			threadAssertions.add(((String) event.get("eventContent")).contains("CAMERA"));
		});
		user.getDriver().findElements(By.className("change-publisher-btn")).get(0).click();
		user.getEventManager().waitUntilEventReaches("videoPlaying", 6);
		user.getEventManager().off("videoPlaying");
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue(iter.next());
			iter.remove();
		}

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

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
		user.getEventManager().waitUntilEventReaches("videoElementCreated", 1);
		user.getEventManager().waitUntilEventReaches("videoPlaying", 1);

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		WebElement recordBtn = user.getDriver().findElements(By.className("publisher-rec-btn")).get(0);
		WebElement pauseRecordBtn = user.getDriver().findElements(By.className("publisher-rec-pause-btn")).get(0);

		recordBtn.click();

		Thread.sleep(2000);

		pauseRecordBtn.click();

		Thread.sleep(2000);

		pauseRecordBtn.click();

		Thread.sleep(2000);

		recordBtn.click();

		user.getWaiter().until(ExpectedConditions.elementToBeClickable(By.cssSelector("#recorder-preview video")));

		user.getWaiter().until(waitForVideoDuration(
				user.getDriver().findElements(By.cssSelector("#recorder-preview video")).get(0), 4));

		user.getDriver().findElements(By.id("close-record-btn")).get(0).click();

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("#recorder-preview video"), 0));

		gracefullyLeaveParticipants(1);

	}

	@Test
	@DisplayName("Remote record")
	void remoteRecordTest() throws Exception {
		setupBrowser("chrome");

		log.info("Remote record");

		final String sessionName = "RECORDED_SESSION";

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input")).clear();
		user.getDriver().findElement(By.id("session-name-input")).sendKeys(sessionName);

		// Try to record a non-existing session
		user.getDriver().findElement(By.id("session-api-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);

		// Join the user to the session
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("videoElementCreated", 1);
		user.getEventManager().waitUntilEventReaches("videoPlaying", 1);

		Assert.assertTrue(user.getEventManager().assertMediaTracks(user.getDriver().findElements(By.tagName("video")),
				true, true));

		user.getDriver().findElement(By.id("session-api-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("start-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

		user.getDriver().findElement(By.id("recording-id-field")).clear();
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(sessionName);
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStopped", 1);

		File file1 = new File(recordingsPath + sessionName + ".mp4");
		File file2 = new File(recordingsPath + ".recording." + sessionName);
		File file3 = new File(recordingsPath + sessionName + ".info");

		System.out.println(file1.getAbsolutePath());
		Assert.assertTrue(file1.exists() || file1.length() > 0);
		Assert.assertTrue(file2.exists() || file2.length() > 0);
		Assert.assertTrue(file3.exists() || file3.length() > 0);

		user.getDriver().findElement(By.id("delete-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Recording deleted"));

		Assert.assertFalse(file1.exists());
		Assert.assertFalse(file2.exists());
		Assert.assertFalse(file3.exists());

		user.getDriver().findElement(By.id("close-dialog-btn")).click();

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

}
