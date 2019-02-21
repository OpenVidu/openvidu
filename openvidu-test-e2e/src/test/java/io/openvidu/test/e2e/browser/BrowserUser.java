/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.test.e2e.browser;

import static java.lang.invoke.MethodHandles.lookup;
import static org.slf4j.LoggerFactory.getLogger;

import org.openqa.selenium.Dimension;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.slf4j.Logger;

import io.openvidu.test.e2e.OpenViduEventManager;

public class BrowserUser {

	final static Logger log = getLogger(lookup().lookupClass());

	protected WebDriver driver;
	protected WebDriverWait waiter;
	protected String clientData;
	protected int timeOfWaitInSeconds;
	protected OpenViduEventManager eventManager;

	public BrowserUser(String clientData, int timeOfWaitInSeconds) {
		this.clientData = clientData;
		this.timeOfWaitInSeconds = timeOfWaitInSeconds;
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

	public int getTimeOfWait() {
		return this.timeOfWaitInSeconds;
	}

	protected void newWaiter(int timeOfWait) {
		this.waiter = new WebDriverWait(this.driver, timeOfWait);
	}

	protected void configureDriver() {
		this.waiter = new WebDriverWait(this.driver, this.timeOfWaitInSeconds);
		this.eventManager = new OpenViduEventManager(this.driver, this.timeOfWaitInSeconds);
		this.driver.manage().window().setSize(new Dimension(1920,1080));
	}

	public void dispose() {
		this.eventManager.stopPolling(true);
		this.driver.quit();
	}

}