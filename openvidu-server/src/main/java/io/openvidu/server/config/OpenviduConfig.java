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

package io.openvidu.server.config;

import java.io.File;
import java.net.Inet6Address;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.annotation.PostConstruct;

import org.apache.http.Header;
import org.apache.http.message.BasicHeader;
import org.kurento.jsonrpc.JsonUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonSyntaxException;

import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.cdr.CDREventName;
import io.openvidu.server.recording.RecordingNotification;

@Component
public class OpenviduConfig {

	public static class Error {

		private String property;
		private String value;
		private String message;

		public Error(String property, String value, String message) {
			super();
			this.property = property;
			this.value = value;
			this.message = message;
		}

		public String getProperty() {
			return property;
		}

		public String getValue() {
			return value;
		}

		public String getMessage() {
			return message;
		}
	}

	private static final Logger log = LoggerFactory.getLogger(OpenviduConfig.class);

	private static final boolean SHOW_PROPERTIES_AS_ENV_VARS = true;

	public static final List<String> OPENVIDU_VALID_PUBLICURL_VALUES = Arrays.asList("local", "docker");

	private List<Error> configErrors = new ArrayList<>();

	private Map<String, String> configProps = new HashMap<>();

	private List<String> userConfigProps;

	@Autowired
	protected Environment env;

	@Value("#{'${spring.profiles.active:}'.length() > 0 ? '${spring.profiles.active:}'.split(',') : \"default\"}")
	protected String springProfile;

	// Config properties

	private boolean openviduCdr;

	private String openviduCdrPath;

	private boolean openviduRecording;

	private boolean openviduRecordingPublicAccess;

	private Integer openviduRecordingAutostopTimeout;

	private String openviduRecordingPath;

	private RecordingNotification openviduRecordingNotification;

	private String openviduRecordingCustomLayout;

	private String openviduRecordingVersion;

	private Integer openviduStreamsVideoMaxRecvBandwidth;

	private Integer openviduStreamsVideoMinRecvBandwidth;

	private Integer openviduStreamsVideoMaxSendBandwidth;

	private Integer openviduStreamsVideoMinSendBandwidth;

	private String coturnIp;

	private String coturnRedisIp;

	private boolean openviduWebhookEnabled;

	private String openviduWebhookEndpoint;

	private List<Header> webhookHeadersList;

	private List<CDREventName> webhookEventsList;

	private List<String> kmsUrisList;

	private String openviduSecret;

	private String openviduPublicUrl;

	private String openviduRecordingComposedUrl;

	private String serverPort;

	private String coturnRedisDbname;

	private String coturnRedisPassword;

	private String coturnRedisConnectTimeout;

	private String certificateType;

	protected int openviduSessionsGarbageInterval;

	protected int openviduSessionsGarbageThreshold;

	
	// Derived properties

	public static String finalUrl;

	// Plain config properties getters

	public String getServerPort() {
		return this.serverPort;
	}

	public String getCoturnDatabaseDbname() {
		return this.coturnRedisDbname;
	}

	public List<String> getKmsUris() {
		return kmsUrisList;
	}

	public String getOpenViduPublicUrl() {
		return this.openviduPublicUrl;
	}

	public String getOpenViduSecret() {
		return this.openviduSecret;
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

	public String getOpenViduRecordingVersion() {
		return this.openviduRecordingVersion;
	}

	public int getOpenviduRecordingAutostopTimeout() {
		return this.openviduRecordingAutostopTimeout;
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

	public String getCoturnIp() {
		return this.coturnIp;
	}

	public RecordingNotification getOpenViduRecordingNotification() {
		return this.openviduRecordingNotification;
	}

	public String getOpenViduRecordingComposedUrl() {
		return this.openviduRecordingComposedUrl;
	}

	public boolean isWebhookEnabled() {
		return this.openviduWebhookEnabled;
	}

	public String getOpenViduWebhookEndpoint() {
		return this.openviduWebhookEndpoint;
	}

	public List<Header> getOpenViduWebhookHeaders() {
		return webhookHeadersList;
	}

	public List<CDREventName> getOpenViduWebhookEvents() {
		return webhookEventsList;
	}

	public int getSessionGarbageInterval() {
		return openviduSessionsGarbageInterval;
	}
	
	public int getSessionGarbageThreshold() {
		return openviduSessionsGarbageThreshold;
	}
	
	// Derived properties methods

	public String getSpringProfile() {
		return springProfile;
	}

	public String getFinalUrl() {
		return finalUrl;
	}

	public void setFinalUrl(String finalUrlParam) {
		finalUrl = finalUrlParam.endsWith("/") ? (finalUrlParam) : (finalUrlParam + "/");
	}

	public OpenViduRole[] getRolesFromRecordingNotification() {
		OpenViduRole[] roles;
		switch (this.openviduRecordingNotification) {
		case none:
			roles = new OpenViduRole[0];
			break;
		case moderator:
			roles = new OpenViduRole[] { OpenViduRole.MODERATOR };
			break;
		case publisher_moderator:
			roles = new OpenViduRole[] { OpenViduRole.PUBLISHER, OpenViduRole.MODERATOR };
			break;
		case all:
			roles = new OpenViduRole[] { OpenViduRole.SUBSCRIBER, OpenViduRole.PUBLISHER, OpenViduRole.MODERATOR };
			break;
		default:
			roles = new OpenViduRole[] { OpenViduRole.PUBLISHER, OpenViduRole.MODERATOR };
		}
		return roles;
	}

	public boolean isOpenViduSecret(String secret) {
		return secret.equals(this.getOpenViduSecret());
	}

	public String getCoturnDatabaseString() {
		return "\"ip=" + this.coturnRedisIp + " dbname=" + this.coturnRedisDbname + " password="
				+ this.coturnRedisPassword + " connect_timeout=" + this.coturnRedisConnectTimeout + "\"";
	}

	public boolean openviduRecordingCustomLayoutChanged(String path) {
		return !"/opt/openvidu/custom-layout".equals(path);
	}

	// Properties management methods

	public List<Error> getConfigErrors() {
		return configErrors;
	}

	public Map<String, String> getConfigProps() {
		return configProps;
	}

	public List<String> getUserProperties() {
		return userConfigProps;
	}

	public String getConfigValue(String property) {

		String value = env.getProperty(property);

		this.configProps.put(property, value);

		return value;
	}

	public String getPropertyName(String propertyName) {
		if (SHOW_PROPERTIES_AS_ENV_VARS) {
			return propertyName.replace('.', '_').toUpperCase();
		} else {
			return propertyName;
		}
	}

	private void addError(String property, String msg) {

		String value = null;

		if (property != null) {
			value = getConfigValue(property);
		}

		this.configErrors.add(new Error(property, value, msg));
	}

	@PostConstruct
	protected void checkConfigurationProperties() {

		try {
			this.checkConfigurationParameters();
		} catch (Exception e) {
			log.error("Exception checking configuration", e);
			addError(null, "Exception checking configuration." + e.getClass().getName() + ":" + e.getMessage());
		}

		userConfigProps = new ArrayList<>(configProps.keySet());
		
		userConfigProps.removeAll(getNonUserProperties());
	}

	protected List<String> getNonUserProperties() {
		return Arrays.asList("coturn.ip", "coturn.redis.ip", "kms.uris", "server.port",
				"coturn.redis.dbname", "coturn.redis.password", "coturn.redis.connect-timeout");
	}

	// Properties

	protected void checkConfigurationParameters() {

		serverPort = getConfigValue("server.port");

		coturnRedisDbname = getConfigValue("coturn.redis.dbname");

		coturnRedisPassword = getConfigValue("coturn.redis.password");

		coturnRedisConnectTimeout = getConfigValue("coturn.redis.connect-timeout");

		openviduSecret = asNonEmptyString("openvidu.secret");

		checkOpenviduPublicurl();

		openviduCdr = asBoolean("openvidu.cdr");

		openviduCdrPath = asFileSystemPath("openvidu.cdr.path");

		openviduRecording = asBoolean("openvidu.recording");
		openviduRecordingPublicAccess = asBoolean("openvidu.recording.public-access");
		openviduRecordingAutostopTimeout = asNonNegativeInteger("openvidu.recording.autostop-timeout");
		openviduRecordingPath = asFileSystemPath("openvidu.recording.path");
		openviduRecordingCustomLayout = asFileSystemPath("openvidu.recording.custom-layout");
		openviduRecordingVersion = asNonEmptyString("openvidu.recording.version");
		openviduRecordingComposedUrl = asOptionalURL("openvidu.recording.composed-url");
		checkOpenviduRecordingNotification();

		openviduStreamsVideoMaxRecvBandwidth = asNonNegativeInteger("openvidu.streams.video.max-recv-bandwidth");
		openviduStreamsVideoMinRecvBandwidth = asNonNegativeInteger("openvidu.streams.video.min-recv-bandwidth");
		openviduStreamsVideoMaxSendBandwidth = asNonNegativeInteger("openvidu.streams.video.max-send-bandwidth");
		openviduStreamsVideoMinSendBandwidth = asNonNegativeInteger("openvidu.streams.video.min-send-bandwidth");

		kmsUrisList = checkKmsUris();

		checkCoturnIp();

		coturnRedisIp = asOptionalInetAddress("coturn.redis.ip");

		checkWebhook();
		
		checkCertificateType();
		
		openviduSessionsGarbageInterval = asNonNegativeInteger("openvidu.sessions.garbage.interval");
		openviduSessionsGarbageThreshold = asNonNegativeInteger("openvidu.sessions.garbage.threshold");

	}

	private void checkCertificateType() {
		
		String property = "certificate.type";
		
		certificateType = asNonEmptyString(property);
		
		if(certificateType != null && !certificateType.isEmpty()) {
			List<String> validValues = Arrays.asList("selfsigned", "owncert", "letsencrypt");
			if(!validValues.contains(certificateType)) {
				addError(property,"Invalid value '"+certificateType+"'. Valid values are "+validValues);
			}
		}		
	}

	private void checkCoturnIp() {

		coturnIp = getConfigValue("coturn.ip");

		if (coturnIp == null || this.coturnIp.isEmpty()) {

			try {
				this.coturnIp = new URL(this.getFinalUrl()).getHost();
			} catch (MalformedURLException e) {
				log.error("Can't get Domain name from OpenVidu public Url: " + e.getMessage());
			}
		}
	}

	
	private void checkWebhook() {

		openviduWebhookEnabled = asBoolean("openvidu.webhook");
		openviduWebhookEndpoint = asOptionalURL("openvidu.webhook.endpoint");
		webhookHeadersList = checkWebhookHeaders();
		webhookEventsList = getWebhookEvents();

		if (openviduWebhookEnabled && (openviduWebhookEndpoint == null || openviduWebhookEndpoint.isEmpty())) {
			addError("openvidu.webhook.endpoint",
					"With " + getPropertyName("openvidu.webhook") + "=true, this property cannot be empty");
		}
	}

	private void checkOpenviduRecordingNotification() {

		String recordingNotif = asNonEmptyString("openvidu.recording.notification");
		try {
			openviduRecordingNotification = RecordingNotification.valueOf(recordingNotif);
		} catch (IllegalArgumentException e) {
			addError("openvidu.recording.notification",
					"Must be one of the values " + Arrays.asList(RecordingNotification.values()));
		}
	}

	private void checkOpenviduPublicurl() {

		final String property = "openvidu.domain.or.public.ip";

		String domain = getConfigValue(property);

		if (domain != null && !domain.isEmpty()) {

			this.openviduPublicUrl = "https://" + domain;

		} else {

			final String urlProperty = "openvidu.publicurl";

			String publicurl = getConfigValue(urlProperty);

			if (publicurl == null || publicurl.isEmpty()) {

				addError(property, "Cannot be empty");

			} else {

				if (!OPENVIDU_VALID_PUBLICURL_VALUES.contains(publicurl)) {
					try {
						checkUrl(publicurl);
					} catch (Exception e) {
						addError(property, "Is not a valid URL. " + e.getMessage());
					}
				}

				this.openviduPublicUrl = publicurl;
			}
		}

		if(openviduPublicUrl != null && !openviduPublicUrl.isEmpty()) {
			calculatePublicUrl();
		}
	}
	
	private void calculatePublicUrl() {

		String publicUrl = this.getOpenViduPublicUrl();

		String type = "";
		switch (publicUrl) {
		case "docker":
			try {
				String containerIp = OpenViduServer.getContainerIp();
				OpenViduServer.wsUrl = "wss://" + containerIp + ":" + this.getServerPort();
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
			if (publicUrl.startsWith("https://")) {
				OpenViduServer.wsUrl = publicUrl.replace("https://", "wss://");
			} else if (publicUrl.startsWith("http://")) {
				OpenViduServer.wsUrl = publicUrl.replace("http://", "wss://");
			}
		}

		if (OpenViduServer.wsUrl == null) {
			type = "local";
			OpenViduServer.wsUrl = "wss://localhost:" + this.getServerPort();
		}

		if (OpenViduServer.wsUrl.endsWith("/")) {
			OpenViduServer.wsUrl = OpenViduServer.wsUrl.substring(0, OpenViduServer.wsUrl.length() - 1);
		}

		String finalUrl = OpenViduServer.wsUrl.replaceFirst("wss://", "https://").replaceFirst("ws://", "http://");
		this.setFinalUrl(finalUrl);
		OpenViduServer.httpUrl = this.getFinalUrl();
		OpenViduServer.publicurlType = type;
	}


	public List<String> checkKmsUris() {

		String property = "kms.uris";

		String kmsUris = getConfigValue(property);

		if (kmsUris == null || kmsUris.isEmpty()) {
			return Arrays.asList();
		}

		kmsUris = kmsUris.replaceAll("\\s", ""); // Remove all white spaces
		kmsUris = kmsUris.replaceAll("\\\\", ""); // Remove previous escapes
		kmsUris = kmsUris.replaceAll("\"", ""); // Remove previous double quotes
		kmsUris = kmsUris.replaceFirst("^\\[", "[\\\""); // Escape first char
		kmsUris = kmsUris.replaceFirst("\\]$", "\\\"]"); // Escape last char
		kmsUris = kmsUris.replaceAll(",", "\\\",\\\""); // Escape middle uris

		List<String> kmsUrisArray = asJsonStringsArray(property);

		for (String uri : kmsUrisArray) {
			try {
				this.checkWebsocketUri(uri);
			} catch (Exception e) {
				addError(property, uri + " is not a valid WebSocket URL");
			}
		}

		return kmsUrisArray;
	}

	private List<Header> checkWebhookHeaders() {

		String property = "openvidu.webhook.headers";

		List<String> headers = asJsonStringsArray(property);

		List<Header> headerList = new ArrayList<>();

		for (String header : headers) {

			String[] headerSplit = header.split(": ", 2);
			if (headerSplit.length != 2) {
				addError(property, "HTTP header '" + header
						+ "' syntax is not correct. Must be 'HEADER_NAME: HEADER_VALUE'. For example: 'Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l'");
				continue;
			}
			String headerName = headerSplit[0];
			String headerValue = headerSplit[1];
			if (headerName.isEmpty()) {
				addError(property, "HTTP header '" + header + "' syntax is not correct. Header name cannot be empty");
			}
			if (headerValue.isEmpty()) {
				addError(property, "HTTP header '" + header + "' syntax is not correct. Header value cannot be empty");
			}
			headerList.add(new BasicHeader(headerName, headerValue));
		}
		return headerList;
	}

	private List<CDREventName> getWebhookEvents() {

		String property = "openvidu.webhook.events";

		List<String> events = asJsonStringsArray(property);

		List<CDREventName> eventList = new ArrayList<>();

		for (String event : events) {
			try {
				eventList.add(CDREventName.valueOf(event));
			} catch (IllegalArgumentException e) {
				addError(property, "Event '" + event + "' does not exist");
			}
		}
		return eventList;
	}

	// -------------------------------------------------------
	// Format Checkers
	// -------------------------------------------------------

	protected String asOptionalURL(String property) {

		String optionalUrl = getConfigValue(property);
		try {
			if (!optionalUrl.isEmpty()) {
				checkUrl(optionalUrl);
			}
			return optionalUrl;
		} catch (Exception e) {
			addError(property, "Is not a valid URL. " + e.getMessage());
			return null;
		}
	}

	protected String asNonEmptyString(String property) {

		String stringValue = getConfigValue(property);

		if (stringValue != null && !stringValue.isEmpty()) {
			return stringValue;
		} else {
			addError(property, "Cannot be empty.");
			return null;
		}
	}
	
	protected String asOptionalString(String property) {
		return getConfigValue(property);
	}

	protected boolean asBoolean(String property) {

		String value = getConfigValue(property);

		if (value == null) {
			addError(property, "Cannot be empty");
			return false;
		}

		if (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false")) {
			return Boolean.parseBoolean(value);
		} else {
			addError(property, "Is not a boolean (true or false)");
			return false;
		}
	}

	protected Integer asNonNegativeInteger(String property) {
		try {
			Integer integerValue = Integer.parseInt(getConfigValue(property));

			if (integerValue < 0) {
				addError(property, "Is not a non negative integer");
			}
			return integerValue;
		} catch (NumberFormatException e) {
			addError(property, "Is not a non negative integer");
			return 0;
		}
	}

	/*
	 * This method checks all types of internet addresses (IPv4, IPv6 and Domains)
	 */
	protected String asOptionalInetAddress(String property) {
		String inetAddress = getConfigValue(property);
		if (inetAddress != null && !inetAddress.isEmpty()) {
			try {
				Inet6Address.getByName(inetAddress).getHostAddress();
			} catch (UnknownHostException e) {
				addError(property, "Is not a valid Internet Address (IP or Domain Name): " + e.getMessage());
			}
		}
		return inetAddress;
	}

	protected String asFileSystemPath(String property) {
		try {
			String stringPath = this.asNonEmptyString(property);
			Paths.get(stringPath);
			File f = new File(stringPath);
			f.getCanonicalPath();
			f.toURI().toString();
			return stringPath;
		} catch (Exception e) {
			addError(property, "Is not a valid file system path. " + e.getMessage());
			return null;
		}
	}

	protected List<String> asJsonStringsArray(String property) {

		try {

			Gson gson = new Gson();
			JsonArray jsonArray = gson.fromJson(getConfigValue(property), JsonArray.class);
			List<String> list = JsonUtils.toStringList(jsonArray);
			if (list.size() == 1 && list.get(0).isEmpty()) {
				list = new ArrayList<>();
			}
			return list;

		} catch (JsonSyntaxException e) {
			addError(property, "Is not a valid strings array in JSON format. " + e.getMessage());
			return Arrays.asList();
		}
	}
	
	protected <E extends Enum<E>> E asEnumValue(String property, Class<E> enumType) {
		
		String value = this.getConfigValue(property);
		try {
			return Enum.valueOf(enumType, value);
		} catch (IllegalArgumentException e) {
			addError(property, "Must be one of " + Arrays.asList(enumType.getEnumConstants()));
			return null;
		}		
	}

	public URI checkWebsocketUri(String uri) throws Exception {
		try {
			if (!uri.startsWith("ws://") || uri.startsWith("wss://")) {
				throw new Exception("WebSocket protocol not found");
			}
			String parsedUri = uri.replaceAll("^ws://", "http://").replaceAll("^wss://", "https://");
			return new URL(parsedUri).toURI();
		} catch (Exception e) {
			throw new RuntimeException(
					"URI '" + uri + "' has not a valid WebSocket endpoint format: " + e.getMessage());
		}
	}

	protected void checkUrl(String url) throws Exception {
		try {
			new URL(url).toURI();
		} catch (MalformedURLException | URISyntaxException e) {
			throw new Exception("String '" + url + "' has not a valid URL format: " + e.getMessage());
		}
	}

}