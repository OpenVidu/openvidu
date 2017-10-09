package io.openvidu.test.e2e.browser;

import java.util.concurrent.TimeUnit;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

import io.openvidu.test.e2e.OpenViduEventManager;

public class BrowserUser {

	protected WebDriver driver;
	protected WebDriverWait waiter;
	protected String clientData;
	protected int timeOfWait;
	protected OpenViduEventManager eventManager;

	public BrowserUser(String clientData, int timeOfWait) {
		this.clientData = clientData;
		this.timeOfWait = timeOfWait;
	}

	public WebDriver getDriver() {
		return this.driver;
	}

	public WebDriverWait getWaiter() {
		return this.waiter;
	}

	public OpenViduEventManager getEventManager() {
		return this.eventManager;
	}

	public String getClientData() {
		return this.clientData;
	}

	protected void newWaiter(int timeOfWait) {
		this.waiter = new WebDriverWait(this.driver, timeOfWait);
	}

	protected void configureDriver() {
		this.waiter = new WebDriverWait(this.driver, this.timeOfWait);
		this.driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS);
		this.eventManager = new OpenViduEventManager(this.driver, this.waiter);
	}
	
	public void dispose() {
		this.eventManager.stopPolling();
		this.driver.quit();
	}

}