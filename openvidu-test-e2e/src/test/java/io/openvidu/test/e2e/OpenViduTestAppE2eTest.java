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

import io.openvidu.test.e2e.annotations.OnlyMediasoup;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
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
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.common.collect.ImmutableList;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.minio.BucketExistsArgs;
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
import livekit.LivekitIngress.IngressInfo;
import livekit.LivekitIngress.IngressState;
import livekit.LivekitModels.ConnectionQuality;

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
		CompletableFuture.runAsync(() -> {
			try {
				NetworkConditioner.pullImages();
			} catch (Exception e) {
				System.err.println("Download of images failed: " + e.getMessage());
			}
		});
		CompletableFuture.runAsync(OpenViduTestAppE2eTest::pullRemoteBrowserImages);
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
		user.getEventManager().waitUntilEventReaches("participantActive", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("active", "ParticipantEvent", 3);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscriptionStatusChanged", "RoomEvent", 8);
		user.getEventManager().waitUntilEventReaches("trackSubscriptionStatusChanged", "ParticipantEvent", 8);
		user.getEventManager().waitUntilEventReaches("visibilityChanged", "TrackEvent", 2);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 4));
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 4));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertEquals(4, numberOfAudios, "Wrong number of audios");

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions.assertTrue(assertAllElementsHaveTracks(user, "audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");
		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Signal Reliable DataChannel")
	void signalReliableTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		log.info("Signal Reliable DataChannel");
		signalReliableLossyAux(user, true);
	}

	@Test
	@DisplayName("Signal Lossy DataChannel")
	void signalLossyTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		log.info("Signal Lossy DataChannel");
		signalReliableLossyAux(user, false);
	}

	private void signalReliableLossyAux(OpenViduTestappUser user, boolean reliable) throws Exception {
		final int expectedKind = reliable ? 0 : 1; // DataPacket_Kind: RELIABLE=0, LOSSY=1
		final String expectedKindStr = reliable ? "RELIABLE" : "LOSSY";
		final String btnClass = reliable ? ".message-reliable-btn" : ".message-lossy-btn";

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
		user.getEventManager().waitUntilEventReaches("participantActive", "RoomEvent", 1);

		Collection<Entry<String, String>> assertions = new ArrayList<>();
		List<Integer> kindAssertions = Collections.synchronizedList(new ArrayList<>());

		// Broadcast from TestParticipant0
		final CountDownLatch broadcastLatch0 = new CountDownLatch(2);

		user.getEventManager().on(1, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant0 to all room (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			broadcastLatch0.countDown();
		});
		user.getEventManager().on(1, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant0 to all room (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			broadcastLatch0.countDown();
		});

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 " + btnClass)).click();
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "ParticipantEvent", 1);
		// Do not trigger own signals
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-ParticipantEvent").get());

		if (!broadcastLatch0.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for broadcast signal event from TestParticipant0");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));
		kindAssertions.forEach(
				kind -> Assertions.assertEquals(expectedKind, kind, "Expected DataPacket_Kind " + expectedKind));
		user.getEventManager().off(1, "dataReceived", "RoomEvent");
		user.getEventManager().off(1, "dataReceived", "ParticipantEvent");
		assertions.clear();
		kindAssertions.clear();
		user.getEventManager().clearAllCurrentEvents();

		// Broadcast from TestParticipant1
		final CountDownLatch broadcastLatch1 = new CountDownLatch(2);

		user.getEventManager().on(0, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant1 to all room (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			broadcastLatch1.countDown();
		});
		user.getEventManager().on(0, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant1 to all room (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			broadcastLatch1.countDown();
		});
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 " + btnClass)).click();
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "ParticipantEvent", 1);
		// Do not trigger own signals
		Assertions.assertEquals(1, user.getEventManager().getNumEvents(0, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(1, user.getEventManager().getNumEvents(0, "dataReceived-ParticipantEvent").get());

		if (!broadcastLatch1.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for broadcast signal event from TestParticipant1");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));
		kindAssertions.forEach(
				kind -> Assertions.assertEquals(expectedKind, kind, "Expected DataPacket_Kind " + expectedKind));
		user.getEventManager().off(0, "dataReceived", "RoomEvent");
		user.getEventManager().off(0, "dataReceived", "ParticipantEvent");
		assertions.clear();
		kindAssertions.clear();
		user.getEventManager().clearAllCurrentEvents();

		// Signal specific participant

		// Signal from TestParticipant0 to TestParticipant1
		final CountDownLatch directLatch0 = new CountDownLatch(2);

		user.getEventManager().on(1, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant0 to TestParticipant1 (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			directLatch0.countDown();
		});
		user.getEventManager().on(1, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant0 to TestParticipant1 (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			directLatch0.countDown();
		});
		user.getDriver()
				.findElement(
						By.cssSelector("#openvidu-instance-0 app-participant.remote-participant " + btnClass))
				.click();
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "dataReceived", "ParticipantEvent", 1);
		// Do not trigger own signals
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataReceived-ParticipantEvent").get());

		if (!directLatch0.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for direct signal event from TestParticipant0");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));
		kindAssertions.forEach(
				kind -> Assertions.assertEquals(expectedKind, kind, "Expected DataPacket_Kind " + expectedKind));
		user.getEventManager().off(1, "dataReceived", "RoomEvent");
		user.getEventManager().off(1, "dataReceived", "ParticipantEvent");
		assertions.clear();
		kindAssertions.clear();
		user.getEventManager().clearAllCurrentEvents();

		// Signal from TestParticipant1 to TestParticipant0
		final CountDownLatch directLatch1 = new CountDownLatch(2);

		user.getEventManager().on(0, "dataReceived", "RoomEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant1 to TestParticipant0 (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			directLatch1.countDown();
		});
		user.getEventManager().on(0, "dataReceived", "ParticipantEvent", json -> {
			assertions.add(new AbstractMap.SimpleEntry<>(
					"Message from TestParticipant1 to TestParticipant0 (kind: " + expectedKindStr + ")",
					json.getAsJsonObject().get("eventDescription").getAsString()));
			kindAssertions.add(json.getAsJsonObject().get("eventContent").getAsJsonObject().get("kind").getAsInt());
			directLatch1.countDown();
		});
		user.getDriver()
				.findElement(
						By.cssSelector("#openvidu-instance-1 app-participant.remote-participant " + btnClass))
				.click();
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "dataReceived", "ParticipantEvent", 1);
		// Do not trigger own signals
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(1, "dataReceived-RoomEvent").get());
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(1, "dataReceived-ParticipantEvent").get());

		if (!directLatch1.await(3, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for direct signal event from TestParticipant1");
		}
		assertions.forEach(assertion -> Assertions.assertEquals(assertion.getKey(), assertion.getValue()));
		kindAssertions.forEach(
				kind -> Assertions.assertEquals(expectedKind, kind, "Expected DataPacket_Kind " + expectedKind));

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("ConnectionQualityChanged")
	void connectionQualityChangedTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("ConnectionQualityChanged");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("connectionQualityChanged", "ParticipantEvent", 4);

		// Expect the connection quality events to include as text content: "excellent"
		user.getDriver().findElements(By.cssSelector(".connectionQualityChanged-TestParticipant0 .event-content"))
				.forEach(el -> Assertions.assertTrue(el.getText().contains("excellent"),
						"Expected connection quality to be excellent"));
		user.getDriver().findElements(By.cssSelector(".connectionQualityChanged-TestParticipant1 .event-content"))
				.forEach(el -> Assertions.assertTrue(el.getText().contains("excellent"),
						"Expected connection quality to be excellent"));

		gracefullyLeaveParticipants(user, 2);
	}

	private List<WebElement> getConnectionQualityEventContents(OpenViduTestappUser user, int numberOfUser,
			String participantName) {
		String xpath = "//*[@id='openvidu-instance-" + numberOfUser
				+ "']//mat-expansion-panel[.//mat-expansion-panel-header[contains(@class,'connectionQualityChanged-"
				+ participantName + "')]]//div[contains(@class,'event-content')]";
		return user.getDriver().findElements(By.xpath(xpath));
	}

	// Latest connection-quality level currently reported for a participant, or null
	// if none yet.
	private ConnectionQuality latestConnectionQuality(OpenViduTestappUser user, int numberOfUser,
			String participantName) {
		List<WebElement> contents = getConnectionQualityEventContents(user, numberOfUser, participantName);
		for (int i = contents.size() - 1; i >= 0; i--) {
			String text = contents.get(i).getAttribute("textContent");
			if (text == null) {
				continue;
			}
			text = text.toLowerCase().trim();
			if (text.contains("excellent")) {
				return ConnectionQuality.EXCELLENT;
			}
			if (text.contains("good")) {
				return ConnectionQuality.GOOD;
			}
			if (text.contains("poor")) {
				return ConnectionQuality.POOR;
			}
			if (text.contains("lost")) {
				return ConnectionQuality.LOST;
			}
		}
		return null;
	}

	// First loss% (ascending) at which the recorded quality equals `level`, or -1
	// if never reached.
	private static int firstLossReaching(Map<Integer, ConnectionQuality> observed, ConnectionQuality level) {
		for (Entry<Integer, ConnectionQuality> e : observed.entrySet()) {
			if (e.getValue() == level) {
				return e.getKey();
			}
		}
		return -1;
	}

	// Render the ramp results (publisher vs subscriber-self quality per loss step)
	// + the band transitions as a single log table.
	private static String buildRampResultTable(Map<Integer, ConnectionQuality> publisher,
			Map<Integer, ConnectionQuality> subscriber) {
		StringBuilder sb = new StringBuilder("\nConnectionQuality ramp-up results\n");
		sb.append("  loss% | PunchbagUser (publisher) | RegularUser (subscriber, self)\n");
		sb.append("  ------+--------------------------+-------------------------------\n");
		ConnectionQuality prev = null;
		for (Entry<Integer, ConnectionQuality> e : publisher.entrySet()) {
			int pct = e.getKey();
			ConnectionQuality pub = e.getValue();
			ConnectionQuality sub = subscriber.get(pct);
			String transition = (prev != null && pub != prev) ? "   <- " + prev + " -> " + pub : "";
			sb.append(String.format("  %4d%% | %-24s | %-30s%s%n", pct, String.valueOf(pub), String.valueOf(sub),
					transition));
			prev = pub;
		}
		sb.append("  transitions: EXCELLENT->GOOD @").append(firstLossReaching(publisher, ConnectionQuality.GOOD))
				.append("%, GOOD->POOR @").append(firstLossReaching(publisher, ConnectionQuality.POOR))
				.append("%, POOR->LOST @").append(firstLossReaching(publisher, ConnectionQuality.LOST)).append("%");
		return sb.toString();
	}

	private void assertConnectionQualityNeverDegraded(OpenViduTestappUser user, int numberOfUser,
			String participantName) {
		List<WebElement> contents = getConnectionQualityEventContents(user, numberOfUser, participantName);
		Assertions.assertFalse(contents.isEmpty(), "Expected at least one connectionQualityChanged event for "
				+ participantName + " in openvidu-instance-" + numberOfUser);
		String latest = null;
		for (WebElement el : contents) {
			String quality = el.getAttribute("textContent");
			if (quality == null) {
				continue;
			}
			quality = quality.toLowerCase().trim();
			if (quality.isEmpty()) {
				continue;
			}
			Assertions.assertFalse(quality.contains("poor") || quality.contains("lost"),
					"Connection quality for " + participantName + " (openvidu-instance-" + numberOfUser
							+ ") must never be POOR or LOST under server-side-only conditions, but observed: '"
							+ quality
							+ "'");
			latest = quality;
		}
		Assertions.assertNotNull(latest,
				"No connection quality value found for " + participantName + " in openvidu-instance-" + numberOfUser);
		Assertions.assertTrue(latest.contains("excellent"),
				"Connection quality for " + participantName + " (openvidu-instance-" + numberOfUser
						+ ") should settle on EXCELLENT, but the latest value was: '" + latest + "'");
	}

	@Test
	@DisplayName("ConnectionQuality EXCELLENT with many published and subscribed tracks")
	void connectionQualityManyTracksAlwaysExcellentTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("ConnectionQuality EXCELLENT with many published and subscribed tracks");

		final int N = 3;
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		WebElement nInput = user.getDriver().findElement(By.id("one2many-input"));
		nInput.clear();
		nInput.sendKeys(String.valueOf(N));
		user.getDriver().findElement(By.id("one2one-btn")).click();

		// N participants, each publishing audio+video and subscribing to all others
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", N);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2 * N);
		user.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", N);

		// Let quality settle and give any (wrong) degradation time to surface
		Thread.sleep(CONNECTION_QUALITY_OBSERVATION_MS);

		for (int i = 0; i < N; i++) {
			assertConnectionQualityNeverDegraded(user, i, "TestParticipant" + i);
		}

		gracefullyLeaveParticipants(user, N);
	}

	@Test
	@DisplayName("ConnectionQuality EXCELLENT when publisher pauses a track")
	void connectionQualityPublisherPauseAlwaysExcellentTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("ConnectionQuality EXCELLENT when publisher pauses a track");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 2);

		// Publisher (instance 0) pauses (mutes) its video track -> the scorer heals to
		// EXCELLENT (mute -> cMaxScore), so quality must not degrade.
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .mute-unmute-video")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("trackMuted", "RoomEvent", 2);

		Thread.sleep(CONNECTION_QUALITY_OBSERVATION_MS);

		assertConnectionQualityNeverDegraded(user, 0, "TestParticipant0");
		assertConnectionQualityNeverDegraded(user, 1, "TestParticipant1");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("ConnectionQuality EXCELLENT when subscriber pauses a track")
	void connectionQualitySubscriberPauseAlwaysExcellentTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("ConnectionQuality EXCELLENT when subscriber pauses a track");

		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 2);

		// Subscriber (instance 1) disables playback of the subscribed video track ->
		// the
		// DownTrack forwarder is muted and the downstream scorer heals to EXCELLENT.
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-enabled")).sendKeys(Keys.ENTER);

		Thread.sleep(CONNECTION_QUALITY_OBSERVATION_MS);

		assertConnectionQualityNeverDegraded(user, 0, "TestParticipant0");
		assertConnectionQualityNeverDegraded(user, 1, "TestParticipant1");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("ConnectionQuality EXCELLENT when Dynacast pauses an unsubscribed track")
	void connectionQualityDynacastPauseAlwaysExcellentTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("ConnectionQuality EXCELLENT when Dynacast pauses an unsubscribed track");

		// Instance 0: video-only publisher with Dynacast + simulcast enabled.
		this.addPublisher(user, false, true, true, false, false, true, null, null, null);
		// Instance 1: subscriber only.
		this.addSubscriber(user, true);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 1);

		// Subscriber unsubscribes from the only track -> the publisher's track becomes
		// fully unwatched -> Dynacast pauses it -> the publisher stops sending and the
		// mediasoup Producer score would decay to 0. Connection quality MUST stay
		// EXCELLENT, NOT drop to POOR/LOST.
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-subscribed"))
				.sendKeys(Keys.ENTER);

		// Generous wait: Dynacast pause delay + producer inactivity (~1.5s) + EMA +
		// room ticks
		Thread.sleep(CONNECTION_QUALITY_OBSERVATION_MS + 10000);

		assertConnectionQualityNeverDegraded(user, 0, "TestParticipant0");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("ConnectionQuality EXCELLENT when Adaptive Stream pauses a track")
	void connectionQualityAdaptiveStreamPauseAlwaysExcellentTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("ConnectionQuality EXCELLENT when Adaptive Stream pauses a track");

		// one2one publishes audio+video with Adaptive Stream enabled (testapp default).
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 4);
		user.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 2);

		// Hide the remote video elements so Adaptive Stream pauses those subscriptions
		// (Adaptive Stream pauses tracks whose <video> element is not visible). Whether
		// or not the auto-pause triggers in headless, the quality must remain
		// EXCELLENT.
		((JavascriptExecutor) user.getDriver()).executeScript(
				"document.querySelectorAll('video.remote').forEach(v => v.style.display = 'none');");

		Thread.sleep(CONNECTION_QUALITY_OBSERVATION_MS);

		assertConnectionQualityNeverDegraded(user, 0, "TestParticipant0");
		assertConnectionQualityNeverDegraded(user, 1, "TestParticipant1");

		gracefullyLeaveParticipants(user, 2);
	}

	private void waitUntilConnectionQuality(OpenViduTestappUser user, int numberOfUser, String participantName,
			java.util.function.Predicate<String> matcher, int timeoutSeconds, String errMsg)
			throws InterruptedException {
		long start = System.currentTimeMillis();
		String latest = "<none>";
		while (System.currentTimeMillis() - start < timeoutSeconds * 1000L) {
			List<WebElement> contents = getConnectionQualityEventContents(user, numberOfUser, participantName);
			if (!contents.isEmpty()) {
				String text = contents.get(contents.size() - 1).getAttribute("textContent");
				if (text != null) {
					latest = text.toLowerCase().trim();
					if (matcher.test(latest)) {
						return;
					}
				}
			}
			Thread.sleep(1000);
		}
		Assertions.fail(errMsg + " (latest observed for " + participantName + ": '" + latest + "')");
	}

	/**
	 * Wait until a participant's connection quality SETTLES — no new
	 * connectionQualityChanged level-change event for
	 * {@link #CONNECTION_QUALITY_STABLE_MS} — and then assert the settled (latest)
	 * level is {@code expectedLevel} (LiveKit's {@link ConnectionQuality}).
	 *
	 * Unlike {@link #waitUntilConnectionQuality}, which returns the instant a level
	 * is merely OBSERVED, this checks the LAST event, so a transient pass-through
	 * (e.g. EXCELLENT -> GOOD -> POOR) is NOT mistaken for "settled at GOOD", and a
	 * quality that never degrades (stays EXCELLENT) is not mistaken either. Fails
	 * if it settles at a different level or never settles within
	 * {@code timeoutSeconds}.
	 */
	private void assertConnectionQualitySettlesAt(OpenViduTestappUser user, int numberOfUser, String participantName,
			ConnectionQuality expectedLevel, int timeoutSeconds, String errMsg)
			throws InterruptedException {
		long start = System.currentTimeMillis();
		String settledLevel = null;
		long stableSince = start;
		while (System.currentTimeMillis() - start < timeoutSeconds * 1000L) {
			List<WebElement> contents = getConnectionQualityEventContents(user, numberOfUser, participantName);
			String current = null;
			if (!contents.isEmpty()) {
				String text = contents.get(contents.size() - 1).getAttribute("textContent");
				if (text != null && !text.isBlank()) {
					current = text.toLowerCase().trim();
				}
			}
			if (current != null) {
				if (!current.equals(settledLevel)) {
					// A new (different) latest level resets the stabilization timer.
					settledLevel = current;
					stableSince = System.currentTimeMillis();
				} else if (System.currentTimeMillis() - stableSince >= CONNECTION_QUALITY_STABLE_MS) {
					Assertions.assertTrue(settledLevel.contains(expectedLevel.name().toLowerCase()),
							errMsg + " (connection quality for " + participantName + " settled at '" + settledLevel
									+ "', expected " + expectedLevel + ")");
					return;
				}
			}
			Thread.sleep(500);
		}
		Assertions.fail(errMsg + " (connection quality for " + participantName + " did not settle within "
				+ timeoutSeconds + "s; latest observed: '" + settledLevel + "')");
	}

	/** A task that may throw a checked exception, for {@link #runInParallel}. */
	@FunctionalInterface
	private interface ThrowingRunnable {
		void run() throws Exception;
	}

	/**
	 * Run the given tasks concurrently (one thread each), wait for all to finish,
	 * then propagate the first failure — AssertionError or any exception — to the
	 * caller's thread, so assertions inside the tasks actually fail the test (an
	 * AssertionError thrown in a worker thread would otherwise be lost). Every
	 * failure is logged and the ones after the first travel as suppressed
	 * exceptions of the propagated one, so no browser's error is masked by
	 * another's. Each task MUST drive a distinct WebDriver, since a Selenium driver
	 * is not thread-safe.
	 */
	private void runInParallel(ThrowingRunnable... tasks) throws Exception {
		ExecutorService executor = Executors.newFixedThreadPool(tasks.length);
		try {
			List<Callable<Void>> callables = new ArrayList<>();
			for (ThrowingRunnable task : tasks) {
				callables.add(() -> {
					task.run();
					return null;
				});
			}
			List<Throwable> failures = new ArrayList<>();
			int index = 0;
			for (Future<Void> future : executor.invokeAll(callables)) {
				index++;
				try {
					future.get();
				} catch (ExecutionException e) {
					Throwable cause = e.getCause() != null ? e.getCause() : e;
					log.error("Parallel task {} of {} failed", index, tasks.length, cause);
					failures.add(cause);
				}
			}
			if (!failures.isEmpty()) {
				Throwable cause = failures.get(0);
				for (int i = 1; i < failures.size(); i++) {
					cause.addSuppressed(failures.get(i));
				}
				if (cause instanceof Error) {
					throw (Error) cause;
				}
				if (cause instanceof Exception) {
					throw (Exception) cause;
				}
				throw new RuntimeException(cause);
			}
		} finally {
			executor.shutdownNow();
		}
	}

	private String getLivekitWssUrlFromReadyCheckContainer() {
		String logs = commandLine.executeCommand("docker logs ready-check 2>&1", 30);
		if (logs != null && !logs.isBlank()) {

			/*-----------------LiveKit Server API-----------------
				- Access from this machine:
					- http://localhost:7880
					- ws://localhost:7880
				- Access from other devices in your LAN:
					- https://10-10-1-203.openvidu-local.dev:7443
					- wss://10-10-1-203.openvidu-local.dev:7443   <-- We want this value
				- Credentials:
					- API Key: devkey
					- API Secret: secret
			----------------------------------------------------*/

			java.util.regex.Matcher m = java.util.regex.Pattern
					.compile(
							"LiveKit Server API.*?Access from other devices in your LAN.*?(wss://[A-Za-z0-9.\\-]+:\\d+)",
							java.util.regex.Pattern.DOTALL)
					.matcher(logs);
			if (m.find()) {
				return m.group(1);
			}
		}
		return null;
	}

	/**
	 * Dump everything needed to understand why the bridged (netem) PunchbagUser
	 * can't reach the SFU via
	 * the LiveKit URL.
	 */
	private void dumpNetemEstablishmentDiagnostics(OpenViduTestappUser user, String livekitUrl) {
		try {
			log.error("===== PunchbagUser establishment FAILED; dumping diagnostics. LiveKit URL = {} =====",
					livekitUrl);
			String hostPort = livekitUrl.replaceFirst("^wss?://", "").replaceFirst("/.*$", "");
			String host = hostPort.contains(":") ? hostPort.substring(0, hostPort.indexOf(':')) : hostPort;
			int port = hostPort.contains(":") ? Integer.parseInt(hostPort.substring(hostPort.indexOf(':') + 1)) : 7443;

			// (1) SFU container view + host interfaces, from the docker host
			log.error("[sfu-diag] docker inspect openvidu Networks ->\n{}",
					commandLine.executeCommand("docker inspect -f '{{json .NetworkSettings.Networks}}' openvidu 2>&1",
							30));
			log.error("[sfu-diag] openvidu IP-related env (NODE_IP / LAN_*) ->\n{}", commandLine.executeCommand(
					"docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' openvidu 2>&1 | grep -iE 'NODE_IP|LAN_|EXTERNAL|_IP' || true",
					30));
			log.error("[sfu-diag] docker host interfaces ->\n{}",
					commandLine.executeCommand("ip -o addr 2>&1 || ifconfig -a 2>&1 || true", 30));

			// (2) Netem container network-side probes (inside its own netns)
			NetworkConditioner.logConnectivityDiagnostics(getNetemContainerName(user), host, port);

			// (3) Browser console (best-effort; may be empty without goog:loggingPrefs)
			try {
				org.openqa.selenium.logging.LogEntries entries = user.getDriver().manage().logs()
						.get(org.openqa.selenium.logging.LogType.BROWSER);
				StringBuilder sb = new StringBuilder();
				entries.forEach(en -> sb.append(en.getLevel()).append(' ').append(en.getMessage()).append('\n'));
				log.error("[browser-console] PunchbagUser ->\n{}", sb.length() == 0 ? "(empty)" : sb.toString());
			} catch (Exception ce) {
				log.error("[browser-console] unavailable: {}", ce.getMessage());
			}
		} catch (Exception diagEx) {
			log.error("Diagnostics dump itself failed (ignoring)", diagEx);
		}
	}

	private String getConnectedSfuPortForPublisherPC(OpenViduTestappUser user, int numberOfUser)
			throws InterruptedException {
		return extractConnectedSfuPort(readPcTransportsInfoJson(user, numberOfUser), "publisher");
	}

	private String getConnectedSfuPortForSubscriberPC(OpenViduTestappUser user, int numberOfUser)
			throws InterruptedException {
		return extractConnectedSfuPort(readPcTransportsInfoJson(user, numberOfUser), "subscriber");
	}

	private static String extractConnectedSfuPort(String json, String transport) {
		if (json == null) {
			return null;
		}
		// Locate the transport's object, e.g. "publisher": { ... }. Matching the object
		// form '{' (not '[') ignores the RTCIceCandidateStats arrays. No such element
		// => return null.
		java.util.regex.Matcher object = java.util.regex.Pattern.compile("\"" + transport + "\"\\s*:\\s*\\{([^}]*)\\}")
				.matcher(json);
		if (!object.find()) {
			return null;
		}
		// Within that object, read the connectedAddress port ("ip:port" or the empty-IP
		// ":port" form).
		java.util.regex.Matcher port = java.util.regex.Pattern.compile("\"connectedAddress\"\\s*:\\s*\"[^\"]*:(\\d+)\"")
				.matcher(object.group(1));
		return port.find() ? port.group(1) : null;
	}

	private String readPcTransportsInfoJson(OpenViduTestappUser user, int numberOfUser) throws InterruptedException {
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + numberOfUser + " .peer-info-btn")).click();
		final java.util.regex.Pattern addrPattern = java.util.regex.Pattern
				.compile("\"connectedAddress\"\\s*:\\s*\"[^\"]*:(\\d+)\"");
		String json = null;
		for (int i = 0; i < 10; i++) {
			try {
				json = user.getDriver().findElement(By.id("info-text-area")).getDomProperty("value");
				if (json != null && addrPattern.matcher(json).find()) {
					break;
				}
			} catch (org.openqa.selenium.NoSuchElementException ignored) {
			}
			Thread.sleep(500);
		}
		try {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
		} catch (org.openqa.selenium.NoSuchElementException ignored) {
		}
		return json;
	}

	private Pair<OpenViduTestappUser, OpenViduTestappUser> connectionQualityTest(boolean isPublisher,
			boolean isSubscriber, Integer outboundPacketLoss, Integer inboundPacketLoss) throws Exception {

		// Connect to LiveKit server from a secure URL
		String secureLivekitUrlFromOpenViduLocalDeployment = getLivekitWssUrlFromReadyCheckContainer();

		Assertions.assertNotNull(secureLivekitUrlFromOpenViduLocalDeployment,
				"Could not obtain the LiveKit wss:// URL from the 'ready-check' container log. Is openvidu-local-deployment running? ");
		log.info("Using LiveKit URL: {}", secureLivekitUrlFromOpenViduLocalDeployment);

		NetworkConditioner.pullImages();

		// Connect to the openvidu-testapp through "host.docker.internal"
		final String secureAppUrl = APP_URL.replace("localhost", "host.docker.internal");

		OpenViduTestappUser punchbagUser = new OpenViduTestappUser(setupBrowser("chromeNetwork"));
		this.testappUsers.add(punchbagUser);
		punchbagUser.getDriver().get(secureAppUrl);
		WebElement urlInput = punchbagUser.getDriver().findElement(By.id("livekit-url"));
		urlInput.clear();
		urlInput.sendKeys(secureLivekitUrlFromOpenViduLocalDeployment);
		WebElement keyInput = punchbagUser.getDriver().findElement(By.id("livekit-api-key"));
		keyInput.clear();
		keyInput.sendKeys(LIVEKIT_API_KEY);
		WebElement secretInput = punchbagUser.getDriver().findElement(By.id("livekit-api-secret"));
		secretInput.clear();
		secretInput.sendKeys(LIVEKIT_API_SECRET);
		punchbagUser.getEventManager().startPolling();

		if (!isPublisher && !isSubscriber) {
			throw new IllegalArgumentException("At least one of isPublisher or isSubscriber must be true");
		}
		if (isPublisher) {
			this.addPublisher(punchbagUser, isSubscriber, false, false, false, true, true, null, null, null);
		} else {
			// Publish audio only (and keep subscribing) so the OTHER user subscribes to
			// PunchbagUser and therefore also receives its connectionQualityChanged events
			// - a user only gets quality events for itself and the participants it is
			// subscribed to. PunchbagUser still subscribes to RegularUser's audio+video,
			// which is the downlink actually impaired in this scenario; the extra audio
			// uplink stays clean and does not affect its (min-based) quality.
			this.addPublisher(punchbagUser, true, false, false, false, true, false, null, null, null);
		}

		WebElement participantNameInput = punchbagUser.getDriver().findElement(By.id("participant-name-input-0"));
		participantNameInput.clear();
		participantNameInput.sendKeys("PunchbagUser");

		punchbagUser.getDriver().findElement(By.cssSelector(".connect-btn")).sendKeys(Keys.ENTER);
		try {
			punchbagUser.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
		} catch (Exception e) {
			// The bridged (netem) PunchbagUser failed to establish (seen in CI). Dump why
			// before failing.
			dumpNetemEstablishmentDiagnostics(punchbagUser, secureLivekitUrlFromOpenViduLocalDeployment);
			throw e;
		}
		// PunchbagUser always publishes now: audio+video as a publisher, audio only as
		// a subscriber.
		punchbagUser.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", isPublisher ? 2 : 1);
		punchbagUser.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 1);
		punchbagUser.getEventManager().waitUntilEventReaches("connectionQualityChanged", "ParticipantEvent", 1);

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser", q -> q.contains("excellent"), 20,
				"Expected baseline connection quality to be EXCELLENT before impairment");

		OpenViduTestappUser regularUser = new OpenViduTestappUser(setupBrowser("chromeNetwork"));
		this.testappUsers.add(regularUser);
		regularUser.getDriver().get(secureAppUrl);
		urlInput = regularUser.getDriver().findElement(By.id("livekit-url"));
		urlInput.clear();
		urlInput.sendKeys(secureLivekitUrlFromOpenViduLocalDeployment);
		keyInput = regularUser.getDriver().findElement(By.id("livekit-api-key"));
		keyInput.clear();
		keyInput.sendKeys(LIVEKIT_API_KEY);
		secretInput = regularUser.getDriver().findElement(By.id("livekit-api-secret"));
		secretInput.clear();
		secretInput.sendKeys(LIVEKIT_API_SECRET);
		regularUser.getEventManager().startPolling();

		if (isSubscriber) {
			this.addPublisher(regularUser, true, false, false, false, true, true, null, null, null);
		} else {
			this.addSubscriber(regularUser, false);
		}
		participantNameInput = regularUser.getDriver().findElement(By.id("participant-name-input-0"));
		participantNameInput.clear();
		participantNameInput.sendKeys("RegularUser");

		regularUser.getDriver().findElement(By.cssSelector(".connect-btn")).sendKeys(Keys.ENTER);
		if (isPublisher) {
			regularUser.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 2);
			punchbagUser.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
		}
		if (isSubscriber) {
			punchbagUser.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 2);
			regularUser.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
		}

		regularUser.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 2);
		regularUser.getEventManager().waitUntilEventReaches("connectionQualityChanged", "ParticipantEvent", 2);
		punchbagUser.getEventManager().waitUntilEventReaches("connectionQualityChanged", "RoomEvent", 1);
		punchbagUser.getEventManager().waitUntilEventReaches("connectionQualityChanged", "ParticipantEvent", 1);

		waitUntilConnectionQuality(regularUser, 0, "RegularUser", q -> q.contains("excellent"), 20,
				"Expected baseline connection quality to be EXCELLENT");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser", q -> q.contains("excellent"), 20,
				"Expected baseline connection quality to be EXCELLENT");

		// Read the media port this client's publisher PC is connected to in
		// openvidu-server
		String publisherPortInSfu = getConnectedSfuPortForPublisherPC(punchbagUser, 0);
		Assertions.assertFalse(publisherPortInSfu == null || publisherPortInSfu.isBlank(),
				"Could not read the connected media port for the publisher PC");
		// Read the media port this client's subscriber PC is connected to in
		// openvidu-server
		String subscriberPortInSfue = getConnectedSfuPortForSubscriberPC(punchbagUser, 0);
		if (subscriberPortInSfue == null) {
			log.info("Pion single peer connection mode is in use. Only publisher PC available, using port "
					+ publisherPortInSfu);
		}

		punchbagUser.getEventManager().clearAllCurrentEvents();
		regularUser.getEventManager().clearAllCurrentEvents();

		if (outboundPacketLoss != null) {
			// Drop packets the client sends through the publisher PC. The SFU's ICE-TCP
			// port is impaired alike to avoid TCP fallbacks from the client side
			NetworkConditioner.applyLossToOutboundPackets(getNetemContainerName(punchbagUser),
					publisherPortInSfu + "," + NetworkConditioner.SFU_ICE_TCP_PORT, outboundPacketLoss, 10000);
		}
		if (inboundPacketLoss != null) {
			// Drop packets the client receives through the subscriber PC (or publisher PC
			// if single-PC mode)
			NetworkConditioner.applyLossToInboundPackets(getNetemContainerName(punchbagUser),
					NetworkConditioner.Protocol.UDP,
					subscriberPortInSfue != null ? subscriberPortInSfue : publisherPortInSfu, inboundPacketLoss, 10000);
		}

		return new ImmutablePair<>(punchbagUser, regularUser);
	}

	@Test
	@DisplayName("ConnectionQuality POOR publisher test")
	void connectionQualityPoorPublisherTest() throws Exception {

		log.info("ConnectionQuality POOR publisher test");

		Pair<OpenViduTestappUser, OpenViduTestappUser> users = connectionQualityTest(true, false, 75, null);
		OpenViduTestappUser punchbagUser = users.getLeft();
		OpenViduTestappUser regularUser = users.getRight();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);

		// Quality must degrade BELOW EXCELLENT (to GOOD or POOR)
		runInParallel(
				() -> waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser",
						q -> q.contains("good") || q.contains("poor"), 45,
						"Expected connection quality to degrade to GOOD or POOR"),
				() -> waitUntilConnectionQuality(regularUser, 0, "PunchbagUser",
						q -> q.contains("good") || q.contains("poor"), 45,
						"Expected connection quality to degrade to GOOD or POOR"));

		// Remove the impairment; quality must recover OUT of POOR (to GOOD or better)
		NetworkConditioner.clear();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser", q -> q.contains("good") || q.contains("excellent"),
				45, "Expected connection quality to RECOVER (to GOOD or better) after clearing impairment");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser", q -> q.contains("good") || q.contains("excellent"),
				45, "Expected connection quality to RECOVER (to GOOD or better) after clearing impairment");

		gracefullyLeaveParticipants(punchbagUser, 1);
	}

	@Test
	@DisplayName("ConnectionQuality GOOD publisher test")
	void connectionQualityGoodPublisherTest() throws Exception {

		log.info("ConnectionQuality GOOD publisher test");

		Pair<OpenViduTestappUser, OpenViduTestappUser> users = connectionQualityTest(true, false, 15, null);
		OpenViduTestappUser punchbagUser = users.getLeft();
		OpenViduTestappUser regularUser = users.getRight();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);

		// Quality must SETTLE at GOOD
		runInParallel(
				() -> assertConnectionQualitySettlesAt(punchbagUser, 0, "PunchbagUser",
						ConnectionQuality.GOOD, 45, "Expected connection quality to settle at GOOD"),
				() -> assertConnectionQualitySettlesAt(regularUser, 0, "PunchbagUser",
						ConnectionQuality.GOOD, 45, "Expected connection quality to settle at GOOD"));

		// Remove the impairment; quality must recover toward EXCELLENT
		NetworkConditioner.clear();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser", q -> q.contains("excellent"), 45,
				"Expected connection quality to RECOVER to EXCELLENT after clearing impairment");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser", q -> q.contains("excellent"), 45,
				"Expected connection quality to RECOVER to EXCELLENT after clearing impairment");

		gracefullyLeaveParticipants(punchbagUser, 1);
	}

	@Test
	@DisplayName("ConnectionQuality LOST publisher test")
	void connectionQualityLostPublisherTest() throws Exception {

		log.info("ConnectionQuality LOST publisher test");

		Pair<OpenViduTestappUser, OpenViduTestappUser> users = connectionQualityTest(true, false, null, null);
		OpenViduTestappUser punchbagUser = users.getLeft();
		OpenViduTestappUser regularUser = users.getRight();

		NetworkConditioner.blackoutOutbound(getNetemContainerName(punchbagUser), "7900-7999", 120);

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser", q -> q.contains("lost"), 45,
				"Expected connection quality to reach LOST");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser", q -> q.contains("lost"), 45,
				"Expected connection quality to reach LOST");

		// Remove the impairment; quality must recover toward EXCELLENT
		NetworkConditioner.clear();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser", q -> q.contains("excellent"), 45,
				"Expected connection quality to RECOVER to EXCELLENT after clearing impairment");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser", q -> q.contains("excellent"), 45,
				"Expected connection quality to RECOVER to EXCELLENT after clearing impairment");

		gracefullyLeaveParticipants(punchbagUser, 1);
	}

	@Test
	@DisplayName("ConnectionQuality POOR subscriber test")
	void connectionQualityPoorSubscriberTest() throws Exception {
		log.info("ConnectionQuality POOR subscriber test");

		Pair<OpenViduTestappUser, OpenViduTestappUser> users = connectionQualityTest(false, true, null, 50);
		OpenViduTestappUser punchbagUser = users.getLeft();
		OpenViduTestappUser regularUser = users.getRight();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);
		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "ParticipantEvent", 1);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "ParticipantEvent", 1);

		// Quality must SETTLE at POOR
		runInParallel(
				() -> assertConnectionQualitySettlesAt(punchbagUser, 0, "PunchbagUser",
						ConnectionQuality.POOR, 45, "Expected connection quality to settle at POOR"),
				() -> assertConnectionQualitySettlesAt(regularUser, 0, "PunchbagUser",
						ConnectionQuality.POOR, 45, "Expected connection quality to settle at POOR"));

		// Remove the impairment; quality must recover OUT of POOR (to GOOD or better)
		NetworkConditioner.clear();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 3);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 3);
		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "ParticipantEvent", 3);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "ParticipantEvent", 3);

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser", q -> q.contains("good") || q.contains("excellent"),
				45, "Expected connection quality to RECOVER (to GOOD or better) after clearing impairment");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser", q -> q.contains("good") || q.contains("excellent"),
				45, "Expected connection quality to RECOVER (to GOOD or better) after clearing impairment");

		gracefullyLeaveParticipants(punchbagUser, 1);
	}

	@Test
	@DisplayName("ConnectionQuality GOOD subscriber test")
	void connectionQualityGoodSubscriberTest() throws Exception {
		log.info("ConnectionQuality GOOD subscriber test");

		// Moderate inbound loss (22%) that degrades the subscriber below EXCELLENT
		Pair<OpenViduTestappUser, OpenViduTestappUser> users = connectionQualityTest(false, true, null, 22);
		OpenViduTestappUser punchbagUser = users.getLeft();
		OpenViduTestappUser regularUser = users.getRight();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 1);
		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "ParticipantEvent", 1);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "ParticipantEvent", 1);

		// Quality must degrade to GOOD or POOR (engine-divergent level -- see above)
		runInParallel(
				() -> waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser",
						q -> q.contains("good") || q.contains("poor"), 45,
						"Expected connection quality to degrade to GOOD or POOR"),
				() -> waitUntilConnectionQuality(regularUser, 0, "PunchbagUser",
						q -> q.contains("good") || q.contains("poor"), 45,
						"Expected connection quality to degrade to GOOD or POOR"));

		// Remove the impairment; quality must recover toward EXCELLENT
		NetworkConditioner.clear();

		punchbagUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);
		regularUser.getEventManager().waitUntilEventReaches(0, "connectionQualityChanged", "RoomEvent", 2);

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser", q -> q.contains("excellent"), 45,
				"Expected connection quality to RECOVER to EXCELLENT after clearing impairment");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser", q -> q.contains("excellent"), 45,
				"Expected connection quality to RECOVER to EXCELLENT after clearing impairment");

		gracefullyLeaveParticipants(punchbagUser, 1);
	}

	@Test
	@DisplayName("ConnectionQuality ramp up test")
	void connectionQualityRampUpTest() throws Exception {
		log.info("ConnectionQuality ramp up test");

		Pair<OpenViduTestappUser, OpenViduTestappUser> users = connectionQualityTest(true, false, 0, null);
		OpenViduTestappUser punchbagUser = users.getLeft();
		OpenViduTestappUser regularUser = users.getRight();

		// Quality must SETTLE at EXCELLENT
		runInParallel(
				() -> assertConnectionQualitySettlesAt(punchbagUser, 0, "PunchbagUser",
						ConnectionQuality.EXCELLENT, 45, "Expected connection quality to settle at EXCELLENT"),
				() -> assertConnectionQualitySettlesAt(regularUser, 0, "PunchbagUser",
						ConnectionQuality.EXCELLENT, 45, "Expected connection quality to settle at EXCELLENT"));

		String container = getNetemContainerName(punchbagUser);
		final int STEP_PCT = 10;
		final int HOLD_SECONDS = 16;

		// Ramp the PUBLISHER's uplink loss and record, at each step, the settled
		// quality of both the impaired publisher (PunchbagUser) and the untouched
		// subscriber's OWN quality (RegularUser).
		Map<Integer, ConnectionQuality> publisherQuality = new LinkedHashMap<>();
		Map<Integer, ConnectionQuality> subscriberQuality = new LinkedHashMap<>();
		try {
			for (int pct = STEP_PCT; pct <= 90; pct += STEP_PCT) {
				log.info("Packet loss to " + pct + "%");
				NetworkConditioner.updateOutboundLossPercent(container, pct);
				Thread.sleep(HOLD_SECONDS * 1000L);
				publisherQuality.put(pct, latestConnectionQuality(punchbagUser, 0, "PunchbagUser"));
				subscriberQuality.put(pct, latestConnectionQuality(regularUser, 0, "RegularUser"));
			}

			// Final step: a TOTAL blackout (100% loss) across the WHOLE SFU media port
			// range (7900-7999)
			final int BLACKOUT_PCT = 100;
			NetworkConditioner.blackoutOutbound(container, "7900-7999", 120);
			ConnectionQuality pubBlackout = latestConnectionQuality(punchbagUser, 0, "PunchbagUser");
			long lostDeadline = System.currentTimeMillis() + 45000L;
			while (pubBlackout != ConnectionQuality.LOST && System.currentTimeMillis() < lostDeadline) {
				Thread.sleep(1000L);
				pubBlackout = latestConnectionQuality(punchbagUser, 0, "PunchbagUser");
			}
			publisherQuality.put(BLACKOUT_PCT, pubBlackout);
			subscriberQuality.put(BLACKOUT_PCT, latestConnectionQuality(regularUser, 0, "RegularUser"));

			log.info(buildRampResultTable(publisherQuality, subscriberQuality));

			int firstGood = firstLossReaching(publisherQuality, ConnectionQuality.GOOD);
			int firstPoor = firstLossReaching(publisherQuality, ConnectionQuality.POOR);
			int firstLost = firstLossReaching(publisherQuality, ConnectionQuality.LOST);
			Assertions.assertTrue(firstGood >= 10 && firstGood <= 20,
					"EXCELLENT->GOOD transition expected between 10% and 20% loss, but first GOOD was at " + firstGood
							+ "%");
			Assertions.assertTrue(firstPoor >= 20 && firstPoor <= 50,
					"GOOD->POOR transition expected between 20% and 50% loss, but first POOR was at " + firstPoor
							+ "%");
			Assertions.assertTrue(firstPoor > firstGood,
					"POOR must appear after GOOD (firstGood=" + firstGood + "%, firstPoor=" + firstPoor + "%)");
			Assertions.assertTrue(firstLost >= 50,
					"POOR->LOST transition expected ONLY at severe loss (>=50%), but first LOST was at " + firstLost
							+ "%");
			Assertions.assertTrue(firstLost > firstPoor,
					"LOST must appear after POOR (firstPoor=" + firstPoor + "%, firstLost=" + firstLost + "%)");

			// Subscriber's own network is always EXCELLENT
			for (Entry<Integer, ConnectionQuality> e : subscriberQuality.entrySet()) {
				ConnectionQuality sq = e.getValue();
				Assertions.assertFalse(
						sq == ConnectionQuality.GOOD || sq == ConnectionQuality.POOR || sq == ConnectionQuality.LOST,
						"RegularUser (subscriber) network is NOT impaired, so its own connection quality must stay "
								+ "EXCELLENT, but was " + sq + " at " + e.getKey() + "% publisher loss");
			}
		} finally {
			NetworkConditioner.clear();
		}

		waitUntilConnectionQuality(punchbagUser, 0, "PunchbagUser",
				q -> q.contains("good") || q.contains("excellent"), 80,
				"Expected connection quality to RECOVER (to GOOD or better) after clearing impairment");
		waitUntilConnectionQuality(regularUser, 0, "PunchbagUser",
				q -> q.contains("good") || q.contains("excellent"), 80,
				"Expected connection quality to RECOVER (to GOOD or better) after clearing impairment");

		gracefullyLeaveParticipants(punchbagUser, 1);
	}

	@Test
	@DisplayName("Data Tracks publish, subscribe, send and receive")
	void dataTracksTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Data Tracks publish, subscribe, send and receive");

		// Two participants, no audio/video publishing
		for (int i = 0; i < 2; i++) {
			WebElement addUserBtn = user.getDriver().findElement(By.id("add-user-btn"));
			addUserBtn.click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + i + " .subscriber-checkbox")).click();
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + i + " .publisher-checkbox")).click();
		}
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("participantActive", "RoomEvent", 1);

		// Participant 0 publishes a data track
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .add-data-track-btn")).click();

		// Wait for localDataTrackPublished on participant 0 and dataTrackPublished on
		// participant 1
		user.getEventManager().waitUntilEventReaches(0, "localDataTrackPublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "dataTrackPublished", "RoomEvent", 1);

		// Verify event descriptions
		user.getDriver().findElements(By.cssSelector(".localDataTrackPublished-TestParticipant0 .event-content"))
				.forEach(el -> Assertions.assertTrue(el.getText().contains("data_track_1"),
						"Expected localDataTrackPublished to contain track name 'data_track_1'"));
		user.getDriver().findElements(By.cssSelector(".dataTrackPublished-TestParticipant1 .event-content"))
				.forEach(el -> Assertions.assertTrue(
						el.getText().contains("TestParticipant0") && el.getText().contains("data_track_1"),
						"Expected dataTrackPublished to contain publisher identity and track name"));

		// Participant 0 does not receive its own dataTrackPublished
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataTrackPublished-RoomEvent").get(),
				"Publisher should not receive dataTrackPublished for its own data track");

		// Participant 0 sends data frames
		org.openqa.selenium.JavascriptExecutor js = (org.openqa.selenium.JavascriptExecutor) user.getDriver();
		js.executeScript("document.querySelector('#openvidu-instance-0 .send-data-frame-btn').click()");
		js.executeScript("document.querySelector('#openvidu-instance-0 .send-data-frame-btn').click()");
		js.executeScript("document.querySelector('#openvidu-instance-0 .send-data-frame-btn').click()");

		// Wait for frames to arrive at participant 1
		Thread.sleep(1000);
		Long frameCount = (Long) js.executeScript(
				"var el = document.querySelector('#openvidu-instance-1 .data-track-frame-count');" +
						"return el ? parseInt(el.textContent) : 0;");
		Assertions.assertEquals(frameCount, 3, "Expected 3 data track frames received, got " + frameCount);

		String lastPayload = (String) js.executeScript(
				"var el = document.querySelector('#openvidu-instance-1 .data-track-last-payload');" +
						"return el ? el.textContent : '';");
		Assertions.assertTrue(lastPayload.contains("DataTrackFrame from TestParticipant0"),
				"Expected last payload to contain 'DataTrackFrame from TestParticipant0', got: " + lastPayload);

		// Participant 0 unpublishes the data track
		js.executeScript("document.querySelector('#openvidu-instance-0 .unpublish-data-track-btn').click()");

		// Wait for unpublish events
		user.getEventManager().waitUntilEventReaches(0, "localDataTrackUnpublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "dataTrackUnpublished", "RoomEvent", 1);

		// Participant 0 does not receive its own dataTrackUnpublished
		Assertions.assertEquals(0, user.getEventManager().getNumEvents(0, "dataTrackUnpublished-RoomEvent").get(),
				"Publisher should not receive dataTrackUnpublished for its own data track");

		user.getEventManager().clearAllCurrentEvents();

		// Now participant 1 publishes a data track with custom name (bidirectional
		// test)
		String customTrackName = "my_custom_data_track";
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .options-data-track-btn")).click();
		Thread.sleep(500);
		WebElement trackNameInput = user.getDriver().findElement(By.id("dataTrack-name"));
		trackNameInput.clear();
		trackNameInput.sendKeys(customTrackName);
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .add-data-track-btn")).click();

		user.getEventManager().waitUntilEventReaches(1, "localDataTrackPublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "dataTrackPublished", "RoomEvent", 1);

		// Verify participant 0 sees the custom track name on the remote data track
		Thread.sleep(500);
		String remoteTrackName = (String) js.executeScript(
				"var el = document.querySelector('#openvidu-instance-0 .data-track-name');" +
						"return el ? el.textContent.trim() : '';");
		Assertions.assertEquals(customTrackName, remoteTrackName,
				"Remote data track name should be '" + customTrackName + "', got: " + remoteTrackName);

		// Participant 1 sends a data frame
		js.executeScript("document.querySelector('#openvidu-instance-1 .send-data-frame-btn').click()");

		// Wait for frame to arrive at participant 0
		Thread.sleep(1000);

		Long frameCount0 = (Long) js.executeScript(
				"var el = document.querySelector('#openvidu-instance-0 .data-track-frame-count');" +
						"return el ? parseInt(el.textContent) : 0;");
		Assertions.assertTrue(frameCount0 >= 1,
				"Expected at least 1 data track frame received by participant 0, got " + frameCount0);

		String lastPayload0 = (String) js.executeScript(
				"var el = document.querySelector('#openvidu-instance-0 .data-track-last-payload');" +
						"return el ? el.textContent : '';");
		Assertions.assertTrue(lastPayload0.contains("DataTrackFrame from TestParticipant1"),
				"Expected last payload to contain 'DataTrackFrame from TestParticipant1', got: " + lastPayload0);

		// Participant 1 unpublishes
		js.executeScript("document.querySelector('#openvidu-instance-1 .unpublish-data-track-btn').click()");
		user.getEventManager().waitUntilEventReaches(1, "localDataTrackUnpublished", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(0, "dataTrackUnpublished", "RoomEvent", 1);

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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "audio.remote", true, false),
				"HTMLAudioElements were expected to have only one audio track");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("DTX enabled and disabled")
	void dtxTest() throws Exception {

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("DTX enabled and disabled");

		// Participant 0: Audio only, DTX enabled (default)
		this.addPublisherSubscriber(user, true, false);

		// Participant 1: Audio only, DTX disabled
		this.addPublisherSubscriber(user, true, false);
		int lastIndex = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size() - 1;
		this.waitAndClick(user, "#room-options-btn-" + lastIndex);
		Thread.sleep(300);
		user.getDriver().findElement(By.id("trackPublish-dtx")).click();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);

		// Register callbacks to collect trackSubscriptionStatusChanged event
		// descriptions
		List<String> trackSubStatusDescriptions = Collections.synchronizedList(new ArrayList<>());
		CountDownLatch trackSubStatusLatch = new CountDownLatch(4);
		user.getEventManager().on("trackSubscriptionStatusChanged", "RoomEvent", json -> {
			trackSubStatusDescriptions.add(json.getAsJsonObject().get("eventDescription").getAsString());
			trackSubStatusLatch.countDown();
		});

		// Connect both participants
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 2);

		// Check for 4 trackSubscriptionStatusChanged (2 to "desired" and 2 to
		// "subscribed")
		user.getEventManager().waitUntilEventReaches("trackSubscriptionStatusChanged", "RoomEvent", 4);
		if (!trackSubStatusLatch.await(10, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for 4 trackSubscriptionStatusChanged events");
		}
		Assertions.assertEquals(4, trackSubStatusDescriptions.size(),
				"Expected 4 trackSubscriptionStatusChanged events");
		Assertions.assertTrue(trackSubStatusDescriptions.contains("TestParticipant1 (microphone to desired)"),
				"Missing event: TestParticipant1 (microphone to desired). Got: " + trackSubStatusDescriptions);
		Assertions.assertTrue(trackSubStatusDescriptions.contains("TestParticipant1 (microphone to subscribed)"),
				"Missing event: TestParticipant1 (microphone to subscribed). Got: " + trackSubStatusDescriptions);
		Assertions.assertTrue(trackSubStatusDescriptions.contains("TestParticipant0 (microphone to desired)"),
				"Missing event: TestParticipant0 (microphone to desired). Got: " + trackSubStatusDescriptions);
		Assertions.assertTrue(trackSubStatusDescriptions.contains("TestParticipant0 (microphone to subscribed)"),
				"Missing event: TestParticipant0 (microphone to subscribed). Got: " + trackSubStatusDescriptions);
		user.getEventManager().off("trackSubscriptionStatusChanged", "RoomEvent");

		Thread.sleep(1500);

		org.openqa.selenium.JavascriptExecutor js = (org.openqa.selenium.JavascriptExecutor) user.getDriver();

		// Participant 0: DTX enabled - SDP answer must contain usedtx=1
		String sdp0 = (String) js.executeScript(
				"var room = window['room_0'];"
						+ "var pc = room.localParticipant.engine.pcManager.publisher._pc;"
						+ "return pc.remoteDescription.sdp;");
		Assertions.assertTrue(sdp0.contains("usedtx=1"),
				"SDP answer should contain usedtx=1 when DTX is enabled. SDP: " + sdp0);

		// Participant 1: DTX disabled - SDP answer must NOT contain usedtx=1
		String sdp1 = (String) js.executeScript(
				"var room = window['room_1'];"
						+ "var pc = room.localParticipant.engine.pcManager.publisher._pc;"
						+ "return pc.remoteDescription.sdp;");
		Assertions.assertFalse(sdp1.contains("usedtx=1"),
				"SDP answer should NOT contain usedtx=1 when DTX is disabled. SDP: " + sdp1);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("DTX packet rate reduction during silence")
	void dtxPacketRateTest() throws Exception {

		log.info("DTX packet rate reduction during silence");

		// Generate a WAV file with 5s tone + 5s silence (10 seconds total).
		// Chrome will loop this file as the fake audio capture source.
		String dtxAudioPath = "/opt/openvidu/dtx_test_audio.wav";
		String ffmpegCmd = "ffmpeg -y"
				+ " -f lavfi -i sine=frequency=440:duration=5"
				+ " -f lavfi -i anullsrc=r=48000:cl=mono"
				+ " -filter_complex \"[1]atrim=duration=5[silence];[0][silence]concat=n=2:v=0:a=1[out]\""
				+ " -map \"[out]\" -ar 48000 -ac 1 " + dtxAudioPath;
		String ffmpegOutput = commandLine.executeCommand(ffmpegCmd, 30);
		log.info("ffmpeg output: {}", ffmpegOutput);
		java.io.File dtxAudioFile = new java.io.File(dtxAudioPath);
		Assertions.assertTrue(dtxAudioFile.exists() && dtxAudioFile.length() > 0,
				"Failed to generate DTX test audio file at " + dtxAudioPath);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeDtxAudio");

		// Participant 0: Audio only, DTX enabled (default)
		this.addPublisherSubscriber(user, true, false);

		// Participant 1: Audio only, DTX disabled
		this.addPublisherSubscriber(user, true, false);
		int lastIndex = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size() - 1;
		this.waitAndClick(user, "#room-options-btn-" + lastIndex);
		Thread.sleep(300);
		user.getDriver().findElement(By.id("trackPublish-dtx")).click();
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);

		// Connect both participants
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 2);

		org.openqa.selenium.JavascriptExecutor js = (org.openqa.selenium.JavascriptExecutor) user.getDriver();

		Thread.sleep(1000);

		// Sample packetsSent at 1-second intervals for 12 seconds.
		// The 10-second WAV pattern (tone-silence) starts from Chrome's capture
		// beginning.
		// We sample enough to capture at least one full silence period.
		int sampleCount = 12;
		long[] packetsP0 = new long[sampleCount];
		long[] packetsP1 = new long[sampleCount];
		// Subscriber side: P0 subscribes to P1's audio (DTX disabled), P1 subscribes to
		// P0's audio (DTX enabled)
		long[] recvP0 = new long[sampleCount];
		long[] recvP1 = new long[sampleCount];

		for (int i = 0; i < sampleCount; i++) {
			packetsP0[i] = (Long) js.executeAsyncScript(
					"var callback = arguments[arguments.length - 1];"
							+ "var roomIdx = 0;"
							+ "var room = window['room_' + roomIdx];"
							+ "var pc = room.localParticipant.engine.pcManager.publisher._pc;"
							+ "pc.getStats().then(function(stats) {"
							+ "  var packets = 0;"
							+ "  stats.forEach(function(report) {"
							+ "    if (report.type === 'outbound-rtp' && report.kind === 'audio') {"
							+ "      packets = report.packetsSent;"
							+ "    }"
							+ "  });"
							+ "  callback(packets);"
							+ "});");
			packetsP1[i] = (Long) js.executeAsyncScript(
					"var callback = arguments[arguments.length - 1];"
							+ "var roomIdx = 1;"
							+ "var room = window['room_' + roomIdx];"
							+ "var pc = room.localParticipant.engine.pcManager.publisher._pc;"
							+ "pc.getStats().then(function(stats) {"
							+ "  var packets = 0;"
							+ "  stats.forEach(function(report) {"
							+ "    if (report.type === 'outbound-rtp' && report.kind === 'audio') {"
							+ "      packets = report.packetsSent;"
							+ "    }"
							+ "  });"
							+ "  callback(packets);"
							+ "});");
			// Subscriber stats: inbound-rtp packetsReceived
			recvP0[i] = (Long) js.executeAsyncScript(
					"var callback = arguments[arguments.length - 1];"
							+ "var room = window['room_0'];"
							+ "var mgr = room.localParticipant.engine.pcManager;"
							+ "var pc = (mgr.subscriber || mgr.publisher)._pc;" // subscriber is undefined in single-PC
																				// mode (pion)
							+ "pc.getStats().then(function(stats) {"
							+ "  var packets = 0;"
							+ "  stats.forEach(function(report) {"
							+ "    if (report.type === 'inbound-rtp' && report.kind === 'audio') {"
							+ "      packets = report.packetsReceived;"
							+ "    }"
							+ "  });"
							+ "  callback(packets);"
							+ "});");
			recvP1[i] = (Long) js.executeAsyncScript(
					"var callback = arguments[arguments.length - 1];"
							+ "var room = window['room_1'];"
							+ "var mgr = room.localParticipant.engine.pcManager;"
							+ "var pc = (mgr.subscriber || mgr.publisher)._pc;" // subscriber is undefined in single-PC
																				// mode (pion)
							+ "pc.getStats().then(function(stats) {"
							+ "  var packets = 0;"
							+ "  stats.forEach(function(report) {"
							+ "    if (report.type === 'inbound-rtp' && report.kind === 'audio') {"
							+ "      packets = report.packetsReceived;"
							+ "    }"
							+ "  });"
							+ "  callback(packets);"
							+ "});");
			if (i < sampleCount - 1) {
				Thread.sleep(1000);
			}
		}

		// Compute per-second packet rates
		long[] rateP0 = new long[sampleCount - 1];
		long[] rateP1 = new long[sampleCount - 1];
		// Subscriber rates: P0 receives P1's audio (DTX off), P1 receives P0's audio
		// (DTX on)
		long[] recvRateP0 = new long[sampleCount - 1];
		long[] recvRateP1 = new long[sampleCount - 1];
		for (int i = 0; i < sampleCount - 1; i++) {
			rateP0[i] = packetsP0[i + 1] - packetsP0[i];
			rateP1[i] = packetsP1[i + 1] - packetsP1[i];
			recvRateP0[i] = recvP0[i + 1] - recvP0[i];
			recvRateP1[i] = recvP1[i + 1] - recvP1[i];
		}

		log.info("DTX test - Packet rates per second for P0 (DTX enabled): {}", java.util.Arrays.toString(rateP0));
		log.info("DTX test - Packet rates per second for P1 (DTX disabled): {}", java.util.Arrays.toString(rateP1));
		log.info("DTX test - Subscriber recv rates for P0 (receives P1, DTX disabled): {}",
				java.util.Arrays.toString(recvRateP0));
		log.info("DTX test - Subscriber recv rates for P1 (receives P0, DTX enabled): {}",
				java.util.Arrays.toString(recvRateP1));

		// P1 (DTX disabled) should have a relatively constant packet rate (~50
		// packets/s for Opus at 20ms).
		// P0 (DTX enabled) should show at least one interval with significantly lower
		// packet rate during silence.
		// Find the minimum packet rate for each participant.
		long minRateP0 = Long.MAX_VALUE;
		long minRateP1 = Long.MAX_VALUE;
		long maxRateP0 = 0;
		long maxRateP1 = 0;
		for (int i = 0; i < rateP0.length; i++) {
			if (rateP0[i] < minRateP0)
				minRateP0 = rateP0[i];
			if (rateP0[i] > maxRateP0)
				maxRateP0 = rateP0[i];
			if (rateP1[i] < minRateP1)
				minRateP1 = rateP1[i];
			if (rateP1[i] > maxRateP1)
				maxRateP1 = rateP1[i];
		}

		log.info("DTX test - P0 (DTX enabled): min rate = {}, max rate = {}", minRateP0, maxRateP0);
		log.info("DTX test - P1 (DTX disabled): min rate = {}, max rate = {}", minRateP1, maxRateP1);

		// Assertion 1: P0 (DTX enabled) must have at least one interval where packet
		// rate drops
		// significantly below normal Opus rate. During silence with DTX, Opus sends
		// comfort noise
		// at ~1-5 packets/s vs ~50 packets/s normally. We use a generous threshold of
		// 25 packets/s.
		Assertions.assertTrue(minRateP0 < 25,
				"DTX enabled participant should have at least one interval with packet rate < 25 packets/s "
						+ "during silence, but minimum was " + minRateP0
						+ ". Rates: " + java.util.Arrays.toString(rateP0));

		// Assertion 2: P1 (DTX disabled) should maintain a consistently high packet
		// rate.
		// Even during silence, without DTX, Opus sends ~50 packets/s.
		// We check that the minimum rate never drops below 30 packets/s.
		Assertions.assertTrue(minRateP1 > 30,
				"DTX disabled participant should maintain packet rate > 30 packets/s even during silence, "
						+ "but minimum was " + minRateP1
						+ ". Rates: " + java.util.Arrays.toString(rateP1));

		// Assertion 3: The ratio between DTX-enabled min and DTX-disabled min should be
		// significant.
		// DTX-enabled silence rate should be at most half of DTX-disabled silence rate.
		Assertions.assertTrue(minRateP0 < minRateP1 / 2,
				"DTX enabled minimum rate (" + minRateP0 + ") should be less than half "
						+ "of DTX disabled minimum rate (" + minRateP1 + ")");

		// --- Subscriber side cross-validation ---
		// P0's subscriber receives P1's audio (DTX disabled) → should have constant
		// high rate
		// P1's subscriber receives P0's audio (DTX enabled) → should show reduced rate
		// during silence
		long minRecvRateP0 = Long.MAX_VALUE;
		long minRecvRateP1 = Long.MAX_VALUE;
		for (int i = 0; i < recvRateP0.length; i++) {
			if (recvRateP0[i] < minRecvRateP0)
				minRecvRateP0 = recvRateP0[i];
			if (recvRateP1[i] < minRecvRateP1)
				minRecvRateP1 = recvRateP1[i];
		}

		log.info("DTX test - Subscriber P0 (receives DTX disabled): min recv rate = {}", minRecvRateP0);
		log.info("DTX test - Subscriber P1 (receives DTX enabled): min recv rate = {}", minRecvRateP1);

		// Assertion 4: P1's subscriber receives P0's DTX-enabled audio.
		// During silence, packet rate should drop significantly (< 25 packets/s).
		Assertions.assertTrue(minRecvRateP1 < 25,
				"Subscriber receiving DTX-enabled audio should have at least one interval with recv rate "
						+ "< 25 packets/s during silence, but minimum was " + minRecvRateP1
						+ ". Rates: " + java.util.Arrays.toString(recvRateP1));

		// Assertion 5: P0's subscriber receives P1's DTX-disabled audio.
		// Packet rate should stay consistently high (> 30 packets/s).
		Assertions.assertTrue(minRecvRateP0 > 30,
				"Subscriber receiving DTX-disabled audio should maintain recv rate > 30 packets/s, "
						+ "but minimum was " + minRecvRateP0
						+ ". Rates: " + java.util.Arrays.toString(recvRateP0));

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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions.assertTrue(assertAllElementsHaveTracks(user, "audio.remote", true, false),
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");
		Assertions.assertTrue(assertAllElementsHaveTracks(user, "audio.remote", true, false),
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
		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", true, true),
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

				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 3));
				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("audio"), 3));
				final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
				final int numberOfAudios = user.getDriver().findElements(By.tagName("audio")).size();
				Assertions.assertEquals(3, numberOfVideos, "Wrong number of videos");
				Assertions.assertEquals(3, numberOfAudios, "Wrong number of audios");

				Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
						"HTMLVideoElements were expected to have only one video track");
				Assertions.assertTrue(assertAllElementsHaveTracks(user, "audio.remote", true, false),
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
		this.forceCodec(user, 0, codec);

		this.addSubscriber(user, false);

		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);

		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		String expectedCodec = "video/" + codec.toUpperCase();
		// Check publisher's codec
		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		this.waitUntilVideoLayersNotEmpty(user, publisherVideo);
		Assertions.assertEquals(expectedCodec,
				getPublisherVideoLayerAttribute(user, publisherVideo, null, "codec").getAsString());

		// Check subscriber's codec
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
		Assertions.assertEquals(expectedCodec, subscriberCodec);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		gracefullyLeaveParticipants(user, 2);
	}

	private void forceCodec(OpenViduTestappUser user, int numberOfUser, String codec) throws InterruptedException {
		String codecLowerCase = codec.toLowerCase();
		this.waitAndClick(user, "#room-options-btn-" + numberOfUser);
		Thread.sleep(300);
		user.getDriver().findElement(By.id("trackPublish-backupCodec")).click();
		user.getDriver().findElement(By.id("trackPublish-videoCodec")).click();
		this.waitAndClick(user, "#mat-option-" + codecLowerCase);
		this.waitAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);
	}

	@Test
	@DisplayName("Firefox subscribe to VP8")
	void firefoxSubscribeToVP8Test() throws Exception {
		log.info("Firefox subscribe to VP8");
		firefoxSubscribeToCodecTest("vp8", false);
	}

	@Test
	@DisplayName("Firefox subscribe to H264")
	void firefoxSubscribeToH264Test() throws Exception {
		log.info("Firefox subscribe to H264");
		firefoxSubscribeToCodecTest("h264", false);
	}

	@Test
	@DisplayName("Firefox subscribe to VP9")
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
	void firefoxSubscribeToH264SimulcastTest() throws Exception {
		log.info("Firefox subscribe to H264 simulcast");
		firefoxSubscribeToCodecTest("h264", true);
	}

	@Test
	@DisplayName("Firefox subscribe to VP9 simulcast")
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
				this.forceCodec(chromeUser, 0, codec);
				chromeUser.getDriver().findElement(By.className("connect-btn")).click();
				chromeUser.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1, 120,
						true);
				// Check publisher's codec
				WebElement publisherVideo = chromeUser.getDriver()
						.findElement(By.cssSelector("#openvidu-instance-0 video.local"));
				Assertions.assertEquals(expectedCodec,
						getPublisherVideoLayerAttribute(chromeUser, publisherVideo, null, "codec").getAsString());
				latch.countDown();
				latch.await(60, TimeUnit.SECONDS);
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
				Assertions.assertTrue(assertAllElementsHaveTracks(firefoxUser, "video", false, true),
						"HTMLVideoElements were expected to have only one video track");

				// Check subscriber's codec
				WebElement subscriberVideo = firefoxUser.getDriver()
						.findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
				String subscriberCodec = this.getSubscriberVideoCodec(firefoxUser, subscriberVideo);
				Assertions.assertEquals(expectedCodec, subscriberCodec);
				this.waitUntilSubscriberFramesDecodedIncrease(firefoxUser, subscriberVideo);
				latch.countDown();
				latch.await(10, TimeUnit.SECONDS);
				gracefullyLeaveParticipants(firefoxUser, 1);
			} catch (Exception e) {
				Assertions.fail("Error while setting up Firefox subscriber", e);
			}
		});

		awaitBrowserTasks(task1, task2);
	}

	@Test
	@DisplayName("Firefox H264 simulcast BWE convergence")
	void firefoxH264SimulcastBweConvergenceTest() throws Exception {
		log.info("Firefox H264 simulcast BWE convergence");
		simulcastBweConvergenceTest("h264", "firefox");
	}

	@Test
	@DisplayName("Firefox VP8 simulcast BWE convergence")
	void firefoxVP8SimulcastBweConvergenceTest() throws Exception {
		log.info("Firefox VP8 simulcast BWE convergence");
		simulcastBweConvergenceTest("vp8", "firefox");
	}

	@Test
	@DisplayName("Chrome H264 simulcast BWE convergence")
	void chromeH264SimulcastBweConvergenceTest() throws Exception {
		log.info("Chrome H264 simulcast BWE convergence");
		simulcastBweConvergenceTest("h264", "chromeTwoInstances");
	}

	@Test
	@DisplayName("Chrome VP8 simulcast BWE convergence")
	void chromeVP8SimulcastBweConvergenceTest() throws Exception {
		log.info("Chrome VP8 simulcast BWE convergence");
		simulcastBweConvergenceTest("vp8", "chromeTwoInstances");
	}

	private void simulcastBweConvergenceTest(String publisherCodec, String subscriberBrowser) throws Exception {
		final int EXPECTED_HIGHEST_WIDTH = 1920;
		// With mediasoup the publisher's high simulcast layer can take ~20s to activate
		// (a separate, still-open BWE issue from the subscriber-side). Allow margin
		// above that so the test reflects "does it converge" rather than "is it fast".
		final int BWE_CONVERGENCE_TIMEOUT_MS = 40000;
		final int POLL_INTERVAL_MS = 2000;
		final String subscriberLabel = subscriberBrowser.toUpperCase() + "_SUBSCRIBER";
		final CountDownLatch latch = new CountDownLatch(2);
		ExecutorService executor = Executors.newFixedThreadPool(2);
		// Wall-clock timestamps of when each side first reports the 1920 layer.
		// Comparing them tells whether a slow convergence is publisher-uplink or
		// subscriber-downlink.
		final java.util.concurrent.atomic.AtomicLong publisher1920AtMs = new java.util.concurrent.atomic.AtomicLong(-1);
		final java.util.concurrent.atomic.AtomicLong subscriber1920AtMs = new java.util.concurrent.atomic.AtomicLong(
				-1);

		final String publisherBrowser = "chromeTwoInstances".equals(subscriberBrowser) ? "chromeTwoInstances"
				: "chrome";

		Future<?> task1 = executor.submit(() -> {
			try {
				OpenViduTestappUser chromeUser = setupBrowserAndConnectToOpenViduTestapp(publisherBrowser);
				this.addOnlyPublisherVideo(chromeUser, true, false, false);
				WebElement participantNameInput = chromeUser.getDriver()
						.findElement(By.id("participant-name-input-0"));
				participantNameInput.clear();
				participantNameInput.sendKeys("CHROME_PUBLISHER");
				this.forceCodec(chromeUser, 0, publisherCodec);
				this.setPublisherSimulcastLayersAndResolution(chromeUser, 0, "h360", 1920, 1080);
				chromeUser.getDriver().findElement(By.className("connect-btn")).click();
				chromeUser.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1, 120,
						true);

				// Measure when the PUBLISHER itself starts actively sending the 1920 (rid
				// "f") layer (active==true && frameWidth==1920). Compared with the
				// subscriber's 1920 time, this disambiguates publisher-uplink vs
				// subscriber-downlink as the convergence bottleneck.
				WebElement publisherVideo = chromeUser.getDriver()
						.findElement(By.cssSelector("#openvidu-instance-0 video.local"));
				waitUntilVideoLayersNotEmpty(chromeUser, publisherVideo);
				long pubStart = System.currentTimeMillis();
				while (System.currentTimeMillis() - pubStart < BWE_CONVERGENCE_TIMEOUT_MS) {
					try {
						String rawLayers = getLayersAsString(chromeUser, publisherVideo);
						log.info("publisher [{}] raw layers: {}", publisherCodec, rawLayers);
						// Highest active layer width across all simulcast layers (rid-agnostic).
						Integer maxActiveWidth = null;
						for (JsonElement el : JsonParser.parseString(rawLayers).getAsJsonArray()) {
							JsonObject lo = el.getAsJsonObject();
							JsonElement wEl = lo.get("frameWidth");
							JsonElement aEl = lo.get("active");
							boolean active = aEl != null && !aEl.isJsonNull() && aEl.getAsBoolean();
							if (active && wEl != null && !wEl.isJsonNull()) {
								int w = wEl.getAsInt();
								if (maxActiveWidth == null || w > maxActiveWidth) {
									maxActiveWidth = w;
								}
							}
						}
						if (maxActiveWidth != null && maxActiveWidth >= EXPECTED_HIGHEST_WIDTH) {
							publisher1920AtMs.set(System.currentTimeMillis());
							break;
						}
					} catch (Exception e) {
						log.warn("Error getting publisher 'f' layer", e);
					}
					Thread.sleep(POLL_INTERVAL_MS);
				}
				latch.countDown();
				latch.await(60, TimeUnit.SECONDS);
				gracefullyLeaveParticipants(chromeUser, 1);
			} catch (Exception e) {
				Assertions.fail("Error while setting up Chrome publisher", e);
			}
		});

		Future<?> task2 = executor.submit(() -> {
			try {
				OpenViduTestappUser subscriberUser = setupBrowserAndConnectToOpenViduTestapp(subscriberBrowser);
				this.addSubscriber(subscriberUser, false);
				WebElement participantNameInput = subscriberUser.getDriver()
						.findElement(By.id("participant-name-input-0"));
				participantNameInput.clear();
				participantNameInput.sendKeys(subscriberLabel);
				subscriberUser.getDriver().findElement(By.className("connect-btn")).click();
				subscriberUser.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
				subscriberUser.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));
				Assertions.assertTrue(assertAllElementsHaveTracks(subscriberUser, "video", false, true),
						"HTMLVideoElements were expected to have only one video track");

				WebElement subscriberVideo = subscriberUser.getDriver()
						.findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
				waitUntilVideoLayersNotEmpty(subscriberUser, subscriberVideo);

				// Poll for BWE convergence: subscriber should reach highest layer
				long startTime = System.currentTimeMillis();
				int lastWidth = 0;
				boolean converged = false;
				while (System.currentTimeMillis() - startTime < BWE_CONVERGENCE_TIMEOUT_MS) {
					try {
						lastWidth = getSubscriberVideoFrameWidth(subscriberUser, subscriberVideo);
						log.info("{} subscriber frameWidth: {}", subscriberBrowser, lastWidth);
						if (lastWidth == EXPECTED_HIGHEST_WIDTH) {
							converged = true;
							subscriber1920AtMs.set(System.currentTimeMillis());
							break;
						}
					} catch (Exception e) {
						log.warn("Error getting subscriber frameWidth", e);
					}
					Thread.sleep(POLL_INTERVAL_MS);
				}
				Assertions.assertTrue(converged,
						subscriberBrowser + " subscriber BWE did not converge to highest layer. Last frameWidth: "
								+ lastWidth + ". Expected: " + EXPECTED_HIGHEST_WIDTH);
				this.waitUntilSubscriberFramesDecodedIncrease(subscriberUser, subscriberVideo);

				latch.countDown();
				latch.await(10, TimeUnit.SECONDS);
				gracefullyLeaveParticipants(subscriberUser, 1);
			} catch (Exception e) {
				Assertions.fail("Error while setting up " + subscriberBrowser + " subscriber", e);
			}
		});

		awaitBrowserTasks(task1, task2);

		long pub = publisher1920AtMs.get();
		long sub = subscriber1920AtMs.get();
		String verdict;
		if (pub < 0 && sub < 0) {
			verdict = "neither publisher nor subscriber reached 1920 within timeout";
		} else if (pub < 0) {
			verdict = "subscriber reached 1920 but publisher never reported actively sending it (measurement gap)";
		} else if (sub < 0) {
			verdict = "publisher sent 1920 but subscriber never received it";
		} else {
			long deltaMs = sub - pub;
			verdict = "subscriber got 1920 " + deltaMs + "ms after the publisher started sending it => "
					+ (deltaMs > 6000 ? "SUBSCRIBER-DOWNLINK is the bottleneck"
							: "PUBLISHER-UPLINK-gated (subscriber receives 1920 ~as soon as the publisher sends it)");
		}
		log.info("[BWE-SIDE] codec={} subscriber={} publisher1920AtMs={} subscriber1920AtMs={} => {}", publisherCodec,
				subscriberBrowser, pub, sub, verdict);
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
		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		this.waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

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
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// An enabled subscribed track increases its bytesReceived over time

		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

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
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
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
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo1);
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
		this.waitAndClick(user, "mat-option.mode-LOW");

		// Manually change video quality of second subscriber to f
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-HIGH");

		subscriberVideo1 = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		WebElement subscriberVideo2 = user.getDriver().findElement(By.cssSelector("#openvidu-instance-2 video.remote"));

		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo1, q);
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo2, f);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo2);

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
		this.waitAndClick(user, "mat-option.mode-MEDIUM");

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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
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
			user.getDriver().findElement(By.cssSelector("button[name='isSpeakingChanged']")).sendKeys(Keys.ENTER);
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "audio.remote", true, false),
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
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
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		// Manually change video quality of subscriber to h
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-MEDIUM");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, h);

		// Manually change video quality of subscriber to q
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-LOW");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, q);

		// Manually change video quality of subscriber to f
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-HIGH");
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
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
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// Subscriber should settle in 640p
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 640);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		changeElementSize(user, subscriberVideo, 1000, 700);
		Thread.sleep(2000);
		int newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(640, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		int oldFrameWidth = newFrameWidth;
		changeElementSize(user, subscriberVideo, 100, 30);
		Thread.sleep(3000);
		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(oldFrameWidth, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		oldFrameWidth = newFrameWidth;
		oldFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 1000, 700);
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		int frameWidth;

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 500, 300);
		this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, frameWidth, true);

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 80, 40);
		this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, frameWidth, false);

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 1000, 700);
		this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, frameWidth, true);

		frameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 120, 80);
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
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 100, 30);
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
		changeElementSize(user, subscriberVideo, 100, 30);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "q", true);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "h", false);
		this.waitUntilPublisherLayerActive(user, publisherVideo, "f", false);

		int publisherActiveFrameWidth = this.getPublisherVideoLayerAttribute(user, publisherVideo, "q", "frameWidth")
				.getAsInt();
		int subscriberFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		Assertions.assertEquals(publisherActiveFrameWidth, subscriberFrameWidth,
				"Wrong publisher and subscriber video frameWidth");
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		// All video layers should reach enabled status with a big video in the
		// subscriber side
		changeElementSize(user, subscriberVideo, 1000, 500);
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
		changeElementSize(user, subscriberVideo, 500, 300);
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one audio track");

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		Assertions.assertEquals(1, countNumberOfPublishedLayers(user, publisherVideo),
				"Wrong number of published layers");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		long bytesSent = this.getPublisherVideoLayerAttribute(user, publisherVideo, null, "bytesSent").getAsLong();
		long framesEncoded = this.getPublisherVideoLayerAttribute(user, publisherVideo, null, "framesEncoded")
				.getAsLong();

		Thread.sleep(3000);

		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, true);
		this.waitUntilPublisherBytesSentIncrease(user, publisherVideo, null, bytesSent);
		this.waitUntilPublisherFramesEncodedIncrease(user, publisherVideo, null, framesEncoded);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("SVC VP9 adaptive stream disabled dynacast disabled")
	void svcVP9AdaptiveStreamDisabledDynacastDisabledTest() throws Exception {
		svcAdaptiveStreamDisabledDynacastDisabledTest("vp9");
	}

	@Test
	@DisplayName("SVC VP9 adaptive stream enabled dynacast disabled")
	void svcVP9AdaptiveStreamEnabledDynacastDisabledTest() throws Exception {
		svcAdaptiveStreamEnabledDynacastDisabledTest("vp9");
	}

	@Test
	@DisplayName("SVC VP9 dynacast enabled")
	void svcVP9DynacastEnabledTest() throws Exception {
		svcDynacastEnabledTest("vp9");
	}

	@Test
	@DisplayName("SVC VP9 dynacast disabled")
	void svcVP9DynacastDisabledTest() throws Exception {
		svcDynacastDisabledTest("vp9");
	}

	@Test
	@DisplayName("SVC AV1 adaptive stream disabled dynacast disabled")
	void svcAV1AdaptiveStreamDisabledDynacastDisabledTest() throws Exception {
		svcAdaptiveStreamDisabledDynacastDisabledTest("av1");
	}

	@Test
	@DisplayName("SVC AV1 adaptive stream enabled dynacast disabled")
	void svcAV1AdaptiveStreamEnabledDynacastDisabledTest() throws Exception {
		svcAdaptiveStreamEnabledDynacastDisabledTest("av1");
	}

	@Test
	@DisplayName("SVC AV1 dynacast enabled")
	void svcAV1DynacastEnabledTest() throws Exception {
		svcDynacastEnabledTest("av1");
	}

	@Test
	@DisplayName("SVC AV1 dynacast disabled")
	void svcAV1DynacastDisabledTest() throws Exception {
		svcDynacastDisabledTest("av1");
	}

	private void svcAdaptiveStreamDisabledDynacastDisabledTest(String codec) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("SVC {} adaptive stream disabled dynacast disabled", codec.toUpperCase());

		this.addPublisher(user, false, false, false, false, false, true, 1920, 1080, "L2T2");
		this.forceCodec(user, 0, codec);
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// Check subscriber video codec
		String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
		Assertions.assertEquals("video/" + codec.toUpperCase(), subscriberCodec);

		// Subscriber should settle in 1920x1080p
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		changeElementSize(user, subscriberVideo, 1000, 700);
		Thread.sleep(2000);
		int newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(1920, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		int oldFrameWidth = newFrameWidth;
		changeElementSize(user, subscriberVideo, 100, 30);
		Thread.sleep(3000);
		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(oldFrameWidth, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		oldFrameWidth = newFrameWidth;
		oldFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 1000, 700);
		Thread.sleep(3000);
		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(oldFrameWidth, newFrameWidth,
				"With adaptive stream disabled subscriber's track resolution should NOT change");

		gracefullyLeaveParticipants(user, 2);
	}

	private void svcAdaptiveStreamEnabledDynacastDisabledTest(String codec) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("SVC {} adaptive stream enabled dynacast disabled", codec.toUpperCase());

		this.addPublisher(user, false, false, false, false, false, true, 1920, 1080, "L2T2");
		this.forceCodec(user, 0, codec);
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// Check subscriber video codec
		String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
		Assertions.assertEquals("video/" + codec.toUpperCase(), subscriberCodec);

		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		changeElementSize(user, subscriberVideo, 1000, 700);
		Thread.sleep(2000);
		int newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(1920, newFrameWidth,
				"With adaptive stream enabled subscriber's track resolution should change");

		changeElementSize(user, subscriberVideo, 100, 30);
		Thread.sleep(3000);
		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(960, newFrameWidth,
				"With adaptive stream enabled subscriber's track resolution should change");

		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		changeElementSize(user, subscriberVideo, 1000, 700);
		Thread.sleep(3000);
		newFrameWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);

		Assertions.assertEquals(1920, newFrameWidth,
				"With adaptive stream enabled subscriber's track resolution should change");

		gracefullyLeaveParticipants(user, 2);
	}

	private void svcDynacastEnabledTest(String codec) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("SVC {} dynacast enabled", codec.toUpperCase());

		// With SVC, dynacast only pauses the entire stream and not individual layers

		this.addPublisher(user, false, false, true, false, false, true, 1920, 1080, "L2T2");
		this.forceCodec(user, 0, codec);

		user.getDriver().findElement(By.className("connect-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));

		// With no subscribers and dynacast enabled, the entire SVC stream should
		// finally reach inactive state
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, false);

		// Only subscriber
		this.addSubscriber(user, false);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .connect-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(0, "localTrackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscriptionStatusChanged", "RoomEvent", 2);
		user.getEventManager().clearAllCurrentEvents();

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));

		// Check subscriber video codec
		String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
		Assertions.assertEquals("video/" + codec.toUpperCase(), subscriberCodec);

		// After subscription all layers should be active
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, true);

		// Even after forcing the low quality layer in the subscriber, with dynacast
		// enabled, the entire SVC stream should remain active in publisher
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-LOW");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		long framesEncoded = this.getPublisherVideoLayerAttribute(user, publisherVideo, null, "framesEncoded")
				.getAsLong();

		Thread.sleep(4000);
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, true);
		// And active means actually encoding, not just a layer flagged as active
		this.waitUntilPublisherFramesEncodedIncrease(user, publisherVideo, null, framesEncoded);

		// Only after pausing the subscriber track, the entire SVC stream should reach
		// inactive state in publisher
		WebElement toggleVideoBtn = user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 .toggle-video-enabled"));
		toggleVideoBtn.click();
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, false);

		toggleVideoBtn.click();
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, true);

		gracefullyLeaveParticipants(user, 2);
	}

	private void svcDynacastDisabledTest(String codec) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("SVC {} dynacast disabled", codec.toUpperCase());

		this.addPublisher(user, false, false, false, false, false, true, 1920, 1080, "L2T2");
		this.forceCodec(user, 0, codec);

		user.getDriver().findElement(By.className("connect-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("signalConnected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 1);
		user.getEventManager().clearAllCurrentEvents();

		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));

		// With no subscribers and dynacast disabled, the SVC stream should remain
		// active in publisher
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, true);
		long framesEncoded = this.getPublisherVideoLayerAttribute(user, publisherVideo, null, "framesEncoded")
				.getAsLong();
		Thread.sleep(8000);
		this.waitUntilPublisherLayerActive(user, publisherVideo, null, true);
		// And active means actually encoding, not just a layer flagged as active
		this.waitUntilPublisherFramesEncodedIncrease(user, publisherVideo, null, framesEncoded);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("SVC VP9 (L1T1)")
	void svcVP9L1T1Test() throws Exception {
		svcTest("VP9", "L1T1", false);
	}

	@Test
	@DisplayName("SVC VP9 (L2T2)")
	void svcVP9L2T2Test() throws Exception {
		svcTest("VP9", "L2T2", false);
	}

	@Test
	@DisplayName("SVC VP9 (L2T2_KEY)")
	void svcVP9L2T2_KEYTest() throws Exception {
		svcTest("VP9", "L2T2_KEY", false);
	}

	@Test
	@DisplayName("SVC VP9 (L3T3)")
	void svcVP9L3T3Test() throws Exception {
		svcTest("VP9", "L3T3", false);
	}

	@Test
	@DisplayName("SVC VP9 (L3T3_KEY)")
	void svcVP9L3T3_KEYTest() throws Exception {
		svcTest("VP9", "L3T3_KEY", false);
	}

	@Test
	@DisplayName("SVC AV1 (L1T1)")
	void svcAV1L1T1Test() throws Exception {
		svcTest("AV1", "L1T1", false);
	}

	@Test
	@DisplayName("SVC AV1 (L2T2)")
	void svcAV1L2T2Test() throws Exception {
		svcTest("AV1", "L2T2", false);
	}

	@Test
	@DisplayName("SVC AV1 (L2T2_KEY)")
	void svcAV1L2T2_KEYTest() throws Exception {
		svcTest("AV1", "L2T2_KEY", false);
	}

	@Test
	@DisplayName("SVC AV1 (L3T3)")
	void svcAV1L3T3Test() throws Exception {
		svcTest("AV1", "L3T3", false);
	}

	@Test
	@DisplayName("SVC AV1 (L3T3_KEY)")
	void svcAV1L3T3_KEYTest() throws Exception {
		svcTest("AV1", "L3T3_KEY", false);
	}

	@Test
	@DisplayName("SVC VP9 (L1T1) adaptiveStream")
	void svcVP9L1T1AdaptiveStreamTest() throws Exception {
		svcTest("VP9", "L1T1", true);
	}

	@Test
	@DisplayName("SVC VP9 (L2T2) adaptiveStream")
	void svcVP9L2T2AdaptiveStreamTest() throws Exception {
		svcTest("VP9", "L2T2", true);
	}

	@Test
	@DisplayName("SVC VP9 (L2T2_KEY) adaptiveStream")
	void svcVP9L2T2_KEYAdaptiveStreamTest() throws Exception {
		svcTest("VP9", "L2T2_KEY", true);
	}

	@Test
	@DisplayName("SVC VP9 (L3T3) adaptiveStream")
	void svcVP9L3T3AdaptiveStreamTest() throws Exception {
		svcTest("VP9", "L3T3", true);
	}

	@Test
	@DisplayName("SVC VP9 (L3T3_KEY) adaptiveStream")
	void svcVP9L3T3_KEYAdaptiveStreamTest() throws Exception {
		svcTest("VP9", "L3T3_KEY", true);
	}

	@Test
	@DisplayName("SVC AV1 (L1T1) adaptiveStream")
	void svcAV1L1T1AdaptiveStreamTest() throws Exception {
		svcTest("AV1", "L1T1", true);
	}

	@Test
	@DisplayName("SVC AV1 (L2T2) adaptiveStream")
	void svcAV1L2T2AdaptiveStreamTest() throws Exception {
		svcTest("AV1", "L2T2", true);
	}

	@Test
	@DisplayName("SVC AV1 (L2T2_KEY) adaptiveStream")
	void svcAV1L2T2_KEYAdaptiveStreamTest() throws Exception {
		svcTest("AV1", "L2T2_KEY", true);
	}

	@Test
	@DisplayName("SVC AV1 (L3T3) adaptiveStream")
	void svcAV1L3T3AdaptiveStreamTest() throws Exception {
		svcTest("AV1", "L3T3", true);
	}

	@Test
	@DisplayName("SVC AV1 (L3T3_KEY) adaptiveStream")
	void svcAV1L3T3_KEYAdaptiveStreamTest() throws Exception {
		svcTest("AV1", "L3T3_KEY", true);
	}

	@Test
	@OnlyMediasoup // Pion seems to freeze sometimes on its own
	@DisplayName("SVC VP9 (L3T3) subscriber keeps playing when the publisher drops its top layer")
	void svcVP9L3T3PublisherDropsTopLayerNoFreezeTest() throws Exception {
		// TEST FOR ISSUE:
		// https://github.com/OpenVidu/openvidu-pro-mediasoup#keep-the-temporal-layer-on-full-svc-spatial-downgrades
		// COMMIT FIX:
		// https://github.com/OpenVidu/openvidu-pro-mediasoup/commit/0f71434587c6a61d7d0dee9edefc638e58c2b7bc
		//
		// The RTP marker bit tells the subscriber where a picture ends: the publisher
		// puts it on the last packet of the highest spatial layer it encodes. When the
		// encoder stops producing its top layer (here: forced by re-capturing at a
		// resolution too small to host three spatial layers), the marker moves down to
		// a lower layer. An SFU that only marks the end of the layer it is *currently*
		// forwarding, and clears the publisher's marker, leaves the subscriber without
		// any end-of-picture marker until its layer bookkeeping catches up: a freeze of
		// about 3 seconds. The subscriber must instead keep playing and simply follow
		// the publisher down to the new top layer.
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.addOnlyPublisherVideo(user, false, false, true, "L3T3");
		this.forceCodec(user, 0, "VP9");
		this.addSubscriber(user, false);
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		Assertions.assertEquals("video/VP9", this.getSubscriberVideoCodec(user, subscriberVideo));
		// Subscriber on the top spatial layer and decoding
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		JsonObject before = this.getSubscriberVideoLayer(user, subscriberVideo);
		long freezesBefore = this.getLayerCounter(before, "freezeCount");
		long framesDecodedBefore = this.getLayerCounter(before, "framesDecoded");
		Assertions.assertTrue(freezesBefore >= 0, "freezeCount stat should be available");
		user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
		Thread.sleep(300);

		// Publisher re-captures at 640x360: an L3T3 encoder cannot host three spatial
		// layers
		// at that size, so it stops producing the top one
		final long switchStart = System.currentTimeMillis();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #restart-video-resolution")).click();
		this.waitAndClick(user, "mat-option.res-640x360");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 640);
		final long switchMillis = System.currentTimeMillis() - switchStart;
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		JsonObject after = this.getSubscriberVideoLayer(user, subscriberVideo);
		long freezesAfter = this.getLayerCounter(after, "freezeCount");
		long framesDecodedAfter = this.getLayerCounter(after, "framesDecoded");
		user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
		Thread.sleep(300);
		log.info(
				"[SVC] publisher dropped its top layer: subscriber reached 640 wide in {} ms, freezeCount {} -> {}, framesDecoded {} -> {}",
				switchMillis, freezesBefore, freezesAfter, framesDecodedBefore, framesDecodedAfter);
		Assertions.assertEquals(freezesBefore, freezesAfter,
				"The subscriber's video froze while the publisher dropped its top spatial layer (freezeCount went from "
						+ freezesBefore + " to " + freezesAfter + "; the new top layer was reached after "
						+ switchMillis
						+ " ms)");

		// And it must be able to follow the publisher back up (this needs a keyframe)
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #restart-video-resolution")).click();
		this.waitAndClick(user, "mat-option.res-1920x1080");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@OnlyMediasoup // Pion seems to drop frames on its own
	@DisplayName("SVC VP9 (L3T3) spatial downgrades do not drop frames")
	void svcVP9L3T3SpatialDowngradeFramesDroppedTest() throws Exception {
		// TEST FOR ISSUE:
		// https://github.com/OpenVidu/openvidu-pro-mediasoup#keep-the-publishers-rtp-marker-bit-in-svc-consumers
		// COMMIT FIX:
		// https://github.com/OpenVidu/openvidu-pro-mediasoup/commit/3ee450958af481f9a7274a1758813689bd8559f2
		//
		// A spatial downgrade of a full-SVC stream must not trigger frame drops. The
		// SFU keeps forwarding the lower layers, so the subscriber can decode the exact
		// frame on which the switch happens. If the SFU truncates that frame (for
		// example by dropping the last packet of the target layer), the subscriber
		// discards it and the following ones until the next decodable frame, which
		// Chrome reports as inbound-rtp "framesDropped". This is only a downgrade
		// problem (upgrades wait for a keyframe and are always clean). The test repeats
		// the downgrade cycle several times for better detection.
		final int cycles = 10;
		final long maxDroppedFramesOnDowngrades = 18;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.addOnlyPublisherVideo(user, false, false, true, "L3T3");
		this.forceCodec(user, 0, "VP9");
		this.addSubscriber(user, false);
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		Assertions.assertEquals("video/VP9", this.getSubscriberVideoCodec(user, subscriberVideo));
		// Start from the top spatial layer (see svcTest for the ramp-up rationale)
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		long previousDropped = this.getLayerCounter(this.getSubscriberVideoLayer(user, subscriberVideo),
				"framesDropped");
		long droppedOnDowngrades = 0;
		long droppedOnUpgrades = 0;
		final String[] qualities = { "MEDIUM", "LOW", "HIGH" };
		final int[] widths = { 960, 480, 1920 };
		for (int cycle = 0; cycle < cycles; cycle++) {
			for (int i = 0; i < qualities.length; i++) {
				user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
				Thread.sleep(300);
				this.switchSubscriberSpatialLayer(user, subscriberVideo, false, qualities[i]);
				this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, widths[i]);
				// Give the decoder a moment to drain the pictures around the switch
				Thread.sleep(500);
				long dropped = this.getLayerCounter(this.getSubscriberVideoLayer(user, subscriberVideo),
						"framesDropped");
				long delta = dropped - previousDropped;
				previousDropped = dropped;
				boolean downgrade = !"HIGH".equals(qualities[i]);
				if (downgrade) {
					droppedOnDowngrades += delta;
				} else {
					droppedOnUpgrades += delta;
				}
				log.info("[SVC] cycle {} switch to {}: framesDropped +{} (total on downgrades: {}, on upgrades: {})",
						cycle, qualities[i], delta, droppedOnDowngrades, droppedOnUpgrades);
			}
		}
		user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();

		Assertions.assertTrue(droppedOnDowngrades <= maxDroppedFramesOnDowngrades,
				"Spatial downgrades should not make the subscriber drop frames, but " + droppedOnDowngrades
						+ " frames were dropped over " + (cycles * 2) + " downgrades (max allowed "
						+ maxDroppedFramesOnDowngrades + "). Frames dropped on upgrades: " + droppedOnUpgrades);

		gracefullyLeaveParticipants(user, 2);
	}

	private void svcTest(String codec, String scalabilityMode, boolean adaptiveStream) throws Exception {
		final String codecUpperCase = codec.toUpperCase();
		final long testStart = System.currentTimeMillis();
		log.info("[SVC] START test: codec={}, scalabilityMode={}, adaptiveStream={}", codec, scalabilityMode,
				adaptiveStream);
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		this.addOnlyPublisherVideo(user, false, false, true, scalabilityMode);
		this.forceCodec(user, 0, codec);
		this.addSubscriber(user, adaptiveStream);
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("localTrackSubscribed", "ParticipantEvent", 1);
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 2));
		// Publisher video
		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		this.waitUntilVideoLayersNotEmpty(user, publisherVideo);
		Assertions.assertEquals(1, countNumberOfPublishedLayers(user, publisherVideo),
				"VP9 SVC publisher should expose a single encoding entry with scalabilityMode metadata");
		Assertions.assertEquals("video/" + codecUpperCase,
				getPublisherVideoLayerAttribute(user, publisherVideo, null, "codec").getAsString());
		Assertions.assertEquals(scalabilityMode,
				getPublisherVideoLayerAttribute(user, publisherVideo, null, "scalabilityMode").getAsString());

		// Subscriber video
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
		Assertions.assertEquals("video/" + codecUpperCase, subscriberCodec);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		// Validate SVC by dynamically switching subscriber quality and checking
		// subscriber frameWidth transitions.
		// With adaptiveStream disabled, quality is switched manually through the
		// "max-video-quality" selector, which lets HIGH/MEDIUM/LOW be requested
		// explicitly. With adaptiveStream enabled, that manual selector has no
		// effect: the spatial layer is instead derived from the rendered size of
		// the subscriber's video element
		int spatialLayers = Integer.parseInt(scalabilityMode.substring(1, 2));
		if (!adaptiveStream && spatialLayers > 1) {
			this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		}
		int highWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
		user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
		Thread.sleep(300);

		this.waitUntilSubscriberBytesReceivedIncreasing(user, subscriberVideo);
		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);

		if (spatialLayers == 1) {
			// A single spatial layer. Just ensure subscriber is properly receiving video
			Assertions.assertTrue(highWidth > 0, "Expected a positive frameWidth, but got " + highWidth);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		} else if (adaptiveStream) {
			// adaptiveStream picks the layer from the rendered size of the subscriber's
			// video element, so drive the layer changes by resizing that element. Only
			// two element sizes are used, so only the lowest and the highest spatial
			// layers are observable: with 3 spatial layers the middle one is never
			// visited. The default element size settles below the top layer, so the
			// first switch to HIGH must increase the received width.
			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "HIGH");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, highWidth, true);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			int bigWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
			Thread.sleep(300);

			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "LOW");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, bigWidth, false);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			int smallWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			Assertions.assertTrue(bigWidth > smallWidth,
					"Expected the zoomed-in width to exceed the zoomed-out width, but got big=" + bigWidth
							+ ", small=" + smallWidth);
			user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
			Thread.sleep(300);

			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "HIGH");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, smallWidth, true);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			int finalBigWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			Assertions.assertEquals(bigWidth, finalBigWidth,
					"Expected the zoomed-in width to be restored, but got first=" + bigWidth + ", second="
							+ finalBigWidth);
		} else if (spatialLayers >= 3) {
			// 3 spatial layers (e.g. L3T3_KEY): layers are LOW, MEDIUM, HIGH.
			// HIGH → MEDIUM → LOW, each a distinct lower resolution.
			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "MEDIUM");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, highWidth, false);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			int mediumWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
			Thread.sleep(300);

			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "LOW");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, mediumWidth, false);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			int lowWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			Assertions.assertTrue(highWidth > mediumWidth && mediumWidth > lowWidth,
					"Expected HIGH > MEDIUM > LOW frame widths, but got HIGH=" + highWidth
							+ ", MEDIUM=" + mediumWidth + ", LOW=" + lowWidth);
			user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
			Thread.sleep(300);

			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "HIGH");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, lowWidth, true);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		} else if (spatialLayers == 2) {
			// 2 spatial layers (e.g. L2T2): layers are LOW and MEDIUM only.
			// HIGH and MEDIUM both map to the highest spatial layer (same width).
			// Only LOW gives a distinct lower resolution.

			// 1. Switch to MEDIUM: should stay at the same width as HIGH
			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "MEDIUM");
			Thread.sleep(4000);
			int mediumWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			Assertions.assertEquals(highWidth, mediumWidth,
					"With " + spatialLayers + " spatial layers, MEDIUM should equal HIGH width, but got HIGH="
							+ highWidth + ", MEDIUM=" + mediumWidth);
			user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
			Thread.sleep(300);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

			// 2. Switch to LOW: should decrease
			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "LOW");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, mediumWidth, false);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			int lowWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			Assertions.assertTrue(highWidth > lowWidth,
					"Expected HIGH > LOW frame widths, but got HIGH=" + highWidth + ", LOW=" + lowWidth);
			user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
			Thread.sleep(300);

			// 3. Switch to MEDIUM: should increase back to highest spatial layer
			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "MEDIUM");
			this.waitUntilSubscriberFrameWidthChanges(user, subscriberVideo, lowWidth, true);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			int mediumWidth2 = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();
			Thread.sleep(300);

			// 4. Switch to HIGH: should stay at the same width as MEDIUM
			this.switchSubscriberSpatialLayer(user, subscriberVideo, adaptiveStream, "HIGH");
			Thread.sleep(4000);
			int finalHighWidth = this.getSubscriberVideoFrameWidth(user, subscriberVideo);
			Assertions.assertEquals(mediumWidth2, finalHighWidth,
					"With " + spatialLayers + " spatial layers, HIGH should equal MEDIUM width, but got MEDIUM="
							+ mediumWidth2 + ", HIGH=" + finalHighWidth);
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
		}

		gracefullyLeaveParticipants(user, 2);

		log.info("[SVC] END test: codec={}, scalabilityMode={}, adaptiveStream={}, totalDuration={} ms", codec,
				scalabilityMode, adaptiveStream, System.currentTimeMillis() - testStart);
	}

	// With adaptiveStream disabled, the subscriber's preferred quality is
	// switched manually through the "max-video-quality" selector. With
	// adaptiveStream enabled, that manual selector is ignored by the client SDK,
	// which instead derives the desired spatial layer from the rendered size of
	// the subscriber's video element, always picking the smallest layer that is
	// sufficient for that size. Only "LOW" (small element) and "HIGH" (large
	// element) are meaningful in that case.
	private void switchSubscriberSpatialLayer(OpenViduTestappUser user, WebElement subscriberVideo,
			boolean adaptiveStream, String quality) {
		if (adaptiveStream) {
			if ("LOW".equals(quality)) {
				changeElementSize(user, subscriberVideo, 80, 100);
			} else {
				changeElementSize(user, subscriberVideo, 1000, 700);
			}
		} else {
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 #max-video-quality")).click();
			this.waitAndClick(user, "mat-option.mode-" + quality);
		}
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

		user.getEventManager().waitUntilEventReaches("recordingStatusChanged",
				"RoomEvent", 1);

		WebElement egressIdField = user.getDriver().findElement(By.id("egress-id-field"));
		WebDriverWait wait = new WebDriverWait(user.getDriver(), Duration.ofSeconds(10));
		wait.until(ExpectedConditions.textToBePresentInElementValue(egressIdField, "EG_"));
		String egressId = egressIdField.getDomProperty("value");

		this.waitUntilEgressStatus(user, egressId, "EGRESS_ACTIVE", 10000);

		Thread.sleep(1000);

		user.getDriver().findElement(By.cssSelector("#stop-egress-api-btn")).click();

		JsonObject egress = this.waitUntilEgressStatus(user, egressId, "EGRESS_COMPLETE", 10000);

		if (isMinioAvailable()) {
			this.checkRecordingInBucket(egress);
		} else {
			this.checkRecordingInEgressBackupFolder(egress);
		}

		user.getEventManager().waitUntilEventReaches("recordingStatusChanged",
				"RoomEvent", 2);
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

	private boolean isMinioAvailable() {
		MinioClient minioClient = MinioClient.builder().endpoint("localhost", 9000, false)
				.credentials("minioadmin", "minioadmin").build();
		try {
			minioClient.bucketExists(BucketExistsArgs.builder().bucket("openvidu-appdata").build());
			return true;
		} catch (Exception e) {
			return false;
		}
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

	private void checkRecordingInEgressBackupFolder(JsonObject egress) {
		final boolean[] metadataFound = { false };
		final boolean[] videoFound = { false };

		try {
			// Execute docker command to list files in the egress container's backup_storage
			// directory
			Process process = Runtime.getRuntime()
					.exec(new String[] { "docker", "exec", "egress", "ls", "/home/egress/backup_storage" });

			// Read the output
			java.io.BufferedReader reader = new java.io.BufferedReader(
					new java.io.InputStreamReader(process.getInputStream()));
			String line;

			String expectedMetadataFileName = egress.get("egressId").getAsString() + ".json";
			String expectedVideoFileName = egress.get("file").getAsJsonObject().get("filename").getAsString();

			while ((line = reader.readLine()) != null) {
				String fileName = line.trim();
				if (expectedMetadataFileName.equals(fileName)) {
					metadataFound[0] = true;
				}
				if (expectedVideoFileName.equals(fileName)) {
					videoFound[0] = true;
				}
			}

			int exitCode = process.waitFor();
			if (exitCode != 0) {
				// Read error stream if command failed
				java.io.BufferedReader errorReader = new java.io.BufferedReader(
						new java.io.InputStreamReader(process.getErrorStream()));
				StringBuilder errorOutput = new StringBuilder();
				String errorLine;
				while ((errorLine = errorReader.readLine()) != null) {
					errorOutput.append(errorLine).append("\n");
				}
				Assertions.fail("Error accessing egress container backup folder. Exit code: " + exitCode + ", Error: "
						+ errorOutput.toString());
			}

		} catch (Exception e) {
			e.printStackTrace();
			Assertions.fail("Error executing docker command to check egress backup folder: " + e.getMessage());
		}

		if (!metadataFound[0]) {
			Assertions.fail("Recording metadata file not found in egress backup folder");
		}
		if (!videoFound[0]) {
			Assertions.fail("Recording media file not found in egress backup folder");
		}
	}

	@Test
	@DisplayName("Ingress VP8 Simulcast Chrome")
	void ingressVP8SimulcastChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress VP8 Simulcast Chrome");

		ingressSimulcastTest(user, true, "vp8", null);

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress VP8 Simulcast Firefox")
	void ingressVP8SimulcastFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress VP8 Simulcast Firefox");

		ingressSimulcastTest(user, true, "vp8", null);

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast Chrome")
	void ingressH264SimulcastChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress H264 Simulcast Chrome");

		ingressSimulcastTest(user, true, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast Firefox")
	void ingressH264SimulcastFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress H264 Simulcast Firefox");

		ingressSimulcastTest(user, true, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testThreeLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast two layers Chrome")
	void ingressH264SimulcastTwoLayersChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress H264 Simulcast Chrome");

		ingressSimulcastTest(user, true, null, "H264_540P_25FPS_2_LAYERS");
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testTwoLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast two layers Firefox")
	void ingressH264SimulcastTwoLayersFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress H264 Simulcast Firefox");

		ingressSimulcastTest(user, true, null, "H264_540P_25FPS_2_LAYERS");
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testTwoLayers(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 Simulcast Firefox subscriber stats never reset")
	void ingressH264SimulcastFirefoxStatsNeverResetTest() throws Exception {
		// TEST FOR ISSUE:
		// https://github.com/OpenVidu/openvidu-pro-mediasoup#send-bandwidth-probes-as-rtx-padding-of-a-video-consumer
		// COMMIT FIX:
		// https://github.com/OpenVidu/openvidu-pro-mediasoup/commit/72da65653c8a42bb3d68de6c24576bf53350d8ed
		//
		// Regression test: the SFU's bandwidth probes must not disturb the subscriber's
		// receive stream. mediasoup used to send them with their own SSRC (1234) routed
		// into the video m-section, and Firefox treated that unknown SSRC as a stream
		// switch: it recreated its receive stream (every inbound-rtp counter restarted
		// at 0) and froze the video until the next keyframe, on every probe burst. This
		// test samples a Firefox subscriber for a while and its inbound-rtp report must
		// keep the same SSRC and never decreasing counters, while the video keeps
		// decoding.
		final String browser = "firefox";
		final long samplingMillis = 45000;
		final long intervalMillis = 500;

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp(browser);

		log.info("Ingress H264 Simulcast {} subscriber stats never reset", browser);

		// Only subscriber without adaptive stream, so that the highest layer is
		// requested
		this.addSubscriber(user, false);
		user.getDriver().findElements(By.className("connect-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);

		createIngress(user, "H264_540P_25FPS_2_LAYERS", null, true, "HTTP", null);

		user.getEventManager().waitUntilEventReaches("trackSubscribed", "ParticipantEvent", 1);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.tagName("video"), 1));

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		final StringBuilder anomalies = new StringBuilder();
		long ssrc = -1;
		long previousFramesDecoded = -1;
		long previousFramesReceived = -1;
		long previousBytesReceived = -1;
		long firstFramesDecoded = -1;
		long lastFramesDecoded = -1;
		int samples = 0;
		final long samplingStart = System.currentTimeMillis();
		while (System.currentTimeMillis() - samplingStart < samplingMillis) {
			JsonObject layer = this.getSubscriberVideoLayer(user, subscriberVideo);
			long framesDecoded = this.getLayerCounter(layer, "framesDecoded");
			long framesReceived = this.getLayerCounter(layer, "framesReceived");
			long bytesReceived = this.getLayerCounter(layer, "bytesReceived");
			long currentSsrc = this.getLayerCounter(layer, "ssrc");
			log.info("[STATS] #{} ssrc={} framesDecoded={} framesReceived={} bytesReceived={}", samples, currentSsrc,
					framesDecoded, framesReceived, bytesReceived);
			if (framesDecoded < 0 || framesReceived < 0 || bytesReceived < 0 || currentSsrc < 0) {
				anomalies.append(" | sample ").append(samples).append(": inbound-rtp report missing fields ")
						.append(layer);
			} else {
				if (ssrc < 0) {
					ssrc = currentSsrc;
					firstFramesDecoded = framesDecoded;
				} else if (currentSsrc != ssrc) {
					anomalies.append(" | sample ").append(samples).append(": ssrc changed from ").append(ssrc)
							.append(" to ").append(currentSsrc);
				}
				if (framesDecoded < previousFramesDecoded) {
					anomalies.append(" | sample ").append(samples).append(": framesDecoded went from ")
							.append(previousFramesDecoded).append(" to ").append(framesDecoded);
				}
				if (framesReceived < previousFramesReceived) {
					anomalies.append(" | sample ").append(samples).append(": framesReceived went from ")
							.append(previousFramesReceived).append(" to ").append(framesReceived);
				}
				if (bytesReceived < previousBytesReceived) {
					anomalies.append(" | sample ").append(samples).append(": bytesReceived went from ")
							.append(previousBytesReceived).append(" to ").append(bytesReceived);
				}
				previousFramesDecoded = framesDecoded;
				previousFramesReceived = framesReceived;
				previousBytesReceived = bytesReceived;
				lastFramesDecoded = framesDecoded;
			}
			samples++;
			Thread.sleep(intervalMillis);
		}
		final long elapsedMillis = System.currentTimeMillis() - samplingStart;
		user.getDriver().findElement(By.cssSelector("#close-dialog-btn")).click();

		Assertions.assertTrue(anomalies.length() == 0,
				"The subscriber's inbound-rtp stats must keep the same SSRC and never decreasing counters (a reset means "
						+ "the browser recreated its receive stream), but over " + samples + " samples: " + anomalies);
		// The video must also have kept playing during the whole sampling window
		final long decodedInWindow = lastFramesDecoded - firstFramesDecoded;
		Assertions.assertTrue(decodedInWindow * 1000 >= MIN_FRAMES_DECODED_FPS * elapsedMillis,
				"The subscriber should keep decoding at least " + MIN_FRAMES_DECODED_FPS + " fps, but only "
						+ decodedInWindow + " frame(s) were decoded in " + elapsedMillis + " ms");

		gracefullyLeaveParticipants(user, 1);
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
	void ingressH264NoSimulcastChromeTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Ingress H264 No Simulcast Chrome");

		ingressSimulcastTest(user, false, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testNoSimulcast(user, subscriberVideo);
	}

	@Test
	@DisplayName("Ingress H264 No Simulcast Firefox")
	void ingressH264NoSimulcastFirefoxTest() throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("firefox");

		log.info("Ingress H264 No Simulcast Firefox");

		ingressSimulcastTest(user, false, "h264", null);
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));
		testNoSimulcast(user, subscriberVideo);
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
	void rtspIngressAACTest() throws Exception {
		log.info("RTSP ingress AAC");
		String rtspUri = startRtspServer(null, "AAC");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	@Test
	@DisplayName("RTSP ingress MP3")
	void rtspIngressMP3Test() throws Exception {
		log.info("RTSP ingress MP3");
		String rtspUri = startRtspServer(null, "MP3");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	@Test
	@DisplayName("RTSP ingress OPUS")
	void rtspIngressOPUSTest() throws Exception {
		log.info("RTSP ingress OPUS");
		String rtspUri = startRtspServer(null, "OPUS");
		urPullCommon("RTSP", rtspUri, false, true);
	}

	@Test
	@DisplayName("RTSP ingress G711")
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

	// @Test
	// @DisplayName("SRT ingress H264 + AAC")
	// @Disabled // AAC audio codec stream fails if sent along a video stream
	// void srtIngressTestH264_AAC() throws Exception {
	// log.info("SRT ingress H264 + AAC");
	// String srtUri = startSrtServer("H264", "AAC");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress H264 + AC3")
	// void srtIngressTestH264_AC3() throws Exception {
	// log.info("SRT ingress H264 + AC3");
	// String srtUri = startSrtServer("H264", "AC3");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress H264 + OPUS")
	// void srtIngressTestH264_OPUS() throws Exception {
	// log.info("SRT ingress H264 + OPUS");
	// String srtUri = startSrtServer("H264", "OPUS");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress H264 + MP3")
	// void srtIngressTestH264_MP3() throws Exception {
	// log.info("SRT ingress H264 + MP3");
	// String srtUri = startSrtServer("H264", "MP3");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress MPEG-4 + AAC")
	// @Disabled // AAC audio codec stream fails if sent along a video stream
	// void srtIngressTestMPEG-4_AAC() throws Exception {
	// log.info("SRT ingress MPEG-4 + AAC");
	// String srtUri = startSrtServer("MPEG-4", "AAC");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress MPEG-4 + AC3")
	// void srtIngressTestMPEG-4_AC3() throws Exception {
	// log.info("SRT ingress MPEG-4 + AC3");
	// String srtUri = startSrtServer("MPEG-4", "AC3");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress MPEG-4 + OPUS")
	// void srtIngressTestMPEG-4_OPUS() throws Exception {
	// log.info("SRT ingress MPEG-4 + OPUS");
	// String srtUri = startSrtServer("MPEG-4", "OPUS");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress MPEG-4 + MP3")
	// void srtIngressTestMPEG-4_MP3() throws Exception {
	// log.info("SRT ingress MPEG-4 + MP3");
	// String srtUri = startSrtServer("MPEG-4", "MP3");
	// urPullCommon("SRT", srtUri, true, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress H264")
	// void srtIngressTestH264() throws Exception {
	// log.info("SRT ingress H264");
	// String srtUri = startSrtServer("H264", null);
	// urPullCommon("SRT", srtUri, true, false);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress MPEG-4")
	// void srtIngressTestMPEG-4() throws Exception {
	// log.info("SRT ingress MPEG-4");
	// String srtUri = startSrtServer("MPEG-4", null);
	// urPullCommon("SRT", srtUri, true, false);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress AAC")
	// void srtIngressTestAAC() throws Exception {
	// log.info("SRT ingress AAC");
	// String srtUri = startSrtServer(null, "AAC");
	// urPullCommon("SRT", srtUri, false, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress AC3")
	// void srtIngressTestAC3() throws Exception {
	// log.info("SRT ingress AC3");
	// String srtUri = startSrtServer(null, "AC3");
	// urPullCommon("SRT", srtUri, false, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress MP3")
	// void srtIngressTestMP3() throws Exception {
	// log.info("SRT ingress MP3");
	// String srtUri = startSrtServer(null, "MP3");
	// urPullCommon("SRT", srtUri, false, true);
	// }
	//
	// @Test
	// @DisplayName("SRT ingress OPUS")
	// @Disabled // A single OPUS audio stream fails
	// void srtIngressTestOPUS() throws Exception {
	// log.info("SRT ingress OPUS");
	// String srtUri = startSrtServer(null, "OPUS");
	// urPullCommon("SRT", srtUri, false, true);
	// }

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
			Assertions.assertTrue(assertAllElementsHaveTracks(user, "audio", true, false),
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
			Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
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
			this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);
			String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
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

		Assertions.assertTrue(assertAllElementsHaveTracks(user, "video", false, true),
				"HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.remote"));

		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		long bytesReceived = this.getSubscriberVideoBytesReceived(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncrease(user, subscriberVideo, bytesReceived);
		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);
		this.waitUntilSubscriberFramesDecodedIncrease(user, subscriberVideo);

		// Check subscriber's codec
		if (codec != null) {
			String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
			String expectedCodec = "video/" + codec.toUpperCase();
			Assertions.assertEquals(expectedCodec, subscriberCodec);
		}
		if (preset != null) {
			String subscriberCodec = this.getSubscriberVideoCodec(user, subscriberVideo);
			Assertions.assertEquals("video/H264", subscriberCodec);
		}
	}

	private void testThreeLayers(OpenViduTestappUser user, WebElement subscriberVideo) throws InterruptedException {
		// Check manual simulcast changes
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-LOW");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 640);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-MEDIUM");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1280);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-HIGH");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
	}

	private void testTwoLayers(OpenViduTestappUser user, WebElement subscriberVideo) throws InterruptedException {
		// Check manual simulcast changes
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-LOW");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 480);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-MEDIUM");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-LOW");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 480);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-HIGH");
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 960);
	}

	private void testNoSimulcast(OpenViduTestappUser user, WebElement subscriberVideo) throws InterruptedException {
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 #max-video-quality")).click();
		this.waitAndClick(user, "mat-option.mode-LOW");
		// Without simulcast video should remain in high quality
		Thread.sleep(4000);
		this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, 1920);
	}

	@Test
	@DisplayName("Remote video element survives participant changes")
	void remoteVideoElementSurvivesParticipantChangesTest() throws Exception {
		// openvidu-testapp test: it must keep the DOM elements of the remote tracks
		// already rendered when the remote participant list changes
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Remote video element survives participant changes");

		this.addOnlyPublisherVideo(user, false, false, false);
		this.joinRoomAs(user, 0, "publisher");
		user.getEventManager().waitUntilEventReaches(0, "localTrackPublished", "RoomEvent", 1);

		this.addSubscriber(user, false);
		this.joinRoomAs(user, 1, "subscriber");
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "RoomEvent", 1);
		final By subscriberVideos = By.cssSelector("#openvidu-instance-1 video");
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(subscriberVideos, 1));
		WebElement remoteVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video.remote"));
		this.waitUntilSubscriberFramesPerSecondNotZero(user, remoteVideo);

		// A participant joins: the subscriber's remote participant list grows
		this.addSubscriber(user, false);
		this.joinRoomAs(user, 2, "newcomer");
		user.getEventManager().waitUntilEventReaches(1, "participantConnected", "RoomEvent", 1);
		this.assertRemoteVideoElementKept(user, remoteVideo, subscriberVideos, 1, "a participant joined");

		// The publisher publishes a second video track: its publication list grows
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .add-video-btn")).click();
		user.getEventManager().waitUntilEventReaches(0, "localTrackPublished", "RoomEvent", 2);
		user.getEventManager().waitUntilEventReaches(1, "trackSubscribed", "RoomEvent", 2);
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(subscriberVideos, 2));
		this.assertRemoteVideoElementKept(user, remoteVideo, subscriberVideos, 2,
				"the publisher published a second track");

		// The participant leaves: the subscriber's remote participant list shrinks
		this.leaveRoom(user, 2);
		user.getEventManager().waitUntilEventReaches(1, "participantDisconnected", "RoomEvent", 1);
		this.assertRemoteVideoElementKept(user, remoteVideo, subscriberVideos, 2, "a participant left");

		// And the kept element is still a playing video
		this.waitUntilSubscriberFramesPerSecondNotZero(user, remoteVideo);

		this.leaveRoom(user, 1);
		this.leaveRoom(user, 0);
	}

	private void joinRoomAs(OpenViduTestappUser user, int instance, String identity) throws Exception {
		WebElement participantNameInput = user.getDriver().findElement(By.id("participant-name-input-" + instance));
		participantNameInput.clear();
		participantNameInput.sendKeys(identity);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + instance + " .connect-btn"))
				.sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(instance, "connected", "RoomEvent", 1);
	}

	private void leaveRoom(OpenViduTestappUser user, int instance) throws Exception {
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + instance + " .disconnect-btn"))
				.sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(instance, "disconnected", "RoomEvent", 1);
	}

	private void assertRemoteVideoElementKept(OpenViduTestappUser user, WebElement remoteVideo, By videos,
			int expectedVideos, String change) {
		try {
			Assertions.assertTrue(remoteVideo.isDisplayed(),
					"The remote video element is no longer displayed after " + change);
		} catch (StaleElementReferenceException e) {
			Assertions.fail("The remote video element was re-created after " + change
					+ ": the WebElement located before is stale", e);
		}
		Assertions.assertEquals(expectedVideos, user.getDriver().findElements(videos).size(),
				"Wrong number of videos after " + change);
	}

}
