package io.openvidu.test.e2e;

import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;

import org.junit.jupiter.api.AfterEach;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;

import io.openvidu.test.browsers.BrowserUser;

public class AbstractOpenViduTestappE2eTest extends OpenViduTestE2e {

	protected Collection<OpenViduTestappUser> testappUsers = new HashSet<>();

	private void connectToOpenViduTestApp(OpenViduTestappUser user) {
		user.getDriver().get(APP_URL);
		WebElement urlInput = user.getDriver().findElement(By.id("livekit-url"));
		urlInput.clear();
		urlInput.sendKeys(LIVEKIT_URL);
		WebElement keyInput = user.getDriver().findElement(By.id("livekit-api-key"));
		keyInput.clear();
		keyInput.sendKeys(LIVEKIT_API_KEY);
		WebElement secretInput = user.getDriver().findElement(By.id("livekit-api-secret"));
		secretInput.clear();
		secretInput.sendKeys(LIVEKIT_API_SECRET);
		user.getEventManager().startPolling();
	}

	protected OpenViduTestappUser setupBrowserAndConnectToOpenViduTestapp(String browser) throws Exception {
		BrowserUser browserUser = this.setupBrowser(browser);
		OpenViduTestappUser testappUser = new OpenViduTestappUser(browserUser);
		this.testappUsers.add(testappUser);
		this.connectToOpenViduTestApp(testappUser);
		return testappUser;
	}

	protected void gracefullyLeaveParticipants(OpenViduTestappUser user, int numberOfParticipants) throws Exception {
		int accumulatedDisconnected = 0;
		for (int j = 1; j <= numberOfParticipants; j++) {
			user.getDriver().findElement(By.className("disconnect-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("disconnected", "RoomEvent", j);
			user.getEventManager().waitUntilEventReaches("connectionStateChanged", "RoomEvent", j);
			accumulatedDisconnected = (j != numberOfParticipants) ? (accumulatedDisconnected + numberOfParticipants - j)
					: (accumulatedDisconnected);
			user.getEventManager().waitUntilEventReaches("participantDisconnected", "RoomEvent",
					accumulatedDisconnected);
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
