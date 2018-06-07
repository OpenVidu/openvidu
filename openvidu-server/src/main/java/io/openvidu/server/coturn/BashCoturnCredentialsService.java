package io.openvidu.server.coturn;

import java.io.File;
import java.io.IOException;

import org.apache.commons.lang3.RandomStringUtils;

import io.openvidu.server.CommandExecutor;
import io.openvidu.server.config.OpenviduConfig;

public class BashCoturnCredentialsService extends CoturnCredentialsService {

	public BashCoturnCredentialsService(OpenviduConfig openviduConfig) {
		super(openviduConfig);
		File f = new File(this.openviduConfig.getCoturnSqlite());
		if (f.exists()) {
			f.delete();
		}
		this.coturnDatabaseLocation = this.openviduConfig.getCoturnSqlite();
		try {
			String response = CommandExecutor.execCommand("/bin/sh", "-c", "turnadmin -l -b " + this.coturnDatabaseLocation);
			if (response.contains("turnadmin: not found")) {
				// No coturn installed in the host machine
				log.warn("No COTURN server is installed in the host machine");
				this.coturnAvailable = false;
			}
			log.info("COTURN sqlite database location: " + this.openviduConfig.getCoturnSqlite());
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}
		log.info("Using COTURN credentials service for BASH environment");
	}

	@Override
	public TurnCredentials createUser() {
		TurnCredentials credentials = null;
		log.info("Creating COTURN user");
		String user = RandomStringUtils.randomAlphanumeric(8).toUpperCase();
		String pass = RandomStringUtils.randomAlphanumeric(8).toLowerCase();
		String command = "turnadmin -a -b " + this.coturnDatabaseLocation + " -u " + user + " -r openvidu -p " + pass;
		String users = "";
		lock.lock();
		try {
			CommandExecutor.execCommand("/bin/sh", "-c", command);
			users = CommandExecutor.execCommand("/bin/sh", "-c", "turnadmin -l -b " + this.coturnDatabaseLocation);
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		} finally {
			lock.unlock();
			if (users.contains(user + "[openvidu]")) {
				credentials = new TurnCredentials(user, pass);
				log.info("COTURN user created: true");
			} else {
				log.info("COTURN user created: false");
			}
		}
		return credentials;
	}

	@Override
	public boolean deleteUser(String user) {
		boolean userRemoved = false;

		log.info("Deleting COTURN user");
		String command = "turnadmin -d -b " + this.coturnDatabaseLocation + " -u " + user + " -r openvidu";
		String users = "";
		lock.lock();
		try {
			CommandExecutor.execCommand("/bin/sh", "-c", command);
			users = CommandExecutor.execCommand("/bin/sh", "-c", "turnadmin -l -b " + this.coturnDatabaseLocation);
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		} finally {
			lock.unlock();
		}
		userRemoved = !users.contains(user + "[openvidu]");
		log.info("COTURN user deleted: " + userRemoved);
		return userRemoved;
	}

}
