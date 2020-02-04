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
import java.io.IOException;
import java.net.Inet6Address;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.annotation.PostConstruct;

import org.apache.http.Header;
import org.apache.http.message.BasicHeader;
import org.kurento.jsonrpc.JsonUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.core.env.AbstractEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.Environment;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;
import org.springframework.stereotype.Component;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.cdr.CDREventName;
import io.openvidu.server.recording.RecordingNotification;

@Component
public class OpenviduConfig {

	private static final Logger log = LoggerFactory.getLogger(OpenviduConfig.class);

	public static final Set<String> OPENVIDU_STRING_PROPERTIES = new HashSet<>(Arrays.asList("openvidu.secret",
			"openvidu.publicurl", "openvidu.recording.path", "openvidu.recording.notification",
			"openvidu.recording.custom-layout", "openvidu.recording.composed-url", "openvidu.recording.version",
			"openvidu.webhook.endpoint", "openvidu.cdr.path", "coturn.ip", "coturn.redis.ip"));

	public static final Set<String> OPENVIDU_INTEGER_PROPERTIES = new HashSet<>(
			Arrays.asList("openvidu.recording.autostop-timeout", "openvidu.streams.video.max-recv-bandwidth",
					"openvidu.streams.video.min-recv-bandwidth", "openvidu.streams.video.max-send-bandwidth",
					"openvidu.streams.video.min-send-bandwidth"));

	public static final Set<String> OPENVIDU_BOOLEAN_PROPERTIES = new HashSet<>(Arrays.asList("openvidu.cdr",
			"openvidu.recording", "openvidu.recording.public-access", "openvidu.webhook"));

	public static final Set<String> OPENVIDU_ARRAY_PROPERTIES = new HashSet<>(
			Arrays.asList("kms.uris", "openvidu.webhook.headers", "openvidu.webhook.events"));

	public static final Set<String> OPENVIDU_PROPERTIES = Stream.of(OPENVIDU_STRING_PROPERTIES,
			OPENVIDU_INTEGER_PROPERTIES, OPENVIDU_BOOLEAN_PROPERTIES, OPENVIDU_ARRAY_PROPERTIES)
			.flatMap(Collection::stream).collect(Collectors.toSet());

	public static final List<String> OPENVIDU_VALID_PUBLICURL_VALUES = Arrays
			.asList(new String[] { "local", "docker", "" });

	@Value("#{'${spring.config.additional-location:}'.length() > 0 ? '${spring.config.additional-location:}' : \"\"}")
	protected String springConfigLocation;

	@Autowired
	private BuildProperties buildProperties;

	@Value("${kms.uris}")
	protected String kmsUris;

	@Value("${openvidu.publicurl}")
	protected String openviduPublicUrl; // local, docker, [FINAL_URL]

	@Value("${server.port}")
	protected String serverPort;

	@Value("${openvidu.secret}")
	protected String openviduSecret;

	@Value("${openvidu.cdr}")
	protected boolean openviduCdr;

	@Value("${openvidu.cdr.path}")
	protected String openviduCdrPath;

	@Value("${openvidu.recording}")
	protected boolean openviduRecording;

	@Value("${openvidu.recording.path}")
	protected String openviduRecordingPath;

	@Value("${openvidu.recording.public-access}")
	protected boolean openviduRecordingPublicAccess;

	@Value("${openvidu.recording.notification}")
	protected RecordingNotification openviduRecordingNotification;

	@Value("${openvidu.recording.custom-layout}")
	protected String openviduRecordingCustomLayout;

	@Value("${openvidu.recording.version}")
	protected String openviduRecordingVersion;

	@Value("${openvidu.recording.autostop-timeout}")
	protected int openviduRecordingAutostopTimeout;

	@Value("${openvidu.recording.composed-url}")
	protected String openviduRecordingComposedUrl;

	@Value("${openvidu.webhook}")
	protected boolean openviduWebhook;

	@Value("${openvidu.webhook.endpoint}")
	protected String openviduWebhookEndpoint;

	@Value("${openvidu.webhook.headers}")
	protected String openviduWebhookHeaders;

	@Value("${openvidu.webhook.events}")
	protected String openviduWebhookEvents;

	@Value("${openvidu.streams.video.max-recv-bandwidth}")
	protected int openviduStreamsVideoMaxRecvBandwidth;

	@Value("${openvidu.streams.video.min-recv-bandwidth}")
	protected int openviduStreamsVideoMinRecvBandwidth;

	@Value("${openvidu.streams.video.max-send-bandwidth}")
	protected int openviduStreamsVideoMaxSendBandwidth;

	@Value("${openvidu.streams.video.min-send-bandwidth}")
	protected int openviduStreamsVideoMinSendBandwidth;

	@Value("${coturn.redis.ip}")
	protected String coturnRedisIp;

	@Value("${coturn.redis.dbname}")
	protected String coturnRedisDbname;

	@Value("${coturn.redis.password}")
	protected String coturnRedisPassword;

	@Value("${coturn.redis.connect-timeout}")
	protected String coturnRedisConnectTimeout;

	@Value("#{'${coturn.ip:}'.length() > 0 ? '${coturn.ip:}' : \"\"}")
	protected String coturnIp;

	@Value("#{'${spring.profiles.active:}'.length() > 0 ? '${spring.profiles.active:}'.split(',') : \"default\"}")
	protected String springProfile;

	public static String finalUrl;
	public static List<String> kmsUrisList = new ArrayList<>();
	public static List<Header> webhookHeadersList = new ArrayList<>();
	public static List<CDREventName> webhookEventsList = new ArrayList<>();
	public static Properties externalizedProperties;

	@Autowired
	protected Environment env;

	public List<String> getKmsUris() {
		return kmsUrisList;
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

	public boolean openviduRecordingCustomLayoutChanged(String path) {
		return !"/opt/openvidu/custom-layout".equals(path);
	}

	public String getFinalUrl() {
		return finalUrl;
	}

	public void setFinalUrl(String finalUrl) {
		OpenviduConfig.finalUrl = finalUrl.endsWith("/") ? (finalUrl) : (finalUrl + "/");
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

	public String getCoturnIp() {
		return this.coturnIp;
	}

	public String getCoturnDatabaseString() {
		return "\"ip=" + this.coturnRedisIp + " dbname=" + this.coturnRedisDbname + " password="
				+ this.coturnRedisPassword + " connect_timeout=" + this.coturnRedisConnectTimeout + "\"";
	}

	public String getCoturnDatabaseDbname() {
		return this.coturnRedisDbname;
	}

	public RecordingNotification getOpenViduRecordingNotification() {
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
		return webhookHeadersList;
	}

	public List<CDREventName> getOpenViduWebhookEvents() {
		return webhookEventsList;
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
		return externalizedProperties;
	}

	public URI checkWebsocketUri(String uri) throws Exception {
		try {
			if (!uri.startsWith("ws://") || uri.startsWith("wss://")) {
				throw new Exception("WebSocket protocol not found");
			}
			String parsedUri = uri.replaceAll("^ws://", "http://").replaceAll("^wss://", "https://");
			return new URL(parsedUri).toURI();
		} catch (Exception e) {
			throw new Exception("URI '" + uri + "' has not a valid WebSocket endpoint format: " + e.getMessage());
		}
	}

	public void checkUrl(String url) throws Exception {
		try {
			new URL(url).toURI();
		} catch (MalformedURLException | URISyntaxException e) {
			throw new Exception("String '" + url + "' has not a valid URL format: " + e.getMessage());
		}
	}

	/*
	 * This method checks all types of internet addresses (IPv4, IPv6 and Domains)
	 */
	public void checkStringValidInetAddress(Map<String, ?> parameters, String key) throws Exception {
		String inetAddress = this.checkString(parameters, key);
		if (!inetAddress.isEmpty()) {
			try {
				Inet6Address.getByName(inetAddress).getHostAddress();
			} catch (UnknownHostException e) {
				throw new Exception("String value: ''" + inetAddress + "' with key: '" + key
						+ "' is not a valid Internet Address (IP or Domain Name): " + e.getMessage());
			}
		}
	}

	public void checkStringValidPathFormat(Map<String, ?> parameters, String key) throws Exception {
		try {
			String stringPath = this.checkString(parameters, key);
			Paths.get(stringPath);
			File f = new File(stringPath);
			f.getCanonicalPath();
			f.toURI().toString();
		} catch (Exception e) {
			throw new Exception(
					"Property '" + key + "' must be a string with a valid system path format: " + e.getMessage());
		}
	}

	public Properties checkConfigurationParameters(Map<String, ?> parameters, Collection<String> validKeys,
			boolean admitStringified) throws Exception {

		Properties stringifiedProperties = new Properties();

		parameters = this.filterValidParameters(parameters, validKeys);

		log.info("Checking configuration parameters: {}", parameters.keySet());

		boolean webhookEnabled = this.isWebhookEnabled();
		String webhookEndpoint = this.getOpenViduWebhookEndpoint();

		for (String parameter : parameters.keySet()) {
			switch (parameter) {
			case "openvidu.secret":
				String secret = checkString(parameters, parameter);
				if (secret.isEmpty()) {
					throw new Exception("Property 'openvidu.secret' cannot be empty");
				}
				break;
			case "openvidu.publicurl":
				String publicurl = checkString(parameters, parameter);
				if (!OPENVIDU_VALID_PUBLICURL_VALUES.contains(publicurl)) {
					try {
						checkUrl(publicurl);
					} catch (Exception e) {
						throw new Exception("Property 'openvidu.publicurl' not valid. " + e.getMessage());
					}
				}
				break;
			case "openvidu.cdr":
				checkBoolean(parameters, parameter, admitStringified);
				break;
			case "openvidu.recording":
				checkBoolean(parameters, parameter, admitStringified);
				break;
			case "openvidu.recording.public-access":
				checkBoolean(parameters, parameter, admitStringified);
				break;
			case "openvidu.recording.autostop-timeout":
				checkIntegerNonNegative(parameters, parameter, admitStringified);
				break;
			case "openvidu.recording.notification":
				String recordingNotif = checkString(parameters, parameter);
				try {
					RecordingNotification.valueOf(recordingNotif);
				} catch (IllegalArgumentException e) {
					throw new Exception("Property 'openvidu.recording.notification' has not a valid value ('"
							+ recordingNotif + "'). Must be one of " + Arrays.asList(RecordingNotification.values()));
				}
				break;
			case "openvidu.webhook":
				webhookEnabled = checkBoolean(parameters, parameter, admitStringified);
				break;
			case "openvidu.webhook.endpoint":
				webhookEndpoint = checkString(parameters, parameter);
				break;
			case "openvidu.streams.video.max-recv-bandwidth":
				checkIntegerNonNegative(parameters, parameter, admitStringified);
				break;
			case "openvidu.streams.video.min-recv-bandwidth":
				checkIntegerNonNegative(parameters, parameter, admitStringified);
				break;
			case "openvidu.streams.video.max-send-bandwidth":
				checkIntegerNonNegative(parameters, parameter, admitStringified);
				break;
			case "openvidu.streams.video.min-send-bandwidth":
				checkIntegerNonNegative(parameters, parameter, admitStringified);
				break;
			case "kms.uris":
				String kmsUris;
				try {
					// First check if castable to a List
					List<String> list = checkStringArray(parameters, parameter, admitStringified);
					String elementString;
					for (Object element : list) {
						try {
							// Check every object is a String value
							elementString = (String) element;
						} catch (ClassCastException e) {
							throw new Exception("Property 'kms.uris' is an array, but contains a value (" + element
									+ ") that is not a string: " + e.getMessage());
						}
					}
					kmsUris = list.toString();
				} catch (Exception e) {
					// If it is not a list, try casting to String
					kmsUris = checkString(parameters, parameter);
				}
				// Finally check all strings have a valid WebSocket URI format
				try {
					kmsUrisStringToList(kmsUris);
				} catch (Exception e) {
					throw new Exception(
							"Property 'kms.uris' is an array of strings, but contains some value that has not a valid WbeSocket URI format: "
									+ e.getMessage());
				}
				stringifiedProperties.setProperty(parameter, kmsUris);
				break;
			case "openvidu.webhook.headers":
				String webhookHeaders;
				try {
					// First check if castable to a List
					List<String> list = checkStringArray(parameters, parameter, admitStringified);
					String elementString;
					for (Object element : list) {
						try {
							// Check every object is a String value
							elementString = (String) element;
						} catch (ClassCastException e) {
							throw new Exception(
									"Property 'openvidu.webhook.headers' is an array, but contains a value (" + element
											+ ") that is not a string: " + e.getMessage());
						}
					}
					webhookHeaders = listToQuotedStringifiedArray(list);
				} catch (Exception e) {
					// If it is not a list, try casting to String
					webhookHeaders = checkString(parameters, parameter);
				}
				try {
					checkWebhookHeaders(webhookHeaders);
				} catch (Exception e) {
					throw new Exception(
							"Property 'openvidu.webhook.headers' contains a value not valid: " + e.getMessage());
				}
				stringifiedProperties.setProperty(parameter, webhookHeaders);
				break;
			case "openvidu.webhook.events":
				String webhookEvents;
				try {
					// First check if castable to a List
					List<String> list = checkStringArray(parameters, parameter, admitStringified);
					String elementString;
					for (Object element : list) {
						try {
							// Check every object is a String value
							elementString = (String) element;
						} catch (ClassCastException e) {
							throw new Exception("Property 'openvidu.webhook.events' is an array, but contains a value ("
									+ element + ") that is not a string: " + e.getMessage());
						}
					}
					webhookEvents = listToQuotedStringifiedArray(list);
				} catch (Exception e) {
					// If it is not a list, try casting to String
					webhookEvents = checkString(parameters, parameter);
				}
				try {
					checkWebhookEvents(webhookEvents);
				} catch (Exception e) {
					throw new Exception(
							"Property 'openvidu.webhook.events' contains a value not valid: " + e.getMessage());
				}
				stringifiedProperties.setProperty(parameter, webhookEvents);
				break;
			case "openvidu.recording.path":
				checkStringValidPathFormat(parameters, parameter);
				break;
			case "openvidu.recording.custom-layout":
				checkStringValidPathFormat(parameters, parameter);
				break;
			case "openvidu.recording.composed-url":
				String composedUrl = checkString(parameters, parameter);
				try {
					if (!composedUrl.isEmpty()) {
						checkUrl(composedUrl);
					}
				} catch (Exception e) {
					throw new Exception("Property 'openvidu.recording.composed-url' not valid. " + e.getMessage());
				}
				break;
			case "openvidu.recording.version":
				checkString(parameters, parameter);
				break;
			case "openvidu.cdr.path":
				checkStringValidPathFormat(parameters, parameter);
				break;
			case "coturn.ip":
				checkStringValidInetAddress(parameters, parameter);
				break;
			case "coturn.redis.ip":
				checkStringValidInetAddress(parameters, parameter);
				break;
			default:
				log.warn("Unknown configuration parameter '{}'", parameter);
			}

			if (!stringifiedProperties.containsKey(parameter)) {
				stringifiedProperties.setProperty(parameter, parameters.get(parameter).toString());
			}
		}

		if (webhookEnabled && (webhookEndpoint == null || webhookEndpoint.isEmpty())) {
			throw new Exception(
					"Property 'openvidu.webhook' set to true requires 'openvidu.webhook.endpoint' to be defined");
		}

		return stringifiedProperties;
	}

	public String checkString(Map<String, ?> parameters, String key) throws Exception {
		try {
			String stringValue = (String) parameters.get(key);
			return stringValue;
		} catch (ClassCastException e) {
			throw new Exception("Property '" + key + "' must be a string: " + e.getMessage());
		}
	}

	public boolean checkBoolean(Map<String, ?> parameters, String key, boolean admitStringified) throws Exception {
		try {
			if (parameters.get(key) instanceof Boolean) {
				return (Boolean) parameters.get(key);
			} else if (admitStringified) {
				boolean booleanValue = Boolean.parseBoolean((String) parameters.get(key));
				return booleanValue;
			} else {
				throw new Exception("Property '" + key + "' must be a boolean");
			}
		} catch (ClassCastException e) {
			throw new Exception("Property '" + key + "' must be a boolean: " + e.getMessage());
		}
	}

	public Integer checkIntegerNonNegative(Map<String, ?> parameters, String key, boolean admitStringified)
			throws Exception {
		try {
			Integer integerValue;
			if (parameters.get(key) instanceof Integer) {
				integerValue = (Integer) parameters.get(key);
			} else if (admitStringified) {
				integerValue = Integer.parseInt((String) parameters.get(key));
			} else {
				throw new Exception("Property '" + key + "' must be an integer");
			}
			if (integerValue < 0) {
				throw new Exception("Property '" + key + "' is an integer but cannot be less than 0 (current value: "
						+ integerValue + ")");
			}
			return integerValue;
		} catch (ClassCastException e) {
			throw new Exception("Property '" + key + "' must be an integer: " + e.getMessage());
		}
	}

	public List<String> checkStringArray(Map<String, ?> parameters, String key, boolean admitStringified)
			throws Exception {
		List<String> list;
		try {
			if (parameters.get(key) instanceof Collection<?>) {
				list = (List<String>) parameters.get(key);
			} else if (admitStringified) {
				list = this.stringifiedArrayOfStringToListOfStrings((String) parameters.get(key));
			} else {
				throw new Exception("Property '" + key + "' must be an array");
			}
			return list;
		} catch (ClassCastException e) {
			throw new Exception("Property '" + key + "' must be an array: " + e.getMessage());
		}
	}

	public Map<String, ?> filterValidParameters(Map<String, ?> parameters, Collection<String> validKeys) {
		return parameters.entrySet().stream().filter(x -> validKeys.contains(x.getKey()))
				.collect(Collectors.toMap(x -> x.getKey(), x -> x.getValue()));
	}

	public Properties retrieveExternalizedProperties() throws Exception {

		if (this.springConfigLocation.isEmpty()) {
			throw new Exception(
					"Externalized properties file not found. Path must be set with configuration parameter 'spring.config.additional-location'");
		}

		Properties externalizedProps = null;
		FileSystemResource resource = new FileSystemResource(this.springConfigLocation);
		try {
			externalizedProps = PropertiesLoaderUtils.loadProperties(resource);
			log.info("Properties file found at \"{}\". Content: {}", this.springConfigLocation, externalizedProps);
		} catch (IOException e) {
			throw new Exception("Error in 'spring.config.additional-location' system property. Cannot load properties: "
					+ e.getMessage());
		}
		// Check OpenVidu Server write permissions in properties path
		if (!Files.isWritable(Paths.get(this.springConfigLocation))) {
			log.warn(
					"The properties path '{}' set with property 'spring.config.additional-location' is missconfigured. Reason: OpenVidu Server needs write permissions. Try running command \"sudo chmod 777 {}\". If not, OpenVidu won't be able to overwrite preexisting properties",
					this.springConfigLocation, this.springConfigLocation);
		} else {
			log.info("OpenVidu Server has write permissions on properties path {}", this.springConfigLocation);
		}
		return externalizedProps;
	}

	public List<String> stringifiedArrayOfStringToListOfStrings(String json) {
		Gson gson = new Gson();
		JsonArray jsonArray = gson.fromJson(json, JsonArray.class);
		List<String> list = JsonUtils.toStringList(jsonArray);
		if (list.size() == 1 && list.get(0).isEmpty()) {
			list = new ArrayList<>();
		}
		return list;
	}

	public List<String> kmsUrisStringToList(String kmsUris) throws Exception {
		kmsUris = kmsUris.replaceAll("\\s", ""); // Remove all white spaces
		kmsUris = kmsUris.replaceAll("\\\\", ""); // Remove previous escapes
		kmsUris = kmsUris.replaceAll("\"", ""); // Remove previous double quotes
		kmsUris = kmsUris.replaceFirst("^\\[", "[\\\""); // Escape first char
		kmsUris = kmsUris.replaceFirst("\\]$", "\\\"]"); // Escape last char
		kmsUris = kmsUris.replaceAll(",", "\\\",\\\""); // Escape middle uris
		Gson gson = new Gson();
		JsonArray kmsUrisArray = gson.fromJson(kmsUris, JsonArray.class);

		List<String> list = JsonUtils.toStringList(kmsUrisArray);
		if (list.size() == 1 && list.get(0).isEmpty()) {
			list = new ArrayList<>();
		} else {
			for (String uri : list) {
				this.checkWebsocketUri(uri);
			}
		}
		return list;
	}

	private void checkWebhookEndpoint(String endpoint) throws Exception {
		try {
			new URL(endpoint).toURI();
			log.info("OpenVidu Webhook endpoint is {}", endpoint);
		} catch (MalformedURLException | URISyntaxException e) {
			throw new Exception("Webhook endpoint '" + endpoint + "' is not correct. Malformed URL: " + e.getMessage());
		}
	}

	private List<Header> checkWebhookHeaders(String headers) throws Exception {
		JsonElement elem = JsonParser.parseString(headers);
		JsonArray headersJsonArray = elem.getAsJsonArray();
		List<Header> headerList = new ArrayList<>();

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
			headerList.add(new BasicHeader(headerName, headerValue));
		}
		return headerList;
	}

	private List<CDREventName> checkWebhookEvents(String events) throws Exception {
		JsonElement elem = JsonParser.parseString(events);
		JsonArray eventsJsonArray = elem.getAsJsonArray();
		List<CDREventName> eventList = new ArrayList<>();

		for (JsonElement jsonElement : eventsJsonArray) {
			String eventString = jsonElement.getAsString();
			try {
				CDREventName.valueOf(eventString);
			} catch (IllegalArgumentException e) {
				throw new Exception("Event '" + eventString + "' does not exist");
			}
			eventList.add(CDREventName.valueOf(eventString));
		}
		return eventList;
	}

	public void checkFinalWebHookConfiguration() throws Exception {
		if (this.isWebhookEnabled()) {
			if (this.openviduWebhookEndpoint != null) {
				this.checkWebhookEndpoint(this.openviduWebhookEndpoint);
			} else {
				throw new Exception(
						"OpenVidu WebHook is enabled but no endpoint was set (property 'openvidu.webhook.endpoint' is not defined)");
			}
			webhookHeadersList = this.checkWebhookHeaders(this.openviduWebhookHeaders);
			webhookEventsList = this.checkWebhookEvents(this.openviduWebhookEvents);
			log.info("OpenVidu Webhook endpoint: {}", this.openviduWebhookEndpoint);
			log.info("OpenVidu Webhook headers: {}", this.getOpenViduWebhookHeaders().toString());
			log.info("OpenVidu Webhook events: {}", this.getOpenViduWebhookEvents().toString());
		}
	}

	@PostConstruct
	protected void init() {
		// Check configuration parameters
		Map<String, ?> props = getFinalPropertiesInUse();

		try {
			this.checkConfigurationParameters(props, OPENVIDU_PROPERTIES, true);
		} catch (Exception e) {
			log.error(e.getMessage());
			log.error("Shutting down OpenVidu Server");
			System.exit(1);
		}

		try {
			if (OPENVIDU_PROPERTIES.contains("kms.uris")) {
				kmsUrisList = this.kmsUrisStringToList(this.kmsUris);
			}
			this.checkFinalWebHookConfiguration();
		} catch (Exception e) {
			log.error("Unexpected exception when setting final value of configuration parameters: {}", e.getMessage());
		}

		// Generate final public url
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

			if (!OpenViduServer.wsUrl.startsWith("wss://")) {
				OpenViduServer.wsUrl = "wss://" + OpenViduServer.wsUrl;
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

		if (this.coturnIp.isEmpty()) {

			try {
				this.coturnIp = new URL(this.getFinalUrl()).getHost();
				log.info("Coturn IP: " + coturnIp);
			} catch (MalformedURLException e) {
				log.error("Can't get Domain name from OpenVidu public Url: " + e.getMessage());
			}
		}

	}

	protected Map<String, Object> getFinalPropertiesInUse() {
		final SortedMap<String, Object> props = new TreeMap<>();
		for (final PropertySource<?> propertySource : ((AbstractEnvironment) env).getPropertySources()) {
			if (!(propertySource instanceof EnumerablePropertySource))
				continue;
			for (final String name : ((EnumerablePropertySource<?>) propertySource).getPropertyNames())
				props.computeIfAbsent(name, propertySource::getProperty);
		}
		return props;
	}

	private String listToQuotedStringifiedArray(List<String> list) {
		return "[" + list.stream().map(s -> "\"" + s + "\"").collect(Collectors.joining(", ")) + "]";
	}

}