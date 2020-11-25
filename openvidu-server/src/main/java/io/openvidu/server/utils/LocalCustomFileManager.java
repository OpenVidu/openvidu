package io.openvidu.server.utils;

import java.io.File;

public class LocalCustomFileManager extends CustomFileManager {

	@Override
	public void waitForFileToExistAndNotEmpty(String mediaNodeId, String absolutePathToFile, int maxSeconsWait)
			throws Exception {

		// Check 10 times per seconds
		int MILLISECONDS_INTERVAL_WAIT = 100;
		int LIMIT = maxSeconsWait * 1000 / MILLISECONDS_INTERVAL_WAIT;
		int i = 0;

		boolean arePresent = fileExistsAndHasBytes(absolutePathToFile);
		while (!arePresent && i < LIMIT) {
			try {
				Thread.sleep(MILLISECONDS_INTERVAL_WAIT);
				arePresent = fileExistsAndHasBytes(absolutePathToFile);
				i++;
			} catch (InterruptedException e) {
				throw new Exception("Interrupted exception while waiting for file " + absolutePathToFile + " to exist");
			}
		}
		if (!arePresent) {
			throw new Exception("File " + absolutePathToFile + " does not exist and hasn't been created in "
					+ maxSeconsWait + " seconds");
		}
	}

	private boolean fileExistsAndHasBytes(String fileName) {
		File f = new File(fileName);
		return (f.exists() && f.isFile() && f.length() > 0);
	}

}
