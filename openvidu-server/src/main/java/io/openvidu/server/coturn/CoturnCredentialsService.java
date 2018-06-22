package io.openvidu.server.coturn;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import io.openvidu.server.config.OpenviduConfig;

@Service
public abstract class CoturnCredentialsService {

	protected static final Logger log = LoggerFactory.getLogger(CoturnCredentialsService.class);

	protected OpenviduConfig openviduConfig;

	protected String coturnDatabaseString;
	protected String trimmedCoturnDatabaseString;
	
	protected boolean coturnAvailable = true;
	
	public CoturnCredentialsService(OpenviduConfig openviduConfig) {
		this.openviduConfig = openviduConfig;
		this.coturnDatabaseString = this.openviduConfig.getCoturnDatabaseString();
		this.trimmedCoturnDatabaseString = this.coturnDatabaseString.replaceAll("^\"|\"$", "");
	}

	public abstract TurnCredentials createUser();

	public abstract boolean deleteUser(String user);
	
	public boolean isCoturnAvailable() {
		return this.coturnAvailable;
	}

}
