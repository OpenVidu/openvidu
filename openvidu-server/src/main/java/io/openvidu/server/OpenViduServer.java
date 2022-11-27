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

package io.openvidu.server;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;

import org.kurento.jsonrpc.internal.server.config.JsonRpcConfiguration;
import org.kurento.jsonrpc.server.JsonRpcConfigurer;
import org.kurento.jsonrpc.server.JsonRpcHandlerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;

import io.openvidu.server.cdr.CDRLogger;
import io.openvidu.server.cdr.CDRLoggerFile;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.HttpHandshakeInterceptor;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.config.OpenviduConfig.Error;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.TokenGenerator;
import io.openvidu.server.core.TokenRegister;
import io.openvidu.server.coturn.CoturnCredentialsService;
import io.openvidu.server.kurento.core.KurentoParticipantEndpointConfig;
import io.openvidu.server.kurento.core.KurentoSessionEventsHandler;
import io.openvidu.server.kurento.core.KurentoSessionManager;
import io.openvidu.server.kurento.kms.DummyLoadManager;
import io.openvidu.server.kurento.kms.FixedOneKmsManager;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.kurento.kms.LoadManager;
import io.openvidu.server.recording.DummyRecordingDownloader;
import io.openvidu.server.recording.DummyRecordingUploader;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.recording.RecordingUploader;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.recording.service.RecordingManagerUtils;
import io.openvidu.server.recording.service.RecordingManagerUtilsLocalStorage;
import io.openvidu.server.rest.ApiRestPathRewriteFilter;
import io.openvidu.server.rest.RequestMappings;
import io.openvidu.server.rpc.RpcHandler;
import io.openvidu.server.rpc.RpcNotificationService;
import io.openvidu.server.utils.CommandExecutor;
import io.openvidu.server.utils.GeoLocationByIp;
import io.openvidu.server.utils.GeoLocationByIpDummy;
import io.openvidu.server.utils.LocalCustomFileManager;
import io.openvidu.server.utils.LocalDockerManager;
import io.openvidu.server.utils.MediaNodeManager;
import io.openvidu.server.utils.MediaNodeManagerDummy;
import io.openvidu.server.utils.SDPMunging;
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

	public static String wsUrl;
	public static String httpUrl;

	@Autowired
	OpenviduConfig config;

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public CallDetailRecord cdr(OpenviduConfig openviduConfig) {
		List<CDRLogger> loggers = new ArrayList<>();
		if (openviduConfig.isCdrEnabled()) {
			log.info("OpenVidu CDR service is enabled");
			loggers.add(new CDRLoggerFile());
		} else {
			log.info("OpenVidu CDR service is disabled (may be enable with 'OPENVIDU_CDR=true')");
		}
		if (openviduConfig.isWebhookEnabled()) {
			log.info("OpenVidu Webhook service is enabled");
			loggers.add(new CDRLoggerWebhook(openviduConfig.getOpenViduWebhookEndpoint(),
					openviduConfig.getOpenViduWebhookHeaders(), openviduConfig.getOpenViduWebhookEvents()));
		} else {
			log.info("OpenVidu Webhook service is disabled (may be enabled with 'OPENVIDU_WEBHOOK=true')");
		}
		return new CallDetailRecord(loggers);
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public CoturnCredentialsService coturnCredentialsService(OpenviduConfig openviduConfig) {
		return new CoturnCredentialsService();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public SessionManager sessionManager() {
		return new KurentoSessionManager();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn({ "openviduConfig", "sessionManager", "loadManager" })
	public KmsManager kmsManager(OpenviduConfig openviduConfig, SessionManager sessionManager,
			LoadManager loadManager) {
		if (openviduConfig.getKmsUris().isEmpty()) {
			throw new IllegalArgumentException("'KMS_URIS' should contain at least one KMS url");
		}
		String firstKmsWsUri = openviduConfig.getKmsUris().get(0);
		log.info("OpenVidu Server using one KMS: {}", firstKmsWsUri);
		return new FixedOneKmsManager(sessionManager, loadManager);
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
		return new TokenGenerator();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public TokenRegister tokenRegister() {
		return new TokenRegister();
	}

	@Bean
	@ConditionalOnMissingBean
	@DependsOn("openviduConfig")
	public RecordingManager recordingManager() {
		return new RecordingManager(new LocalDockerManager(false), new LocalCustomFileManager());
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
	@DependsOn({ "openviduConfig", "recordingManager" })
	public RecordingManagerUtils recordingManagerUtils(OpenviduConfig openviduConfig,
			RecordingManager recordingManager) {
		return new RecordingManagerUtilsLocalStorage(openviduConfig, recordingManager);
	}

	@Bean
	@ConditionalOnMissingBean
	public RecordingUploader recordingUpload() {
		return new DummyRecordingUploader();
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
	public SDPMunging sdpMunging() {
		return new SDPMunging();
	}

	@Bean
	@ConditionalOnMissingBean
	public MediaNodeManager mediaNodeManager() {
		return new MediaNodeManagerDummy();
	}

	@Bean
	@ConditionalOnMissingBean
	@ConditionalOnProperty(name = "SUPPORT_DEPRECATED_API", havingValue = "true")
	public FilterRegistrationBean<ApiRestPathRewriteFilter> filterRegistrationBean() {
		FilterRegistrationBean<ApiRestPathRewriteFilter> registrationBean = new FilterRegistrationBean<ApiRestPathRewriteFilter>();
		ApiRestPathRewriteFilter apiRestPathRewriteFilter = new ApiRestPathRewriteFilter();
		registrationBean.setFilter(apiRestPathRewriteFilter);
		return registrationBean;
	}

	@Override
	public void registerJsonRpcHandlers(JsonRpcHandlerRegistry registry) {
		registry.addHandler(rpcHandler().withPingWatchdog(true).withInterceptors(new HttpHandshakeInterceptor()),
				RequestMappings.WS_RPC);
	}

	public static String getContainerIp() throws IOException, InterruptedException {
		return CommandExecutor.execCommand(5000, "/bin/sh", "-c", "hostname -i | awk '{print $1}'");
	}

	public static void main(String[] args) throws Exception {

		Map<String, String> CONFIG_PROPS = checkConfigProperties(OpenviduConfig.class);

		if (CONFIG_PROPS.get("SERVER_PORT") != null) {

			// Configuration property SERVER_PORT has been explicitly defined.
			// Must initialize the application in that port on the host regardless of what
			// HTTPS_PORT says. HTTPS_PORT does get used in the public URL.

			System.setProperty("server.port", CONFIG_PROPS.get("SERVER_PORT"));

			log.warn(
					"You have set property server.port (or SERVER_PORT). This will serve OpenVidu Server on your host at port "
							+ CONFIG_PROPS.get("SERVER_PORT") + ". But property HTTPS_PORT ("
							+ CONFIG_PROPS.get("HTTPS_PORT")
							+ ") still configures the port that should be used to connect to OpenVidu Server from outside. "
							+ "Bear this in mind when configuring a proxy in front of OpenVidu Server");

		} else if (CONFIG_PROPS.get("HTTPS_PORT") != null) {

			// Configuration property SERVER_PORT has NOT been explicitly defined.
			// Must initialize the application in port HTTPS_PORT on the host. HTTPS_PORT
			// does get used in the public URL as well.

			System.setProperty("server.port", CONFIG_PROPS.get("HTTPS_PORT"));

		}

		log.info("Using /dev/urandom for secure random generation");
		System.setProperty("java.security.egd", "file:/dev/./urandom");

		String[] argsAux = new String[args.length + 2];
		System.arraycopy(args, 0, argsAux, 0, args.length);
		argsAux[argsAux.length - 2] = "--spring.main.banner-mode=off";
		argsAux[argsAux.length - 1] = "--spring.main.allow-circular-references=true";

		SpringApplication.run(OpenViduServer.class, argsAux);

	}

	public static <T> Map<String, String> checkConfigProperties(Class<T> configClass) throws InterruptedException {

		ConfigurableApplicationContext app = SpringApplication.run(configClass,
				new String[] { "--spring.main.web-application-type=none" });
		OpenviduConfig config = app.getBean(OpenviduConfig.class);
		List<Error> errors = config.getConfigErrors();

		if (!errors.isEmpty()) {

			// @formatter:off
			String msg = "\n\n\n" + "   Configuration errors\n" + "   --------------------\n" + "\n";

			for (Error error : config.getConfigErrors()) {
				msg += "   * ";
				if (error.getProperty() != null) {
					msg += "Property " + config.getPropertyName(error.getProperty());
					if (error.getValue() == null || error.getValue().equals("")) {
						msg += " is not set. ";
					} else {
						msg += "=" + error.getValue() + ". ";
					}
				}

				msg += error.getMessage() + "\n";
			}

			msg += "\n" + "\n" + "   Fix config errors\n" + "   ---------------\n" + "\n"
					+ "   1) Return to shell pressing Ctrl+C\n"
					+ "   2) Set correct values in '.env' configuration file\n" + "   3) Restart OpenVidu with:\n"
					+ "\n" + "      $ ./openvidu restart\n" + "\n";
			// @formatter:on

			log.info(msg);

			// Wait forever
			new Semaphore(0).acquire();

		} else {

			String msg = "\n\n\n" + "   Configuration properties\n" + "   ------------------------\n" + "\n";

			final Map<String, String> CONFIG_PROPS = config.getConfigProps();
			List<String> configPropNames = new ArrayList<>(config.getUserProperties());
			Collections.sort(configPropNames);

			for (String property : configPropNames) {
				String value = CONFIG_PROPS.get(property);
				if (config.getSecretProperties().contains(property)) {
					value = config.hideSecret(value, "*", 0);
				}
				msg += "   * " + config.getPropertyName(property) + "=" + (value == null ? "" : value) + "\n";
			}
			msg += "\n\n";

			log.info(msg);

			// Close the auxiliary ApplicationContext
			app.close();

			return CONFIG_PROPS;
		}
		return null;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void whenReady() {

		String dashboardUrl = httpUrl + config.getOpenViduFrontendDefaultPath().replaceAll("^/", "");

		// @formatter:off
		String msg = "\n\n----------------------------------------------------\n" + "\n" + "   OpenVidu is ready!\n"
				+ "   ---------------------------\n" + "\n" + "   * OpenVidu Server URL: " + httpUrl + "\n" + "\n"
				+ "   * OpenVidu Dashboard: " + dashboardUrl + "\n" + "\n"
				+ "----------------------------------------------------\n";
		// @formatter:on

		if (config.isOpenViduDev()) {
			// @formatter:off
			msg += "\n\n    WARNING!! THIS OPENVIDU DEPLOYMENT IS NOT SUITABLE FOR PRODUCTION ENVIRONMENTS\n"
					+ "    To deploy in production visit https://docs.openvidu.io/en/stable/deployment\n\n";
			// @formatter:on
		}

		log.info(msg);
	}

}
