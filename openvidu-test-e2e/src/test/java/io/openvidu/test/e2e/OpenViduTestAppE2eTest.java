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

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.test.context.junit.jupiter.SpringExtension;

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
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscriptionStatusChanged", "RoomEvent", 8);
		user.getEventManager().waitUntilEventReaches("trackStreamStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackStreamStateChanged", "ParticipantEvent", 2);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 4));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 4));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(4, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions
				.assertTrue(
						user.getBrowserUser().assertMediaTracks(
								user.getDriver().findElements(By.cssSelector("audio.remote")), true, false),
						"HTMLAudioElements were expected to have only one audio track");
		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2One only audio")
	@Disabled
	void oneToOneOnlyAudioSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2One only audio");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getDriver().findElements(By.className("send-video-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", "RoomEvent", 4);

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, false),
				"Videos were expected to only have audio tracks");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2One only video")
	@Disabled
	void oneToOneOnlyVideoSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2One only video");

		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getDriver().findElements(By.className("send-audio-checkbox")).forEach(el -> el.click());
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", "RoomEvent", 4);

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

		WebElement one2ManyInput = user.getDriver().findElement(By.id("one2many-input"));
		one2ManyInput.clear();
		one2ManyInput.sendKeys("3");
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 6);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 4));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 4));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(4, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions
				.assertTrue(
						user.getBrowserUser().assertMediaTracks(
								user.getDriver().findElements(By.cssSelector("audio.remote")), true, false),
						"HTMLAudioElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, 4);
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
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 24);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 16));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 16));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(16, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(16, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser()
				.assertMediaTracks(user.getDriver().findElements(By.tagName("video")), false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions
				.assertTrue(
						user.getBrowserUser().assertMediaTracks(
								user.getDriver().findElements(By.cssSelector("audio.remote")), true, false),
						"HTMLAudioElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, 4);
	}

	@Test
	@DisplayName("Massive session")
	@Disabled
	void massiveSessionTest() throws Exception {

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

		user.getEventManager().waitUntilEventReaches("streamCreated", "RoomEvent", NUMBER_OF_USERS * NUMBER_OF_USERS);
		user.getEventManager().waitUntilEventReaches("streamPlaying", "RoomEvent", NUMBER_OF_USERS * NUMBER_OF_USERS);

		this.stopMediaServer();

		user.getEventManager().waitUntilEventReaches("sessionDisconnected", "RoomEvent", NUMBER_OF_USERS);
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
				user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
				user.getEventManager().waitUntilEventReaches("trackStreamStateChanged", "RoomEvent", 2);

				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 3));
				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 3));
				final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
				final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
				Assertions.assertEquals(3, numberOfVideos, "Wrong number of videos");
				Assertions.assertEquals(3, numberOfAudios, "Wrong number of audios");

				Assertions
						.assertTrue(
								user.getBrowserUser().assertMediaTracks(
										user.getDriver().findElements(By.tagName("video")), false, true),
								"HTMLVideoElements were expected to have only one video track");
				Assertions.assertTrue(
						user.getBrowserUser().assertMediaTracks(
								user.getDriver().findElements(By.cssSelector("audio.remote")), true, false),
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

}
