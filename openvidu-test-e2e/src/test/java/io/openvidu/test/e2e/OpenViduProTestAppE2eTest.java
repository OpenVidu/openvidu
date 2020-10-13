package io.openvidu.test.e2e;

import java.io.File;
import java.io.FileReader;
import java.util.List;
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

import io.openvidu.java.client.Connection;
import io.openvidu.java.client.ConnectionOptions;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.Session;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.Unzipper;

public class OpenViduProTestAppE2eTest extends AbstractOpenViduTestAppE2eTest {

	@BeforeAll()
	protected static void setupAll() {
		checkFfmpegInstallation();
		loadEnvironmentVariables();
		setupBrowserDrivers();
		cleanFoldersAndSetUpOpenViduJavaClient();
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
		checkIndividualRecording(recPath, recording, 4, "opus", "vp8", true);

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
		body = "{'session':'CUSTOM_SESSION_ID','role':'PUBLISHER','record':false}";
		JsonObject res = restClient.rest(HttpMethod.POST, "/openvidu/api/tokens", body, HttpStatus.SC_OK);
		final String token = res.get("token").getAsString();
		final String tokenConnectionId = res.get("connectionId").getAsString();

		/** UPDATE TOKEN **/

		// Test with REST API
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'role':false}", HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'record':123}", HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'role':'PUBLISHER','record':'WRONG'}", HttpStatus.SC_BAD_REQUEST);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/WRONG/connection/" + tokenConnectionId,
				"{'role':'PUBLISHER','record':'WRONG'}", HttpStatus.SC_NOT_FOUND);
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/WRONG",
				"{'role':'PUBLISHER','record':true}", HttpStatus.SC_NOT_FOUND);

		// Updating only role should let record value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'role':'MODERATOR'}", HttpStatus.SC_OK, true, true, true,
				"{'id':'" + tokenConnectionId + "','object':'connection','connectionId':'" + tokenConnectionId
						+ "','role':'MODERATOR','record':false,'token':'" + token
						+ "','sessionId':'CUSTOM_SESSION_ID','serverData':'','publishers':null,'subscribers':null,'createdAt':null,'platform':null,'location':null,'clientData':null}");
		// Updating only record should let role value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'record':true}", HttpStatus.SC_OK, true, true, true,
				"{'id':'" + tokenConnectionId + "','object':'connection','connectionId':'" + tokenConnectionId
						+ "','role':'MODERATOR','record':true,'token':'" + token
						+ "','sessionId':'CUSTOM_SESSION_ID','serverData':'','publishers':null,'subscribers':null,'createdAt':null,'platform':null,'location':null,'clientData':null}");

		// Test with openvidu-java-client
		OpenVidu OV = new OpenVidu(OpenViduTestAppE2eTest.OPENVIDU_URL, OpenViduTestAppE2eTest.OPENVIDU_SECRET);
		Assert.assertTrue("OpenVidu object should have changed", OV.fetch());
		Session session = OV.getActiveSessions().get(0);
		try {
			session.updateConnection("WRONG_CONNECTION_ID", new ConnectionOptions.Builder().build());
			Assert.fail("Expected OpenViduHttpException exception");
		} catch (OpenViduHttpException exception) {
			Assert.assertEquals("Wrong HTTP status", HttpStatus.SC_NOT_FOUND, exception.getStatus());
		}
		Assert.assertFalse("Session object should not have changed", session.fetch());
		Connection connection = session.updateConnection(tokenConnectionId,
				new ConnectionOptions.Builder().role(OpenViduRole.SUBSCRIBER).record(false).build());
		Assert.assertEquals("Wrong role Connection property", OpenViduRole.SUBSCRIBER, connection.getRole());
		Assert.assertFalse("Wrong record Connection property", connection.record());

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
		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.SUBSCRIBER, connection.getRole());
		Assert.assertFalse("Wrong record in Connection object", connection.record());

		/** UPDATE CONNECTION **/

		// Test with REST API
		// Updating only role should let record value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'role':'MODERATOR'}", HttpStatus.SC_OK, false, true, true,
				"{'id':'" + tokenConnectionId + "','object':'connection','connectionId':'" + tokenConnectionId
						+ "','role':'MODERATOR','record':false,'token':'" + token
						+ "','sessionId':'CUSTOM_SESSION_ID','serverData':'','publishers':[],'subscribers':[]}");
		// Updating only record should let role value untouched
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'record':true}", HttpStatus.SC_OK, false, true, true,
				"{'id':'" + tokenConnectionId + "','object':'connection','connectionId':'" + tokenConnectionId
						+ "','role':'MODERATOR','record':true,'token':'" + token
						+ "','sessionId':'CUSTOM_SESSION_ID','serverData':'','publishers':[],'subscribers':[]}");
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'role':'SUBSCRIBER','record':true,'data':'OTHER DATA'}", HttpStatus.SC_OK, false, true, true,
				"{'id':'" + tokenConnectionId + "','object':'connection','connectionId':'" + tokenConnectionId
						+ "','role':'SUBSCRIBER','record':true,'token':'" + token
						+ "','sessionId':'CUSTOM_SESSION_ID','serverData':'','publishers':[],'subscribers':[]}");
		restClient.rest(HttpMethod.PATCH, "/openvidu/api/sessions/CUSTOM_SESSION_ID/connection/" + tokenConnectionId,
				"{'role':'PUBLISHER'}", HttpStatus.SC_OK, false, true, true,
				"{'id':'" + tokenConnectionId + "','object':'connection','connectionId':'" + tokenConnectionId
						+ "','role':'PUBLISHER','record':true,'token':'" + token
						+ "','sessionId':'CUSTOM_SESSION_ID','serverData':'','publishers':[],'subscribers':[]}");

		// Test with openvidu-node-client
		user.getDriver().findElement(By.id("session-api-btn-0")).click();
		Thread.sleep(1000);
		user.getDriver().findElement(By.id("connection-id-field")).clear();
		user.getDriver().findElement(By.id("connection-id-field")).sendKeys(tokenConnectionId);
		user.getDriver().findElement(By.id("update-connection-api-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Connection updated: {\"role\":\"PUBLISHER\",\"record\":true}"));
		user.getDriver().findElement(By.id("record-checkbox")).click();
		user.getDriver().findElement(By.id("token-role-select")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("option-SUBSCRIBER")).click();
		Thread.sleep(500);
		user.getDriver().findElement(By.id("update-connection-api-btn")).click();
		user.getWaiter().until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value",
				"Connection updated: {\"role\":\"SUBSCRIBER\",\"record\":false}"));
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(1000);

		// Test with openvidu-java-client
		Assert.assertFalse("Session object should not have changed", session.fetch());
		try {
			session.updateConnection("WRONG_CONNECTION_ID", new ConnectionOptions.Builder().build());
			Assert.fail("Expected OpenViduHttpException exception");
		} catch (OpenViduHttpException exception) {
			Assert.assertEquals("Wrong HTTP status", HttpStatus.SC_NOT_FOUND, exception.getStatus());
		}
		Assert.assertFalse("Session object should not have changed", session.fetch());
		connection = session.updateConnection(tokenConnectionId,
				new ConnectionOptions.Builder().role(OpenViduRole.PUBLISHER).build());
		Assert.assertFalse("Session object should not have changed", session.fetch());
		Assert.assertEquals("Wrong connectionId in Connection object", tokenConnectionId, connection.getConnectionId());
		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.PUBLISHER, connection.getRole());
		Assert.assertTrue("Wrong record in Connection object", connection.record());
		connection = session.updateConnection(tokenConnectionId,
				new ConnectionOptions.Builder().role(OpenViduRole.SUBSCRIBER).build());
		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.SUBSCRIBER, connection.getRole());
		Assert.assertFalse("Session object should not have changed", session.fetch());
		connection = session.updateConnection(tokenConnectionId,
				new ConnectionOptions.Builder().role(OpenViduRole.MODERATOR).record(false).data("NO CHANGE").build());
		Assert.assertFalse("Session object should not have changed", session.fetch());
		Assert.assertEquals("Wrong role in Connection object", OpenViduRole.MODERATOR, connection.getRole());
		Assert.assertFalse("Wrong record in Connection object", connection.record());
		Assert.assertTrue("Wrong data in Connection object", connection.getServerData().isEmpty());

		user.getEventManager().resetEventThread();

		user.getWaiter().until(ExpectedConditions.elementToBeClickable(By.cssSelector(".republish-error-btn")));
		user.getDriver().findElement(By.cssSelector(".republish-error-btn")).click();

		user.getEventManager().waitUntilEventReaches("accessAllowed", 1);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 1);
		user.getEventManager().waitUntilEventReaches("streamCreated", 1);

		// connectionId should be equal to the one brought by the token
		Assert.assertEquals("Wrong connectionId", tokenConnectionId,
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
						+ "'OPENVIDU_PRO_KIBANA_HOST':'STR','OPENVIDU_PRO_RECORDING_STORAGE':'STR','OPENVIDU_PRO_NETWORK_QUALITY':false}");

		/** GET /openvidu/api/health **/
		restClient.rest(HttpMethod.GET, "/openvidu/api/health", null, HttpStatus.SC_OK, true, true, true,
				"{'status':'UP'}");
	}

}
