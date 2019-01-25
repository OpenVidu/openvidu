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

package io.openvidu.server.rest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.google.gson.JsonObject;

import io.openvidu.server.config.OpenviduConfig;

/**
 *
 * @author Pablo Fuente Pérez
 */
@RestController
@CrossOrigin
@RequestMapping("/config")
public class ConfigRestController {

	@Autowired
	protected OpenviduConfig openviduConfig;

	@RequestMapping(value = "/openvidu-version", method = RequestMethod.GET)
	public String getOpenViduServerVersion() {
		return openviduConfig.getOpenViduServerVersion();
	}

	@RequestMapping(value = "/openvidu-publicurl", method = RequestMethod.GET)
	public String getOpenViduPublicUrl() {
		return openviduConfig.getFinalUrl();
	}

	@RequestMapping(value = "/openvidu-recording", method = RequestMethod.GET)
	public Boolean getOpenViduRecordingEnabled() {
		return openviduConfig.isRecordingModuleEnabled();
	}

	@RequestMapping(value = "/openvidu-recording-path", method = RequestMethod.GET)
	public String getOpenViduRecordingPath() {
		return openviduConfig.getOpenViduRecordingPath();
	}

	@RequestMapping(value = "/openvidu-cdr", method = RequestMethod.GET)
	public Boolean getOpenViduCdrEnabled() {
		return openviduConfig.isCdrEnabled();
	}

	@RequestMapping(method = RequestMethod.GET)
	public ResponseEntity<?> getOpenViduConfiguration() {

		JsonObject json = new JsonObject();
		json.addProperty("openviduServerVersion", openviduConfig.getOpenViduServerVersion());
		json.addProperty("openviduPublicurl", openviduConfig.getOpenViduPublicUrl());
		json.addProperty("openviduCdr", openviduConfig.isCdrEnabled());
		json.addProperty("openviduRecording", openviduConfig.isRecordingModuleEnabled());
		json.addProperty("openviduRecordingPublicAccess", openviduConfig.getOpenViduRecordingPublicAccess());
		json.addProperty("openviduRecordingPath", openviduConfig.getOpenViduRecordingPath());
		json.addProperty("openviduRecordingVersion", openviduConfig.getOpenViduRecordingVersion());

		HttpHeaders responseHeaders = new HttpHeaders();
		responseHeaders.setContentType(MediaType.APPLICATION_JSON);
		return new ResponseEntity<>(json.toString(), responseHeaders, HttpStatus.OK);
	}

}
