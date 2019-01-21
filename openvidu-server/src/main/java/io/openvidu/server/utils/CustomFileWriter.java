/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CustomFileWriter {

	private static final Logger log = LoggerFactory.getLogger(CustomFileWriter.class);

	public void createAndWriteFile(String filePath, String text) {
		try {
			this.writeAndCloseOnOutputStreamWriter(new FileOutputStream(filePath), text);
		} catch (IOException e) {
			log.error("Couldn't create file {}. Error: ", filePath, e.getMessage());
		}
	}

	public void overwriteFile(String filePath, String text) {
		try {
			this.writeAndCloseOnOutputStreamWriter(new FileOutputStream(filePath, false), text);
		} catch (IOException e) {
			log.error("Couldn't overwrite file {}. Error: ", filePath, e.getMessage());
		}
	}

	public boolean createFolder(String path) {
		return new File(path).mkdir();
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

}
