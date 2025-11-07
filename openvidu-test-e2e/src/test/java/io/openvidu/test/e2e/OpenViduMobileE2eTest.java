package io.openvidu.test.e2e;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.http.HttpMethod;

import com.google.gson.JsonObject;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.remote.SupportsContextSwitching;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.utils.CustomHttpClient;

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

		String sessionName = "MobileTestSession-" + UUID.randomUUID().toString().substring(0, 10);
		WebElement urlInput = user.getDriver().findElement(By.id("openvidu-url"));
		WebElement secretInput = user.getDriver().findElement(By.id("openvidu-secret"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);
		String[] tokens = { getToken(sessionName), getToken(sessionName) };

		user.getDriver().findElement(By.id("one2one-btn")).sendKeys(Keys.ENTER);

		// Set tokens
		for (int i = 0; i < 2; i++) {
			WebElement settingsBtn = user.getWaiter().until(
					ExpectedConditions.elementToBeClickable(By.id("session-settings-btn-" + i)));
			settingsBtn.sendKeys(Keys.ENTER);
			Thread.sleep(1000);
			WebElement tokenInput = user.getDriver().findElement(By.cssSelector("#custom-token-div input"));
			tokenInput.clear();
			tokenInput.sendKeys(tokens[i]);
			user.getDriver().findElement(By.id("save-btn")).sendKeys(Keys.ENTER);
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
		Thread.sleep(2000);
		WebElement urlInput = appiumDriver.findElement(By.cssSelector("#url-input"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		WebElement secretInput = appiumDriver.findElement(By.cssSelector("#secret-input"));
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);

		appiumDriver.findElement(By.cssSelector("#ok-btn")).click();
		Thread.sleep(3000);

		appiumDriver.findElement(By.cssSelector("#join-button")).click();

		OpenViduTestappUser chromeUser = null;
		try {
			chromeUser = setupBrowserAndConnectToOpenViduTestapp("chrome");
			urlInput = chromeUser.getDriver().findElement(By.id("openvidu-url"));
			urlInput.clear();
			urlInput.sendKeys(OPENVIDU_URL);
			secretInput = chromeUser.getDriver().findElement(By.id("openvidu-secret"));
			secretInput.clear();
			secretInput.sendKeys(OPENVIDU_SECRET);
			chromeUser.getDriver().findElement(By.id("add-user-btn")).sendKeys(Keys.ENTER);
			chromeUser.getDriver().findElement(By.id("session-settings-btn-0")).sendKeys(Keys.ENTER);
			Thread.sleep(1000);
			WebElement tokenInput = chromeUser.getDriver().findElement(By.cssSelector("#custom-token-div input"));
			tokenInput.clear();
			tokenInput.sendKeys(getToken(SESSION_NAME));
			chromeUser.getDriver().findElement(By.id("save-btn")).sendKeys(Keys.ENTER);
			Thread.sleep(1000);
			chromeUser.getDriver().findElement(By.className("join-btn")).sendKeys(Keys.ENTER);

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

			gracefullyLeaveParticipants(chromeUser, 1);

		} finally {
			if (chromeUser != null) {
				chromeUser.dispose();
			}
		}
	}

	/**
	 * By default this application is prepared to run against
	 * https://demos.openvidu.io
	 */
	@Test
	@DisplayName("React Native Android")
	void reactNativeAndroid() throws Exception {

		isAndroidTest = true;

		long initTime = System.currentTimeMillis();
		BrowserUser reactNativeUser = setupBrowser("reactNativeApp");
		log.info("Android emulator ready after {} seconds", (System.currentTimeMillis() - initTime) / 1000);
		log.info("React Native Android");

		AppiumDriver appiumDriver = (AppiumDriver) reactNativeUser.getDriver();

		Set<String> contextNames = ((SupportsContextSwitching) appiumDriver).getContextHandles();
		log.info("Appium contexts:");
		for (String contextName : contextNames) {
			log.info(contextName);
		}
		for (String context : contextNames) {
			if (context.equals("NATIVE_APP")) {
				log.info("Webview context name chosen is " + context);
				((SupportsContextSwitching) appiumDriver).context("NATIVE_APP");
				break;
			}
		}

		final String SESSION_NAME = "ReactNativeTestSession";

		reactNativeUser.getWaiter()
				.until(ExpectedConditions.elementToBeClickable(AppiumBy.className("android.widget.EditText")));

		// Open settings modal to configure OpenVidu URL and Secret
		List<WebElement> buttons = appiumDriver.findElements(By.className("android.widget.Button"));
		log.info("Initial buttons count: {}", buttons.size());
		WebElement settingsButton = buttons.get(2); // Third button is "Settings"
		settingsButton.click();

		// Wait for modal to open and find input fields
		Thread.sleep(1000);
		List<WebElement> editTexts = appiumDriver.findElements(AppiumBy.className("android.widget.EditText"));
		log.info("EditTexts found: {}", editTexts.size());

		// Modal shows 2 EditTexts: [0]=URL, [1]=Secret
		WebElement androidUrlInput = editTexts.get(0);
		androidUrlInput.clear();
		androidUrlInput.sendKeys(OPENVIDU_URL);

		WebElement androidSecretInput = editTexts.get(1);
		androidSecretInput.clear();
		androidSecretInput.sendKeys(OPENVIDU_SECRET);

		// Click Save button - after modal opens, there are more buttons (Cancel and
		// Save)
		buttons = appiumDriver.findElements(By.className("android.widget.Button"));
		log.info("Buttons after modal open: {}", buttons.size());
		// Save button should be the last one
		WebElement saveButton = buttons.get(buttons.size() - 1);
		saveButton.click();

		Thread.sleep(1000);

		// Now configure session name and join
		WebElement sessionNameInput = appiumDriver.findElement(AppiumBy.className("android.widget.EditText"));
		sessionNameInput.clear();
		sessionNameInput.sendKeys(SESSION_NAME);

		buttons = appiumDriver.findElements(By.className("android.widget.Button"));
		WebElement joinAsPublisherButton = buttons.get(0);
		joinAsPublisherButton.click();

		OpenViduTestappUser chromeUser = null;
		try {
			chromeUser = setupBrowserAndConnectToOpenViduTestapp("chrome");
			WebElement urlInput = chromeUser.getDriver().findElement(By.id("openvidu-url"));
			urlInput.clear();
			urlInput.sendKeys(OPENVIDU_URL);
			WebElement secretInput = chromeUser.getDriver().findElement(By.id("openvidu-secret"));
			secretInput.clear();
			secretInput.sendKeys(OPENVIDU_SECRET);
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

			// Wait for Android app to have 2 video views
			// Publisher view
			By localVideoLocator = AppiumBy.xpath(
					"//*/android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[1]/android.view.View");
			reactNativeUser.getWaiter()
					.until(ExpectedConditions.elementToBeClickable(appiumDriver.findElement(localVideoLocator)));
			// Subscriber view
			By remoteVideoLocator = AppiumBy.xpath(
					"//*/android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[2]/android.view.View");
			reactNativeUser.getWaiter()
					.until(ExpectedConditions.elementToBeClickable(appiumDriver.findElement(remoteVideoLocator)));

			// Check Android's subscriber video is green
			Map<String, Long> rgb = getAverageColorOfElement(appiumDriver, remoteVideoLocator);
			// Wait until average color is green
			int retries = 15;
			while (retries > 0 && !checkAverageRgbGreen(rgb)) {
				Thread.sleep(1000);
				rgb = getAverageColorOfElement(appiumDriver, remoteVideoLocator);
				log.info("Average RGB for remote video in Android: R={} G={} B={}", rgb.get("r"), rgb.get("g"),
						rgb.get("b"));
				retries--;
			}
			Assertions.assertTrue(checkAverageRgbGreen(rgb), "Remote video is not average green");

			buttons = appiumDriver.findElements(By.className("android.widget.Button"));
			WebElement muteMicBtn = buttons.get(1);
			WebElement muteCamBtn = buttons.get(3);
			WebElement leaveBtn = buttons.get(4);

			muteMicBtn.click();
			chromeUser.getEventManager().waitUntilEventReaches("streamPropertyChanged", 1);
			muteMicBtn.click();
			chromeUser.getEventManager().waitUntilEventReaches("streamPropertyChanged", 2);
			muteCamBtn.click();
			chromeUser.getEventManager().waitUntilEventReaches("streamPropertyChanged", 3);
			muteCamBtn.click();
			chromeUser.getEventManager().waitUntilEventReaches("streamPropertyChanged", 4);
			leaveBtn.click();

			reactNativeUser.getWaiter().until(
					ExpectedConditions.visibilityOfElementLocated(AppiumBy.className("android.widget.EditText")));
			Assertions.assertTrue(appiumDriver.findElement(AppiumBy.className("android.widget.EditText")).isEnabled());

			chromeUser.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
			chromeUser.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);

			gracefullyLeaveParticipants(chromeUser, 1);

		} finally {
			if (chromeUser != null) {
				chromeUser.dispose();
			}
		}
	}

	@Test
	@DisplayName("Native Android")
	void nativeAndroid() throws Exception {

		isAndroidTest = true;

		long initTime = System.currentTimeMillis();
		BrowserUser androidUser = setupBrowser("androidApp");
		log.info("Android emulator ready after {} seconds", (System.currentTimeMillis() - initTime) / 1000);
		log.info("Native Android");

		AppiumDriver appiumDriver = (AppiumDriver) androidUser.getDriver();

		Set<String> contextNames = ((SupportsContextSwitching) appiumDriver).getContextHandles();
		log.info("Appium contexts:");
		for (String contextName : contextNames) {
			log.info(contextName);
		}
		for (String context : contextNames) {
			if (context.equals("NATIVE_APP")) {
				log.info("Webview context name chosen is " + context);
				((SupportsContextSwitching) appiumDriver).context("NATIVE_APP");
				break;
			}
		}

		final String SESSION_NAME = "NativeAndroidTestSession";
		final String USER_NAME = "NativeAndroidUser";

		androidUser.getWaiter().until(ExpectedConditions.elementToBeClickable(By.id("start_finish_call")));

		WebElement urlInput = appiumDriver.findElement(By.id("openvidu_url"));
		WebElement secretInput = appiumDriver.findElement(By.id("openvidu_secret"));
		WebElement sessionNameInput = appiumDriver.findElement(By.id("session_name"));
		WebElement userNameInput = appiumDriver.findElement(By.id("participant_name"));
		urlInput.clear();
		secretInput.clear();
		sessionNameInput.clear();
		userNameInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		secretInput.sendKeys(OPENVIDU_SECRET);
		sessionNameInput.sendKeys(SESSION_NAME);
		userNameInput.sendKeys(USER_NAME);

		appiumDriver.findElement(By.id("start_finish_call")).click();

		OpenViduTestappUser chromeUser = null;
		try {
			chromeUser = setupBrowserAndConnectToOpenViduTestapp("chrome");
			urlInput = chromeUser.getDriver().findElement(By.id("openvidu-url"));
			urlInput.clear();
			urlInput.sendKeys(OPENVIDU_URL);
			secretInput = chromeUser.getDriver().findElement(By.id("openvidu-secret"));
			secretInput.clear();
			secretInput.sendKeys(OPENVIDU_SECRET);
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

			// Wait for Android app to have 2 video views
			// Publisher view
			By localVideoLocator = AppiumBy.xpath(
					"//*/android.widget.ScrollView/android.widget.LinearLayout/android.widget.FrameLayout[1]/android.view.View");
			androidUser.getWaiter()
					.until(ExpectedConditions.elementToBeClickable(appiumDriver.findElement(localVideoLocator)));
			// Subscriber view
			By remoteVideoLocator = AppiumBy.xpath(
					"//*/android.widget.ScrollView/android.widget.LinearLayout/android.widget.FrameLayout[2]/android.view.View");
			androidUser.getWaiter()
					.until(ExpectedConditions.elementToBeClickable(appiumDriver.findElement(remoteVideoLocator)));

			// Check Android's subscriber video is green
			Map<String, Long> rgb = getAverageColorOfElement(appiumDriver, remoteVideoLocator);
			// Wait until average color is green
			int retries = 15;
			while (retries > 0 && !checkAverageRgbGreen(rgb)) {
				Thread.sleep(1000);
				rgb = getAverageColorOfElement(appiumDriver, remoteVideoLocator);
				log.info("Average RGB for remote video in Android: R={} G={} B={}", rgb.get("r"), rgb.get("g"),
						rgb.get("b"));
				retries--;
			}
			Assertions.assertTrue(checkAverageRgbGreen(rgb), "Remote video is not average green");

			appiumDriver.findElement(By.id("start_finish_call")).click();
			
			// Wait for the form to be visible again after leaving the session
			WebElement urlInputAfterLeave = androidUser.getWaiter().until(
					ExpectedConditions.elementToBeClickable(By.id("openvidu_url")));
			Assertions.assertTrue(urlInputAfterLeave.isEnabled());

			chromeUser.getEventManager().waitUntilEventReaches("streamDestroyed", 1);
			chromeUser.getEventManager().waitUntilEventReaches("connectionDestroyed", 1);

			gracefullyLeaveParticipants(chromeUser, 1);

		} finally {
			if (chromeUser != null) {
				chromeUser.dispose();
			}
		}
	}

	private String getToken(String sessionId) throws Exception {
		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		try {
			restClient.restString(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId': '" + sessionId + "'}",
					HttpURLConnection.HTTP_OK);
		} catch (Exception e) {
			restClient.restString(HttpMethod.POST, "/openvidu/api/sessions", "{'customSessionId': '" + sessionId + "'}",
					HttpURLConnection.HTTP_CONFLICT);
		}
		JsonObject response = restClient.rest(HttpMethod.POST, "/openvidu/api/sessions/" + sessionId + "/connection",
				"{}",
				HttpURLConnection.HTTP_OK);
		return response.get("token").getAsString();
	}

	private Map<String, Long> getAverageColorOfElement(WebDriver driver, By locator) throws IOException {
		byte[] bytes = driver.findElement(locator).getScreenshotAs(OutputType.BYTES);
		InputStream is = new ByteArrayInputStream(bytes);
		BufferedImage bi = ImageIO.read(is);
		return averageColor(bi);
	}

	private Map<String, Long> averageColor(BufferedImage image) {
		int width = image.getWidth();
		int height = image.getHeight();
		long sumr = 0, sumg = 0, sumb = 0;
		for (int x = 0; x < width; x++) {
			for (int y = 0; y < height; y++) {
				Color pixel = new Color(image.getRGB(x, y));
				sumr += pixel.getRed();
				sumg += pixel.getGreen();
				sumb += pixel.getBlue();
			}
		}
		int numPixels = width * height;
		return Map.of("r", (sumr / numPixels), "g", (sumg / numPixels), "b", (sumb / numPixels));
	}

	private boolean checkAverageRgbGreen(Map<String, Long> rgb) {
		return (rgb.get("r") < 30) && (rgb.get("g") > 120) && (rgb.get("b") < 30);
	}

}
