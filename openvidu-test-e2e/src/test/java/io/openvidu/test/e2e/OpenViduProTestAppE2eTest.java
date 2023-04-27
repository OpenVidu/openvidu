package io.openvidu.test.e2e;

import static org.junit.jupiter.api.Assertions.fail;

import java.awt.Point;
import java.io.File;
import java.io.FileReader;
import java.net.HttpURLConnection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.io.FileUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.Alert;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.http.HttpMethod;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;

import info.debatty.java.stringsimilarity.Cosine;
import io.openvidu.java.client.Connection;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.java.client.Session;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.RecordingUtils;
import io.openvidu.test.browsers.utils.Unzipper;
import io.openvidu.test.browsers.utils.layout.CustomLayoutHandler;
import io.openvidu.test.browsers.utils.webhook.CustomWebhook;
import io.openvidu.test.e2e.utils.TestUtils;

public class OpenViduProTestAppE2eTest extends AbstractOpenViduTestappE2eTest {

	protected volatile static boolean isSttManualTest = false;

	@BeforeAll()
	protected static void setupAll() {
		checkFfmpegInstallation();
		loadEnvironmentVariables();
		cleanFoldersAndSetUpOpenViduJavaClient();
	}

	@AfterEach
	protected void dispose() {
		// Unload STT models in all running Media Nodes
		if (isSttManualTest) {
			try {
				CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
						OpenViduTestAppE2eTest.OPENVIDU_SECRET);
				JsonArray mediaNodes = restClient
						.rest(HttpMethod.GET, "/openvidu/api/media-nodes", null, HttpURLConnection.HTTP_OK)
						.get("content").getAsJsonArray();
				mediaNodes.asList().parallelStream().forEach(mediaNode -> {
					String containerId = mediaNode.getAsJsonObject().get("environmentId").getAsString();
					try {
						restartSttContainer(containerId);
					} catch (Exception e) {
						System.err.println(e);
					}
				});
			} catch (Exception e) {
				System.err.println(e);
			} finally {
				isSttManualTest = false;
			}
		}
		super.dispose();
	}

	@Test
	@DisplayName("CDR")
	void cdrTest() throws Exception {

		log.info("CDR test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
					OpenViduTestAppE2eTest.OPENVIDU_SECRET);
			JsonObject config = restClient.rest(HttpMethod.GET, "/openvidu/api/config", HttpURLConnection.HTTP_OK);

			String defaultOpenViduCdrPath = null;
			String defaultOpenViduWebhookEndpoint = null;
			if (config.has("OPENVIDU_CDR_PATH")) {
				defaultOpenViduCdrPath = config.get("OPENVIDU_CDR_PATH").getAsString();
			}
			if (config.has("OPENVIDU_WEBHOOK_ENDPOINT")) {
				defaultOpenViduWebhookEndpoint = config.get("OPENVIDU_WEBHOOK_ENDPOINT").getAsString();
			}

			final String CDR_PATH = "/opt/openvidu/custom-cdr-path";

			try {
				FileUtils.deleteDirectory(new File(CDR_PATH));
			} catch (Exception e) {
				log.warn("Error trying to clean path " + CDR_PATH + ": " + e.getMessage());
			}

			try {
				Map<String, Object> newConfig = Map.of("OPENVIDU_CDR", true, "OPENVIDU_CDR_PATH", CDR_PATH,
						"OPENVIDU_WEBHOOK", true, "OPENVIDU_WEBHOOK_ENDPOINT", "http://127.0.0.1:7777/webhook");
				restartOpenViduServer(newConfig);

				Set<Path> cdrFiles = Files.list(Paths.get(CDR_PATH)).collect(Collectors.toSet());

				Assertions.assertEquals(1, cdrFiles.size(), "Wrong number of CDR files");

				Path cdrFile = cdrFiles.iterator().next();
				String absolutePath = cdrFile.toAbsolutePath().toString();

				if (!Files.exists(cdrFile)) {
					Assertions.fail("CDR file does not exist at " + absolutePath);
				} else if (!Files.isRegularFile(cdrFile)) {
					Assertions.fail("CDR file is not a regular file at " + absolutePath);
				} else if (!Files.isReadable(cdrFile)) {
					Assertions.fail("CDR file is not readable at " + absolutePath);
				}

				OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
				user.getDriver().findElement(By.id("add-user-btn")).click();
				user.getDriver().findElement(By.className("join-btn")).click();

				user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
				user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
				user.getEventManager().waitUntilEventReaches("streamCreated", 1);
				user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

				gracefullyLeaveParticipants(user, 1);

				CustomWebhook.waitForEvent("sessionDestroyed", 1);

				List<String> lines = Files.readAllLines(cdrFile);
				Map<String, List<JsonObject>> accumulatedWebhookEvents = CustomWebhook.accumulatedEvents;

				Assertions.assertEquals(lines.size(),
						accumulatedWebhookEvents.values().stream().mapToInt(i -> i.size()).sum(),
						"CDR events and Webhook events should be equal size");

				for (int i = lines.size() - 1; i >= 0; i--) {
					JsonObject cdrEvent = JsonParser.parseString(lines.get(i)).getAsJsonObject();
					Assertions.assertEquals(1, cdrEvent.entrySet().size(),
							"A CDR event should only have 1 root property");
					String cdrEventType = cdrEvent.entrySet().iterator().next().getKey();
					JsonObject webhookEvent = accumulatedWebhookEvents.get(cdrEventType)
							.remove(accumulatedWebhookEvents.get(cdrEventType).size() - 1);
					cdrEvent = cdrEvent.remove(cdrEventType).getAsJsonObject();
					webhookEvent.remove("event");
					Assertions.assertEquals(webhookEvent, cdrEvent);
				}
				accumulatedWebhookEvents.entrySet().forEach(entry -> Assertions.assertTrue(entry.getValue().isEmpty()));

			} finally {
				Map<String, Object> oldConfig = new HashMap<>();
				oldConfig.put("OPENVIDU_CDR", false);
				oldConfig.put("OPENVIDU_WEBHOOK", false);
				if (defaultOpenViduCdrPath != null) {
					oldConfig.put("OPENVIDU_CDR_PATH", defaultOpenViduCdrPath);
				}
				if (defaultOpenViduWebhookEndpoint != null) {
					oldConfig.put("OPENVIDU_WEBHOOK_ENDPOINT", defaultOpenViduWebhookEndpoint);
				}
				restartOpenViduServer(oldConfig);
				try {
					FileUtils.deleteDirectory(new File(CDR_PATH));
				} catch (Exception e) {
					log.warn("Error trying to clean path " + CDR_PATH + ": " + e.getMessage());
				}
			}
		} finally {
			CustomWebhook.shutDown();
		}
	}

	/**
	 * Go through every EndReason and test that all affected entities trigger the
	 * required Webhook events when being destroyed for that specific reason. Check
	 * that "reason" property of every event is right and that there are no extra
	 * events triggered.
	 */
	@Test
	@DisplayName("End reason")
	void endReasonTest() throws Exception {

		isRecordingTest = true;

		log.info("End reason test");

		CountDownLatch initLatch = new CountDownLatch(1);
		io.openvidu.test.browsers.utils.webhook.CustomWebhook.main(new String[0], initLatch);

		try {
			String BROADCAST_IP = TestUtils.startRtmpServer();

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
					OpenViduTestAppE2eTest.OPENVIDU_SECRET);
			JsonObject config = restClient.rest(HttpMethod.GET, "/openvidu/api/config", HttpURLConnection.HTTP_OK);

			String defaultOpenViduWebhookEndpoint = null;
			Integer defaultOpenViduRecordingAutostopTimeout = null;
			if (config.has("OPENVIDU_WEBHOOK_ENDPOINT")) {
				defaultOpenViduWebhookEndpoint = config.get("OPENVIDU_WEBHOOK_ENDPOINT").getAsString();
			}
			if (config.has("OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT")) {
				defaultOpenViduRecordingAutostopTimeout = config.get("OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT").getAsInt();
			}

			try {

				Map<String, Object> newConfig = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false,
						"OPENVIDU_PRO_SPEECH_TO_TEXT", "disabled", "OPENVIDU_WEBHOOK", true,
						"OPENVIDU_WEBHOOK_ENDPOINT", "http://127.0.0.1:7777/webhook",
						"OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT", 0);
				restartOpenViduServer(newConfig);

				OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

				// unsubscribe: webrtcConnectionDestroyed
				this.connectTwoUsers(user, restClient, false, false, null);
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .sub-btn")).click();
				Assertions.assertEquals("unsubscribe",
						CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// unpublish: webrtcConnectionDestroyed
				this.connectTwoUsers(user, restClient, false, false, null);
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-btn")).click();
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("unpublish",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// disconnect: webrtcConnectionDestroyed, participantLeft (and subsequent
				// lastParticipantLeft triggered events for sessionDestroyed,
				// recordingStatusChanged, broadcastStopped)
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				// First user out
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .leave-btn")).click();
				for (int i = 0; i < 3; i++) {
					Assertions.assertEquals("disconnect",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				Assertions.assertEquals("disconnect",
						CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				// Second user out
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .leave-btn")).click();
				Assertions.assertEquals("disconnect",
						CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				Assertions.assertEquals("disconnect",
						CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("lastParticipantLeft",
							CustomWebhook.waitForEvent("recordingStatusChanged", 2).get("reason").getAsString());
				}
				Assertions.assertEquals("lastParticipantLeft",
						CustomWebhook.waitForEvent("broadcastStopped", 2).get("reason").getAsString());
				Assertions.assertEquals("lastParticipantLeft",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// forceUnpublishByUser: webrtcConnectionDestroyed
				this.connectTwoUsers(user, restClient, true, false, null);
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .force-unpub-btn")).click();
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("forceUnpublishByUser",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// forceUnpublishByServer: webrtcConnectionDestroyed
				this.connectTwoUsers(user, restClient, false, false, null);
				String streamId = restClient
						.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession", HttpURLConnection.HTTP_OK)
						.get("connections").getAsJsonObject().get("content").getAsJsonArray().asList().stream()
						.filter(con -> con.getAsJsonObject().get("role").getAsString().equals("PUBLISHER")).findFirst()
						.get().getAsJsonObject().get("publishers").getAsJsonArray().get(0).getAsJsonObject()
						.get("streamId").getAsString();
				restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession/stream/" + streamId,
						HttpURLConnection.HTTP_NO_CONTENT);
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("forceUnpublishByServer",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// forceDisconnectByUser: webrtcConnectionDestroyed, participantLeft
				this.connectTwoUsers(user, restClient, true, false, null);
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .force-disconnect-btn")).click();
				for (int i = 0; i < 3; i++) {
					Assertions.assertEquals("forceDisconnectByUser",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				Assertions.assertEquals("forceDisconnectByUser",
						CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// forceDisconnectByServer: webrtcConnectionDestroyed, participantLeft (and
				// subsequent lastParticipantLeft triggered events for sessionDestroyed,
				// recordingStatusChanged, broadcastStopped)
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				String[] connectionIds = restClient
						.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession", HttpURLConnection.HTTP_OK)
						.get("connections").getAsJsonObject().get("content").getAsJsonArray().asList().stream()
						.map(con -> con.getAsJsonObject().get("connectionId").getAsString()).toArray(String[]::new);
				// First user out
				restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession/connection/" + connectionIds[0],
						HttpURLConnection.HTTP_NO_CONTENT);
				for (int i = 0; i < 3; i++) {
					Assertions.assertEquals("forceDisconnectByServer",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				Assertions.assertEquals("forceDisconnectByServer",
						CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				// Second user out
				restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession/connection/" + connectionIds[1],
						HttpURLConnection.HTTP_NO_CONTENT);
				Assertions.assertEquals("forceDisconnectByServer",
						CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				Assertions.assertEquals("forceDisconnectByServer",
						CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("lastParticipantLeft",
							CustomWebhook.waitForEvent("recordingStatusChanged", 2).get("reason").getAsString());
				}
				Assertions.assertEquals("lastParticipantLeft",
						CustomWebhook.waitForEvent("broadcastStopped", 2).get("reason").getAsString());
				Assertions.assertEquals("lastParticipantLeft",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// sessionClosedByServer: webrtcConnectionDestroyed, participantLeft,
				// sessionDestroyed, recordingStatusChanged, broadcastStopped
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession",
						HttpURLConnection.HTTP_NO_CONTENT);
				for (int i = 0; i < 4; i++) {
					Assertions.assertEquals("sessionClosedByServer",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("sessionClosedByServer",
							CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("sessionClosedByServer",
							CustomWebhook.waitForEvent("recordingStatusChanged", 2).get("reason").getAsString());
				}
				Assertions.assertEquals("sessionClosedByServer",
						CustomWebhook.waitForEvent("broadcastStopped", 2).get("reason").getAsString());
				Assertions.assertEquals("sessionClosedByServer",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// networkDisconnect: webrtcConnectionDestroyed, participantLeft (and
				// subsequent lastParticipantLeft triggered events for sessionDestroyed,
				// recordingStatusChanged, broadcastStopped)
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				// First user out
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .network-drop-btn")).click();
				for (int i = 0; i < 3; i++) {
					Assertions.assertEquals("networkDisconnect",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 20).get("reason").getAsString());
				}
				Assertions.assertEquals("networkDisconnect",
						CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				// Second user out
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .network-drop-btn")).click();
				Assertions.assertEquals("networkDisconnect",
						CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 20).get("reason").getAsString());
				Assertions.assertEquals("networkDisconnect",
						CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("lastParticipantLeft",
							CustomWebhook.waitForEvent("recordingStatusChanged", 2).get("reason").getAsString());
				}
				Assertions.assertEquals("lastParticipantLeft",
						CustomWebhook.waitForEvent("broadcastStopped", 2).get("reason").getAsString());
				Assertions.assertEquals("lastParticipantLeft",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// mediaServerDisconnect: webrtcConnectionDestroyed, participantLeft,
				// sessionDestroyed, recordingStatusChanged, broadcastStopped
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				String mediaNodeId = restClient
						.rest(HttpMethod.GET, "/openvidu/api/media-nodes", HttpURLConnection.HTTP_OK).get("content")
						.getAsJsonArray().get(0).getAsJsonObject().get("id").getAsString();
				restClient.rest(HttpMethod.DELETE,
						"/openvidu/api/media-nodes/" + mediaNodeId + "?wait=false&deletion-strategy=now",
						HttpURLConnection.HTTP_OK);
				CustomWebhook.waitForEvent("mediaNodeStatusChanged", 3);
				for (int i = 0; i < 4; i++) {
					Assertions.assertEquals("mediaServerDisconnect",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 20).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("mediaServerDisconnect",
							CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("mediaServerDisconnect",
							CustomWebhook.waitForEvent("recordingStatusChanged", 4).get("reason").getAsString());
				}
				Assertions.assertEquals("mediaServerDisconnect",
						CustomWebhook.waitForEvent("broadcastStopped", 2).get("reason").getAsString());
				Assertions.assertEquals("mediaServerDisconnect",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.waitForEvent("mediaNodeStatusChanged", 5);
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));
				restartOpenViduServer(new HashMap<>(), true, HttpURLConnection.HTTP_OK);

				// mediaServerReconnect: webrtcConnectionDestroyed, recordingStatusChanged
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				String containerId = restClient
						.rest(HttpMethod.GET, "/openvidu/api/media-nodes", HttpURLConnection.HTTP_OK).get("content")
						.getAsJsonArray().get(0).getAsJsonObject().get("environmentId").getAsString();
				MediaNodeDockerUtils.stopMediaServerInsideMediaNodeAndRecover(containerId, 400);
				for (int i = 0; i < 4; i++) {
					Assertions.assertEquals("mediaServerReconnect",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 6).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("mediaServerReconnect",
							CustomWebhook.waitForEvent("recordingStatusChanged", 2).get("reason").getAsString());
				}
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// nodeCrashed: webrtcConnectionDestroyed, participantLeft, sessionDestroyed,
				// recordingStatusChanged, broadcastStopped
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				containerId = restClient.rest(HttpMethod.GET, "/openvidu/api/media-nodes", HttpURLConnection.HTTP_OK)
						.get("content").getAsJsonArray().get(0).getAsJsonObject().get("environmentId").getAsString();
				MediaNodeDockerUtils.crashMediaNode(containerId);
				JsonObject nodeCrashedEvent = CustomWebhook.waitForEvent("nodeCrashed", 10);

				Assertions.assertEquals(1, nodeCrashedEvent.get("recordingIds").getAsJsonArray().size());
				JsonArray affectedBroadcasts = nodeCrashedEvent.get("broadcasts").getAsJsonArray();
				Assertions.assertEquals(1, affectedBroadcasts.size());
				Assertions.assertTrue(affectedBroadcasts.get(0).equals(JsonParser.parseString("TestSession")));

				CustomWebhook.waitForEvent("mediaNodeStatusChanged", 2);
				for (int i = 0; i < 4; i++) {
					Assertions.assertEquals("nodeCrashed",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("nodeCrashed",
							CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				}
				// Only status "stopped" for recording. Not "ready" if node crash
				Assertions.assertEquals("nodeCrashed",
						CustomWebhook.waitForEvent("recordingStatusChanged", 10).get("reason").getAsString());
				Assertions.assertEquals("nodeCrashed",
						CustomWebhook.waitForEvent("broadcastStopped", 10).get("reason").getAsString());
				Assertions.assertEquals("nodeCrashed",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.waitForEvent("mediaNodeStatusChanged", 2);
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));
				restartOpenViduServer(new HashMap<>(), true, HttpURLConnection.HTTP_OK);

				// openviduServerStopped: webrtcConnectionDestroyed, participantLeft,
				// sessionDestroyed, recordingStatusChanged, broadcastStopped
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				restartOpenViduServer(new HashMap<>(), true, HttpURLConnection.HTTP_OK);
				for (int i = 0; i < 4; i++) {
					Assertions.assertEquals("openviduServerStopped",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 20).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("openviduServerStopped",
							CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("openviduServerStopped",
							CustomWebhook.waitForEvent("recordingStatusChanged", 4).get("reason").getAsString());
				}
				Assertions.assertEquals("openviduServerStopped",
						CustomWebhook.waitForEvent("broadcastStopped", 2).get("reason").getAsString());
				Assertions.assertEquals("openviduServerStopped",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				for (int i = 0; i < 2; i++) {
					CustomWebhook.waitForEvent("mediaNodeStatusChanged", 15);
				}
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// automaticStop: sessionDestroyed, recordingStatusChanged
				newConfig = Map.of("OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT", 1);
				restartOpenViduServer(newConfig);
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .leave-btn")).click();
				user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .leave-btn")).click();
				for (int i = 0; i < 4; i++) {
					Assertions.assertEquals("disconnect",
							CustomWebhook.waitForEvent("webrtcConnectionDestroyed", 2).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("disconnect",
							CustomWebhook.waitForEvent("participantLeft", 2).get("reason").getAsString());
				}
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("automaticStop",
							CustomWebhook.waitForEvent("recordingStatusChanged", 4).get("reason").getAsString());
				}
				Assertions.assertEquals("lastParticipantLeft",
						CustomWebhook.waitForEvent("broadcastStopped", 2).get("reason").getAsString());
				Assertions.assertEquals("automaticStop",
						CustomWebhook.waitForEvent("sessionDestroyed", 2).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// recordingStoppedByServer: recordingStatusChanged
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				String recordingId = restClient
						.rest(HttpMethod.GET, "/openvidu/api/recordings", HttpURLConnection.HTTP_OK).get("items")
						.getAsJsonArray().asList().stream()
						.filter(rec -> rec.getAsJsonObject().get("status").getAsString()
								.equals(Recording.Status.started.name()))
						.findFirst().get().getAsJsonObject().get("id").getAsString();
				restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/" + recordingId,
						HttpURLConnection.HTTP_OK);
				for (int i = 0; i < 2; i++) {
					Assertions.assertEquals("recordingStoppedByServer",
							CustomWebhook.waitForEvent("recordingStatusChanged", 4).get("reason").getAsString());
				}
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

				// broadcastStoppedByServer: broadcastStopped
				this.connectTwoUsers(user, restClient, false, true, BROADCAST_IP);
				restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/stop", "{'session':'TestSession'}",
						HttpURLConnection.HTTP_OK);
				Assertions.assertEquals("broadcastStoppedByServer",
						CustomWebhook.waitForEvent("broadcastStopped", 5).get("reason").getAsString());
				CustomWebhook.events.values().forEach(collection -> Assertions.assertTrue(collection.isEmpty()));

			} finally {
				Map<String, Object> oldConfig = new HashMap<>();
				oldConfig.put("OPENVIDU_WEBHOOK", false);
				if (defaultOpenViduWebhookEndpoint != null) {
					oldConfig.put("OPENVIDU_WEBHOOK_ENDPOINT", defaultOpenViduWebhookEndpoint);
				}
				if (defaultOpenViduRecordingAutostopTimeout != null) {
					oldConfig.put("OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT", defaultOpenViduRecordingAutostopTimeout);
				}
				restartOpenViduServer(oldConfig);
			}

		} finally {
			TestUtils.stopRtmpServer();
			CustomWebhook.shutDown();
		}
	}

	@Test
	@DisplayName("Individual dynamic record")
	void individualDynamicRecordTest() throws Exception {

		isRecordingTest = true;

		log.info("Individual dynamic record");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"disabled");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
				OpenViduTestAppE2eTest.OPENVIDU_SECRET);

		// Connect 3 users. Record only the first one
		for (int i = 0; i < 3; i++) {
			user.getDriver().findElement(By.id("add-user-btn")).click();
			if (i > 0) {
				user.getDriver().findElement(By.id("session-settings-btn-" + i)).click();
				Thread.sleep(500);
				user.getDriver().findElement(By.id("record-checkbox")).click();
				user.getDriver().findElement(By.id("save-btn")).click();
				Thread.sleep(500);
			}
		}

		String sessionName = "TestSession";

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("streamPlaying", 9);

		// Get connectionId and streamId for the user configured to be recorded
		JsonObject sessionInfo = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/" + sessionName,
				HttpURLConnection.HTTP_OK);
		JsonArray connections = sessionInfo.get("connections").getAsJsonObject().get("content").getAsJsonArray();
		String connectionId1 = null;
		String streamId1 = null;
		for (JsonElement connection : connections) {
			if (connection.getAsJsonObject().get("record").getAsBoolean()) {
				connectionId1 = connection.getAsJsonObject().get("connectionId").getAsString();
				streamId1 = connection.getAsJsonObject().get("publishers").getAsJsonArray().get(0).getAsJsonObject()
						.get("streamId").getAsString();
				break;
			}
		}

		// Start the recording of the sessions
		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
				"{'session':'" + sessionName + "','outputMode':'INDIVIDUAL'}", HttpURLConnection.HTTP_OK);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 3);
		Thread.sleep(1000);

		// Get connectionId and streamId for one of the users configured to NOT be
		// recorded
		sessionInfo = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/" + sessionName,
				HttpURLConnection.HTTP_OK);
		connections = sessionInfo.get("connections").getAsJsonObject().get("content").getAsJsonArray();
		String connectionId2 = null;
		String streamId2 = null;
		for (JsonElement connection : connections) {
			if (!connection.getAsJsonObject().get("record").getAsBoolean()) {
				connectionId2 = connection.getAsJsonObject().get("connectionId").getAsString();
				streamId2 = connection.getAsJsonObject().get("publishers").getAsJsonArray().get(0).getAsJsonObject()
						.get("streamId").getAsString();
				break;
			}
		}

		// Generate 3 total recordings of 1 second length for the stream of the user
		// configured to NOT be recorded
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':true}", HttpURLConnection.HTTP_OK);
		Thread.sleep(1000);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':false}", HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':true}", HttpURLConnection.HTTP_OK);
		Thread.sleep(1000);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':false}", HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':true}", HttpURLConnection.HTTP_OK);
		Thread.sleep(1000);

		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/" + sessionName, HttpURLConnection.HTTP_OK);
		user.getEventManager().waitUntilEventReaches("recordingStopped", 3);

		gracefullyLeaveParticipants(user, 3);

		String recPath = "/opt/openvidu/recordings/" + sessionName + "/";
		Recording recording = new OpenVidu(OpenViduTestAppE2eTest.OPENVIDU_URL, OpenViduTestAppE2eTest.OPENVIDU_SECRET)
				.getRecording(sessionName);
		this.recordingUtils.checkIndividualRecording(recPath, recording, 4, "opus", "vp8", true);

		// Analyze INDIVIDUAL recording metadata
		new Unzipper().unzipFile(recPath, recording.getName() + ".zip");
		File jsonSyncFile = new File(recPath + recording.getName() + ".json");
		JsonReader reader = new JsonReader(new FileReader(jsonSyncFile));
		JsonObject jsonMetadata = new Gson().fromJson(reader, JsonObject.class);
		JsonArray syncArray = jsonMetadata.get("files").getAsJsonArray();
		int count1 = 0;
		int count2 = 0;

		Set<String> regexNames = Stream.of("^" + streamId2 + "\\.(webm|mkv|mp4)$",
				"^" + streamId2 + "-1\\.(webm|mkv|mp4)$", "^" + streamId2 + "-2\\.(webm|mkv|mp4)$")
				.collect(Collectors.toSet());

		for (JsonElement fileJson : syncArray) {
			JsonObject file = fileJson.getAsJsonObject();
			String fileStreamId = file.get("streamId").getAsString();
			if (fileStreamId.equals(streamId1)) {
				// Normal recorded user
				Assertions.assertEquals(connectionId1, file.get("connectionId").getAsString(),
						"Wrong connectionId file metadata property");
				long msDuration = file.get("endTimeOffset").getAsLong() - file.get("startTimeOffset").getAsLong();
				Assertions.assertTrue(msDuration - 4000 < 750,
						"Wrong recording duration of individual file. Difference: " + (msDuration - 4000));
				count1++;
			} else if (fileStreamId.equals(streamId2)) {
				// Dynamically recorded user
				Assertions.assertEquals(connectionId2, file.get("connectionId").getAsString(),
						"Wrong connectionId file metadata property");
				long msDuration = file.get("endTimeOffset").getAsLong() - file.get("startTimeOffset").getAsLong();
				Assertions.assertTrue(Math.abs(msDuration - 1000) < 150,
						"Wrong recording duration of individual file. Difference: " + Math.abs(msDuration - 1000));

				String fileName = file.get("name").getAsString();

				boolean found = false;
				Iterator<String> regexNamesIterator = regexNames.iterator();
				while (regexNamesIterator.hasNext()) {
					if (Pattern.compile(regexNamesIterator.next()).matcher(fileName).matches()) {
						found = true;
						regexNamesIterator.remove();
						break;
					}
				}

				Assertions.assertTrue(found,
						"File name " + fileName + " not found among regex " + regexNames.toString());
				count2++;
			} else {
				Assertions.fail("Metadata file element does not belong to a known stream (" + fileStreamId + ")");
			}
		}
		Assertions.assertEquals(1, count1, "Wrong number of recording files for stream " + streamId1);
		Assertions.assertEquals(3, count2, "Wrong number of recording files for stream " + streamId2);
		Assertions.assertTrue(regexNames.isEmpty(), "Some expected file name didn't existed: " + regexNames.toString());
	}

	@Test
	@DisplayName("REST API PRO test")
	void restApiProTest() throws Exception {

		log.info("REST API PRO test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"disabled");
		restartOpenViduServer(config);

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		/**
		 * PATCH /openvidu/api/sessions/<SESSION_ID>/connection/<CONNECTION_ID>
		 **/
		String body = "{'customSessionId': 'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK, true, false, true,
				DEFAULT_JSON_SESSION);
		body = "{'role':'PUBLISHER','record':false,'data':'MY_SERVER_PRO_DATA'}";
		JsonObject res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpURLConnection.HTTP_OK);
		final String token = res.get("token").getAsString();
		final String connectionId = res.get("connectionId").getAsString();
		final long createdAt = res.get("createdAt").getAsLong();

		/** UPDATE PENDING CONNECTION **/

		// Test with REST API
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':false}", HttpURLConnection.HTTP_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':123}", HttpURLConnection.HTTP_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER','record':'WRONG'}", HttpURLConnection.HTTP_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/WRONG/connection/" + connectionId,
				"{'role':'PUBLISHER','record':'WRONG'}", HttpURLConnection.HTTP_NOT_FOUND);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/WRONG",
				"{'role':'PUBLISHER','record':true}", HttpURLConnection.HTTP_NOT_FOUND);

		// No change should return 200. At this point role=PUBLISHER and record=false
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId, "{}",
				HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER'}", HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':false}", HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER','record':false,'data':'OTHER_DATA'}", HttpURLConnection.HTTP_OK);

		// Updating only role should let record value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'MODERATOR'}", HttpURLConnection.HTTP_OK, true, true, true,
				mergeJson(DEFAULT_JSON_PENDING_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','serverData':'MY_SERVER_PRO_DATA','record':false,'token':'"
								+ token + "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + "}",
						new String[0]));
		// Updating only record should let role value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':true}", HttpURLConnection.HTTP_OK, true, true, true,
				mergeJson(DEFAULT_JSON_PENDING_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','serverData':'MY_SERVER_PRO_DATA','token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + "}",
						new String[0]));

		// Test with openvidu-java-client
		OpenVidu OV = new OpenVidu(OpenViduTestAppE2eTest.OPENVIDU_URL, OpenViduTestAppE2eTest.OPENVIDU_SECRET);
		Assertions.assertTrue(OV.fetch(), "OpenVidu object should have changed");
		Session session = OV.getActiveSessions().get(0);
		try {
			session.updateConnection("WRONG_CONNECTION_ID", new ConnectionProperties.Builder().build());
			Assertions.fail("Expected OpenViduHttpException exception");
		} catch (OpenViduHttpException exception) {
			Assertions.assertEquals(HttpURLConnection.HTTP_NOT_FOUND, exception.getStatus(), "Wrong HTTP status");
		}
		Assertions.assertFalse(session.fetch(), "Session object should not have changed");
		Connection connection = session.updateConnection(connectionId,
				new ConnectionProperties.Builder().role(OpenViduRole.SUBSCRIBER).record(false).build());
		Assertions.assertEquals(OpenViduRole.SUBSCRIBER, connection.getRole(), "Wrong role Connection property");
		Assertions.assertFalse(connection.record(), "Wrong record Connection property");
		Assertions.assertEquals("MY_SERVER_PRO_DATA", connection.getServerData(), "Wrong data Connection property");

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-settings-btn-0")).click();
		Thread.sleep(1000);

		// Set token
		WebElement tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
		tokenInput.clear();
		tokenInput.sendKeys(token);
		// Force publishing even SUBSCRIBER
		user.getDriver().findElement(By.id("force-publishing-checkbox")).click();
		user.getDriver().findElement(By.id("save-btn")).click();
		Thread.sleep(1000);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .join-btn")).sendKeys(Keys.ENTER);

		try {
			user.getWaiter().until(ExpectedConditions.alertIsPresent());
			Alert alert = user.getDriver().switchTo().alert();
			Assertions.assertTrue(
					alert.getText().equals("OPENVIDU_PERMISSION_DENIED: You don't have permissions to publish"),
					"Alert does not contain expected text");
			alert.accept();
		} catch (Exception e) {
			Assertions.fail("Alert exception");
		} finally {
			user.getEventManager().resetEventThread(false);
		}
		Thread.sleep(500);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);

		// Session REST API entity should now have "mediaNodeId" property
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null, HttpURLConnection.HTTP_OK,
				true, false, true, mergeJson(DEFAULT_JSON_SESSION, "{'mediaNodeId':'STR'}", new String[0]));

		Assertions.assertTrue(session.fetch(), "Session object should have changed");
		connection = session.getActiveConnections().get(0);
		final Long activeAt = connection.activeAt();
		Assertions.assertTrue(activeAt > createdAt, "activeAt should be greater than createdAt in Connection object");
		Assertions.assertEquals(OpenViduRole.SUBSCRIBER, connection.getRole(), "Wrong role in Connection object");
		Assertions.assertFalse(connection.record(), "Wrong record in Connection object");

		/** UPDATE ACTIVE CONNECTION **/

		// Test with REST API

		// No change should return 200. At this point role=SUBSCRIBER and record=false
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId, "{}",
				HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'SUBSCRIBER'}", HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':false}", HttpURLConnection.HTTP_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'SUBSCRIBER','record':false}", HttpURLConnection.HTTP_OK);

		// Updating only role should let record value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'MODERATOR'}", HttpURLConnection.HTTP_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','record':false,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "ip", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 1);

		// Updating only record should let role value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':true}", HttpURLConnection.HTTP_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "ip", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 2);

		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'SUBSCRIBER','record':true,'data':'OTHER DATA'}", HttpURLConnection.HTTP_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'SUBSCRIBER','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "ip", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 3);

		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER'}", HttpURLConnection.HTTP_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'PUBLISHER','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "ip", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 4);

		// Test with openvidu-node-client
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("connection-id-field")).clear();
		user.getDriver().findElement(By.id("connection-id-field")).sendKeys(connectionId);
		user.getDriver().findElement(By.id("update-connection-api-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Connection updated: {\"role\":\"PUBLISHER\",\"record\":true,\"data\":\"MY_SERVER_PRO_DATA\"}"));
		user.getDriver().findElement(By.id("record-checkbox")).click();
		user.getDriver().findElement(By.id("token-role-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-SUBSCRIBER")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("update-connection-api-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Connection updated: {\"role\":\"SUBSCRIBER\",\"record\":false,\"data\":\"MY_SERVER_PRO_DATA\"}"));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 6);

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		// Test with openvidu-java-client
		Assertions.assertFalse(session.fetch(), "Session object should not have changed");
		try {
			session.updateConnection("WRONG_CONNECTION_ID", new ConnectionProperties.Builder().build());
			Assertions.fail("Expected OpenViduHttpException exception");
		} catch (OpenViduHttpException exception) {
			Assertions.assertEquals(HttpURLConnection.HTTP_NOT_FOUND, exception.getStatus(), "Wrong HTTP status");
		}
		Assertions.assertFalse(session.fetch(), "Session object should not have changed");
		connection = session.updateConnection(connectionId,
				new ConnectionProperties.Builder().role(OpenViduRole.PUBLISHER).build());

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 7);

		Assertions.assertFalse(session.fetch(), "Session object should not have changed");
		Assertions.assertEquals(connectionId, connection.getConnectionId(), "Wrong connectionId in Connection object");
		Assertions.assertEquals(OpenViduRole.PUBLISHER, connection.getRole(), "Wrong role in Connection object");
		Assertions.assertFalse(connection.record(), "Wrong record in Connection object");
		Assertions.assertEquals("active", connection.getStatus(), "Wrong status in Connection object");
		connection = session.updateConnection(connectionId,
				new ConnectionProperties.Builder().role(OpenViduRole.SUBSCRIBER).build());

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 8);

		Assertions.assertEquals(OpenViduRole.SUBSCRIBER, connection.getRole(), "Wrong role in Connection object");
		Assertions.assertFalse(session.fetch(), "Session object should not have changed");
		connection = session.updateConnection(connectionId, new ConnectionProperties.Builder()
				.role(OpenViduRole.MODERATOR).record(false).data("NO CHANGE").build());

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 9);

		Assertions.assertFalse(session.fetch(), "Session object should not have changed");
		Assertions.assertEquals(OpenViduRole.MODERATOR, connection.getRole(), "Wrong role in Connection object");
		Assertions.assertFalse(connection.record(), "Wrong record in Connection object");
		Assertions.assertEquals("MY_SERVER_PRO_DATA", connection.getServerData(), "Wrong data in Connection object");
		Assertions.assertEquals("active", connection.getStatus(), "Wrong status in Connection object");

		user.getEventManager().resetEventThread(true);

		user.getWaiter().until(ExpectedConditions.elementToBeClickable(By.cssSelector(".republish-error-btn")));
		user.getDriver().findElement(By.cssSelector(".republish-error-btn")).click();

		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);

		// connectionId should be equal to the one brought by the token
		Assertions.assertEquals(connectionId,
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
		restClient.rest(HttpMethod.GET, "/openvidu/api/config", null, HttpURLConnection.HTTP_OK, true, false, true,
				"{'VERSION':'STR','DOMAIN_OR_PUBLIC_IP':'STR','HTTPS_PORT':0,'OPENVIDU_EDITION':'STR','OPENVIDU_PUBLICURL':'STR','OPENVIDU_CDR':false,'OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH':0,"
						+ "'OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH':0,'OPENVIDU_WEBRTC_SIMULCAST':false,'OPENVIDU_SESSIONS_GARBAGE_INTERVAL':0,'OPENVIDU_SESSIONS_GARBAGE_THRESHOLD':0,"
						+ "'OPENVIDU_RECORDING':false,'OPENVIDU_RECORDING_VERSION':'STR','OPENVIDU_RECORDING_PATH':'STR','OPENVIDU_RECORDING_PUBLIC_ACCESS':false,'OPENVIDU_RECORDING_NOTIFICATION':'STR',"
						+ "'OPENVIDU_RECORDING_CUSTOM_LAYOUT':'STR','OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT':0,'OPENVIDU_WEBHOOK':false,'OPENVIDU_SERVER_DEPENDENCY_VERSION':'STR','KMS_URIS':[],"
						+ "'OPENVIDU_PRO_STATS_SESSION_INTERVAL':0,'OPENVIDU_PRO_STATS_SERVER_INTERVAL':0,'OPENVIDU_PRO_STATS_MONITORING_INTERVAL':0,'OPENVIDU_PRO_STATS_WEBRTC_INTERVAL':0,'OPENVIDU_PRO_CLUSTER_ID':'STR',"
						+ "'OPENVIDU_PRO_CLUSTER_ENVIRONMENT':'STR','OPENVIDU_PRO_CLUSTER_MEDIA_NODES':0,'OPENVIDU_PRO_CLUSTER_PATH':'STR','OPENVIDU_PRO_CLUSTER_RECONNECTION_TIMEOUT':0,'OPENVIDU_PRO_CLUSTER_AUTOSCALING':false,"
						+ "'OPENVIDU_PRO_ELASTICSEARCH':true,'OPENVIDU_PRO_ELASTICSEARCH_VERSION':'STR','OPENVIDU_PRO_ELASTICSEARCH_HOST':'STR','OPENVIDU_PRO_KIBANA':true,'OPENVIDU_PRO_KIBANA_VERSION':'STR',"
						+ "'OPENVIDU_PRO_KIBANA_HOST':'STR','OPENVIDU_PRO_RECORDING_STORAGE':'STR','OPENVIDU_PRO_NETWORK_QUALITY':false,'OPENVIDU_STREAMS_ALLOW_TRANSCODING':false,'OPENVIDU_STREAMS_FORCED_VIDEO_CODEC':'STR',"
						+ "'OPENVIDU_PRO_SPEECH_TO_TEXT':'STR'}");

		/** GET /openvidu/api/health **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/health", null, HttpURLConnection.HTTP_OK, true, true, true,
				"{'status':'UP','disconnectedMediaNodes':[]}");
	}

	@Test
	@DisplayName("openvidu-java-client PRO test")
	void openViduJavaClientProTest() throws Exception {

		log.info("openvidu-java-client PRO test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"disabled");
		restartOpenViduServer(config);

		// Create default Connection
		Session session = OV.createSession();
		Assertions.assertFalse(session.fetch());
		Connection connectionDefault = session.createConnection();
		Assertions.assertFalse(session.fetch());
		Assertions.assertEquals(OpenViduRole.PUBLISHER, connectionDefault.getRole(), "Wrong role property");
		Assertions.assertTrue(connectionDefault.record(), "Wrong record property");
		Assertions.assertEquals("", connectionDefault.getServerData(), "Wrong data property");
		// Update Connection
		session.updateConnection(connectionDefault.getConnectionId(), new ConnectionProperties.Builder()
				.role(OpenViduRole.SUBSCRIBER).record(false).data("WILL HAVE NO EFFECT").build());
		Assertions.assertEquals(OpenViduRole.SUBSCRIBER, connectionDefault.getRole(), "Wrong role property");
		Assertions.assertFalse(connectionDefault.record(), "Wrong record property");
		Assertions.assertEquals("", connectionDefault.getServerData(), "Wrong data property");
		Assertions.assertFalse(session.fetch());

		// Create custom properties Connection
		long timestamp = System.currentTimeMillis();
		Connection connection = session.createConnection(
				new ConnectionProperties.Builder().record(false).role(OpenViduRole.MODERATOR).data("SERVER_SIDE_DATA")
						.kurentoOptions(new KurentoOptions.Builder().videoMaxRecvBandwidth(555)
								.videoMinRecvBandwidth(555).videoMaxSendBandwidth(555).videoMinSendBandwidth(555)
								.allowedFilters(new String[] { "555" }).build())
						.build());
		Assertions.assertEquals("pending", connection.getStatus(), "Wrong status Connection property");
		Assertions.assertTrue(connection.createdAt() > timestamp, "Wrong createdAt Connection property");
		Assertions.assertTrue(connection.activeAt() == null, "Wrong activeAt Connection property");
		Assertions.assertTrue(connection.getLocation() == null, "Wrong location Connection property");
		Assertions.assertTrue(connection.getPlatform() == null, "Wrong platform Connection property");
		Assertions.assertTrue(connection.getClientData() == null, "Wrong clientData Connection property");
		Assertions.assertTrue(connection.getPublishers().size() == 0, "Wrong publishers Connection property");
		Assertions.assertTrue(connection.getSubscribers().size() == 0, "Wrong subscribers Connection property");
		Assertions.assertTrue(connection.getToken().contains(session.getSessionId()),
				"Wrong token Connection property");
		Assertions.assertEquals(ConnectionType.WEBRTC, connection.getType(), "Wrong type property");
		Assertions.assertEquals("SERVER_SIDE_DATA", connection.getServerData(), "Wrong data property");
		Assertions.assertFalse(connection.record(), "Wrong record property");
		Assertions.assertEquals(OpenViduRole.MODERATOR, connection.getRole(), "Wrong role property");
		Assertions.assertTrue(connection.getRtspUri() == null, "Wrong rtspUri property");
		Assertions.assertTrue(connection.adaptativeBitrate() == null, "Wrong adaptativeBitrate property");
		Assertions.assertTrue(connection.onlyPlayWithSubscribers() == null, "Wrong onlyPlayWithSubscribers property");
		Assertions.assertTrue(connection.getNetworkCache() == null, "Wrong networkCache property");

		try {
			String BROADCAST_IP = TestUtils.startRtmpServer();
			// Start broadcast
			try {
				OV.startBroadcast("NOT_EXISTS", "rtmp://" + BROADCAST_IP + "/live");
				Assertions.fail("Expected OpenViduHttpException exception");
			} catch (OpenViduHttpException exception) {
				Assertions.assertEquals(HttpURLConnection.HTTP_NOT_FOUND, exception.getStatus(), "Wrong HTTP status");
			}
			try {
				OV.startBroadcast(session.getSessionId(), "rtmp://" + BROADCAST_IP + "/live");
				Assertions.fail("Expected OpenViduHttpException exception");
			} catch (OpenViduHttpException exception) {
				Assertions.assertEquals(HttpURLConnection.HTTP_NOT_ACCEPTABLE, exception.getStatus(),
						"Wrong HTTP status");
			}
			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.className("join-btn")).click();
			user.getEventManager().waitUntilEventReaches("streamCreated", 1);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

			Assertions.assertTrue(OV.fetch());
			session = OV.getActiveSession("TestSession");
			Assertions.assertFalse(session.fetch());

			OV.startBroadcast("TestSession", "rtmp://" + BROADCAST_IP + "/live",
					new RecordingProperties.Builder().resolution("1280x800").build());
			user.getEventManager().waitUntilEventReaches("broadcastStarted", 1);
			Assertions.assertFalse(session.fetch());
			Assertions.assertTrue(session.isBeingBroadcasted());

			// Stop broadcast
			try {
				OV.stopBroadcast("NOT_EXISTS");
				Assertions.fail("Expected OpenViduHttpException exception");
			} catch (OpenViduHttpException exception) {
				Assertions.assertEquals(HttpURLConnection.HTTP_NOT_FOUND, exception.getStatus(), "Wrong HTTP status");
			}
			OV.stopBroadcast("TestSession");
			user.getEventManager().waitUntilEventReaches("broadcastStopped", 1);
			Assertions.assertFalse(session.fetch());
			Assertions.assertFalse(session.isBeingBroadcasted());

		} finally {
			TestUtils.stopRtmpServer();
		}
	}

	@Test
	@DisplayName("Network quality test")
	void networkQualityTest() throws Exception {

		log.info("Network quality test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", true,
				"OPENVIDU_PRO_NETWORK_QUALITY_INTERVAL", 5, "OPENVIDU_PRO_SPEECH_TO_TEXT", "disabled");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		JsonObject res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession/connection",
				HttpURLConnection.HTTP_OK);
		final String connectionId = res.getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject()
				.get("id").getAsString();

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();

		final CountDownLatch latch1 = new CountDownLatch(1);
		Queue<Boolean> threadAssertions = new ConcurrentLinkedQueue<Boolean>();
		user.getEventManager().on("networkQualityLevelChanged", (event) -> {
			try {
				threadAssertions.add("networkQualityLevelChanged".equals(event.get("type").getAsString()));
				threadAssertions.add(event.get("oldValue") == null);
				threadAssertions.add(event.has("newValue") && event.get("newValue").getAsInt() > 0
						&& event.get("newValue").getAsInt() < 6);
				latch1.countDown();
			} catch (Exception e) {
				log.error("Error analysing NetworkQualityLevelChangedEvent: {}. {}", e.getCause(), e.getMessage());
				fail("Error analysing NetworkQualityLevelChangedEvent: " + e.getCause() + ". " + e.getMessage());
			}
		});

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);
		user.getEventManager().waitUntilEventReaches("networkQualityLevelChanged", 2);

		if (!latch1.await(30000, TimeUnit.MILLISECONDS)) {
			gracefullyLeaveParticipants(user, 1);
			fail();
			return;
		}

		user.getEventManager().off("networkQualityLevelChanged");
		log.info("Thread assertions: {}", threadAssertions.toString());
		for (Iterator<Boolean> iter = threadAssertions.iterator(); iter.hasNext();) {
			Assertions.assertTrue(iter.next(), "Some Event property was wrong");
			iter.remove();
		}

		// Both events should have publisher's connection ID
		Assertions
				.assertTrue(
						user.getDriver()
								.findElement(By.cssSelector(
										"#openvidu-instance-0 .mat-expansion-panel:last-child .event-content"))
								.getAttribute("textContent").contains(connectionId),
						"Wrong connectionId in event NetworkQualityLevelChangedEvent");
		Assertions
				.assertTrue(
						user.getDriver()
								.findElement(By.cssSelector(
										"#openvidu-instance-1 .mat-expansion-panel:last-child .event-content"))
								.getAttribute("textContent").contains(connectionId),
						"Wrong connectionId in event NetworkQualityLevelChangedEvent");

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Virtual Background test")
	void virtualBackgroundTest() throws Exception {

		log.info("Virtual Background test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"disabled");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeVirtualBackgroundFakeVideo");

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		user.getDriver().findElement(By.cssSelector(".other-operations-btn")).click();
		Thread.sleep(1000);

		WebElement filterTypeInput = user.getDriver().findElement(By.id("filter-type-field"));
		filterTypeInput.clear();

		// Blur filter
		filterTypeInput.sendKeys("VB:blur");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter applied"));
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter removed"));
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter applied"));
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Error [There is already a filter applied"));
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter removed"));
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"has no filter applied"));
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"has no filter applied"));

		// Image filter
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video"));
		Map<String, Long> rgb = user.getBrowserUser().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));

		// Green
		Assertions.assertTrue((rgb.get("r") < 150) && (rgb.get("g") > 240) && (rgb.get("b") < 100));

		filterTypeInput.clear();
		filterTypeInput.sendKeys("VB:image");
		WebElement filterOptionsInput = user.getDriver().findElement(By.id("filter-options-field"));
		filterOptionsInput.clear();
		filterOptionsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/not_exists.jpg\"}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Error loading background image"));

		filterOptionsInput = user.getDriver().findElement(By.id("filter-options-field"));
		filterOptionsInput.clear();
		filterOptionsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/red.jpg\"}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter applied"));

		rgb = user.getBrowserUser().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));

		// Red
		Assertions.assertTrue((rgb.get("r") > 250) && (rgb.get("g") < 10) && (rgb.get("b") < 40));

		// Fail exec method
		WebElement filterMethodInput = user.getDriver().findElement(By.id("filter-method-field"));
		filterMethodInput.clear();
		filterMethodInput.sendKeys("no_existing_method");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Unknown Virtual Background method"));

		// Fail exec method params
		filterMethodInput.clear();
		filterMethodInput.sendKeys("update");
		WebElement filterParamsInput = user.getDriver().findElement(By.id("filter-params-field"));
		filterParamsInput.clear();
		filterParamsInput.sendKeys("wrong_params");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Wrong params syntax"));
		filterParamsInput.clear();
		filterParamsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/not_exists.jpg\"}");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Error loading background image"));

		// Blue
		filterParamsInput.clear();
		filterParamsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/blue.jpg\"}");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Filter method executed"));
		rgb = user.getBrowserUser().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));
		Assertions.assertTrue((rgb.get("r") < 10) && (rgb.get("g") < 10) && (rgb.get("b") > 240));

		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter removed"));

		rgb = user.getBrowserUser().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));

		// Green
		Assertions.assertTrue((rgb.get("r") < 150) && (rgb.get("g") > 240) && (rgb.get("b") < 100));

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Service disabled STT test")
	void serviceDisabledSttTest() throws Exception {

		log.info("Service disabled STT test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"disabled");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		user.getDriver().findElement(By.cssSelector(".other-operations-btn")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.cssSelector("#sub-stt-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Speech To Text service is not enabled"));

		user.getDriver().findElement(By.id("clear-response-text-area-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", ""));

		user.getDriver().findElement(By.cssSelector("#unsub-stt-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Speech To Text service is not enabled"));
	}

	@Test
	@DisplayName("Simple transcription STT test")
	void simpleTranscriptionSttTest() throws Exception {

		log.info("Simple transcription STT test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		commonEnUsTranscriptionTest(user);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Close session STT test")
	void closeSessionSttTest() throws Exception {

		log.info("Close session STT test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		this.sttSubUser(user, 0, 0, "en-US", true, true);
		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 5);

		CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
				OpenViduTestAppE2eTest.OPENVIDU_SECRET);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession", HttpURLConnection.HTTP_NO_CONTENT);

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);

		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 2);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		final CountDownLatch latch = new CountDownLatch(2);

		List<JsonObject> sttEvents = new ArrayList<>();
		user.getEventManager().on("speechToTextMessage", (event) -> {
			sttEvents.add(event);
			if ("recognized".equals(event.get("reason").getAsString())) {
				latch.countDown();
			}
		});

		this.sttSubUser(user, 0, 0, "en-US", true, true);

		if (!latch.await(80, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for recognized STT events");
		}

		boolean twoConsecutiveRecognizedElements = false;
		int i = 0;
		while (!twoConsecutiveRecognizedElements && (i < (sttEvents.size() - 1))) {
			twoConsecutiveRecognizedElements = "recognized".equals(sttEvents.get(i).get("reason").getAsString())
					&& "recognized".equals(sttEvents.get(i + 1).get("reason").getAsString());
			i++;
		}
		if (twoConsecutiveRecognizedElements) {
			Assertions.fail("There are two consecutive recognized STT events. First text: \""
					+ sttEvents.get(i - 1).get("text").getAsString() + "\" | Second text: \""
					+ sttEvents.get(i).get("text").getAsString() + "\"");
		}

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Expected errors STT test")
	void expectedErrorsSttTest() throws Exception {

		log.info("Expected errors STT test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
				OpenViduTestAppE2eTest.OPENVIDU_SECRET);
		String connectionId = restClient
				.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession", HttpURLConnection.HTTP_OK)
				.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject()
				.get("connectionId").getAsString();

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .publish-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 3);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		this.sttSubUser(user, 0, 0, "en-US", true, false);

		WebElement sttSubBtn = user.getDriver().findElement(By.cssSelector("#sub-stt-btn"));
		WebElement sttUnsubBtn = user.getDriver().findElement(By.cssSelector("#unsub-stt-btn"));

		sttSubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Already subscribed to Speech To Text events for Connection " + connectionId + " in language en-US"));

		WebElement langInput = user.getDriver().findElement(By.cssSelector("#stt-lang-field"));
		langInput.clear();
		langInput.sendKeys("es-ES");

		sttSubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Already subscribed to Speech To Text events for Connection " + connectionId + " in language en-US"));

		sttUnsubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value",
				"Unsubscribed from STT"));

		sttUnsubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Session TestSession has no speech to text subscriptions"));

		sttSubBtn.click();
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", "Subscribed to STT"));

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		this.sttSubUser(user, 1, 0, "en-US", true, false);

		sttSubBtn = user.getDriver().findElement(By.cssSelector("#sub-stt-btn"));
		sttUnsubBtn = user.getDriver().findElement(By.cssSelector("#unsub-stt-btn"));

		sttSubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Already subscribed to Speech To Text events for Connection " + connectionId + " in language en-US"));

		sttUnsubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value",
				"Unsubscribed from STT"));
		sttUnsubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"There is no active Speech To Text subscriptions for Connection"));

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("1 session 1 stream 2 subscriptions 1 language STT test")
	void oneSessionOneStreamTwoSubscriptionsOneLanguageSttTest() throws Exception {

		log.info("1 session 1 stream 2 subscriptions 1 language STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches(0, "connectionCreated", 2);
		user.getEventManager().waitUntilEventReaches(0, "accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches(0, "streamCreated", 1);
		user.getEventManager().waitUntilEventReaches(0, "streamPlaying", 1);

		final String connectionId = getOwnConnectionId(user, 0);

		user.getEventManager().waitUntilEventReaches(1, "connectionCreated", 2);
		user.getEventManager().waitUntilEventReaches(1, "streamCreated", 1);
		user.getEventManager().waitUntilEventReaches(1, "streamPlaying", 1);

		List<JsonObject> firstUserStts = new ArrayList<>();
		List<JsonObject> secondUserStts = new ArrayList<>();
		user.getEventManager().on(0, "speechToTextMessage", e -> {
			firstUserStts.add(e);
		});
		user.getEventManager().on(1, "speechToTextMessage", e -> {
			secondUserStts.add(e);
		});

		sttSubUser(user, 0, 0, "en-US", true, true);
		sttSubUser(user, 1, 0, "en-US", true, false);

		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 10);
		user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 10);

		user.getEventManager().off(0, "speechToTextMessage");
		user.getEventManager().off(1, "speechToTextMessage");

		sttUnsubUser(user, 1, 0, false, true);
		sttUnsubUser(user, 0, 0, true, false);

		final List<JsonObject> finalFirstUserStts = new ArrayList<>();
		final List<JsonObject> finalSecondUserStts = new ArrayList<>();
		finalFirstUserStts.addAll(firstUserStts);
		finalSecondUserStts.addAll(secondUserStts);

		for (JsonObject event : finalFirstUserStts) {
			Assertions.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assertions.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("1 session 2 streams 2 subscriptions 1 language STT test")
	void oneSessionTwoStreamsTwoSubscriptionsOneLanguageSttTest() throws Exception {

		log.info("1 session 2 streams 2 subscriptions 1 language STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("add-user-btn")).click();

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .subscribe-checkbox")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .subscribe-checkbox")).click();
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		final String connectionId1 = getOwnConnectionId(user, 0);
		final String connectionId2 = getOwnConnectionId(user, 1);

		List<JsonObject> firstUserStts = new ArrayList<>();
		List<JsonObject> secondUserStts = new ArrayList<>();
		user.getEventManager().on(0, "speechToTextMessage", e -> {
			firstUserStts.add(e);
		});
		user.getEventManager().on(1, "speechToTextMessage", e -> {
			secondUserStts.add(e);
		});

		sttSubUser(user, 0, 0, "en-US", true, true);
		sttSubUser(user, 1, 0, "en-US", true, false);

		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 10);
		user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 10);

		user.getEventManager().off(0, "speechToTextMessage");
		user.getEventManager().off(1, "speechToTextMessage");

		sttUnsubUser(user, 1, 0, false, true);
		sttUnsubUser(user, 0, 0, true, false);

		final List<JsonObject> finalFirstUserStts = new ArrayList<>();
		final List<JsonObject> finalSecondUserStts = new ArrayList<>();
		finalFirstUserStts.addAll(firstUserStts);
		finalSecondUserStts.addAll(secondUserStts);

		for (JsonObject event : finalFirstUserStts) {
			Assertions.assertEquals(connectionId1,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assertions.assertEquals(connectionId2,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("1 session 1 stream 2 subscriptions 2 languages STT test")
	void oneSessionOneStreamTwoSubscriptionsTwoLanguageSttTest() throws Exception {

		log.info("1 session 1 stream 2 subscriptions 2 languages STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		WebElement oneToManyInput = user.getDriver().findElement(By.id("one2many-input"));
		oneToManyInput.clear();
		oneToManyInput.sendKeys("1");
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		final String connectionId = getOwnConnectionId(user, 0);

		List<JsonObject> firstUserStts = new ArrayList<>();
		List<JsonObject> secondUserStts = new ArrayList<>();
		user.getEventManager().on(0, "speechToTextMessage", e -> {
			firstUserStts.add(e);
		});
		user.getEventManager().on(1, "speechToTextMessage", e -> {
			secondUserStts.add(e);
		});

		sttSubUser(user, 0, 0, "en-US", true, true);
		sttSubUser(user, 1, 0, "es-ES", true, false);

		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 10);
		user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 10);

		user.getEventManager().off(0, "speechToTextMessage");
		user.getEventManager().off(1, "speechToTextMessage");

		sttUnsubUser(user, 1, 0, false, true);
		sttUnsubUser(user, 0, 0, true, false);

		final List<JsonObject> finalFirstUserStts = new ArrayList<>();
		final List<JsonObject> finalSecondUserStts = new ArrayList<>();
		finalFirstUserStts.addAll(firstUserStts);
		finalSecondUserStts.addAll(secondUserStts);

		for (JsonObject event : finalFirstUserStts) {
			Assertions.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assertions.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("es-ES", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("1 session 2 streams 2 subscriptions 2 languages STT test")
	void oneSessionTwoStreamsTwoSubscriptionsTwoLanguagesSttTest() throws Exception {

		log.info("1 session 2 streams 2 subscriptions 2 languages STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("add-user-btn")).click();

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);

		final String connectionId1 = getOwnConnectionId(user, 0);
		final String connectionId2 = getOwnConnectionId(user, 1);

		List<JsonObject> firstUserStts = new ArrayList<>();
		List<JsonObject> secondUserStts = new ArrayList<>();
		user.getEventManager().on(0, "speechToTextMessage", e -> {
			firstUserStts.add(e);
		});
		user.getEventManager().on(1, "speechToTextMessage", e -> {
			secondUserStts.add(e);
		});

		sttSubUser(user, 0, 1, "es-ES", true, true);
		sttSubUser(user, 1, 1, "en-US", true, false);

		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 10);
		user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 10);

		user.getEventManager().off(0, "speechToTextMessage");
		user.getEventManager().off(1, "speechToTextMessage");

		sttUnsubUser(user, 1, 1, false, true);
		sttUnsubUser(user, 0, 1, true, false);

		final List<JsonObject> finalFirstUserStts = new ArrayList<>();
		final List<JsonObject> finalSecondUserStts = new ArrayList<>();
		finalFirstUserStts.addAll(firstUserStts);
		finalSecondUserStts.addAll(secondUserStts);

		for (JsonObject event : finalFirstUserStts) {
			Assertions.assertEquals(connectionId2,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("es-ES", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assertions.assertEquals(connectionId1,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("2 sessions 2 streams 2 subscriptions 1 language STT test")
	void twoSessionsTwoStreamsTwoSubscriptionsOneLanguageSttTest() throws Exception {

		log.info("2 sessions 2 streams 2 subscriptions 1 language STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);

		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("add-user-btn")).click();

		user.getDriver().findElement(By.id("session-name-input-1")).clear();
		user.getDriver().findElement(By.id("session-name-input-1")).sendKeys("OtherSession");

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));

		user.getEventManager().waitUntilEventReaches(0, "connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches(0, "accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches(0, "streamCreated", 1);
		user.getEventManager().waitUntilEventReaches(0, "streamPlaying", 1);

		user.getEventManager().waitUntilEventReaches(1, "connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches(1, "accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches(1, "streamCreated", 1);
		user.getEventManager().waitUntilEventReaches(1, "streamPlaying", 1);

		final String connectionId1 = getOwnConnectionId(user, 0);
		final String connectionId2 = getOwnConnectionId(user, 1);

		List<JsonObject> firstUserStts = new ArrayList<>();
		List<JsonObject> secondUserStts = new ArrayList<>();
		user.getEventManager().on(0, "speechToTextMessage", e -> {
			firstUserStts.add(e);
		});
		user.getEventManager().on(1, "speechToTextMessage", e -> {
			secondUserStts.add(e);
		});

		sttSubUser(user, 0, 0, "en-US", true, true);
		sttSubUser(user, 1, 0, "en-US", true, false);

		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 5);
		user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 5);

		final List<JsonObject> finalFirstUserStts = new ArrayList<>();
		final List<JsonObject> finalSecondUserStts = new ArrayList<>();
		finalFirstUserStts.addAll(firstUserStts);
		finalSecondUserStts.addAll(secondUserStts);

		for (JsonObject event : finalFirstUserStts) {
			Assertions.assertEquals(connectionId1,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assertions.assertEquals(connectionId2,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}
	}

	@Test
	@DisplayName("4 sessions 4 streams 4 subscriptions 4 languages STT test")
	void fourSessionsFourStreamsFourSubscriptionsFourLanguageSttTest() throws Exception {

		log.info("4 sessions 4 streams 4 subscriptions 4 languages STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);

		List<List<JsonObject>> stts = new ArrayList<>(4);
		List<String> connectionIds = new ArrayList<>(4);
		List<String> languages = Arrays.asList(new String[] { "en-US", "es-ES", "it-IT", "fr-FR" });

		for (int i = 0; i < 4; i++) {
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-name-input-" + i)).clear();
			user.getDriver().findElement(By.id("session-name-input-" + i)).sendKeys("TestSession" + i);
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + i + " .join-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches(i, "connectionCreated", 1);
			user.getEventManager().waitUntilEventReaches(i, "accessAllowed", 1);
			user.getEventManager().waitUntilEventReaches(i, "streamCreated", 1);
			user.getEventManager().waitUntilEventReaches(i, "streamPlaying", 1);

			connectionIds.add(i, getOwnConnectionId(user, i));
		}

		for (int i = 0; i < 4; i++) {
			List<JsonObject> sttList = new ArrayList<>();
			stts.add(i, sttList);
			user.getEventManager().on(i, "speechToTextMessage", e -> {
				sttList.add(e);
			});
			sttSubUser(user, i, 0, languages.get(i), true, true);
		}

		for (int i = 0; i < 4; i++) {
			user.getEventManager().waitUntilEventReaches(i, "speechToTextMessage", 4);
		}

		for (int i = 0; i < 4; i++) {
			final List<JsonObject> finalStts = new ArrayList<>();
			finalStts.addAll(stts.get(i));
			for (JsonObject event : finalStts) {
				Assertions.assertEquals(connectionIds.get(i),
						event.get("connection").getAsJsonObject().get("connectionId").getAsString());
				Assertions.assertEquals(languages.get(i), event.get("lang").getAsString());
				Assertions.assertFalse(event.get("text").getAsString().isBlank());
				Assertions.assertFalse(event.get("raw").getAsString().isBlank());
			}
		}
	}

	@Test
	@DisplayName("COMPOSED recording and STT test")
	void composedRecordingAndSttTest() throws Exception {

		isRecordingTest = true;

		log.info("COMPOSED recording and STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		final String sessionName = "COMPOSED_RECORDED_SESSION";
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-0")).clear();
		user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.id("start-recording-btn")).click();

		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording started [" + sessionName + "]"));

		user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		this.sttSubUser(user, 0, 0, "en-US", true, true);

		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 5);

		Assertions.assertEquals(1, user.getEventManager().getNumEvents("connectionCreated").get(),
				"Wrong number of connectionCreated events");

		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("recording-id-field")).sendKeys(sessionName);
		user.getDriver().findElement(By.id("stop-recording-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Recording stopped [" + sessionName + "]"));
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		Assertions.assertEquals(1, user.getEventManager().getNumEvents("connectionCreated").get(),
				"Wrong number of connectionCreated events");

		// After stopping composed recording speechToText events should keep coming
		user.getEventManager().clearAllCurrentEvents(0);
		user.getEventManager().clearAllCurrentEvents();
		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 4);

		// After unsubscription no more STT events should be received
		this.sttUnsubUser(user, 0, 0, true, true);
		user.getEventManager().clearAllCurrentEvents(0);
		user.getEventManager().clearAllCurrentEvents();
		Thread.sleep(3000);
		Assertions.assertEquals(user.getEventManager().getNumEvents("speechToTextMessage").intValue(), 0);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Memory leak STT test")
	void memoryLeakSttTest() throws Exception {

		log.info("Memory leak STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		final String connectionId = getOwnConnectionId(user, 0);

		final int LOOPS = 20;

		this.sttSubUser(user, 0, 0, "en-US", true, false);
		for (int i = 0; i < LOOPS; i++) {
			this.sttUnsubUser(user, 0, 0, false, false);
			this.sttSubUser(user, 0, 0, "en-US", false, false);
		}

		Assertions.assertEquals(1, user.getEventManager().getNumEvents("connectionCreated").get(),
				"Wrong number of connectionCreated events");

		user.getEventManager().clearAllCurrentEvents(0);
		user.getEventManager().clearAllCurrentEvents();

		final CountDownLatch latch = new CountDownLatch(1);
		List<JsonObject> stts = new ArrayList<>();
		user.getEventManager().on(0, "speechToTextMessage", e -> {
			stts.add(e);
			if ("recognized".equals(e.get("reason").getAsString())) {
				latch.countDown();
			}
		});

		if (!latch.await(80, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for recognized STT events");
		}

		final List<JsonObject> finalStts = new ArrayList<>();
		finalStts.addAll(stts);

		for (JsonObject event : finalStts) {
			Assertions.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assertions.assertEquals("en-US", event.get("lang").getAsString());
			Assertions.assertFalse(event.get("text").getAsString().isBlank());
			Assertions.assertFalse(event.get("raw").getAsString().isBlank());
		}
	}

	@Test
	@DisplayName("Crash service STT test")
	void crashServiceSttTest() throws Exception {

		log.info("Crash service STT test");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		this.sttSubUser(user, 0, 0, "en-US", true, false);

		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 2);

		CountDownLatch latch = new CountDownLatch(1);
		JsonObject[] exceptionEvent = new JsonObject[1];

		user.getEventManager().on("exception", e -> {
			exceptionEvent[0] = e;
			latch.countDown();
		});

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		String containerId = restClient.rest(HttpMethod.GET, "/openvidu/api/media-nodes", HttpURLConnection.HTTP_OK)
				.get("content").getAsJsonArray().get(0).getAsJsonObject().get("environmentId").getAsString();
		this.killSttService(containerId);

		latch.await();

		WebElement sttSubBtn = user.getDriver().findElement(By.cssSelector("#sub-stt-btn"));
		sttSubBtn.click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
				"Error [io.grpc.StatusRuntimeException: UNAVAILABLE: io exception. Code: 201]"));

		user.getEventManager().waitUntilEventReaches("exception", 1);

		Assertions.assertEquals("SPEECH_TO_TEXT_DISCONNECTED", exceptionEvent[0].get("name").getAsString(),
				"Wrong exception event name");
		Assertions.assertEquals("Network closed for unknown reason", exceptionEvent[0].get("message").getAsString(),
				"Wrong exception event message");

		user.getEventManager().clearAllCurrentEvents(0);
		user.getEventManager().clearAllCurrentEvents();

		int maxWaitMs = 15000;
		int intervalWaitMs = 1000;
		int maxLoops = maxWaitMs / intervalWaitMs;
		int loop = 0;
		boolean sttReconstructed = false;
		By responseTextAreaBy = By.id("operation-response-text-area");
		WebElement responseTextArea = user.getDriver().findElement(responseTextAreaBy);

		while (loop < maxLoops && !sttReconstructed) {
			loop++;
			user.getDriver().findElement(By.id("clear-response-text-area-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeToBe(responseTextAreaBy, "value", ""));
			sttSubBtn.click();
			user.getWaiter().until(ExpectedConditions.attributeToBeNotEmpty(responseTextArea, "value"));
			String text = user.getDriver().findElement(responseTextAreaBy).getAttribute("value");
			if (!"Subscribed to STT".equals(text)) {
				Assertions.assertEquals("Error [io.grpc.StatusRuntimeException: UNAVAILABLE: io exception. Code: 201]",
						text, "Wrong error message on subscribe STT after STT crash");
				Thread.sleep(intervalWaitMs);
			} else {
				sttReconstructed = true;
			}
		}

		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 2);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Unpublish STT Test")
	void unpublishSttTest() throws Exception {

		log.info("Unpublish STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches(0, "streamCreated", 1);
		user.getEventManager().waitUntilEventReaches(0, "streamPlaying", 1);

		final String lang = "fr-FR";

		CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
				OpenViduTestAppE2eTest.OPENVIDU_SECRET);
		String connectionId = restClient
				.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession", HttpURLConnection.HTTP_OK)
				.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject()
				.get("connectionId").getAsString();

		sttSubUser(user, 0, 0, lang, true, true);

		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 2);

		WebElement publishButton = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .pub-btn"));

		publishButton.click();
		user.getEventManager().waitUntilEventReaches(0, "streamDestroyed", 1);
		publishButton.click();
		user.getEventManager().waitUntilEventReaches(0, "streamCreated", 2);
		user.getEventManager().waitUntilEventReaches(0, "streamPlaying", 2);

		sttSubUser(user, 0, 0, lang, true, false, "Error [Already subscribed to Speech To Text events for Connection "
				+ connectionId + " in language " + lang + ". Code: 201]");
		sttUnsubUser(user, 0, 0, false, false);
		sttSubUser(user, 0, 0, lang, false, true);

		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 6);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Default Languages STT Test")
	void defaultLanguagesSttTest() throws Exception {

		log.info("Default languages STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"on_demand");
		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches(0, "streamCreated", 1);
		user.getEventManager().waitUntilEventReaches(0, "streamPlaying", 1);

		Set<String> defaultLangs = new HashSet<>(Arrays.asList("en-US", "es-ES", "fr-FR", "de-DE", "pt-PT", "it-IT",
				"nl-NL", "ca-ES", "ja-JP", "zh-CN", "hi-IN"));

		int index = -1;
		for (String lang : defaultLangs) {
			index++;
			CountDownLatch latch = new CountDownLatch(1);
			JsonObject[] ev = new JsonObject[1];
			user.getEventManager().on("speechToTextMessage", event -> {
				user.getEventManager().off("speechToTextMessage");
				ev[0] = event;
				latch.countDown();
			});
			sttSubUser(user, 0, 0, lang, index == 0, false);
			if (!latch.await(10, TimeUnit.SECONDS)) {
				fail("Error waiting for speech to text event for lang " + lang);
				break;
			}
			Assertions.assertEquals(lang, ev[0].get("lang").getAsString());
			sttUnsubUser(user, 0, 0, false, index == defaultLangs.size() - 1);
			user.getEventManager().clearAllCurrentEvents();
		}

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Custom language STT Test")
	void customLanguageSttTest() throws Exception {

		log.info("Custom language STT");

		final String CUSTOM_LANG = "vi-VN";

		Map<String, Object> config = new HashMap<>();
		config.put("OPENVIDU_PRO_NETWORK_QUALITY", false);
		config.put("OPENVIDU_PRO_SPEECH_TO_TEXT", OPENVIDU_PRO_SPEECH_TO_TEXT);
		config.put("OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY", "on_demand");
		config.put("OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE", "openvidu/speech-to-text-custom:master");

		if (DOCKERHUB_PRIVATE_REGISTRY_PASSWORD != null && !"not_valid".equals(DOCKERHUB_PRIVATE_REGISTRY_PASSWORD)) {
			config.put("OPENVIDU_PRO_DOCKER_REGISTRIES", "[\"serveraddress=docker.io,username=openvidu,password="
					+ DOCKERHUB_PRIVATE_REGISTRY_PASSWORD + "\"]");
		}

		restartOpenViduServer(config);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches(0, "streamCreated", 1);
		user.getEventManager().waitUntilEventReaches(0, "streamPlaying", 1);

		CountDownLatch latch = new CountDownLatch(1);
		JsonObject[] ev = new JsonObject[1];
		user.getEventManager().on("speechToTextMessage", event -> {
			user.getEventManager().off("speechToTextMessage");
			ev[0] = event;
			latch.countDown();
		});

		sttSubUser(user, 0, 0, CUSTOM_LANG, true, true);

		if (!latch.await(10, TimeUnit.SECONDS)) {
			fail("Error waiting for speech to text event for lang " + CUSTOM_LANG);
		}

		Assertions.assertEquals(CUSTOM_LANG, ev[0].get("lang").getAsString());

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("REST API STT Test")
	void restApiSttTest() throws Exception {

		isSttManualTest = true;

		log.info("REST API STT");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		// STT disabled
		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"disabled");
		restartOpenViduServer(config);

		String body = "{'lang': 'en-US', 'mediaNode': {'id': 'NOT_EXISTS'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body,
				HttpURLConnection.HTTP_NOT_IMPLEMENTED);
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_NOT_IMPLEMENTED);

		// STT Vosk manual

		config = Map.of("OPENVIDU_PRO_SPEECH_TO_TEXT", "vosk", "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
				"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
				"manual");
		restartOpenViduServer(config);

		/**
		 * POST /openvidu/api/speech-to-text/load ERROR
		 **/
		// No lang, no Media Node
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_BAD_REQUEST);
		// No Media Node
		body = "{'lang': 'en-US'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_BAD_REQUEST);
		// Non-existing Media Node
		body = "{'lang': 'en-US', 'mediaNode': {'id': 'NOT_EXISTS'}}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_BAD_REQUEST);
		// No lang
		body = "{'mediaNode': {'id': 'NOT_EXISTS'}}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_BAD_REQUEST);
		// Non-existing lang
		body = "{'lang': 'not-EXISTS', 'mediaNode': {'id': 'loquesea'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_BAD_REQUEST);

		/**
		 * POST /openvidu/api/speech-to-text/unload ERROR
		 **/
		// No lang, no Media Node
		body = "{}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		// No Media Node
		body = "{'lang': 'en-US'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		// Non-existing Media Node
		body = "{'lang': 'en-US', 'mediaNode': {'id': 'NOT_EXISTS'}}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		// No lang
		body = "{'mediaNode': {'id': 'NOT_EXISTS'}}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		// Non-existing lang
		body = "{'lang': 'not-EXISTS', 'mediaNode': {'id': 'loquesea'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_REQUEST);

		JsonArray mediaNodes = restClient
				.rest(HttpMethod.GET, "/openvidu/api/media-nodes", null, HttpURLConnection.HTTP_OK).get("content")
				.getAsJsonArray();
		String mediaNodeId = mediaNodes.get(0).getAsJsonObject().get("id").getAsString();

		/**
		 * POST /openvidu/api/speech-to-text/load
		 **/
		// Existing Media Node but no lang
		body = "{'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_BAD_REQUEST);
		// Non-existing lang
		body = "{'lang':'not-EXISTS', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_NOT_FOUND);
		// OK
		body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);
		// lang already loaded
		body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_CONFLICT);
		// OK
		body = "{'lang':'es-ES', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		sttSubUser(user, 0, 0, "es-ES", true, true);

		// 405
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_METHOD);

		gracefullyLeaveParticipants(user, 1);

		// Wait some time for the STT subscription to be closed
		Thread.sleep(1500);

		// 409: "manual" does not automatic unload lang model
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_CONFLICT);

		/**
		 * POST /openvidu/api/speech-to-text/unload
		 **/
		// Existing Media Node but no lang
		body = "{'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_REQUEST);
		// Non-existing lang
		body = "{'lang':'not-EXISTS', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_NOT_FOUND);
		// Existing lang but not loaded
		body = "{'lang':'it-IT', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_CONFLICT);
		// OK
		body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_OK);
		// Existing lang but not loaded
		body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_CONFLICT);
		// OK
		body = "{'lang':'es-ES', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_OK);

		// STT Vosk on_demand
		config = Map.of("OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY", "on_demand");
		restartOpenViduServer(config);

		// 200
		body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);
		// 409
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_CONFLICT);
		// 200
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_OK);
		// 409
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_CONFLICT);

		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);

		user.getEventManager().clearAllCurrentEvents();
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		sttSubUser(user, 0, 0, "en-US", true, true);

		// 405
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_METHOD);

		gracefullyLeaveParticipants(user, 1);

		// Wait some time for the STT subscription to be closed
		Thread.sleep(1500);

		// 409: "on_demand" automatic unload of lang model
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_CONFLICT);
	}

	@Test
	@DisplayName("Load Unload Model Error STT Test")
	void loadUnloadModelErrorSttTest() throws Exception {

		isSttManualTest = true;

		log.info("Load Unload Model Error STT");

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"vosk", "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE", "openvidu/speech-to-text-service:master",
				"OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY", "manual");
		restartOpenViduServer(config);

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		JsonArray mediaNodes = restClient
				.rest(HttpMethod.GET, "/openvidu/api/media-nodes", null, HttpURLConnection.HTTP_OK).get("content")
				.getAsJsonArray();
		String mediaNodeId = mediaNodes.get(0).getAsJsonObject().get("id").getAsString();

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .subscribe-checkbox")).click();
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElements(By.className("join-btn")).forEach(btn -> btn.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("streamCreated", 3);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 3);

		sttSubUser(user, 0, 0, "en-US", true, false,
				"Vosk model for language \"en-US\" is not loaded and OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY is \"manual\"",
				false);

		String body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);

		sttSubUser(user, 0, 0, "en-US", false, true);

		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 2);

		sttSubUser(user, 1, 1, "es-ES", true, false,
				"Vosk model for language \"es-ES\" is not loaded and OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY is \"manual\"",
				false);

		// First participant still receiving STT events
		user.getEventManager().clearAllCurrentEvents(0);
		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 4);

		body = "{'lang':'es-ES', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);

		sttSubUser(user, 1, 1, "es-ES", false, true);

		user.getEventManager().clearAllCurrentEvents(0);
		user.getEventManager().clearAllCurrentEvents(1);
		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 4);
		user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 4);

		// 405
		body = "{'lang':'es-ES', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_METHOD);
		body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNodeId + "'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_BAD_METHOD);

		user.getEventManager().clearAllCurrentEvents(0);
		user.getEventManager().clearAllCurrentEvents(1);
		user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 4);
		user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 4);

		sttSubUser(user, 1, 0, "en-US", true, true);

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("AWS lang STT Test")
	void awsLangSttTest() throws Exception {

		log.info("AWS lang STT");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT", "aws",
				"OPENVIDU_PRO_AWS_ACCESS_KEY", AWS_ACCESS_KEY_ID, "OPENVIDU_PRO_AWS_SECRET_KEY", AWS_SECRET_ACCESS_KEY,
				"OPENVIDU_PRO_AWS_REGION", AWS_REGION);
		restartOpenViduServer(config);

		String body = "{'lang': 'en-US', 'mediaNode': {'id': 'NOT_EXISTS'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body,
				HttpURLConnection.HTTP_NOT_IMPLEMENTED);
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_NOT_IMPLEMENTED);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		commonEnUsTranscriptionTest(user);

		// Test non-existing language
		sttSubUser(user, 0, 0, "no-EXIST", true, true, "AWS Transcribe does not support language \"no-EXIST\"", false);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Azure lang STT Test")
	void azureLangSttTest() throws Exception {

		log.info("Azure lang STT");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
				"azure", "OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_KEY", OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_KEY,
				"OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_REGION", OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_REGION);
		restartOpenViduServer(config);

		String body = "{'lang': 'en-US', 'mediaNode': {'id': 'NOT_EXISTS'}}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body,
				HttpURLConnection.HTTP_NOT_IMPLEMENTED);
		restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
				HttpURLConnection.HTTP_NOT_IMPLEMENTED);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		commonEnUsTranscriptionTest(user);

		// Test non-existing language
		sttSubUser(user, 0, 0, "no-EXIST", true, true, "Azure Speech to Text does not support language \"no-EXIST\"",
				false);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Multiple Media Nodes STT Test")
	void multipleMediaNodesSttTest() throws Exception {

		isSttManualTest = true;

		log.info("Multiple Media Nodes STT Test");

		try {

			Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
					OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
					"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
					"manual", "OPENVIDU_PRO_CLUSTER_MEDIA_NODES", 3);
			restartOpenViduServer(config);

			CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

			JsonArray mediaNodes = restClient
					.rest(HttpMethod.GET, "/openvidu/api/media-nodes", null, HttpURLConnection.HTTP_OK).get("content")
					.getAsJsonArray();
			final String mediaNode1 = mediaNodes.get(0).getAsJsonObject().get("id").getAsString();
			final String mediaNode2 = mediaNodes.get(1).getAsJsonObject().get("id").getAsString();
			final String mediaNode3 = mediaNodes.get(2).getAsJsonObject().get("id").getAsString();

			String body = "{'mediaNode':{'id':'" + mediaNode1 + "'}}";
			final String sessionId1 = restClient
					.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK).get("id")
					.getAsString();
			body = "{'mediaNode':{'id':'" + mediaNode2 + "'}}";
			final String sessionId2 = restClient
					.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK).get("id")
					.getAsString();
			body = "{'mediaNode':{'id':'" + mediaNode3 + "'}}";
			final String sessionId3 = restClient
					.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK).get("id")
					.getAsString();

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
			user.getDriver().get(APP_URL);
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("add-user-btn")).click();

			user.getDriver().findElement(By.id("session-name-input-0")).clear();
			user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionId1);
			user.getDriver().findElement(By.id("session-name-input-1")).clear();
			user.getDriver().findElement(By.id("session-name-input-1")).sendKeys(sessionId2);
			user.getDriver().findElement(By.id("session-name-input-2")).clear();
			user.getDriver().findElement(By.id("session-name-input-2")).sendKeys(sessionId3);

			user.getDriver().findElements(By.cssSelector(".join-btn")).forEach(btn -> btn.click());
			user.getEventManager().waitUntilEventReaches(0, "streamCreated", 1);
			user.getEventManager().waitUntilEventReaches(0, "streamPlaying", 1);
			user.getEventManager().waitUntilEventReaches(1, "streamCreated", 1);
			user.getEventManager().waitUntilEventReaches(1, "streamPlaying", 1);
			user.getEventManager().waitUntilEventReaches(2, "streamCreated", 1);
			user.getEventManager().waitUntilEventReaches(2, "streamPlaying", 1);

			// No lang model loaded in any Media Node
			sttSubUser(user, 0, 0, "en-US", true, true,
					"Vosk model for language \"en-US\" is not loaded and OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY is \"manual\"",
					false);
			sttSubUser(user, 1, 0, "es-ES", true, true,
					"Vosk model for language \"es-ES\" is not loaded and OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY is \"manual\"",
					false);
			sttSubUser(user, 2, 0, "fr-FR", true, true,
					"Vosk model for language \"fr-FR\" is not loaded and OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY is \"manual\"",
					false);

			// Load lang model in all Media Nodes
			body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNode1 + "'}}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);
			body = "{'lang':'es-ES', 'mediaNode': {'id': '" + mediaNode2 + "'}}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);
			body = "{'lang':'fr-FR', 'mediaNode': {'id': '" + mediaNode3 + "'}}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/load", body, HttpURLConnection.HTTP_OK);

			// Subscribe STT in all Media Nodes
			sttSubUser(user, 0, 0, "en-US", true, true);
			sttSubUser(user, 1, 0, "es-ES", true, true);
			sttSubUser(user, 2, 0, "fr-FR", true, true);

			user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 4);
			user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 4);
			user.getEventManager().waitUntilEventReaches(2, "speechToTextMessage", 4);

			// Crash third Media Node STT service
			String containerId3 = mediaNodes.get(2).getAsJsonObject().get("environmentId").getAsString();
			this.killSttService(containerId3);
			user.getEventManager().waitUntilEventReaches(2, "exception", 1);

			// Other users should still receive STT events
			user.getEventManager().clearCurrentEvents(0, "speechToTextMessage");
			user.getEventManager().clearCurrentEvents(1, "speechToTextMessage");
			user.getEventManager().waitUntilEventReaches(0, "speechToTextMessage", 4);
			user.getEventManager().waitUntilEventReaches(1, "speechToTextMessage", 4);

			body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNode1 + "'}}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
					HttpURLConnection.HTTP_BAD_METHOD);
			body = "{'lang':'es-ES', 'mediaNode': {'id': '" + mediaNode2 + "'}}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body,
					HttpURLConnection.HTTP_BAD_METHOD);

			sttUnsubUser(user, 0, 0, true, true);
			sttUnsubUser(user, 1, 0, true, true);

			body = "{'lang':'en-US', 'mediaNode': {'id': '" + mediaNode1 + "'}}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_OK);
			body = "{'lang':'es-ES', 'mediaNode': {'id': '" + mediaNode2 + "'}}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/speech-to-text/unload", body, HttpURLConnection.HTTP_OK);

		} finally {
			restartOpenViduServer(Map.of("OPENVIDU_PRO_CLUSTER_MEDIA_NODES", 1));
		}
	}

	@Test
	@DisplayName("Successfull broadcast Test")
	void sucessfullBroadcastTest() throws Exception {

		log.info("Successfull broadcast Test");

		try {
			String BROADCAST_IP = TestUtils.startRtmpServer();

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
			user.getDriver().findElement(By.id("add-user-btn")).click();

			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(750);
			WebElement broadcastUrlField = user.getDriver().findElement(By.id("broadcasturl-id-field"));
			broadcastUrlField.clear();
			broadcastUrlField.sendKeys("rtmp://" + BROADCAST_IP + "/live");
			user.getDriver().findElement(By.id("start-broadcast-btn")).click();
			user.getWaiter()
					.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Error [404]"));

			user.getDriver().findElement(By.id("list-sessions-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value",
					"Number: 0. Changes: false"));

			user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("streamCreated", 1);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

			user.getDriver().findElement(By.id("list-sessions-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value",
					"Number: 1. Changes: true"));

			user.getDriver().findElement(By.id("start-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast started"));
			user.getEventManager().waitUntilEventReaches("broadcastStarted", 1);

			user.getDriver().findElement(By.id("list-sessions-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value",
					"Number: 1. Changes: false"));

			checkRtmpRecordingIsFine(30, RecordingUtils::checkVideoAverageRgbGreen);

			user.getDriver().findElement(By.id("stop-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast stopped"));
			user.getEventManager().waitUntilEventReaches("broadcastStopped", 1);

			user.getDriver().findElement(By.id("list-sessions-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeContains(By.id("api-response-text-area"), "value",
					"Number: 1. Changes: false"));

			gracefullyLeaveParticipants(user, 1);

		} finally {
			TestUtils.stopRtmpServer();
		}
	}

	@Test
	@DisplayName("Successfull only video only audio broadcast Test")
	void sucessfullBroadcastOnlyVideoOnlyAudioTest() throws Exception {

		log.info("Successfull only video only audio broadcast Test");

		try {
			String BROADCAST_IP = TestUtils.startRtmpServer();

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("streamCreated", 1);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(750);
			WebElement broadcastUrlField = user.getDriver().findElement(By.id("broadcasturl-id-field"));
			broadcastUrlField.clear();
			broadcastUrlField.sendKeys("rtmp://" + BROADCAST_IP + "/live");
			user.getDriver().findElement(By.id("broadcast-properties-btn")).click();
			Thread.sleep(500);

			// Only video
			user.getDriver().findElement(By.id("rec-hasaudio-checkbox")).click();
			Thread.sleep(500);

			user.getDriver().findElement(By.id("start-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast started"));
			user.getEventManager().waitUntilEventReaches("broadcastStarted", 1);

			checkRtmpRecordingIsFine(30, RecordingUtils::checkVideoAverageRgbGreen);

			user.getDriver().findElement(By.id("stop-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast stopped"));
			user.getEventManager().waitUntilEventReaches("broadcastStopped", 1);

			// Only audio
			user.getDriver().findElement(By.id("rec-hasaudio-checkbox")).click();
			user.getDriver().findElement(By.id("rec-hasvideo-checkbox")).click();
			Thread.sleep(500);

			user.getDriver().findElement(By.id("start-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast started"));
			user.getEventManager().waitUntilEventReaches("broadcastStarted", 1);

			user.getDriver().findElement(By.id("stop-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast stopped"));
			user.getEventManager().waitUntilEventReaches("broadcastStopped", 1);

			gracefullyLeaveParticipants(user, 1);

		} finally {
			TestUtils.stopRtmpServer();
		}
	}

	@Test
	@DisplayName("Wrong broadcast Test")
	void wrongBroadcastTest() throws Exception {

		log.info("Wrong broadcast Test");

		try {
			String BROADCAST_IP = TestUtils.startRtmpServer();

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.className("join-btn")).click();
			user.getEventManager().waitUntilEventReaches("streamCreated", 1);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

			/** Start broadcast **/
			CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
			// 400
			String body = "{}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
			body = "{'session':'TestSession'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
			body = "{'broadcastUrl':'rtmp://" + BROADCAST_IP + "/live'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
			body = "{'session':false,'broadcastUrl':'rtmp://" + BROADCAST_IP + "/live'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
			body = "{'session':'TestSession','broadcastUrl':123}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, HttpURLConnection.HTTP_BAD_REQUEST);
			body = "{'session':'TestSession','broadcastUrl':'NOT_A_URL'}";
			restClient.commonRestString(HttpMethod.POST, "/openvidu/api/broadcast/start", body,
					HttpURLConnection.HTTP_BAD_REQUEST);
			// 404
			body = "{'session':'NOT_EXISTS','broadcastUrl':'rtmp://" + BROADCAST_IP + "/live'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, HttpURLConnection.HTTP_NOT_FOUND);
			// 406
			String notActiveSessionId = restClient
					.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpURLConnection.HTTP_OK).get("id")
					.getAsString();
			body = "{'session':'" + notActiveSessionId + "','broadcastUrl':'rtmp://" + BROADCAST_IP + "/live'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body,
					HttpURLConnection.HTTP_NOT_ACCEPTABLE);
			// 422
			body = "{'session':'TestSession','broadcastUrl':'rtmp://" + BROADCAST_IP + "/live','resolution':'99x1280'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, 422);
			body = "{'session':'TestSession','broadcastUrl':'rtmp://" + BROADCAST_IP
					+ "/live','hasAudio':false,'hasVideo':false}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start", body, 422);
			// 500 (Connection refused)
			body = "{'session':'TestSession','broadcastUrl':'rtmps://" + BROADCAST_IP + "/live'}";
			String errorResponse = restClient.commonRestString(HttpMethod.POST, "/openvidu/api/broadcast/start", body,
					HttpURLConnection.HTTP_INTERNAL_ERROR);
			Assertions.assertTrue(
					errorResponse.contains("Cannot open connection")
							&& errorResponse.contains("rtmps://" + BROADCAST_IP + "/live: Connection refused"),
					"Broadcast error message does not contain expected message");
			// 500 (Input/output error)
			body = "{'session':'TestSession','broadcastUrl':'rtmp://not.exists'}";
			errorResponse = restClient.commonRestString(HttpMethod.POST, "/openvidu/api/broadcast/start", body,
					HttpURLConnection.HTTP_INTERNAL_ERROR);
			Assertions.assertTrue(errorResponse.contains("rtmp://not.exists: Input/output error"),
					"Broadcast error message does not contain expected message");
			// 500 (Protocol not found)
			body = "{'session':'TestSession','broadcastUrl':'schemefail://" + BROADCAST_IP + "/live'}";
			errorResponse = restClient.commonRestString(HttpMethod.POST, "/openvidu/api/broadcast/start", body,
					HttpURLConnection.HTTP_INTERNAL_ERROR);
			Assertions.assertTrue(errorResponse.contains("schemefail://" + BROADCAST_IP + "/live: Protocol not found"),
					"Broadcast error message does not contain expected message");
			// Concurrent broadcast
			final int PETITIONS = 20;
			List<String> responses = new ArrayList<>();
			List<Exception> exceptions = new ArrayList<>();
			CountDownLatch latch = new CountDownLatch(PETITIONS);
			body = "{'session':'TestSession','broadcastUrl':'rtmp://" + BROADCAST_IP + "/live'}";
			for (int i = 0; i < PETITIONS; i++) {
				new Thread(() -> {
					try {
						String response = restClient.commonRestString(HttpMethod.POST, "/openvidu/api/broadcast/start",
								"{'session':'TestSession','broadcastUrl':'rtmp://" + BROADCAST_IP + "/live'}",
								HttpURLConnection.HTTP_OK);
						responses.add(response);
					} catch (Exception e) {
						// 409
						exceptions.add(e);
					}
					latch.countDown();
				}).start();
			}
			if (!latch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Concurrent start of broadcasts did not return in timeout");
			}
			for (Exception e : exceptions) {
				Assertions.assertTrue(e.getMessage().contains("expected to return status 200 but got 409"),
						"Exception message wasn't 409. It was: " + e.getMessage());
			}
			Assertions.assertEquals(1, responses.size(), "Wrong number of successfully started broadcasts");
			Assertions.assertEquals(PETITIONS - 1, exceptions.size(), "Wrong number of concurrent started broadcasts");
			// 409
			restClient.commonRestString(HttpMethod.POST, "/openvidu/api/broadcast/start", body,
					HttpURLConnection.HTTP_CONFLICT);

			user.getEventManager().waitUntilEventReaches("broadcastStarted", 1);
			checkRtmpRecordingIsFine(30, RecordingUtils::checkVideoAverageRgbGreen);

			/** Stop broadcast **/
			// 400
			body = "{}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/stop", body, HttpURLConnection.HTTP_BAD_REQUEST);
			body = "{'session':123}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/stop", body, HttpURLConnection.HTTP_BAD_REQUEST);
			// 404
			body = "{'session':'NOT_EXISTS'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/stop", body, HttpURLConnection.HTTP_NOT_FOUND);
			// 200
			body = "{'session':'TestSession'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/stop", body, HttpURLConnection.HTTP_OK);
			user.getEventManager().waitUntilEventReaches("broadcastStopped", 1);
			// 409
			body = "{'session':'TestSession'}";
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/stop", body, HttpURLConnection.HTTP_CONFLICT);

			gracefullyLeaveParticipants(user, 1);

		} finally {
			TestUtils.stopRtmpServer();
		}
	}

	@Test
	@DisplayName("Custom layout broadcast Test")
	void customLayoutBroadcastTest() throws Exception {

		log.info("Custom layout broadcast Test");

		try {
			String BROADCAST_IP = TestUtils.startRtmpServer();

			Map<String, Object> config = Map.of("OPENVIDU_PRO_SPEECH_TO_TEXT", "disabled", "OPENVIDU_RECORDING", true,
					"OPENVIDU_RECORDING_CUSTOM_LAYOUT", "/opt/openvidu/test-layouts");
			restartOpenViduServer(config);

			final String SESSION_NAME = "CUSTOM_LAYOUT_SESSION";

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-name-input-0")).clear();
			user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(SESSION_NAME);

			user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("streamCreated", 1);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(750);
			user.getDriver().findElement(By.id("broadcast-properties-btn")).click();
			user.getDriver().findElement(By.id("recording-layout-select")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("option-CUSTOM")).click();
			Thread.sleep(500);
			WebElement customLayoutInput = user.getDriver().findElement(By.id("custom-layout-input"));
			customLayoutInput.clear();
			customLayoutInput.sendKeys("layout1");
			WebElement resolutionInput = user.getDriver().findElement(By.id("recording-resolution-field"));
			resolutionInput.clear();
			resolutionInput.sendKeys("1920x1080");
			WebElement framerateInput = user.getDriver().findElement(By.id("recording-framerate-field"));
			framerateInput.clear();
			framerateInput.sendKeys("35");

			WebElement broadcastUrlField = user.getDriver().findElement(By.id("broadcasturl-id-field"));
			broadcastUrlField.clear();
			broadcastUrlField.sendKeys("rtmp://" + BROADCAST_IP + "/live");
			user.getDriver().findElement(By.id("start-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast started"));
			user.getEventManager().waitUntilEventReaches("broadcastStarted", 1);
			checkRtmpRecordingIsFine(30, RecordingUtils::checkVideoAverageRgbRed);
			user.getDriver().findElement(By.id("stop-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast stopped"));
			user.getEventManager().waitUntilEventReaches("broadcastStopped", 1);

			// Custom layout from external URL
			CountDownLatch initLatch = new CountDownLatch(1);
			CustomLayoutHandler.main(new String[0], initLatch);
			try {

				if (!initLatch.await(30, TimeUnit.SECONDS)) {
					Assertions.fail("Timeout waiting for webhook springboot app to start");
					CustomLayoutHandler.shutDown();
					return;
				}

				customLayoutInput.clear();
				customLayoutInput.sendKeys(EXTERNAL_CUSTOM_LAYOUT_URL + "?" + EXTERNAL_CUSTOM_LAYOUT_PARAMS);
				user.getDriver().findElement(By.id("start-broadcast-btn")).click();
				user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
						"Broadcast started"));
				user.getEventManager().waitUntilEventReaches("broadcastStarted", 2);
				checkRtmpRecordingIsFine(30, RecordingUtils::checkVideoAverageRgbRed);

			} finally {
				CustomLayoutHandler.shutDown();
			}

		} finally {
			TestUtils.stopRtmpServer();
		}
	}

	@Test
	@DisplayName("Broadcast, Composed Recording and STT Test")
	void broadcastComposedRecordingAndSttTest() throws Exception {

		log.info("Broadcast, Composed Recording and STT Test");

		try {
			Map<String, Object> config = Map.of("OPENVIDU_PRO_NETWORK_QUALITY", false, "OPENVIDU_PRO_SPEECH_TO_TEXT",
					OPENVIDU_PRO_SPEECH_TO_TEXT, "OPENVIDU_PRO_SPEECH_TO_TEXT_IMAGE",
					"openvidu/speech-to-text-service:master", "OPENVIDU_PRO_SPEECH_TO_TEXT_VOSK_MODEL_LOAD_STRATEGY",
					"on_demand");
			restartOpenViduServer(config);

			String BROADCAST_IP = TestUtils.startRtmpServer();

			final String sessionName = "BROADCAST_AND_RECORDED_SESSION";

			OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");
			user.getDriver().findElement(By.id("add-user-btn")).click();
			user.getDriver().findElement(By.id("session-name-input-0")).clear();
			user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);
			user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("streamCreated", 1);
			user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(500);
			WebElement broadcastUrlField = user.getDriver().findElement(By.id("broadcasturl-id-field"));
			broadcastUrlField.clear();
			broadcastUrlField.sendKeys("rtmp://" + BROADCAST_IP + "/live");
			user.getDriver().findElement(By.id("broadcast-properties-btn")).click();
			Thread.sleep(500);

			// Start broadcast
			user.getDriver().findElement(By.id("start-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast started"));
			user.getEventManager().waitUntilEventReaches("broadcastStarted", 1);

			// Start composed recording
			user.getDriver().findElement(By.id("start-recording-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
					"Recording started [" + sessionName + "]"));
			user.getEventManager().waitUntilEventReaches("recordingStarted", 1);

			Thread.sleep(2000);

			// Check broadcast
			checkRtmpRecordingIsFine(30, RecordingUtils::checkVideoAverageRgbGreen);

			// Start STT
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);
			this.sttSubUser(user, 0, 0, "en-US", true, true);
			user.getEventManager().waitUntilEventReaches("speechToTextMessage", 5);
			Assertions.assertEquals(1, user.getEventManager().getNumEvents("connectionCreated").get(),
					"Wrong number of connectionCreated events");

			// Stop broadcast
			user.getDriver().findElement(By.id("session-api-btn-0")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("stop-broadcast-btn")).click();
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Broadcast stopped"));
			user.getEventManager().waitUntilEventReaches("broadcastStopped", 1);

			// After stopping broadcast speechToText events should keep coming
			user.getEventManager().clearAllCurrentEvents(0);
			user.getEventManager().clearAllCurrentEvents();
			user.getEventManager().waitUntilEventReaches("speechToTextMessage", 4);

			// Stop recording
			user.getDriver().findElement(By.id("recording-id-field")).clear();
			user.getDriver().findElement(By.id("recording-id-field")).sendKeys(sessionName);
			user.getDriver().findElement(By.id("stop-recording-btn")).click();
			user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
					"Recording stopped [" + sessionName + "]"));
			user.getEventManager().waitUntilEventReaches("recordingStopped", 1);

			// Check recording
			String recordingsPath = "/opt/openvidu/recordings/";
			File file1 = new File(recordingsPath + sessionName + "/" + sessionName + ".mp4");
			File file2 = new File(recordingsPath + sessionName + "/" + sessionName + ".jpg");
			Assertions.assertTrue(
					this.recordingUtils.recordedGreenFileFine(file1,
							new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET).getRecording(sessionName)),
					"Recorded file " + file1.getAbsolutePath() + " is not fine");
			Assertions.assertTrue(this.recordingUtils.thumbnailIsFine(file2, RecordingUtils::checkVideoAverageRgbGreen),
					"Thumbnail " + file2.getAbsolutePath() + " is not fine");

			// After stopping composed recording speechToText events should keep coming
			user.getEventManager().clearAllCurrentEvents(0);
			user.getEventManager().clearAllCurrentEvents();
			user.getEventManager().waitUntilEventReaches("speechToTextMessage", 4);

			// After unsubscription no more STT events should be received
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);
			this.sttUnsubUser(user, 0, 0, true, true);
			user.getEventManager().clearAllCurrentEvents(0);
			user.getEventManager().clearAllCurrentEvents();
			Thread.sleep(3000);
			Assertions.assertEquals(user.getEventManager().getNumEvents("speechToTextMessage").intValue(), 0);

			Assertions.assertEquals(0, user.getEventManager().getNumEvents("connectionDestroyed").get(),
					"Wrong number of connectionDestroyed events");

			gracefullyLeaveParticipants(user, 1);

		} finally {
			TestUtils.stopRtmpServer();
		}
	}

	private void checkRtmpRecordingIsFine(long secondsTimeout, Function<Map<String, Long>, Boolean> colorCheckFunction)
			throws InterruptedException {
		final String broadcastRecordingPath = "/opt/openvidu/recordings";
		final String cleanBroadcastPath = "rm -rf " + broadcastRecordingPath + "/tmp";
		try {
			final long startTime = System.currentTimeMillis();
			while (false || ((System.currentTimeMillis() - startTime) < (secondsTimeout * 1000))) {
				commandLine.executeCommand(cleanBroadcastPath, 10);
				commandLine.executeCommand("docker cp broadcast-nginx:/tmp " + broadcastRecordingPath, 3);
				// Analyze most recent file (there can be more than one in the path)
				File[] files = new File(broadcastRecordingPath + "/tmp").listFiles();
				Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
				// This fixes corrupted video files
				String fixedFile = broadcastRecordingPath + "/tmp/test.flv";
				commandLine.executeCommand(
						"ffmpeg -i " + files[0].getAbsolutePath() + " -acodec copy -vcodec copy " + fixedFile, 10);
				// This obtains the middle duration of the video
				String videoDuration = commandLine.executeCommand(
						"ffprobe -loglevel error -of csv=p=0 -show_entries format=duration " + fixedFile, 3);
				float halfDuration = (float) (Float.parseFloat(videoDuration) * 0.5);
				// This retrieves the frame from the middle of the video
				commandLine.executeCommand("ffmpeg -ss " + halfDuration + " -i " + fixedFile + " -vframes 1 "
						+ broadcastRecordingPath + "/tmp/rtmp-screenshot.jpg", 3);
				File screenshot = new File(broadcastRecordingPath + "/tmp/rtmp-screenshot.jpg");
				if (screenshot.exists() && screenshot.isFile() && screenshot.length() > 0 && screenshot.canRead()) {
					Assertions.assertTrue(this.recordingUtils.thumbnailIsFine(screenshot, colorCheckFunction),
							"RTMP screenshot " + screenshot.getAbsolutePath() + " is not fine");
					break;
				}
				log.info("RTMP screenshot could not be generated yet. Trying again");
				commandLine.executeCommand(cleanBroadcastPath, 10);
				Thread.sleep(1000);
			}
			if ((System.currentTimeMillis() - startTime) >= (secondsTimeout * 1000)) {
				Assertions.fail("Timeout of " + secondsTimeout + " seconds elapsed waiting for RTMP sreenshot");
			}
		} finally {
			commandLine.executeCommand(cleanBroadcastPath, 10);
		}
	}

	private String getOwnConnectionId(OpenViduTestappUser user, int numberOfUser) {
		return user.getWaiter().until(d -> {
			List<WebElement> firstOpenviduEvent = d.findElements(By.cssSelector(
					"#openvidu-instance-" + numberOfUser + " .event-list > .mat-expansion-panel:first-child"));
			if (firstOpenviduEvent.size() == 0) {
				return null;
			}
			String eventType = firstOpenviduEvent.get(0)
					.findElement(By.cssSelector(".mat-expansion-panel-header .mat-content")).getAttribute("textContent")
					.trim();
			if (!"connectionCreated".equals(eventType)) {
				return null;
			}
			String connectionId = firstOpenviduEvent.get(0)
					.findElement(By.cssSelector(".mat-expansion-panel-content .event-content"))
					.getAttribute("textContent").trim();
			return connectionId;
		});
	}

	private void sttSubUser(OpenViduTestappUser user, int numberOfUser, int numberOfVideo, String language,
			boolean openDialog, boolean closeDialog) throws InterruptedException {
		this.sttSubUser(user, numberOfUser, numberOfVideo, language, openDialog, closeDialog, "Subscribed to STT");
	}

	private void sttSubUser(OpenViduTestappUser user, int numberOfUser, int numberOfVideo, String language,
			boolean openDialog, boolean closeDialog, String outputMessage) throws InterruptedException {
		this.sttSubUser(user, numberOfUser, numberOfVideo, language, openDialog, closeDialog, outputMessage, true);
	}

	private void sttSubUser(OpenViduTestappUser user, int numberOfUser, int numberOfVideo, String language,
			boolean openDialog, boolean closeDialog, String outputMessage, boolean exactMatchOutputMessage)
			throws InterruptedException {
		if (openDialog) {
			List<WebElement> videos = user.getDriver()
					.findElements(By.cssSelector("#openvidu-instance-" + numberOfUser + " app-video"));
			WebElement video = videos.get(numberOfVideo);
			video.findElement(By.cssSelector(".other-operations-btn")).click();
			Thread.sleep(500);
		}
		WebElement langInput = user.getDriver().findElement(By.cssSelector("#stt-lang-field"));
		langInput.clear();
		langInput.sendKeys(language);
		user.getDriver().findElement(By.cssSelector("#sub-stt-btn")).click();
		if (exactMatchOutputMessage) {
			user.getWaiter().until(
					ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", outputMessage));
		} else {
			user.getWaiter().until(ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value",
					outputMessage));
		}

		if (closeDialog) {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(500);
		}
	}

	private void sttUnsubUser(OpenViduTestappUser user, int numberOfUser, int numberOfVideo, boolean openDialog,
			boolean closeDialog) throws InterruptedException {
		if (openDialog) {
			List<WebElement> videos = user.getDriver()
					.findElements(By.cssSelector("#openvidu-instance-" + numberOfUser + " app-video"));
			WebElement video = videos.get(numberOfVideo);
			video.findElement(By.cssSelector(".other-operations-btn")).click();
			Thread.sleep(400);
		}
		user.getDriver().findElement(By.cssSelector("#unsub-stt-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value",
				"Unsubscribed from STT"));
		if (closeDialog) {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(400);
		}
	}

	private void killSttService(String mediaNodeContainerId) throws Exception {
		// For local run
		// String killCommand = "ps axf | grep \"speech-to-text-service\" | grep -v grep
		// | awk '{print $1}' | xargs -I {} kill -9 {}";
		// For DIND run
		String killCommand = "docker exec -i " + mediaNodeContainerId
				+ " /bin/sh -c \"ps axf | grep \\\"speech-to-text-service\\\" | grep -v grep | awk '{print \\$1}' | xargs -I {} kill -9 {}\"";
		commandLine.executeCommand(killCommand, 10);
	}

	private void restartSttContainer(String mediaNodeContainerId) throws Exception {
		String restartCommand = "docker exec -i " + mediaNodeContainerId
				+ " /bin/sh -c \"docker restart speech-to-text-service\"";
		commandLine.executeCommand(restartCommand, 30);
	}

	private void commonEnUsTranscriptionTest(OpenViduTestappUser user) throws Exception {
		List<String> expectedRecognitionList = Arrays.asList(
				"for example we used to think that after childhood the brain did not really could not change and it turns out that nothing could be farther from the truth",
				"another misconception about the brain is that you only use parts of it at any given time and silent when you do nothing",
				"well this is also untrue it turns out that even when you are at rest and thinking of nothing your brain is highly active");

		List<String> recognizingSttEvents = new ArrayList<String>();
		List<String> recognizedSttEvents = new ArrayList<String>();
		final CountDownLatch latch = new CountDownLatch(3);

		boolean[] previousSttEventWasRecognized = new boolean[1];
		String[] previousSttRecognizedText = new String[1];
		AssertionError[] exc = new AssertionError[1];

		user.getEventManager().on("speechToTextMessage", (event) -> {
			String reason = event.get("reason").getAsString();
			String text = event.get("text").getAsString();
			if ("recognizing".equals(reason)) {

				previousSttEventWasRecognized[0] = false;
				previousSttRecognizedText[0] = null;
				recognizingSttEvents.add(text);

			} else if ("recognized".equals(reason)) {

				if (previousSttEventWasRecognized[0]) {
					exc[0] = exc[0] == null
							? new AssertionError("Two recognized events in a row should never happen. Present event: "
									+ event.get("raw").getAsString() + " | Previous event: \""
									+ previousSttRecognizedText[0] + "\"")
							: exc[0];
					while (latch.getCount() > 0) {
						latch.countDown();
					}
				}
				previousSttEventWasRecognized[0] = true;
				previousSttRecognizedText[0] = event.get("raw").getAsString();
				log.info("Recognized: {}", text);
				recognizedSttEvents.add(text);
				latch.countDown();

			} else {

				exc[0] = exc[0] == null ? new AssertionError("Unknown SpeechToText event 'reason' property " + reason)
						: exc[0];
				while (latch.getCount() > 0) {
					latch.countDown();
				}

			}
		});

		this.sttSubUser(user, 0, 0, "en-US", true, false);

		if (!latch.await(80, TimeUnit.SECONDS)) {
			Assertions.fail("Timeout waiting for recognized STT events");
		}

		if (exc[0] != null) {
			throw exc[0];
		}

		Assertions.assertTrue(recognizingSttEvents.size() > 0, "recognizing STT events should be greater than 0");
		Assertions.assertTrue(recognizingSttEvents.size() > recognizedSttEvents.size(),
				"recognized STT events should be greater than 0");

		// The expected text may be in just 2 recognized events instead of 3
		int expectedCharCount = expectedRecognitionList.stream().mapToInt(w -> w.length()).sum();
		int recognizedCharCount = recognizedSttEvents.stream().mapToInt(w -> w.length()).sum();
		int maxAllowedCountDifference = 50;
		if (recognizedCharCount > (expectedCharCount + maxAllowedCountDifference)) {
			recognizedSttEvents.remove(recognizedSttEvents.size() - 1);
			log.info("Removed one element of recognized collection!");
		}

		String finalRecognition = String.join(" ", recognizedSttEvents).toLowerCase().replaceAll("[^a-z ]", "");
		String expectedRecognition = String.join(" ", expectedRecognitionList);

		// Cosine similarity string comparison has been proven the most accurate one
		double cosineSimilarity = new Cosine().distance(finalRecognition, expectedRecognition);

		log.info("Cosine similiarity: {}", cosineSimilarity);
		log.info(expectedRecognition);
		log.info(finalRecognition);
		Assertions.assertTrue(cosineSimilarity < 0.1,
				"Wrong similarity between actual and expected recognized text. Got " + cosineSimilarity);

		sttUnsubUser(user, 0, 0, false, true);
	}

	private void connectTwoUsers(OpenViduTestappUser user, CustomHttpClient restClient, boolean firstUserIsModerator,
			boolean startRecording, String broadcastIp) throws Exception {
		this.closeAllSessions(OV);
		user.getDriver().findElement(By.id("remove-all-users-btn")).click();
		user.getEventManager().clearAllCurrentEvents();
		CustomWebhook.clean();
		user.getDriver().findElement(By.id("add-user-btn")).click();
		if (firstUserIsModerator) {
			user.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(500);
			user.getDriver().findElement(By.id("radio-btn-mod")).click();
			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(500);
		}
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);
		CustomWebhook.waitForEvent("sessionCreated", 1);
		for (int i = 0; i < 2; i++) {
			CustomWebhook.waitForEvent("participantJoined", 1);
		}
		for (int i = 0; i < 4; i++) {
			CustomWebhook.waitForEvent("webrtcConnectionCreated", 1);
		}
		if (startRecording) {
			restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
					"{'session':'TestSession','outputMode':'INDIVIDUAL'}", HttpURLConnection.HTTP_OK);
			user.getEventManager().waitUntilEventReaches("recordingStarted", 2);
			Assertions.assertEquals(Recording.Status.started.name(),
					CustomWebhook.waitForEvent("recordingStatusChanged", 3).get("status").getAsString());
		}
		if (broadcastIp != null) {
			restClient.rest(HttpMethod.POST, "/openvidu/api/broadcast/start",
					"{'session':'TestSession','broadcastUrl':'rtmp://" + broadcastIp + "/live'}",
					HttpURLConnection.HTTP_OK);
			user.getEventManager().waitUntilEventReaches("broadcastStarted", 2);
			CustomWebhook.waitForEvent("broadcastStarted", 3);
		}
	}

}
