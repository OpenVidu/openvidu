package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;
import java.time.Duration;

import org.openqa.selenium.UnexpectedAlertBehaviour;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;

public class EdgeUser extends BrowserUser {

	public EdgeUser(String userName, int timeOfWaitInSeconds, boolean headless) {
		super(userName, timeOfWaitInSeconds);

		String REMOTE_URL = System.getProperty("REMOTE_URL_EDGE");

		EdgeOptions options = new EdgeOptions();
		options.setAcceptInsecureCerts(true);
		options.setUnhandledPromptBehaviour(UnexpectedAlertBehaviour.IGNORE);
		options.addArguments("--use-fake-ui-for-media-stream");
		options.addArguments("--use-fake-device-for-media-stream");
		options.addArguments("--disable-infobars");

		if (headless) {
			options.addArguments("--headless=new");
			options.addArguments("--mute-audio");
		}

		if (REMOTE_URL != null && !REMOTE_URL.isBlank()) {
			log.info("Using URL {} to connect to remote web driver", REMOTE_URL);
			try {
				this.driver = new RemoteWebDriver(new URL(REMOTE_URL), options);
			} catch (MalformedURLException e) {
				e.printStackTrace();
			}
		} else {
			log.info("Using local web driver");
			this.driver = new EdgeDriver(options);
		}

		this.driver.manage().timeouts().scriptTimeout(Duration.ofSeconds(timeOfWaitInSeconds));
		this.configureDriver(new org.openqa.selenium.Dimension(1920, 1080));
	}

}
