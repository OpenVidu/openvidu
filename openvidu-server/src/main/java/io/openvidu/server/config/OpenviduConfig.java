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

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.stereotype.Component;

import io.openvidu.java.client.OpenViduRole;

@Component
public class OpenviduConfig {

	@Autowired
	BuildProperties buildProperties;

	@Value("${openvidu.publicurl}")
	private String openviduPublicUrl; // local, docker, [FINAL_URL]

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

}
