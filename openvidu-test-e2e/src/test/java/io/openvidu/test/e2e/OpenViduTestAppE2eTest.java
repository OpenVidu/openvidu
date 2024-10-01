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

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.common.collect.ImmutableList;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.test.browsers.BrowserUser;

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
		setUpLiveKitClient();
	}

	@BeforeEach()
	protected void setupEach() {
		this.closeAllRooms(LK);
	}

	@AfterEach()
	protected void finishEach() {
		this.closeAllRooms(LK);
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
	@DisplayName("One2One Edge")
	void oneToOneEdge() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("edge");
		log.info("One2One Edge");
		oneToOneAux(user);
	}

	private void oneToOneAux(OpenViduTestappUser user) throws Exception {
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();
		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscriptionStatusChanged", "RoomEvent", 8);
		// user.getEventManager().waitUntilEventReaches("trackStreamStateChanged",
		// "RoomEvent", 2);
		// user.getEventManager().waitUntilEventReaches("trackStreamStateChanged",
		// "ParticipantEvent", 2);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 4));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 4));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(4, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");
		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2One only audio")
	void oneToOneOnlyAudioSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2One only audio");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		for (int n = 0; n < 2; n++) {
			user.getDriver().findElement(By.id("room-options-btn-" + n)).click();
			Thread.sleep(300);
			user.getDriver().findElement(By.id("video-capture-false")).click();
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 2);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(0, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(4, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2One only video")
	void oneToOneOnlyVideoSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2One only video");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		for (int n = 0; n < 2; n++) {
			user.getDriver().findElement(By.id("room-options-btn-" + n)).click();
			Thread.sleep(300);
			user.getDriver().findElement(By.id("audio-capture-false")).click();
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 2);

		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2Many [Video + Audio]")
	void oneToManyVideoAudioSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2Many [Video + Audio]");

		final int SUBSCRIBERS = 7;
		final int USERS = SUBSCRIBERS + 1;

		WebElement one2ManyInput = user.getDriver().findElement(By.id("one2many-input"));
		one2ManyInput.clear();
		one2ManyInput.sendKeys(Integer.toString(SUBSCRIBERS));
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", USERS);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", USERS);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", (SUBSCRIBERS) * 2);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), USERS));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), USERS));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(USERS, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(USERS, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, USERS);
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

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 8);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 8);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 24);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 16));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 16));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(16, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(16, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, 4);
	}

	@Test
	@DisplayName("Massive session")
	void massiveSessionTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Massive session");

		final Integer NUMBER_OF_USERS = 8;

		user.getDriver().findElement(By.id("toolbar-scenarios")).sendKeys(Keys.ENTER);

		WebElement many2ManyInput = user.getDriver().findElement(By.id("m2m-input"));
		many2ManyInput.clear();
		many2ManyInput.sendKeys(NUMBER_OF_USERS.toString());

		user.getDriver().findElement(By.id("m2m-btn")).click();

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", NUMBER_OF_USERS);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", NUMBER_OF_USERS);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", NUMBER_OF_USERS * 2);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", NUMBER_OF_USERS * 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent",
				(NUMBER_OF_USERS) * (NUMBER_OF_USERS - 1) * 2);

		user.getWaiter()
				.until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), NUMBER_OF_USERS * NUMBER_OF_USERS));
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", true, true),
				"HTMLVideoElements were expected to have a video track and an audio track attached");

		user.getDriver().findElement(By.id("finish-btn")).click();

		user.getEventManager().waitUntilEventReaches("disconnected", "RoomEvent", NUMBER_OF_USERS);
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
			WebElement one2ManyInput = user.getDriver().findElement(By.id("participant-name-input-0"));
			one2ManyInput.clear();
			one2ManyInput.sendKeys(browserName);
			user.getDriver().findElement(By.className("connect-btn")).click();

			try {
				user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 1, 100, true);
				user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
				user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
				user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
				user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
				// user.getEventManager().waitUntilEventReaches("trackStreamStateChanged",
				// "RoomEvent", 2);

				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 3));
				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 3));
				final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
				final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
				Assertions.assertEquals(3, numberOfVideos, "Wrong number of videos");
				Assertions.assertEquals(3, numberOfAudios, "Wrong number of audios");

				Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
						"HTMLVideoElements were expected to have only one video track");
				Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio.remote", true, false),
						"HTMLAudioElements were expected to have only one audio track");

				latch.countDown();
				if (!latch.await(60, TimeUnit.SECONDS)) {
					Assertions.fail("Other browser didn't play the stream within the timeout");
				}

				user.getDriver().findElement(By.id("remove-user-btn")).click();
				user.getEventManager().waitUntilEventReaches("disconnected", "RoomEvent", 1);

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

		threadChrome.setUncaughtExceptionHandler(h);
		threadFirefox.setUncaughtExceptionHandler(h);
		threadEdge.setUncaughtExceptionHandler(h);
		threadChrome.start();
		threadFirefox.start();
		threadEdge.start();
		threadChrome.join();
		threadFirefox.join();
		threadEdge.join();

		synchronized (lock) {
			if (OpenViduTestAppE2eTest.ex != null) {
				throw OpenViduTestAppE2eTest.ex;
			}
		}
	}

	@Test
	@DisplayName("Speaker detection")
	void speakerDetectionTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		log.info("Speaker detection");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		// Only audio publisher
		user.getDriver().findElement(By.id("room-options-btn-0")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.id("video-capture-false")).click();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);

		// Only subscriber
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publisher-checkbox")).click();

		for (int n = 0; n < 2; n++) {
			user.getDriver().findElement(By.id("room-events-btn-" + n)).click();
			Thread.sleep(300);
			user.getDriver().findElement(By.cssSelector("button[name='activeSpeakersChanged']")).click();
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}

		List<JsonObject> events = new ArrayList<>();
		user.getEventManager().on("activeSpeakersChanged", "RoomEvent", ev -> {
			events.add(JsonParser.parseString(ev.toString()).getAsJsonObject());
		});

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches(0, "signalConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "connected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches(0, "localTrackPublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "localTrackPublished", "ParticipantEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "localTrackSubscribed", "ParticipantEvent", 1);

		user.getEventManager().waitUntilEventReaches(0, "signalConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "connected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscriptionStatusChanged", "RoomEvent", 2);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(0, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(2, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");

		user.getEventManager().waitUntilEventReaches(0, "activeSpeakersChanged", "RoomEvent", 5);
		user.getEventManager().waitUntilEventReaches(0, "isSpeakingChanged", "ParticipantEvent", 5);
		user.getEventManager().waitUntilEventReaches(1, "activeSpeakersChanged", "RoomEvent", 5);
		user.getEventManager().waitUntilEventReaches(1, "isSpeakingChanged", "ParticipantEvent", 5);

		user.getEventManager().off("activeSpeakersChanged", "RoomEvent");

		Collection<JsonObject> finalList = ImmutableList.copyOf(events);
		finalList.forEach(event -> {
			JsonArray speakers = event.get("eventContent").getAsJsonObject().get("speakers").getAsJsonArray();
			if (speakers.size() > 0) {
				Assertions.assertEquals(1, speakers.size(), "Wrong number of speakers");
				JsonObject participant = speakers.get(0).getAsJsonObject();
				Assertions.assertEquals("TestParticipant0", participant.get("identity").getAsString(),
						"Wrong speaker identity");
			}
		});

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Adaptive stream enabled")
	void aptiveStreamEnabledTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Adaptive stream enabled");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		// Only video publisher
		user.getDriver().findElement(By.id("room-options-btn-0")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.id("audio-capture-false")).click();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);

		// Only subscriber
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publisher-checkbox")).click();

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscriptionStatusChanged", "RoomEvent", 2);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		Thread.sleep(1500);

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		int oldTrackWidth = user.getBrowserUser().getVideoTrackWidth(subscriberVideo);

		user.getBrowserUser().changeElementSize(subscriberVideo, 500, 300);
		oldTrackWidth = this.waitForVideoTrackResolutionChange(user.getBrowserUser(), subscriberVideo, oldTrackWidth,
				true);

		user.getBrowserUser().changeElementSize(subscriberVideo, 80, 40);
		oldTrackWidth = this.waitForVideoTrackResolutionChange(user.getBrowserUser(), subscriberVideo, oldTrackWidth,
				false);

		user.getBrowserUser().changeElementSize(subscriberVideo, 1000, 700);
		oldTrackWidth = this.waitForVideoTrackResolutionChange(user.getBrowserUser(), subscriberVideo, oldTrackWidth,
				true);

		user.getBrowserUser().changeElementSize(subscriberVideo, 120, 80);
		oldTrackWidth = this.waitForVideoTrackResolutionChange(user.getBrowserUser(), subscriberVideo, oldTrackWidth,
				false);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Adaptive stream disabled")
	void aptiveStreamDisabledTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Adaptive stream disabled");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		// Only video publisher
		user.getDriver().findElement(By.id("room-options-btn-0")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.id("audio-capture-false")).click();
		user.getDriver().findElement(By.id("room-adaptiveStream")).click();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);

		// Only subscriber
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publisher-checkbox")).click();
		user.getDriver().findElement(By.id("room-options-btn-1")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.id("room-adaptiveStream")).click();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscriptionStatusChanged", "RoomEvent", 2);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		Thread.sleep(1500);

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		int oldTrackWidth = user.getBrowserUser().getVideoTrackWidth(subscriberVideo);
		user.getBrowserUser().changeElementSize(subscriberVideo, 1000, 700);
		Thread.sleep(2000);
		int newTrackWidth = user.getBrowserUser().getVideoTrackWidth(subscriberVideo);

		Assertions.assertEquals(oldTrackWidth, newTrackWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		oldTrackWidth = newTrackWidth;
		user.getBrowserUser().changeElementSize(subscriberVideo, 100, 30);
		Thread.sleep(2000);
		newTrackWidth = user.getBrowserUser().getVideoTrackWidth(subscriberVideo);

		Assertions.assertEquals(oldTrackWidth, newTrackWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		gracefullyLeaveParticipants(user, 2);
	}

	private int waitForVideoTrackResolutionChange(BrowserUser user, WebElement videoElement, int oldTrackWidth,
			boolean shouldBeHigher) {
		final int maxWaitMillis = 6000;
		final int intervalWait = 250;
		final int MAX_ITERATIONS = maxWaitMillis / intervalWait;
		int iteration = 0;
		boolean changed = false;
		int newTrackWidth = -1;
		while (!changed && iteration < MAX_ITERATIONS) {
			iteration++;
			newTrackWidth = user.getVideoTrackWidth(videoElement);
			changed = oldTrackWidth != newTrackWidth;
			if (changed) {
				break;
			} else {
				try {
					Thread.sleep(intervalWait);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}
		}
		if (!changed) {
			Assertions.fail("Timeout waiting for video track to reach a " + (shouldBeHigher ? "higher" : "lower")
					+ " resolution");
		} else {
			if (shouldBeHigher) {
				Assertions.assertTrue(newTrackWidth > oldTrackWidth,
						"Video track should have now a higher resolution, but it is not. Old width: " + oldTrackWidth
								+ ". New width: " + newTrackWidth);
			} else {
				Assertions.assertTrue(newTrackWidth < oldTrackWidth,
						"Video track should have now a lower resolution, but it is not. Old width: " + oldTrackWidth
								+ ". New width: " + newTrackWidth);
			}

		}
		return newTrackWidth;
	}

}
