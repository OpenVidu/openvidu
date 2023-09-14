package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;

public class AndroidAppUser extends BrowserUser {

	public AndroidAppUser(String userName, int timeOfWaitInSeconds, String appPath) {
		super(userName, timeOfWaitInSeconds);

		String REMOTE_URL = System.getProperty("REMOTE_URL_ANDROID");
		if (REMOTE_URL == null) {
			REMOTE_URL = "http://172.17.0.1:4723/";
		}

		UiAutomator2Options options = new UiAutomator2Options();
		options.setAutoWebview(true);
		options.setApp(appPath);
		options.setAutoGrantPermissions(true);

		URL url = null;
		try {
			url = new URL(REMOTE_URL);
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}

		this.driver = new AndroidDriver(url, options);

		this.configureDriver();
	}

}