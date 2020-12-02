package io.openvidu.test.e2e;

import static org.junit.Assert.fail;

import java.io.File;
import java.io.FileReader;
import java.util.Iterator;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.http.HttpStatus;
import org.junit.Assert;
import org.junit.jupiter.api.AfterEach;
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

import io.openvidu.java.client.Connection;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.Session;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.Unzipper;

public class OpenViduProTestAppE2eTest extends AbstractOpenViduTestAppE2eTest {

	protected volatile static boolean isNetworkQualityTest;

	@BeforeAll()
	protected static void setupAll() {
		checkFfmpegInstallation();
		loadEnvironmentVariables();
		setupBrowserDrivers();
		cleanFoldersAndSetUpOpenViduJavaClient();
	}

	@Override
	@AfterEach
	protected void dispose() {
		super.dispose();
		if (isNetworkQualityTest) {
			// Disable network quality API
			try {
				CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
				if (restClient.rest(HttpMethod.GET, "/openvidu/api/config", 200).get("OPENVIDU_PRO_NETWORK_QUALITY")
						.getAsBoolean()) {
					String body = "{'OPENVIDU_PRO_NETWORK_QUALITY':false}";
					restClient.rest(HttpMethod.POST, "/openvidu/api/restart", body, 200);
					waitUntilOpenViduRestarted(30);
				}
			} catch (Exception e) {
				log.error(e.getMessage());
				Assert.fail("Error restarting OpenVidu Server to disable Network quality API");
			} finally {
				isNetworkQualityTest = false;
			}
		}
	}

	@Test
	@DisplayName("Individual dynamic record")
	void individualDynamicRecordTest() throws Exception {
		isRecordingTest = true;

		setupBrowser("chrome");

		log.info("Individual dynamic record");

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

		// Start the recording for one of the not recorded users
		JsonObject sessionInfo = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/" + sessionName,
				HttpStatus.SC_OK);
		JsonArray connections = sessionInfo.get("connections").getAsJsonObject().get("content").getAsJsonArray();
		String connectionId1 = null;
		String streamId1 = null;
		// Get connectionId and streamId
		for (JsonElement connection : connections) {
			if (connection.getAsJsonObject().get("record").getAsBoolean()) {
				connectionId1 = connection.getAsJsonObject().get("connectionId").getAsString();
				streamId1 = connection.getAsJsonObject().get("publishers").getAsJsonArray().get(0).getAsJsonObject()
						.get("streamId").getAsString();
				break;
			}
		}

		restClient.rest(HttpMethod.POST, "/openvidu/api/recordings/start",
				"{'session':'" + sessionName + "','outputMode':'INDIVIDUAL'}", HttpStatus.SC_OK);
		user.getEventManager().waitUntilEventReaches("recordingStarted", 3);
		Thread.sleep(1000);

		// Start the recording for one of the not recorded users
		sessionInfo = restClient.rest(HttpMethod.GET, "/openvidu/api/sessions/" + sessionName, HttpStatus.SC_OK);
		connections = sessionInfo.get("connections").getAsJsonObject().get("content").getAsJsonArray();
		String connectionId2 = null;
		String streamId2 = null;
		// Get connectionId and streamId
		for (JsonElement connection : connections) {
			if (!connection.getAsJsonObject().get("record").getAsBoolean()) {
				connectionId2 = connection.getAsJsonObject().get("connectionId").getAsString();
				streamId2 = connection.getAsJsonObject().get("publishers").getAsJsonArray().get(0).getAsJsonObject()
						.get("streamId").getAsString();
				break;
			}
		}

		// Generate 3 total recordings of 1 second length for this same stream
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

		gracefullyLeaveParticipants(3);

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
		List<String> names = Stream.of(streamId2 + ".webm", streamId2 + "-1.webm", streamId2 + "-2.webm")
				.collect(Collectors.toList());
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
				Assert.assertTrue("File name not found among " + names.toString(),
						names.remove(file.get("name").getAsString()));
				count2++;
			} else {
				Assert.fail("Metadata file element does not belong to a known stream (" + fileStreamId + ")");
			}
		}
		Assert.assertEquals("Wrong number of recording files for stream " + streamId1, 1, count1);
		Assert.assertEquals("Wrong number of recording files for stream " + streamId2, 3, count2);
		Assert.assertTrue("Some expected file name didn't existed: " + names.toString(), names.isEmpty());
	}

	@Test
	@DisplayName("REST API PRO test")
	void restApiProTest() throws Exception {

		log.info("REST API PRO test");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);

		/**
		 * PATCH /openvidu/api/sessions/<SESSION_ID>/connection/<CONNECTION_ID>
		 **/
		String body = "{'customSessionId': 'CUSTOM_SESSION_ID'}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/sessions", body, HttpStatus.SC_OK);
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

		setupBrowser("chrome");

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
		}
		Thread.sleep(500);

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);

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
						new String[] { "location", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 1);

		// Updating only record should let role value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'record':true}", HttpStatus.SC_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'MODERATOR','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 2);

		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'SUBSCRIBER','record':true,'data':'OTHER DATA'}", HttpStatus.SC_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'SUBSCRIBER','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "platform", "clientData" }));

		user.getEventManager().waitUntilEventReaches("connectionPropertyChanged", 3);

		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + connectionId,
				"{'role':'PUBLISHER'}", HttpStatus.SC_OK, false, true, true,
				mergeJson(DEFAULT_JSON_ACTIVE_CONNECTION,
						"{'id':'" + connectionId + "','connectionId':'" + connectionId
								+ "','role':'PUBLISHER','record':true,'token':'" + token
								+ "','sessionId':'CUSTOM_SESSION_ID','createdAt':" + createdAt + ",'activeAt':"
								+ activeAt + ",'serverData':'MY_SERVER_PRO_DATA'}",
						new String[] { "location", "platform", "clientData" }));

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
		Thread.sleep(1000);

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

		user.getEventManager().resetEventThread();

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
				"{'VERSION':'STR','DOMAIN_OR_PUBLIC_IP':'STR','HTTPS_PORT':0,'OPENVIDU_PUBLICURL':'STR','OPENVIDU_CDR':false,'OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH':0,"
						+ "'OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH':0,'OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH':0,'OPENVIDU_SESSIONS_GARBAGE_INTERVAL':0,'OPENVIDU_SESSIONS_GARBAGE_THRESHOLD':0,"
						+ "'OPENVIDU_RECORDING':false,'OPENVIDU_RECORDING_VERSION':'STR','OPENVIDU_RECORDING_PATH':'STR','OPENVIDU_RECORDING_PUBLIC_ACCESS':false,'OPENVIDU_RECORDING_NOTIFICATION':'STR',"
						+ "'OPENVIDU_RECORDING_CUSTOM_LAYOUT':'STR','OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT':0,'OPENVIDU_WEBHOOK':false,'OPENVIDU_SERVER_DEPENDENCY_VERSION':'STR','KMS_URIS':[],"
						+ "'OPENVIDU_PRO_STATS_MONITORING_INTERVAL':0,'OPENVIDU_PRO_STATS_WEBRTC_INTERVAL':0,'OPENVIDU_PRO_CLUSTER_ID':'STR',"
						+ "'OPENVIDU_PRO_CLUSTER_ENVIRONMENT':'STR','OPENVIDU_PRO_CLUSTER_MEDIA_NODES':0,'OPENVIDU_PRO_CLUSTER_PATH':'STR','OPENVIDU_PRO_CLUSTER_AUTOSCALING':false,"
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

		isNetworkQualityTest = true;

		log.info("Network quality test");

		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		String body = "{'OPENVIDU_PRO_NETWORK_QUALITY':true, 'OPENVIDU_PRO_NETWORK_QUALITY_INTERVAL':5}";
		restClient.rest(HttpMethod.POST, "/openvidu/api/restart", body, 200);
		waitUntilOpenViduRestarted(30);

		setupBrowser("chrome");
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("join-btn")).click();

		user.getEventManager().waitUntilEventReaches("connectionCreated", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);
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
			gracefullyLeaveParticipants(1);
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

		gracefullyLeaveParticipants(1);
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

}
