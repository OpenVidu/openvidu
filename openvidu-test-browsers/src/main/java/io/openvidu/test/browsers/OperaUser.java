package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.concurrent.TimeUnit;

import org.openqa.selenium.opera.OperaDriver;
import org.openqa.selenium.opera.OperaOptions;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

public class OperaUser extends BrowserUser {

	public OperaUser(String userName, int timeOfWaitInSeconds) {
		super(userName, timeOfWaitInSeconds);

		DesiredCapabilities capabilities = DesiredCapabilities.operaBlink();
		capabilities.setAcceptInsecureCerts(true);
		OperaOptions options = new OperaOptions();
		// This flag avoids to grant the user media
		options.addArguments("--use-fake-ui-for-media-stream");
		// This flag fakes user media with synthetic video
		options.addArguments("--use-fake-device-for-media-stream");
		// This flag selects the entire screen as video source when screen sharing
		options.addArguments("--auto-select-desktop-capture-source=Entire screen");
		options.merge(capabilities);

		String REMOTE_URL = System.getProperty("REMOTE_URL_OPERA");
		if (REMOTE_URL != null) {
			log.info("Using URL {} to connect to remote web driver", REMOTE_URL);
			try {
				this.driver = new RemoteWebDriver(new URL(REMOTE_URL), options);
			} catch (MalformedURLException e) {
				e.printStackTrace();
			}
		} else {
			log.info("Using local web driver");
			this.driver = new OperaDriver(options);
		}

		this.driver.manage().timeouts().setScriptTimeout(this.timeOfWaitInSeconds, TimeUnit.SECONDS);
		this.configureDriver();
	}

}
