package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.openqa.selenium.UnexpectedAlertBehaviour;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.remote.CapabilityType;
import org.openqa.selenium.remote.RemoteWebDriver;

public class EdgeUser extends BrowserUser {

	public EdgeUser(String userName, int timeOfWaitInSeconds) {
		super(userName, timeOfWaitInSeconds);

		String REMOTE_URL = System.getProperty("REMOTE_URL_EDGE");

		EdgeOptions options = new EdgeOptions();
		options.setCapability(CapabilityType.UNEXPECTED_ALERT_BEHAVIOUR, UnexpectedAlertBehaviour.IGNORE);
		options.setCapability(CapabilityType.ACCEPT_INSECURE_CERTS, true);
		// When upgrading to selenium 4.0.0 options.addArguments will make this easier
		List<String> args = new ArrayList<>();
		args.add("use-fake-ui-for-media-stream");
		args.add("use-fake-device-for-media-stream");
		if (REMOTE_URL != null) {
			args.add("headless");
		}
		Map<String, Object> map = new HashMap<>();
		map.put("args", args);
		options.setCapability("ms:edgeOptions", map);

		if (REMOTE_URL != null) {
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

		this.driver.manage().timeouts().setScriptTimeout(timeOfWaitInSeconds, TimeUnit.SECONDS);
		this.configureDriver(new org.openqa.selenium.Dimension(1920, 1080));
	}

}
