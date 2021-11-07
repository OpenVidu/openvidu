package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;

import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

import io.appium.java_client.remote.MobileCapabilityType;
import io.appium.java_client.remote.MobilePlatform;

// docker run --privileged --rm --name android-chrome -p 6080:6080 -p 5554:5554 -p 5555:5555 -p 4723:4723 -e DEVICE="Samsung Galaxy S10" -e APPIUM=true -e APPIUM_HOST=172.17.0.1 -e APPIUM_PORT=4723 -e MOBILE_WEB_TEST=true -e RELAXED_SECURITY=true budtmo/docker-android-x86-12.0
// docker exec android-chrome bash -c "rm chromedriver && wget https://chromedriver.storage.googleapis.com/91.0.4472.101/chromedriver_linux64.zip && unzip chromedriver_linux64.zip && rm chromedriver_linux64.zip"
public class AndroidChromeUser extends BrowserUser {

	public AndroidChromeUser(String userName, int timeOfWaitInSeconds) {
		super(userName, timeOfWaitInSeconds);

		ChromeOptions options = new ChromeOptions();
		options.addArguments("no-first-run", "disable-infobars", "use-fake-ui-for-media-stream",
				"use-fake-device-for-media-stream", "ignore-certificate-errors",
				"autoplay-policy=no-user-gesture-required");

		DesiredCapabilities capabilities = new DesiredCapabilities();
		capabilities.setCapability(MobileCapabilityType.PLATFORM_VERSION, "12.0");
		capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "Android device");
		capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, MobilePlatform.ANDROID);
		capabilities.setCapability(MobileCapabilityType.AUTOMATION_NAME, "UiAutomator2");
		capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "Chrome");
		capabilities.setCapability(ChromeOptions.CAPABILITY, options);

		URL url = null;
		try {
			url = new URL("http://172.17.0.1:4723/wd/hub");
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}
		this.driver = new RemoteWebDriver(url, capabilities);

		this.configureDriver();
	}

}
