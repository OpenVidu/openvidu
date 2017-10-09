package io.openvidu.test.e2e.browser;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.core.io.ClassPathResource;

public class ChromeUser extends BrowserUser {

	public ChromeUser(String userName, int timeOfWait) {
		super(userName, timeOfWait);

		System.setProperty("webdriver.chrome.driver", "/home/chromedriver");

		ChromeOptions options = new ChromeOptions();
		// This flag avoids to grant the user media
		options.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video
		options.addArguments("--use-fake-device-for-media-stream");
		// This flag selects the entire screen as video source when screen sharing
		options.addArguments("--auto-select-desktop-capture-source=Entire screen");
		
		try {
			// Add Screen Sharing extension
			options.addExtensions(new ClassPathResource("ScreenCapturing.crx").getFile());
		} catch (IOException e) {
			e.printStackTrace();
		}

		this.driver = new ChromeDriver(options);
		this.driver.manage().timeouts().setScriptTimeout(5, TimeUnit.SECONDS);
		
		this.configureDriver();
	}

}