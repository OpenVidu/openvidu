package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;

import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

import io.appium.java_client.remote.MobileCapabilityType;
import io.appium.java_client.remote.MobilePlatform;

// Run Docker Android:
// docker run --privileged --rm --name android-chrome -p 6080:6080 -p 5554:5554 -p 5555:5555 -p 4723:4723 -e DEVICE="Samsung Galaxy S10" -e APPIUM=true -e APPIUM_HOST=172.17.0.1 -e APPIUM_PORT=4723 -e MOBILE_WEB_TEST=true -e RELAXED_SECURITY=true budtmo/docker-android-x86-12.0
// 
// Kill default Appium Server in Docker Android:
// docker exec android-chrome bash -c "ps axf | grep 'Appium Server' | grep -v grep | awk '{print $1}' | xargs -I {} kill -9 {}"
// 
// Run custom Appium Server in Docker Android:
// docker exec android-chrome bash -c "xterm -T 'Appium Server' -n 'Appium Server' -e appium --log /var/log/supervisor/appium.log --relaxed-security --allow-insecure=chromedriver_autodownload &"
//
// Manually run appium:
// docker run --privileged --network=host -p 4723:4723 -v /dev/bus/usb:/dev/bus/usb -v /opt/openvidu/android:/opt/openvidu/android -e RELAXED_SECURITY=true -e ALLOW_INSECURE=chromedriver_autodownload appium/appium
//
// Command to replace Chrome driver in Docker Android:
// docker exec android-chrome bash -c "rm chromedriver && wget https://chromedriver.storage.googleapis.com/91.0.4472.101/chromedriver_linux64.zip && unzip chromedriver_linux64.zip && rm chromedriver_linux64.zip"
public class AndroidChromeUser extends BrowserUser {

	public AndroidChromeUser(String userName, int timeOfWaitInSeconds) {
		super(userName, timeOfWaitInSeconds);

		String REMOTE_URL = System.getProperty("REMOTE_URL_ANDROID");
		if (REMOTE_URL == null) {
			REMOTE_URL = "http://172.17.0.1:4723/wd/hub";
		}

		ChromeOptions options = new ChromeOptions();
		options.addArguments("no-first-run", "disable-infobars", "use-fake-ui-for-media-stream",
				"use-fake-device-for-media-stream", "ignore-certificate-errors",
				"autoplay-policy=no-user-gesture-required");

		DesiredCapabilities capabilities = new DesiredCapabilities();
		capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, MobilePlatform.ANDROID);
		capabilities.setCapability(ChromeOptions.CAPABILITY, options);
		capabilities.setCapability(CapabilityType.BROWSER_NAME, "Chrome");
		capabilities.setCapability("appium:automationName", "UiAutomator2");

		URL url = null;
		try {
			url = new URL(REMOTE_URL);
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}
		this.driver = new RemoteWebDriver(url, capabilities);

		this.configureDriver();
	}

}
