package io.openvidu.test.e2e.cucumbertest;

import java.util.concurrent.TimeUnit;

import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class ChromeUser extends BrowserUser {

	public ChromeUser(String userName, int timeOfWait) {
		super(userName, timeOfWait);

		System.setProperty("webdriver.chrome.driver", "/home/pablo/Downloads/chromedriver");

		ChromeOptions options = new ChromeOptions();
		// This flag avoids to grant the user media
		options.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video (green with spinner
		// and timer)
		options.addArguments("--use-fake-device-for-media-stream");

		this.driver = new ChromeDriver(options);
		this.driver.manage().timeouts().setScriptTimeout(3, TimeUnit.SECONDS);

		this.configWaiterAndScript();
	}

}
