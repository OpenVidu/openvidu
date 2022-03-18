/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.server.utils;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.Properties;

import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public abstract class CustomFileManager {

	private static final Logger log = LoggerFactory.getLogger(CustomFileManager.class);

	public boolean createAndWriteFile(String filePath, String text) {
		try {
			this.writeAndCloseOnOutputStreamWriter(new FileOutputStream(filePath), text);
			return true;
		} catch (IOException e) {
			log.error("Couldn't create file {}. Error: {}", filePath, e.getMessage());
			return false;
		}
	}

	public boolean createAndWriteFileWithFolders(String filePath, String text) {
		File f = new File(filePath);
		if (!f.exists()) {
			// This doesn't fail if no permissions
			f.getParentFile().mkdirs();
		}
		return this.createAndWriteFile(filePath, text);
	}

	public boolean overwriteFile(String filePath, String text) {
		try {
			this.writeAndCloseOnOutputStreamWriter(new FileOutputStream(filePath, false), text);
			return true;
		} catch (IOException e) {
			log.error("Couldn't overwrite file {}. Error: {}", filePath, e.getMessage());
			return false;
		}
	}

	public void moveFile(String filePath, String newFilePath, boolean deleteFoldersWhileEmpty) {
		try {
			FileUtils.moveFile(FileUtils.getFile(filePath), FileUtils.getFile(newFilePath));
		} catch (IOException e) {
			log.error("Error moving file '{}' to new path '{}': {}", filePath, newFilePath, e.getMessage());
		}
		if (deleteFoldersWhileEmpty) {
			boolean keepDeleting = true;
			File folder = new File(filePath).getParentFile();
			while (keepDeleting) {
				if (folder.exists() && folder.isDirectory() && folder.listFiles().length == 0) {
					folder.delete();
					folder = folder.getParentFile();
				} else {
					keepDeleting = false;
				}
			}
		}
	}

	public boolean createFolderIfNotExists(String path) {
		File folder = new File(path);
		if (!folder.exists()) {
			return folder.mkdir();
		} else {
			return false;
		}
	}

	public void deleteFolder(String path) throws IOException {
		FileUtils.deleteDirectory(new File(path));
	}

	public void deleteFile(String path) throws IOException {
		new File(path).delete();
	}

	public void overwriteProperties(Properties props, String filePath) throws FileNotFoundException, IOException {
		FileOutputStream output = null;
		try {
			output = new FileOutputStream(filePath, false);
			props.store(output, "");
		} finally {
			if (output != null) {
				output.close();
			}
		}
	}

	private void writeAndCloseOnOutputStreamWriter(FileOutputStream fos, String text) throws IOException {
		OutputStreamWriter osw = null;
		try {
			osw = new OutputStreamWriter(fos);
			osw.write(text);
		} finally {
			osw.close();
			fos.close();
		}
	}

	public abstract void waitForFileToExistAndNotEmpty(String mediaNodeId, String absolutePathToFile) throws Exception;

	public abstract int maxSecondsWaitForFile();

}
