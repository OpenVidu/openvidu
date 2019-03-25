package io.openvidu.test.e2e;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

import io.openvidu.test.browsers.BrowserUser;

public class MyUser {

	BrowserUser browserUser;
	private OpenViduEventManager eventManager;

	public MyUser(BrowserUser browserUser) {
		this.browserUser = browserUser;
		this.eventManager = new OpenViduEventManager(this.browserUser.getDriver(), this.browserUser.getTimeOfWait());
	}

	public WebDriver getDriver() {
		return this.browserUser.getDriver();
	}

	public WebDriverWait getWaiter() {
		return this.browserUser.getWaiter();
	}

	public OpenViduEventManager getEventManager() {
		return this.eventManager;
	}

	public void dispose() {
		this.eventManager.stopPolling(true);
		this.browserUser.dispose();
	}

}
