package io.openvidu.test.e2e;

import static org.openqa.selenium.OutputType.BASE64;

import java.net.URL;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.Platform;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.BrowserType;
import org.openqa.selenium.remote.DesiredCapabilities;

import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.remote.MobileCapabilityType;

public class OpenViduTestAppE2eAndroidTest {

	protected static String OPENVIDU_SECRET = "MY_SECRET";

	@Test
	void android() throws Exception {

		/* CHROME */
		// Create object of DesiredCapabilities class and specify android platform
		DesiredCapabilities capabilities = DesiredCapabilities.android();
		// set the capability to execute test in chrome browser
		capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, BrowserType.CHROME);
		// set the capability to execute our test in Android Platform
		capabilities.setCapability(MobileCapabilityType.PLATFORM, Platform.ANDROID);
		// we need to define platform name
		capabilities.setCapability(MobileCapabilityType.PLATFORM_NAME, "Android");
		// Set the device name as well (you can give any name)
		capabilities.setCapability(MobileCapabilityType.DEVICE_NAME, "my phone");
		// set the android version as well
		capabilities.setCapability(MobileCapabilityType.VERSION, "10.0");
		ChromeOptions chromeOptions = new ChromeOptions();
		// This flag avoids to grant the user media
		chromeOptions.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video
		chromeOptions.addArguments("--use-fake-device-for-media-stream");
		capabilities.setCapability(ChromeOptions.CAPABILITY, chromeOptions);
		/* CHROME */

		/* FIREFOX */
//		DesiredCapabilities capabilities = DesiredCapabilities.android();
//		capabilities.setCapability(MobileCapabilityType.BROWSER_NAME, "MozillaFirefox");
//		capabilities.setCapability("automationName", "Gecko");
//		capabilities.setCapability("platformName", "linux");
//
//		FirefoxOptions options = new FirefoxOptions();
//		options.addPreference("androidPackage", "org.mozilla.firefox");
//		options.addPreference("androidDeviceSerial", "emulator-5554");
////		capabilities.setCapability("moz:firefoxOptions",
////				"{\"androidPackage\":\"org.mozilla.firefox\",\"androidDeviceSerial\":\"emulator-5554\"}");
//		// capabilities.setCapability("moz:firefoxOptions", value);
//		capabilities.setCapability(FirefoxOptions.FIREFOX_OPTIONS,
//				"{\"androidPackage\":\"org.mozilla.firefox\",\"androidDeviceSerial\":\"emulator-5554\"}");
		/* FIREFOX */

		// Create object of URL class and specify the appium server address
		URL url = new URL("http://172.19.0.3:4723/wd/hub");

		AppiumDriver<MobileElement> driver = new AndroidDriver<MobileElement>(url, capabilities);

		// Open url
		driver.get("https://172.19.0.1:4200");

		OpenViduEventManager eventManager = new OpenViduEventManager(driver, 50);
		eventManager.startPolling();

		// print the title
		System.out.println("Title " + driver.getTitle());

		WebElement urlInput = driver.findElement(By.id("openvidu-url"));
		urlInput.clear();
		urlInput.sendKeys("https://172.19.0.1:4443/");
		WebElement secretInput = driver.findElement(By.id("openvidu-secret"));
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);

		driver.findElement(By.id("auto-join-checkbox")).click();
		driver.findElement(By.id("one2one-btn")).click();

		eventManager.waitUntilEventReaches("connectionCreated", 4);
		eventManager.waitUntilEventReaches("accessAllowed", 2);
		eventManager.waitUntilEventReaches("streamCreated", 4);
		eventManager.waitUntilEventReaches("streamPlaying", 4);

		System.out.println("data:image/png;base64," + ((TakesScreenshot) driver).getScreenshotAs(BASE64));

		// close the browser
		driver.quit();

	}

}
