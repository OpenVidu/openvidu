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

package io.openvidu.test.e2e.utils;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Unzipper {

	private static final Logger log = LoggerFactory.getLogger(Unzipper.class);

	public List<File> unzipFile(String path, String fileName) {
		final int BUFFER = 2048;
		final List<File> recordingFiles = new ArrayList<>();
		try {
			BufferedOutputStream dest = null;
			FileInputStream fis = new FileInputStream(path + fileName);
			ZipInputStream zis = new ZipInputStream(new BufferedInputStream(fis));
			ZipEntry entry;
			while ((entry = zis.getNextEntry()) != null) {
				log.info("Extracting: " + entry);
				if (entry.getName().endsWith(".webm")) {
					recordingFiles.add(new File(path + entry.getName()));
				}
				int count;
				byte data[] = new byte[BUFFER];
				FileOutputStream fos = new FileOutputStream(path + entry.getName());
				dest = new BufferedOutputStream(fos, BUFFER);
				while ((count = zis.read(data, 0, BUFFER)) != -1) {
					dest.write(data, 0, count);
				}
				dest.flush();
				dest.close();
			}
			zis.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
		return recordingFiles;
	}

}
