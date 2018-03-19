package io.openvidu.server.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenviduConfig {

	@Value("${openvidu.publicurl}")
	private String openviduPublicUrl; // local, docker-local, ngrok, docker, [FINAL_URL]

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

	@Value("${openvidu.recording.free-access}")
	boolean openviduRecordingFreeAccess;

	@Value("${openvidu.recording.version}")
	String openviduRecordingVersion;

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

	public boolean getOpenViduRecordingFreeAccess() {
		return this.openviduRecordingFreeAccess;
	}

	public void setOpenViduRecordingPath(String recordingPath) {
		this.openviduRecordingPath = recordingPath;
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

}
