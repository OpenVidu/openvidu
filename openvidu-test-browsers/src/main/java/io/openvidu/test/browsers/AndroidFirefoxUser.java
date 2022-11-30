package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

import org.openqa.selenium.UnexpectedAlertBehaviour;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.firefox.FirefoxProfile;
import org.openqa.selenium.remote.RemoteWebDriver;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.remote.MobileCapabilityType;
import io.appium.java_client.remote.MobilePlatform;

public class AndroidFirefoxUser extends BrowserUser {

	public AndroidFirefoxUser(String userName, int timeOfWaitInSeconds) {
		super(userName, timeOfWaitInSeconds);

		FirefoxOptions options = new FirefoxOptions();
		options.setCapability(MobileCapabilityType.PLATFORM_VERSION, "12.0");
		options.setCapability(MobileCapabilityType.PLATFORM_NAME, MobilePlatform.ANDROID);
		options.setCapability(MobileCapabilityType.AUTOMATION_NAME, "Appium");

		URL url = null;
		try {
			url = new URL("http://172.17.0.1:4723/wd/hub");
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}

		AndroidDriver<?> driver = new AndroidDriver<>(url, options);
		driver.installApp("/opt/openvidu-cache/firefox-91-4-0.apk");
		driver.quit();

		options.setAcceptInsecureCerts(true);
		options.setUnhandledPromptBehaviour(UnexpectedAlertBehaviour.IGNORE);

		FirefoxProfile profile = new FirefoxProfile();
		// This flag avoids granting the access to the camera
		profile.setPreference("media.navigator.permission.disabled", true);
		// This flag force to use fake user media (synthetic video of multiple color)
		profile.setPreference("media.navigator.streams.fake", true);
		// These flags allows controlling Firefox remotely
		profile.setPreference("devtools.debugger.remote-enabled", true);

		options.setCapability(MobileCapabilityType.DEVICE_NAME, "Android device");
		options.setCapability(MobileCapabilityType.BROWSER_NAME, "firefox");
		options.setCapability(MobileCapabilityType.PLATFORM_NAME, "linux");
		options.setCapability(MobileCapabilityType.AUTOMATION_NAME, "Gecko");

		options.setCapability("appium:automationName", "Gecko");
		options.setCapability("marionette", true);
		options.setCapability("appium:marionette", true);
		options.setCapability("androidStorage", "app");
		options.setCapability("appium:androidStorage", "app");

		Map<String, Object> mozFirefoxOptions = new HashMap<>();
		mozFirefoxOptions.put("androidPackage", "org.mozilla.firefox");
		mozFirefoxOptions.put("androidDeviceSerial", "emulator-5554");
		mozFirefoxOptions.put("binary", "/Applications/Firefox.app");
		options.setCapability("moz:firefoxOptions", mozFirefoxOptions);

		long initTime = System.currentTimeMillis();
		try {
			this.driver = new RemoteWebDriver(url, options);
		} catch (Exception e) {
			log.error("{}", e);
		}
		log.info("Remote web driver for Firefox Android initialized after {} ms",
				System.currentTimeMillis() - initTime);

		this.configureDriver();
	}

}
