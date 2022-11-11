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

package io.openvidu.server.config;

import java.io.File;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import javax.annotation.PostConstruct;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.Range;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.validator.routines.DomainValidator;
import org.apache.commons.validator.routines.InetAddressValidator;
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
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;

import io.openvidu.java.client.IceServerProperties;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.cdr.CDREventName;
import io.openvidu.server.config.Dotenv.DotenvFormatException;
import io.openvidu.server.core.MediaServer;
import io.openvidu.server.recording.RecordingNotification;
import io.openvidu.server.rest.RequestMappings;

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

		@Override
		public String toString() {
			return "Error [property=" + property + ", value=" + value + ", message=" + message + "]";
		}
	}

	protected static final Logger log = LoggerFactory.getLogger(OpenviduConfig.class);

	private static final boolean SHOW_PROPERTIES_AS_ENV_VARS = true;

	private List<Error> configErrors = new ArrayList<>();

	private Map<String, String> configProps = new HashMap<>();

	private List<String> userConfigProps;

	protected final Set<String> secretProps = new HashSet<>(Arrays.asList("OPENVIDU_SECRET"));

	protected Map<String, ?> propertiesSource;

	public static final String DEFAULT_RECORDING_IMAGE_REPO = "openvidu/openvidu-recording";

	@Autowired
	protected Environment env;

	@Value("#{'${spring.profiles.active:}'.length() > 0 ? '${spring.profiles.active:}'.split(',') : \"default\"}")
	protected String springProfile;

	@Value("${FORCE_PLAIN_HTTP:false}")
	private boolean forcePlainHttp;

	// Config properties

	private boolean openviduCdr;

	private String openviduCdrPath;

	private boolean openviduRecording;

	private boolean openViduRecordingDebug;

	private boolean openviduRecordingPublicAccess;

	private Integer openviduRecordingAutostopTimeout;

	private String openviduRecordingPath;

	private RecordingNotification openviduRecordingNotification;

	private String openviduRecordingCustomLayout;

	private boolean openviduRecordingComposedBasicauth;

	private String openviduRecordingVersion;

	private String openviduRecordingImageRepo;

	private boolean openviduRecordingEnableGPU;

	private Integer openviduStreamsVideoMaxRecvBandwidth;

	private Integer openviduStreamsVideoMinRecvBandwidth;

	private Integer openviduStreamsVideoMaxSendBandwidth;

	private Integer openviduStreamsVideoMinSendBandwidth;

	protected String coturnIp;

	protected int coturnPort;

	private String coturnSharedSecretKey;

	// If true, coturn relay ips will come with the private IP of the machine
	private boolean coturnInternalRelay;

	private boolean openviduWebhookEnabled;

	private String openviduWebhookEndpoint;

	private List<Header> webhookHeadersList;

	private List<CDREventName> webhookEventsList;

	private List<String> kmsUrisList;

	private String domainOrPublicIp;

	private String openviduPublicUrl;

	private Integer httpsPort;

	private String openviduSecret;

	private String openviduRecordingComposedUrl;

	private String certificateType;

	protected int openviduSessionsGarbageInterval;

	protected int openviduSessionsGarbageThreshold;

	private VideoCodec openviduForcedCodec;

	private boolean openviduAllowTranscoding;

	private String dotenvPath;

	private boolean openviduDev = false;

	// Media Nodes private IPs and Public IPs
	// If defined, they will be configured as public IPs of Kurento or Mediasoup
	// Key: Private IP
	// Value: Public IP
	private Map<String, String> mediaNodesPublicIps = new HashMap<>();

	// Derived properties

	public static String finalUrl;

	// Media Server properties

	private MediaServer mediaServerInfo = MediaServer.kurento;

	// Webrtc properties

	private boolean webrtcSimulcast = false;

	private List<IceServerProperties.Builder> webrtcIceServersBuilders;

	// Plain config properties getters

	public boolean isCoturnUsingInternalRelay() {
		return this.coturnInternalRelay;
	}

	public List<String> getKmsUris() {
		return kmsUrisList;
	}

	public String getDomainOrPublicIp() {
		return this.domainOrPublicIp;
	}

	public String getOpenViduPublicUrl() {
		return this.openviduPublicUrl;
	}

	public Integer getHttpsPort() {
		return this.httpsPort;
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

	public boolean isOpenViduRecordingDebug() {
		return openViduRecordingDebug;
	}

	public boolean isRecordingComposedExternal() {
		return false;
	}

	public MediaServer getMediaServer() {
		return this.mediaServerInfo;
	}

	public void setMediaServer(MediaServer mediaServerInfo) {
		this.mediaServerInfo = mediaServerInfo;
	}

	public boolean isWebrtcSimulcast() {
		return this.webrtcSimulcast;
	}

	public List<IceServerProperties.Builder> getWebrtcIceServersBuilders() {
		return webrtcIceServersBuilders;
	}

	public String getOpenViduRecordingPath() {
		return this.openviduRecordingPath;
	}

	public String getOpenViduRecordingPath(String key) {
		return this.openviduRecordingPath;
	}

	public boolean getOpenViduRecordingPublicAccess() {
		return this.openviduRecordingPublicAccess;
	}

	public String getOpenviduRecordingCustomLayout() {
		return this.openviduRecordingCustomLayout;
	}

	public boolean isOpenviduRecordingComposedBasicauth() {
		return this.openviduRecordingComposedBasicauth;
	}

	public String getOpenViduRecordingVersion() {
		return this.openviduRecordingVersion;
	}

	public int getOpenviduRecordingAutostopTimeout() {
		return this.openviduRecordingAutostopTimeout;
	}

	public String getOpenviduRecordingImageRepo() {
		return this.openviduRecordingImageRepo;
	}

	public boolean isOpenviduRecordingGPUEnabled() {
		return this.openviduRecordingEnableGPU;
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

	public String getCoturnIp(String kmsUri) {
		return this.coturnIp;
	}

	public int getCoturnPort() {
		return this.coturnPort;
	}

	public String getCoturnSharedSecretKey() {
		return this.coturnSharedSecretKey;
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

	public VideoCodec getOpenviduForcedCodec() {
		return openviduForcedCodec;
	}

	public boolean isOpenviduAllowingTranscoding() {
		return openviduAllowTranscoding;
	}

	public String getDotenvPath() {
		return dotenvPath;
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

	public boolean areMediaNodesPublicIpsDefined() {
		return !this.mediaNodesPublicIps.isEmpty();
	}

	public Map<String, String> getMediaNodesPublicIpsMap() {
		return this.mediaNodesPublicIps;
	}

	public Set<OpenViduRole> getRolesFromRecordingNotification() {
		Set<OpenViduRole> roles = new HashSet<>();
		switch (this.openviduRecordingNotification) {
		case none:
			break;
		case moderator:
			roles.add(OpenViduRole.MODERATOR);
			break;
		case publisher_moderator:
			roles.add(OpenViduRole.PUBLISHER);
			roles.add(OpenViduRole.MODERATOR);
			break;
		case all:
			roles.add(OpenViduRole.SUBSCRIBER);
			roles.add(OpenViduRole.PUBLISHER);
			roles.add(OpenViduRole.MODERATOR);
			break;
		default:
			roles.add(OpenViduRole.PUBLISHER);
			roles.add(OpenViduRole.MODERATOR);
		}
		return roles;
	}

	public boolean isOpenViduSecret(String secret) {
		return secret.equals(this.getOpenViduSecret());
	}

	public boolean isOpenViduDev() {
		return this.openviduDev;
	}

	public boolean openviduRecordingCustomLayoutChanged(String path) {
		return !"/opt/openvidu/custom-layout".equals(path);
	}

	public String getOpenViduFrontendDefaultPath() {
		return RequestMappings.FRONTEND_CE;
	}

	public int getReconnectionTimeout() {
		return -1;
	}

	public int getAppliedReconnectionTimeout() {
		return Integer.MAX_VALUE;
	}

	// Properties management methods

	public OpenviduConfig deriveWithAdditionalPropertiesSource(Map<String, ?> propertiesSource) {
		OpenviduConfig config = newOpenviduConfig();
		config.propertiesSource = propertiesSource;
		config.env = env;
		return config;
	}

	protected OpenviduConfig newOpenviduConfig() {
		return new OpenviduConfig();
	}

	public List<Error> getConfigErrors() {
		return configErrors;
	}

	public Map<String, String> getConfigProps() {
		return configProps;
	}
	
	public Set<String> getSecretProperties() {
		return secretProps;
	}

	public List<String> getUserProperties() {
		return userConfigProps;
	}

	private String getValue(String property) {
		return this.getValue(property, true);
	}

	protected String getValue(String property, boolean storeInConfigProps) {
		String value = null;
		if (propertiesSource != null) {
			Object valueObj = propertiesSource.get(property);
			if (valueObj != null) {
				value = valueObj.toString();
			}
		}
		if (value == null) {
			value = env.getProperty(property);
		}
		if (storeInConfigProps) {
			this.configProps.put(property, value);
		}
		return value;
	}

	public String getPropertyName(String propertyName) {
		if (SHOW_PROPERTIES_AS_ENV_VARS) {
			return propertyName.replace('.', '_').replace('-', '_').toUpperCase();
		} else {
			return propertyName;
		}
	}

	protected void addError(String property, String msg) {

		String value = null;

		if (property != null) {
			value = getValue(property);
		}

		this.configErrors.add(new Error(property, value, msg));
	}

	public void checkConfiguration(boolean loadDotenv) {
		try {
			this.checkConfigurationProperties(loadDotenv);
		} catch (Exception e) {
			log.error("Exception checking configuration", e);
			addError(null, "Exception checking configuration." + e.getClass().getName() + ":" + e.getMessage());
		}
		postProcessConfigProps();
		userConfigProps = new ArrayList<>(configProps.keySet());
		userConfigProps.removeAll(getNonUserProperties());
		for (String notShowEmptyConfigKey : getNonPrintablePropertiesIfEmpty()) {
			String value = configProps.get(notShowEmptyConfigKey);
			if (value == null || value.isEmpty() || value.equals(new JsonArray().toString())) {
				userConfigProps.remove(notShowEmptyConfigKey);
			}
		}
	}

	@PostConstruct
	public void postConstruct() {
		this.checkConfiguration(true);
	}

	protected void postProcessConfigProps() {
	}

	protected List<String> getNonUserProperties() {
		return Arrays.asList("server.port", "SERVER_PORT", "DOTENV_PATH", "COTURN_IP", "COTURN_PORT",
				"COTURN_INTERNAL_RELAY", "COTURN_SHARED_SECRET_KEY", "OPENVIDU_RECORDING_IMAGE",
				"OPENVIDU_RECORDING_ENABLE_GPU");
	}

	protected List<String> getNonPrintablePropertiesIfEmpty() {
		return Arrays.asList("MEDIA_NODES_PUBLIC_IPS", "OPENVIDU_WEBRTC_ICE_SERVERS");
	}

	// Properties

	protected void checkConfigurationProperties(boolean loadDotenv) {

		if (loadDotenv) {
			dotenvPath = getValue("DOTENV_PATH");
			this.populatePropertySourceFromDotenv();
		}

		checkHttpsPort();
		checkDomainOrPublicIp();
		populateSpringServerPort();

		// If true, coturn is using private IPs as relay IPs to enable relay connections
		// pass through internal network
		coturnInternalRelay = asBoolean("COTURN_INTERNAL_RELAY");

		openviduSecret = asNonEmptyAlphanumericString("OPENVIDU_SECRET",
				"Cannot be empty and must contain only alphanumeric characters [a-zA-Z0-9], hypens (\"-\") and underscores (\"_\")");

		// Read coturn shared key
		coturnSharedSecretKey = asOptionalString("COTURN_SHARED_SECRET_KEY");
		if (coturnSharedSecretKey == null || coturnSharedSecretKey.isEmpty()) {
			log.warn("COTURN_SHARED_SECRET_KEY is not defined. Using OPENVIDU_SECRET");
			this.coturnSharedSecretKey = this.openviduSecret;
		} else {
			log.info("COTURN_SHARED_SECRET_KEY used to generate TURN users: {}", this.coturnSharedSecretKey);
		}

		openviduCdr = asBoolean("OPENVIDU_CDR");
		openviduCdrPath = openviduCdr ? asWritableFileSystemPath("OPENVIDU_CDR_PATH")
				: asFileSystemPath("OPENVIDU_CDR_PATH");

		openviduRecording = asBoolean("OPENVIDU_RECORDING");
		openViduRecordingDebug = asBoolean("OPENVIDU_RECORDING_DEBUG");
		openviduRecordingPath = openviduRecording ? asWritableFileSystemPath("OPENVIDU_RECORDING_PATH")
				: asFileSystemPath("OPENVIDU_RECORDING_PATH");
		openviduRecordingPublicAccess = asBoolean("OPENVIDU_RECORDING_PUBLIC_ACCESS");
		openviduRecordingAutostopTimeout = asNonNegativeInteger("OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT");
		openviduRecordingCustomLayout = asFileSystemPath("OPENVIDU_RECORDING_CUSTOM_LAYOUT");
		openviduRecordingComposedBasicauth = asBoolean("OPENVIDU_RECORDING_COMPOSED_BASICAUTH");
		openviduRecordingVersion = asNonEmptyString("OPENVIDU_RECORDING_VERSION");
		openviduRecordingComposedUrl = asOptionalURL("OPENVIDU_RECORDING_COMPOSED_URL");
		openviduRecordingEnableGPU = asBoolean("OPENVIDU_RECORDING_ENABLE_GPU");
		configureRecordingImage("OPENVIDU_RECORDING_IMAGE");
		checkOpenviduRecordingNotification();

		openviduStreamsVideoMaxRecvBandwidth = asNonNegativeInteger("OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH");
		openviduStreamsVideoMinRecvBandwidth = asNonNegativeInteger("OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH");
		openviduStreamsVideoMaxSendBandwidth = asNonNegativeInteger("OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH");
		openviduStreamsVideoMinSendBandwidth = asNonNegativeInteger("OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH");

		openviduSessionsGarbageInterval = asNonNegativeInteger("OPENVIDU_SESSIONS_GARBAGE_INTERVAL");
		openviduSessionsGarbageThreshold = asNonNegativeInteger("OPENVIDU_SESSIONS_GARBAGE_THRESHOLD");

		openviduForcedCodec = asEnumValue("OPENVIDU_STREAMS_FORCED_VIDEO_CODEC", VideoCodec.class);
		openviduAllowTranscoding = asBoolean("OPENVIDU_STREAMS_ALLOW_TRANSCODING");

		// Load Public IPS
		mediaNodesPublicIps = loadMediaNodePublicIps("MEDIA_NODES_PUBLIC_IPS");

		kmsUrisList = checkKmsUris();

		checkCoturnIp();
		coturnPort = checkPort("COTURN_PORT");

		checkWebhook();

		checkCertificateType();

		webrtcIceServersBuilders = loadWebrtcIceServers("OPENVIDU_WEBRTC_ICE_SERVERS");

		Boolean openviduDevAux = asOptionalBoolean("OPENVIDU_DEV", false);
		if (openviduDevAux != null) {
			openviduDev = openviduDevAux;
		}
	}

	private void checkCertificateType() {
		String property = "CERTIFICATE_TYPE";
		certificateType = asNonEmptyString(property);

		if (certificateType != null && !certificateType.isEmpty()) {
			List<String> validValues = Arrays.asList("selfsigned", "owncert", "letsencrypt");
			if (!validValues.contains(certificateType)) {
				addError(property, "Invalid value '" + certificateType + "'. Valid values are " + validValues);
			}
		}
	}

	private void checkCoturnIp() {
		String property = "COTURN_IP";
		coturnIp = checkIp(property);

		if (coturnIp == null || this.coturnIp.isEmpty()) {
			try {
				this.coturnIp = new URL(this.getFinalUrl()).getHost();
			} catch (MalformedURLException e) {
				log.error("Can't get Domain name from OpenVidu public Url: " + e.getMessage());
			}
		}
	}

	protected String checkIp(String property) {
		return asOptionalIPv4OrIPv6(property);
	}

	protected int checkPort(String property) {
		int port = this.asNonNegativeInteger(property);
		if (port <= 0 || port > 65535) {
			addError(property, property + " is out of valid ports range (0-65535)");
		}
		return port;
	}

	private void checkWebhook() {
		openviduWebhookEnabled = asBoolean("OPENVIDU_WEBHOOK");
		openviduWebhookEndpoint = asOptionalURL("OPENVIDU_WEBHOOK_ENDPOINT");
		webhookHeadersList = checkWebhookHeaders();
		webhookEventsList = getWebhookEvents();

		if (openviduWebhookEnabled && (openviduWebhookEndpoint == null || openviduWebhookEndpoint.isEmpty())) {
			addError("OPENVIDU_WEBHOOK_ENDPOINT", "With OPENVIDU_WEBHOOK=true, this property cannot be empty");
		}
	}

	private void checkOpenviduRecordingNotification() {
		String recordingNotif = asNonEmptyString("OPENVIDU_RECORDING_NOTIFICATION");
		try {
			openviduRecordingNotification = RecordingNotification.valueOf(recordingNotif);
		} catch (IllegalArgumentException e) {
			addError("OPENVIDU_RECORDING_NOTIFICATION",
					"Must be one of the values " + Arrays.asList(RecordingNotification.values()));
		}
	}

	private void checkDomainOrPublicIp() {
		final String property = "DOMAIN_OR_PUBLIC_IP";
		String domain = asOptionalInetAddress(property);

		if (domain != null && !domain.isEmpty()) {
			this.domainOrPublicIp = domain;
			this.openviduPublicUrl = (forcePlainHttp ? "http://" : "https://") + domain;
			if (this.httpsPort != null && this.httpsPort != 443) {
				this.openviduPublicUrl += (":" + this.httpsPort);
			}
			calculatePublicUrl();
		} else {
			addError(property, "Cannot be empty");
		}
	}

	private void checkHttpsPort() {
		String property = "HTTPS_PORT";
		String httpsPort = getValue(property);
		if (httpsPort == null) {
			addError(property, "Cannot be undefined");
		}
		int httpsPortNumber = 0;
		try {
			httpsPortNumber = Integer.parseInt(httpsPort);
		} catch (NumberFormatException e) {
			addError(property, "Is not a valid port. Must be an integer. " + e.getMessage());
			return;
		}
		if (httpsPortNumber > 0 && httpsPortNumber <= 65535) {
			this.httpsPort = httpsPortNumber;
		} else {
			addError(property, "Is not a valid port. Valid port range exceeded with value " + httpsPortNumber);
			return;
		}
	}

	/**
	 * Will add to collection of configuration properties the property "SERVER_PORT"
	 * only if property "SERVER_PORT" or "server.port" was explicitly defined. This
	 * doesn't mean this property won't have a default value if not explicitly
	 * defined (8080 is the default value given by Spring)
	 */
	private void populateSpringServerPort() {
		String springServerPort = getValue("server.port", false);
		if (springServerPort == null) {
			springServerPort = getValue("SERVER_PORT", false);
		}
		if (springServerPort != null) {
			this.configProps.put("SERVER_PORT", springServerPort);
		}
	}

	private void calculatePublicUrl() {
		final String publicUrl = this.getOpenViduPublicUrl();
		if (publicUrl.startsWith("https://")) {
			OpenViduServer.wsUrl = publicUrl.replace("https://", "wss://");
		} else if (publicUrl.startsWith("http://")) {
			OpenViduServer.wsUrl = publicUrl.replace("http://", "ws://");
		}
		if (OpenViduServer.wsUrl.endsWith("/")) {
			OpenViduServer.wsUrl = OpenViduServer.wsUrl.substring(0, OpenViduServer.wsUrl.length() - 1);
		}
		String finalUrl = OpenViduServer.wsUrl.replaceFirst("wss://", "https://").replaceFirst("ws://", "http://");
		this.setFinalUrl(finalUrl);
		OpenViduServer.httpUrl = this.getFinalUrl();
	}

	public List<String> checkKmsUris() {

		String property = "KMS_URIS";

		return asKmsUris(property, getValue(property));

	}

	public List<String> asKmsUris(String property, String kmsUris) {

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
		String property = "OPENVIDU_WEBHOOK_HEADERS";
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
		String property = "OPENVIDU_WEBHOOK_EVENTS";
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
		String optionalUrl = getValue(property);
		try {
			if (optionalUrl.isBlank()) {
				return null;
			}
			checkUrl(optionalUrl);
			return optionalUrl;
		} catch (Exception e) {
			addError(property, "Is not a valid URL. " + e.getMessage());
			return null;
		}
	}

	protected String asNonEmptyString(String property) {
		String stringValue = getValue(property);
		if (stringValue != null && !stringValue.isEmpty()) {
			return stringValue;
		} else {
			addError(property, "Cannot be empty.");
			return null;
		}
	}

	protected String asNonEmptyAlphanumericString(String property, String errorMessage) {
		final String REGEX = "^[a-zA-Z0-9_-]+$";
		String stringValue = getValue(property);
		if (stringValue != null && !stringValue.isEmpty() && stringValue.matches(REGEX)) {
			return stringValue;
		} else {
			addError(property, errorMessage);
			return null;
		}
	}

	protected String asOptionalString(String property) {
		return getValue(property);
	}

	protected Boolean asOptionalBoolean(String property, boolean storeInConfigProps) {
		Boolean value = null;
		String strValue = this.getValue(property, storeInConfigProps);
		if (strValue != null) {
			value = Boolean.parseBoolean(strValue);
		}
		return value;
	}

	protected String asOptionalStringAndNullIfBlank(String property) {
		String value = getValue(property);
		if (value != null && value.isBlank()) {
			value = null;
		}
		return value;
	}

	protected boolean asBoolean(String property) {
		String value = getValue(property);
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
			Integer integerValue = Integer.parseInt(getValue(property));
			if (integerValue < 0) {
				addError(property, "Is not a non negative integer");
			}
			return integerValue;
		} catch (NumberFormatException e) {
			addError(property, "Is not a non negative integer");
			return 0;
		}
	}

	protected Integer asOptionalIntegerBetweenRanges(String property, Range<Integer>... ranges) {
		try {
			String value = getValue(property);
			if (value == null || value.isEmpty()) {
				return null;
			}
			Integer integerValue = Integer.parseInt(getValue(property));
			boolean belognsToRanges = false;
			for (int i = 0; i < ranges.length; i++) {
				if (ranges[i].contains(integerValue)) {
					belognsToRanges = true;
					break;
				}
			}
			if (!belognsToRanges) {
				addError(property, "It does not belong to the accepted ranges");
				return 0;
			} else {
				return integerValue;
			}
		} catch (NumberFormatException e) {
			addError(property, "Is not an integer");
			return 0;
		}
	}

	/*
	 * This method checks all types of Internet addresses (IPv4, IPv6 and Domains)
	 */
	protected String asOptionalInetAddress(String property) {
		String inetAddress = getValue(property);
		if (inetAddress != null && !inetAddress.isEmpty()) {
			DomainValidator domainValidator = DomainValidator.getInstance();
			if (domainValidator.isValid(inetAddress)) {
				return inetAddress;
			}
			InetAddressValidator ipValidator = InetAddressValidator.getInstance();
			if (ipValidator.isValid(inetAddress)) {
				return inetAddress;
			}
			try {
				Inet6Address.getByName(inetAddress).getHostAddress();
				return inetAddress;
			} catch (UnknownHostException e) {
				addError(property, "Is not a valid Internet Address (IP or Domain Name): " + e.getMessage());
			}
		}
		return inetAddress;
	}

	protected String asOptionalIPv4OrIPv6(String property) {
		String ip = getValue(property);
		isValidIp(property, ip);
		return ip;
	}

	protected String asFileSystemPath(String property) {
		try {
			String stringPath = this.asNonEmptyString(property);
			Paths.get(stringPath);
			File f = new File(stringPath);
			f.getCanonicalPath();
			f.toURI().toString();
			stringPath = stringPath.endsWith("/") ? stringPath : (stringPath + "/");
			return stringPath;
		} catch (Exception e) {
			addError(property, "Is not a valid file system path. " + e.getMessage());
			return null;
		}
	}

	protected String asWritableFileSystemPath(String property) {
		try {
			String stringPath = this.asNonEmptyString(property);
			Paths.get(stringPath);
			File f = new File(stringPath);
			f.getCanonicalPath();
			f.toURI().toString();
			if (!f.exists()) {
				if (!f.mkdirs()) {
					throw new Exception(
							"The path does not exist and OpenVidu Server does not have enough permissions to create it");
				}
			}
			if (!f.canWrite()) {
				throw new Exception(
						"OpenVidu Server does not have permissions to write on path " + f.getCanonicalPath());
			}
			stringPath = stringPath.endsWith("/") ? stringPath : (stringPath + "/");
			return stringPath;
		} catch (Exception e) {
			addError(property, "Is not a valid writable file system path. " + e.getMessage());
			return null;
		}
	}

	protected List<String> asJsonStringsArray(String property) {
		try {
			Gson gson = new Gson();
			JsonArray jsonArray = gson.fromJson(getValue(property), JsonArray.class);
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
		String value = this.getValue(property);
		try {
			return Enum.valueOf(enumType, value);
		} catch (IllegalArgumentException e) {
			addError(property, "Must be one of " + Arrays.asList(enumType.getEnumConstants()));
			return null;
		}
	}

	protected Map<String, String> asOptionalStringMap(String property) {
		Map<String, String> map = new HashMap<>();
		String str = getValue(property);
		if (str != null && !str.isEmpty()) {
			try {
				Gson gson = new Gson();
				JsonObject jsonObject = gson.fromJson(str, JsonObject.class);
				for (Entry<String, JsonElement> entry : jsonObject.entrySet()) {
					map.put(entry.getKey(), entry.getValue().getAsString());
				}
				return map;
			} catch (JsonSyntaxException e) {
				addError(property, "Is not a valid map of strings. " + e.getMessage());
				return map;
			}
		}
		return map;
	}

	public URI checkWebsocketUri(String uri) throws Exception {
		try {
			if (!StringUtils.startsWithAny(uri, "ws://", "wss://")) {
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

	protected void populatePropertySourceFromDotenv() {
		File dotenvFile = this.getDotenvFile();
		if (dotenvFile != null) {
			if (dotenvFile.canRead()) {
				Dotenv dotenv = new Dotenv();
				try {
					dotenv.read(dotenvFile.toPath());
					this.propertiesSource = dotenv.getAll();
					log.info("Configuration properties read from file {}", dotenvFile.getAbsolutePath());
				} catch (IOException | DotenvFormatException e) {
					log.error("Error reading properties from .env file: {}", e.getMessage());
					addError(null, e.getMessage());
				}
			} else {
				log.error("OpenVidu does not have read permissions over .env file at {}", this.getDotenvPath());
			}
		}
	}

	public Path getDotenvFilePathFromDotenvPath(String dotenvPathProperty) {
		if (dotenvPathProperty.endsWith(".env")) {
			// Is file
			return Paths.get(dotenvPathProperty);
		} else if (dotenvPathProperty.endsWith("/")) {
			// Is folder
			return Paths.get(dotenvPathProperty + ".env");
		} else {
			// Is a folder not ending in "/"
			return Paths.get(dotenvPathProperty + "/.env");
		}
	}

	public File getDotenvFile() {
		if (getDotenvPath() != null && !getDotenvPath().isEmpty()) {

			Path path = getDotenvFilePathFromDotenvPath(getDotenvPath());
			String normalizePath = FilenameUtils.normalize(path.toAbsolutePath().toString());
			File file = new File(normalizePath);

			if (file.exists()) {
				return file;
			} else {
				log.error(".env file not found at {}", file.getAbsolutePath().toString());
			}

		} else {
			log.warn("DOTENV_PATH configuration property is not defined");
		}
		return null;
	}

	private void configureRecordingImage(String recordingImageProperty) {
		String configuredImage = asOptionalString(recordingImageProperty);
		if (configuredImage == null || configuredImage.isEmpty()) {
			openviduRecordingImageRepo = DEFAULT_RECORDING_IMAGE_REPO;
		} else {
			String[] customImageSplit = configuredImage.split(":");
			if (customImageSplit.length != 2) {
				addError(recordingImageProperty, "The docker image configured is not valid. "
						+ "This parameter must have this format: '<image>:<tag>'");
			} else {
				String customImageName = customImageSplit[0];
				String customVersion = customImageSplit[1];
				openviduRecordingImageRepo = customImageName;
				openviduRecordingVersion = customVersion;
			}
		}
	}

	private Map<String, String> loadMediaNodePublicIps(String propertyName) {
		String mediaNodesPublicIpsRaw = this.asOptionalString(propertyName);
		final Map<String, String> mediaNodesPublicIps = new HashMap<>();

		if (mediaNodesPublicIpsRaw == null || mediaNodesPublicIpsRaw.isEmpty()) {
			return mediaNodesPublicIps;
		}
		List<String> mediaNodesPublicIpsList = asJsonStringsArray(propertyName);
		for (String ipPairStr : mediaNodesPublicIpsList) {
			String[] ipPair = ipPairStr.trim().split(":");
			if (ipPair.length != 2) {
				addError(propertyName, "Not valid ip pair in " + propertyName + ": " + ipPairStr);
				break;
			}
			String privateIp = ipPair[0];
			String publicIp = ipPair[1];
			isValidIp(propertyName, privateIp);
			isValidIp(propertyName, publicIp);
			mediaNodesPublicIps.put(privateIp, publicIp);
		}
		return mediaNodesPublicIps;
	}

	private void isValidIp(String property, String ip) {
		if (ip != null && !ip.isEmpty()) {
			boolean isIP;
			try {
				final InetAddress inet = InetAddress.getByName(ip);
				isIP = inet instanceof Inet4Address || inet instanceof Inet6Address;
				if (isIP) {
					ip = inet.getHostAddress();
				}
			} catch (final UnknownHostException e) {
				isIP = false;
			}
			if (!isIP) {
				addError(property, "Is not a valid IP Address (IPv4 or IPv6): " + ip);
			}
		}
	}

	private List<IceServerProperties.Builder> loadWebrtcIceServers(String property) {
		String rawIceServers = asOptionalString(property);
		List<IceServerProperties.Builder> webrtcIceServers = new ArrayList<>();
		if (rawIceServers == null || rawIceServers.isEmpty()) {
			return webrtcIceServers;
		}
		List<String> arrayIceServers = asJsonStringsArray(property);
		for (String iceServerString : arrayIceServers) {
			try {
				IceServerProperties.Builder iceServerProperties = readIceServer(property, iceServerString);
				webrtcIceServers.add(iceServerProperties);
			} catch (Exception e) {
				addError(property, iceServerString + " is not a valid webrtc ice server: " + e.getMessage());
			}
		}
		return webrtcIceServers;
	}

	private IceServerProperties.Builder readIceServer(String property, String iceServerString) {
		String url = null, username = null, credential = null, staticAuthSecret = null;
		String[] iceServerPropList = iceServerString.split(",");
		for (String iceServerProp : iceServerPropList) {
			if (iceServerProp.startsWith("url=")) {
				url = StringUtils.substringAfter(iceServerProp, "url=");
			} else if (iceServerProp.startsWith("username=")) {
				username = StringUtils.substringAfter(iceServerProp, "username=");
			} else if (iceServerProp.startsWith("credential=")) {
				credential = StringUtils.substringAfter(iceServerProp, "credential=");
			} else if (iceServerProp.startsWith("staticAuthSecret=")) {
				staticAuthSecret = StringUtils.substringAfter(iceServerProp, "staticAuthSecret=");
			} else {
				addError(property, "Wrong parameter: " + iceServerProp);
			}
		}
		IceServerProperties.Builder builder = new IceServerProperties.Builder().url(url);
		IceServerProperties.Builder builderCheck = new IceServerProperties.Builder().url(url);
		if (staticAuthSecret != null) {
			builder.staticAuthSecret(staticAuthSecret);
			builderCheck.staticAuthSecret(staticAuthSecret);
		}
		if (username != null) {
			builder.username(username);
			builderCheck.username(username);
		}
		if (credential != null) {
			builder.credential(credential);
			builderCheck.credential(credential);
		}
		// Validate config input
		builderCheck.build();
		return builder;
	}

	public String hideSecret(final String originalString, String charToReplace, int numberOfVisibleChars) {
		String hiddenString = originalString.substring(originalString.length() - numberOfVisibleChars,
				originalString.length());
		hiddenString = charToReplace.repeat(originalString.length() - numberOfVisibleChars) + hiddenString;
		return hiddenString;
	}
	
}
