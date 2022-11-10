package io.openvidu.test.e2e;

import static org.junit.Assert.fail;

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
import org.junit.Assert;
import org.junit.jupiter.api.BeforeAll;
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

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		restartOpenViduServerIfNecessary(false, null, "disabled");

		CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
				OpenViduTestAppE2eTest.OPENVIDU_SECRET);

		// Connect 3 users. Record only the first one
		for (int i = 0; i < 3; i++) {
			user.getDriver().findElement(By.id("add-user-btn")).click();
			if (i > 0) {
				user.getDriver().findElement(By.id("session-settings-btn-" + i)).click();
				Thread.sleep(1000);
				user.getDriver().findElement(By.id("record-checkbox")).click();
				user.getDriver().findElement(By.id("save-btn")).click();
				Thread.sleep(1000);
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
				Assert.assertEquals("Wrong connectionId file metadata property", connectionId1,
						file.get("connectionId").getAsString());
				long msDuration = file.get("endTimeOffset").getAsLong() - file.get("startTimeOffset").getAsLong();
				Assert.assertTrue("Wrong recording duration of individual file. Difference: " + (msDuration - 4000),
						msDuration - 4000 < 750);
				count1++;
			} else if (fileStreamId.equals(streamId2)) {
				// Dynamically recorded user
				Assert.assertEquals("Wrong connectionId file metadata property", connectionId2,
						file.get("connectionId").getAsString());
				long msDuration = file.get("endTimeOffset").getAsLong() - file.get("startTimeOffset").getAsLong();
				Assert.assertTrue(
						"Wrong recording duration of individual file. Difference: " + Math.abs(msDuration - 1000),
						Math.abs(msDuration - 1000) < 150);

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

				Assert.assertTrue("File name " + fileName + " not found among regex " + regexNames.toString(), found);
				count2++;
			} else {
				Assert.fail("Metadata file element does not belong to a known stream (" + fileStreamId + ")");
			}
		}
		Assert.assertEquals("Wrong number of recording files for stream " + streamId1, 1, count1);
		Assert.assertEquals("Wrong number of recording files for stream " + streamId2, 3, count2);
		Assert.assertTrue("Some expected file name didn't existed: " + regexNames.toString(), regexNames.isEmpty());
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
		Assert.assertTrue("OpenVidu object should have changed", OV.fetch());
		Session session = OV.getActiveSessions().get(0);
		try {
			session.updateConnection("WRONG_CONNECTION_ID", new ConnectionProperties.Builder().build());
			Assert.fail("Expected OpenViduHttpException exception");
		} catch (OpenViduHttpException exception) {
			Assert.assertEquals("Wrong HTTP status", HttpStatus.SC_NOT_FOUND, exception.getStatus());
		}
		Assert.assertFalse("Session object should not have changed", session.fetch());
		Connection connection = session.updateConnection(connectionId,
				new ConnectionProperties.Builder().role(OpenViduRole.SUBSCRIBER).record(false).build());
		Assert.assertEquals("Wrong role Connection property", OpenViduRole.SUBSCRIBER, connection.getRole());
		Assert.assertFalse("Wrong record Connection property", connection.record());
		Assert.assertEquals("Wrong data Connection property", "MY_SERVER_PRO_DATA", connection.getServerData());

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
			Assert.assertTrue("Alert does not contain expected text",
					alert.getText().equals("OPENVIDU_PERMISSION_DENIED: You don't have permissions to publish"));
			alert.accept();
		} catch (Exception e) {
			Assert.fail("Alert exception");
		} finally {
			user.getEventManager().resetEventThread(false);
		}
		Thread.sleep(500);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);

		// Session REST API entity should now have "mediaNodeId" property
		restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", null, HttpStatus.SC_OK, true, false,
				true, mergeJson(DEFAULT_JSON_SESSION, "{'mediaNodeId':'STR'}", new String[0]));

		Assert.assertTrue("Session object should have changed", session.fetch());
		connection = session.getActiveConnections().get(0);
		final Long activeAt = connection.activeAt();
		Assert.assertTrue("activeAt should be greater than createdAt in Connection object", activeAt > createdAt);
		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.SUBSCRIBER, connection.getRole());
		Assert.assertFalse("Wrong record in Connection object", connection.record());

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
		Assert.assertFalse("Session object should not have changed", session.fetch());
		try {
			session.updateConnection("WRONG_CONNECTION_ID", new ConnectionProperties.Builder().build());
			Assert.fail("Expected OpenViduHttpException exception");
		} catch (OpenViduHttpException exception) {
			Assert.assertEquals("Wrong HTTP status", HttpStatus.SC_NOT_FOUND, exception.getStatus());
		}
		Assert.assertFalse("Session object should not have changed", session.fetch());
		connection = session.updateConnection(connectionId,
				new ConnectionProperties.Builder().role(OpenViduRole.PUBLISHER).build());

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 7);

		Assert.assertFalse("Session object should not have changed", session.fetch());
		Assert.assertEquals("Wrong connectionId in Connection object", connectionId, connection.getConnectionId());
		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.PUBLISHER, connection.getRole());
		Assert.assertFalse("Wrong record in Connection object", connection.record());
		Assert.assertEquals("Wrong status in Connection object", "active", connection.getStatus());
		connection = session.updateConnection(connectionId,
				new ConnectionProperties.Builder().role(OpenViduRole.SUBSCRIBER).build());

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 8);

		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.SUBSCRIBER, connection.getRole());
		Assert.assertFalse("Session object should not have changed", session.fetch());
		connection = session.updateConnection(connectionId, new ConnectionProperties.Builder()
				.role(OpenViduRole.MODERATOR).record(false).data("NO CHANGE").build());

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 9);

		Assert.assertFalse("Session object should not have changed", session.fetch());
		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.MODERATOR, connection.getRole());
		Assert.assertFalse("Wrong record in Connection object", connection.record());
		Assert.assertEquals("Wrong data in Connection object", "MY_SERVER_PRO_DATA", connection.getServerData());
		Assert.assertEquals("Wrong status in Connection object", "active", connection.getStatus());

		user.getEventManager().resetEventThread(true);

		user.getWaiter().until(ExpectedConditions.elementToBeClickable(By.cssSelector(".republish-error-btn")));
		user.getDriver().findElement(By.cssSelector(".republish-error-btn")).click();

		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);

		// connectionId should be equal to the one brought by the token
		Assert.assertEquals("Wrong connectionId", connectionId,
				restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/CUSTOM_SESSION_ID", HttpStatus.SC_OK)
						.get("connections").getAsJsonObject().get("content").getAsJsonArray().get(0).getAsJsonObject()
						.get("connectionId").getAsString());

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
						+ "'OPENVIDU_PRO_KIBANA_HOST':'STR','OPENVIDU_PRO_RECORDING_STORAGE':'STR','OPENVIDU_PRO_NETWORK_QUALITY':false,'OPENVIDU_STREAMS_ALLOW_TRANSCODING':false,'OPENVIDU_STREAMS_FORCED_VIDEO_CODEC':'STR'}");

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
		Assert.assertFalse(session.fetch());
		Connection connectionDefault = session.createConnection();
		Assert.assertFalse(session.fetch());
		Assert.assertEquals("Wrong role property", OpenViduRole.PUBLISHER, connectionDefault.getRole());
		Assert.assertTrue("Wrong record property", connectionDefault.record());
		Assert.assertEquals("Wrong data property", "", connectionDefault.getServerData());
		// Update Connection
		session.updateConnection(connectionDefault.getConnectionId(), new ConnectionProperties.Builder()
				.role(OpenViduRole.SUBSCRIBER).record(false).data("WILL HAVE NO EFFECT").build());
		Assert.assertEquals("Wrong role property", OpenViduRole.SUBSCRIBER, connectionDefault.getRole());
		Assert.assertFalse("Wrong record property", connectionDefault.record());
		Assert.assertEquals("Wrong data property", "", connectionDefault.getServerData());
		Assert.assertFalse(session.fetch());

		// Create custom properties Connection
		long timestamp = System.currentTimeMillis();
		Connection connection = session.createConnection(
				new ConnectionProperties.Builder().record(false).role(OpenViduRole.MODERATOR).data("SERVER_SIDE_DATA")
						.kurentoOptions(new KurentoOptions.Builder().videoMaxRecvBandwidth(555)
								.videoMinRecvBandwidth(555).videoMaxSendBandwidth(555).videoMinSendBandwidth(555)
								.allowedFilters(new String[] { "555" }).build())
						.build());
		Assert.assertEquals("Wrong status Connection property", "pending", connection.getStatus());
		Assert.assertTrue("Wrong timestamp Connection property", connection.createdAt() > timestamp);
		Assert.assertTrue("Wrong activeAt Connection property", connection.activeAt() == null);
		Assert.assertTrue("Wrong location Connection property", connection.getLocation() == null);
		Assert.assertTrue("Wrong platform Connection property", connection.getPlatform() == null);
		Assert.assertTrue("Wrong clientData Connection property", connection.getClientData() == null);
		Assert.assertTrue("Wrong publishers Connection property", connection.getPublishers().size() == 0);
		Assert.assertTrue("Wrong subscribers Connection property", connection.getSubscribers().size() == 0);
		Assert.assertTrue("Wrong token Connection property", connection.getToken().contains(session.getSessionId()));
		Assert.assertEquals("Wrong type property", ConnectionType.WEBRTC, connection.getType());
		Assert.assertEquals("Wrong data property", "SERVER_SIDE_DATA", connection.getServerData());
		Assert.assertFalse("Wrong record property", connection.record());
		Assert.assertEquals("Wrong role property", OpenViduRole.MODERATOR, connection.getRole());
		Assert.assertTrue("Wrong rtspUri property", connection.getRtspUri() == null);
		Assert.assertTrue("Wrong adaptativeBitrate property", connection.adaptativeBitrate() == null);
		Assert.assertTrue("Wrong onlyPlayWithSubscribers property", connection.onlyPlayWithSubscribers() == null);
		Assert.assertTrue("Wrong networkCache property", connection.getNetworkCache() == null);
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
			Assert.assertTrue("Some Event property was wrong", iter.next());
			iter.remove();
		}

		// Both events should have publisher's connection ID
		Assert.assertTrue("Wrong connectionId in event NetworkQualityLevelChangedEvent", user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-0 .mat-expansion-panel:last-child .event-content"))
				.getAttribute("textContent").contains(connectionId));
		Assert.assertTrue("Wrong connectionId in event NetworkQualityLevelChangedEvent", user.getDriver()
				.findElement(By.cssSelector("#openvidu-instance-1 .mat-expansion-panel:last-child .event-content"))
				.getAttribute("textContent").contains(connectionId));

		gracefullyLeaveParticipants(user, 1);
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
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Filter applied"));
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Filter removed"));
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Filter applied"));
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value",
				"Error [There is already a filter applied"));
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Filter removed"));
		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "has no filter applied"));
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "has no filter applied"));

		// Image filter
		WebElement subscriberVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 video"));
		Map<String, Long> rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));

		// Green
		Assert.assertTrue((rgb.get("r") < 150) && (rgb.get("g") > 240) && (rgb.get("b") < 100));

		filterTypeInput.clear();
		filterTypeInput.sendKeys("VB:image");
		WebElement filterOptionsInput = user.getDriver().findElement(By.id("filter-options-field"));
		filterOptionsInput.clear();
		filterOptionsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/not_exists.jpg\"}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value",
				"Error loading background image"));

		filterOptionsInput = user.getDriver().findElement(By.id("filter-options-field"));
		filterOptionsInput.clear();
		filterOptionsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/red.jpg\"}");
		user.getDriver().findElement(By.id("apply-filter-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Filter applied"));

		rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));

		// Red
		Assert.assertTrue((rgb.get("r") > 250) && (rgb.get("g") < 10) && (rgb.get("b") < 40));

		// Fail exec method
		WebElement filterMethodInput = user.getDriver().findElement(By.id("filter-method-field"));
		filterMethodInput.clear();
		filterMethodInput.sendKeys("no_existing_method");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value",
				"Unknown Virtual Background method"));

		// Fail exec method params
		filterMethodInput.clear();
		filterMethodInput.sendKeys("update");
		WebElement filterParamsInput = user.getDriver().findElement(By.id("filter-params-field"));
		filterParamsInput.clear();
		filterParamsInput.sendKeys("wrong_params");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Wrong params syntax"));
		filterParamsInput.clear();
		filterParamsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/not_exists.jpg\"}");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value",
				"Error loading background image"));

		// Blue
		filterParamsInput.clear();
		filterParamsInput.sendKeys("{\"url\": \"https://openvidu.io/img/vb/blue.jpg\"}");
		user.getDriver().findElement(By.id("exec-filter-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Filter method executed"));
		rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));
		Assert.assertTrue((rgb.get("r") < 10) && (rgb.get("g") < 10) && (rgb.get("b") > 240));

		user.getDriver().findElement(By.id("remove-filter-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeContains(By.id("response-text-area"), "value", "Filter removed"));

		rgb = user.getEventManager().getAverageColorFromPixels(subscriberVideo,
				Arrays.asList(new Point[] { new Point(93, 30), new Point(30, 50) }));

		// Green
		Assert.assertTrue((rgb.get("r") < 150) && (rgb.get("g") > 240) && (rgb.get("b") < 100));

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Speech To Text disabled test")
	void speechToTextDisabledTest() throws Exception {

		log.info("Speech To Text disabled test");

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
	@DisplayName("Speech To Text simple transcription test")
	void speechToTextSimpleTranscriptionTest() throws Exception {

		log.info("Speech To Text simple transcription test");

		restartOpenViduServerIfNecessary(false, null, "vosk");

		List<String> expectedRecognitionList = Arrays.asList(
				"for example we used to think that after childhood the brain didnt really could not change and it turns out nothing is farther from the truth",
				"another misconception about the brain is that you only use parts of it at any given time and silent nothing",
				"well this is also untrue it turns out that even at risk and thinking of nothing your brain is highly active");

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
		final CountDownLatch latch = new CountDownLatch(4);

		user.getEventManager().on("speechToTextMessage", (event) -> {
			String reason = event.get("reason").getAsString();
			String text = event.get("text").getAsString();
			if ("recognized".equals(reason)) {
				recognizedSttEvents.add(text);
				latch.countDown();
			} else if ("recognizing".equals(reason)) {
				recognizingSttEvents.add(text);
			} else {
				Assert.fail("Unknown SpeechToText event 'reason' property " + reason);
			}
		});

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .other-operations-btn")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.cssSelector("#sub-stt-btn")).click();

		latch.await();

		Assert.assertTrue("recognizing STT events should be greater than 0", recognizingSttEvents.size() > 0);
		Assert.assertTrue("recognized STT events should be greater than 0",
				recognizingSttEvents.size() > recognizedSttEvents.size());

		// The expected text may be in just 2 recognized events instead of 3
		int expectedCharCount = expectedRecognitionList.stream().mapToInt(w -> w.length()).sum();
		int recognizedCharCount = recognizedSttEvents.stream().mapToInt(w -> w.length()).sum();
		int maxAllowedCountDifference = 50;
		if (recognizedCharCount > (expectedCharCount + maxAllowedCountDifference)) {
			recognizedSttEvents.remove(recognizedSttEvents.size() - 1);
			System.out.println("Removed one element of recognized collection!");
		}
		recognizedCharCount = recognizedSttEvents.stream().mapToInt(w -> w.length()).sum();
		if (recognizedCharCount > (expectedCharCount + maxAllowedCountDifference)) {
			recognizedSttEvents.remove(recognizedSttEvents.size() - 1);
			System.out.println("Removed a second element of recognized collection!");
		}

		String finalRecognition = String.join(" ", recognizedSttEvents).toLowerCase().replaceAll("[^a-z ]", "");
		String expectedRecognition = String.join(" ", expectedRecognitionList);

		// Cosine similarity string comparison has been proven the most accurate one
		double cosineSimilarity = new Cosine().distance(finalRecognition, expectedRecognition);

		Assert.assertTrue("Wrong similarity between actual and expected recognized text", cosineSimilarity < 0.2);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Speech To Text close session test")
	void speechToTextCloseSessionTest() throws Exception {

		log.info("Speech To Text close session");

		restartOpenViduServerIfNecessary(false, null, "vosk");

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .other-operations-btn")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.cssSelector("#sub-stt-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", "Subscribed to STT"));
		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 5);

		CustomHttpClient restClient = new CustomHttpClient(OpenViduTestAppE2eTest.OPENVIDU_URL, "OPENVIDUAPP",
				OpenViduTestAppE2eTest.OPENVIDU_SECRET);
		restClient.rest(HttpMethod.DELETE, "/openvidu/api/sessions/TestSession", HttpStatus.SC_NO_CONTENT);

		user.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
		user.getEventManager().waitUntilEventReaches("sessionDisconnected", 1);

		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 2);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 2);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 2);

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .other-operations-btn")).click();
		Thread.sleep(500);

		user.getDriver().findElement(By.cssSelector("#sub-stt-btn")).click();
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", "Subscribed to STT"));
		user.getEventManager().waitUntilEventReaches("speechToTextMessage", 10);

		gracefullyLeaveParticipants(user, 1);
	}

	@Test
	@DisplayName("Speech To Text expected errors test")
	void speechToTextExpectedErrorsTest() throws Exception {

		log.info("Speech To Text expected errors");

		restartOpenViduServerIfNecessary(false, null, "vosk");

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

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .other-operations-btn")).click();
		Thread.sleep(500);

		WebElement sttSubBtn = user.getDriver().findElement(By.cssSelector("#sub-stt-btn"));
		WebElement sttUnsubBtn = user.getDriver().findElement(By.cssSelector("#unsub-stt-btn"));

		sttSubBtn.click();
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", "Subscribed to STT"));

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

		user.getDriver().findElement(By.cssSelector("#openvidu-instance-1 .other-operations-btn")).click();
		Thread.sleep(500);

		sttSubBtn = user.getDriver().findElement(By.cssSelector("#sub-stt-btn"));
		sttUnsubBtn = user.getDriver().findElement(By.cssSelector("#unsub-stt-btn"));

		sttSubBtn.click();
		user.getWaiter().until(
				ExpectedConditions.attributeToBe(By.id("operation-response-text-area"), "value", "Subscribed to STT"));
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

		restartOpenViduServerIfNecessary(false, null, "vosk");

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
			Assert.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assert.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("1 session 2 streams 2 subscriptions 1 language STT test")
	void oneSessionTwoStreamsTwoSubscriptionsOneLanguageSttTest() throws Exception {

		log.info("1 session 2 streams 2 subscriptions 1 language STT");

		restartOpenViduServerIfNecessary(false, null, "vosk");

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
			Assert.assertEquals(connectionId1,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assert.assertEquals(connectionId2,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("1 session 1 stream 2 subscriptions 2 languages STT test")
	void oneSessionOneStreamTwoSubscriptionsTwoLanguageSttTest() throws Exception {

		log.info("1 session 1 stream 2 subscriptions 2 languages STT");

		restartOpenViduServerIfNecessary(false, null, "vosk");

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
			Assert.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assert.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("es-ES", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("1 session 2 streams 2 subscriptions 2 languages STT test")
	void oneSessionTwoStreamsTwoSubscriptionsTwoLanguagesSttTest() throws Exception {

		log.info("1 session 2 streams 2 subscriptions 2 languages STT");

		restartOpenViduServerIfNecessary(false, null, "vosk");

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
			Assert.assertEquals(connectionId2,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("es-ES", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assert.assertEquals(connectionId1,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}

		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("2 sessions 2 streams 2 subscriptions 1 language STT test")
	void twoSessionsTwoStreamsTwoSubscriptionsOneLanguageSttTest() throws Exception {

		log.info("2 sessions 2 streams 2 subscriptions 1 language STT");

		restartOpenViduServerIfNecessary(false, null, "vosk");

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
			Assert.assertEquals(connectionId1,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}
		for (JsonObject event : finalSecondUserStts) {
			Assert.assertEquals(connectionId2,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}
	}

	@Test
	@DisplayName("4 sessions 4 streams 4 subscriptions 4 languages STT test")
	void fourSessionsFourStreamsFourSubscriptionsFourLanguageSttTest() throws Exception {

		log.info("4 sessions 4 streams 4 subscriptions 4 languages STT");

		restartOpenViduServerIfNecessary(false, null, "vosk");

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
				Assert.assertEquals(connectionIds.get(i),
						event.get("connection").getAsJsonObject().get("connectionId").getAsString());
				Assert.assertEquals(languages.get(i), event.get("lang").getAsString());
				Assert.assertFalse(event.get("text").getAsString().isBlank());
				Assert.assertFalse(event.get("raw").getAsString().isBlank());
			}
		}
	}

//    @Test
//    @DisplayName("Mix STT test")
//    void mixSttTest() throws Exception {
//
//    }
//
//    @Test
//    @DisplayName("STT and COMPOSED recording test")
//    void composedRecordingAndSttTest() throws Exception {
//
//    }

	@Test
	@DisplayName("Memory leak STT test")
	void memoryLeakSttTest() throws Exception {

		log.info("Memory leak STT");

		restartOpenViduServerIfNecessary(false, null, "vosk");

		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		user.getDriver().get(APP_URL);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);

		final String connectionId = getOwnConnectionId(user, 0);

		final int LOOPS = 10;

		this.sttSubUser(user, 0, 0, "en-US", true, false);
		for (int i = 0; i < LOOPS; i++) {
			this.sttUnsubUser(user, 0, 0, false, false);
			this.sttSubUser(user, 0, 0, "en-US", false, false);
		}

		Assert.assertEquals("Wrong number of connectionCreated events", 1,
				user.getEventManager().getNumEvents("connectionCreated").get());

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

		latch.await();

		final List<JsonObject> finalStts = new ArrayList<>();
		finalStts.addAll(stts);

		for (JsonObject event : finalStts) {
			Assert.assertEquals(connectionId,
					event.get("connection").getAsJsonObject().get("connectionId").getAsString());
			Assert.assertEquals("en-US", event.get("lang").getAsString());
			Assert.assertFalse(event.get("text").getAsString().isBlank());
			Assert.assertFalse(event.get("raw").getAsString().isBlank());
		}
	}

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
			Assert.fail("Error restarting OpenVidu Server");
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

}
