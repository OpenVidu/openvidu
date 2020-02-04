/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

package io.openvidu.server;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.kurento.jsonrpc.internal.server.config.JsonRpcConfiguration;
import org.kurento.jsonrpc.server.JsonRpcConfigurer;
import org.kurento.jsonrpc.server.JsonRpcHandlerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;

import io.openvidu.server.cdr.CDRLogger;
import io.openvidu.server.cdr.CDRLoggerFile;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.HttpHandshakeInterceptor;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.TokenGenerator;
import io.openvidu.server.core.TokenGeneratorDefault;
import io.openvidu.server.coturn.CoturnCredentialsService;
import io.openvidu.server.coturn.CoturnCredentialsServiceFactory;
import io.openvidu.server.kurento.core.KurentoParticipantEndpointConfig;
import io.openvidu.server.kurento.core.KurentoSessionEventsHandler;
import io.openvidu.server.kurento.core.KurentoSessionManager;
import io.openvidu.server.kurento.kms.DummyLoadManager;
import io.openvidu.server.kurento.kms.FixedOneKmsManager;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.kurento.kms.LoadManager;
import io.openvidu.server.recording.DummyRecordingDownloader;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.rpc.RpcHandler;
import io.openvidu.server.rpc.RpcNotificationService;
import io.openvidu.server.utils.CommandExecutor;
import io.openvidu.server.utils.GeoLocationByIp;
import io.openvidu.server.utils.GeoLocationByIpDummy;
import io.openvidu.server.utils.MediaNodeStatusManager;
import io.openvidu.server.utils.MediaNodeStatusManagerDummy;
import io.openvidu.server.utils.QuarantineKiller;
import io.openvidu.server.utils.QuarantineKillerDummy;
import io.openvidu.server.webhook.CDRLoggerWebhook;

/**
 * OpenVidu Server application
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@Import({ JsonRpcConfiguration.class })
@SpringBootApplication
public class OpenViduServer implements JsonRpcConfigurer {

	private static final Logger log = LoggerFactory.getLogger(OpenViduServer.class);

	public static final String WS_PATH = "/openvidu";
	public static String publicurlType;
	public static String wsUrl;
	public static String httpUrl;

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public KmsManager kmsManager(OpenviduConfig openviduConfig) {
		if (openviduConfig.getKmsUris().isEmpty()) {
			throw new IllegalArgumentException("'kms.uris' should contain at least one KMS url");
		}
		String firstKmsWsUri = openviduConfig.getKmsUris().get(0);
		log.info("OpenVidu Server using one KMS: {}", firstKmsWsUri);
		return new FixedOneKmsManager();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public CallDetailRecord cdr(OpenviduConfig openviduConfig) {
		List<CDRLogger> loggers = new ArrayList<>();
		if (openviduConfig.isCdrEnabled()) {
			log.info("OpenVidu CDR service is enabled");
			loggers.add(new CDRLoggerFile());
		} else {
			log.info("OpenVidu CDR service is disabled");
		}
		if (openviduConfig.isWebhookEnabled()) {
			log.info("OpenVidu Webhook service is enabled");
			loggers.add(new CDRLoggerWebhook(openviduConfig));
		} else {
			log.info("OpenVidu Webhook service is disabled");
		}
		return new CallDetailRecord(loggers);
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public CoturnCredentialsService coturnCredentialsService(OpenviduConfig openviduConfig) {
		return new CoturnCredentialsServiceFactory().getCoturnCredentialsService(openviduConfig.getSpringProfile());
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public SessionManager sessionManager() {
		return new KurentoSessionManager();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public RpcHandler rpcHandler() {
		return new RpcHandler();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public SessionEventsHandler sessionEventsHandler() {
		return new KurentoSessionEventsHandler();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public TokenGenerator tokenGenerator() {
		return new TokenGeneratorDefault();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public RecordingManager recordingManager() {
		return new RecordingManager();
	}

	@Bean
	@ConditionalOnMissingBean
	public LoadManager loadManager() {
		return new DummyLoadManager();
	}

	@Bean
	@ConditionalOnMissingBean
	public RpcNotificationService notificationService() {
		return new RpcNotificationService();
	}

	@Bean
	@ConditionalOnMissingBean
	public KurentoParticipantEndpointConfig kurentoEndpointConfig() {
		return new KurentoParticipantEndpointConfig();
	}

	@Bean
	@ConditionalOnMissingBean
	public RecordingDownloader recordingDownload() {
		return new DummyRecordingDownloader();
	}

	@Bean
	@ConditionalOnMissingBean
	public GeoLocationByIp geoLocationByIp() {
		return new GeoLocationByIpDummy();
	}

	@Bean
	@ConditionalOnMissingBean
	public QuarantineKiller quarantineKiller() {
		return new QuarantineKillerDummy();
	}

	@Bean
	@ConditionalOnMissingBean
	public MediaNodeStatusManager mediaNodeStatusManager() {
		return new MediaNodeStatusManagerDummy();
	}

	@Override
	public void registerJsonRpcHandlers(JsonRpcHandlerRegistry registry) {
		registry.addHandler(rpcHandler().withPingWatchdog(true).withInterceptors(new HttpHandshakeInterceptor()),
				WS_PATH);
	}

	public static String getContainerIp() throws IOException, InterruptedException {
		return CommandExecutor.execCommand("/bin/sh", "-c", "hostname -i | awk '{print $1}'");
	}

	public static void main(String[] args) throws Exception {
		log.info("Using /dev/urandom for secure random generation");
		System.setProperty("java.security.egd", "file:/dev/./urandom");
		SpringApplication.run(OpenViduServer.class, args);
	}

	@EventListener(ApplicationReadyEvent.class)
	public void whenReady() {
		log.info("OpenVidu Server listening for client websocket connections on"
				+ (OpenViduServer.publicurlType.isEmpty() ? "" : (" " + OpenViduServer.publicurlType)) + " url "
				+ OpenViduServer.wsUrl + WS_PATH);
		final String NEW_LINE = System.lineSeparator();
		String str = NEW_LINE + NEW_LINE + "    OPENVIDU SERVER IP          " + NEW_LINE + "--------------------------"
				+ NEW_LINE + httpUrl + NEW_LINE + "--------------------------" + NEW_LINE;
		log.info(str);
	}

}
