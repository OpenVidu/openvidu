package io.openvidu.server.test.integration.security;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.reset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import io.openvidu.server.core.SessionManager;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.test.integration.config.IntegrationTestConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:integration-test.properties")
@ContextConfiguration(classes = { IntegrationTestConfiguration.class })
@WebAppConfiguration
class OpenViduServerSecurityIntegrationTest {

	private static final String BASIC_AUTH = "Basic "
			+ Base64.getEncoder().encodeToString("OPENVIDUAPP:MY_SECRET".getBytes(StandardCharsets.UTF_8));

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private SessionManager sessionManager;

	@MockBean
	private RecordingManager recordingManager;

	@BeforeEach
	void setUpMocks() {
		reset(sessionManager, recordingManager);
		lenient().when(sessionManager.getSessionsWithNotActive()).thenReturn(Collections.emptyList());
		lenient().when(sessionManager.getSessionWithNotActive(anyString())).thenReturn(null);
		lenient().when(sessionManager.getSession(anyString())).thenReturn(null);
		lenient().when(sessionManager.getSessionNotActive(anyString())).thenReturn(null);
	}

	static Stream<Arguments> protectedEndpoints() {
		return Stream.of(
				Arguments.of(HttpMethod.GET, "/openvidu/api/config", null, MediaType.APPLICATION_JSON, 200),
				Arguments.of(HttpMethod.GET, "/openvidu/api/config/openvidu-version", null,
						MediaType.APPLICATION_JSON, 200),
				Arguments.of(HttpMethod.GET, "/openvidu/api/config/openvidu-recording", null,
						MediaType.APPLICATION_JSON, 200),
				Arguments.of(HttpMethod.GET, "/openvidu/api/config/openvidu-recording-path", null,
						MediaType.APPLICATION_JSON, 200),
				Arguments.of(HttpMethod.GET, "/openvidu/api/config/openvidu-cdr", null, MediaType.APPLICATION_JSON,
						200),
				Arguments.of(HttpMethod.POST, "/openvidu/api/sessions", "{}", MediaType.APPLICATION_JSON, 409),
				Arguments.of(HttpMethod.GET, "/openvidu/api/sessions", null, MediaType.APPLICATION_JSON, 200),
				Arguments.of(HttpMethod.GET, "/openvidu/api/sessions/SESSION_ID", null, MediaType.APPLICATION_JSON,
						404),
				Arguments.of(HttpMethod.DELETE, "/openvidu/api/sessions/SESSION_ID", null, MediaType.APPLICATION_JSON,
						404),
				Arguments.of(HttpMethod.POST, "/openvidu/api/sessions/SESSION_ID/connection", "{}",
						MediaType.APPLICATION_JSON, 404),
				Arguments.of(HttpMethod.GET, "/openvidu/api/sessions/SESSION_ID/connection", null,
						MediaType.APPLICATION_JSON, 404),
				Arguments.of(HttpMethod.GET, "/openvidu/api/sessions/SESSION_ID/connection/CONNECTION_ID", null,
						MediaType.APPLICATION_JSON, 400),
				Arguments.of(HttpMethod.DELETE, "/openvidu/api/sessions/SESSION_ID/connection/CONNECTION_ID", null,
						MediaType.APPLICATION_JSON, 400),
				Arguments.of(HttpMethod.POST, "/openvidu/api/recordings/start", "{\"session\":\"S\"}",
						MediaType.APPLICATION_JSON, 501),
				Arguments.of(HttpMethod.POST, "/openvidu/api/recordings/stop/RECORDING_ID", null,
						MediaType.APPLICATION_JSON, 501),
				Arguments.of(HttpMethod.GET, "/openvidu/api/recordings/RECORDING_ID", null, MediaType.APPLICATION_JSON,
						501),
				Arguments.of(HttpMethod.GET, "/openvidu/api/recordings", null, MediaType.APPLICATION_JSON, 501),
				Arguments.of(HttpMethod.DELETE, "/openvidu/api/recordings/RECORDING_ID", null,
						MediaType.APPLICATION_JSON, 501),
				Arguments.of(HttpMethod.POST, "/openvidu/api/tokens", "{\"session\":\"S\"}",
						MediaType.APPLICATION_JSON, 404),
				Arguments.of(HttpMethod.DELETE, "/openvidu/api/sessions/SESSION_ID/stream/STREAM_ID", null,
						MediaType.APPLICATION_JSON, 400),
				Arguments.of(HttpMethod.POST, "/openvidu/api/signal", "{\"session\":\"S\"}",
						MediaType.APPLICATION_JSON, 404),
				Arguments.of(HttpMethod.GET, "/openvidu/cdr", null, MediaType.APPLICATION_JSON, 200),
				Arguments.of(HttpMethod.GET, "/dashboard/index.html", null, MediaType.TEXT_HTML, 200),
				Arguments.of(HttpMethod.GET, "/dashboard/not-exists.html", null, MediaType.TEXT_HTML, 404),
				Arguments.of(HttpMethod.GET, "/openvidu/layouts/custom/test", null, MediaType.TEXT_HTML, 404),
				Arguments.of(HttpMethod.GET, "/openvidu/recordings/sample.txt", null,
						MediaType.APPLICATION_OCTET_STREAM,
						404));
	}

	static Stream<Arguments> publicEndpoints() {
		return Stream.of(
				Arguments.of(HttpMethod.GET, "/openvidu/api/config/openvidu-publicurl", null,
						MediaType.APPLICATION_JSON, 200),
				Arguments.of(HttpMethod.GET, "/openvidu/accept-certificate", null, MediaType.TEXT_HTML, 200));
	}

	@ParameterizedTest(name = "{1} requires authentication")
	@MethodSource("protectedEndpoints")
	void protectedEndpointsRequireAuthentication(HttpMethod method, String path, String body, MediaType contentType,
			int expectedStatus) throws Exception {
		perform(method, path, body, contentType, false).andExpect(status().isUnauthorized());
	}

	@ParameterizedTest(name = "{1} authenticates successfully")
	@MethodSource("protectedEndpoints")
	void protectedEndpointsAllowAuthenticatedAccess(HttpMethod method, String path, String body, MediaType contentType,
			int expectedStatus) throws Exception {
		perform(method, path, body, contentType, true).andExpect(status().is(expectedStatus));
	}

	@ParameterizedTest(name = "{1} stays public")
	@MethodSource("publicEndpoints")
	void publicEndpointsRemainAccessible(HttpMethod method, String path, String body, MediaType contentType,
			int expectedStatus) throws Exception {
		perform(method, path, body, contentType, false).andExpect(status().is(expectedStatus));
	}

	@ParameterizedTest(name = "{1} accessible with credentials")
	@MethodSource("publicEndpoints")
	void publicEndpointsWithCredentials(HttpMethod method, String path, String body, MediaType contentType,
			int expectedStatus) throws Exception {
		perform(method, path, body, contentType, true).andExpect(status().is(expectedStatus));
	}

	private ResultActions perform(HttpMethod method, String path, String body, MediaType contentType,
			boolean authenticated) throws Exception {
		MockHttpServletRequestBuilder builder;
		if (HttpMethod.GET.equals(method)) {
			builder = get(path);
		} else if (HttpMethod.POST.equals(method)) {
			builder = post(path);
		} else if (HttpMethod.DELETE.equals(method)) {
			builder = delete(path);
		} else {
			throw new IllegalArgumentException("Unsupported method: " + method);
		}
		builder.accept(MediaType.ALL);
		if (body != null) {
			builder.contentType(contentType).content(body);
		}
		if (authenticated) {
			builder.header(HttpHeaders.AUTHORIZATION, BASIC_AUTH);
		}
		return mockMvc.perform(builder);
	}
}
