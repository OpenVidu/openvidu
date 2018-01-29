/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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
 */
package io.openvidu.server;

import java.io.IOException;
import java.net.URL;
import java.util.List;

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
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.AutodiscoveryKurentoClientProvider;
import io.openvidu.server.kurento.KurentoClientProvider;
import io.openvidu.server.kurento.core.KurentoSessionEventsHandler;
import io.openvidu.server.kurento.core.KurentoSessionManager;
import io.openvidu.server.kurento.kms.FixedOneKmsManager;
import io.openvidu.server.recording.RecordingService;
import io.openvidu.server.rest.NgrokRestController;
import io.openvidu.server.rpc.RpcHandler;
import io.openvidu.server.rpc.RpcNotificationService;

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
			log.info("Configuring Kurento Room Server to use first of the following kmss: " + kmsWsUris);
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
	public KurentoSessionEventsHandler kurentoSessionEventsHandler() {
		return new KurentoSessionEventsHandler();
	}

	@Bean
	@ConditionalOnMissingBean
	public CallDetailRecord cdr() {
		return new CallDetailRecord();
	}

	@Override
	public void registerJsonRpcHandlers(JsonRpcHandlerRegistry registry) {
		registry.addHandler(rpcHandler().withPingWatchdog(true), "/room");
	}

	public static void main(String[] args) throws Exception {
		ConfigurableApplicationContext context = start(args);
		OpenviduConfig openviduConf = context.getBean(OpenviduConfig.class);

		String publicUrl = openviduConf.getOpenViduPublicUrl();
		String type = publicUrl;

		switch (publicUrl) {
		case "ngrok":
			try {
				NgrokRestController ngrok = new NgrokRestController();
				final String NEW_LINE = System.getProperty("line.separator");
				String str = 	NEW_LINE + "        PUBLIC IP        " + 
								NEW_LINE + "-------------------------" + 
								NEW_LINE + ngrok.getNgrokAppUrl() + 
								NEW_LINE + "-------------------------" + 
								NEW_LINE;
				System.out.println(str);
				OpenViduServer.publicUrl = ngrok.getNgrokServerUrl().replaceFirst("https://", "wss://");

			} catch (Exception e) {
				System.err.println("Ngrok URL was configured, but there was an error connecting to ngrok: "
						+ e.getClass().getName() + " " + e.getMessage());
				System.err.println("Fallback to local URL");
			}
			break;

		case "docker":
			try {
				OpenViduServer.publicUrl = "wss://" + getContainerIp() + ":" + openviduConf.getServerPort();
			} catch (Exception e) {
				System.err.println("Docker container IP was configured, but there was an error obtaining IP: "
						+ e.getClass().getName() + " " + e.getMessage());
				System.err.println("Fallback to local URL");
			}
			break;

		case "local":
			break;

		default:

			URL url = new URL(publicUrl);
			int port = url.getPort();

			type = "custom";
			OpenViduServer.publicUrl = publicUrl.replaceFirst("https://", "wss://");
			if (!OpenViduServer.publicUrl.startsWith("wss://")) {
				OpenViduServer.publicUrl = "wss://" + OpenViduServer.publicUrl;
			}
			if (OpenViduServer.publicUrl.endsWith("/")) {
				OpenViduServer.publicUrl = OpenViduServer.publicUrl.substring(0, OpenViduServer.publicUrl.length() - 1);
			}
			if (port == -1) {
				OpenViduServer.publicUrl += ":" + openviduConf.getServerPort();
			}

			break;
		}

		if (OpenViduServer.publicUrl == null) {
			type = "local";
			OpenViduServer.publicUrl = "wss://localhost:" + openviduConf.getServerPort();
		}

		boolean recordingModuleEnabled = openviduConf.isRecordingModuleEnabled();
		if (recordingModuleEnabled) {
			RecordingService recordingService = context.getBean(RecordingService.class);
			System.out.println("Recording module required: Downloading openvidu/openvidu-recording Docker image (800 MB aprox)");
			
			boolean imageExists = false;
            try {
                imageExists = recordingService.recordingImageExistsLocally();
            } catch (ProcessingException exception) {
                log.error("Exception connecting to Docker daemon: you need Docker installed in this machine to enable OpenVidu recorder service");
                throw new RuntimeException("Exception connecting to Docker daemon: you need Docker installed in this machine to enable OpenVidu recorder service");
            }
            
            if (imageExists) {
				System.out.println("Docker image already exists locally");
			} else {
				Thread t = new Thread(() -> {
					boolean keep = true;
					System.out.print("Downloading ");
					while (keep) {
						System.out.print(".");
						try {
							Thread.sleep(1000);
						} catch (InterruptedException e) {
							keep = false;
							System.out.println("\nDownload complete");
						}
					}
				});
				t.start();
				recordingService.downloadRecordingImage();
				t.interrupt();
				t.join();
				System.out.println("Docker image available");
			}
		}

		System.out.println("OpenVidu Server using " + type + " URL: " + OpenViduServer.publicUrl);
	}

	private static String getContainerIp() throws IOException, InterruptedException {
		return CommandExecutor.execCommand("/bin/sh", "-c", "hostname -i | awk '{print $1}'");
	}

	public static ConfigurableApplicationContext start(String[] args) {
		log.info("Using /dev/urandom for secure random generation");
		System.setProperty("java.security.egd", "file:/dev/./urandom");
		return SpringApplication.run(OpenViduServer.class, args);
	}

}
