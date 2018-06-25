package io.openvidu.server.coturn;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicLong;

import org.apache.commons.lang3.RandomStringUtils;

import io.openvidu.server.CommandExecutor;
import io.openvidu.server.config.OpenviduConfig;

public class BashCoturnCredentialsService extends CoturnCredentialsService {

	private String logPath;
	private AtomicLong logCounter = new AtomicLong(0);
	private final long LOG_LIMIT = 30;

	public BashCoturnCredentialsService(OpenviduConfig openviduConfig) {
		super(openviduConfig);
		try {
			String response = CommandExecutor.execCommand("/bin/sh", "-c",
					"turnadmin -l -N " + this.coturnDatabaseString);
			if (response.contains("turnadmin: not found")) {
				// No coturn installed in the host machine
				log.warn("No COTURN server is installed in the host machine. Response: " + response);
				log.warn("No COTURN server will be automatically configured for clients");
				this.coturnAvailable = false;
			} else if (response.contains("Cannot initialize Redis DB connection")) {
				log.warn("Redis DB is not accesible with connection string " + this.coturnDatabaseString);
				log.warn("No COTURN server will be automatically configured for clients");
				this.coturnAvailable = false;
			} else {
				log.info("COTURN Redis DB accessible with string " + this.coturnDatabaseString);
				log.info("Cleaning COTURN DB...");
				if (response.contains("log file opened")) {
					String[] logArray = response.split("\\r?\\n")[0].split("\\s+");
					String logFile = logArray[logArray.length - 1];
					this.logPath = logFile.substring(0, logFile.lastIndexOf('/') + 1);
					log.info("Path of COTURN log files: " + this.logPath);
				}
				response = CommandExecutor.execCommand("/bin/sh", "-c",
						"redis-cli -n " + this.openviduConfig.getCoturnDatabaseDbname() + " flushdb");
				String response2 = CommandExecutor.execCommand("/bin/sh", "-c",
						"redis-cli -n " + this.openviduConfig.getCoturnDatabaseDbname() + " --scan --pattern '*'");
				if ("OK".equals(response) && response2.isEmpty()) {
					log.info("COTURN DB is now empty");
				} else {
					log.error("COTURN DB is not empty");
				}
			}
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}
		log.info("Using COTURN credentials service for BASH environment");
	}

	@Override
	public TurnCredentials createUser() {
		TurnCredentials credentials = null;
		log.info("Creating COTURN user");
		String user = RandomStringUtils.randomAlphanumeric(6).toUpperCase();
		String pass = RandomStringUtils.randomAlphanumeric(6).toLowerCase();
		String command = "turnadmin -a -u " + user + " -r openvidu -p " + pass + " -N " + this.coturnDatabaseString;
		try {
			String response = CommandExecutor.execCommand("/bin/sh", "-c", command);
			if (response.contains("connection success: " + this.trimmedCoturnDatabaseString)) {
				credentials = new TurnCredentials(user, pass);
				this.cleanTurnLogFiles();
				log.info("COTURN user created: true");
			} else {
				log.info("COTURN user created: false");
			}
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}
		return credentials;
	}

	@Override
	public boolean deleteUser(String user) {
		boolean userRemoved = false;

		log.info("Deleting COTURN user");
		String command = "turnadmin -d -u " + user + " -r openvidu -N " + this.coturnDatabaseString;
		String response = "";
		try {
			response = CommandExecutor.execCommand("/bin/sh", "-c", command);
			this.cleanTurnLogFiles();
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}
		userRemoved = response.contains("connection success: " + this.trimmedCoturnDatabaseString);
		log.info("COTURN user deleted: " + userRemoved);
		return userRemoved;
	}

	private void cleanTurnLogFiles() throws IOException, InterruptedException {
		if (this.logCounter.incrementAndGet() > LOG_LIMIT) {
			CommandExecutor.execCommand("/bin/sh", "-c", "rm " + this.logPath + "turn_*.log");
			log.info("Garbage collector cleaning turn log files at path " + this.logPath);
			this.logCounter.set(0);
		}
	}

}
