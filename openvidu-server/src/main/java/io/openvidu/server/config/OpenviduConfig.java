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

package io.openvidu.server.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.openvidu.server.core.ParticipantRole;

@Component
public class OpenviduConfig {

	@Value("${openvidu.publicurl}")
	private String openviduPublicUrl; // local, ngrok, docker, [FINAL_URL]

	@Value("${server.port}")
	private String serverPort;

	@Value("${openvidu.secret}")
	private String openviduSecret;

	@Value("${openvidu.cdr}")
	private boolean openviduCdr;

	@Value("${openvidu.recording}")
	private boolean openviduRecording;

	@Value("${openvidu.recording.path}")
	private String openviduRecordingPath;

	@Value("${openvidu.recording.public-access}")
	boolean openviduRecordingPublicAccess;

	@Value("${openvidu.recording.notification}")
	String openviduRecordingNotification;

	@Value("${openvidu.recording.custom-layout}")
	String openviduRecordingCustomLayout;

	@Value("${openvidu.recording.version}")
	String openviduRecordingVersion;

	@Value("#{'${spring.profiles.active:}'.length() > 0 ? '${spring.profiles.active:}'.split(',') : \"default\"}")
	private String springProfile;

	@Value("${coturn.redis.ip}")
	private String coturnRedisIp;

	@Value("${coturn.redis.dbname}")
	private String coturnRedisDbname;

	@Value("${coturn.redis.password}")
	private String coturnRedisPassword;

	@Value("${coturn.redis.connect-timeout}")
	private String coturnRedisConnectTimeout;

	private String finalUrl;

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

	public String getFinalUrl() {
		return finalUrl;
	}

	public void setFinalUrl(String finalUrl) {
		this.finalUrl = finalUrl.endsWith("/") ? (finalUrl) : (finalUrl + "/");
	}

	public String getOpenViduRecordingVersion() {
		return this.openviduRecordingVersion;
	}

	public String getSpringProfile() {
		return springProfile;
	}

	public String getCoturnDatabaseString() {
		return "\"ip=" + this.coturnRedisIp + " dbname=" + this.coturnRedisDbname + " password="
				+ this.coturnRedisPassword + " connect_timeout=" + this.coturnRedisConnectTimeout + "\"";
	}
	
	public String getCoturnDatabaseDbname() {
		return this.coturnRedisDbname;
	}

	public ParticipantRole[] getRolesFromRecordingNotification() {
		ParticipantRole[] roles;
		switch (this.openviduRecordingNotification) {
		case "none":
			roles = new ParticipantRole[0];
			break;
		case "publisher_moderator":
			roles = new ParticipantRole[] { ParticipantRole.PUBLISHER, ParticipantRole.MODERATOR };
			break;
		case "all":
			roles = new ParticipantRole[] { ParticipantRole.SUBSCRIBER, ParticipantRole.PUBLISHER,
					ParticipantRole.MODERATOR };
			break;
		default:
			roles = new ParticipantRole[] { ParticipantRole.PUBLISHER, ParticipantRole.MODERATOR };
		}
		return roles;
	}

}
