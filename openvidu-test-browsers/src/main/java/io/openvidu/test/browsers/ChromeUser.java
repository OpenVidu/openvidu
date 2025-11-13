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

package io.openvidu.test.browsers;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.openqa.selenium.Capabilities;
import org.openqa.selenium.NoSuchSessionException;
import org.openqa.selenium.UnexpectedAlertBehaviour;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebDriverException;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.chromium.HasCdp;
import org.openqa.selenium.remote.Augmenter;
import org.openqa.selenium.remote.RemoteWebDriver;

public class ChromeUser extends BrowserUser {

	private Long chromeDriverPid;

	public ChromeUser(String userName, int timeOfWaitInSeconds, boolean headless) {
		this(userName, timeOfWaitInSeconds, generateDefaultScreenChromeOptions(), headless);
	}

	public ChromeUser(String userName, int timeOfWaitInSeconds, String screenToCapture) {
		this(userName, timeOfWaitInSeconds,
				generateCustomScreenChromeOptions(screenToCapture, Paths.get("/opt/openvidu/fakeaudio.wav")), false);
	}

	public ChromeUser(String userName, int timeOfWaitInSeconds, Path fakeVideoLocation) {
		this(userName, timeOfWaitInSeconds, generateFakeVideoAudioChromeOptions(fakeVideoLocation, null), true);
	}

	public ChromeUser(String userName, int timeOfWaitInSeconds, Path fakeVideoLocation, boolean headless) {
		this(userName, timeOfWaitInSeconds, generateFakeVideoAudioChromeOptions(fakeVideoLocation, null), headless);
	}

	public ChromeUser(String userName, int timeOfWaitInSeconds, Path fakeVideoLocation, Path fakeAudioLocation) {
		this(userName, timeOfWaitInSeconds, generateFakeVideoAudioChromeOptions(fakeVideoLocation, fakeAudioLocation),
				true);
	}

	public ChromeUser(String userName, int timeOfWaitInSeconds, Path fakeVideoLocation, Path fakeAudioLocation,
			boolean headless) {
		this(userName, timeOfWaitInSeconds, generateFakeVideoAudioChromeOptions(fakeVideoLocation, fakeAudioLocation),
				headless);
	}

	private ChromeUser(String userName, int timeOfWaitInSeconds, ChromeOptions options, boolean headless) {
		super(userName, timeOfWaitInSeconds);

		String REMOTE_URL = System.getProperty("REMOTE_URL_CHROME");

		options.setAcceptInsecureCerts(true);
		options.setUnhandledPromptBehaviour(UnexpectedAlertBehaviour.IGNORE);

		if (REMOTE_URL != null && headless) {
			options.addArguments("--headless=new");
		}

		options.addArguments("--disable-infobars");
		options.addArguments("--remote-allow-origins=*");
		options.setExperimentalOption("excludeSwitches", new String[] { "enable-automation" });

		Map<String, Object> prefs = new HashMap<String, Object>();
		prefs.put("profile.default_content_setting_values.media_stream_mic", 1);
		prefs.put("profile.default_content_setting_values.media_stream_camera", 1);
		options.setExperimentalOption("prefs", prefs);

		if (REMOTE_URL != null) {
			log.info("Using URL {} to connect to remote web driver", REMOTE_URL);
			try {
				URL remoteUrl = URI.create(REMOTE_URL).toURL();
				this.driver = new RemoteWebDriver(remoteUrl, options);
			} catch (IllegalArgumentException | MalformedURLException e) {
				throw new IllegalArgumentException("Invalid REMOTE_URL_CHROME value: " + REMOTE_URL, e);
			}
		} else {
			log.info("Using local web driver");
			ChromeDriver chromeDriver = new ChromeDriver(options);
			this.driver = chromeDriver;
			this.chromeDriverPid = getChromeDriverPid(chromeDriver);
		}

		this.driver.manage().timeouts().scriptTimeout(Duration.ofSeconds(timeOfWaitInSeconds));
		super.configureDriver(new org.openqa.selenium.Dimension(1920, 1080));
	}

	private static ChromeOptions generateDefaultScreenChromeOptions() {
		ChromeOptions options = new ChromeOptions();
		// This flag avoids to grant the user media
		options.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video
		options.addArguments("--use-fake-device-for-media-stream");
		// This flag selects the entire screen as video source when screen sharing
		options.addArguments("--auto-select-desktop-capture-source=Entire screen");
		return options;
	}

	private static ChromeOptions generateCustomScreenChromeOptions(String screenToCapture, Path audioFileLocation) {
		ChromeOptions options = new ChromeOptions();
		// This flag selects the entire screen as video source when screen sharing
		options.addArguments("--auto-select-desktop-capture-source=" + screenToCapture);
		options.addArguments("--use-fake-device-for-media-stream");
		options.addArguments("--use-file-for-fake-audio-capture=" + audioFileLocation.toString());

		return options;
	}

	private static ChromeOptions generateFakeVideoAudioChromeOptions(Path videoFileLocation, Path audioFileLocation) {
		ChromeOptions options = new ChromeOptions();
		// This flag avoids to grant the user media
		options.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video
		options.addArguments("--use-fake-device-for-media-stream");
		if (videoFileLocation != null) {
			options.addArguments("--use-file-for-fake-video-capture=" + videoFileLocation.toString());
		}
		if (audioFileLocation != null) {
			options.addArguments("--use-file-for-fake-audio-capture=" + audioFileLocation.toString());
		}
		return options;
	}

	/**
	 * Simulates an abrupt Chrome crash by forcefully killing the browser process.
	 * Works for both local and remote WebDriver instances.
	 * 
	 * @throws IOException if process killing fails
	 */
	public void simulateCrash() throws IOException {
		String REMOTE_URL = System.getProperty("REMOTE_URL_CHROME");
		if (REMOTE_URL != null) {
			// Remote WebDriver: Use Chrome DevTools Protocol to crash the browser
			simulateRemoteCrash();
		} else {
			// Local WebDriver: Kill the Chrome process directly
			simulateLocalCrash();
		}
		log.info("Simulated Chrome crash for user {}", this.clientData);
	}

	/**
	 * Simulates crash for local Chrome instance by killing the process
	 */
	private void simulateLocalCrash() throws IOException {
		ProcessHandle.of(chromeDriverPid).ifPresent(ph -> {
			// Kill all descendant processes (the actual Chrome browser processes)
			ph.descendants().forEach(child -> child.destroyForcibly());
		});
	}

	/**
	 * Simulates crash for remote Chrome instance using CDP
	 */
	private void simulateRemoteCrash() {
		ExecutorService executor = Executors.newSingleThreadExecutor();
		try {
			CompletableFuture<Void> cf = CompletableFuture.runAsync(() -> {
				try {
					Map<String, Object> params = Collections.emptyMap();
					HasCdp cdp = (driver instanceof HasCdp)
							? (HasCdp) driver
							: (HasCdp) new Augmenter().augment(driver);
					cdp.executeCdpCommand("Browser.crash", params);
				} catch (Exception ignored) {
					// Expected if browser crashes while executing the command
				}
			}, executor);

			try {
				cf.get(2, TimeUnit.SECONDS);
				log.info("Browser crash command executed (response received)");
			} catch (TimeoutException te) {
				log.info("Browser crash command sent (no response as expected)");
			} catch (InterruptedException ie) {
				Thread.currentThread().interrupt();
				log.warn("Interrupted while sending crash command", ie);
			} catch (ExecutionException ee) {
				log.info("Browser crashed (execution failure)", ee.getCause());
			}
		} catch (Exception e) {
			log.warn(
					"CDP crash command failed, attempting alternative method by directly killing \"selenium/standalone-chrome\" docker container",
					e);
			try {
				Runtime.getRuntime().exec(new String[] { "sh", "-c",
						"docker ps | grep selenium/standalone-chrome | awk '{print $1}' | xargs -I {} docker kill {}" });
			} catch (IOException ex) {
				log.error("Failed to kill remote Chrome process", ex);
			}
		} finally {
			executor.shutdownNow();
		}
	}

	/**
	 * Extracts Chrome driver process PID from ChromeDriver
	 */
	private Long getChromeDriverPid(ChromeDriver driver) {
		try {
			Capabilities caps = driver.getCapabilities();
			Object debuggerAddress = caps.getCapability("goog:chromeOptions");

			if (debuggerAddress instanceof Map) {
				@SuppressWarnings("unchecked")
				Map<String, Object> options = (Map<String, Object>) debuggerAddress;
				Object addr = options.get("debuggerAddress");
				if (addr != null) {
					// Parse port from debugger address (e.g., "localhost:12345")
					String[] parts = addr.toString().split(":");
					if (parts.length == 2) {
						int port = Integer.parseInt(parts[1]);
						return findPidByPort(port);
					}
				}
			}

			// Fallback: Find Chrome process by command line
			return findChromePidByCommandLine();
		} catch (Exception e) {
			log.warn("Failed to get Chrome PID from driver", e);
			return null;
		}
	}

	/**
	 * Finds Chrome PID by the port it's listening on
	 */
	private Long findPidByPort(int port) {
		try {
			String os = System.getProperty("os.name").toLowerCase();
			Process process;

			if (os.contains("win")) {
				process = Runtime.getRuntime().exec(new String[] { "netstat", "-ano" });
			} else {
				process = Runtime.getRuntime().exec(new String[] { "sh", "-c", "lsof -ti:" + port + " | head -n 1" });
			}

			BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
			String line;

			if (os.contains("win")) {
				while ((line = reader.readLine()) != null) {
					if (line.contains(":" + port + " ")) {
						String[] parts = line.trim().split("\\s+");
						return Long.parseLong(parts[parts.length - 1]);
					}
				}
			} else {
				line = reader.readLine();
				if (line != null && !line.isEmpty()) {
					return Long.parseLong(line.trim());
				}
			}
		} catch (Exception e) {
			log.warn("Failed to find PID by port", e);
		}
		return null;
	}

	/**
	 * Finds Chrome PID by searching for chrome process
	 */
	private Long findChromePidByCommandLine() {
		try {
			String os = System.getProperty("os.name").toLowerCase();
			Process process;

			if (os.contains("win")) {
				process = Runtime.getRuntime()
						.exec(new String[] { "sh", "-c",
								"wmic process where \"name='chrome.exe'\" get ProcessId,CommandLine" });
			} else if (os.contains("mac")) {
				process = Runtime.getRuntime().exec(new String[] { "sh", "-c",
						"ps aux | grep -i chrome | grep -v grep | awk '{print $2}' | head -n 1" });
			} else {
				process = Runtime.getRuntime().exec(new String[] { "sh", "-c",
						"pgrep -f chrome | head -n 1" });
			}

			BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
			String line;

			if (os.contains("win")) {
				reader.readLine(); // Skip header
				line = reader.readLine();
				if (line != null) {
					String[] parts = line.trim().split("\\s+");
					return Long.parseLong(parts[parts.length - 1]);
				}
			} else {
				line = reader.readLine();
				if (line != null && !line.isEmpty()) {
					return Long.parseLong(line.trim());
				}
			}
		} catch (Exception e) {
			log.warn("Failed to find Chrome PID by command line", e);
		}
		return null;
	}

}