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

package io.openvidu.server.test.integration;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.reset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import io.openvidu.server.core.SessionManager;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.test.integration.config.IntegrationTestConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:integration-test.properties", properties = "OPENVIDU_RECORDING_PUBLIC_ACCESS=true")
@ContextConfiguration(classes = { IntegrationTestConfiguration.class })
@WebAppConfiguration
class OpenViduServerPublicRecordingsSecurityIntegrationTest {

    private static final String BASIC_AUTH = "Basic "
            + Base64.getEncoder().encodeToString("OPENVIDUAPP:MY_SECRET".getBytes(StandardCharsets.UTF_8));

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionManager sessionManager;

    @MockitoBean
    private RecordingManager recordingManager;

    @BeforeEach
    void setUpMocks() {
        reset(sessionManager, recordingManager);
        lenient().when(sessionManager.getSessionsWithNotActive()).thenReturn(Collections.emptyList());
        lenient().when(sessionManager.getSessionWithNotActive(anyString())).thenReturn(null);
        lenient().when(sessionManager.getSession(anyString())).thenReturn(null);
        lenient().when(sessionManager.getSessionNotActive(anyString())).thenReturn(null);
    }

    @Test
    void recordingsRemainPublicWithoutCredentials() throws Exception {
        mockMvc.perform(get("/openvidu/recordings/sample.txt").accept(MediaType.ALL))
                .andExpect(status().isNotFound());
    }

    @Test
    void recordingsAccessibleWithCredentialsToo() throws Exception {
        mockMvc.perform(get("/openvidu/recordings/sample.txt").accept(MediaType.ALL)
                .header(HttpHeaders.AUTHORIZATION, BASIC_AUTH)).andExpect(status().isNotFound());
    }
}
