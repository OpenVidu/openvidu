/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import java.io.File;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Base64;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.apache.http.HttpStatus;
import org.junit.Assert;
import org.junit.jupiter.api.BeforeAll;
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
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.gson.JsonArray;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mashape.unirest.http.HttpMethod;

import io.openvidu.java.client.Connection;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Publisher;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.Recording.OutputMode;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingMode;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.java.client.Session;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.test.browsers.FirefoxUser;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.layout.CustomLayoutHandler;
import io.openvidu.test.browsers.utils.webhook.CustomWebhook;

/**
 * E2E tests for openvidu-testapp.
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 * @since 1.1.1
 */
@Tag("e2e")
@DisplayName("E2E tests for OpenVidu TestApp")
@ExtendWith(SpringExtension.class)
public class OpenViduTestAppE2eTest extends AbstractOpenViduTestAppE2eTest {

	@BeforeAll()
	protected static void setupAll() {
		checkFfmpegInstallation();
		loadEnvironmentVariables();
		setupBrowserDrivers();
		cleanFoldersAndSetUpOpenViduJavaClient();
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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		gracefullyLeaveParticipants(2);
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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("One2One Opera [Video + Audio]")
	void oneToOneVideoAudioSessionOpera() throws Exception {

		setupBrowser("opera");

		log.info("One2One Opera [Video + Audio]");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to only have audio tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, false));

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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to only have video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true));

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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 1 video but found " + numberOfVideos, 1, numberOfVideos);
		Assert.assertTrue("Video was expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 1 video but found " + numberOfVideos, 1, numberOfVideos);
		Assert.assertTrue("Video was expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 1 video but found " + numberOfVideos, 1, numberOfVideos);
		Assert.assertTrue("Video was expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 16 videos but found " + numberOfVideos, 16, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		gracefullyLeaveParticipants(4);
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

		final CountDownLatch latch = new CountDownLatch(2);

		Thread threadFirefox = new Thread(() -> {
			MyUser user2 = new MyUser(new FirefoxUser("TestUser", 30));
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

				final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
				Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
				Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
						.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

				latch.countDown();
				if (!latch.await(30, TimeUnit.SECONDS)) {
					Assert.fail("The other browser didn't play the stream within the timeout");
				}

				user2.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
				user2.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
				user2.getDriver().findElement(By.id("remove-user-btn")).click();
				user2.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
			} catch (Exception e) {
				e.printStackTrace();
				Thread.currentThread().interrupt();
				Assert.fail("Exception on Firefox participant: " + e.getMessage());
			} finally {
				user2.dispose();
			}
		});

		Thread threadChrome = new Thread(() -> {
			setupBrowser("chrome");
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.className("join-btn")).click();

			try {
				user.getEventManager().waitUntilEventReaches("connectionCreated", 2);
				user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
				user.getEventManager().waitUntilEventReaches("streamCreated", 2);
				user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

				final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
				Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
				Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
						.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

				latch.countDown();
				if (!latch.await(30, TimeUnit.SECONDS)) {
					Assert.fail("The other browser didn't play the stream within the timeout");
				}

				gracefullyLeaveParticipants(1);
			} catch (Exception e) {
				e.printStackTrace();
				Assert.fail("Exception on Chrome participant: " + e.getMessage());
				Thread.currentThread().interrupt();
			} finally {
				user.dispose();
			}
		});

		threadFirefox.setUncaughtExceptionHandler(h);
		threadChrome.setUncaughtExceptionHandler(h);
		threadFirefox.start();
		threadChrome.start();
		threadFirefox.join();
		threadChrome.join();

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
		user.getEventManager().waitUntilEventReaches("signal:chat", 4);

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

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		// Global unsubscribe-subscribe
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		WebElement subBtn = user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-btn")));
		subBtn.click();

		user.getWaiter()
				.until(ExpectedConditions.not(ExpectedConditions.attributeToBeNotEmpty(subscriberVideo, "srcObject")));
		Assert.assertFalse("Subscriber video should not have srcObject defined after unsubscribe",
				user.getEventManager().hasMediaStream(subscriberVideo, "#openvidu-instance-0"));

		subBtn.click();
		user.getEventManager().waitUntilEventReaches("streamPlaying", 3);

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		// Video unsubscribe
		subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video"));
		Iterable<WebElement> firstVideo = Arrays.asList(subscriberVideo);
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-video-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue("Subscriber video was expected to only have audio track",
				user.getEventManager().assertMediaTracks(firstVideo, true, false));

		// Audio unsubscribe
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-audio-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue("Subscriber video was expected to not have video or audio tracks",
				user.getEventManager().assertMediaTracks(firstVideo, false, false));

		// Video and audio subscribe
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-video-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue("Subscriber video was expected to only have video track",
				user.getEventManager().assertMediaTracks(firstVideo, false, true));
		user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .sub-audio-btn"))).click();
		Thread.sleep(1000);
		Assert.assertTrue("Subscriber video was expected to have audio and video tracks",
				user.getEventManager().assertMediaTracks(firstVideo, true, true));

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Publish Unpublish")
	void publishUnpublishTest() throws Exception {

		setupBrowser("chrome");

		log.info("Publisher unpublish");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		List<WebElement> publishButtons = user.getDriver().findElements(By.className("pub-btn"));
		for (WebElement el : publishButtons) {
			el.click();
		}

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		for (WebElement video : user.getDriver().findElements(By.tagName("video"))) {
			user.getWaiter()
					.until(ExpectedConditions.not(ExpectedConditions.attributeToBeNotEmpty(video, "srcObject")));
			Assert.assertFalse("Videos were expected to lack srcObject property",
					user.getEventManager().hasMediaStream(video, ""));
		}

		for (WebElement el : publishButtons) {
			el.click();
		}

		user.getEventManager().waitUntilEventReaches("streamCreated", 8);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 8);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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
			gracefullyLeaveParticipants(2);
			fail("Waiting for 2 streamPlaying events to happen in total");
			return;
		}

		user.getEventManager().off("streamPlaying");
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue("Some Event property was wrong", iter.next());
			iter.remove();
		}

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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
			gracefullyLeaveParticipants(2);
			fail("Waiting for 4 streamPlaying events to happen in total");
			return;
		}

		user.getEventManager().off("streamPlaying");
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue("Some Event property was wrong", iter.next());
			iter.remove();
		}

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to only have audio tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true));

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
			gracefullyLeaveParticipants(2);
			fail("Waiting for 6 streamPlaying events to happen in total");
			return;
		}

		user.getEventManager().off("streamPlaying");
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue("Some Event property was wrong", iter.next());
			iter.remove();
		}

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 3 videos but found " + numberOfVideos, 3, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		// Moderator forces unpublish
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .force-unpub-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 3);

		List<WebElement> videos = user.getDriver().findElements(By.tagName("video"));
		numberOfVideos = videos.size();
		Assert.assertEquals("Expected 1 video but found " + numberOfVideos, 1, numberOfVideos);
		Assert.assertFalse("Publisher video should not have srcObject defined after force unpublish",
				user.getEventManager().hasMediaStream(videos.get(0), ""));

		// Publisher publishes again
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 6);

		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 3 videos but found " + numberOfVideos, 3, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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

		// Give some time for the screen sharing warning to stop resizing the viewport
		Thread.sleep(3000);

		// Unpublish video
		final CountDownLatch latch1 = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			System.out.println(event.toString());
			threadAssertions.add("videoActive".equals(event.get("changedProperty").getAsString()));
			threadAssertions.add(!event.get("newValue").getAsBoolean());
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
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue("Some Event property was wrong", iter.next());
			iter.remove();
		}

		// Unpublish audio
		final CountDownLatch latch2 = new CountDownLatch(2);
		user.getEventManager().on("streamPropertyChanged", (event) -> {
			System.out.println(event.toString());
			threadAssertions.add("audioActive".equals(event.get("changedProperty").getAsString()));
			threadAssertions.add(!event.get("newValue").getAsBoolean());
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
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assert.assertTrue("Some Event property was wrong", iter.next());
			iter.remove();
		}

		// Resize captured window
		final CountDownLatch latch3 = new CountDownLatch(2);
		int newWidth = 1000;
		int newHeight = 700;

		final long[] expectedWidthHeight = new long[2];

		user.getEventManager().on("streamPropertyChanged", (event) -> {
			String expectedDimensions = "{\"width\":" + expectedWidthHeight[0] + ",\"height\":" + expectedWidthHeight[1]
					+ "}";
			System.out.println("Publisher dimensions: " + event.get("newValue").getAsJsonObject().toString());
			System.out.println("Real dimensions of viewport: " + expectedDimensions);
			if ("videoDimensions".equals(event.get("changedProperty").getAsString())) {
				if (expectedDimensions.equals(event.get("newValue").getAsJsonObject().toString())) {
					latch3.countDown();
				}
			}
		});

		user.getDriver().manage().window().setSize(new Dimension(newWidth, newHeight));

		String widthAndHeight = user.getEventManager().getDimensionOfViewport();
		JsonObject obj = JsonParser.parseString(widthAndHeight).getAsJsonObject();

		expectedWidthHeight[0] = obj.get("width").getAsLong();
		expectedWidthHeight[1] = obj.get("height").getAsLong();

		System.out.println("New viewport dimension: " + obj.toString());

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 6);

		if (!latch3.await(6000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail();
			return;
		}

		System.out.println(getBase64Screenshot(user));

		user.getEventManager().off("streamPropertyChanged");

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Local browser record")
	void localBrowserRecordTest() throws Exception {

		setupBrowser("chrome");

		log.info("Local browser record");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 1 video but found " + numberOfVideos, 1, numberOfVideos);
		Assert.assertTrue("Video was expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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
			System.out.println(getBase64Screenshot(user));
			Assert.fail();
		}

		user.getDriver().findElement(By.id("close-record-btn")).click();

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("#recorder-preview video"), 0));

		gracefullyLeaveParticipants(1);
	}

	@Test
	@DisplayName("Composed record")
	void composedRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chrome");

		log.info("Composed record");

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

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 1 video but found " + numberOfVideos, 1, numberOfVideos);
		Assert.assertTrue("Video was expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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

		Assert.assertTrue("File " + file1.getAbsolutePath() + " does not exist or is empty",
				file1.exists() && file1.length() > 0);
		Assert.assertTrue("File " + file2.getAbsolutePath() + " does not exist or is empty",
				file2.exists() && file2.length() > 0);
		Assert.assertTrue("File " + file3.getAbsolutePath() + " does not exist or is empty",
				file3.exists() && file3.length() > 0);

		Assert.assertTrue("Recorded file " + file1.getAbsolutePath() + " is not fine", this.recordedGreenFileFine(file1,
				new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(sessionName)));
		Assert.assertTrue("Thumbnail " + file3.getAbsolutePath() + " is not fine",
				this.thumbnailIsFine(file3, OpenViduTestAppE2eTest::checkVideoAverageRgbGreen));

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

		Assert.assertFalse("File " + file1.getAbsolutePath() + " shouldn't exist", file1.exists());
		Assert.assertFalse("File " + file2.getAbsolutePath() + " shouldn't exist", file2.exists());
		Assert.assertFalse("File " + file3.getAbsolutePath() + " shouldn't exist", file3.exists());

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(1);
	}

	@Test
	@DisplayName("Composed quick start record")
	void composedQuickStartRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chrome");

		log.info("Composed quick start record");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assert.fail("Timeout waiting for webhook springboot app to start");
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
			user.getDriver().findElement(By.id("output-mode-select")).click();
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
			Assert.assertEquals("Wrong number of recordings found", 0, OV.listRecordings().size());

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

			Assert.assertEquals("Wrong number of recordings found", 1, OV.listRecordings().size());
			OV.stopRecording(recId);
			user.getEventManager().waitUntilEventReaches("recordingStopped", 2);
			checkDockerContainerRunning("openvidu/openvidu-recording", 1);

			Assert.assertEquals("Wrong number of sessions", 1, OV.getActiveSessions().size());
			Session session = OV.getActiveSessions().get(0);
			session.close();

			checkDockerContainerRunning("openvidu/openvidu-recording", 0);

			Assert.assertEquals("Wrong recording status", Recording.Status.ready,
					OV.getRecording(sessionName).getStatus());

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
			user.getDriver().findElement(By.id("output-mode-select")).click();
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
			Assert.assertEquals("Wrong status in recordingStatusChanged event", "started",
					event.get("status").getAsString());

			checkDockerContainerRunning("openvidu/openvidu-recording", 1);

			OV.fetch();
			session = OV.getActiveSessions().get(0);
			session.close();

			checkDockerContainerRunning("openvidu/openvidu-recording", 0);

			Assert.assertEquals("Wrong recording status", Recording.Status.ready,
					OV.getRecording(sessionName + "-1").getStatus());

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
			user.getDriver().findElement(By.id("output-mode-select")).click();
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

			// Recording hasn't had time to start. Should trigger stopped, started, failed
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 1); // stopped
			Assert.assertEquals("Wrong status in recordingStatusChanged event", "stopped",
					event.get("status").getAsString());
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 5); // started
			Assert.assertEquals("Wrong status in recordingStatusChanged event", "started",
					event.get("status").getAsString());
			event = CustomWebhook.waitForEvent("recordingStatusChanged", 1); // failed
			Assert.assertEquals("Wrong status in recordingStatusChanged event", "failed",
					event.get("status").getAsString());

			checkDockerContainerRunning("openvidu/openvidu-recording", 0);

			Assert.assertEquals("Wrong recording status", Recording.Status.failed,
					OV.getRecording(sessionName + "-2").getStatus());

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("Individual record")
	void individualRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chrome");

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
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

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
		this.checkIndividualRecording(recPath, recording, 2, "opus", "vp8", true);

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

		Assert.assertFalse("Recording folder " + recPath + " shouldn't exist", new File(recPath).exists());

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Record cross-browser audio-only and video-only")
	void audioOnlyVideoOnlyRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chromeAlternateScreenShare");

		log.info("Record cross-browser audio-only and video-only");

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
			MyUser user2 = new MyUser(new FirefoxUser("FirefoxUser", 30));
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
				user2.getEventManager().waitUntilEventReaches("connectionCreated", 8);
				user2.getEventManager().waitUntilEventReaches("accessAllowed", 2);
				user2.getEventManager().waitUntilEventReaches("streamCreated", 8);
				user2.getEventManager().waitUntilEventReaches("streamPlaying", 8);

				int nVideos = user2.getDriver().findElements(By.tagName("video")).size();
				Assert.assertEquals("Expected 8 videos in Firefox user but found " + nVideos, 8, nVideos);

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

		user.getEventManager().waitUntilEventReaches("connectionCreated", 8);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 8);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 8);

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 8 videos but found " + numberOfVideos, 8, numberOfVideos);

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
				recording.getResolution(), null, "h264", true);

		// Check audio-only COMPOSED recording
		recPath = recordingsPath + SESSION_NAME + "-1/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "-1");
		this.checkMultimediaFile(new File(recPath + recording.getName() + ".webm"), true, false,
				recording.getDuration(), null, "opus", null, true);

		// Check video-only INDIVIDUAL recording
		recPath = recordingsPath + SESSION_NAME + "-2/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "-2");
		this.checkIndividualRecording(recPath, recording, 3, "opus", "vp8", true);

		// Check audio-only INDIVIDUAL recording
		recPath = recordingsPath + SESSION_NAME + "-3/";
		recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "-3");
		this.checkIndividualRecording(recPath, recording, 2, "opus", "vp8", true);

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
	@DisplayName("Custom layout recording")
	void customLayoutRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chrome");

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
		WebElement tokeInput = user.getDriver().findElement(By.id("default-custom-layout-input"));
		tokeInput.clear();
		tokeInput.sendKeys("layout1");
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

		String recordingsPath = "/opt/openvidu/recordings/" + SESSION_NAME + "/";
		File file1 = new File(recordingsPath + SESSION_NAME + ".mp4");
		File file2 = new File(recordingsPath + SESSION_NAME + ".jpg");

		Assert.assertTrue("Recorded file " + file1.getAbsolutePath() + " is not fine", this.recordedRedFileFine(file1,
				new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME)));
		Assert.assertTrue("Thumbnail " + file2.getAbsolutePath() + " is not fine",
				this.thumbnailIsFine(file2, OpenViduTestAppE2eTest::checkVideoAverageRgbRed));

		// Custom layout from external URL
		CountDownLatch initLatch = new CountDownLatch(1);
		CustomLayoutHandler.main(new String[0], initLatch);
		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assert.fail("Timeout waiting for webhook springboot app to start");
				CustomLayoutHandler.shutDown();
				return;
			}

			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			tokeInput = user.getDriver().findElement(By.id("default-custom-layout-input"));
			tokeInput.clear();
			tokeInput.sendKeys(EXTERNAL_CUSTOM_LAYOUT_URL + "?" + EXTERNAL_CUSTOM_LAYOUT_PARAMS);
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
			user.getDriver().findElement(By.id("recording-id-field")).sendKeys(SESSION_NAME + "-1");
			user.getDriver().findElement(By.id("stop-recording-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
					"Recording stopped [" + SESSION_NAME + "-1]"));
			user.getEventManager().waitUntilEventReaches("recordingStopped", 2);
			user.getDriver().findElement(By.id("close-session-btn")).click();
			user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
			user.getEventManager().waitUntilEventReaches("sessionDisconnected", 2);
			user.getDriver().findElement(By.id("close-dialog-btn")).click();

			recordingsPath = "/opt/openvidu/recordings/" + SESSION_NAME + "-1/";
			file1 = new File(recordingsPath + SESSION_NAME + "-1.mp4");
			file2 = new File(recordingsPath + SESSION_NAME + "-1.jpg");

			Assert.assertTrue("Recorded file " + file1.getAbsolutePath() + " is not fine", this.recordedRedFileFine(
					file1, new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(SESSION_NAME + "-1")));
			Assert.assertTrue("Thumbnail " + file2.getAbsolutePath() + " is not fine",
					this.thumbnailIsFine(file2, OpenViduTestAppE2eTest::checkVideoAverageRgbRed));

		} finally {
			CustomLayoutHandler.shutDown();
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

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		// Fetch existing session (change)
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("get-session-btn")).click();

		Thread.sleep(1000);
		System.out.println(getBase64Screenshot(user));
		System.out.println(user.getDriver().findElement(By.id("api-response-text-area")).getAttribute("value"));

		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value", "Changes: true"));

		// Store connectionId and streamId
		String response = user.getDriver().findElement(By.id("api-response-text-area")).getAttribute("value");
		JsonObject json = JsonParser.parseString(response.split("%")[1]).getAsJsonArray().get(0).getAsJsonObject();
		String connectionId = json.keySet().iterator().next();
		String streamId = json.get(connectionId).getAsJsonArray().get(0).getAsJsonObject().get("streamId")
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
		Assert.assertEquals("Expected 3 videos but found " + numberOfVideos, 3, numberOfVideos);

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

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to have a video only track", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true));

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video"));

		// Analyze Chrome fake video stream without gray filter (GREEN color)
		Map<String, Long> rgb = user.getEventManager().getAverageRgbFromVideo(subscriberVideo);
		System.out.println(rgb.toString());
		Assert.assertTrue("Video is not average green", checkVideoAverageRgbGreen(rgb));

		// Try to apply none allowed filter
		user.getDriver().findElement(By.cssSelector(".filter-btn")).click();
		Thread.sleep(1000);

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
		Assert.assertTrue("Video is not average gray", checkVideoAverageRgbGray(rgb));

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
		Assert.assertTrue("Video is not average green", checkVideoAverageRgbGreen(rgb));

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
		Assert.assertTrue("Video is not average gray", checkVideoAverageRgbGray(rgb));

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
		Assert.assertTrue("Video is not average green", checkVideoAverageRgbGreen(rgb));

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

		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to have only a video track", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true));

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

		user.getEventManager().waitUntilEventReaches("CodeFound", 2);

		// Publisher unsubscribes from "CodeFound" filter event
		user.getDriver().findElement(By.id("unsub-filter-event-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
				"Filter event listener removed"));

		// In case some filter event was receive while waiting for unsubscription
		user.getEventManager().clearCurrentEvents("CodeFound");

		try {
			// If this active wait finishes successfully, then the removal of the event
			// listener has not worked fine
			user.getEventManager().waitUntilEventReaches("CodeFound", 1, 3, false);
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

		user.getEventManager().waitUntilEventReaches("CodeFound", 1);

		// Moderator removes the Publisher's filter
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value", "Filter removed"));

		// In case some filter event was receive while waiting for filter removal
		user.getEventManager().clearCurrentEvents("CodeFound");

		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);

		try {
			// If this active wait finishes successfully, then the removal of the filter has
			// not worked fine
			user.getEventManager().waitUntilEventReaches("CodeFound", 1, 3, false);
			Assert.fail("'filterEvent' was received. Stream.removeFilter() failed");
		} catch (Exception e) {
			System.out.println("Filter removal worked fine");
		}

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("openvidu-java-client test")
	void openViduJavaClientTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chromeAlternateScreenShare");

		user.getDriver().manage().window().setSize(new Dimension(1000, 800));

		log.info("openvidu-java-client test");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		final String customSessionId = "openviduJavaClientSession";
		final String serverDataModerator = "SERVER_DATA_MODERATOR";
		final String serverDataSubscriber = "SERVER_DATA_SUBSCRIBER";
		final String clientDataModerator = "CLIENT_DATA_MODERATOR";
		final String clientDataSubscriber = "CLIENT_DATA_SUBSCRIBER";

		Assert.assertFalse("OV.fetch() should return false if OV.createSession() has not been called", OV.fetch());
		List<Session> sessions = OV.getActiveSessions();
		Assert.assertEquals("Expected no active sessions but found " + sessions.size(), 0, sessions.size());

		SessionProperties properties = new SessionProperties.Builder().customSessionId(customSessionId)
				.mediaMode(MediaMode.ROUTED).recordingMode(RecordingMode.ALWAYS)
				.defaultOutputMode(OutputMode.INDIVIDUAL).build();
		Session session = OV.createSession(properties);

		Assert.assertFalse("Session.fetch() should return false after OpenVidu.createSession()", session.fetch());
		Assert.assertFalse("OpenVidu.fetch() should return false after OpenVidu.createSession()", OV.fetch());
		sessions = OV.getActiveSessions();
		Assert.assertEquals("Expected 1 active session but found " + sessions.size(), 1, sessions.size());

		KurentoOptions kurentoOptions = new KurentoOptions.Builder().videoMaxRecvBandwidth(250)
				.allowedFilters(new String[] { "GStreamerFilter" }).build();
		ConnectionProperties moderatorConnectionProperties = new ConnectionProperties.Builder()
				.role(OpenViduRole.MODERATOR).data(serverDataModerator).kurentoOptions(kurentoOptions).build();
		Connection connectionModerator = session.createConnection(moderatorConnectionProperties);

		ConnectionProperties subscriberConnectionProperties = new ConnectionProperties.Builder()
				.type(ConnectionType.WEBRTC).role(OpenViduRole.SUBSCRIBER).data(serverDataSubscriber).build();
		Connection connectionSubscriber = session.createConnection(subscriberConnectionProperties);

		Assert.assertFalse("Session.fetch() should return false after Session.createConnection", session.fetch());
		Assert.assertFalse("OpenVidu.fetch() should return false after Session.fetch()", OV.fetch());

		Assert.assertEquals("Wrong number of active connections", 0, session.getActiveConnections().size());
		Assert.assertEquals("Wrong number of connections", 2, session.getConnections().size());
		Assert.assertEquals("Wrong status property", "pending", connectionModerator.getStatus());
		Assert.assertEquals("Wrong role property", OpenViduRole.MODERATOR, connectionModerator.getRole());
		Assert.assertTrue("Wrong record property", connectionModerator.record());
		Assert.assertNull("Wrong location property", connectionModerator.getLocation());
		Assert.assertNull("Wrong platform property", connectionModerator.getPlatform());
		Assert.assertTrue("Wrong createdAt property", connectionModerator.createdAt() > 0);
		Assert.assertNull("Wrong activeAt property", connectionModerator.activeAt());
		Assert.assertNull("Wrong clientData property", connectionModerator.getClientData());
		Assert.assertEquals("Wrong publishers property", 0, connectionModerator.getPublishers().size());
		Assert.assertEquals("Wrong subscribers property", 0, connectionModerator.getSubscribers().size());

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
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Moderator video was expected to have audio only track",
				user.getEventManager().assertMediaTracks(
						(WebElement) user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video")), false,
						true, "#openvidu-instance-0"));
		Assert.assertTrue("Subscriber video was expected to have audio and video tracks",
				user.getEventManager().assertMediaTracks(
						(WebElement) user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video")), true,
						true, "#openvidu-instance-1"));

		Assert.assertTrue("Session.fetch() should return true after users connected", OV.fetch());
		Assert.assertFalse("Session.fetch() should return false after OpenVidu.fetch() has been called",
				session.fetch());

		// Verify session properties and status
		Assert.assertEquals("Wrong sessionId", customSessionId, session.getSessionId());
		Assert.assertEquals("Wrong recording mode", RecordingMode.ALWAYS, session.getProperties().recordingMode());
		Assert.assertEquals("Wrong default output mode", Recording.OutputMode.INDIVIDUAL,
				session.getProperties().defaultOutputMode());
		Assert.assertTrue("Session should be being recorded", session.isBeingRecorded());
		Assert.assertEquals("Expected 2 active connections but found " + session.getActiveConnections().size(), 2,
				session.getActiveConnections().size());

		// Verify status
		Assert.assertEquals("Wrong status for moderator connection", "active", connectionModerator.getStatus());
		Assert.assertEquals("Wrong status for subscriber connection", "active", connectionSubscriber.getStatus());

		// Verify createdAt and activeAt
		Assert.assertTrue("Wrong createdAt property", connectionModerator.createdAt() > 0);
		Assert.assertTrue("Wrong activeAt property", connectionModerator.activeAt() > 0);
		Assert.assertTrue("Wrong activeAt property", connectionModerator.activeAt() > connectionModerator.createdAt());

		// Verify platform
		Assert.assertTrue("Wrong platform for moderator connection",
				connectionModerator.getPlatform().startsWith("Chrome"));
		Assert.assertTrue("Wrong platform for subscriber connection",
				connectionSubscriber.getPlatform().startsWith("Chrome"));

		// Verify publishers
		Assert.assertEquals("Expected 1 publisher for connection " + connectionModerator.getConnectionId()
				+ " but found " + connectionModerator.getPublishers().size(), 1,
				connectionModerator.getPublishers().size());
		Assert.assertEquals("Expected 0 publishers for connection " + connectionSubscriber.getConnectionId()
				+ " but found " + connectionSubscriber.getPublishers().size(), 0,
				connectionSubscriber.getPublishers().size());

		// Verify subscribers
		Assert.assertEquals("Expected 0 subscribers for connection " + connectionModerator.getConnectionId()
				+ " but found " + connectionModerator.getSubscribers().size(), 0,
				connectionModerator.getSubscribers().size());
		Assert.assertEquals(
				"Expected 1 subscriber for connection " + connectionSubscriber.getConnectionId() + " but found "
						+ connectionSubscriber.getSubscribers().size(),
				1, connectionSubscriber.getSubscribers().size());
		Assert.assertEquals("Publisher and subscriber should have same streamId",
				connectionModerator.getPublishers().get(0).getStreamId(), connectionSubscriber.getSubscribers().get(0));

		// Verify server and client data
		Assert.assertEquals("Server data doesn't match", serverDataModerator, connectionModerator.getServerData());
		Assert.assertEquals("Server data doesn't match", serverDataSubscriber, connectionSubscriber.getServerData());
		Assert.assertEquals("Client data doesn't match", clientDataModerator, connectionModerator.getClientData());
		Assert.assertEquals("Client data doesn't match", clientDataSubscriber, connectionSubscriber.getClientData());

		// Verify publisher properties
		Publisher pub = connectionModerator.getPublishers().get(0);
		Assert.assertEquals("{\"width\":640,\"height\":480}", pub.getVideoDimensions());
		Assert.assertEquals(new Integer(30), pub.getFrameRate());
		Assert.assertEquals("CAMERA", pub.getTypeOfVideo());
		Assert.assertTrue(pub.hasVideo());
		Assert.assertTrue(pub.isVideoActive());
		Assert.assertTrue(pub.hasAudio());
		Assert.assertFalse(pub.isAudioActive());

		Assert.assertFalse("Session.fetch() should return false", session.fetch());
		Assert.assertFalse("OpenVidu.fetch() should return false", OV.fetch());

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

		Assert.assertTrue("Session.fetch() should return true after publisher changed", session.fetch());
		Assert.assertFalse("OpenVidu.fetch() should return false after Session.fetch()", OV.fetch());

		// Verify new publisher properties
		if (OpenViduRole.MODERATOR.equals(session.getActiveConnections().get(0).getRole())) {
			connectionModerator = session.getActiveConnections().get(0);
			connectionSubscriber = session.getActiveConnections().get(1);
		} else {
			connectionModerator = session.getActiveConnections().get(1);
			connectionSubscriber = session.getActiveConnections().get(0);
		}
		pub = connectionModerator.getPublishers().get(0);

		String widthAndHeight = user.getEventManager().getDimensionOfViewport();
		JsonObject obj = JsonParser.parseString(widthAndHeight).getAsJsonObject();
		Assert.assertEquals(
				"{\"width\":" + obj.get("width").getAsLong() + ",\"height\":" + obj.get("height").getAsLong() + "}",
				pub.getVideoDimensions());
		Assert.assertEquals(new Integer(30), pub.getFrameRate());
		Assert.assertEquals("SCREEN", pub.getTypeOfVideo());
		Assert.assertTrue(pub.hasVideo());
		Assert.assertTrue(pub.isVideoActive());
		Assert.assertFalse(pub.hasAudio());
		Assert.assertNull(pub.isAudioActive());

		// Test recording
		RecordingProperties recordingProperties;
		try {
			OV.startRecording("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on OpenVidu.startRecording()", 404, e.getStatus());
		}
		Session sessionAux = OV.createSession();
		Assert.assertFalse("OpenVidu.fetch() should return false", OV.fetch());
		try {
			OV.startRecording(sessionAux.getSessionId());
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on OpenVidu.startRecording()", 406, e.getStatus());
		} finally {
			Assert.assertFalse("Session.fetch() should return false", sessionAux.fetch());
			sessionAux.close();
			try {
				sessionAux.fetch();
			} catch (OpenViduHttpException e2) {
				Assert.assertEquals("Wrong HTTP status on Session.fetch()", 404, e2.getStatus());
			}
			Assert.assertFalse("OpenVidu.fetch() should return false", OV.fetch());
		}
		try {
			recordingProperties = new RecordingProperties.Builder().hasAudio(false).hasVideo(false).build();
			OV.startRecording(session.getSessionId(), recordingProperties);
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on OpenVidu.startRecording()", 422, e.getStatus());
		}
		try {
			recordingProperties = new RecordingProperties.Builder().resolution("99x1080").build();
			OV.startRecording(session.getSessionId(), recordingProperties);
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on OpenVidu.startRecording()", 422, e.getStatus());
		}
		try {
			OV.startRecording(session.getSessionId());
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on OpenVidu.startRecording()", 409, e.getStatus());
		}

		List<Recording> recordings = OV.listRecordings();
		Assert.assertEquals("There should be only 1 recording", 1, recordings.size());
		Recording recording = recordings.get(0);
		Assert.assertEquals("Recording id and name should be equal", recording.getId(), recording.getName());
		Assert.assertEquals("Recording id and sessionId should be equal", session.getSessionId(), recording.getId());

		// Check ongoing recording properties
		Assert.assertEquals("Wrong recording session id", session.getSessionId(), recording.getSessionId());
		Assert.assertEquals("Wrong recording duration", 0, recording.getDuration(), 0.0001);
		Assert.assertEquals("Wrong recording size", 0, recording.getSize());
		Assert.assertNull("Wrong recording url", recording.getUrl());
		Assert.assertEquals("Wrong recording output mode", Recording.OutputMode.INDIVIDUAL, recording.getOutputMode());
		Assert.assertNull("Wrong recording layout", recording.getRecordingLayout());
		Assert.assertNull("Wrong recording custom layout", recording.getCustomLayout());
		Assert.assertNull("Wrong recording resolution", recording.getResolution());
		Assert.assertEquals("Wrong recording status", Recording.Status.started, recording.getStatus());
		Assert.assertTrue("Wrong recording hasAudio", recording.hasAudio());
		Assert.assertTrue("Wrong recording hasVideo", recording.hasVideo());

		Thread.sleep(5000);

		try {
			OV.stopRecording("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on OpenVidu.startRecording()", 404, e.getStatus());
		}
		recording = OV.stopRecording(recording.getId());

		user.getEventManager().waitUntilEventReaches("recordingStopped", 1);

		Assert.assertTrue("Wrong recording duration. Expected > 0 and was " + recording.getDuration(),
				recording.getDuration() > 0);
		Assert.assertTrue("Wrong recording size. Excepected > 0 and was " + recording.getSize(),
				recording.getSize() > 0);
		Assert.assertNotNull("Wrong recording url", recording.getUrl());
		Assert.assertEquals("Wrong recording status. Expected ready and was " + recording.getStatus().name(),
				Recording.Status.ready, recording.getStatus());
		Assert.assertFalse("Session shouldn't be being recorded", session.isBeingRecorded());
		Assert.assertFalse("OpenVidu.fetch() should return false", OV.fetch());

		this.checkIndividualRecording("/opt/openvidu/recordings/" + customSessionId + "/", recording, 2, "opus", "vp8",
				false);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .change-publisher-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 3);
		user.getEventManager().waitUntilEventReaches("streamCreated", 6);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 6);

		Assert.assertTrue("Session.fetch() should return true", session.fetch());

		final String customRecordingName = "CUSTOM_NAME";
		recordingProperties = new RecordingProperties.Builder().outputMode(Recording.OutputMode.COMPOSED)
				.recordingLayout(RecordingLayout.BEST_FIT).resolution("1280x720").hasVideo(true).hasAudio(false)
				.name(customRecordingName).build();

		// Start recording method should block until video exists and size > 0
		Recording recording2 = OV.startRecording(session.getSessionId(), recordingProperties);
		recording2 = OV.stopRecording(recording2.getId());
		Assert.assertEquals("Wrong recording status", Recording.Status.ready, recording2.getStatus());
		OV.deleteRecording(recording2.getId());

		recording2 = OV.startRecording(session.getSessionId(), recordingProperties);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		Assert.assertEquals("Wrong recording name", customRecordingName, recording2.getName());
		Assert.assertEquals("Wrong recording id", session.getSessionId() + "-1", recording2.getId());
		Assert.assertEquals("Wrong recording session id", session.getSessionId(), recording2.getSessionId());
		Assert.assertEquals("Wrong recording duration", 0, recording2.getDuration(), 0.0001);
		Assert.assertEquals("Wrong recording size", 0, recording2.getSize());
		Assert.assertNull("Wrong recording url", recording2.getUrl());
		Assert.assertEquals("Wrong recording output mode", Recording.OutputMode.COMPOSED, recording2.getOutputMode());
		Assert.assertEquals("Wrong recording layout", RecordingLayout.BEST_FIT, recording2.getRecordingLayout());
		Assert.assertNull("Wrong recording custom layout", recording2.getCustomLayout());
		Assert.assertEquals("Wrong recording resolution", "1280x720", recording2.getResolution());
		Assert.assertEquals("Wrong recording status", Recording.Status.started, recording2.getStatus());
		Assert.assertFalse("Wrong recording hasAudio", recording2.hasAudio());
		Assert.assertTrue("Wrong recording hasVideo", recording2.hasVideo());

		Thread.sleep(7000);

		recording2 = OV.stopRecording(recording2.getId());

		user.getEventManager().waitUntilEventReaches("recordingStopped", 3);

		Assert.assertTrue("Wrong recording size", recording2.getSize() > 0);
		Assert.assertNotNull("Wrong recording url", recording2.getUrl());
		Assert.assertEquals("Wrong recording status", Recording.Status.ready, recording2.getStatus());
		Assert.assertTrue("Wrong recording duration", recording2.getDuration() > 0);
		Assert.assertFalse("Session shouldn't be being recorded", session.isBeingRecorded());
		Assert.assertFalse("Session.fetch() should return false", session.fetch());

		String recordingsPath = "/opt/openvidu/recordings/" + customSessionId + "-1/";
		File file1 = new File(recordingsPath + customRecordingName + ".mp4");
		File file2 = new File(recordingsPath + ".recording." + recording2.getId());
		File file3 = new File(recordingsPath + recording2.getId() + ".jpg");

		Assert.assertTrue("File " + file1.getAbsolutePath() + " does not exist or is empty",
				file1.exists() && file1.length() > 0);
		Assert.assertTrue("File " + file2.getAbsolutePath() + " does not exist or is empty",
				file2.exists() && file2.length() > 0);
		Assert.assertTrue("File " + file3.getAbsolutePath() + " does not exist or is empty",
				file3.exists() && file3.length() > 0);

		Assert.assertTrue("Recorded file " + file1.getAbsolutePath() + " is not fine",
				this.recordedGreenFileFine(file1, recording2));
		Assert.assertTrue("Thumbnail " + file3.getAbsolutePath() + " is not fine",
				this.thumbnailIsFine(file3, OpenViduTestAppE2eTest::checkVideoAverageRgbGreen));

		try {
			OV.deleteRecording("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on OpenVidu.startRecording()", 404, e.getStatus());
		}
		OV.deleteRecording(recording.getId());
		OV.deleteRecording(recording2.getId());

		Assert.assertEquals("There shouldn't be any recordings", 0, OV.listRecordings().size());

		try {
			session.forceUnpublish("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on Session.forceUnpublish()", 404, e.getStatus());
		}
		try {
			session.forceDisconnect("NOT_EXISTS");
		} catch (OpenViduHttpException e) {
			Assert.assertEquals("Wrong HTTP status on Session.forceDisconnect()", 404, e.getStatus());
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
		Assert.assertFalse(
				"OpenVidu.fetch() should return false because Session.forceUnpublish() already updates local objects",
				OV.fetch());

		session.getActiveConnections().forEach(con -> {
			Assert.assertEquals("Wrong number of Publishers", 0, con.getPublishers().size());
			Assert.assertEquals("Wrong number of Subscribers", 0, con.getSubscribers().size());
		});

		// Delete active Connection
		session.forceDisconnect(connectionModerator);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
		Assert.assertFalse(
				"OpenVidu.fetch() should return false because Session.forceDisconnect() already updates local objects",
				OV.fetch());

		session.close();

		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 2);

		Assert.assertFalse("Session.fetch() should return true", OV.fetch());

		// Delete pending Connection
		session = OV.createSession();
		Connection con = session.createConnection();
		Assert.assertEquals("Wrong number of Connections", 1, session.getConnections().size());
		Assert.assertEquals("Wrong number of active Connections", 0, session.getActiveConnections().size());
		Assert.assertFalse(session.fetch());
		session.forceDisconnect(con);
		Assert.assertEquals("Wrong number of Connections", 0, session.getConnections().size());
		Assert.assertEquals("Wrong number of active Connections", 0, session.getActiveConnections().size());
		Assert.assertFalse(session.fetch());

		// Test IPCAM
		final String rtsp = "rtsp://dummyurl.com";
		Connection ipcamera = session.createConnection(new ConnectionProperties.Builder().type(ConnectionType.IPCAM)
				.rtspUri(rtsp).adaptativeBitrate(false).onlyPlayWithSubscribers(false).networkCache(50).build());
		Assert.assertFalse("OpenVidu.fetch() should return false", OV.fetch());
		Assert.assertFalse("Session.fetch() should return false", session.fetch());
		Assert.assertEquals("Wrong number of active connections", 1, session.getActiveConnections().size());
		Assert.assertEquals("Wrong number of connections", 1, session.getConnections().size());
		ipcamera = session.getConnection(ipcamera.getConnectionId());
		Assert.assertEquals("Wrong type property of Connection object", "IPCAM", ipcamera.getType().name());
		Assert.assertNull("Property role of an IPCAM connection should be null", ipcamera.getRole());
		Assert.assertEquals("Wrong property rtspUri", rtsp, ipcamera.getRtspUri());
		Assert.assertFalse("Wrong property adaptativeBitrate", ipcamera.adaptativeBitrate());
		Assert.assertFalse("Wrong property onlyPlayWithSubscribers", ipcamera.onlyPlayWithSubscribers());
		Assert.assertEquals("Wrong property networkCache", 50, ipcamera.getNetworkCache());

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("REST API test")
	void restApiTest() throws Exception {
		isRecordingTest = true;

		log.info("REST API test");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		// 401
		String wrongCredentials = "Basic "
				+ Base64.getEncoder().encodeToString(("OPENVIDUAPP:WRONG_SECRET").getBytes());
		Assert.assertEquals("Expected unauthorized status", HttpStatus.SC_UNAUTHORIZED,
				restClient.getAndReturnStatus("/openvidu/api/config", wrongCredentials));

		/** GET /openvidu/api/sessions (before session created) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/NOT_EXISTS", HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpStatus.SC_OK, true, true, true,
				"{'numberOfElements': 0, 'content': []}");

		/** POST /openvidu/api/sessions **/
		// 400
		String body = "{'mediaMode': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'ALWAYS', 'customSessionId': 999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED',  'recordingMode': 'ALWAYS', 'defaultOutputMode': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'ALWAYS', 'defaultOutputMode': 'INDIVIDUAL', 'defaultRecordingLayout': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_BAD_REQUEST);

		// 200
		body = "{'mediaMode': 'ROUTED', 'recordingMode': 'MANUAL', 'customSessionId': 'CUSTOM_SESSION_ID', 'defaultOutputMode': 'COMPOSED', 'defaultRecordingLayout': 'BEST_FIT'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_OK, true, false, true,
				DEFAULT_JSON_SESSION);
		// Default values
		JsonObject res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{}", HttpStatus.SC_OK, true, false,
				true, DEFAULT_JSON_SESSION);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/" + res.get("id").getAsString(),
				HttpStatus.SC_NO_CONTENT);

		// 409
		body = "{'customSessionId': 'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_CONFLICT);

		/** GET /openvidu/api/sessions (after session created) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null, HttpStatus.SC_OK, true, false,
				true, DEFAULT_JSON_SESSION);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpStatus.SC_OK, true, true, false,
				"{'numberOfElements': 1, 'content': []}");

		/** GET /openvidu/api/sessions/ID/connection (with no connections) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/NOT_EXISTS/connection", HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null, HttpStatus.SC_OK,
				true, true, true, "{'numberOfElements':0,'content':[]}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/NOT_EXISTS/connection/NOT_EXISTS",
				HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/NOT_EXISTS",
				HttpStatus.SC_NOT_FOUND);

		/** POST /openvidu/api/tokens **/
		// 400
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 'SERVER_DATA', 'kurentoOptions': false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 'SERVER_DATA', 'kurentoOptions': {'allowedFilters': 'NOT_EXISTS'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_BAD_REQUEST);

		// 200
		body = "{'session': 'CUSTOM_SESSION_ID', 'role': 'MODERATOR', 'data': 'SERVER_DATA', 'kurentoOptions': {'videoMaxSendBandwidth':777,'allowedFilters': ['GStreamerFilter']}}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_OK, true, false, true,
				mergeJson(DEFAULT_JSON_TOKEN,
						"{'kurentoOptions':{'videoMaxSendBandwidth':777,'allowedFilters':['STR']}}", new String[0]));
		final String token1 = res.get("token").getAsString();
		Assert.assertEquals("JSON return value from /openvidu/api/tokens should have equal srtings in 'id' and 'token'",
				res.get("id").getAsString(), token1);
		Assert.assertEquals("Wrong session parameter", "CUSTOM_SESSION_ID", res.get("session").getAsString());
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null,
				HttpStatus.SC_OK, true, true, false, "{'numberOfElements':1,'content':[]}");
		JsonObject connection1 = res.getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject();
		final String connectionId1 = connection1.get("id").getAsString();
		final long createdAt1 = connection1.get("createdAt").getAsLong();

		/** POST /openvidu/api/sessions/CUSTOM_SESSION_ID/connection **/
		// 400
		body = "{'type':false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_BAD_REQUEST);
		body = "{'type':'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_BAD_REQUEST);
		body = "{'type':'WEBRTC','role':123}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_BAD_REQUEST);
		body = "{'type':'WEBRTC','role':123}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_BAD_REQUEST);
		body = "{'type':'WEBRTC','role':'MODERATOR','data':true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_BAD_REQUEST);
		// 200
		String kurentoOpts = "'kurentoOptions':{'videoMaxSendBandwidth':777,'allowedFilters':['GStreamerFilter']}";
		body = "{'type':'WEBRTC','role':'MODERATOR','data':'SERVER_DATA'," + kurentoOpts + "}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_OK, true, false, true,
				mergeJson(DEFAULT_JSON_PENDING_CONNECTION, "{" + kurentoOpts + "}", new String[0]));
		restClient.rest(HttpMethod.DELETE,
				"/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + res.get("id").getAsString(),
				HttpStatus.SC_NO_CONTENT);
		// Default values
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", "{}",
				HttpStatus.SC_OK);
		final String token2 = res.get("token").getAsString();
		final String connectionId2 = res.get("id").getAsString();

		/** GET /openvidu/api/sessions (with pending connections) **/
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null, HttpStatus.SC_OK, true,
				false, true, DEFAULT_JSON_SESSION);
		Assert.assertEquals("GET session should not bring pending connections", 0,
				res.get("connections").getAsJsonObject().get("numberOfElements").getAsInt());
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID?pendingConnections=true", null,
				HttpStatus.SC_OK, true, false, true, DEFAULT_JSON_SESSION);
		Assert.assertEquals("GET session should bring pending connections if query params pendingConnections=true", 2,
				res.get("connections").getAsJsonObject().get("numberOfElements").getAsInt());

		/** GET /openvidu/api/sessions/ID/connection (with pending connections) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null, HttpStatus.SC_OK,
				true, true, false, "{'numberOfElements':2,'content':[]}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId1, null,
				HttpStatus.SC_OK, true, true, true,
				mergeJson(DEFAULT_JSON_PENDING_CONNECTION,
						"{'id':'" + connectionId1 + "','connectionId':'" + connectionId1
								+ "','sessionId':'CUSTOM_SESSION_ID','token':'" + token1
								+ "','serverData':'SERVER_DATA','role':'MODERATOR'," + kurentoOpts + ",'createdAt':"
								+ createdAt1 + "}",
						new String[0]));

		/** POST /openvidu/api/signal (NOT ACTIVE SESSION) **/
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','to':12}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','to':[],'data':false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID','to':[],'data': 'SERVERMESSAGE', 'type': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_NOT_ACCEPTABLE); // No connections

		/** POST /openvidu/api/recordings/start (NOT ACTIVE SESSION) **/
		// 400
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session': true}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'SESSION_ID','name':999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'SESSION_ID','name':'NAME','outputMode':'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'NOT_EXISTS'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_BAD_REQUEST);
		body = "{'session':'SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'resolution':999}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_BAD_REQUEST);

		// 422
		body = "{'session':'SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':false,'hasVideo':false}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_UNPROCESSABLE_ENTITY);
		body = "{'session':'SESSION_ID','name':'NAME','outputMode':'COMPOSED','recordingLayout':'BEST_FIT','customLayout':'CUSTOM_LAYOUT','hasAudio':true,'hasVideo':true,'resolution':'1920x2000'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_UNPROCESSABLE_ENTITY);

		// 404
		body = "{'session':'SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_NOT_FOUND);

		// 406
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_NOT_ACCEPTABLE);

		// 409 (RELAYED media mode)
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'mediaMode':'RELAYED'}", HttpStatus.SC_OK,
				true, false, false, DEFAULT_JSON_SESSION);
		body = "{'session':'" + res.get("id").getAsString() + "'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_CONFLICT);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/" + res.get("id").getAsString(),
				HttpStatus.SC_NO_CONTENT);

		// Start session
		setupBrowser("chrome");
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
		Assert.assertEquals("Expected 4 videos but found " + numberOfVideos, 4, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		/** GET /openvidu/api/sessions/ID/connection (with active connections) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", null, HttpStatus.SC_OK,
				true, true, false, "{'numberOfElements':2,'content':[]}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId1, null,
				HttpStatus.SC_OK, false, true, false,
				"{'id':'" + connectionId1 + "','connectionId':'" + connectionId1
						+ "','object':'connection','type':'WEBRTC','status':'active','sessionId':'CUSTOM_SESSION_ID','token':'"
						+ token1 + "','role':'MODERATOR','serverData':'SERVER_DATA','record':true}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId2, null,
				HttpStatus.SC_OK, false, true, false,
				"{'id':'" + connectionId2 + "','connectionId':'" + connectionId2
						+ "','object':'connection','type':'WEBRTC','status':'active','sessionId':'CUSTOM_SESSION_ID','token':'"
						+ token2 + "','role':'PUBLISHER','serverData':'','record':true}");

		/** GET /openvidu/api/recordings (before recording started) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings/NOT_EXISTS", HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings", null, HttpStatus.SC_OK, true, true, true,
				"{'count':0,'items':[]}");

		/** POST /openvidu/api/recordings/start (ACTIVE SESSION) **/
		// 200
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_OK, true, false, true,
				"{'id':'STR','object':'STR','sessionId':'STR','name':'STR','outputMode':'STR','recordingLayout':'STR','hasAudio':false,'hasVideo':false,'resolution':'STR','createdAt':0,'size':0,'duration':0,'url':null,'status':'STR'}");

		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		Thread.sleep(2000);

		// 409 (already recording)
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start", body, HttpStatus.SC_CONFLICT);

		/** POST /openvidu/api/recordings/stop **/
		// 405
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop", body, HttpStatus.SC_METHOD_NOT_ALLOWED);

		// 404
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/NOT_EXISTS", body, HttpStatus.SC_NOT_FOUND);

		// 200
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings/CUSTOM_SESSION_ID", HttpStatus.SC_CONFLICT);
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/CUSTOM_SESSION_ID", body, HttpStatus.SC_OK,
				true, false, true,
				"{'id':'STR','object':'STR','sessionId':'STR','name':'STR','outputMode':'STR','recordingLayout':'STR','hasAudio':false,'hasVideo':false,'resolution':'STR','createdAt':0,'size':0,'duration':0,'url':'STR','status':'STR'}");
		/** GET /openvidu/api/recordings (after recording created) **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings/CUSTOM_SESSION_ID", null, HttpStatus.SC_OK, true,
				false, true,
				"{'id':'STR','object':'STR','sessionId':'STR','name':'STR','outputMode':'STR','recordingLayout':'STR','hasAudio':false,'hasVideo':false,'resolution':'STR','createdAt':0,'size':0,'duration':0,'url':'STR','status':'STR'}");
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings", null, HttpStatus.SC_OK, true, true, false,
				"{'count':1,'items':[]}");

		user.getEventManager().waitUntilEventReaches("recordingStopped", 2);

		/** DELETE /openvidu/api/recordings **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings", HttpStatus.SC_METHOD_NOT_ALLOWED);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings/NOT_EXISTS", HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/recordings/CUSTOM_SESSION_ID", HttpStatus.SC_NO_CONTENT);

		// GET /openvidu/api/recordings should return empty again
		restClient.rest(HttpMethod.GET, "/openvidu/api/recordings", null, HttpStatus.SC_OK, true, true, true,
				"{'count':0,'items':[]}");

		/** DELETE /openvidu/api/sessions/<SESSION_ID>/stream/<STREAM_ID> **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/NOT_EXISTS/stream/NOT_EXISTS",
				HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/stream/NOT_EXISTS",
				HttpStatus.SC_NOT_FOUND);
		res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null, HttpStatus.SC_OK, true,
				false, true,
				"{'id':'STR','object':'STR','sessionId':'STR','createdAt':0,'mediaMode':'STR','recordingMode':'STR','defaultOutputMode':'STR','defaultRecordingLayout':'STR','customSessionId':'STR','connections':{'numberOfElements':2,'content'"
						+ ":[{'connectionId':'STR','createdAt':0,'location':'STR','platform':'STR','token':'STR','role':'STR','serverData':'STR','clientData':'STR','publishers':["
						+ "{'createdAt':0,'streamId':'STR','mediaOptions':{'hasAudio':false,'audioActive':false,'hasVideo':false,'videoActive':false,'typeOfVideo':'STR','frameRate':0,"
						+ "'videoDimensions':'STR','filter':{}}}],'subscribers':[{'createdAt':0,'streamId':'STR','publisher':'STR'}]},{'connectionId':'STR','createdAt':0,'location':'STR',"
						+ "'platform':'STR','token':'STR','role':'STR','serverData':'STR','clientData':'STR','publishers':[{'createdAt':0,'streamId':'STR','mediaOptions':{'hasAudio':false,"
						+ "'audioActive':false,'hasVideo':false,'videoActive':false,'typeOfVideo':'STR','frameRate':0,'videoDimensions':'STR','filter':{}}}],'subscribers':[{'createdAt':0,'streamId':'STR','publisher':'STR'}]}]},'recording':false}");
		String streamId = res.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0)
				.getAsJsonObject().get("publishers").getAsJsonArray().get(0).getAsJsonObject().get("streamId")
				.getAsString();
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/stream/" + streamId,
				HttpStatus.SC_NO_CONTENT);

		final String connectionId = res.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0)
				.getAsJsonObject().get("connectionId").getAsString();

		/** POST /openvidu/api/signal (ACTIVE SESSION) **/
		body = "{'session':'CUSTOM_SESSION_ID','to':['wrongConnectionId']}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_NOT_ACCEPTABLE); // No valid
																										// connectionId
		body = "{'session':'CUSTOM_SESSION_ID','to':['" + connectionId + "','wrongConnectionId']}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_NOT_ACCEPTABLE); // No valid
																										// connectionId
		body = "{'session':'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_OK);
		user.getEventManager().waitUntilEventReaches("signal", 2);
		body = "{'session':'CUSTOM_SESSION_ID','to':[],'type':'server1','data':'SERVER EVENT!'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_OK);
		user.getEventManager().waitUntilEventReaches("signal:server1", 2);
		body = "{'session':'CUSTOM_SESSION_ID','to':['" + connectionId + "'],'type':'server2','data':'SERVER EVENT!'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/signal", body, HttpStatus.SC_OK);
		user.getEventManager().waitUntilEventReaches("signal:server2", 1);
		Assert.assertEquals("", 1, user.getDriver()
				.findElements(By.xpath("//*[text()='server - signal:server2 - SERVER EVENT!']")).size());

		/** DELETE /openvidu/api/sessions/<SESSION_ID>/connection/<CONNECTION_ID> **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/NOT_EXISTS/connection/NOT_EXISTS",
				HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/NOT_EXISTS",
				HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				HttpStatus.SC_NO_CONTENT);

		/** DELETE /openvidu/api/sessions **/
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions", HttpStatus.SC_METHOD_NOT_ALLOWED);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/NOT_EXISTS", HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID", HttpStatus.SC_NO_CONTENT);

		// GET /openvidu/api/sessions should return empty again
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpStatus.SC_OK, true, true, true,
				"{'numberOfElements':0,'content':[]}");

		/**
		 * DELETE /openvidu/api/sessions/<SESSION_ID>/connection/<CONNECTION_ID> (unused
		 * token)
		 **/
		body = "{'customSessionId': 'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_OK);
		body = "{'type': 'WEBRTC', 'role': 'SUBSCRIBER'}";
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_OK, true, false, true, DEFAULT_JSON_PENDING_CONNECTION);
		final String connectionIdA = res.get("id").getAsString();
		final String tokenA = res.get("token").getAsString();
		res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_OK, true, false, true, DEFAULT_JSON_PENDING_CONNECTION);
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
				HttpStatus.SC_NO_CONTENT);

		// User should pop up invalid token
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .join-btn")).sendKeys(Keys.ENTER);
		try {
			user.getWaiter().until(ExpectedConditions.alertIsPresent());
			Alert alert = user.getDriver().switchTo().alert();
			Assert.assertTrue("Alert does not contain expected text",
					alert.getText().contains("Token " + tokenA + "is not valid"));
			alert.accept();
		} catch (Exception e) {
			Assert.fail("Alert exception");
		}

		Thread.sleep(500);
		user.getEventManager().resetEventThread();

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);

		// connectionId should be equal to the one brought by the token
		Assert.assertEquals("Wrong connectionId", connectionIdB,
				restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", HttpStatus.SC_OK)
						.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject()
						.get("connectionId").getAsString());

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID", HttpStatus.SC_NO_CONTENT);

		// GET /openvidu/api/sessions should return empty again
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpStatus.SC_OK, true, true, true,
				"{'numberOfElements':0,'content':[]}");

		/** GET /openvidu/api/config **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/config", null, HttpStatus.SC_OK, true, false, true,
				"{'VERSION':'STR','DOMAIN_OR_PUBLIC_IP':'STR','HTTPS_PORT':0,'OPENVIDU_PUBLICURL':'STR','OPENVIDU_CDR':false,'OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH':0,"
						+ "'OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH':0,'OPENVIDU_SESSIONS_GARBAGE_INTERVAL':0,'OPENVIDU_SESSIONS_GARBAGE_THRESHOLD':0,"
						+ "'OPENVIDU_RECORDING':false,'OPENVIDU_RECORDING_VERSION':'STR','OPENVIDU_RECORDING_PATH':'STR','OPENVIDU_RECORDING_PUBLIC_ACCESS':false,'OPENVIDU_RECORDING_NOTIFICATION':'STR',"
						+ "'OPENVIDU_RECORDING_CUSTOM_LAYOUT':'STR','OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT':0,'OPENVIDU_WEBHOOK':false,'OPENVIDU_WEBHOOK_ENDPOINT':'STR','OPENVIDU_WEBHOOK_HEADERS':[],"
						+ "'OPENVIDU_WEBHOOK_EVENTS':[]}");
	}

	@Test
	@DisplayName("Kurento reconnect test")
	void kurentoReconnectTest() throws Exception {
		isRecordingTest = true;
		isKurentoRestartTest = true;

		log.info("Kurento reconnect test");

		OV.fetch();
		List<Session> sessions = OV.getActiveSessions();
		Assert.assertEquals("Expected no active sessions but found " + sessions.size(), 0, sessions.size());

		this.stopKms();

		OV.fetch();

		setupBrowser("chromeAsRoot");

		// Connect one publisher with no connection to KMS

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getWaiter().until(ExpectedConditions.alertIsPresent());
		Alert alert = user.getDriver().switchTo().alert();

		final String alertMessage = "Error connecting to the session: There is no available Media Node where to initialize session 'TestSession'. Code: 204";
		Assert.assertTrue("Alert message wrong. Expected to contain: \"" + alertMessage + "\". Actual message: \""
				+ alert.getText() + "\"", alert.getText().contains(alertMessage));
		alert.accept();

		user.getDriver().findElement(By.id("remove-user-btn")).sendKeys(Keys.ENTER);

		this.startKms();
		Thread.sleep(3000);

		// Connect one subscriber with connection to KMS -> restart KMS -> connect a
		// publisher -> restart KMS -> check streamDestroyed events

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElements(By.className("publish-checkbox")).forEach(el -> el.click());
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);

		OV.fetch();
		sessions = OV.getActiveSessions();
		Assert.assertEquals("Expected 1 active sessions but found " + sessions.size(), 1, sessions.size());

		this.restartKms();
		Thread.sleep(3000);

		OV.fetch();
		sessions = OV.getActiveSessions();
		Assert.assertEquals("Expected 1 active sessions but found " + sessions.size(), 1, sessions.size());

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assert.assertEquals("Expected 2 videos but found " + numberOfVideos, 2, numberOfVideos);
		Assert.assertTrue("Videos were expected to have audio and video tracks", user.getEventManager()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

		OV.fetch();
		Session session = OV.getActiveSessions().get(0);
		Assert.assertEquals("Expected 2 active connections but found " + session.getActiveConnections(), 2,
				session.getActiveConnections().size());
		int pubs = session.getActiveConnections().stream().mapToInt(con -> con.getPublishers().size()).sum();
		int subs = session.getActiveConnections().stream().mapToInt(con -> con.getSubscribers().size()).sum();
		Assert.assertEquals("Expected 1 active publisher but found " + pubs, 1, pubs);
		Assert.assertEquals("Expected 1 active subscriber but found " + subs, 1, subs);

		OV.startRecording(session.getSessionId(),
				new RecordingProperties.Builder().outputMode(OutputMode.INDIVIDUAL).build());
		user.getEventManager().waitUntilEventReaches("recordingStarted", 2);

		long recStartTime = System.currentTimeMillis();

		final CountDownLatch latch = new CountDownLatch(4);

		user.getEventManager().on("recordingStopped", (event) -> {
			String reason = event.get("reason").getAsString();
			Assert.assertEquals("Expected 'recordingStopped' reason 'mediaServerDisconnect'", "mediaServerDisconnect",
					reason);
			latch.countDown();
		});
		user.getEventManager().on("streamDestroyed", (event) -> {
			String reason = event.get("reason").getAsString();
			Assert.assertEquals("Expected 'streamDestroyed' reason 'mediaServerDisconnect'", "mediaServerDisconnect",
					reason);
			latch.countDown();
		});

		long recEndTime = System.currentTimeMillis();
		this.restartKms();

		user.getEventManager().waitUntilEventReaches("recordingStopped", 2);
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 2);
		if (!latch.await(5000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(2);
			fail("Waiting for 2 streamDestroyed events with reason 'mediaServerDisconnect' to happen in total");
			return;
		}
		user.getEventManager().off("streamDestroyed");

		session.fetch();
		Assert.assertEquals("Expected 2 active connections but found " + session.getActiveConnections(), 2,
				session.getActiveConnections().size());
		pubs = session.getActiveConnections().stream().mapToInt(con -> con.getPublishers().size()).sum();
		subs = session.getActiveConnections().stream().mapToInt(con -> con.getSubscribers().size()).sum();
		Assert.assertEquals("Expected no active publishers but found " + pubs, 0, pubs);
		Assert.assertEquals("Expected no active subscribers but found " + subs, 0, subs);

		Recording rec = OV.getRecording("TestSession");
		double differenceInDuration = Math.abs(rec.getDuration() - ((recEndTime - recStartTime) / 1000));
		Assert.assertTrue("Recording duration exceeds valid value. Expected no more than 0.2 seconds, got "
				+ differenceInDuration, differenceInDuration < 0.2);

		this.checkIndividualRecording("/opt/openvidu/recordings/TestSession/", rec, 1, "opus", "vp8", true);

		WebElement pubBtn = user.getDriver().findElements(By.cssSelector("#openvidu-instance-1 .pub-btn")).get(0);
		pubBtn.click();
		// This is not real, only in testapp (user is not streaming media after KMS
		// restarted)
		user.getEventManager().waitUntilEventReaches("streamDestroyed", 3);
		pubBtn.click();
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		session.fetch();
		Assert.assertEquals("Expected 2 active connections but found " + session.getActiveConnections(), 2,
				session.getActiveConnections().size());
		pubs = session.getActiveConnections().stream().mapToInt(con -> con.getPublishers().size()).sum();
		subs = session.getActiveConnections().stream().mapToInt(con -> con.getSubscribers().size()).sum();
		Assert.assertEquals("Expected 1 active publisher but found " + pubs, 1, pubs);
		Assert.assertEquals("Expected 1 active subscriber but found " + subs, 1, subs);

		gracefullyLeaveParticipants(2);
	}

	@Test
	@DisplayName("Webhook test")
	void webhookTest() throws Exception {
		isRecordingTest = true;

		setupChromeWithFakeVideo(Paths.get("/opt/openvidu/barcode.y4m"));

		log.info("Webhook test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assert.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			user.getDriver().findElement(By.id("recording-mode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-ALWAYS")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("output-mode-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-INDIVIDUAL")).click();
			Thread.sleep(500);

			WebElement allowedFilterInput = user.getDriver().findElement(By.id("allowed-filter-input"));
			allowedFilterInput.clear();
			allowedFilterInput.sendKeys("ZBarFilter");
			user.getDriver().findElement(By.id("add-allowed-filter-btn")).click();

			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);

			user.getDriver().findElement(By.className("join-btn")).click();

			JsonObject event = CustomWebhook.waitForEvent("sessionCreated", 2);
			Assert.assertEquals("Wrong number of properties in event 'sessionCreated'", 2 + 1, event.keySet().size());

			event = CustomWebhook.waitForEvent("participantJoined", 2);
			Assert.assertEquals("Wrong number of properties in event 'participantJoined'", 7 + 1,
					event.keySet().size());

			event = CustomWebhook.waitForEvent("webrtcConnectionCreated", 2);
			Assert.assertEquals("Wrong number of properties in event 'webrtcConnectionCreated'", 10 + 1,
					event.keySet().size());
			String connectionId1 = event.get("participantId").getAsString();

			event = CustomWebhook.waitForEvent("recordingStatusChanged", 10);
			Assert.assertEquals("Wrong number of properties in event 'recordingStatusChanged'", 11 + 1,
					event.keySet().size());
			Assert.assertEquals("Wrong recording status in webhook event", "started",
					event.get("status").getAsString());
			Assert.assertEquals("Wrong recording outputMode in webhook event", "INDIVIDUAL",
					event.get("outputMode").getAsString());
			Assert.assertEquals("Wrong recording outputMode in webhook event", 0, event.get("size").getAsLong());
			Assert.assertEquals("Wrong recording outputMode in webhook event", 0, event.get("duration").getAsLong());
			Assert.assertEquals("Wrong recording startTime/timestamp in webhook event",
					event.get("startTime").getAsLong(), event.get("timestamp").getAsLong());
			Assert.assertNull("Wrong recording reason in webhook event (should be null)", event.get("reason"));

			// Filter event webhook
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .filter-btn")).click();
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
			user.getWaiter().until(ExpectedConditions.attributeContains(By.id("filter-response-text-area"), "value",
					"Filter event listener added"));
			CustomWebhook.waitForEvent("filterEventDispatched", 2);
			user.getDriver().findElement(By.id("unsub-filter-event-btn")).click();
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);

			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();

			event = CustomWebhook.waitForEvent("participantJoined", 2);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 2);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 2);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 2);

			String connectionId2 = event.get("participantId").getAsString();

			// signalSent from client
			long timestamp = System.currentTimeMillis();
			user.getDriver().findElement(By.cssSelector(("#openvidu-instance-0 .message-btn"))).click();
			user.getEventManager().waitUntilEventReaches("signal:chat", 2);
			event = CustomWebhook.waitForEvent("signalSent", 1);
			Assert.assertEquals("Wrong number of properties in event 'signalSent'", 6 + 1, event.keySet().size());
			Assert.assertEquals("Wrong sessionId in webhook event", "TestSession",
					event.get("sessionId").getAsString());
			Assert.assertTrue("Wrong timestamp in webhook event", event.get("timestamp").getAsLong() > timestamp);
			Assert.assertEquals("Wrong from in webhook event", connectionId1, event.get("from").getAsString());
			Assert.assertEquals("Wrong type in webhook event", "chat", event.get("type").getAsString());
			Assert.assertTrue("Wrong data in webhook event", !event.get("data").getAsString().isEmpty());
			Assert.assertEquals("Wrong event name in webhook event", "signalSent", event.get("event").getAsString());
			JsonArray toArray = event.get("to").getAsJsonArray();
			Assert.assertEquals("Wrong to array size", 2, toArray.size());
			Assert.assertTrue("Wrong to array content in webhook event",
					toArray.contains(JsonParser.parseString(connectionId1)));
			Assert.assertTrue("Wrong to array content in webhook event",
					toArray.contains(JsonParser.parseString(connectionId2)));

			// signalSent from server
			CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
			restClient.rest(HttpMethod.POST, "/openvidu/api/signal",
					"{'session':'TestSession','type':'chat','to':['" + connectionId1 + "'],'data':'SERVER_DATA'}",
					HttpStatus.SC_OK);
			user.getEventManager().waitUntilEventReaches("signal:chat", 3);
			event = CustomWebhook.waitForEvent("signalSent", 1);
			Assert.assertEquals("Wrong number of properties in event 'signalSent'", 6 + 1, event.keySet().size());
			Assert.assertEquals("Wrong sessionId in webhook event", "TestSession",
					event.get("sessionId").getAsString());
			Assert.assertTrue("Wrong timestamp in webhook event", event.get("timestamp").getAsLong() > timestamp);
			Assert.assertTrue("Wrong from in webhook event", event.get("from").isJsonNull());
			Assert.assertEquals("Wrong type in webhook event", "chat", event.get("type").getAsString());
			Assert.assertEquals("Wrong data in webhook event", "SERVER_DATA", event.get("data").getAsString());
			Assert.assertEquals("Wrong event name in webhook event", "signalSent", event.get("event").getAsString());
			toArray = event.get("to").getAsJsonArray();
			Assert.assertEquals("Wrong to array size", 1, toArray.size());
			Assert.assertTrue("Wrong to array content in webhook event",
					toArray.contains(JsonParser.parseString(connectionId1)));

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
			Assert.assertEquals("Wrong number of recording entities", 1, recs.size());
			Recording rec = recs.get(0);

			Assert.assertEquals("Wrong number of properties in event 'recordingStatusChanged'", 12 + 1,
					event.keySet().size());
			Assert.assertEquals("Wrong recording status in webhook event", "stopped",
					event.get("status").getAsString());
			Assert.assertEquals("Wrong recording outputMode in webhook event", 0, event.get("size").getAsLong());
			Assert.assertEquals("Wrong recording outputMode in webhook event", 0, event.get("duration").getAsLong());
			Assert.assertEquals("Wrong recording reason in webhook event", "sessionClosedByServer",
					event.get("reason").getAsString());
			Assert.assertEquals("Wrong recording reason in webhook event", rec.getCreatedAt(),
					event.get("startTime").getAsLong());

			event = CustomWebhook.waitForEvent("recordingStatusChanged", 2);

			OV.fetch();
			recs = OV.listRecordings();
			Assert.assertEquals("Wrong number of recording entities", 1, recs.size());
			rec = recs.get(0);

			Assert.assertEquals("Wrong number of properties in event 'recordingStatusChanged'", 12 + 1,
					event.keySet().size());
			Assert.assertEquals("Wrong recording status in webhook event", "ready", event.get("status").getAsString());
			Assert.assertTrue("Wrong recording size in webhook event", event.get("size").getAsLong() > 0);
			Assert.assertTrue("Wrong recording outputMode in webhook event", event.get("duration").getAsLong() > 0);
			Assert.assertEquals("Wrong recording reason in webhook event", "sessionClosedByServer",
					event.get("reason").getAsString());
			Assert.assertEquals("Wrong recording reason in webhook event", rec.getCreatedAt(),
					event.get("startTime").getAsLong());

			event = CustomWebhook.waitForEvent("sessionDestroyed", 2);
			Assert.assertEquals("Wrong number of properties in event 'sessionDestroyed'", 5 + 1, event.keySet().size());
			Assert.assertEquals("Wrong session destroyed reason in webhook event", "sessionClosedByServer",
					event.get("reason").getAsString());

		} finally {
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("IP camera test")
	void ipCameraTest() throws Exception {
		isRecordingTest = true;

		log.info("IP camera test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assert.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			// Extra wait time for the webhook endpoint to be ready
			Thread.sleep(3000);

			CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

			// Wrong session [404]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/WRONG_SESSION/connection", "{'type':'IPCAM'}",
					HttpStatus.SC_NOT_FOUND);

			// Init a session and publish IP camera AS FIRST PARTICIPANT
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId':'IP_CAM_SESSION'}",
					HttpStatus.SC_OK, true, false, true, DEFAULT_JSON_SESSION);

			// No rtspUri [400]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection", "{'type':'IPCAM'}",
					HttpStatus.SC_BAD_REQUEST);

			// Wrong rtspUri (invalid url format) [400]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection",
					"{'type':'IPCAM','rtspUri': 'NOT_A_URL'}", HttpStatus.SC_BAD_REQUEST);
			// Wrong adaptativeBitrate [400]
			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection",
					"{'type':'IPCAM','rtspUri':'rtsp://dummyurl.com','adaptativeBitrate':123,}",
					HttpStatus.SC_BAD_REQUEST);

			// Publish IP camera. Dummy URL because no user will subscribe to it [200]
			String ipCamBody = "{'type':'IPCAM','rtspUri':'rtsp://dummyurl.com','adaptativeBitrate':true,'onlyPlayWithSubscribers':true,'networkCache':1000,'data':'MY_IP_CAMERA'}";
			JsonObject response = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/IP_CAM_SESSION/connection",
					ipCamBody, HttpStatus.SC_OK, true, false, true, DEFAULT_JSON_IPCAM_CONNECTION);

			CustomWebhook.waitForEvent("sessionCreated", 1);
			CustomWebhook.waitForEvent("participantJoined", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			Assert.assertEquals("Wrong serverData property", "MY_IP_CAMERA", response.get("serverData").getAsString());
			Assert.assertEquals("Wrong platform property", "IPCAM", response.get("platform").getAsString());
			Assert.assertEquals("Wrong role property", JsonNull.INSTANCE, response.get("role"));
			Assert.assertEquals("Wrong type property", "IPCAM", response.get("type").getAsString());

			Assert.assertEquals("Wrong number of publishers in IPCAM participant", 1,
					response.get("publishers").getAsJsonArray().size());
			JsonObject ipCamPublisher = response.get("publishers").getAsJsonArray().get(0).getAsJsonObject();
			Assert.assertEquals("Wrong number of properties in IPCAM publisher", 4, ipCamPublisher.size());
			Assert.assertEquals("Wrong rtspUri property", "rtsp://dummyurl.com",
					ipCamPublisher.get("rtspUri").getAsString());
			JsonObject mediaOptions = ipCamPublisher.get("mediaOptions").getAsJsonObject();
			Assert.assertEquals("Wrong number of properties in MediaOptions", 11, mediaOptions.size());
			Assert.assertTrue("Wrong adaptativeBitrate property", mediaOptions.get("adaptativeBitrate").getAsBoolean());
			Assert.assertTrue("Wrong onlyPlayWithSubscribers property",
					mediaOptions.get("onlyPlayWithSubscribers").getAsBoolean());

			// Can't delete the stream [405]
			restClient.rest(HttpMethod.DELETE,
					"/openvidu/api/sessions/IP_CAM_SESSION/stream/" + ipCamPublisher.get("streamId").getAsString(),
					HttpStatus.SC_METHOD_NOT_ALLOWED);

			// Can delete the connection [204]
			restClient.rest(HttpMethod.DELETE,
					"/openvidu/api/sessions/IP_CAM_SESSION/connection/" + response.get("connectionId").getAsString(),
					HttpStatus.SC_NO_CONTENT);

			response = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assert.assertEquals("Wrong reason in webrtcConnectionDestroyed event", "forceDisconnectByServer",
					response.get("reason").getAsString());
			response = CustomWebhook.waitForEvent("participantLeft", 1);
			Assert.assertEquals("Wrong reason in participantLeft event", "forceDisconnectByServer",
					response.get("reason").getAsString());
			CustomWebhook.waitForEvent("sessionDestroyed", 1);

			setupBrowser("chrome");

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
			Assert.assertEquals("Expected 1 video but found " + numberOfVideos, 1, numberOfVideos);
			Assert.assertTrue("Video was expected to have audio and video tracks", user.getEventManager()
					.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true));

			CustomWebhook.waitForEvent("sessionCreated", 1);
			CustomWebhook.waitForEvent("participantJoined", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			// Composed recording to get an MP4 file AUDIO + VIDEO
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
					"{'session':'TestSession','name':'audioVideo','hasAudio':true,'hasVideo':true}", HttpStatus.SC_OK);
			user.getEventManager().waitUntilEventReaches("recordingStarted", 1); // Started
			CustomWebhook.waitForEvent("recordingStatusChanged", 1);
			Thread.sleep(4000);
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/TestSession", HttpStatus.SC_OK);
			user.getEventManager().waitUntilEventReaches("recordingStopped", 1);
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready

			// Composed recording to get an MP4 file ONLY VIDEO
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
					"{'session':'TestSession','name':'videoOnly','hasAudio':false,'hasVideo':true}", HttpStatus.SC_OK);
			user.getEventManager().waitUntilEventReaches("recordingStarted", 1); // Started
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Started
			Thread.sleep(4000);
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/TestSession-1", HttpStatus.SC_OK);
			user.getEventManager().waitUntilEventReaches("recordingStopped", 1);
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready

			// Publish the MP4 file as an IPCAM
			String recPath = restClient.rest(HttpMethod.GET, "/openvidu/api/config", HttpStatus.SC_OK)
					.get("OPENVIDU_RECORDING_PATH").getAsString();
			recPath = recPath.endsWith("/") ? recPath : (recPath + "/");
			String fullRecordingPath = "file://" + recPath + "TestSession/audioVideo.mp4";
			ipCamBody = "{'type':'IPCAM','rtspUri':'" + fullRecordingPath
					+ "','adaptativeBitrate':true,'onlyPlayWithSubscribers':true,'networkCache':1000,'data':'MY_IP_CAMERA'}";

			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/TestSession/connection", ipCamBody,
					HttpStatus.SC_OK, true, false, true, DEFAULT_JSON_IPCAM_CONNECTION);

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
			Assert.assertEquals("Wrong reason in participantLeft event", "forceDisconnectByUser",
					response.get("reason").getAsString());
			response = CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			Assert.assertEquals("Wrong reason in participantLeft event", "forceDisconnectByUser",
					response.get("reason").getAsString());
			response = CustomWebhook.waitForEvent("participantLeft", 1);
			Assert.assertEquals("Wrong reason in participantLeft event", "forceDisconnectByUser",
					response.get("reason").getAsString());
			user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));

			// Publish again the IPCAM
			response = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/TestSession/connection", ipCamBody,
					HttpStatus.SC_OK, true, false, true, DEFAULT_JSON_IPCAM_CONNECTION);
			user.getEventManager().waitUntilEventReaches("connectionCreated", 3);
			user.getEventManager().waitUntilEventReaches("streamCreated", 3);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 3);
			user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));

			String connectionId = response.get("connectionId").getAsString();

			// Removing browser user shouldn't close the session if IPCAM participant
			// remains

			user.getDriver().findElement(By.id("remove-user-btn")).click();
			user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);

			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			CustomWebhook.waitForEvent("participantLeft", 1);

			restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession", null, HttpStatus.SC_OK);

			// Test IPCAM individual recording (IPCAM audio+video, recording audio+video)
			response = restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
					"{'session':'TestSession','outputMode':'INDIVIDUAL','hasAudio':true,'hasVideo':true}",
					HttpStatus.SC_OK);
			String recId = response.get("id").getAsString();
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Started

			Thread.sleep(2000);
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/" + recId, HttpStatus.SC_OK);
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready

			Recording recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(recId);
			this.checkIndividualRecording(recPath + recId + "/", recording, 1, "opus", "vp8", true);

			// Test IPCAM individual recording (IPCAM video only, recording audio and video)

			// Disconnect audio+video IPCAM
			restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession/connection/" + connectionId,
					HttpStatus.SC_NO_CONTENT);

			// Session is closed (create new session)
			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
			CustomWebhook.waitForEvent("participantLeft", 1);
			CustomWebhook.waitForEvent("sessionDestroyed", 1);

			restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId':'TestSession'}",
					HttpStatus.SC_OK);

			// Publish video only IPCAM
			fullRecordingPath = "file://" + recPath + "TestSession-1/videoOnly.mp4";
			ipCamBody = "{'type':'IPCAM','rtspUri':'" + fullRecordingPath + "'}";
			response = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/TestSession/connection", ipCamBody,
					HttpStatus.SC_OK);
			CustomWebhook.waitForEvent("sessionCreated", 1);
			CustomWebhook.waitForEvent("participantJoined", 1);
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);

			// Record audio and video
			// TODO: THIS SHOULD WORK
//			response = restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
//					"{'session':'TestSession','outputMode':'INDIVIDUAL','hasAudio':true,'hasVideo':true}",
//					HttpStatus.SC_OK);
//			recId = response.get("id").getAsString();
//			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Started
//
//			Thread.sleep(2000);
//			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/TestSession-2", HttpStatus.SC_OK);
//			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Stopped
//			CustomWebhook.waitForEvent("recordingStatusChanged", 1); // Ready
//
//			recording = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(recId);
//			this.checkIndividualRecording(recPath + recId + "/", recording, 1, "opus", "vp8", true);

			restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession", HttpStatus.SC_NO_CONTENT);

			CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 1);
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

		setupBrowser("chrome");

		log.info("OpenVidu SDK fetch test");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);

		Session session = OV.createSession();
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		checkNodeFetchChanged(true, true);
		checkNodeFetchChanged(true, false);

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId':'REST_SESSION'}",
				HttpStatus.SC_OK);
		Assert.assertTrue("Java fetch should be true", OV.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		Assert.assertFalse("Java fetch should be false", session.fetch());
		checkNodeFetchChanged(true, true);
		checkNodeFetchChanged(true, false);

		Connection connection = session.createConnection();
		Assert.assertFalse("Java fetch should be false", session.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		checkNodeFetchChanged(true, true);
		checkNodeFetchChanged(true, false);

		restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", "{'session':'REST_SESSION'}", HttpStatus.SC_OK);
		Assert.assertFalse("Fetch should be true", session.fetch());
		Assert.assertTrue("Fetch should be false", OV.fetch());
		checkNodeFetchChanged(true, true);
		checkNodeFetchChanged(true, false);

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/REST_SESSION", HttpStatus.SC_NO_CONTENT);
		Assert.assertFalse("Java fetch should be true", session.fetch());
		Assert.assertTrue("Java fetch should be true", OV.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		checkNodeFetchChanged(true, true);
		checkNodeFetchChanged(true, false);

		// Set token and join session
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);
		WebElement tokeInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokeInput.clear();
		tokeInput.sendKeys(connection.getToken());
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);

		Assert.assertTrue("Java fetch should be true", OV.fetch());
		Assert.assertFalse("Java fetch should be false", session.fetch());
		checkNodeFetchChanged(false, true);
		checkNodeFetchChanged(true, false);
		checkNodeFetchChanged(true, false);

		// Create and delete connection with openvidu-node-client
		final String successMessage = "Connection created: ";
		user.getDriver().findElement(By.id("crate-connection-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value", successMessage));
		String value = user.getDriver().findElement(By.id("api-response-text-area")).getAttribute("value");
		String connectionId = value.substring(value.lastIndexOf(successMessage) + successMessage.length());
		Assert.assertTrue("Java fetch should be true", session.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		checkNodeFetchChanged(true, false);
		checkNodeFetchChanged(false, false);
		checkNodeFetchChanged(true, false);
		user.getDriver().findElement(By.id("connection-id-field")).clear();
		user.getDriver().findElement(By.id("connection-id-field")).sendKeys(connectionId);
		user.getDriver().findElement(By.id("force-disconnect-api-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "User disconnected"));
		Assert.assertTrue("Java fetch should be true", OV.fetch());
		Assert.assertFalse("Java fetch should be false", session.fetch());
		checkNodeFetchChanged(false, false);
		checkNodeFetchChanged(true, false);
		checkNodeFetchChanged(false, false);

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
		checkNodeFetchChanged(false, false);
		checkNodeFetchChanged(true, false);
		checkNodeFetchChanged(true, false);
		// Java SDK should return true as it doesn't know about the recording yet
		Assert.assertTrue("Java fetch should be true", session.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());

		OV.stopRecording(session.getSessionId());
		user.getEventManager().waitUntilEventReaches("recordingStopped", 1);
		// Java SDK should return false as the recording has been stopped with it
		Assert.assertFalse("Java fetch should be false", session.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		// Node SDK should return true as it doesn't know about the recording stooped
		checkNodeFetchChanged(false, true);
		checkNodeFetchChanged(false, false);
		checkNodeFetchChanged(true, false);

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
		Assert.assertTrue("Java fetch should be true", OV.fetch());
		Assert.assertFalse("Java fetch should be false", session.fetch());
		checkNodeFetchChanged(true, true);
		checkNodeFetchChanged(true, false);
		checkNodeFetchChanged(false, false);

		// MODIFY STREAM
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-video-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		Assert.assertTrue("Java fetch should be true", session.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		checkNodeFetchChanged(false, true);
		checkNodeFetchChanged(true, false);
		checkNodeFetchChanged(false, false);

		// REMOVE STREAM
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .sub-btn")).click();
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		Assert.assertTrue("Java fetch should be true", OV.fetch());
		Assert.assertFalse("Java fetch should be false", session.fetch());
		checkNodeFetchChanged(true, true);
		checkNodeFetchChanged(true, false);
		checkNodeFetchChanged(false, false);

		// REMOVE USER
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .leave-btn")).click();
		user.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		Assert.assertTrue("Java fetch should be true", session.fetch());
		Assert.assertFalse("Java fetch should be false", OV.fetch());
		checkNodeFetchChanged(false, true);
		checkNodeFetchChanged(false, false);
		checkNodeFetchChanged(true, false);
	}

	private void checkNodeFetchChanged(boolean global, boolean hasChanged) {
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

}
