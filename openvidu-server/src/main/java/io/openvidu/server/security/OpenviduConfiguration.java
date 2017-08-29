package io.openvidu.server.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenviduConfiguration {

	@Value("${openvidu.publicurl}")
	private String openviduPublicUrl; //local, ngrok, FINAL_URL

	@Value("${server.port}")
	private String serverPort;

	@Value("${openvidu.secret}")
	private String openviduSecret;

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

}
