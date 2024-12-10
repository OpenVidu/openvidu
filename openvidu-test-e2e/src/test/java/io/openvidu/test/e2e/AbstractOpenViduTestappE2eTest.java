package io.openvidu.test.e2e;

import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;

import org.junit.jupiter.api.AfterEach;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import io.openvidu.test.browsers.BrowserUser;

public class AbstractOpenViduTestappE2eTest extends OpenViduTestE2e {

	protected Collection<OpenViduTestappUser> testappUsers = new HashSet<>();

	private void connectToOpenViduTestApp(OpenViduTestappUser user) {
		user.getDriver().get(APP_URL);
		WebElement urlInput = user.getDriver().findElement(By.id("openvidu-url"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		WebElement secretInput = user.getDriver().findElement(By.id("openvidu-secret"));
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);
		user.getEventManager().startPolling();
	}

	protected OpenViduTestappUser setupBrowserAndConnectToOpenViduTestapp(String browser) throws Exception {
		BrowserUser browserUser = this.setupBrowser(browser);
		OpenViduTestappUser testappUser = new OpenViduTestappUser(browserUser);
		this.testappUsers.add(testappUser);
		this.connectToOpenViduTestApp(testappUser);
		return testappUser;
	}

	protected void listEmptyRecordings(OpenViduTestappUser user) {
		// List existing recordings (empty)
		user.getDriver().findElement(By.id("list-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Recording list []"));
	}

	protected void gracefullyLeaveParticipants(OpenViduTestappUser user, int numberOfParticipants) throws Exception {
		int accumulatedConnectionDestroyed = 0;
		for (int j = 1; j <= numberOfParticipants; j++) {
			user.getDriver().findElement(By.id("remove-user-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("sessionDisconnected", j);
			accumulatedConnectionDestroyed = (j != numberOfParticipants)
					? (accumulatedConnectionDestroyed + numberOfParticipants - j)
					: (accumulatedConnectionDestroyed);
			user.getEventManager().waitUntilEventReaches("connectionDestroyed", accumulatedConnectionDestroyed);
		}
	}

	@AfterEach
	protected void dispose() {
		// Dispose all testapp users
		Iterator<OpenViduTestappUser> it2 = testappUsers.iterator();
		while (it2.hasNext()) {
			OpenViduTestappUser u = it2.next();
			u.dispose();
			it2.remove();
		}
		super.dispose();
	}

}
