/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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
import java.net.URL;
import java.util.List;

import javax.annotation.PostConstruct;
import javax.ws.rs.ProcessingException;

import org.kurento.jsonrpc.JsonUtils;
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
import org.springframework.core.env.Environment;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import io.openvidu.server.cdr.CDRLoggerFile;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.coturn.CoturnCredentialsService;
import io.openvidu.server.coturn.CoturnCredentialsServiceFactory;
import io.openvidu.server.kurento.AutodiscoveryKurentoClientProvider;
import io.openvidu.server.kurento.KurentoClientProvider;
import io.openvidu.server.kurento.core.KurentoSessionEventsHandler;
import io.openvidu.server.kurento.core.KurentoSessionManager;
import io.openvidu.server.kurento.kms.FixedOneKmsManager;
import io.openvidu.server.recording.ComposedRecordingService;
import io.openvidu.server.rest.NgrokRestController;
import io.openvidu.server.rpc.RpcHandler;
import io.openvidu.server.rpc.RpcNotificationService;
import io.openvidu.server.utils.CommandExecutor;
import io.openvidu.server.utils.GeoLocationByIp;
import io.openvidu.server.utils.GeoLocationByIpDummy;

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
	private Environment env;

	public static final String KMSS_URIS_PROPERTY = "kms.uris";

	public static String publicUrl;

	private String ngrokAppUrl = "";

	@Bean
	@ConditionalOnMissingBean
	public KurentoClientProvider kmsManager() {

		JsonParser parser = new JsonParser();
		String uris = env.getProperty(KMSS_URIS_PROPERTY);
		JsonElement elem = parser.parse(uris);
		JsonArray kmsUris = elem.getAsJsonArray();
		List<String> kmsWsUris = JsonUtils.toStringList(kmsUris);

		if (kmsWsUris.isEmpty()) {
			throw new IllegalArgumentException(KMSS_URIS_PROPERTY + " should contain at least one kms url");
		}

		String firstKmsWsUri = kmsWsUris.get(0);

		if (firstKmsWsUri.equals("autodiscovery")) {
			log.info("Using autodiscovery rules to locate KMS on every pipeline");
			return new AutodiscoveryKurentoClientProvider();
		} else {
			log.info("Configuring OpenVidu Server to use first of the following kmss: " + kmsWsUris);
			return new FixedOneKmsManager(firstKmsWsUri);
		}
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
		return new CallDetailRecord(new CDRLoggerFile());
	}

	@Bean
	@ConditionalOnMissingBean
	public OpenviduConfig openviduConfig() {
		return new OpenviduConfig();
	}

	@Bean
	@ConditionalOnMissingBean
	public ComposedRecordingService composedRecordingService() {
		return new ComposedRecordingService();
	}

	@Bean
	public CoturnCredentialsService coturnCredentialsService() {
		return new CoturnCredentialsServiceFactory(openviduConfig()).getCoturnCredentialsService();
	}

	@Bean
	@ConditionalOnMissingBean
	public GeoLocationByIp geoLocationByIp() {
		return new GeoLocationByIpDummy();
	}

	@Override
	public void registerJsonRpcHandlers(JsonRpcHandlerRegistry registry) {
		registry.addHandler(rpcHandler().withPingWatchdog(true), "/openvidu");
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
		OpenviduConfig openviduConf = openviduConfig();

		String publicUrl = openviduConf.getOpenViduPublicUrl();
		String type = publicUrl;

		switch (publicUrl) {
		case "ngrok":
			try {
				NgrokRestController ngrok = new NgrokRestController();
				ngrokAppUrl = ngrok.getNgrokAppUrl();
				if (ngrokAppUrl.isEmpty()) {
					ngrokAppUrl = "(No tunnel 'app' found in ngrok.yml)";
				}

				// For frontend-only applications overriding openvidu-server dashboard...
				String ngrokServerUrl = ngrok.getNgrokServerUrl();
				if (ngrokServerUrl.isEmpty()) {
					ngrokServerUrl = ngrok.getNgrokAppUrl();
				}

				OpenViduServer.publicUrl = ngrokServerUrl.replaceFirst("https://", "wss://");
				openviduConf.setFinalUrl(ngrokServerUrl);

			} catch (Exception e) {
				log.error("Ngrok URL was configured, but there was an error connecting to ngrok: "
						+ e.getClass().getName() + " " + e.getMessage());
				log.error("Fallback to local URL");
			}
			break;

		case "docker":
			try {
				String containerIp = getContainerIp();
				OpenViduServer.publicUrl = "wss://" + containerIp + ":" + openviduConf.getServerPort();
				openviduConf.setFinalUrl("https://" + containerIp + ":" + openviduConf.getServerPort());
			} catch (Exception e) {
				log.error("Docker container IP was configured, but there was an error obtaining IP: "
						+ e.getClass().getName() + " " + e.getMessage());
				log.error("Fallback to local URL");
			}
			break;

		case "local":
			break;

		default:

			URL url = new URL(publicUrl);

			type = "custom";

			if (publicUrl.startsWith("https://")) {
				OpenViduServer.publicUrl = publicUrl.replace("https://", "wss://");
			} else if (publicUrl.startsWith("http://")) {
				OpenViduServer.publicUrl = publicUrl.replace("http://", "wss://");
			}

			openviduConf.setFinalUrl(url.toString());

			if (!OpenViduServer.publicUrl.startsWith("wss://")) {
				OpenViduServer.publicUrl = "wss://" + OpenViduServer.publicUrl;
			}
		}

		if (OpenViduServer.publicUrl == null) {
			type = "local";
			OpenViduServer.publicUrl = "wss://localhost:" + openviduConf.getServerPort();
			openviduConf.setFinalUrl("https://localhost:" + openviduConf.getServerPort());
		}

		if (OpenViduServer.publicUrl.endsWith("/")) {
			OpenViduServer.publicUrl = OpenViduServer.publicUrl.substring(0, OpenViduServer.publicUrl.length() - 1);
		}

		boolean recordingModuleEnabled = openviduConf.isRecordingModuleEnabled();
		if (recordingModuleEnabled) {
			ComposedRecordingService recordingService = composedRecordingService();
			recordingService.setRecordingVersion(openviduConf.getOpenViduRecordingVersion());
			log.info("Recording module required: Downloading openvidu/openvidu-recording:"
					+ openviduConf.getOpenViduRecordingVersion() + " Docker image (800 MB aprox)");

			boolean imageExists = false;
			try {
				imageExists = recordingService.recordingImageExistsLocally();
			} catch (ProcessingException exception) {
				String message = "Exception connecting to Docker daemon: ";
				if ("docker".equals(openviduConf.getSpringProfile())) {
					final String NEW_LINE = System.getProperty("line.separator");
					message +=	"make sure you include the following flags in your \"docker run\" command:" +
								NEW_LINE + "    -e openvidu.recording.path=/YOUR/PATH/TO/VIDEO/FILES" +
								NEW_LINE + "    -e MY_UID=$(id -u $USER)" +
								NEW_LINE + "    -v /var/run/docker.sock:/var/run/docker.sock" +
								NEW_LINE + "    -v /YOUR/PATH/TO/VIDEO/FILES:/YOUR/PATH/TO/VIDEO/FILES" +
								NEW_LINE;
				} else {
					message += "you need Docker installed in this machine to enable OpenVidu recording service";
				}
				log.error(message);
				throw new RuntimeException(message);
			}

			if (imageExists) {
				log.info("Docker image already exists locally");
			} else {
				Thread t = new Thread(() -> {
					boolean keep = true;
					log.info("Downloading ");
					while (keep) {
						System.out.print(".");
						try {
							Thread.sleep(1000);
						} catch (InterruptedException e) {
							keep = false;
							log.info("\nDownload complete");
						}
					}
				});
				t.start();
				recordingService.downloadRecordingImage();
				t.interrupt();
				t.join();
				log.info("Docker image available");
			}

			recordingService.initRecordingPath();
		}
		log.info("OpenVidu Server using " + type + " URL: [" + OpenViduServer.publicUrl + "]");
	}

	@EventListener(ApplicationReadyEvent.class)
	public void printNgrokUrl() {
		if (!this.ngrokAppUrl.isEmpty()) {
			final String NEW_LINE = System.lineSeparator();
			String str = 	NEW_LINE +
							NEW_LINE + "      APP PUBLIC IP      " + 
							NEW_LINE + "-------------------------" + 
							NEW_LINE + ngrokAppUrl + 
							NEW_LINE + "-------------------------" + 
							NEW_LINE;
			log.info(str);
		}
	}

}
