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

package io.openvidu.server.rest;

import org.apache.http.Header;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.server.cdr.CDREventName;
import io.openvidu.server.config.OpenviduBuildInfo;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.utils.RestUtils;

/**
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@RestController
@CrossOrigin
@ConditionalOnMissingBean(name = "configRestControllerPro")
@RequestMapping(RequestMappings.API + "/config")
public class ConfigRestController {

	private static final Logger log = LoggerFactory.getLogger(ConfigRestController.class);

	@Autowired
	private OpenviduConfig openviduConfig;

	@Autowired
	private OpenviduBuildInfo openviduBuildInfo;

	@RequestMapping(method = RequestMethod.GET)
	public ResponseEntity<String> getOpenViduConfiguration() {

		log.info("REST API: GET {}", RequestMappings.API + "/config");

		return this.getConfig();
	}

	@RequestMapping(value = "/openvidu-version", method = RequestMethod.GET)
	public String getOpenViduServerVersion() {

		log.info("REST API: GET {}/openvidu-version", RequestMappings.API + "/config");

		return openviduBuildInfo.getOpenViduServerVersion();
	}

	@RequestMapping(value = "/openvidu-publicurl", method = RequestMethod.GET)
	public String getOpenViduPublicUrl() {

		log.info("REST API: GET {}/openvidu-publicurl", RequestMappings.API + "/config");

		return openviduConfig.getFinalUrl();
	}

	@RequestMapping(value = "/openvidu-recording", method = RequestMethod.GET)
	public Boolean getOpenViduRecordingEnabled() {

		log.info("REST API: GET {}/openvidu-recording", RequestMappings.API + "/config");

		return openviduConfig.isRecordingModuleEnabled();
	}

	@RequestMapping(value = "/openvidu-recording-path", method = RequestMethod.GET)
	public String getOpenViduRecordingPath() {

		log.info("REST API: GET {}/openvidu-recording-path", RequestMappings.API + "/config");

		return openviduConfig.getOpenViduRecordingPath();
	}

	@RequestMapping(value = "/openvidu-cdr", method = RequestMethod.GET)
	public Boolean getOpenViduCdrEnabled() {

		log.info("REST API: GET {}/openvidu-cdr", RequestMappings.API + "/config");

		return openviduConfig.isCdrEnabled();
	}

	protected ResponseEntity<String> getConfig() {
		JsonObject json = new JsonObject();
		json.addProperty("VERSION", openviduBuildInfo.getVersion());
		json.addProperty("DOMAIN_OR_PUBLIC_IP", openviduConfig.getDomainOrPublicIp());
		json.addProperty("HTTPS_PORT", openviduConfig.getHttpsPort());
		json.addProperty("OPENVIDU_PUBLICURL", openviduConfig.getOpenViduPublicUrl());
		json.addProperty("OPENVIDU_CDR", openviduConfig.isCdrEnabled());
		json.addProperty("OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH", openviduConfig.getVideoMaxRecvBandwidth());
		json.addProperty("OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH", openviduConfig.getVideoMinRecvBandwidth());
		json.addProperty("OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH", openviduConfig.getVideoMaxSendBandwidth());
		json.addProperty("OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH", openviduConfig.getVideoMinSendBandwidth());
		json.addProperty("OPENVIDU_STREAMS_FORCED_VIDEO_CODEC", openviduConfig.getOpenviduForcedCodec().name());
		json.addProperty("OPENVIDU_STREAMS_ALLOW_TRANSCODING", openviduConfig.isOpenviduAllowingTranscoding());
		json.addProperty("OPENVIDU_WEBRTC_SIMULCAST", openviduConfig.isWebrtcSimulcast());
		json.addProperty("OPENVIDU_SESSIONS_GARBAGE_INTERVAL", openviduConfig.getSessionGarbageInterval());
		json.addProperty("OPENVIDU_SESSIONS_GARBAGE_THRESHOLD", openviduConfig.getSessionGarbageThreshold());
		json.addProperty("OPENVIDU_RECORDING", openviduConfig.isRecordingModuleEnabled());
		if (openviduConfig.isRecordingModuleEnabled()) {
			json.addProperty("OPENVIDU_RECORDING_VERSION", openviduConfig.getOpenViduRecordingVersion());
			json.addProperty("OPENVIDU_RECORDING_PATH", openviduConfig.getOpenViduRecordingPath());
			json.addProperty("OPENVIDU_RECORDING_PUBLIC_ACCESS", openviduConfig.getOpenViduRecordingPublicAccess());
			json.addProperty("OPENVIDU_RECORDING_NOTIFICATION",
					openviduConfig.getOpenViduRecordingNotification().name());
			json.addProperty("OPENVIDU_RECORDING_CUSTOM_LAYOUT", openviduConfig.getOpenviduRecordingCustomLayout());
			json.addProperty("OPENVIDU_RECORDING_AUTOSTOP_TIMEOUT",
					openviduConfig.getOpenviduRecordingAutostopTimeout());
			if (openviduConfig.getOpenViduRecordingComposedUrl() != null
					&& !openviduConfig.getOpenViduRecordingComposedUrl().isEmpty()) {
				json.addProperty("OPENVIDU_RECORDING_COMPOSED_URL", openviduConfig.getOpenViduRecordingComposedUrl());
			}
		}
		json.addProperty("OPENVIDU_WEBHOOK", openviduConfig.isWebhookEnabled());
		if (openviduConfig.isWebhookEnabled()) {
			json.addProperty("OPENVIDU_WEBHOOK_ENDPOINT", openviduConfig.getOpenViduWebhookEndpoint());
			JsonArray webhookHeaders = new JsonArray();
			for (Header header : openviduConfig.getOpenViduWebhookHeaders()) {
				webhookHeaders.add(header.getName() + ": " + header.getValue());
			}
			json.add("OPENVIDU_WEBHOOK_HEADERS", webhookHeaders);
			JsonArray webhookEvents = new JsonArray();
			for (CDREventName eventName : openviduConfig.getOpenViduWebhookEvents()) {
				webhookEvents.add(eventName.name());
			}
			json.add("OPENVIDU_WEBHOOK_EVENTS", webhookEvents);
		}

		return new ResponseEntity<>(json.toString(), RestUtils.getResponseHeaders(), HttpStatus.OK);
	}

}
