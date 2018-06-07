package io.openvidu.server.coturn;

import io.openvidu.server.config.OpenviduConfig;

public class CoturnCredentialsServiceFactory {

	OpenviduConfig openviduConfig;

	public CoturnCredentialsServiceFactory(OpenviduConfig openviduConfig) {
		this.openviduConfig = openviduConfig;
	}

	public CoturnCredentialsService getCoturnCredentialsService() {
		if (!"docker".equals(openviduConfig.getSpringProfile())) {
			return new BashCoturnCredentialsService(this.openviduConfig);
		} else {
			// TODO: return other options
			return new BashCoturnCredentialsService(this.openviduConfig);
		}
	}

}
