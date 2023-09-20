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

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

public class CommandLineExecutor {

	/**
	 * WARNING: does not work with subshell. i.e: echo $(VARIABLE)
	 */
	public String executeCommand(String command, int secondsTimeout) {
		return this.executeCommand(command, false, secondsTimeout);
	}

	/**
	 * WARNING: does not work with subshell. i.e: echo $(VARIABLE)
	 */
	public String executeCommand(String command, boolean useBash, int secondsTimeout) {
		String output = "";
		Process p = null;
		try {
			p = Runtime.getRuntime().exec((new String[] { "/bin/" + (useBash ? "bash" : "sh"), "-c", command }));
			if (!p.waitFor(secondsTimeout, TimeUnit.SECONDS)) {
				System.err.println("Command " + command + " did not completed in " + secondsTimeout + " seconds");
				p.destroyForcibly();
				return output;
			}
			BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()));
			String line = "";
			while ((line = br.readLine()) != null) {
				output += line;
			}
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			p.destroy();
		}
		return output;
	}

}
