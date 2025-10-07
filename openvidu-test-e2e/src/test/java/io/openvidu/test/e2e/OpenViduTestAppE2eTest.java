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

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map.Entry;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;

import org.junit.jupiter.api.AfterEach;
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
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.common.collect.ImmutableList;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.Result;
import io.minio.errors.ErrorResponseException;
import io.minio.errors.InsufficientDataException;
import io.minio.errors.InternalException;
import io.minio.errors.InvalidResponseException;
import io.minio.errors.ServerException;
import io.minio.errors.XmlParserException;
import io.minio.messages.Item;
import io.openvidu.test.e2e.annotations.OnlyMediasoup;
import io.openvidu.test.e2e.annotations.OnlyPion;
import livekit.LivekitIngress.IngressInfo;
import livekit.LivekitIngress.IngressState;

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
		this.deleteAllIngresses(LK_INGRESS);
	}

	@AfterEach()
	protected void finishEach() {
		this.closeAllRooms(LK);
		this.deleteAllIngresses(LK_INGRESS);
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
		user.getEventManager().waitUntilEventReaches("participantActive", "RoomEvent", 2);
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
	@DisplayName("Signal")
	void signalTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		log.info("Signal");
		for (int i = 0; i < 2; i++) {
			WebElement addUserBtn = user.getDriver().findElement(By.id("add-user-btn"));
			addUserBtn.click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + i + " .subscriber-checkbox")).click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + i + " .publisher-checkbox")).click();
		}
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("participantConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("participantActive", "RoomEvent", 1);

		// Broadcast signal
		Collection<Entry<String, String>> assertions = new ArrayList<>();

		// Broadcast from TestParticipant0
		final CountDownLatch signalEventLatch1 = new CountDownLatch(2);

		user.getEventManager().on(1, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant0 to all room",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch1.countDown();
		});
		user.getEventManager().on(1, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant0 to all room",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch1.countDown();
		});

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .message-btn")).click();
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "ParticipantEvent", 1);
		// Do not trigger own signals
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-ParticipantEvent").get());

		if (!signalEventLatch1.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for signal event content check");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));
		user.getEventManager().off(1, "dataReceived", "RoomEvent");
		user.getEventManager().off(1, "dataReceived", "ParticipantEvent");
		assertions.clear();
		user.getEventManager().clearAllCurrentEvents();

		// Broadcast from TestParticipant1
		final CountDownLatch signalEventLatch2 = new CountDownLatch(2);

		user.getEventManager().on(0, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant1 to all room",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch2.countDown();
		});
		user.getEventManager().on(0, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant1 to all room",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch2.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .message-btn")).click();
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "ParticipantEvent", 1);
		// Do not trigger own signals
		Assertions.assertEquals(1, user.getEventManager().getNumEvents(0, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(1, user.getEventManager().getNumEvents(0, "dataReceived-ParticipantEvent").get());

		if (!signalEventLatch2.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for signal event content check");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));
		user.getEventManager().off(0, "dataReceived", "RoomEvent");
		user.getEventManager().off(0, "dataReceived", "ParticipantEvent");
		assertions.clear();
		user.getEventManager().clearAllCurrentEvents();

		// Signal specific participant

		// Signal from TestParticipant0 to TestParticipant1
		final CountDownLatch signalEventLatch3 = new CountDownLatch(2);

		user.getEventManager().on(1, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant0 to TestParticipant1",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch3.countDown();
		});
		user.getEventManager().on(1, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant0 to TestParticipant1",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch3.countDown();
		});
		user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-0 app-participant.remote-participant .message-btn"))
				.click();
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "ParticipantEvent", 1);

		// Do not trigger own signals
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-ParticipantEvent").get());

		if (!signalEventLatch3.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for signal event content check");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));
		user.getEventManager().off(1, "dataReceived", "RoomEvent");
		user.getEventManager().off(1, "dataReceived", "ParticipantEvent");
		assertions.clear();
		user.getEventManager().clearAllCurrentEvents();

		// Signal from TestParticipant1 to TestParticipant0
		final CountDownLatch signalEventLatch4 = new CountDownLatch(2);

		user.getEventManager().on(0, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant1 to TestParticipant0",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch4.countDown();
		});
		user.getEventManager().on(0, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>("Message from TestParticipant1 to TestParticipant0",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			signalEventLatch4.countDown();
		});
		user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 app-participant.remote-participant .message-btn"))
				.click();
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "ParticipantEvent", 1);

		// Do not trigger own signals
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(1, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(1, "dataReceived-ParticipantEvent").get());

		if (!signalEventLatch4.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for signal event content check");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("One2One only audio")
	void oneToOneOnlyAudioSession() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("One2One only audio");

		for (int n = 0; n < 2; n++) {
			this.addPublisherSubscriber(user, true, false);
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

		for (int n = 0; n < 2; n++) {
			this.addPublisherSubscriber(user, false, true);
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

		final int USERS = 4;

		WebElement addUser = user.getDriver().findElement(By.id("add-user-btn"));
		for (int i = 0; i < USERS; i++) {
			addUser.click();
		}

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", USERS);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", USERS);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", USERS * 2);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", USERS * 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", (USERS * (USERS - 1) * 2));

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), USERS * USERS));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), USERS * USERS));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(USERS * USERS, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(USERS * USERS, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, USERS);
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
			WebElement participantNameInput = user.getDriver().findElement(By.id("participant-name-input-0"));
			participantNameInput.clear();
			participantNameInput.sendKeys(browserName);
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
	@DisplayName("Chrome force VP8")
	void chromeForceVP8Test() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		log.info("Chrome force VP8");
		forceCodecTest(user, "vp8");
	}

	@Test
	@DisplayName("Firefox force VP8")
	void firefoxForceVP8Test() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");
		log.info("Firefox force VP8");
		forceCodecTest(user, "vp8");
	}

	@Test
	@DisplayName("Chrome force H264")
	// TODO: remove tag when not forcing VP8 with mediasoup
	@OnlyPion
	void chromeForceH264Test() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		log.info("Chrome force H264");
		forceCodecTest(user, "h264");
	}

	@Test
	@DisplayName("Firefox force H264")
	@Disabled // Firefox forces VP8 in linux/android when publishing even with Pion
	void firefoxForceH264Test() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");
		log.info("Firefox force H264");
		forceCodecTest(user, "h264");
	}

	@Test
	@DisplayName("Chrome force VP9")
	// TODO: remove tag when not forcing VP8 with mediasoup
	@OnlyPion
	void chromeForceVP9Test() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		log.info("Chrome force VP9");
		forceCodecTest(user, "vp9");
	}

	@Test
	@DisplayName("Firefox force VP9")
	@Disabled // Firefox forces VP8 in linux/android when publishing even with Pion
	void firefoxForceVP9Test() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");
		log.info("Firefox force VP9");
		forceCodecTest(user, "vp9");
	}

	private void forceCodecTest(OpenViduTestappUser user, String codec) throws Exception {
		this.addOnlyPublisherVideo(user, false, false, false);

		user.getDriver().findElement(By.id("room-options-btn-0")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.id("trackPublish-backupCodec")).click();
		user.getDriver().findElement(By.id("trackPublish-videoCodec")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.id("mat-option-" + codec.toLowerCase())).click();
		this.waitForBackdropAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);

		this.addSubscriber(user, false);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		String expectedCodec = "video/" + codec.toUpperCase();
		// Check publisher's codec
		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		this.waitUntilVideoLayersNotEmpty(user, publisherVideo);
		Assertions.assertEquals(expectedCodec,
				getPublisherVideoLayerAttribute(user, publisherVideo, null, "codec").getAsString());

		// Check subscriber's codec
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
		String subscriberCodec = json.get(0).getAsJsonObject().get("codec").getAsString();
		Assertions.assertEquals(expectedCodec, subscriberCodec);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Firefox subscribe to VP8")
	void firefoxSubscribeToVP8Test() throws Exception {
		log.info("Firefox subscribe to VP8");
		firefoxSubscribeToCodecTest("vp8", false);
	}

	@Test
	@DisplayName("Firefox subscribe to H264")
	// TODO: remove tag when not forcing VP8 with mediasoup
	@OnlyPion
	void firefoxSubscribeToH264Test() throws Exception {
		log.info("Firefox subscribe to H264");
		firefoxSubscribeToCodecTest("h264", false);
	}

	@Test
	@DisplayName("Firefox subscribe to VP9")
	// TODO: remove tag when not forcing VP8 with mediasoup
	@OnlyPion
	void firefoxSubscribeToVP9Test() throws Exception {
		log.info("Firefox subscribe to VP9");
		firefoxSubscribeToCodecTest("vp9", false);
	}

	@Test
	@DisplayName("Firefox subscribe to VP8 simulcast")
	void firefoxSubscribeToVP8SimulcastTest() throws Exception {
		log.info("Firefox subscribe to VP8 simulcast");
		firefoxSubscribeToCodecTest("vp8", true);
	}

	@Test
	@DisplayName("Firefox subscribe to H264 simulcast")
	// TODO: remove tag when not forcing VP8 with mediasoup
	@OnlyPion
	void firefoxSubscribeToH264SimulcastTest() throws Exception {
		log.info("Firefox subscribe to H264 simulcast");
		firefoxSubscribeToCodecTest("h264", true);
	}

	@Test
	@DisplayName("Firefox subscribe to VP9 simulcast")
	// TODO: remove tag when not forcing VP8 with mediasoup
	@OnlyPion
	void firefoxSubscribeToVP9SimulcastTest() throws Exception {
		log.info("Firefox subscribe to VP9 simulcast");
		firefoxSubscribeToCodecTest("vp9", true);
	}

	private void firefoxSubscribeToCodecTest(String codec, boolean simulcast) throws Exception {
		final String expectedCodec = "video/" + codec.toUpperCase();
		final CountDownLatch latch = new CountDownLatch(2);
		ExecutorService executor = Executors.newFixedThreadPool(2);

		Future<?> task1 = executor.submit(() -> {
			try {
				OpenViduTestappUser chromeUser = setupBrowserAndConnectToOpenViduTestapp("chrome");
				this.addOnlyPublisherVideo(chromeUser, simulcast, false, false);
				WebElement participantNameInput = chromeUser.getDriver().findElement(By.id("participant-name-input-0"));
				participantNameInput.clear();
				participantNameInput.sendKeys("CHROME_USER");
				chromeUser.getDriver().findElement(By.id("room-options-btn-0")).click();
				Thread.sleep(300);
				chromeUser.getDriver().findElement(By.id("trackPublish-backupCodec")).click();
				chromeUser.getDriver().findElement(By.id("trackPublish-videoCodec")).click();
				Thread.sleep(300);
				chromeUser.getDriver().findElement(By.id("mat-option-" + codec.toLowerCase())).click();
				chromeUser.getDriver().findElement(By.id("close-dialog-btn")).click();
				Thread.sleep(300);
				chromeUser.getDriver().findElement(By.className("connect-btn")).click();
				chromeUser.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1);
				// Check publisher's codec
				WebElement publisherVideo = chromeUser.getDriver()
						.findElement(By.cssSelector("#openvidu-instance-0 video.local"));
				Assertions.assertEquals(expectedCodec,
						getPublisherVideoLayerAttribute(chromeUser, publisherVideo, null, "codec").getAsString());
				latch.countDown();
				latch.await(10, TimeUnit.SECONDS);
				gracefullyLeaveParticipants(chromeUser, 1);
			} catch (Exception e) {
				Assertions.fail("Error while setting up Chrome publisher", e);
			}
		});

		Future<?> task2 = executor.submit(() -> {
			try {
				OpenViduTestappUser firefoxUser = setupBrowserAndConnectToOpenViduTestapp("firefox");
				this.addSubscriber(firefoxUser, false);
				WebElement participantNameInput = firefoxUser.getDriver()
						.findElement(By.id("participant-name-input-0"));
				participantNameInput.clear();
				participantNameInput.sendKeys("FIREFOX_USER");
				firefoxUser.getDriver().findElement(By.className("connect-btn")).click();
				firefoxUser.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
				firefoxUser.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));
				final int numberOfVideos = firefoxUser.getDriver().findElements(By.tagName("video")).size();
				Assertions.assertEquals(1, numberOfVideos, "Wrong number of videos");
				Assertions.assertTrue(firefoxUser.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
						"HTMLVideoElements were expected to have only one video track");

				// Check subscriber's codec
				WebElement subscriberVideo = firefoxUser.getDriver()
						.findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
				waitUntilVideoLayersNotEmpty(firefoxUser, subscriberVideo);
				JsonArray json = this.getLayersAsJsonArray(firefoxUser, subscriberVideo);
				String subscriberCodec = json.get(0).getAsJsonObject().get("codec").getAsString();
				Assertions.assertEquals(expectedCodec, subscriberCodec);
				latch.countDown();
				latch.await(10, TimeUnit.SECONDS);
				gracefullyLeaveParticipants(firefoxUser, 1);
			} catch (Exception e) {
				Assertions.fail("Error while setting up Firefox subscriber", e);
			}
		});

		try {
			task1.get();
			task2.get();
		} catch (ExecutionException ex) {
			Assertions.fail("Error while running browsers in parallel", ex);
		}
	}

	@Test
	@DisplayName("Firefox toggle subscription")
	void firefoxToggleSubscriptionTest() throws Exception {
		log.info("Firefox toggle subscription");
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");
		this.addOnlyPublisherVideo(user, false, false, false);
		this.addSubscriber(user, false);
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches(0, "localTrackSubscribed", "ParticipantEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "ParticipantEvent", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		this.waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);

		// Unsubscribe
		WebElement toggleSubscriptionBtn = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-subscribed"));
		toggleSubscriptionBtn.click();
		user.getEventManager().waitUntilEventReaches(1, "trackUnsubscribed", "ParticipantEvent", 1);

		this.waitUntilAux(user, subscriberVideo, () -> {
			return this.getLayersAsString(user, subscriberVideo).isBlank();
		}, "Timeout waiting for subscriber video to not have any layers");

		// Re-subscribe
		toggleSubscriptionBtn.click();
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "ParticipantEvent", 2);
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Enable disable track")
	void enableDisableTrackTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Enable disable track");

		// Only video publisher with simulcast and dynacast
		this.addOnlyPublisherVideo(user, true, true, false);
		// Only subscriber without adaptive stream
		this.addSubscriber(user, false);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// An enabled subscribed track increases its bytesReceived over time

		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);

		// A disabled subscribed track does not increase its bytesReceived over time
		WebElement enableToggle = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-enabled"));
		enableToggle.click();
		bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		Thread.sleep(1250);
		Assertions.assertEquals(bytesReceived, this.getSubscriberVideoBytesReceived(user, subscriberVideo),
				"Subscriber disabled should have NOT increased its bytesReceived");

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);

		enableToggle.click();
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Enable disable track with dynacast")
	void enableDisableTrackWithDynacastTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Enable disable track with dynacast");

		// Only video publisher with simulcast, dynacast and 3 layers
		this.addOnlyPublisherVideo(user, true, true, true);
		// Only subscriber without adaptive stream
		this.addSubscriber(user, false);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement subscriberVideo1 = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		WebElement firstSubscriberToggle = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-enabled"));
		firstSubscriberToggle.click();
		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo1);

		// Dynacast should stop published layers only subscribed by a disabled
		// subscriber
		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));

		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", false);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", false);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", false);

		firstSubscriberToggle.click();
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo1, bytesReceived);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);

		// Publishing 3 layers (LOW, MEDIUM, HIGH), MEDIUM and HIGH should be
		// deactivated if one subscriber receiving HIGH is disabled, but LOW a should
		// remain active as long as another subscriber keeps LOW layer enabled

		Assertions.assertEquals(3, countNumberOfPublishedLayers(user, publisherVideo),
				"Wrong number of published layers");
		int f = Integer.parseInt(getPublisherVideoLayerAttribute(user, publisherVideo, "f", "frameWidth").toString());
		int q = Integer.parseInt(getPublisherVideoLayerAttribute(user, publisherVideo, "q", "frameWidth").toString());

		this.addSubscriber(user, false);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 .connect-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(0, "participantConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "participantConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(2, "trackSubscribed", "RoomEvent", 1);

		// Manually change video quality of first subscriber to q
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-LOW")).click();

		// Manually change video quality of second subscriber to f
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-HIGH")).click();

		subscriberVideo1 = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		WebElement subscriberVideo2 = user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 video.remote"));

		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo1, q);
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo2, f);

		WebElement secondSubscriberToggle = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-2 .toggle-video-enabled"));
		secondSubscriberToggle.click();

		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", false);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", false);

		firstSubscriberToggle = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-enabled"));
		firstSubscriberToggle.click();
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", false);

		secondSubscriberToggle = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-2 .toggle-video-enabled"));
		secondSubscriberToggle.click();

		// Manually change video quality of second subscriber to h
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-MEDIUM")).click();

		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", false);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Server API MutePublishedTrack")
	void serverApiMutePublishedTrackTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Server API MutePublishedTrack");

		// Only video publisher with simulcast, dynacast and 3 layers
		this.addOnlyPublisherVideo(user, false, false, false);
		// Only subscriber without adaptive stream
		this.addSubscriber(user, false);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		user.getDriver().findElement(By.cssSelector("#room-api-btn-0")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("#force-unpublish-api-btn")).click();
		user.getEventManager().waitUntilEventReaches("trackMuted", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackMuted", "ParticipantEvent", 2);
		user.getEventManager().clearAllCurrentEvents();

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .mute-unmute-video")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("trackUnmuted", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackUnmuted", "ParticipantEvent", 2);
		user.getEventManager().clearAllCurrentEvents();

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Speaker detection")
	void speakerDetectionTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		log.info("Speaker detection");

		// Only audio publisher
		this.addOnlyPublisherAudio(user);
		// Only subscriber
		this.addSubscriber(user, true);

		for (int n = 0; n < 2; n++) {
			user.getDriver().findElement(By.id("room-events-btn-" + n)).sendKeys(Keys.ENTER);
			Thread.sleep(300);
			user.getDriver().findElement(By.cssSelector("button[name='activeSpeakersChanged']")).sendKeys(Keys.ENTER);
			user.getDriver().findElement(By.id("close-dialog-btn")).sendKeys(Keys.ENTER);
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
	@DisplayName("Simulcast enabled")
	void simulcastEnabledTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Simulcast enabled");

		// Only video publisher with simulcast without dynacast
		this.addOnlyPublisherVideo(user, true, false, true);
		// Only subscriber without adaptive stream
		this.addSubscriber(user, false);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		Assertions.assertEquals(3, countNumberOfPublishedLayers(user, publisherVideo),
				"Wrong number of published layers");
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		int f = getPublisherVideoLayerAttribute(user, publisherVideo, "f", "frameWidth").getAsInt();
		int h = getPublisherVideoLayerAttribute(user, publisherVideo, "h", "frameWidth").getAsInt();
		int q = getPublisherVideoLayerAttribute(user, publisherVideo, "q", "frameWidth").getAsInt();

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// Video quality of subscriber should be by default f
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, f);

		// Manually change video quality of subscriber to h
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-MEDIUM")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, h);

		// Manually change video quality of subscriber to q
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-LOW")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, q);

		// Manually change video quality of subscriber to f
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-HIGH")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, f);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Simulcast disabled")
	void simulcastDisabledTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Simulcast disabled");

		// Only video publisher without simulcast
		this.addOnlyPublisherVideo(user, false, false, true);
		// Only subscriber without adaptive stream
		this.addSubscriber(user, false);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		Assertions.assertEquals(1, countNumberOfPublishedLayers(user, publisherVideo),
				"Wrong number of published layers");

		JsonObject publishedLayer = this.getLayersAsJsonArray(user, publisherVideo).get(0).getAsJsonObject();
		String scalabilityMode = publishedLayer.get("scalabilityMode").getAsString();
		Assertions.assertEquals("L1T1", scalabilityMode, "Wrong number of published layers");

		int frameWidth = publishedLayer.get("frameWidth").getAsInt();
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, frameWidth);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Adaptive stream disabled Dynacast disabled")
	void adaptiveStreamDisabledDynacastDisabledTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Adaptive stream disabled Dynacast disabled");

		// Only video publisher
		this.addOnlyPublisherVideo(user, true, false, false);
		// Only subscriber
		this.addSubscriber(user, false);

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
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// Subscriber should settle in 640p
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 640);

		user.getBrowserUser().changeElementSize(subscriberVideo, 1000, 700);
		Thread.sleep(2000);
		int newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(640, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		int oldFrameWidth = newFrameWidth;
		user.getBrowserUser().changeElementSize(subscriberVideo, 100, 30);
		Thread.sleep(3000);
		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(oldFrameWidth, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		oldFrameWidth = newFrameWidth;
		oldFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		user.getBrowserUser().changeElementSize(subscriberVideo, 1000, 700);
		Thread.sleep(3000);
		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(oldFrameWidth, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Adaptive stream enabled Dynacast disabled")
	void adaptiveStreamEnabledDynacastDisabledTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Adaptive stream enabled Dynacast disabled");

		// Only video publisher
		this.addOnlyPublisherVideo(user, true, false, false);
		// Only subscriber
		this.addSubscriber(user, true);

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

		// Some time to let subscriber's video stabilize its first resolution
		Thread.sleep(2000);

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		int frameWidth;

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		user.getBrowserUser().changeElementSize(subscriberVideo, 500, 300);
		this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, frameWidth, true);

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		user.getBrowserUser().changeElementSize(subscriberVideo, 80, 40);
		this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, frameWidth, false);

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		user.getBrowserUser().changeElementSize(subscriberVideo, 1000, 700);
		this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, frameWidth, true);

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		user.getBrowserUser().changeElementSize(subscriberVideo, 120, 80);
		this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, frameWidth, false);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Dynacast enabled adaptive stream disabled")
	void dynacastEnabledAdaptiveStreamDisabledTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Dynacast enabled adaptive stream disabled");

		// Only video publisher
		this.addOnlyPublisherVideo(user, true, true, false);

		user.getDriver().findElement(By.className("connect-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));

		// With no subscribers and dynacast enabled, all published layers should finally
		// reach inactive state
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", false);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", false);

		// Only subscriber
		this.addSubscriber(user, false);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .connect-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(0, "localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscriptionStatusChanged", "RoomEvent", 2);
		user.getEventManager().clearAllCurrentEvents();

		// After subscription all layers should be active
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);

		// With adaptive stream disabled, it doesn't matter the subscription video is
		// small. All layers will remain active
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		user.getBrowserUser().changeElementSize(subscriberVideo, 100, 30);
		Thread.sleep(4000);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);

		// After unsubscription, all layers will be paused in publisher
		WebElement toggleSubscriptionBtn = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-subscribed"));
		toggleSubscriptionBtn.click();
		user.getEventManager().waitUntilEventReaches(1, "trackUnsubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscriptionStatusChanged", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", false);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", false);

		// After re-subscription, all layers will be active in publisher
		toggleSubscriptionBtn.click();
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscriptionStatusChanged", "RoomEvent", 2);
		user.getEventManager().clearAllCurrentEvents();

		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Dynacast enabled adaptive stream enabled")
	void dynacastEnabledAdaptiveStreamEnabledTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Dynacast enabled adaptive stream enabled");

		// Only video publisher with 1 spatial layer and 3 temporal layers (L1T3)
		this.addOnlyPublisherVideo(user, true, true, true);

		user.getDriver().findElement(By.className("connect-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		// Add only subscriber
		this.addSubscriber(user, true);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .connect-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(0, "localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscriptionStatusChanged", "RoomEvent", 2);
		user.getEventManager().clearAllCurrentEvents();

		// Half and full video layers should reach disabled status with a small video in
		// the subscriber side
		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		user.getBrowserUser().changeElementSize(subscriberVideo, 100, 30);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", false);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", false);

		int publisherActiveFrameWidth = this.getPublisherVideoLayerAttribute(user, publisherVideo, "q", "frameWidth")
				.getAsInt();
		int subscriberFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		Assertions.assertEquals(publisherActiveFrameWidth, subscriberFrameWidth,
				"Wrong publisher and subscriber video frameWidth");

		// All video layers should reach enabled status with a big video in the
		// subscriber side
		user.getBrowserUser().changeElementSize(subscriberVideo, 1000, 500);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", true);

		publisherActiveFrameWidth = this.getPublisherVideoLayerAttribute(user, publisherVideo, "f", "frameWidth")
				.getAsInt();
		waitUntilSubscriberFrameWidthIs(user, subscriberVideo, publisherActiveFrameWidth);
		subscriberFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		Assertions.assertEquals(publisherActiveFrameWidth, subscriberFrameWidth,
				"Wrong publisher and subscriber video frameWidth");

		// Half and quarter video layers should reach enabled status with a medium video
		// in the subscriber side
		user.getBrowserUser().changeElementSize(subscriberVideo, 500, 300);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", false);

		publisherActiveFrameWidth = this.getPublisherVideoLayerAttribute(user, publisherVideo, "h", "frameWidth")
				.getAsInt();
		subscriberFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		Assertions.assertEquals(publisherActiveFrameWidth, subscriberFrameWidth,
				"Wrong publisher and subscriber video frameWidth");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Simulcast disabled dynacast enabled")
	void simulcastDisabledDynacastEnabledTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Simulcast disabled dynacast enabled");

		// Only video publisher with simulcast without dynacast
		this.addOnlyPublisherVideo(user, false, true, false);
		// Only subscriber with adaptive stream
		this.addSubscriber(user, true);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(0, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		Assertions.assertEquals(1, countNumberOfPublishedLayers(user, publisherVideo),
				"Wrong number of published layers");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		long bytesSent = this.getPublisherVideoLayerAttribute(user, publisherVideo, null, "bytesSent").getAsLong();

		Thread.sleep(3000);

		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, true);
		this.waitUntilPublisherBytesSentIncrease(user, publisherVideo, null, bytesSent);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Egress")
	void egressTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Egress test");

		this.addPublisherSubscriber(user, true, true);

		user.getDriver().findElement(By.cssSelector(".connect-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);

		user.getDriver().findElement(By.cssSelector("#room-api-btn-0")).click();
		Thread.sleep(300);

		// Room composite
		this.egressTestByType(user, "room-composite");

		// Track composite
		this.egressTestByType(user, "track-composite");

		// Track
		this.egressTestByType(user, "track");
	}

	private void egressTestByType(OpenViduTestappUser user, String egressType) throws Exception {
		user.getEventManager().clearAllCurrentEvents();

		user.getDriver().findElement(By.id("egress-id-field")).clear();
		if ("track".equals(egressType)) {
			user.getDriver().findElement(By.id("audio-track-id-field"))
					.sendKeys(Keys.chord(Keys.CONTROL, "a", Keys.DELETE));
		}

		user.getDriver().findElement(By.cssSelector("#start-" + egressType + "-egress-api-btn")).click();

		// TODO: UNCOMMENT WHEN MEDIASOUP IS ABLE TO MANAGE ABRUPT
		// CONNECTIONSTATECHANGED DISOCONNECTED/FAILED
		// https://mediasoup.discourse.group/t/mediasoup-3-13-20-released-with-server-side-ice-consent-check-and-a-critical-fix/5864
		// user.getEventManager().waitUntilEventReaches("recordingStatusChanged",
		// "RoomEvent", 1);

		WebElement egressIdField = user.getDriver().findElement(By.id("egress-id-field"));
		WebDriverWait wait = new WebDriverWait(user.getDriver(), Duration.ofSeconds(10));
		wait.until(ExpectedConditions.textToBePresentInElementValue(egressIdField, "EG_"));
		String egressId = egressIdField.getDomProperty("value");

		this.waitUntilEgressStatus(user, egressId, "EGRESS_ACTIVE", 10000);

		Thread.sleep(1000);

		user.getDriver().findElement(By.cssSelector("#stop-egress-api-btn")).click();

		JsonObject egress = this.waitUntilEgressStatus(user, egressId, "EGRESS_COMPLETE", 10000);

		this.checkRecordingInBucket(egress);

		// TODO: UNCOMMENT WHEN MEDIASOUP IS ABLE TO MANAGE ABRUPT
		// CONNECTIONSTATECHANGED DISOCONNECTED/FAILED
		// https://mediasoup.discourse.group/t/mediasoup-3-13-20-released-with-server-side-ice-consent-check-and-a-critical-fix/5864
		// user.getEventManager().waitUntilEventReaches("recordingStatusChanged",
		// "RoomEvent", 2);
	}

	private JsonObject waitUntilEgressStatus(OpenViduTestappUser user, String egressId, String egressStatus,
			int timeoutMillis) {
		final int intervalWait = 250;
		final int MAX_ITERATIONS = timeoutMillis / intervalWait;
		int iteration = 0;
		boolean egressActive = false;
		JsonObject egressObject = null;

		while (!egressActive && iteration < MAX_ITERATIONS) {
			iteration++;
			try {
				user.getDriver().findElement(By.cssSelector("#list-egress-api-btn")).click();
				String textareaContent = user.getDriver().findElement(By.cssSelector("#api-response-text-area"))
						.getDomProperty("value");
				JsonArray egressArray = JsonParser.parseString(textareaContent).getAsJsonArray();

				// Find the egress object with the matching egressId
				JsonObject targetEgress = null;
				for (int i = 0; i < egressArray.size(); i++) {
					egressObject = egressArray.get(i).getAsJsonObject();
					if (egressId.equals(egressObject.get("egressId").getAsString())) {
						targetEgress = egressObject;
						break;
					}
				}

				if (targetEgress != null && egressStatus.equals(targetEgress.get("status").getAsString())) {
					egressActive = true;
				}
			} catch (Exception e) {
				// Continue polling if there's an exception
			}

			if (!egressActive) {
				try {
					Thread.sleep(intervalWait);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}
		}

		if (!egressActive) {
			Assertions.fail("Timeout waiting for egress '" + egressId + "' to reach status '" + egressStatus + "'");
		}
		return egressObject;
	}

	private void checkRecordingInBucket(JsonObject egress) {
		MinioClient minioClient = MinioClient.builder().endpoint("localhost", 9000, false)
				.credentials("minioadmin", "minioadmin").build();
		Iterable<Result<Item>> results = minioClient
				.listObjects(ListObjectsArgs.builder().bucket("openvidu-appdata").build());
		final boolean[] metadataFound = { false };
		final boolean[] videoFound = { false };
		results.forEach(result -> {
			Item object = null;
			try {
				object = result.get();
			} catch (InvalidKeyException | ErrorResponseException | IllegalArgumentException | InsufficientDataException
					| InternalException | InvalidResponseException | NoSuchAlgorithmException | ServerException
					| XmlParserException | IOException e) {
				e.printStackTrace();
				Assertions.fail("Error accessing Minio object");
			}
			String expectedFileName = egress.get("egressId").getAsString() + ".json";
			if (expectedFileName.equals(object.objectName())) {
				metadataFound[0] = true;
			}
			expectedFileName = egress.get("file").getAsJsonObject().get("filename").getAsString();
			if (expectedFileName.equals(object.objectName())) {
				videoFound[0] = true;
			}
		});
		if (!metadataFound[0]) {
			Assertions.fail("Recording metadata file not found in Minio");
		}
		if (!videoFound[0]) {
			Assertions.fail("Recording media file not found in Minio");
		}
	}

	@Test
	@DisplayName("Ingress VP8 Simulcast Chrome")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressVP8SimulcastChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress VP8 Simulcast Chrome");

		ingressSimulcastTest(user, true, "vp8", null);

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress VP8 Simulcast Firefox")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressVP8SimulcastFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress VP8 Simulcast Firefox");

		ingressSimulcastTest(user, true, "vp8", null);

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast Chrome")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressH264SimulcastChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress H264 Simulcast Chrome");

		ingressSimulcastTest(user, true, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast Firefox")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressH264SimulcastFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress H264 Simulcast Firefox");

		ingressSimulcastTest(user, true, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast two layers Chrome")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressH264SimulcastTwoLayersChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress H264 Simulcast Chrome");

		ingressSimulcastTest(user, true, null, "H264_540P_25FPS_2_LAYERS");
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testTwoLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast two layers Firefox")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressH264SimulcastTwoLayersFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress H264 Simulcast Firefox");

		ingressSimulcastTest(user, true, null, "H264_540P_25FPS_2_LAYERS");
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testTwoLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress VP8 No Simulcast Chrome")
	void ingressVP8NoSimulcastChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress VP8 No Simulcast Chrome");

		ingressSimulcastTest(user, false, "vp8", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testNoSimulcast(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress VP8 No Simulcast Firefox")
	void ingressVP8NoSimulcastFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress VP8 No Simulcast Firefox");

		ingressSimulcastTest(user, false, "vp8", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testNoSimulcast(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 No Simulcast Chrome")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressH264NoSimulcastChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress H264 No Simulcast Chrome");

		ingressSimulcastTest(user, false, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testNoSimulcast(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 No Simulcast Firefox")
	// TODO: remove tag when not forcing VP8 no-simulcast in ingress with mediasoup
	@OnlyPion
	void ingressH264NoSimulcastFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress H264 No Simulcast Firefox");

		ingressSimulcastTest(user, false, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testNoSimulcast(user, subscriberVideo);
	}

	@Test
	@DisplayName("Custom ingress")
	// TODO: remove tag when not using custom ingress image with mediasoup
	@OnlyMediasoup
	void customIngressTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		// With custom ingress and mediasoup it should force VP8 no simulcast with
		// highest quality layer width, height, framerate and bitrate
		log.info("Custom ingress");

		this.addSubscriber(user, true);
		user.getDriver().findElement(By.className("connect-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);

		// Try publishing H264 with 2 layer simulcast
		createIngress(user, "H264_540P_25FPS_2_LAYERS", null, true, "HTTP", null);

		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));
		int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		// Should receive VP8 960x540 25 fps
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		Assertions.assertEquals(1, getLayersAsJsonArray(user, subscriberVideo).size());
		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);
		JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
		String subscriberCodec = json.get(0).getAsJsonObject().get("codec").getAsString();
		String expectedCodec = "video/VP8";
		Assertions.assertEquals(expectedCodec, subscriberCodec);
		this.waitUntilSubscriberFramesPerSecondIs(user, subscriberVideo, 25);
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
		this.waitUntilSubscriberFrameHeightIs(user, subscriberVideo, 540);

		this.deleteAllIngresses(LK_INGRESS);
		user.getEventManager().waitUntilEventReaches("trackUnpublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("participantDisconnected", "RoomEvent", 1);

		// Try publishing H264 with 3 layer simulcast
		createIngress(user, "H264_1080P_30FPS_3_LAYERS_HIGH_MOTION", null, true, "HTTP", null);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));
		numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		// Should receive VP8 1920x1080 30 fps
		subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		Assertions.assertEquals(1, getLayersAsJsonArray(user, subscriberVideo).size());
		bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);
		json = this.getLayersAsJsonArray(user, subscriberVideo);
		subscriberCodec = json.get(0).getAsJsonObject().get("codec").getAsString();
		expectedCodec = "video/VP8";
		Assertions.assertEquals(expectedCodec, subscriberCodec);
		this.waitUntilSubscriberFramesPerSecondIs(user, subscriberVideo, 30);
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		this.waitUntilSubscriberFrameHeightIs(user, subscriberVideo, 1080);
	}

	@Test
	@DisplayName("RTSP ingress H264 + OPUS")
	void rtspIngressH264_OPUSTest() throws Exception {
		log.info("RTSP ingress H264 + OPUS");
		String rtspUri = startRtspServer("H264", "OPUS");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress H264 + G711")
	void rtspIngressH264_G711Test() throws Exception {
		log.info("RTSP ingress H264 + G711");
		String rtspUri = startRtspServer("H264", "G711");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress H264 + MP3")
	void rtspIngressH264_MP3Test() throws Exception {
		log.info("RTSP ingress H264 + MP3");
		String rtspUri = startRtspServer("H264", "MP3");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress H264 + AAC")
	void rtspIngressH264_AACTest() throws Exception {
		log.info("RTSP ingress H264 + AAC");
		String rtspUri = startRtspServer("H264", "AAC");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP8 + OPUS")
	void rtspIngressVP8_OPUSTest() throws Exception {
		log.info("RTSP ingress VP8 + OPUS");
		String rtspUri = startRtspServer("VP8", "OPUS");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP8 + G711")
	void rtspIngressVP8_G711Test() throws Exception {
		log.info("RTSP ingress VP8 + G711");
		String rtspUri = startRtspServer("VP8", "G711");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP8 + MP3")
	void rtspIngressVP8_MP3Test() throws Exception {
		log.info("RTSP ingress VP8 + MP3");
		String rtspUri = startRtspServer("VP8", "MP3");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP8 + AAC")
	void rtspIngressVP8_AACTest() throws Exception {
		log.info("RTSP ingress VP8 + AAC");
		String rtspUri = startRtspServer("VP8", "AAC");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress MPEG4 + OPUS")
	void rtspIngressMPEG4_OPUSTest() throws Exception {
		log.info("RTSP ingress MPEG4 + OPUS");
		String rtspUri = startRtspServer("MPEG-4", "OPUS");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress MPEG4 + G711")
	void rtspIngressMPEG4_G711Test() throws Exception {
		log.info("RTSP ingress MPEG4 + G711");
		String rtspUri = startRtspServer("MPEG-4", "G711");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress MPEG4 + MP3")
	void rtspIngressMPEG4_MP3Test() throws Exception {
		log.info("RTSP ingress MPEG4 + MP3");
		String rtspUri = startRtspServer("MPEG-4", "MP3");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress MPEG-4 + AAC")
	void rtspIngressMPEG4_AACTest() throws Exception {
		log.info("RTSP ingress MPEG-4 + AAC");
		String rtspUri = startRtspServer("MPEG-4", "AAC");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP9 + OPUS")
	void rtspIngressVP9_OPUSTest() throws Exception {
		log.info("RTSP ingress VP9 + OPUS");
		String rtspUri = startRtspServer("VP9", "OPUS");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP9 + G711")
	void rtspIngressVP9_G711Test() throws Exception {
		log.info("RTSP ingress VP9 + G711");
		String rtspUri = startRtspServer("VP9", "G711");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP9 + MP3")
	void rtspIngressVP9_MP3Test() throws Exception {
		log.info("RTSP ingress VP9 + MP3");
		String rtspUri = startRtspServer("VP9", "MP3");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress VP9 + AAC")
	void rtspIngressVP9_AACTest() throws Exception {
		log.info("RTSP ingress VP9 + AAC");
		String rtspUri = startRtspServer("VP9", "AAC");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress M-JPEG + OPUS")
	void rtspIngressMJPEG_OPUSTest() throws Exception {
		log.info("RTSP ingress M-JPEG + OPUS");
		String rtspUri = startRtspServer("M-JPEG", "OPUS");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress M-JPEG + G711")
	void rtspIngressMJPEG_G711Test() throws Exception {
		log.info("RTSP ingress M-JPEG + G711");
		String rtspUri = startRtspServer("M-JPEG", "G711");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress M-JPEG + MP3")
	void rtspIngressMJPEG_MP3Test() throws Exception {
		log.info("RTSP ingress M-JPEG + MP3");
		String rtspUri = startRtspServer("M-JPEG", "MP3");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress M-JPEG + AAC")
	void rtspIngressMJPEG_AACTest() throws Exception {
		log.info("RTSP ingress M-JPEG + AAC");
		String rtspUri = startRtspServer("M-JPEG", "AAC");
		urPullCommon("RTSP", rtspUri, true, true);
	}

	@Test
	@DisplayName("RTSP ingress H264")
	void rtspIngressH264Test() throws Exception {
		log.info("RTSP ingress H264");
		String rtspUri = startRtspServer("H264", null);
		urPullCommon("RTSP", rtspUri, true, false);
	}

	@Test
	@DisplayName("RTSP ingress VP8")
	void rtspIngressVP8Test() throws Exception {
		log.info("RTSP ingress VP8");
		String rtspUri = startRtspServer("VP8", null);
		urPullCommon("RTSP", rtspUri, true, false);
	}

	@Test
	@DisplayName("RTSP ingress MPEG-4")
	void rtspIngressMPEG4Test() throws Exception {
		log.info("RTSP ingress MPEG-4");
		String rtspUri = startRtspServer("MPEG-4", null);
		urPullCommon("RTSP", rtspUri, true, false);
	}

	@Test
	@DisplayName("RTSP ingress VP9")
	void rtspIngressVP9Test() throws Exception {
		log.info("RTSP ingress VP9");
		String rtspUri = startRtspServer("VP9", null);
		urPullCommon("RTSP", rtspUri, true, false);
	}

	@Test
	@DisplayName("RTSP ingress M-JPEG")
	void rtspIngressMJPEGTest() throws Exception {
		log.info("RTSP ingress M-JPEG");
		String rtspUri = startRtspServer("M-JPEG", null);
		urPullCommon("RTSP", rtspUri, true, false);
	}

	@Test
	@DisplayName("RTSP ingress AAC")
	@Disabled // Audio ingress is flaky, only works if the ingress inmediately connects to the
				// RTSP server
	void rtspIngressAACTest() throws Exception {
		log.info("RTSP ingress AAC");
		String rtspUri = startRtspServer(null, "AAC");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	@Test
	@DisplayName("RTSP ingress MP3")
	@Disabled // Audio ingress is flaky, only works if the ingress inmediately connects to the
				// RTSP server
	void rtspIngressMP3Test() throws Exception {
		log.info("RTSP ingress MP3");
		String rtspUri = startRtspServer(null, "MP3");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	@Test
	@DisplayName("RTSP ingress OPUS")
	@Disabled // Audio ingress is flaky, only works if the ingress inmediately connects to the
				// RTSP server
	void rtspIngressOPUSTest() throws Exception {
		log.info("RTSP ingress OPUS");
		String rtspUri = startRtspServer(null, "OPUS");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	@Test
	@DisplayName("RTSP ingress G711")
	@Disabled // Audio ingress is flaky, only works if the ingress inmediately connects to the
				// RTSP server
	void rtspIngressG711Test() throws Exception {
		log.info("RTSP ingress G711");
		String rtspUri = startRtspServer(null, "G711");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	@Test
	@DisplayName("RTSP ingress AC3")
	@Disabled // AC3 audio codec not supported through RTSP server with a single audio PCMU
				// track
	void rtspIngressAC3Test() throws Exception {
		log.info("RTSP ingress AC3");
		String rtspUri = startRtspServer(null, "AC3");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	/**
	 * NOTE 1: ingress with SRT pull does not work in the local network when ingress
	 * process is a Docker container
	 */
	/**
	 * NOTE 2: ingress SRT seems to support only video codecs H264 and MPEG-4
	 */

//	@Test
//	@DisplayName("SRT ingress H264 + AAC")
//	@Disabled // AAC audio codec stream fails if sent along a video stream
//	void srtIngressTestH264_AAC() throws Exception {
//		log.info("SRT ingress H264 + AAC");
//		String srtUri = startSrtServer("H264", "AAC");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress H264 + AC3")
//	void srtIngressTestH264_AC3() throws Exception {
//		log.info("SRT ingress H264 + AC3");
//		String srtUri = startSrtServer("H264", "AC3");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress H264 + OPUS")
//	void srtIngressTestH264_OPUS() throws Exception {
//		log.info("SRT ingress H264 + OPUS");
//		String srtUri = startSrtServer("H264", "OPUS");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress H264 + MP3")
//	void srtIngressTestH264_MP3() throws Exception {
//		log.info("SRT ingress H264 + MP3");
//		String srtUri = startSrtServer("H264", "MP3");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress MPEG-4 + AAC")
//	@Disabled // AAC audio codec stream fails if sent along a video stream
//	void srtIngressTestMPEG-4_AAC() throws Exception {
//		log.info("SRT ingress MPEG-4 + AAC");
//		String srtUri = startSrtServer("MPEG-4", "AAC");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress MPEG-4 + AC3")
//	void srtIngressTestMPEG-4_AC3() throws Exception {
//		log.info("SRT ingress MPEG-4 + AC3");
//		String srtUri = startSrtServer("MPEG-4", "AC3");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress MPEG-4 + OPUS")
//	void srtIngressTestMPEG-4_OPUS() throws Exception {
//		log.info("SRT ingress MPEG-4 + OPUS");
//		String srtUri = startSrtServer("MPEG-4", "OPUS");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress MPEG-4 + MP3")
//	void srtIngressTestMPEG-4_MP3() throws Exception {
//		log.info("SRT ingress MPEG-4 + MP3");
//		String srtUri = startSrtServer("MPEG-4", "MP3");
//		urPullCommon("SRT", srtUri, true, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress H264")
//	void srtIngressTestH264() throws Exception {
//		log.info("SRT ingress H264");
//		String srtUri = startSrtServer("H264", null);
//		urPullCommon("SRT", srtUri, true, false);
//	}
//
//	@Test
//	@DisplayName("SRT ingress MPEG-4")
//	void srtIngressTestMPEG-4() throws Exception {
//		log.info("SRT ingress MPEG-4");
//		String srtUri = startSrtServer("MPEG-4", null);
//		urPullCommon("SRT", srtUri, true, false);
//	}
//
//	@Test
//	@DisplayName("SRT ingress AAC")
//	void srtIngressTestAAC() throws Exception {
//		log.info("SRT ingress AAC");
//		String srtUri = startSrtServer(null, "AAC");
//		urPullCommon("SRT", srtUri, false, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress AC3")
//	void srtIngressTestAC3() throws Exception {
//		log.info("SRT ingress AC3");
//		String srtUri = startSrtServer(null, "AC3");
//		urPullCommon("SRT", srtUri, false, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress MP3")
//	void srtIngressTestMP3() throws Exception {
//		log.info("SRT ingress MP3");
//		String srtUri = startSrtServer(null, "MP3");
//		urPullCommon("SRT", srtUri, false, true);
//	}
//
//	@Test
//	@DisplayName("SRT ingress OPUS")
//	@Disabled // A single OPUS audio stream fails
//	void srtIngressTestOPUS() throws Exception {
//		log.info("SRT ingress OPUS");
//		String srtUri = startSrtServer(null, "OPUS");
//		urPullCommon("SRT", srtUri, false, true);
//	}

	private void urPullCommon(String urlType, String uri, boolean withVideo, boolean withAudio) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.addSubscriber(user, false);
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
		createIngress(user, null, "VP8", false, urlType, uri);

		if (withVideo && withAudio) {
			user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 2);
		} else {
			user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
		}

		if (withAudio) {
			user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 1));
			final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
			Assertions.assertEquals(1, numberOfAudios, "Wrong number of videos");
			Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("audio", true, false),
					"HTMLAudioElements were expected to have only one audio track");
			if (!withVideo) {
				final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
				Assertions.assertEquals(0, numberOfVideos, "Wrong number of videos");
			}
		}
		if (withVideo) {
			user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));
			final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
			Assertions.assertEquals(1, numberOfVideos, "Wrong number of videos");
			Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
					"HTMLVideoElements were expected to have only one video track");
			if (!withAudio) {
				final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
				Assertions.assertEquals(0, numberOfAudios, "Wrong number of videos");
			}

			WebElement subscriberVideo = user.getDriver()
					.findElement(By.cssSelector("#openvidu-instance-0 video.remote"));

			waitUntilVideoLayersNotEmpty(user, subscriberVideo);
			long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
			this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
			this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);
			JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
			String subscriberCodec = json.get(0).getAsJsonObject().get("codec").getAsString();
			String expectedCodec = "video/VP8";
			Assertions.assertEquals(expectedCodec, subscriberCodec);
		}

		List<IngressInfo> ingresses = LK_INGRESS.listIngress().execute().body();
		Assertions.assertEquals(1, ingresses.size());
		Assertions.assertTrue(ingresses.get(0).getUrl().startsWith(urlType.toLowerCase() + "://"));
		Assertions.assertEquals(IngressState.Status.ENDPOINT_PUBLISHING, ingresses.get(0).getState().getStatus());
	}

	private void ingressSimulcastTest(OpenViduTestappUser user, boolean simulcast, String codec, String preset)
			throws Exception {

		// Only subscriber without adaptive stream
		this.addSubscriber(user, false);
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);

		createIngress(user, preset, codec, simulcast, "HTTP", null);

		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(1, numberOfVideos, "Wrong number of videos");

		Assertions.assertTrue(user.getBrowserUser().assertAllElementsHaveTracks("video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));

		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);

		// Check subscriber's codec
		if (codec != null) {
			JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
			String subscriberCodec = json.get(0).getAsJsonObject().get("codec").getAsString();
			String expectedCodec = "video/" + codec.toUpperCase();
			Assertions.assertEquals(expectedCodec, subscriberCodec);
		}
		if (preset != null) {
			JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
			String subscriberCodec = json.get(0).getAsJsonObject().get("codec").getAsString();
			Assertions.assertEquals("video/H264", subscriberCodec);
		}
	}

	private void testThreeLayers(OpenViduTestappUser user, WebElement subscriberVideo) throws InterruptedException {
		// Check manual simulcast changes
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-LOW")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 640);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-MEDIUM")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1280);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-HIGH")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
	}

	private void testTwoLayers(OpenViduTestappUser user, WebElement subscriberVideo) throws InterruptedException {
		// Check manual simulcast changes
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-LOW")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 480);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-MEDIUM")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-LOW")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 480);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-HIGH")).click();
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
	}

	private void testNoSimulcast(OpenViduTestappUser user, WebElement subscriberVideo) throws InterruptedException {
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("mat-option.mode-LOW")).click();
		// Without simulcast video should remain in high quality
		Thread.sleep(4000);
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
	}

	private int countNumberOfPublishedLayers(OpenViduTestappUser user, WebElement publisherVideo) {
		JsonArray json = this.getLayersAsJsonArray(user, publisherVideo);
		return json.size();
	}

	private int getSubscriberVideoFrameWidth(OpenViduTestappUser user, WebElement subscriberVideo) {
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		this.waitUntilAux(user, subscriberVideo,
				() -> getLayersAsJsonArray(user, subscriberVideo).get(0).getAsJsonObject().get("frameWidth") != null,
				"Timeout waiting for frameWidth to exist");
		JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
		return json.get(0).getAsJsonObject().get("frameWidth").getAsInt();
	}

	private int getSubscriberVideoFrameHeight(OpenViduTestappUser user, WebElement subscriberVideo) {
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		this.waitUntilAux(user, subscriberVideo,
				() -> getLayersAsJsonArray(user, subscriberVideo).get(0).getAsJsonObject().get("frameHeight") != null,
				"Timeout waiting for frameHeight to exist");
		JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
		return json.get(0).getAsJsonObject().get("frameHeight").getAsInt();
	}

	private long getSubscriberVideoBytesReceived(OpenViduTestappUser user, WebElement subscriberVideo) {
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		this.waitUntilAux(user, subscriberVideo,
				() -> getLayersAsJsonArray(user, subscriberVideo).get(0).getAsJsonObject().get("bytesReceived") != null,
				"Timeout waiting for bytesReceived to exist");
		JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
		return json.get(0).getAsJsonObject().get("bytesReceived").getAsLong();
	}

	private int getSubscriberVideoFramesPerSecond(OpenViduTestappUser user, WebElement subscriberVideo) {
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		this.waitUntilAux(user, subscriberVideo, () -> getLayersAsJsonArray(user, subscriberVideo).get(0)
				.getAsJsonObject().get("framesPerSecond") != null, "Timeout waiting for framesPerSecond to exist");
		JsonArray json = this.getLayersAsJsonArray(user, subscriberVideo);
		return json.get(0).getAsJsonObject().get("framesPerSecond").getAsInt();
	}

	// If rid is null, retrieve the first layer
	private JsonElement getPublisherVideoLayerAttribute(OpenViduTestappUser user, WebElement publisherVideo, String rid,
			String attribute) {
		JsonArray json = this.getLayersAsJsonArray(user, publisherVideo);
		JsonElement result;
		if (rid != null) {
			result = json.asList().stream().parallel()
					.filter(jsonElement -> rid.equals(jsonElement.getAsJsonObject().get("rid").getAsString())).findAny()
					.get();
		} else {
			result = json.get(0);
		}
		return result.getAsJsonObject().get(attribute);
	}

	private String getLayersAsString(OpenViduTestappUser user, WebElement video) {
		this.openInfoDialog(user, video);
		user.getDriver().findElement(By.cssSelector("#update-value-btn")).click();
		WebElement textarea = user.getDriver().findElement(By.id("info-text-area"));
		return textarea.getAttribute("value");
	}

	private JsonArray getLayersAsJsonArray(OpenViduTestappUser user, WebElement video) {
		String value = getLayersAsString(user, video);
		return JsonParser.parseString(value).getAsJsonArray();
	}

	private void waitUntilVideoLayersNotEmpty(OpenViduTestappUser user, WebElement videoElement) {
		this.waitUntilAux(user, videoElement,
				() -> !getLayersAsString(user, videoElement).isBlank()
						&& !getLayersAsJsonArray(user, videoElement).isEmpty(),
				"Timeout waiting video layers to not be empty");
	}

	private void waitUntilSubscriberFramesPerSecondNotZero(OpenViduTestappUser user, WebElement videoElement) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getSubscriberVideoFramesPerSecond(user, videoElement) > 0;
		}, "Timeout waiting for video track to have a framesPerSecond greater than 0");
	}

	private void waitUntilSubscriberFramesPerSecondIs(OpenViduTestappUser user, WebElement videoElement, int fps) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getSubscriberVideoFramesPerSecond(user, videoElement) == fps;
		}, "Timeout waiting for video track to have a framesPerSecond equal to " + fps);
	}

	private void waitUntilSubscriberFrameWidthIs(OpenViduTestappUser user, WebElement videoElement,
			final int expectedFrameWidth) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getSubscriberVideoFrameWidth(user, videoElement) == expectedFrameWidth;
		}, "Timeout waiting for video track to have a frameWidth of " + expectedFrameWidth);
	}

	private void waitUntilSubscriberFrameHeightIs(OpenViduTestappUser user, WebElement videoElement,
			final int expectedFrameHeight) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getSubscriberVideoFrameHeight(user, videoElement) == expectedFrameHeight;
		}, "Timeout waiting for video track to have a frameHeight of " + expectedFrameHeight);
	}

	private void waitUntilSubscriberFrameWidthChanges(OpenViduTestappUser user, WebElement videoElement,
			final int oldFrameWidth, final boolean shouldBeHigher) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getSubscriberVideoFrameWidth(user, videoElement) != oldFrameWidth;
		}, "Timeout waiting for video track to reach a " + (shouldBeHigher ? "higher" : "lower") + " resolution");
		int newFrameWidth = this.getSubscriberVideoFrameWidth(user, videoElement);
		if (shouldBeHigher) {
			Assertions.assertTrue(newFrameWidth > oldFrameWidth,
					"Video track should have now a higher resolution, but it is not. Old width: " + oldFrameWidth
							+ ". New width: " + newFrameWidth);
		} else {
			Assertions.assertTrue(newFrameWidth < oldFrameWidth,
					"Video track should have now a lower resolution, but it is not. Old width: " + oldFrameWidth
							+ ". New width: " + newFrameWidth);
		}
	}

	private void waitUntilSubscriberBytesReceivedIncrease(OpenViduTestappUser user, WebElement videoElement,
			final long previousBytesReceived) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getSubscriberVideoBytesReceived(user, videoElement) > previousBytesReceived;
		}, "Timeout waiting for subscriber track to increase its bytesReceived from " + previousBytesReceived);
	}

	private void waitUntilPublisherBytesSentIncrease(OpenViduTestappUser user, WebElement videoElement, String rid,
			final long previousBytesSent) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getPublisherVideoLayerAttribute(user, videoElement, rid, "bytesSent")
					.getAsLong() > previousBytesSent;
		}, "Timeout waiting for publisher track to increase its bytesSent from " + previousBytesSent);
	}

	private void waitUntilPublisherLayerActive(OpenViduTestappUser user, final WebElement publisherVideo,
			final String rid, final boolean active) {
		this.waitUntilAux(user, publisherVideo, () -> {
			boolean currentlyActive = this.getPublisherVideoLayerAttribute(user, publisherVideo, rid, "active")
					.getAsBoolean();
			if (active) {
				JsonElement frameWidth = this.getPublisherVideoLayerAttribute(user, publisherVideo, rid, "frameWidth");
				return currentlyActive && frameWidth != null;
			} else {
				return !currentlyActive;
			}
		}, "Timeout waiting for video track layer to be " + (active ? "active" : "inactive"));
	}

	private void waitUntilAux(OpenViduTestappUser user, WebElement videoElement,
			Callable<Boolean> breakFromLoopFunction, String errMsg) {
		try {
			final int maxWaitMillis = 6000;
			final int intervalWait = 250;
			final int MAX_ITERATIONS = maxWaitMillis / intervalWait;
			int iteration = 0;
			boolean breakFromLoop = false;
			while (!breakFromLoop && iteration < MAX_ITERATIONS) {
				iteration++;
				try {
					breakFromLoop = breakFromLoopFunction.call();
				} catch (Exception e1) {
					e1.printStackTrace();
				}
				if (breakFromLoop) {
					break;
				} else {
					try {
						Thread.sleep(intervalWait);
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
				}
			}
			if (!breakFromLoop) {
				Assertions.fail(errMsg);
			}
		} finally {
			// Close dialog
			user.getWaiter().until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("#close-dialog-btn")));
			this.waitForBackdropAndClick(user, "#close-dialog-btn");
			try {
				Thread.sleep(500);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}

	private void openInfoDialog(OpenViduTestappUser user, WebElement video) {
		String videoId = video.getDomProperty("id");
		// Open the track info dialog if required
		if (!user.getDriver().findElements(By.cssSelector("app-info-dialog")).isEmpty()) {
			// Dialog already opened
			if (!user.getDriver().findElement(By.cssSelector("#subtitle")).getText().equals(videoId)) {
				// Wrong dialog
				this.waitForBackdropAndClick(user, "#close-dialog-btn");
				user.getDriver().findElement(By.cssSelector("#" + videoId + " ~ .bottom-div .video-track-info"))
						.click();
			}
		} else {
			// Dialog is not opened
			user.getDriver().findElement(By.cssSelector("#" + videoId + " ~ .bottom-div .video-track-info")).click();
		}
		try {
			Thread.sleep(300);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
	}

	private void addPublisherSubscriber(OpenViduTestappUser user, boolean hasAudio, boolean hasVideo)
			throws InterruptedException {
		this.addPublisher(user, true, true, true, true, hasAudio, hasVideo, null, null, null);
	}

	private void addOnlyPublisherVideo(OpenViduTestappUser user, boolean simulcast, boolean dynacast, boolean hd)
			throws InterruptedException {
		if (hd) {
			this.addPublisher(user, false, simulcast, dynacast, false, false, true, 1920, 1080, "L1T3");
		} else {
			this.addPublisher(user, false, simulcast, dynacast, false, false, true, null, null, null);
		}
	}

	private void addOnlyPublisherAudio(OpenViduTestappUser user) throws InterruptedException {
		this.addPublisher(user, false, false, false, false, true, false, null, null, null);
	}

	private void addPublisher(OpenViduTestappUser user, boolean isSubscriber, boolean simulcast, boolean dynacast,
			boolean adaptiveStream, boolean hasAudio, boolean hasVideo, Integer width, Integer height,
			String scalabilityMode) throws InterruptedException {
		if (!user.getDriver().findElements(By.id("close-dialog-btn")).isEmpty()) {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}
		user.getDriver().findElement(By.id("add-user-btn")).click();
		int numberOfUser = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size() - 1;
		if (!isSubscriber) {
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + numberOfUser + " .subscriber-checkbox"))
					.click();
		}
		user.getDriver().findElement(By.id("room-options-btn-" + numberOfUser)).click();
		Thread.sleep(300);
		if (!hasAudio) {
			user.getDriver().findElement(By.id("audio-capture-false")).click();
		} else {
			user.getDriver().findElement(By.id("audio-capture-true")).click();
		}
		if (!hasVideo) {
			user.getDriver().findElement(By.id("video-capture-false")).click();
		} else {
			user.getDriver().findElement(By.id("video-capture-true")).click();
			if (width != null || height != null || scalabilityMode != null) {
				this.setPublisherCustomVideoProperties(user, 1920, 1080, "L1T3");
			}
		}
		if (!simulcast) {
			user.getDriver().findElement(By.id("trackPublish-simulcast")).click();
		}
		if (!dynacast) {
			user.getDriver().findElement(By.id("room-dynacast")).click();
		}
		if (!adaptiveStream) {
			user.getDriver().findElement(By.id("room-adaptiveStream")).click();
		}
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);
	}

	private void addSubscriber(OpenViduTestappUser user, boolean adaptiveStream) throws InterruptedException {
		if (!user.getDriver().findElements(By.id("close-dialog-btn")).isEmpty()) {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}
		user.getDriver().findElement(By.id("add-user-btn")).click();
		int numberOfUser = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size() - 1;
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + numberOfUser + " .publisher-checkbox"))
				.click();
		if (!adaptiveStream) {
			user.getDriver().findElement(By.id("room-options-btn-" + numberOfUser)).click();
			Thread.sleep(300);
			user.getDriver().findElement(By.id("room-adaptiveStream")).click();
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}
	}

	private void createIngress(OpenViduTestappUser user, String preset, String codec, boolean simulcast, String urlType,
			String urlUri) throws InterruptedException {
		if (!user.getDriver().findElements(By.id("close-dialog-btn")).isEmpty()) {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}
		user.getDriver().findElement(By.xpath("//button[contains(@title,'Room API')]")).click();
		if (preset != null) {
			this.waitForBackdropAndClick(user, "#ingress-preset-select");
			Thread.sleep(300);
			user.getDriver().findElement(By.cssSelector("#mat-option-" + preset.toUpperCase())).click();
		} else {
			if (!simulcast) {
				user.getDriver().findElement(By.cssSelector("#ingress-simulcast")).click();
				Thread.sleep(300);
			}
			this.waitForBackdropAndClick(user, "#ingress-video-codec-select");
			Thread.sleep(300);
			user.getDriver().findElement(By.cssSelector("#mat-option-" + codec.toUpperCase())).click();
		}
		if (urlType != null) {
			this.waitForBackdropAndClick(user, "#ingress-url-type-select");
			Thread.sleep(300);
			user.getDriver().findElement(By.cssSelector("#mat-option-" + urlType.toUpperCase())).click();
		}
		if (urlUri != null) {
			user.getDriver().findElement(By.cssSelector("#ingress-url-uri-field")).sendKeys(urlUri);
			Thread.sleep(300);
		}
		user.getDriver().findElement(By.cssSelector("#create-ingress-api-btn")).click();
		this.waitForBackdropAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);
	}

	private void setPublisherCustomVideoProperties(OpenViduTestappUser user, Integer width, Integer height,
			String scalabilityMode) {
		user.getDriver().findElement(By.id("video-capture-custom")).click();
		if (width != null) {
			WebElement trackWidth = user.getDriver().findElement(By.id("resolution-video-capture-options-width"));
			trackWidth.clear();
			trackWidth.sendKeys(width.toString());
		}
		if (height != null) {
			WebElement trackHeight = user.getDriver().findElement(By.id("resolution-video-capture-options-height"));
			trackHeight.clear();
			trackHeight.sendKeys(height.toString());
		}
		if (scalabilityMode != null) {
			user.getDriver().findElement(By.id("trackPublish-scalabilityMode")).click();
			user.getDriver().findElement(By.className("mode-" + scalabilityMode)).click();
		}
	}

	/**
	 * Waits for any Material Design backdrop overlays to disappear and then clicks the element.
	 * This prevents ElementClickInterceptedException caused by overlay backdrops.
	 */
	private void waitForBackdropAndClick(OpenViduTestappUser user, String cssSelector) {
		WebDriverWait wait = new WebDriverWait(user.getDriver(), Duration.ofSeconds(10));
		
		// Wait for any existing backdrop to disappear - try multiple selectors
		try {
			wait.until(ExpectedConditions.invisibilityOfElementLocated(
				By.cssSelector(".cdk-overlay-backdrop")));
		} catch (Exception e) {
			// Backdrop might not exist, continue
		}
		
		// Additional wait for transparent backdrops specifically
		try {
			wait.until(ExpectedConditions.invisibilityOfElementLocated(
				By.cssSelector(".cdk-overlay-transparent-backdrop")));
		} catch (Exception e) {
			// Backdrop might not exist, continue
		}
		
		// Additional wait for showing backdrops
		try {
			wait.until(ExpectedConditions.invisibilityOfElementLocated(
				By.cssSelector(".cdk-overlay-backdrop-showing")));
		} catch (Exception e) {
			// Backdrop might not exist, continue
		}
		
		// Small additional wait to ensure animations complete
		try {
			Thread.sleep(100);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		
		// Wait for the element to be clickable
		WebElement element = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector(cssSelector)));
		element.click();
	}

}
