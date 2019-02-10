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

package io.openvidu.test.e2e.browser;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.springframework.core.io.ClassPathResource;

public class ChromeUser extends BrowserUser {

	public ChromeUser(String userName, int timeOfWaitInSeconds) {
		this(userName, timeOfWaitInSeconds, "Entire screen");
	}

	public ChromeUser(String userName, int timeOfWaitInSeconds, String screenToCapture) {
		this(userName, timeOfWaitInSeconds, generateScreenChromeOptions(screenToCapture));
	}

	public ChromeUser(String userName, int timeOfWaitInSeconds, Path fakeVideoLocation) {
		this(userName, timeOfWaitInSeconds, generateFakeVideoChromeOptions(fakeVideoLocation));
	}

	private ChromeUser(String userName, int timeOfWaitInSeconds, ChromeOptions options) {
		super(userName, timeOfWaitInSeconds);
		DesiredCapabilities capabilities = DesiredCapabilities.chrome();
		capabilities.setAcceptInsecureCerts(true);

		String REMOTE_URL = System.getProperty("REMOTE_URL_CHROME");
		if (REMOTE_URL != null) {
			log.info("Using URL {} to connect to remote web driver", REMOTE_URL);
			try {
				this.driver = new RemoteWebDriver(new URL(REMOTE_URL), capabilities);
			} catch (MalformedURLException e) {
				e.printStackTrace();
			}
		} else {
			log.info("Using local web driver");
			this.driver = new ChromeDriver(options);
		}

		this.driver.manage().timeouts().setScriptTimeout(this.timeOfWaitInSeconds, TimeUnit.SECONDS);
		this.configureDriver();
	}

	private static ChromeOptions generateScreenChromeOptions(String screenToCapture) {
		ChromeOptions options = new ChromeOptions();
		// This flag avoids to grant the user media
		options.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video
		options.addArguments("--use-fake-device-for-media-stream");
		// This flag selects the entire screen as video source when screen sharing
		options.addArguments("--auto-select-desktop-capture-source=" + screenToCapture);
		try {
			// Add Screen Sharing extension
			options.addExtensions(new ClassPathResource("ScreenCapturing.crx").getFile());
		} catch (IOException e) {
			e.printStackTrace();
		}
		return options;
	}

	private static ChromeOptions generateFakeVideoChromeOptions(Path videoFileLocation) {
		ChromeOptions options = new ChromeOptions();
		// This flag avoids to grant the user media
		options.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video
		options.addArguments("--use-fake-device-for-media-stream");
		// This flag sets the video input as
		options.addArguments("--use-file-for-fake-video-capture=" + videoFileLocation.toString());
		return options;
	}

}