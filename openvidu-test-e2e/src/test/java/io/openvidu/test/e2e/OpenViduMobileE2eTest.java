package io.openvidu.test.e2e;

import java.util.Map;
import java.util.Set;

import org.apache.commons.lang3.RandomStringUtils;
import org.apache.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.http.HttpMethod;

import io.appium.java_client.AppiumDriver;
import io.appium.java_client.remote.SupportsContextSwitching;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.RecordingUtils;

public class OpenViduMobileE2eTest extends AbstractOpenViduTestappE2eTest {

	@BeforeAll()
	protected static void setupAll() throws Exception {
		loadEnvironmentVariables();
		cleanFoldersAndSetUpOpenViduJavaClient();
		try {
			setupDockerAndroidContainer();
		} catch (Exception e) {
			log.error("Error starting Docker Android singleton container: {}", e.getMessage());
			throw e;
		}
	}

	@Test
	@DisplayName("Chrome Android")
	void chromeAndroid() throws Exception {

		isAndroidTest = true;

		long initTime = System.currentTimeMillis();
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("androidChrome");
		log.info("Android emulator ready after {} seconds", (System.currentTimeMillis() - initTime) / 1000);
		log.info("Chrome Android");

		String sessionName = "MobileTestSession-" + RandomStringUtils.randomAlphanumeric(6);
		WebElement urlInput = user.getDriver().findElement(By.id("openvidu-url"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_DEPLOYMENT);
		String[] tokens = { getToken(sessionName), getToken(sessionName) };

		user.getDriver().findElement(By.id("one2one-btn")).click();

		// Set tokens
		for (int i = 0; i < 2; i++) {
			user.getDriver().findElement(By.id("session-settings-btn-" + i)).click();
			Thread.sleep(1000);
			WebElement tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
			tokenInput.clear();
			tokenInput.sendKeys(tokens[i]);
			user.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);
		}

		user.getDriver().findElements(By.className("join-btn")).forEach(el -> el.sendKeys(Keys.ENTER));
		user.getEventManager().waitUntilEventReaches("connectionCreated", 4);
		user.getEventManager().waitUntilEventReaches("accessAllowed", 2);
		user.getEventManager().waitUntilEventReaches("streamCreated", 4);
		user.getEventManager().waitUntilEventReaches("streamPlaying", 4);
		final int numberOfVideos = user.getDriver().findElements(By.tagName("video")).size();
		Assertions.assertEquals(4, numberOfVideos, "Wrong number of videos");
		Assertions.assertTrue(
				user.getBrowserUser().assertMediaTracks(user.getDriver().findElements(By.tagName("video")), true, true),
				"Videos were expected to have audio and video tracks");
		gracefullyLeaveParticipants(user, 2);
	}

	@Test
	@DisplayName("Ionic Android")
	void ionicAndroid() throws Exception {

		isAndroidTest = true;

		long initTime = System.currentTimeMillis();
		BrowserUser ionicUser = setupBrowser("ionicApp");
		log.info("Android emulator ready after {} seconds", (System.currentTimeMillis() - initTime) / 1000);
		log.info("Ionic Android");

		AppiumDriver appiumDriver = (AppiumDriver) ionicUser.getDriver();

		Set<String> contextNames = ((SupportsContextSwitching) appiumDriver).getContextHandles();
		log.info("Appium contexts:");
		for (String contextName : contextNames) {
			log.info(contextName);
		}
		for (String context : contextNames) {
			if (context.equals("WEBVIEW_io.openvidu.ionic")) {
				log.info("Webview context name chosen is " + context);
				((SupportsContextSwitching) appiumDriver).context("WEBVIEW_io.openvidu.ionic");
				break;
			}
		}

		final String SESSION_NAME = "IonicTestSession";
		final String USER_NAME = "IonicUser";

		ionicUser.getWaiter().until(ExpectedConditions.elementToBeClickable(By.cssSelector("#session-input input")));
		WebElement sessionNameInput = appiumDriver.findElement(By.cssSelector("#session-input input"));
		WebElement userNameInput = appiumDriver.findElement(By.cssSelector("#user-input input"));
		sessionNameInput.clear();
		userNameInput.clear();
		sessionNameInput.sendKeys(SESSION_NAME);
		userNameInput.sendKeys(USER_NAME);

		appiumDriver.findElement(By.cssSelector("#settings-button")).click();
		Thread.sleep(500);
		WebElement urlInput = appiumDriver.findElement(By.cssSelector("input.alert-input"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_DEPLOYMENT);
		appiumDriver.findElement(By.cssSelector("#ok-btn")).click();
		Thread.sleep(500);
		appiumDriver.findElement(By.cssSelector("#join-button")).click();

		OpenViduTestappUser chromeUser = null;
		try {
			chromeUser = setupBrowserAndConnectToOpenViduTestapp("chrome");
			urlInput = chromeUser.getDriver().findElement(By.id("openvidu-url"));
			urlInput.clear();
			urlInput.sendKeys(OPENVIDU_DEPLOYMENT);
			chromeUser.getDriver().findElement(By.id("add-user-btn")).click();
			chromeUser.getDriver().findElement(By.id("session-settings-btn-0")).click();
			Thread.sleep(1000);
			WebElement tokenInput = chromeUser.getDriver().findElement(By.cssSelector("#custom-token-div input"));
			tokenInput.clear();
			tokenInput.sendKeys(getToken(SESSION_NAME));
			chromeUser.getDriver().findElement(By.id("save-btn")).click();
			Thread.sleep(1000);
			chromeUser.getDriver().findElement(By.className("join-btn")).click();
			chromeUser.getEventManager().waitUntilEventReaches("connectionCreated", 2);
			chromeUser.getEventManager().waitUntilEventReaches("accessAllowed", 1);
			chromeUser.getEventManager().waitUntilEventReaches("streamCreated", 2);
			chromeUser.getEventManager().waitUntilEventReaches("streamPlaying", 2);

			final int numberOfVideos = chromeUser.getDriver().findElements(By.tagName("video")).size();
			Assertions.assertEquals(2, numberOfVideos, "Wrong number of videos");
			Assertions.assertTrue(
					chromeUser.getBrowserUser()
							.assertMediaTracks(chromeUser.getDriver().findElements(By.tagName("video")), true, true),
					"Videos were expected to have audio and video tracks");

			final int numberOfVideosIonic = ionicUser.getDriver().findElements(By.tagName("video")).size();
			Assertions.assertEquals(2, numberOfVideosIonic, "Wrong number of videos");
			Assertions.assertTrue(
					ionicUser.assertMediaTracks(ionicUser.getDriver().findElements(By.tagName("video")), true, true),
					"Videos were expected to have audio and video tracks");

			// Check Ionic is properly receiving remote video from Chrome
			WebElement subscriberVideo = ionicUser.getDriver().findElements(By.cssSelector("video")).get(1);
			Map<String, Long> rgb = ionicUser.getAverageRgbFromVideo(subscriberVideo);
			Assertions.assertTrue(RecordingUtils.checkVideoAverageRgbGreen(rgb), "Video is not average green");

			gracefullyLeaveParticipants(chromeUser, 1);

		} finally {
			if (chromeUser != null) {
				chromeUser.dispose();
			}
		}
	}

	private String getToken(String sessionId) throws Exception {
		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_DEPLOYMENT);
		restClient.restString(HttpMethod.POST, "/api/sessions", "{'customSessionId': '" + sessionId + "'}",
				HttpStatus.SC_OK);
		return restClient.restString(HttpMethod.POST, "/api/sessions/" + sessionId + "/connections", "{}",
				HttpStatus.SC_OK);
	}

//	@Test
//	@DisplayName("React Native Android")
//	void reactNativeAndroid() throws Exception {
//		long initTime = System.currentTimeMillis();
//		BrowserUser reactNativeUser = setupBrowser("reactNativeApp");
//
//	}
//
//	@Test
//	@DisplayName("Native Android")
//	void nativeAndroid() throws Exception {
//		long initTime = System.currentTimeMillis();
//		BrowserUser reactNativeUser = setupBrowser("androidApp");
//
//	}

}
