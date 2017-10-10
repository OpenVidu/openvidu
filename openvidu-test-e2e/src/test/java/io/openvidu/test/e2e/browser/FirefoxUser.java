/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
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

import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxProfile;
import org.openqa.selenium.remote.DesiredCapabilities;

public class FirefoxUser extends BrowserUser {

	public FirefoxUser(String userName, int timeOfWaitInSeconds) {
		super(userName, timeOfWaitInSeconds);
		
		System.setProperty("webdriver.gecko.driver", "/home/geckodriver");

		DesiredCapabilities capabilities = new DesiredCapabilities();
		capabilities.setCapability("acceptInsecureCerts", true);
		FirefoxProfile profile = new FirefoxProfile();

		// This flag avoids granting the access to the camera
		profile.setPreference("media.navigator.permission.disabled", true);
		// This flag force to use fake user media (synthetic video of multiple
		// color)
		profile.setPreference("media.navigator.streams.fake", true);

		capabilities.setCapability(FirefoxDriver.PROFILE, profile);

		this.driver = new FirefoxDriver(capabilities);
		
		this.configureDriver();
	}

}