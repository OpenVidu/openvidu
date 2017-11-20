package io.openvidu.server;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class CommandExecutor {

	public static String execCommand(String... command) throws IOException, InterruptedException {

		ProcessBuilder processBuilder = new ProcessBuilder(command);

		processBuilder.redirectErrorStream(true);

		Process process = processBuilder.start();
		StringBuilder processOutput = new StringBuilder();

		try (BufferedReader processOutputReader = new BufferedReader(
				new InputStreamReader(process.getInputStream()));) {
			String readLine;

			while ((readLine = processOutputReader.readLine()) != null) {
				processOutput.append(readLine + System.lineSeparator());
			}

			process.waitFor();
		}

		return processOutput.toString().trim();
	}
	
	public static void main(String[] args) throws IOException, InterruptedException {
		System.out.println(execCommand("/bin/sh","-c","hostname -i | awk '{print $1}'"));
	}

}
