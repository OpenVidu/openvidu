package io.openvidu.server.coturn;

import io.openvidu.server.config.OpenviduConfig;

public class DockerCoturnCredentialsService extends CoturnCredentialsService {

	public DockerCoturnCredentialsService(OpenviduConfig openviduConfig) {
		super(openviduConfig);
		// TODO Auto-generated constructor stub
	}

	@Override
	public TurnCredentials createUser() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public boolean deleteUser(String user) {
		// TODO Auto-generated method stub
		return false;
	}

}
