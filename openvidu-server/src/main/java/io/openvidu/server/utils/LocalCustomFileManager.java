package io.openvidu.server.utils;

import java.io.File;
import java.util.function.BooleanSupplier;

public class LocalCustomFileManager extends CustomFileManager {

	@Override
	public void waitForFileToExistAndNotEmpty(String mediaNodeId, String absolutePathToFile) throws Exception {
		waitForFileToExistAndNotEmpty(mediaNodeId, absolutePathToFile, () -> true);
	}

	@Override
	public void waitForFileToExistAndNotEmpty(String mediaNodeId, String absolutePathToFile,
			BooleanSupplier shouldContinueWaiting) throws Exception {

		// Check 10 times per seconds
		int MAX_SECONDS_WAIT = this.maxSecondsWaitForFile();
		int MILLISECONDS_INTERVAL_WAIT = 100;
		int LIMIT = MAX_SECONDS_WAIT * 1000 / MILLISECONDS_INTERVAL_WAIT;
		int i = 0;

		boolean arePresent = fileExistsAndHasBytes(absolutePathToFile);
		while (!arePresent && i < LIMIT && shouldContinueWaiting.getAsBoolean()) {
			try {
				Thread.sleep(MILLISECONDS_INTERVAL_WAIT);
				arePresent = fileExistsAndHasBytes(absolutePathToFile);
				i++;
			} catch (InterruptedException e) {
				throw new Exception("Interrupted exception while waiting for file " + absolutePathToFile + " to exist");
			}
		}
		if (!shouldContinueWaiting.getAsBoolean()) {
			throw new Exception("Recording was stopped while waiting for file " + absolutePathToFile);
		}
		if (!arePresent) {
			throw new Exception("File " + absolutePathToFile + " does not exist and hasn't been created in "
					+ MAX_SECONDS_WAIT + " seconds");
		}
	}

	private boolean fileExistsAndHasBytes(String fileName) {
		File f = new File(fileName);
		return (f.exists() && f.isFile() && f.length() > 0);
	}

	public int maxSecondsWaitForFile() {
		return 30;
	}

}
