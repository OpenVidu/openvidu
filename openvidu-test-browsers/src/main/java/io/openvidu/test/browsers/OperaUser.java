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

		OperaOptions options = new OperaOptions();
		options.setBinary("/usr/bin/opera");
		DesiredCapabilities capabilities = DesiredCapabilities.operaBlink();
		capabilities.setAcceptInsecureCerts(true);

		options.addArguments("--use-fake-ui-for-media-stream");
		options.addArguments("--use-fake-device-for-media-stream");
		capabilities.setCapability(OperaOptions.CAPABILITY, options);

		String REMOTE_URL = System.getProperty("REMOTE_URL_OPERA");
		if (REMOTE_URL != null) {
			log.info("Using URL {} to connect to remote web driver", REMOTE_URL);
			try {
				this.driver = new RemoteWebDriver(new URL(REMOTE_URL), capabilities);
			} catch (MalformedURLException e) {
				e.printStackTrace();
			}
		} else {
			log.info("Using local web driver");
			this.driver = new OperaDriver(capabilities);
		}

		this.driver.manage().timeouts().setScriptTimeout(this.timeOfWaitInSeconds, TimeUnit.SECONDS);
		this.configureDriver();
	}

}
