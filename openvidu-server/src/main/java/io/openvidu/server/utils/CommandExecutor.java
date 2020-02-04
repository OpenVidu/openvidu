/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

/**
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class CommandExecutor {

	public static String execCommand(String... command) throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command);
		processBuilder.redirectErrorStream(true);
		return commonExecCommand(processBuilder);
	}

	public static String execCommandRedirectError(File errorOutputFile, String... command)
			throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command).redirectError(errorOutputFile);
		return commonExecCommand(processBuilder);
	}

	public static void execCommandRedirectStandardOutputAndError(File standardOutputFile, File errorOutputFile,
			String... command) throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command).redirectOutput(standardOutputFile)
				.redirectError(errorOutputFile);
		Process process = processBuilder.start();
		process.waitFor();
	}

	private static String commonExecCommand(ProcessBuilder processBuilder) throws IOException, InterruptedException {
		Process process = processBuilder.start();
		StringBuilder processOutput = new StringBuilder();
		String output;
		InputStreamReader inputStreamReader = null;
		BufferedReader processOutputReader = null;
		try {
			inputStreamReader = new InputStreamReader(process.getInputStream());
			processOutputReader = new BufferedReader(inputStreamReader);
			String readLine;
			while ((readLine = processOutputReader.readLine()) != null) {
				processOutput.append(readLine + System.lineSeparator());
			}
			process.waitFor();
			output = processOutput.toString().trim();
		} finally {
			if (inputStreamReader != null) {
				inputStreamReader.close();
			}
			if (processOutputReader != null) {
				processOutputReader.close();
			}
		}
		return output;
	}

}
