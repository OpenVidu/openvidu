package io.openvidu.test.e2e;

import java.time.Duration;
import java.time.temporal.ChronoUnit;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.WebDriverWait;

import io.openvidu.test.browsers.BrowserUser;

public class OpenViduTestappUser {

	private BrowserUser browserUser;
	private OpenViduEventManager eventManager;

	public OpenViduTestappUser(BrowserUser browserUser) {
		this.browserUser = browserUser;
		this.eventManager = new OpenViduEventManager(this.browserUser.getDriver(), this.browserUser.getTimeOfWait());
	}

	public BrowserUser getBrowserUser() {
		return this.browserUser;
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
		this.eventManager.stopPolling(true, true);
		this.browserUser.dispose();
	}

	public void waitWithNewTime(int newWaitTime, ExpectedCondition<?> condition) {
		this.getWaiter().withTimeout(Duration.of(newWaitTime, ChronoUnit.SECONDS));
		this.getWaiter().until(condition);
		this.getWaiter().withTimeout(Duration.of(this.browserUser.getTimeOfWait(), ChronoUnit.SECONDS));
	}

}
