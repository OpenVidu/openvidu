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

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class CommandExecutor {

	private static final Logger log = LoggerFactory.getLogger(CommandExecutor.class);

	public static String execCommand(long msTimeout, String... command) throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command);
		processBuilder.redirectErrorStream(true);
		return commonExecCommand(msTimeout, processBuilder, true).get(0);
	}

	public static List<String> execCommandReturnList(long msTimeout, String... command)
			throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command);
		processBuilder.redirectErrorStream(true);
		return commonExecCommand(msTimeout, processBuilder, false);
	}

	public static String execCommandRedirectError(long msTimeout, File errorOutputFile, String... command)
			throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command).redirectError(errorOutputFile);
		return commonExecCommand(msTimeout, processBuilder, true).get(0);
	}

	public static void execCommandRedirectStandardOutputAndError(long msTimeout, File standardOutputFile,
			File errorOutputFile, String... command) throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command).redirectOutput(standardOutputFile)
				.redirectError(errorOutputFile);
		Process process = processBuilder.start();
		if (!process.waitFor(msTimeout, TimeUnit.MILLISECONDS)) {
			log.error("Command {} did not receive a response in {} ms", Arrays.toString(command), msTimeout);
			String errorMsg = "Current process status of host:\n" + gatherLinuxHostInformation();
			log.error(errorMsg);
			throw new IOException(errorMsg);
		}
	}

	private static List<String> commonExecCommand(long msTimeout, ProcessBuilder processBuilder, boolean singleString)
			throws IOException, InterruptedException {
		Process process = processBuilder.start();
		StringBuilder processOutput = new StringBuilder();
		List<String> outputList = new ArrayList<>();
		InputStreamReader inputStreamReader = null;
		BufferedReader processOutputReader = null;
		try {
			inputStreamReader = new InputStreamReader(process.getInputStream());
			processOutputReader = new BufferedReader(inputStreamReader);
			String readLine;
			while ((readLine = processOutputReader.readLine()) != null) {
				if (singleString) {
					processOutput.append(readLine + System.lineSeparator());
				} else {
					outputList.add(readLine);
				}
			}
			if (singleString) {
				outputList = Arrays.asList(processOutput.toString().trim());
			}
			if (!process.waitFor(msTimeout, TimeUnit.MILLISECONDS)) {
				log.error("Command {} did not receive a response in {} ms",
						Arrays.toString(processBuilder.command().toArray()), msTimeout);
				String errorMsg = "Current process status of host:\n" + gatherLinuxHostInformation();
				log.error(errorMsg);
				throw new IOException(errorMsg);
			}
		} finally {
			if (inputStreamReader != null) {
				inputStreamReader.close();
			}
			if (processOutputReader != null) {
				processOutputReader.close();
			}
		}
		return outputList;
	}

	public static String gatherLinuxHostInformation() throws IOException, InterruptedException {
		final String psCommand = "ps -eo pid,ppid,user,%mem,%cpu,cmd --sort=-%cpu";
		return execCommand(5000, "/bin/sh", "-c", psCommand);
	}

}
