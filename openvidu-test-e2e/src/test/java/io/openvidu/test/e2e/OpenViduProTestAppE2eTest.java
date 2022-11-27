package io.openvidu.test.e2e;

import static org.junit.jupiter.api.Assertions.fail;

import java.awt.Point;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.Alert;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.stream.JsonReader;
import com.mashape.unirest.http.HttpMethod;

import info.debatty.java.stringsimilarity.Cosine;
import io.openvidu.java.client.Connection;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.Session;
import io.openvidu.test.browsers.utils.BrowserNames;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.Unzipper;

public class OpenViduProTestAppE2eTest extends AbstractOpenViduTestappE2eTest {

	@BeforeAll()
	protected static void setupAll() {
		checkFfmpegInstallation();
		loadEnvironmentVariables();
		prepareBrowserDrivers(new HashSet<>(Arrays.asList(BrowserNames.CHROME)));
		cleanFoldersAndSetUpOpenViduJavaClient();
	}

	@Test
	@DisplayName("Individual dynamic record")
	void individualDynamicRecordTest() throws Exception {

		isRecordingTest = true;

		log.info("Individual dynamic record");

		restartOpenViduServerIfNecessary(false, null, "disabled");

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
				HttpStatus.SC_OK);
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
				"{'session':'" + sessionName + "','outputMode':'INDIVIDUAL'}", HttpStatus.SC_OK);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 3);
		Thread.sleep(1000);

		// Get connectionId and streamId for one of the users configured to NOT be
		// recorded
		sessionInfo = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/" + sessionName, HttpStatus.SC_OK);
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
				"{'record':true}", HttpStatus.SC_OK);
		Thread.sleep(1000);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':false}", HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':true}", HttpStatus.SC_OK);
		Thread.sleep(1000);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':false}", HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/" + sessionName + "/connection/" + connectionId2,
				"{'record':true}", HttpStatus.SC_OK);
		Thread.sleep(1000);

		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/stop/" + sessionName, HttpStatus.SC_OK);
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

		restartOpenViduServerIfNecessary(false, null, "disabled");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		/**
		 * PATCH /openvidu/api/sessions/<SESSION_ID>/connection/<CONNECTION_ID>
		 **/
		String body = "{'customSessionId': 'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_OK, true, false, true,
				DEFAULT_JSON_SESSION);
		body = "{'role':'PUBLISHER','record':false,'data':'MY_SERVER_PRO_DATA'}";
		JsonObject res = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection", body,
				HttpStatus.SC_OK);
		final String token = res.get("token").getAsString();
		final String connectionId = res.get("connectionId").getAsString();
		final long createdAt = res.get("createdAt").getAsLong();

		/** UPDATE PENDING CONNECTION **/

		// Test with REST API
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':false}", HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':123}", HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER','record':'WRONG'}", HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/WRONG/connection/" + connectionId,
				"{'role':'PUBLISHER','record':'WRONG'}", HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/WRONG",
				"{'role':'PUBLISHER','record':true}", HttpStatus.SC_NOT_FOUND);

		// No change should return 200. At this point role=PUBLISHER and record=false
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId, "{}",
				HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER'}", HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':false}", HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER','record':false,'data':'OTHER_DATA'}", HttpStatus.SC_OK);

		// Updating only role should let record value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'MODERATOR'}", HttpStatus.SC_OK, true, true, true,
				mergeJson(DEFAULT_JSON_PENDING_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','serverData':'MY_SERVER_PRO_DATA','record':false,'token':'"
								+ token + "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + "}",
						new String[0]));
		// Updating only record should let role value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':true}", HttpStatus.SC_OK, true, true, true,
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
			Assertions.assertEquals(HttpStatus.SC_NOT_FOUND, exception.getStatus(), "Wrong HTTP status");
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
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null, HttpStatus.SC_OK, true, false,
				true, mergeJson(DEFAULT_JSON_SESSION, "{'mediaNodeId':'STR'}", new String[0]));

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
				HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'SUBSCRIBER'}", HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':false}", HttpStatus.SC_OK);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'SUBSCRIBER','record':false}", HttpStatus.SC_OK);

		// Updating only role should let record value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'MODERATOR'}", HttpStatus.SC_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','record':false,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "ip", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 1);

		// Updating only record should let role value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':true}", HttpStatus.SC_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "ip", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 2);

		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'SUBSCRIBER','record':true,'data':'OTHER DATA'}", HttpStatus.SC_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'SUBSCRIBER','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "ip", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 3);

		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER'}", HttpStatus.SC_OK, false, true, true,
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
			Assertions.assertEquals(HttpStatus.SC_NOT_FOUND, exception.getStatus(), "Wrong HTTP status");
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
				restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", HttpStatus.SC_OK)
						.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject()
						.get("connectionId").getAsString(),
				"Wrong connectionId");

		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/CUSTOM_SESSION_ID", HttpStatus.SC_NO_CONTENT);

		// GET /openvidu/api/sessions should return empty again
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions", null, HttpStatus.SC_OK, true, true, true,
				"{'numberOfElements':0,'content':[]}");

		/** GET /openvidu/api/config **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/config", null, HttpStatus.SC_OK, true, false, true,
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
		restClient.rest(HttpMethod.GET, "/openvidu/api/health", null, HttpStatus.SC_OK, true, true, true,
				"{'status':'UP'}");
	}

	@Test
	@DisplayName("openvidu-java-client PRO test")
	void openViduJavaClientProTest() throws Exception {

		log.info("openvidu-java-client PRO test");

		restartOpenViduServerIfNecessary(false, null, "disabled");

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
	}

	@Test
	@DisplayName("Network quality test")
	void networkQualityTest() throws Exception {

		log.info("Network quality test");

		restartOpenViduServerIfNecessary(true, 5, "disabled");

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		JsonObject res = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession/connection",
				HttpStatus.SC_OK);
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

		restartOpenViduServerIfNecessary(false, null, "disabled");

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
		Map<String, Long> rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
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

		rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
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
		rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));
		Assertions.assertTrue((rgb.get("r") < 10) && (rgb.get("g") < 10) && (rgb.get("b") > 240));

		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("operation-response-text-area"), "value", "Filter removed"));

		rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));

		// Green
		Assertions.assertTrue((rgb.get("r") < 150) && (rgb.get("g") > 240) && (rgb.get("b") < 100));

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Service disabled STT test")
	void serviceDisabledSttTest() throws Exception {

		log.info("Service disabled STT test");

		restartOpenViduServerIfNecessary(false, null, "disabled");

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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

		List<String> expectedRecognitionList = Arrays.asList(
				"for example we used to think that after childhood the brain did not really could not change and it turns out that nothing could be farther from the truth",
				"another misconception about the brain is that you only use parts of it at any given time and silent when you do nothing",
				"well this is also untrue it turns out that even when you are at rest and thinking of nothing your brain is highly active");

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

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
									+ event.get("text") + " | Previous event: \"" + previousSttRecognizedText[0] + "\"")
							: exc[0];
					while (latch.getCount() > 0) {
						latch.countDown();
					}
				}
				previousSttEventWasRecognized[0] = true;
				previousSttRecognizedText[0] = text;
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

		this.sttSubUser(user, 0, 0, "en-US", true, true);

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

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Close session STT test")
	void closeSessionSttTest() throws Exception {

		log.info("Close session STT test");

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession", HttpStatus.SC_NO_CONTENT);

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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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
		String connectionId = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/TestSession", HttpStatus.SC_OK)
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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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
	@Disabled
	void fourSessionsFourStreamsFourSubscriptionsFourLanguageSttTest() throws Exception {

		log.info("4 sessions 4 streams 4 subscriptions 4 languages STT");

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		final String sessionName = "COMPOSED_RECORDED_SESSION";
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.id("session-name-input-0")).clear();
		user.getDriver().findElement(By.id("session-name-input-0")).sendKeys(sessionName);

		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
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

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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
	@DisplayName("Crash STT service test")
	void crashSttServiceTest() throws Exception {

		log.info("Crash STT service test");

		restartOpenViduServerIfNecessary(false, null, OPENVIDU_PRO_SPEECH_TO_TEXT);

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

		this.killSttService();

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

	// @Test
	// @DisplayName("Mix STT test")
	// void mixSttTest() throws Exception {
	//
	// }

	protected void restartOpenViduServerIfNecessary(Boolean wantedNetworkQuality, Integer wantedNetworkQualityInterval,
			String wantedSpeechToText) {

		try {

			CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
			JsonObject config = restClient.rest(HttpMethod.GET, "/openvidu/api/config", 200);

			Boolean currentNetworkQuality = config.get("OPENVIDU_PRO_NETWORK_QUALITY").getAsBoolean();
			Integer currentNetworkQualityInterval = null;
			if (config.has("OPENVIDU_PRO_NETWORK_QUALITY_INTERVAL")) {
				currentNetworkQualityInterval = config.get("OPENVIDU_PRO_NETWORK_QUALITY_INTERVAL").getAsInt();
			}
			String currentSpeechToText = config.get("OPENVIDU_PRO_SPEECH_TO_TEXT").getAsString();

			boolean mustRestart = false;
			if (wantedNetworkQuality != null && wantedNetworkQuality) {
				mustRestart = !currentNetworkQuality;
				mustRestart = mustRestart || (wantedNetworkQualityInterval != null
						&& wantedNetworkQualityInterval != currentNetworkQualityInterval);
			}
			mustRestart = mustRestart
					|| (wantedSpeechToText != null) && !currentSpeechToText.equals(wantedSpeechToText);

			if (mustRestart) {
				String body = "{";
				if (wantedNetworkQuality != null) {
					body += "'OPENVIDU_PRO_NETWORK_QUALITY':" + wantedNetworkQuality;
				}
				if (wantedNetworkQualityInterval != null) {
					body += body.endsWith("{") ? "" : ",";
					body += "'OPENVIDU_PRO_NETWORK_QUALITY_INTERVAL':" + wantedNetworkQualityInterval;
				}
				if (wantedSpeechToText != null) {
					body += body.endsWith("{") ? "" : ",";
					body += "'OPENVIDU_PRO_SPEECH_TO_TEXT':'" + wantedSpeechToText + "'";
				}
				body += "}";
				restClient.rest(HttpMethod.POST, "/openvidu/api/restart", body, 200);
				waitUntilOpenViduRestarted(30);
			} else {
				log.info("Restarting OpenVidu Server is not necessary");
			}
		} catch (Exception e) {
			log.error(e.getMessage());
			Assertions.fail("Error restarting OpenVidu Server");
		}
	}

	private void waitUntilOpenViduRestarted(int maxSecondsWait) throws Exception {
		boolean restarted = false;
		int msInterval = 500;
		int attempts = 0;
		final int maxAttempts = maxSecondsWait * 1000 / msInterval;
		Thread.sleep(500);
		while (!restarted && attempts < maxAttempts) {
			try {
				CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
				restClient.rest(HttpMethod.GET, "/openvidu/api/health", 200);
				restarted = true;
			} catch (Exception e) {
				try {
					log.warn("Waiting for OpenVidu Server...");
					Thread.sleep(msInterval);
				} catch (InterruptedException e1) {
					log.error("Sleep interrupted");
				}
				attempts++;
			}
		}
		if (!restarted && attempts == maxAttempts) {
			throw new TimeoutException();
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
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", "Subscribed to STT"));
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

	private void killSttService() throws Exception {
		// For local run
		// String killCommand = "ps axf | grep \"speech-to-text-service\" | grep -v grep
		// | awk '{print $1}' | xargs -I {} kill -9 {}";
		// For DIND run
		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		String containerId = restClient.rest(HttpMethod.GET, "/openvidu/api/media-nodes", HttpStatus.SC_OK)
				.get("content").getAsJsonArray().get(0).getAsJsonObject().get("environmentId").getAsString();
		String killCommand = "docker exec -i " + containerId
				+ " /bin/sh -c \"ps axf | grep \\\"speech-to-text-service\\\" | grep -v grep | awk '{print \\$1}' | xargs -I {} kill -9 {}\"";
		commandLine.executeCommand(killCommand, 10);
	}

}
