/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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
import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.List;

import javax.annotation.PostConstruct;

import org.kurento.jsonrpc.internal.server.config.JsonRpcConfiguration;
import org.kurento.jsonrpc.server.JsonRpcConfigurer;
import org.kurento.jsonrpc.server.JsonRpcHandlerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
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

	@Autowired
	OpenviduConfig openviduConfig;

	public static final String KMSS_URIS_PROPERTY = "kms.uris";

	public static String wsUrl;

	public static String httpUrl;

	@Bean
	@ConditionalOnMissingBean
	public KmsManager kmsManager() {
		if (openviduConfig.getKmsUris().isEmpty()) {
			throw new IllegalArgumentException(KMSS_URIS_PROPERTY + " should contain at least one kms url");
		}
		String firstKmsWsUri = openviduConfig.getKmsUris().get(0);
		log.info("OpenVidu Server using one KMS: {}", firstKmsWsUri);
		return new FixedOneKmsManager();
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
	public SessionManager sessionManager() {
		return new KurentoSessionManager();
	}

	@Bean
	@ConditionalOnMissingBean
	public RpcHandler rpcHandler() {
		return new RpcHandler();
	}

	@Bean
	@ConditionalOnMissingBean
	public SessionEventsHandler sessionEventsHandler() {
		return new KurentoSessionEventsHandler();
	}

	@Bean
	@ConditionalOnMissingBean
	public CallDetailRecord cdr() {
		List<CDRLogger> loggers = new ArrayList<>();
		if (openviduConfig.isCdrEnabled()) {
			log.info("OpenVidu CDR is enabled");
			loggers.add(new CDRLoggerFile());
		}
		if (openviduConfig.isWebhookEnabled()) {
			loggers.add(new CDRLoggerWebhook(openviduConfig));
		}
		return new CallDetailRecord(loggers);
	}

	@Bean
	@ConditionalOnMissingBean
	public KurentoParticipantEndpointConfig kurentoEndpointConfig() {
		return new KurentoParticipantEndpointConfig();
	}

	@Bean
	@ConditionalOnMissingBean
	public TokenGenerator tokenGenerator() {
		return new TokenGeneratorDefault();
	}

	@Bean
	@ConditionalOnMissingBean
	public RecordingManager recordingManager() {
		return new RecordingManager();
	}

	@Bean
	@ConditionalOnMissingBean
	public RecordingDownloader recordingDownload() {
		return new DummyRecordingDownloader();
	}

	@Bean
	@ConditionalOnMissingBean
	public CoturnCredentialsService coturnCredentialsService() {
		return new CoturnCredentialsServiceFactory().getCoturnCredentialsService(openviduConfig.getSpringProfile());
	}

	@Bean
	@ConditionalOnMissingBean
	public GeoLocationByIp geoLocationByIp() {
		return new GeoLocationByIpDummy();
	}

	@Override
	public void registerJsonRpcHandlers(JsonRpcHandlerRegistry registry) {
		registry.addHandler(rpcHandler().withPingWatchdog(true).withInterceptors(new HttpHandshakeInterceptor()),
				"/openvidu");
	}

	private static String getContainerIp() throws IOException, InterruptedException {
		return CommandExecutor.execCommand("/bin/sh", "-c", "hostname -i | awk '{print $1}'");
	}

	public static void main(String[] args) throws Exception {
		log.info("Using /dev/urandom for secure random generation");
		System.setProperty("java.security.egd", "file:/dev/./urandom");
		SpringApplication.run(OpenViduServer.class, args);
	}

	@PostConstruct
	public void init() throws MalformedURLException, InterruptedException {
		String publicUrl = this.openviduConfig.getOpenViduPublicUrl();
		String type = publicUrl;

		switch (publicUrl) {
		case "docker":
			try {
				String containerIp = getContainerIp();
				OpenViduServer.wsUrl = "wss://" + containerIp + ":" + openviduConfig.getServerPort();
			} catch (Exception e) {
				log.error("Docker container IP was configured, but there was an error obtaining IP: "
						+ e.getClass().getName() + " " + e.getMessage());
				log.error("Fallback to local URL");
				OpenViduServer.wsUrl = null;
			}
			break;

		case "local":
			break;

		case "":
			break;

		default:

			type = "custom";

			if (publicUrl.startsWith("https://")) {
				OpenViduServer.wsUrl = publicUrl.replace("https://", "wss://");
			} else if (publicUrl.startsWith("http://")) {
				OpenViduServer.wsUrl = publicUrl.replace("http://", "wss://");
			}

			if (!OpenViduServer.wsUrl.startsWith("wss://")) {
				OpenViduServer.wsUrl = "wss://" + OpenViduServer.wsUrl;
			}
		}

		if (OpenViduServer.wsUrl == null) {
			type = "local";
			OpenViduServer.wsUrl = "wss://localhost:" + openviduConfig.getServerPort();
		}

		if (OpenViduServer.wsUrl.endsWith("/")) {
			OpenViduServer.wsUrl = OpenViduServer.wsUrl.substring(0, OpenViduServer.wsUrl.length() - 1);
		}

		if (this.openviduConfig.isRecordingModuleEnabled()) {
			try {
				this.recordingManager().initializeRecordingManager();
			} catch (OpenViduException e) {
				String finalErrorMessage = "";
				if (e.getCodeValue() == Code.DOCKER_NOT_FOUND.getValue()) {
					finalErrorMessage = "Error connecting to Docker daemon. Enabling OpenVidu recording module requires Docker";
				} else if (e.getCodeValue() == Code.RECORDING_PATH_NOT_VALID.getValue()) {
					finalErrorMessage = "Error initializing recording path \""
							+ this.openviduConfig.getOpenViduRecordingPath()
							+ "\" set with system property \"openvidu.recording.path\"";
				} else if (e.getCodeValue() == Code.RECORDING_FILE_EMPTY_ERROR.getValue()) {
					finalErrorMessage = "Error initializing recording custom layouts path \""
							+ this.openviduConfig.getOpenviduRecordingCustomLayout()
							+ "\" set with system property \"openvidu.recording.custom-layout\"";
				}
				log.error(finalErrorMessage + ". Shutting down OpenVidu Server");
				System.exit(1);
			}
		}

		String finalUrl = OpenViduServer.wsUrl.replaceFirst("wss://", "https://").replaceFirst("ws://", "http://");
		openviduConfig.setFinalUrl(finalUrl);
		httpUrl = openviduConfig.getFinalUrl();
		log.info("OpenVidu Server using " + type + " URL: [" + OpenViduServer.wsUrl + "]");
	}

	@EventListener(ApplicationReadyEvent.class)
	public void whenReady() {
		final String NEW_LINE = System.lineSeparator();
		String str = NEW_LINE + NEW_LINE + "    ACCESS IP            " + NEW_LINE + "-------------------------"
				+ NEW_LINE + httpUrl + NEW_LINE + "-------------------------" + NEW_LINE;
		log.info(str);
	}

}
