package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;

import org.openqa.selenium.WebElement;

import io.appium.java_client.AppiumDriver;
import io.appium.java_client.android.AndroidOptions;
import io.appium.java_client.remote.MobilePlatform;

public class AndroidAppUser extends BrowserUser {

	public AndroidAppUser(String userName, int timeOfWaitInSeconds, String appPath) {
		super(userName, timeOfWaitInSeconds);

		AndroidOptions options = new AndroidOptions();
		options.setAutomationName("UiAutomator2");
		options.setPlatformVersion("12.0");
		options.setPlatformName(MobilePlatform.ANDROID);
		options.setAutomationName("UiAutomator2");
		options.setDeviceName("Android device");
		options.setAutoWebview(true);
		options.setApp(appPath);

		URL url = null;
		try {
			url = new URL("http://172.17.0.1:4723/wd/hub");
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}
		this.driver = new AppiumDriver<WebElement>(url, options);

		this.configureDriver();
	}

}