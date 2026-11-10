package io.openvidu.test.browsers;

import java.net.URL;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;

/**
 * A native Android app driven through an Appium server (UiAutomator2 driver).
 * The app must already be installed on the device: the options name the app
 * package and activity to launch. It is a {@link BrowserUser} so that the tests
 * dispose of it like any browser, ending the Appium session.
 */
public class AndroidAppUser extends BrowserUser {

	public AndroidAppUser(String userName, int timeOfWaitInSeconds, URL appiumUrl, UiAutomator2Options options) {
		super(userName, timeOfWaitInSeconds);
		waitForRemoteWebDriverReady(appiumUrl, "Android");
		this.driver = new AndroidDriver(appiumUrl, options);
		this.logRemoteSessionCreated("Android");
		// Not configureDriver(): page load timeouts do not exist for native apps
		this.newWaiter(timeOfWaitInSeconds);
	}

	public AndroidDriver getAndroidDriver() {
		return (AndroidDriver) this.driver;
	}

}
