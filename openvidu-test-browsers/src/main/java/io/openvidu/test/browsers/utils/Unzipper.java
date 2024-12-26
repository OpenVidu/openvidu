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

package io.openvidu.test.browsers.utils;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Set;

import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.common.io.Files;

public class Unzipper {

	private static final Logger log = LoggerFactory.getLogger(Unzipper.class);

	private final Set<String> VIDEO_EXTENSIONS = Set.of("webm", "mkv", "mp4", "ogg");

	public List<File> unzipFile(String path, String fileName) {
		List<File> recordingFiles = new ArrayList<>();
		File zipFile = new File(path, fileName);

		try (ZipFile zip = new ZipFile(zipFile)) {
			Enumeration<ZipArchiveEntry> entries = zip.getEntries();

			while (entries.hasMoreElements()) {
				ZipArchiveEntry entry = entries.nextElement();
				log.info("Extracting: " + entry.getName());

				if (!entry.isDirectory()) {
					String fileExtension = Files.getFileExtension(entry.getName());
					if (VIDEO_EXTENSIONS.contains(fileExtension)) {
						File outputFile = new File(path, entry.getName());
						recordingFiles.add(outputFile);
						new File(outputFile.getParent()).mkdirs();

						try (FileOutputStream fos = new FileOutputStream(outputFile);
								BufferedOutputStream dest = new BufferedOutputStream(fos)) {
							zip.getInputStream(entry).transferTo(dest);
						}
					} else {
						log.info("Skipping non-video file: " + entry.getName());
					}
				}
			}
		} catch (IOException e) {
			log.error("Error extracting ZIP file: " + e.getMessage());
			e.printStackTrace();
		}

		return recordingFiles;
	}

}