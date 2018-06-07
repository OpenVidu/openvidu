package io.openvidu.server.coturn;

import java.util.concurrent.locks.ReentrantLock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import io.openvidu.server.config.OpenviduConfig;

@Service
public abstract class CoturnCredentialsService {

	protected static final Logger log = LoggerFactory.getLogger(CoturnCredentialsService.class);

	protected OpenviduConfig openviduConfig;

	protected String coturnDatabaseLocation;
	
	protected boolean coturnAvailable = true;
	
	protected ReentrantLock lock = new ReentrantLock();

	public CoturnCredentialsService(OpenviduConfig openviduConfig) {
		this.openviduConfig = openviduConfig;
	}

	public abstract TurnCredentials createUser();

	public abstract boolean deleteUser(String user);
	
	public boolean isCoturnAvailable() {
		return this.coturnAvailable;
	}

}
