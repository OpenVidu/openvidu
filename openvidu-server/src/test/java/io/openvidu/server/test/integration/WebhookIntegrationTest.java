package io.openvidu.server.test.integration;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.refEq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.apache.http.StatusLine;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.powermock.api.mockito.PowerMockito;
import org.powermock.reflect.Whitebox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;

import com.google.gson.JsonObject;

import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.core.Token;
import io.openvidu.server.kurento.core.KurentoSessionManager;
import io.openvidu.server.rest.SessionRestController;
import io.openvidu.server.rpc.RpcNotificationService;
import io.openvidu.server.test.integration.config.IntegrationTestConfiguration;
import io.openvidu.server.utils.GeoLocation;
import io.openvidu.server.webhook.CDRLoggerWebhook;
import io.openvidu.server.webhook.HttpWebhookSender;
import io.openvidu.test.browsers.utils.webhook.CustomWebhook;

/**
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@SpringBootTest(properties = { "OPENVIDU_WEBHOOK=true", "OPENVIDU_WEBHOOK_ENDPOINT=http://localhost:7777/webhook",
		"OPENVIDU_WEBHOOK_HEADERS=[]",
		"OPENVIDU_WEBHOOK_EVENTS=[\"sessionCreated\",\"participantJoined\",\"participantLeft\",\"signalSent\"]" })
@TestPropertySource(locations = "classpath:integration-test.properties")
@ContextConfiguration(classes = { IntegrationTestConfiguration.class })
@WebAppConfiguration
public class WebhookIntegrationTest {

	private static final Logger log = LoggerFactory.getLogger(WebhookIntegrationTest.class);

	@SpyBean
	private CallDetailRecord cdr;

	@SpyBean
	private SessionEventsHandler sessionEventsHandler;

	@SpyBean
	protected RpcNotificationService rpcNotificationService;

	@Autowired
	protected SessionRestController sessionRestController;

	@Autowired
	protected KurentoSessionManager kurentoSessionManager;

	private HttpWebhookSender webhook;

	private void mockWebhookHttpClient(int millisecondsDelayOnResponse) throws ClientProtocolException, IOException {
		CDRLoggerWebhook cdrLoggerWebhook = (CDRLoggerWebhook) cdr.getLoggers().stream()
				.filter(logger -> logger instanceof CDRLoggerWebhook).findFirst().get();

		try {
			this.webhook = Whitebox.getInternalState(cdrLoggerWebhook, "webhookSender");
		} catch (Exception e) {
			Assertions.fail("Error getting private property from stubbed object: " + e.getMessage());
		}

		CloseableHttpResponse httpResponse = mock(CloseableHttpResponse.class);
		StatusLine statusLine = mock(StatusLine.class);
		when(statusLine.getStatusCode()).thenReturn(200);
		when(httpResponse.getStatusLine()).thenReturn(statusLine);

		this.setHttpClientDelay(millisecondsDelayOnResponse);
	}

	private void setHttpClientDelay(int millisecondsDelayOnResponse) throws ClientProtocolException, IOException {
		HttpClient httpClient = null;
		try {
			httpClient = Whitebox.getInternalState(webhook, "httpClient");
		} catch (Exception e) {
			Assertions.fail("Error getting private property from stubbed object: " + e.getMessage());
		}
		httpClient = PowerMockito.spy(httpClient);
		doAnswer(invocationOnMock -> {
			Thread.sleep(millisecondsDelayOnResponse);
			return invocationOnMock.callRealMethod();
		}).when(httpClient).execute(Mockito.any(HttpUriRequest.class));
		Whitebox.setInternalState(webhook, "httpClient", httpClient);
	}

	@Test
	@DisplayName("Webhook event and RPC event should not interfere with each other")
	void webhookEventAndRpcEventShouldNotInterfereWithEachOtherTest() throws Exception {

		log.info("Webhook event and RPC event should not interfere with each other");

		this.mockWebhookHttpClient(500);

		CountDownLatch initLatch = new CountDownLatch(1);
		CustomWebhook.main(new String[0], initLatch);

		try {

			if (!initLatch.await(30, TimeUnit.SECONDS)) {
				Assertions.fail("Timeout waiting for webhook springboot app to start");
				CustomWebhook.shutDown();
				return;
			}

			final String sessionId = "WEBHOOK_TEST_SESSION";

			this.sessionRestController.initializeSession(Map.of("customSessionId", sessionId));

			// Webhook event "sessionCreated" is delayed 500 ms
			// Expected TimeoutException
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("sessionCreated", 250, TimeUnit.MILLISECONDS);
			});
			// Now webhook response for event "sessionCreated" should be received
			CustomWebhook.waitForEvent("sessionCreated", 1000, TimeUnit.MILLISECONDS);

			this.sessionRestController.initializeConnection(sessionId, Map.of());

			Session session = kurentoSessionManager.getSessionWithNotActive(sessionId);
			Token token = new Token("token", sessionId, new ConnectionProperties.Builder().build(), null);
			String participantPrivateId = "participantPrivateId";
			Participant participant = kurentoSessionManager.newParticipant(session, participantPrivateId, token, null,
					mock(GeoLocation.class), "platform", "finalUserId");
			kurentoSessionManager.joinRoom(participant, sessionId, 1);

			// Webhook event "participantJoined" is delayed 500 ms
			// Expected TimeoutException
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("participantJoined", 250, TimeUnit.MILLISECONDS);
			});

			// Client should have already received "connectionCreated" RPC response
			// nonetheless
			verify(sessionEventsHandler, times(1)).onParticipantJoined(refEq(participant), refEq(null), anyString(),
					anySet(), anyInt(), refEq(null));

			// Now webhook response for event "participantJoined" should be received
			CustomWebhook.waitForEvent("participantJoined", 1000, TimeUnit.MILLISECONDS);

			setHttpClientDelay(1);
			// These events will be received immediately
			this.sessionRestController.signal(Map.of("session", sessionId, "type", "1"));
			this.sessionRestController.signal(Map.of("session", sessionId, "type", "2"));
			setHttpClientDelay(500);
			// This event will be received after a delay
			this.sessionRestController.signal(Map.of("session", sessionId, "type", "3"));
			setHttpClientDelay(1);
			// These events should be received immediately after the delayed one
			this.sessionRestController.signal(Map.of("session", sessionId, "type", "4"));
			this.sessionRestController.signal(Map.of("session", sessionId, "type", "5"));

			// RPC signal notification should have already been sent 5 times,
			// no matter WebHook delays
			verify(rpcNotificationService, times(5)).sendNotification(refEq(participantPrivateId),
					refEq(ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD), any());

			// Events received immediately
			JsonObject signal1 = CustomWebhook.waitForEvent("signalSent", 25, TimeUnit.MILLISECONDS);
			JsonObject signal2 = CustomWebhook.waitForEvent("signalSent", 25, TimeUnit.MILLISECONDS);
			// Events not received due to timeout
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("signalSent", 25, TimeUnit.MILLISECONDS);
			});
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("signalSent", 25, TimeUnit.MILLISECONDS);
			});
			// Events now received after timeout
			JsonObject signal3 = CustomWebhook.waitForEvent("signalSent", 1000, TimeUnit.MILLISECONDS);
			JsonObject signal4 = CustomWebhook.waitForEvent("signalSent", 25, TimeUnit.MILLISECONDS);
			JsonObject signal5 = CustomWebhook.waitForEvent("signalSent", 25, TimeUnit.MILLISECONDS);

			// Order of webhook events should be honored
			Assertions.assertEquals("1", signal1.get("type").getAsString(), "Wrong signal type");
			Assertions.assertEquals("2", signal2.get("type").getAsString(), "Wrong signal type");
			Assertions.assertEquals("3", signal3.get("type").getAsString(), "Wrong signal type");
			Assertions.assertEquals("4", signal4.get("type").getAsString(), "Wrong signal type");
			Assertions.assertEquals("5", signal5.get("type").getAsString(), "Wrong signal type");

			this.sessionRestController.closeConnection(sessionId, participant.getParticipantPublicId());

			// Webhook is configured to receive "participantLeft" event
			CustomWebhook.waitForEvent("participantLeft", 25, TimeUnit.MILLISECONDS);

			// Webhook is NOT configured to receive "sessionDestroyed" event
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("sessionDestroyed", 1000, TimeUnit.MILLISECONDS);
			});

		} finally {
			CustomWebhook.shutDown();
		}
	}

}
