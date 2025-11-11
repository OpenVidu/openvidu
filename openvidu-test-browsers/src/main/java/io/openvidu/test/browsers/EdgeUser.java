package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.time.Duration;

import org.openqa.selenium.UnexpectedAlertBehaviour;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;

public class EdgeUser extends BrowserUser {

	public EdgeUser(String userName, int timeOfWaitInSeconds) {
		super(userName, timeOfWaitInSeconds);

		String REMOTE_URL = System.getProperty("REMOTE_URL_EDGE");

		EdgeOptions options = new EdgeOptions();
		options.setAcceptInsecureCerts(true);
		options.setUnhandledPromptBehaviour(UnexpectedAlertBehaviour.IGNORE);
		options.addArguments("--use-fake-ui-for-media-stream");
		options.addArguments("--use-fake-device-for-media-stream");
		options.addArguments("--disable-infobars");

		if (REMOTE_URL != null) {
			options.addArguments("--headless=new");
			log.info("Using URL {} to connect to remote web driver", REMOTE_URL);
			try {
				URL remoteUrl = URI.create(REMOTE_URL).toURL();
				this.driver = new RemoteWebDriver(remoteUrl, options);
			} catch (IllegalArgumentException | MalformedURLException e) {
				throw new IllegalArgumentException("Invalid REMOTE_URL_EDGE value: " + REMOTE_URL, e);
			}
		} else {
			log.info("Using local web driver");
			this.driver = new EdgeDriver(options);
		}

		this.driver.manage().timeouts().scriptTimeout(Duration.ofSeconds(timeOfWaitInSeconds));
		super.configureDriver(new org.openqa.selenium.Dimension(1920, 1080));
	}

}
