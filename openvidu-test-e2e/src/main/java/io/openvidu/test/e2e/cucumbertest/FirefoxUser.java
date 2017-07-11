package io.openvidu.test.e2e.cucumbertest;

import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxProfile;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;

public class FirefoxUser extends BrowserUser {

	public FirefoxUser(String userName, int timeOfWait) {
		super(userName, timeOfWait);

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

		this.configWaiterAndScript();
	}

}
