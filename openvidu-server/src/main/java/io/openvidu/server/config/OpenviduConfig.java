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

package io.openvidu.server.config;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

import javax.annotation.PostConstruct;

import org.apache.http.Header;
import org.apache.http.message.BasicHeader;
import org.kurento.jsonrpc.JsonUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;
import org.springframework.stereotype.Component;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.cdr.CDREventName;

@Component
public class OpenviduConfig {

	private static final Logger log = LoggerFactory.getLogger(OpenviduConfig.class);

	@Value("#{'${spring.config.additional-location:}'.length() > 0 ? '${spring.config.additional-location:}' : \"\"}")
	private String springConfigLocation;

	@Autowired
	BuildProperties buildProperties;

	@Value("${kms.uris}")
	private String kmsUris;

	@Value("${openvidu.publicurl}")
	private String openviduPublicUrl; // local, docker, [FINAL_URL]

	@Value("${server.port}")
	private String serverPort;

	@Value("${openvidu.secret}")
	private String openviduSecret;

	@Value("${openvidu.cdr}")
	private boolean openviduCdr;

	@Value("${openvidu.cdr.path}")
	private String openviduCdrPath;

	@Value("${openvidu.recording}")
	private boolean openviduRecording;

	@Value("${openvidu.recording.path}")
	private String openviduRecordingPath;

	@Value("${openvidu.recording.public-access}")
	private boolean openviduRecordingPublicAccess;

	@Value("${openvidu.recording.notification}")
	private String openviduRecordingNotification;

	@Value("${openvidu.recording.custom-layout}")
	private String openviduRecordingCustomLayout;

	@Value("${openvidu.recording.version}")
	private String openviduRecordingVersion;

	@Value("${openvidu.recording.autostop-timeout}")
	private int openviduRecordingAutostopTimeout;

	@Value("${openvidu.recording.composed-url}")
	private String openviduRecordingComposedUrl;

	@Value("${openvidu.webhook}")
	private boolean openviduWebhook;

	@Value("${openvidu.webhook.endpoint}")
	private String openviduWebhookEndpoint;

	@Value("${openvidu.webhook.headers}")
	private String openviduWebhookHeaders;

	@Value("${openvidu.webhook.events}")
	private String openviduWebhookEvents;

	@Value("${openvidu.streams.video.max-recv-bandwidth}")
	private int openviduStreamsVideoMaxRecvBandwidth;

	@Value("${openvidu.streams.video.min-recv-bandwidth}")
	private int openviduStreamsVideoMinRecvBandwidth;

	@Value("${openvidu.streams.video.max-send-bandwidth}")
	private int openviduStreamsVideoMaxSendBandwidth;

	@Value("${openvidu.streams.video.min-send-bandwidth}")
	private int openviduStreamsVideoMinSendBandwidth;

	@Value("${coturn.redis.ip}")
	private String coturnRedisIp;

	@Value("${coturn.redis.dbname}")
	private String coturnRedisDbname;

	@Value("${coturn.redis.password}")
	private String coturnRedisPassword;

	@Value("${coturn.redis.connect-timeout}")
	private String coturnRedisConnectTimeout;

	@Value("#{'${spring.profiles.active:}'.length() > 0 ? '${spring.profiles.active:}'.split(',') : \"default\"}")
	private String springProfile;

	private String finalUrl;
	private List<String> kmsUrisList;
	private List<Header> webhookHeadersList;
	private List<CDREventName> webhookEventsList;
	private Properties externalizedProperties;

	@PostConstruct
	public void init() {

		if (!this.springConfigLocation.isEmpty()) {
			// Properties file has been manually configured in certain path
			FileSystemResource resource = new FileSystemResource(this.springConfigLocation);
			try {
				this.externalizedProperties = PropertiesLoaderUtils.loadProperties(resource);
				log.info("Properties file found at \"{}\". Content: {}", this.springConfigLocation,
						externalizedProperties);
			} catch (IOException e) {
				log.error("Error in 'spring.config.additional-location' system property: {}", e.getMessage());
				log.error("Shutting down OpenVidu Server");
				System.exit(1);
			}
			// Check OpenVidu Server write permissions in properties path
			if (!Files.isWritable(Paths.get(this.springConfigLocation))) {
				log.warn(
						"The properties path '{}' set with property 'spring.config.additional-location' is not valid. Reason: OpenVidu Server needs write permissions. Try running command \"sudo chmod 777 {}\". If not, OpenVidu won't be able to overwrite preexisting properties on reboot",
						this.springConfigLocation, this.springConfigLocation);
			} else {
				log.info("OpenVidu Server has write permissions on properties path: {}", this.springConfigLocation);
			}
		}

		try {
			this.initiateKmsUris();
		} catch (Exception e) {
			log.error("Error in 'kms.uris' system property: " + e.getMessage());
			log.error("Shutting down OpenVidu Server");
			System.exit(1);
		}
		if (this.isWebhookEnabled()) {
			log.info("OpenVidu Webhook service enabled");
			try {
				if (this.openviduWebhookEndpoint == null || this.openviduWebhookEndpoint.isEmpty()) {
					log.error(
							"If OpenVidu Webhook service is enabled property 'openvidu.webhook.endpoint' must be defined");
					log.error("Shutting down OpenVidu Server");
					System.exit(1);
				}
				this.initiateOpenViduWebhookEndpoint(this.openviduWebhookEndpoint);
			} catch (Exception e) {
				log.error("Error in 'openvidu.webhook.endpoint' system property. " + e.getMessage());
				log.error("Shutting down OpenVidu Server");
				System.exit(1);
			}
			try {
				this.initiateOpenViduWebhookHeaders(this.openviduWebhookHeaders);
			} catch (Exception e) {
				log.error("Error in 'openvidu.webhook.headers' system property: " + e.getMessage());
				log.error("Shutting down OpenVidu Server");
				System.exit(1);
			}
			try {
				this.initiateOpenViduWebhookEvents(this.openviduWebhookEvents);
			} catch (Exception e) {
				log.error("Error in 'openvidu.webhook.events' system property: " + e.getMessage());
				log.error("Shutting down OpenVidu Server");
				System.exit(1);
			}
		}
	}

	public List<String> getKmsUris() {
		return this.kmsUrisList;
	}

	public String getOpenViduPublicUrl() {
		return this.openviduPublicUrl;
	}

	public String getServerPort() {
		return this.serverPort;
	}

	public String getOpenViduSecret() {
		return this.openviduSecret;
	}

	public boolean isOpenViduSecret(String secret) {
		return secret.equals(this.getOpenViduSecret());
	}

	public boolean isCdrEnabled() {
		return this.openviduCdr;
	}

	public String getOpenviduCdrPath() {
		return this.openviduCdrPath;
	}

	public boolean isRecordingModuleEnabled() {
		return this.openviduRecording;
	}

	public String getOpenViduRecordingPath() {
		return this.openviduRecordingPath;
	}

	public void setOpenViduRecordingPath(String recordingPath) {
		this.openviduRecordingPath = recordingPath;
	}

	public boolean getOpenViduRecordingPublicAccess() {
		return this.openviduRecordingPublicAccess;
	}

	public String getOpenviduRecordingCustomLayout() {
		return this.openviduRecordingCustomLayout;
	}

	public void setOpenViduRecordingCustomLayout(String recordingCustomLayout) {
		this.openviduRecordingCustomLayout = recordingCustomLayout;
	}

	public boolean openviduRecordingCustomLayoutChanged() {
		return !"/opt/openvidu/custom-layout".equals(this.openviduRecordingCustomLayout);
	}

	public boolean openviduRecordingCustomLayoutChanged(String path) {
		return !"/opt/openvidu/custom-layout".equals(path);
	}

	public String getFinalUrl() {
		return finalUrl;
	}

	public void setFinalUrl(String finalUrl) {
		this.finalUrl = finalUrl.endsWith("/") ? (finalUrl) : (finalUrl + "/");
	}

	public String getOpenViduRecordingVersion() {
		return this.openviduRecordingVersion;
	}

	public int getOpenviduRecordingAutostopTimeout() {
		return this.openviduRecordingAutostopTimeout;
	}

	public String getSpringProfile() {
		return springProfile;
	}

	public int getVideoMaxRecvBandwidth() {
		return this.openviduStreamsVideoMaxRecvBandwidth;
	}

	public int getVideoMinRecvBandwidth() {
		return this.openviduStreamsVideoMinRecvBandwidth;
	}

	public int getVideoMaxSendBandwidth() {
		return this.openviduStreamsVideoMaxSendBandwidth;
	}

	public int getVideoMinSendBandwidth() {
		return this.openviduStreamsVideoMinSendBandwidth;
	}

	public String getCoturnDatabaseString() {
		return "\"ip=" + this.coturnRedisIp + " dbname=" + this.coturnRedisDbname + " password="
				+ this.coturnRedisPassword + " connect_timeout=" + this.coturnRedisConnectTimeout + "\"";
	}

	public String getCoturnDatabaseDbname() {
		return this.coturnRedisDbname;
	}

	public String getOpenViduRecordingNotification() {
		return this.openviduRecordingNotification;
	}

	public String getOpenViduRecordingComposedUrl() {
		return this.openviduRecordingComposedUrl;
	}

	public boolean isWebhookEnabled() {
		return this.openviduWebhook;
	}

	public String getOpenViduWebhookEndpoint() {
		return this.openviduWebhookEndpoint;
	}

	public List<Header> getOpenViduWebhookHeaders() {
		return this.webhookHeadersList;
	}

	public List<CDREventName> getOpenViduWebhookEvents() {
		return this.webhookEventsList;
	}

	public OpenViduRole[] getRolesFromRecordingNotification() {
		OpenViduRole[] roles;
		switch (this.openviduRecordingNotification) {
		case "none":
			roles = new OpenViduRole[0];
			break;
		case "moderator":
			roles = new OpenViduRole[] { OpenViduRole.MODERATOR };
			break;
		case "publisher_moderator":
			roles = new OpenViduRole[] { OpenViduRole.PUBLISHER, OpenViduRole.MODERATOR };
			break;
		case "all":
			roles = new OpenViduRole[] { OpenViduRole.SUBSCRIBER, OpenViduRole.PUBLISHER, OpenViduRole.MODERATOR };
			break;
		default:
			roles = new OpenViduRole[] { OpenViduRole.PUBLISHER, OpenViduRole.MODERATOR };
		}
		return roles;
	}

	public String getOpenViduServerVersion() {
		String v = this.buildProperties.get("version.openvidu.server");
		if (v == null) {
			v = this.getVersion();
		}
		return v;
	}

	public String getVersion() {
		return this.buildProperties.getVersion();
	}

	public String getSpringConfigLocation() {
		return this.springConfigLocation;
	}

	public boolean hasExternalizedProperties() {
		return !this.springConfigLocation.isEmpty();
	}

	public Properties getExternalizedProperties() {
		return this.externalizedProperties;
	}

	private void initiateKmsUris() throws Exception {
		if (kmsUrisList == null) {
			this.kmsUris = this.kmsUris.replaceAll("\\s", "");
			JsonParser parser = new JsonParser();
			JsonElement elem = parser.parse(this.kmsUris);
			JsonArray kmsUris = elem.getAsJsonArray();
			this.kmsUrisList = JsonUtils.toStringList(kmsUris);
		}
	}

	public void initiateOpenViduWebhookEndpoint(String endpoint) throws Exception {
		try {
			new URL(endpoint);
			log.info("OpenVidu Webhook endpoint is {}", endpoint);
		} catch (MalformedURLException e) {
			throw new Exception("Webhook endpoint '" + endpoint + "' is not correct. Malformed URL: " + e.getMessage());
		}
	}

	public void initiateOpenViduWebhookHeaders(String headers) throws Exception {
		JsonParser parser = new JsonParser();
		JsonElement elem = parser.parse(headers);
		JsonArray headersJsonArray = elem.getAsJsonArray();
		this.webhookHeadersList = new ArrayList<>();

		for (JsonElement jsonElement : headersJsonArray) {
			String headerString = jsonElement.getAsString();
			String[] headerSplit = headerString.split(": ", 2);
			if (headerSplit.length != 2) {
				throw new Exception("HTTP header '" + headerString
						+ "' syntax is not correct. Must be 'HEADER_NAME: HEADER_VALUE'. For example: 'Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l'");
			}
			String headerName = headerSplit[0];
			String headerValue = headerSplit[1];
			if (headerName.isEmpty()) {
				throw new Exception(
						"HTTP header '" + headerString + "' syntax is not correct. Header name cannot be empty");
			}
			if (headerValue.isEmpty()) {
				throw new Exception(
						"HTTP header '" + headerString + "' syntax is not correct. Header value cannot be empty");
			}
			this.webhookHeadersList.add(new BasicHeader(headerName, headerValue));
		}
		log.info("OpenVidu Webhook headers: {}", this.getOpenViduWebhookHeaders().toString());
	}

	public void initiateOpenViduWebhookEvents(String events) throws Exception {
		JsonParser parser = new JsonParser();
		JsonElement elem = parser.parse(events);
		JsonArray eventsJsonArray = elem.getAsJsonArray();
		this.webhookEventsList = new ArrayList<>();

		for (JsonElement jsonElement : eventsJsonArray) {
			String eventString = jsonElement.getAsString();
			try {
				CDREventName.valueOf(eventString);
			} catch (IllegalArgumentException e) {
				throw new Exception("Event name '" + eventString + "' does not exist");
			}
			this.webhookEventsList.add(CDREventName.valueOf(eventString));
		}
		log.info("OpenVidu Webhook events: {}", this.getOpenViduWebhookEvents().toString());
	}

}
