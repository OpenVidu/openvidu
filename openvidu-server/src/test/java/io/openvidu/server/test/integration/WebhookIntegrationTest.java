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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.util.ReflectionTestUtils;

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
			this.webhook = (HttpWebhookSender) ReflectionTestUtils.getField(cdrLoggerWebhook, "webhookSender");
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
			httpClient = (HttpClient) ReflectionTestUtils.getField(webhook, "httpClient");
		} catch (Exception e) {
			Assertions.fail("Error getting private property from stubbed object: " + e.getMessage());
		}
		// If httpClient is already a mock/spy, don't spy it again (Mockito will fail)
		boolean isMock = Mockito.mockingDetails(httpClient).isMock();
		boolean isSpy = Mockito.mockingDetails(httpClient).isSpy();

		if (!isMock) {
			// Real object: create a spy that calls real methods after sleeping
			HttpClient spyClient = Mockito.spy(httpClient);
			doAnswer(invocationOnMock -> {
				Thread.sleep(millisecondsDelayOnResponse);
				return invocationOnMock.callRealMethod();
			}).when(spyClient).execute(Mockito.any(HttpUriRequest.class));
			ReflectionTestUtils.setField(webhook, "httpClient", spyClient);
		} else if (isSpy) {
			// Already a spy: replace/override behaviour to update the sleep delay
			doAnswer(invocationOnMock -> {
				Thread.sleep(millisecondsDelayOnResponse);
				return invocationOnMock.callRealMethod();
			}).when(httpClient).execute(Mockito.any(HttpUriRequest.class));
		} else {
			// Already a plain mock (not a spy): return a mocked CloseableHttpResponse after
			// sleeping
			CloseableHttpResponse mockedResponse = mock(CloseableHttpResponse.class);
			StatusLine statusLine = mock(StatusLine.class);
			when(statusLine.getStatusCode()).thenReturn(200);
			when(mockedResponse.getStatusLine()).thenReturn(statusLine);
			doAnswer(invocationOnMock -> {
				Thread.sleep(millisecondsDelayOnResponse);
				return mockedResponse;
			}).when(httpClient).execute(Mockito.any(HttpUriRequest.class));
		}
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

			// Test basic webhook functionality with delay
			this.sessionRestController.initializeSession(Map.of("customSessionId", sessionId));

			// Webhook event "sessionCreated" is delayed 500 ms
			// Expected TimeoutException when waiting only 250ms
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("sessionCreated", 250, TimeUnit.MILLISECONDS);
			});
			// Now webhook response for event "sessionCreated" should be received with longer timeout
			CustomWebhook.waitForEvent("sessionCreated", 1000, TimeUnit.MILLISECONDS);

			// Test RPC vs Webhook independence 
			this.sessionRestController.initializeConnection(sessionId, Map.of());

			Session session = kurentoSessionManager.getSessionWithNotActive(sessionId);
			Token token = new Token("token", sessionId, new ConnectionProperties.Builder().build(), null);
			String participantPrivateId = "participantPrivateId";
			Participant participant = kurentoSessionManager.newParticipant(session, participantPrivateId, token, null,
					mock(GeoLocation.class), "platform", "finalUserId");
			kurentoSessionManager.joinRoom(participant, sessionId, 1);

			// Webhook event "participantJoined" is delayed 500 ms
			// Expected TimeoutException when waiting only 250ms
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("participantJoined", 250, TimeUnit.MILLISECONDS);
			});

			// Client should have already received "connectionCreated" RPC response
			// This proves RPC events are not blocked by webhook delays
			verify(sessionEventsHandler, times(1)).onParticipantJoined(refEq(participant), refEq(null), anyString(),
					anySet(), anyInt(), refEq(null));

			// Now webhook response for event "participantJoined" should be received
			CustomWebhook.waitForEvent("participantJoined", 1000, TimeUnit.MILLISECONDS);

			// Test multiple setHttpClientDelay calls work correctly 
			setHttpClientDelay(1);
			this.sessionRestController.signal(Map.of("session", sessionId, "type", "test1"));
			CustomWebhook.waitForEvent("signalSent", 100, TimeUnit.MILLISECONDS);

			setHttpClientDelay(300);
			this.sessionRestController.signal(Map.of("session", sessionId, "type", "test2"));
			// Should timeout because webhook is delayed 300ms
			assertThrows(TimeoutException.class, () -> {
				CustomWebhook.waitForEvent("signalSent", 100, TimeUnit.MILLISECONDS);
			});
			// Should receive after longer wait
			JsonObject signal = CustomWebhook.waitForEvent("signalSent", 1000, TimeUnit.MILLISECONDS);
			Assertions.assertEquals("test2", signal.get("type").getAsString(), "Wrong signal type");

			// RPC signal notifications should have been sent immediately regardless of webhook delays
			verify(rpcNotificationService, times(2)).sendNotification(refEq(participantPrivateId),
					refEq(ProtocolElements.PARTICIPANTSENDMESSAGE_METHOD), any());

			this.sessionRestController.closeConnection(sessionId, participant.getParticipantPublicId());

			// Webhook is configured to receive "participantLeft" event
			setHttpClientDelay(1); // Reset to fast for cleanup
			CustomWebhook.waitForEvent("participantLeft", 500, TimeUnit.MILLISECONDS);

		} finally {
			CustomWebhook.shutDown();
		}
	}

}
