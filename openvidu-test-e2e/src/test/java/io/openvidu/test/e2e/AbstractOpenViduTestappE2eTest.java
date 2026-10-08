package io.openvidu.test.e2e;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.minio.BucketExistsArgs;
import io.minio.DownloadObjectArgs;
import io.minio.MinioClient;
import io.openvidu.test.browsers.BrowserUser;

import static org.openqa.selenium.OutputType.BASE64;

public class AbstractOpenViduTestappE2eTest extends OpenViduTestE2e {

	protected Collection<OpenViduTestappUser> testappUsers = new HashSet<>();

	protected String getLivekitWssUrlFromReadyCheckContainer() {
		String logs = commandLine.executeCommand("docker logs ready-check 2>&1", 30);
		if (logs != null && !logs.isBlank()) {

			/*-----------------LiveKit Server API-----------------
				- Access from this machine:
					- http://localhost:7880
					- ws://localhost:7880
				- Access from other devices in your LAN:
					- https://10-10-1-203.openvidu-local.dev:7443
					- wss://10-10-1-203.openvidu-local.dev:7443   <-- We want this value
				- Credentials:
					- API Key: devkey
					- API Secret: secret
			----------------------------------------------------*/

			java.util.regex.Matcher m = java.util.regex.Pattern
					.compile(
							"LiveKit Server API.*?Access from other devices in your LAN.*?(wss://[A-Za-z0-9.\\-]+:\\d+)",
							java.util.regex.Pattern.DOTALL)
					.matcher(logs);
			if (m.find()) {
				return m.group(1);
			}
		}
		return null;
	}

	/**
	 * Get ready to open bridged ("chromeNetwork") browsers, the only ones that
	 * {@link NetworkConditioner} can impair, and return the secure LiveKit URL they
	 * must connect to.
	 */
	protected String prepareNetemBrowsers() {
		String secureLivekitUrl = getLivekitWssUrlFromReadyCheckContainer();
		Assertions.assertNotNull(secureLivekitUrl,
				"Could not obtain the LiveKit wss:// URL from the 'ready-check' container log. Is openvidu-local-deployment running? ");
		log.info("Using LiveKit URL: {}", secureLivekitUrl);

		// Bridged browsers live in their own Docker network and reach the SFU through
		// this public wildcard name: pin its address so that they never depend on the
		// runner's DNS to open the signaling WebSocket
		pinHostForNetemBrowser(secureLivekitUrl);

		NetworkConditioner.pullImages();
		return secureLivekitUrl;
	}

	/**
	 * Open the openvidu-testapp in a new bridged ("chromeNetwork") browser, with
	 * the connection settings filled in and its events being polled.
	 */
	protected OpenViduTestappUser setupNetemBrowserUser(String secureLivekitUrl) throws Exception {
		OpenViduTestappUser user = new OpenViduTestappUser(setupBrowser("chromeNetwork"));
		this.testappUsers.add(user);
		// Connect to the openvidu-testapp through "host.docker.internal"
		user.getDriver().get(APP_URL.replace("localhost", "host.docker.internal"));
		WebElement urlInput = user.getDriver().findElement(By.id("livekit-url"));
		urlInput.clear();
		urlInput.sendKeys(secureLivekitUrl);
		WebElement keyInput = user.getDriver().findElement(By.id("livekit-api-key"));
		keyInput.clear();
		keyInput.sendKeys(LIVEKIT_API_KEY);
		WebElement secretInput = user.getDriver().findElement(By.id("livekit-api-secret"));
		secretInput.clear();
		secretInput.sendKeys(LIVEKIT_API_SECRET);
		user.getEventManager().startPolling();
		return user;
	}

	private void connectToOpenViduTestApp(OpenViduTestappUser user) {
		try {
			user.getDriver().get(APP_URL);
			user.getWaiter().until(ExpectedConditions.presenceOfElementLocated(By.id("livekit-url")));
		} catch (TimeoutException e) {
			// Dump diagnostics and retry once with a reload before giving up
			String screenshot = "data:image/png;base64,"
					+ ((TakesScreenshot) user.getDriver()).getScreenshotAs(BASE64);
			System.out.println("TIMEOUT WAITING FOR " + APP_URL + " TO LOAD (" + firstLine(e.getMessage())
					+ "), RETRYING ONCE. Page source:");
			System.out.println(user.getDriver().getPageSource());
			System.out.println(screenshot);
			user.getDriver().get(APP_URL);
			user.getWaiter().until(ExpectedConditions.presenceOfElementLocated(By.id("livekit-url")));
		}
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

	private static String firstLine(String message) {
		if (message == null) {
			return "";
		}
		int eol = message.indexOf('\n');
		return eol == -1 ? message : message.substring(0, eol);
	}

	/**
	 * Waits for every browser task of a parallel-browser test and, if any failed,
	 * fails the test reporting all the failures.
	 */
	protected void awaitBrowserTasks(Future<?>... tasks) {
		final int capSeconds = 300;
		List<Throwable> failures = new ArrayList<>();
		for (int i = 0; i < tasks.length; i++) {
			try {
				tasks[i].get(capSeconds, TimeUnit.SECONDS);
			} catch (ExecutionException e) {
				Throwable cause = e.getCause() != null ? e.getCause() : e;
				log.error("Browser task {} of {} failed", i + 1, tasks.length, cause);
				failures.add(cause);
			} catch (java.util.concurrent.TimeoutException e) {
				tasks[i].cancel(true);
				AssertionError stuck = new AssertionError("Browser task " + (i + 1) + " of " + tasks.length
						+ " did not finish within " + capSeconds + " s and was cancelled");
				log.error("Browser task {} of {} did not finish within {} s, cancelling it", i + 1, tasks.length,
						capSeconds);
				failures.add(stuck);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				throw new RuntimeException("Interrupted while waiting for the browser tasks", e);
			}
		}
		if (!failures.isEmpty()) {
			StringBuilder message = new StringBuilder("Error while running browsers in parallel: ")
					.append(failures.size()).append(" of ").append(tasks.length).append(" browser task(s) failed");
			for (Throwable failure : failures) {
				message.append("\n  - ").append(failure.getClass().getSimpleName()).append(": ")
						.append(firstLine(failure.getMessage()));
			}
			// The first failure is the cause; the others travel as suppressed exceptions so
			// that every stack trace ends up in the surefire report as well
			Throwable first = failures.get(0);
			for (int i = 1; i < failures.size(); i++) {
				first.addSuppressed(failures.get(i));
			}
			Assertions.fail(message.toString(), first);
		}
	}

	protected OpenViduTestappUser setupBrowserAndConnectToOpenViduTestapp(String browser) throws Exception {
		BrowserUser browserUser = this.setupBrowser(browser);
		OpenViduTestappUser testappUser = new OpenViduTestappUser(browserUser);
		this.testappUsers.add(testappUser);
		this.connectToOpenViduTestApp(testappUser);
		return testappUser;
	}

	protected String getNetemContainerName(OpenViduTestappUser user) {
		return this.getNetemContainerName(user.getBrowserUser());
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

	protected static final long WAIT_UNTIL_MAX_MILLIS = 20000;

	// Minimum average frame rate that a subscriber video must sustain over a
	// window of at least MIN_FRAMES_DECODED_WINDOW_MILLIS to be considered
	// properly decoded and played
	protected static final long MIN_FRAMES_DECODED_FPS = 4;
	protected static final long MIN_FRAMES_DECODED_WINDOW_MILLIS = 2000;

	protected static void pullRemoteBrowserImages() {
		pullRemoteBrowserImage("REMOTE_URL_CHROME", "selenium/standalone-chrome:" + CHROME_VERSION);
		pullRemoteBrowserImage("REMOTE_URL_FIREFOX", "selenium/standalone-firefox:" + FIREFOX_VERSION);
		pullRemoteBrowserImage("REMOTE_URL_EDGE", "selenium/standalone-edge:" + EDGE_VERSION);
	}

	protected static void pullRemoteBrowserImage(String remoteUrlProperty, String image) {
		if (System.getProperty(remoteUrlProperty) == null) {
			return; // This browser runs as a native driver here. No Docker image to pull
		}
		try {
			log.info("Pre-pulling Selenium image {}", image);
			commandLine.executeCommand("docker pull " + image, 300);
		} catch (Exception e) {
			System.err.println("Pre-pull of " + image + " failed: " + e.getMessage());
		}
	}

	protected int countNumberOfPublishedLayers(OpenViduTestappUser user, WebElement publisherVideo) {
		JsonArray json = this.getLayersAsJsonArray(user, publisherVideo);
		return json.size();
	}

	protected int getSubscriberVideoFrameWidth(OpenViduTestappUser user, WebElement subscriberVideo) {
		return getSubscriberVideoLayerStat(user, subscriberVideo, "frameWidth", JsonElement::getAsInt);
	}

	protected int getSubscriberVideoFrameHeight(OpenViduTestappUser user, WebElement subscriberVideo) {
		return getSubscriberVideoLayerStat(user, subscriberVideo, "frameHeight", JsonElement::getAsInt);
	}

	protected long getSubscriberVideoBytesReceived(OpenViduTestappUser user, WebElement subscriberVideo) {
		return getSubscriberVideoLayerStat(user, subscriberVideo, "bytesReceived", JsonElement::getAsLong);
	}

	protected int getSubscriberVideoFramesPerSecond(OpenViduTestappUser user, WebElement subscriberVideo) {
		return getSubscriberVideoLayerStat(user, subscriberVideo, "framesPerSecond", JsonElement::getAsInt);
	}

	protected long getSubscriberVideoFramesDecoded(OpenViduTestappUser user, WebElement subscriberVideo) {
		return getSubscriberVideoLayerStat(user, subscriberVideo, "framesDecoded", JsonElement::getAsLong);
	}

	protected long getSubscriberVideoFramesReceived(OpenViduTestappUser user, WebElement subscriberVideo) {
		return getSubscriberVideoLayerStat(user, subscriberVideo, "framesReceived", JsonElement::getAsLong);
	}

	protected String getSubscriberVideoCodec(OpenViduTestappUser user, WebElement subscriberVideo) {
		return getSubscriberVideoLayerStat(user, subscriberVideo, "codec", JsonElement::getAsString);
	}

	protected <T> T getSubscriberVideoLayerStat(OpenViduTestappUser user, WebElement subscriberVideo, String field,
			java.util.function.Function<JsonElement, T> extractor) {
		final long deadline = System.currentTimeMillis() + WAIT_UNTIL_MAX_MILLIS;
		JsonElement element = null;
		do {
			try {
				element = getLayersAsJsonArray(user, subscriberVideo).get(0).getAsJsonObject().get(field);
			} catch (Exception e) {
				element = null;
			}
			if (element == null || element.isJsonNull()) {
				try {
					Thread.sleep(250);
				} catch (InterruptedException e) {
					Thread.currentThread().interrupt();
				}
			}
		} while ((element == null || element.isJsonNull()) && System.currentTimeMillis() < deadline);
		if (element == null || element.isJsonNull()) {
			Assertions.fail("Timeout waiting for " + field + " to exist");
		}
		return extractor.apply(element);
	}

	// Several stats of the same subscriber layer, taken from a single info dialog
	// update. Sampling them one by one through getSubscriberVideoLayerStat would
	// pay a full dialog read for each one of them
	protected JsonObject getSubscriberVideoLayer(OpenViduTestappUser user, WebElement subscriberVideo) {
		JsonArray layers = this.getLayersAsJsonArray(user, subscriberVideo);
		return layers.isEmpty() ? new JsonObject() : layers.get(0).getAsJsonObject();
	}

	// Cumulative counter of the given layer, or -1 if it is not there
	protected long getLayerCounter(JsonObject layer, String field) {
		JsonElement element = layer.get(field);
		return element == null || element.isJsonNull() ? -1 : element.getAsLong();
	}

	// getLayerCounter returns -1 for a stat that getStats() is not reporting yet.
	// Absent is "unknown", not a value, so it must never satisfy a wait. Every
	// waitUntilAux predicate below states that explicitly instead of relying on
	// -1 happening to fail its own comparison: that holds for ==, > and >=, but
	// NOT for != ("changes") predicates, where a bogus -1 differs from any real
	// value and would otherwise look exactly like the change being waited for
	protected boolean isStatPresent(long statValue) {
		return statValue >= 0;
	}

	// Never report an absent stat back as a bogus -1 value
	protected String describeStat(long statValue) {
		return isStatPresent(statValue) ? String.valueOf(statValue) : "absent";
	}

	// Every subscriber stat that says something about the state of the inbound
	// video, so that a wait that times out reports what it actually saw instead
	// of only the one value it was comparing
	protected String describeSubscriberVideoLayer(JsonObject layer) {
		return "Last observed: frameWidth=" + describeStat(getLayerCounter(layer, "frameWidth")) + " frameHeight="
				+ describeStat(getLayerCounter(layer, "frameHeight")) + " framesPerSecond="
				+ describeStat(getLayerCounter(layer, "framesPerSecond")) + " framesReceived="
				+ describeStat(getLayerCounter(layer, "framesReceived")) + " framesDecoded="
				+ describeStat(getLayerCounter(layer, "framesDecoded")) + " keyFramesDecoded="
				+ describeStat(getLayerCounter(layer, "keyFramesDecoded")) + " framesDropped="
				+ describeStat(getLayerCounter(layer, "framesDropped")) + " freezeCount="
				+ describeStat(getLayerCounter(layer, "freezeCount")) + " bytesReceived="
				+ describeStat(getLayerCounter(layer, "bytesReceived"));
	}

	// The three states a stalled subscriber video can be in, told apart by
	// framesReceived (frames the depacketizer assembled, before the decoder) and
	// framesDecoded. bytesReceived alone cannot tell them apart: it also counts
	// retransmissions and the padding the SFU sends to probe for bandwidth, so it
	// grows even while no frame at all reaches the decoder
	protected String diagnoseSubscriberVideoLayer(JsonObject layer) {
		long framesReceived = getLayerCounter(layer, "framesReceived");
		long framesDecoded = getLayerCounter(layer, "framesDecoded");
		if (!isStatPresent(framesReceived) || !isStatPresent(framesDecoded)) {
			return "getStats() reported no frame counters for this track, so the subscriber never got as far as"
					+ " receiving media on it";
		}
		if (framesReceived <= 0) {
			return "The subscriber is not receiving assembled frames at all: the media is not reaching it";
		}
		if (framesDecoded <= 0) {
			return "The subscriber IS receiving assembled frames (" + framesReceived
					+ ") but decoded none of them: the media that reaches it is undecodable (a Producer bound to"
					+ " the wrong codec, or a missing or wrong dependency descriptor)";
		}
		return "The subscriber received " + framesReceived + " assembled frame(s) and decoded " + framesDecoded
				+ " of them, so media did flow at some point";
	}

	// If rid is null, retrieve the first layer
	protected JsonElement getPublisherVideoLayerAttribute(OpenViduTestappUser user, WebElement publisherVideo,
			String rid,
			String attribute) {
		JsonArray json = this.getLayersAsJsonArray(user, publisherVideo);
		JsonElement result;
		if (rid != null) {
			result = json.asList().stream().parallel()
					.filter(jsonElement -> rid.equals(jsonElement.getAsJsonObject().get("rid").getAsString())).findAny()
					.get();
		} else {
			result = json.get(0);
		}
		return result.getAsJsonObject().get(attribute);
	}

	protected String getLayersAsString(OpenViduTestappUser user, WebElement video) {
		this.openInfoDialog(user, video);
		user.getDriver().findElement(By.cssSelector("#update-value-btn")).click();
		WebElement textarea = user.getDriver().findElement(By.id("info-text-area"));
		return textarea.getAttribute("value");
	}

	protected JsonArray getLayersAsJsonArray(OpenViduTestappUser user, WebElement video) {
		String value = getLayersAsString(user, video);
		return JsonParser.parseString(value).getAsJsonArray();
	}

	protected void waitUntilVideoLayersNotEmpty(OpenViduTestappUser user, WebElement videoElement) {
		this.waitUntilAux(user, videoElement, () -> {
			String value = getLayersAsString(user, videoElement);
			return !value.isBlank() && !JsonParser.parseString(value).getAsJsonArray().isEmpty();
		}, "Timeout waiting video layers to not be empty");
	}

	protected void waitUntilSubscriberFramesPerSecondNotZero(OpenViduTestappUser user, WebElement videoElement) {
		// Kept across iterations only to report what the last sample actually held
		// if the wait times out. An absent framesPerSecond and a present 0 mean very
		// different things here, and neither of them says whether the media reached
		// the subscriber at all: only framesReceived (frames the depacketizer
		// assembled) against framesDecoded tells "nothing is arriving" from
		// "something is arriving that the decoder cannot use"
		final JsonObject[] lastLayer = { new JsonObject() };
		this.waitUntilAux(user, videoElement, () -> {
			// Chrome only starts reporting framesPerSecond once the decoder has
			// produced frames for a whole second, so right after playback starts
			// it is legitimately absent for a while: a "not yet", not a failure
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			lastLayer[0] = layer;
			long fps = this.getLayerCounter(layer, "framesPerSecond");
			return isStatPresent(fps) && fps > 0;
		}, () -> {
			long fps = this.getLayerCounter(lastLayer[0], "framesPerSecond");
			return "Timeout waiting for video track to have a framesPerSecond greater than 0. Last value: "
					+ describeStat(fps)
					+ (isStatPresent(fps) ? ""
							: ". Chrome omits framesPerSecond altogether when the decoder produced no frame"
									+ " during the last second, so this subscriber video was frozen for the"
									+ " whole wait, not merely slow to start")
					+ ". " + describeSubscriberVideoLayer(lastLayer[0]) + ". "
					+ diagnoseSubscriberVideoLayer(lastLayer[0]);
		});
	}

	protected void waitUntilSubscriberFramesPerSecondIs(OpenViduTestappUser user, WebElement videoElement, int fps) {
		this.waitUntilAux(user, videoElement, () -> {
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			long currentFps = this.getLayerCounter(layer, "framesPerSecond");
			// An absent framesPerSecond is not the same as a reported 0: this wait
			// only ever settles on a value getStats() actually reported
			return isStatPresent(currentFps) && currentFps == fps;
		}, "Timeout waiting for video track to have a framesPerSecond equal to " + fps);
	}

	protected void waitUntilSubscriberFrameWidthIs(OpenViduTestappUser user, WebElement videoElement,
			final int expectedFrameWidth) {
		final JsonObject[] lastLayer = { new JsonObject() };
		this.waitUntilAux(user, videoElement, () -> {
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			lastLayer[0] = layer;
			long frameWidth = this.getLayerCounter(layer, "frameWidth");
			return isStatPresent(frameWidth) && frameWidth == expectedFrameWidth;
		}, () -> "Timeout waiting for video track to have a frameWidth of " + expectedFrameWidth + ". "
				+ describeSubscriberVideoLayer(lastLayer[0]));
	}

	protected void waitUntilSubscriberFrameHeightIs(OpenViduTestappUser user, WebElement videoElement,
			final int expectedFrameHeight) {
		this.waitUntilAux(user, videoElement, () -> {
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			long frameHeight = this.getLayerCounter(layer, "frameHeight");
			return isStatPresent(frameHeight) && frameHeight == expectedFrameHeight;
		}, "Timeout waiting for video track to have a frameHeight of " + expectedFrameHeight);
	}

	protected void waitUntilSubscriberFrameWidthChanges(OpenViduTestappUser user, WebElement videoElement,
			final int oldFrameWidth, final boolean shouldBeHigher) {
		final JsonObject[] lastLayer = { new JsonObject() };
		this.waitUntilAux(user, videoElement, () -> {
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			lastLayer[0] = layer;
			long frameWidth = this.getLayerCounter(layer, "frameWidth");
			return isStatPresent(frameWidth) && frameWidth != oldFrameWidth;
		}, () -> "Timeout waiting for video track to reach a " + (shouldBeHigher ? "higher" : "lower")
				+ " resolution than " + oldFrameWidth + ". " + describeSubscriberVideoLayer(lastLayer[0]) + ". "
				// frameWidth is the width of the last frame the decoder produced, so a
				// video that froze keeps reporting the old width forever and looks
				// exactly like a layer switch that never happened
				+ diagnoseSubscriberVideoLayer(lastLayer[0]));
		int newFrameWidth = this.getSubscriberVideoFrameWidth(user, videoElement);
		if (shouldBeHigher) {
			Assertions.assertTrue(newFrameWidth > oldFrameWidth,
					"Video track should have now a higher resolution, but it is not. Old width: " + oldFrameWidth
							+ ". New width: " + newFrameWidth);
		} else {
			Assertions.assertTrue(newFrameWidth < oldFrameWidth,
					"Video track should have now a lower resolution, but it is not. Old width: " + oldFrameWidth
							+ ". New width: " + newFrameWidth);
		}
	}

	protected void waitUntilSubscriberBytesReceivedIncrease(OpenViduTestappUser user, WebElement videoElement,
			final long previousBytesReceived) {
		this.waitUntilAux(user, videoElement, () -> {
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			long bytesReceived = this.getLayerCounter(layer, "bytesReceived");
			return isStatPresent(bytesReceived) && bytesReceived > previousBytesReceived;
		}, "Timeout waiting for subscriber track to increase its bytesReceived from " + previousBytesReceived);
	}

	// A subscriber video is only properly received AND played if its decoder keeps
	// producing new frames at a sustained rate. Receiving bytes is not enough: a
	// subscriber may receive media that it is not able to decode at all. And a
	// single new decoded frame is not enough either: a video that only decodes one
	// or two frames over a timespan of several seconds is a frozen video, not a
	// playing one, and must fail the test. So framesDecoded is required to grow at
	// MIN_FRAMES_DECODED_FPS or more, averaged over a window of at least
	// MIN_FRAMES_DECODED_WINDOW_MILLIS
	protected void waitUntilSubscriberFramesDecodedIncrease(OpenViduTestappUser user, WebElement videoElement) {
		final long initialFramesDecoded = this.getSubscriberVideoFramesDecoded(user, videoElement);
		final long initialFramesReceived = this.getSubscriberVideoFramesReceived(user, videoElement);
		final long windowStart = System.currentTimeMillis();
		// Last sample taken by the loop, only to report it if the wait times out
		final java.util.concurrent.atomic.AtomicLong lastFramesDecoded = new java.util.concurrent.atomic.AtomicLong();
		final java.util.concurrent.atomic.AtomicLong lastFramesReceived = new java.util.concurrent.atomic.AtomicLong();
		final java.util.concurrent.atomic.AtomicLong lastWindowMillis = new java.util.concurrent.atomic.AtomicLong();
		this.waitUntilAux(user, videoElement, () -> {
			// Both counters must come from the very same dialog update: sampling
			// them one by one would double the cost of every iteration
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			long framesDecoded = this.getLayerCounter(layer, "framesDecoded");
			long framesReceived = this.getLayerCounter(layer, "framesReceived");
			if (framesDecoded < 0 || framesReceived < 0) {
				return false;
			}
			long windowMillis = System.currentTimeMillis() - windowStart;
			lastFramesDecoded.set(framesDecoded - initialFramesDecoded);
			lastFramesReceived.set(framesReceived - initialFramesReceived);
			lastWindowMillis.set(windowMillis);
			// The window keeps growing while waiting, so a video that decodes a
			// frame every now and then falls further behind the required rate
			// instead of eventually satisfying it
			return windowMillis >= MIN_FRAMES_DECODED_WINDOW_MILLIS
					&& lastFramesDecoded.get() * 1000 >= MIN_FRAMES_DECODED_FPS * windowMillis;
		}, () -> {
			long framesDecoded = lastFramesDecoded.get();
			long framesReceived = lastFramesReceived.get();
			long windowMillis = lastWindowMillis.get();
			// framesReceived counts the frames the depacketizer assembled, before
			// handing them to the decoder. Comparing it against framesDecoded tells
			// apart three failures that otherwise all look like "no video"
			String diagnosis;
			if (framesReceived <= 0) {
				diagnosis = "The subscriber is not receiving assembled frames at all:"
						+ " the media is not reaching it";
			} else if (framesDecoded <= 0) {
				diagnosis = "The subscriber IS receiving assembled frames (" + framesReceived
						+ ") but decoded none of them: the media that reaches it is undecodable"
						+ " (a Producer bound to the wrong codec, or a missing or wrong dependency"
						+ " descriptor)";
			} else {
				diagnosis = "The subscriber received " + framesReceived + " assembled frame(s) and decoded "
						+ framesDecoded + " of them, but too slowly for a video that is actually playing";
			}
			return "Timeout waiting for subscriber track to decode video at a sustained frame rate: only "
					+ framesDecoded + " frame(s) decoded in " + windowMillis + " ms ("
					+ String.format("%.2f", framesDecoded * 1000d / Math.max(1, windowMillis))
					+ " fps), while at least " + MIN_FRAMES_DECODED_FPS
					+ " fps are required. Such a subscriber video is a frozen video. " + diagnosis;
		});
	}

	protected void waitUntilPublisherBytesSentIncrease(OpenViduTestappUser user, WebElement videoElement, String rid,
			final long previousBytesSent) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getPublisherVideoLayerAttribute(user, videoElement, rid, "bytesSent")
					.getAsLong() > previousBytesSent;
		}, "Timeout waiting for publisher track to increase its bytesSent from " + previousBytesSent);
	}

	protected void waitUntilPublisherFramesEncodedIncrease(OpenViduTestappUser user, WebElement videoElement,
			String rid,
			final long previousFramesEncoded) {
		this.waitUntilAux(user, videoElement, () -> {
			return this.getPublisherVideoLayerAttribute(user, videoElement, rid, "framesEncoded")
					.getAsLong() > previousFramesEncoded;
		}, "Timeout waiting for publisher track to increase its framesEncoded from " + previousFramesEncoded);
	}

	protected void waitUntilPublisherLayerActive(OpenViduTestappUser user, final WebElement publisherVideo,
			final String rid, final boolean active) {
		this.waitUntilAux(user, publisherVideo, () -> {
			boolean currentlyActive = this.getPublisherVideoLayerAttribute(user, publisherVideo, rid, "active")
					.getAsBoolean();
			if (active) {
				JsonElement frameWidth = this.getPublisherVideoLayerAttribute(user, publisherVideo, rid, "frameWidth");
				return currentlyActive && frameWidth != null;
			} else {
				return !currentlyActive;
			}
		}, "Timeout waiting for video track layer to be " + (active ? "active" : "inactive"));
	}

	protected void waitUntilAux(OpenViduTestappUser user, WebElement videoElement,
			Callable<Boolean> breakFromLoopFunction, String errMsg) {
		this.waitUntilAux(user, videoElement, breakFromLoopFunction, () -> errMsg);
	}

	// Same as above, but building the error message only if the wait times out, so
	// that it can report the values actually observed by the last iteration
	protected void waitUntilAux(OpenViduTestappUser user, WebElement videoElement,
			Callable<Boolean> breakFromLoopFunction, java.util.function.Supplier<String> errMsg) {
		try {
			final long intervalWait = 250;
			final long deadline = System.currentTimeMillis() + WAIT_UNTIL_MAX_MILLIS;
			boolean breakFromLoop = false;
			while (!breakFromLoop && System.currentTimeMillis() < deadline) {
				try {
					breakFromLoop = breakFromLoopFunction.call();
				} catch (Exception | AssertionError e1) {
					e1.printStackTrace();
				}
				if (breakFromLoop) {
					break;
				} else {
					try {
						Thread.sleep(intervalWait);
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
				}
			}
			if (!breakFromLoop) {
				Assertions.fail(errMsg.get());
			}
		} finally {
			// Best-effort close of the info dialog
			try {
				if (!user.getDriver().findElements(By.cssSelector("#close-dialog-btn")).isEmpty()) {
					this.waitAndClick(user, "#close-dialog-btn");
					Thread.sleep(500);
				}
			} catch (Exception e) {
				log.warn("Best-effort info-dialog close failed (ignored): {}", e.getMessage());
			}
		}
	}

	protected void openInfoDialog(OpenViduTestappUser user, WebElement video) {
		String videoId = video.getDomProperty("id");
		// Open the track info dialog if required
		boolean dialogWasOpened;
		if (!user.getDriver().findElements(By.cssSelector("app-info-dialog")).isEmpty()) {
			// Dialog already opened
			if (!user.getDriver().findElement(By.cssSelector("#subtitle")).getText().equals(videoId)) {
				// Wrong dialog
				this.waitAndClick(user, "#close-dialog-btn");
				this.waitAndClick(user, "#" + videoId + " ~ .bottom-div .video-track-info");
				dialogWasOpened = true;
			} else {
				dialogWasOpened = false;
			}
		} else {
			// Dialog is not opened
			this.waitAndClick(user, "#" + videoId + " ~ .bottom-div .video-track-info");
			dialogWasOpened = true;
		}
		if (dialogWasOpened) {
			try {
				Thread.sleep(300);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}

	protected void addPublisherSubscriber(OpenViduTestappUser user, boolean hasAudio, boolean hasVideo)
			throws InterruptedException {
		this.addPublisher(user, true, true, true, true, hasAudio, hasVideo, null, null, null);
	}

	protected void addOnlyPublisherVideo(OpenViduTestappUser user, boolean simulcast, boolean dynacast, boolean hd)
			throws InterruptedException {
		if (hd) {
			this.addPublisher(user, false, simulcast, dynacast, false, false, true, 1920, 1080, null);
		} else {
			this.addPublisher(user, false, simulcast, dynacast, false, false, true, null, null, null);
		}
	}

	protected void addOnlyPublisherVideo(OpenViduTestappUser user, boolean simulcast, boolean dynacast, boolean hd,
			String scalabilityMode)
			throws InterruptedException {
		if (hd) {
			this.addPublisher(user, false, simulcast, dynacast, false, false, true, 1920, 1080, scalabilityMode);
		} else {
			this.addPublisher(user, false, simulcast, dynacast, false, false, true, null, null, null);
		}
	}

	protected void addOnlyPublisherAudio(OpenViduTestappUser user) throws InterruptedException {
		this.addPublisher(user, false, false, false, false, true, false, null, null, null);
	}

	protected void addPublisher(OpenViduTestappUser user, boolean isSubscriber, boolean simulcast, boolean dynacast,
			boolean adaptiveStream, boolean hasAudio, boolean hasVideo, Integer width, Integer height,
			String scalabilityMode) throws InterruptedException {
		if (!user.getDriver().findElements(By.id("close-dialog-btn")).isEmpty()) {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}
		final int previousInstances = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size();
		user.getDriver().findElement(By.id("add-user-btn")).click();
		// The new instance is rendered asynchronously: counting the instances right
		// after the click can still see only the previous ones, and then every
		// "#openvidu-instance-<index>" selector built from that count is off by one
		// (with a single instance it even becomes "#openvidu-instance--1")
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("app-openvidu-instance"),
				previousInstances + 1));
		int numberOfUser = previousInstances;
		if (!isSubscriber) {
			user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + numberOfUser + " .subscriber-checkbox"))
					.click();
		}
		this.waitAndClick(user, "#room-options-btn-" + numberOfUser);
		Thread.sleep(300);
		if (!hasAudio) {
			user.getDriver().findElement(By.id("audio-capture-false")).click();
		} else {
			user.getDriver().findElement(By.id("audio-capture-true")).click();
		}
		if (!hasVideo) {
			user.getDriver().findElement(By.id("video-capture-false")).click();
		} else {
			user.getDriver().findElement(By.id("video-capture-true")).click();
			if (width != null || height != null || scalabilityMode != null) {
				this.setPublisherCustomVideoProperties(user, width, height, scalabilityMode);
			}
		}
		if (!simulcast) {
			user.getDriver().findElement(By.id("trackPublish-simulcast")).click();
		}
		if (!dynacast) {
			user.getDriver().findElement(By.id("room-dynacast")).click();
		}
		if (!adaptiveStream) {
			user.getDriver().findElement(By.id("room-adaptiveStream")).click();
		}
		user.getDriver().findElement(By.id("close-dialog-btn")).click();
		Thread.sleep(300);
	}

	protected void addSubscriber(OpenViduTestappUser user, boolean adaptiveStream) throws InterruptedException {
		if (!user.getDriver().findElements(By.id("close-dialog-btn")).isEmpty()) {
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}
		final int previousInstances = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size();
		user.getDriver().findElement(By.id("add-user-btn")).click();
		// The new instance is rendered asynchronously: counting the instances right
		// after the click can still see only the previous ones, and then every
		// "#openvidu-instance-<index>" selector built from that count is off by one
		// (with a single instance it even becomes "#openvidu-instance--1")
		user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("app-openvidu-instance"),
				previousInstances + 1));
		int numberOfUser = previousInstances;
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + numberOfUser + " .publisher-checkbox"))
				.click();
		if (!adaptiveStream) {
			this.waitAndClick(user, "#room-options-btn-" + numberOfUser);
			this.waitAndClick(user, "#room-adaptiveStream");
			user.getDriver().findElement(By.id("close-dialog-btn")).click();
			Thread.sleep(300);
		}
	}

	protected void createIngress(OpenViduTestappUser user, String preset, String codec, boolean simulcast,
			String urlType,
			String urlUri) throws InterruptedException {
		if (!user.getDriver().findElements(By.id("close-dialog-btn")).isEmpty()) {
			this.waitAndClick(user, "#close-dialog-btn");
			Thread.sleep(300);
		}
		user.getDriver().findElement(By.xpath("//button[contains(@title,'Room API')]")).click();
		if (preset != null) {
			this.selectMatOption(user, "#ingress-preset-select", preset.toUpperCase());
		} else {
			if (!simulcast) {
				this.waitAndClick(user, "#ingress-simulcast");
				Thread.sleep(300);
			}
			this.selectMatOption(user, "#ingress-video-codec-select", codec.toUpperCase());
		}
		if (urlType != null) {
			this.selectMatOption(user, "#ingress-url-type-select", urlType.toUpperCase());
		}
		if (urlUri != null) {
			user.getDriver().findElement(By.cssSelector("#ingress-url-uri-field")).sendKeys(urlUri);
			Thread.sleep(300);
		}
		this.waitAndClick(user, "#create-ingress-api-btn");
		this.waitAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);
	}

	protected void setPublisherSimulcastLayersAndResolution(OpenViduTestappUser user, int numberOfUser,
			String simulcastLayerName, Integer width, Integer height) throws InterruptedException {
		this.waitAndClick(user, "#room-options-btn-" + numberOfUser);
		Thread.sleep(300);
		this.setPublisherCustomVideoProperties(user, width, height, null);
		user.getDriver().findElement(By.id("trackPublish-videoSimulcastLayers")).click();
		this.waitAndClick(user, "#mat-option-" + simulcastLayerName);
		new org.openqa.selenium.interactions.Actions(user.getDriver())
				.sendKeys(org.openqa.selenium.Keys.ESCAPE).perform();
		Thread.sleep(300);
		this.waitAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);
	}

	protected void setPublisherCustomVideoProperties(OpenViduTestappUser user, Integer width, Integer height,
			String scalabilityMode) {
		user.getDriver().findElement(By.id("video-capture-custom")).click();
		if (width != null) {
			WebElement trackWidth = user.getDriver().findElement(By.id("resolution-video-capture-options-width"));
			trackWidth.clear();
			trackWidth.sendKeys(width.toString());
		}
		if (height != null) {
			WebElement trackHeight = user.getDriver().findElement(By.id("resolution-video-capture-options-height"));
			trackHeight.clear();
			trackHeight.sendKeys(height.toString());
		}
		if (scalabilityMode != null) {
			user.getDriver().findElement(By.id("trackPublish-scalabilityMode")).click();
			this.waitAndClick(user, ".mode-" + scalabilityMode);
		}
	}

	/**
	 * Selects the option of a mat-select whose option ids follow the testapp
	 * convention "mat-option-{TEXT}" and whose options display that same text.
	 */
	protected void selectMatOption(OpenViduTestappUser user, String formFieldCssSelector, String optionText)
			throws InterruptedException {
		final By select = By.cssSelector(formFieldCssSelector + " mat-select");
		final int maxAttempts = 5;
		for (int attempt = 1; attempt <= maxAttempts; attempt++) {
			this.waitAndClick(user, formFieldCssSelector);
			this.waitAndClick(user, "#mat-option-" + optionText);
			try {
				// A dedicated short wait: the user's shared WebDriverWait must keep its
				// timeout (withTimeout would change it for every later wait)
				new org.openqa.selenium.support.ui.WebDriverWait(user.getDriver(), java.time.Duration.ofSeconds(2))
						.until(d -> optionText.equals(d.findElement(select).getText().trim()));
				return;
			} catch (org.openqa.selenium.TimeoutException e) {
				log.warn("Selecting option '{}' of {} did not take effect (the select shows '{}'), attempt {}/{}",
						optionText, formFieldCssSelector, user.getDriver().findElement(select).getText().trim(),
						attempt, maxAttempts);
				// A panel left open by a click that only opened it must be closed
				// before retrying
				if (!user.getDriver().findElements(By.cssSelector(".cdk-overlay-backdrop")).isEmpty()) {
					new org.openqa.selenium.interactions.Actions(user.getDriver())
							.sendKeys(org.openqa.selenium.Keys.ESCAPE).perform();
					Thread.sleep(300);
				}
			}
		}
		Assertions.fail("Could not select option '" + optionText + "' of " + formFieldCssSelector + " after "
				+ maxAttempts + " attempts");
	}

	/**
	 * Selects the max video quality (LOW, MEDIUM or HIGH) of the remote video of a
	 * testapp instance, closing the track info dialog first if it is open (its
	 * backdrop covers the video controls).
	 *
	 * The selection is verified (selectMatOption). An unverified click that only
	 * opens and closes the mat-select panel leaves the quality untouched and
	 * raises nothing: setVideoQuality() is never called, no UpdateTrackSettings
	 * ever reaches the server, and the wait that follows times out reporting that
	 * the subscriber never changed layer, when in fact nothing was ever asked of
	 * it.
	 */
	protected void selectSubscriberVideoQuality(OpenViduTestappUser user, String instanceSelector, String quality)
			throws InterruptedException {
		if (!user.getDriver().findElements(By.cssSelector("app-info-dialog")).isEmpty()) {
			this.waitAndClick(user, "#close-dialog-btn");
			Thread.sleep(300);
		}
		this.selectMatOption(user, instanceSelector + " #max-video-quality", quality);
	}

	/**
	 * Waits until the element matching the CSS selector is present, displayed and
	 * enabled, then clicks it, retrying every 250 ms for up to 10 seconds on the
	 * transient failures of a UI that renders asynchronously.
	 * 
	 * It cannot tell a click that landed on the wrong element from a successful
	 * one: for mat-select options use {@link #selectMatOption}, which verifies the
	 * selection.
	 */
	protected void waitAndClick(OpenViduTestappUser user, String cssSelector) {
		final long startTime = System.currentTimeMillis();
		final long timeoutMillis = 10000; // 10 seconds total timeout
		final long retryIntervalMillis = 250; // between retries

		WebElement element = null;

		while (System.currentTimeMillis() - startTime < timeoutMillis) {
			try {
				// Try to find and click the element immediately
				element = user.getDriver().findElement(By.cssSelector(cssSelector));
				if (element.isDisplayed() && element.isEnabled()) {
					element.click();
					return; // Success! Exit the method
				}
			} catch (org.openqa.selenium.ElementClickInterceptedException e) {
				// Element is being intercepted by overlay, continue retrying
			} catch (org.openqa.selenium.NoSuchElementException e) {
				// Element not found, wait a bit and retry
			} catch (org.openqa.selenium.StaleElementReferenceException e) {
				// Element reference is stale, retry with fresh element
			} catch (Exception e) {
				// Any other exception, continue retrying
			}

			// Wait before next retry
			try {
				Thread.sleep(retryIntervalMillis);
			} catch (InterruptedException e) {
				// Print screenshot
				String screenshot = "data:image/png;base64,"
						+ ((TakesScreenshot) user.getDriver()).getScreenshotAs(BASE64);
				System.out.println("INTERRUPTED EXCEPTION WHILE WAITING FOR ELEMENT TO BE CLICKABLE: " + cssSelector);
				System.out.println(screenshot);
				Thread.currentThread().interrupt();
				throw new RuntimeException("Thread interrupted while waiting for the element to be clickable", e);
			}
		}

		String screenshot = "data:image/png;base64," + ((TakesScreenshot) user.getDriver()).getScreenshotAs(BASE64);
		System.out.println("TIMEOUT WAITING FOR ELEMENT TO BE CLICKABLE (): " + cssSelector);
		System.out.println(screenshot);

		// If we get here, we've timed out
		throw new RuntimeException("Timeout waiting for element '" + cssSelector
				+ "' to be present, displayed and enabled after " + timeoutMillis + "ms");
	}

	protected boolean assertAllElementsHaveTracks(OpenViduTestappUser user, String selector, boolean hasAudio,
			boolean hasVideo) {
		org.openqa.selenium.JavascriptExecutor js = (org.openqa.selenium.JavascriptExecutor) user.getDriver();
		String script = "var elements = document.querySelectorAll(arguments[0]);" +
				"for (var i = 0; i < elements.length; i++) {" +
				"    var el = elements[i];" +
				"    if (!el.srcObject) return false;" +
				"    if (arguments[1] && el.srcObject.getAudioTracks().length === 0) return false;" +
				"    if (!arguments[1] && el.srcObject.getAudioTracks().length > 0) return false;" +
				"    if (arguments[2] && el.srcObject.getVideoTracks().length === 0) return false;" +
				"    if (!arguments[2] && el.srcObject.getVideoTracks().length > 0) return false;" +
				"}" +
				"return true;";
		return (Boolean) js.executeScript(script, selector, hasAudio, hasVideo);
	}

	protected void changeElementSize(OpenViduTestappUser user, org.openqa.selenium.WebElement element, int width,
			int height) {
		org.openqa.selenium.JavascriptExecutor js = (org.openqa.selenium.JavascriptExecutor) user.getDriver();
		js.executeScript(
				"arguments[0].style.width = '" + width + "px'; arguments[0].style.height = '" + height + "px';",
				element);
	}

	/**
	 * Waits until the subscriber's video bytesReceived grows between two
	 * consecutive samples. Unlike waitUntilSubscriberBytesReceivedIncrease (which
	 * compares against the very first sample) this tolerates the periodic
	 * inbound-rtp counter restarts Firefox shows with the mediasoup engine: a
	 * low-bitrate stream could otherwise never climb back above a first sample
	 * taken late in a counter window.
	 */
	protected void waitUntilSubscriberBytesReceivedIncreasing(OpenViduTestappUser user, WebElement videoElement) {
		final java.util.concurrent.atomic.AtomicLong previous = new java.util.concurrent.atomic.AtomicLong(
				this.getSubscriberVideoBytesReceived(user, videoElement));
		this.waitUntilAux(user, videoElement, () -> {
			JsonObject layer = this.getSubscriberVideoLayer(user, videoElement);
			long current = this.getLayerCounter(layer, "bytesReceived");
			if (!isStatPresent(current)) {
				// Keep the previous sample as the baseline: overwriting it with an
				// absent value would make the next comparison succeed against -1
				return false;
			}
			return current > previous.getAndSet(current);
		}, "Timeout waiting for the subscriber track bytesReceived to grow between consecutive samples");
	}

	protected void forceCodec(OpenViduTestappUser user, int numberOfUser, String codec) throws InterruptedException {
		forceCodec(user, numberOfUser, codec, true);
	}

	protected void forceCodec(OpenViduTestappUser user, int numberOfUser, String codec, boolean disableBackupCodec)
			throws InterruptedException {
		String codecLowerCase = codec.toLowerCase();
		this.waitAndClick(user, "#room-options-btn-" + numberOfUser);
		Thread.sleep(300);
		if (disableBackupCodec) {
			// Enabled by default
			user.getDriver().findElement(By.id("trackPublish-backupCodec")).click();
		}
		user.getDriver().findElement(By.id("trackPublish-videoCodec")).click();
		this.waitAndClick(user, "#mat-option-" + codecLowerCase);
		this.waitAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);
	}

	protected JsonObject waitUntilEgressStatus(OpenViduTestappUser user, String egressId, String egressStatus,
			int timeoutMillis) {
		final int intervalWait = 250;
		final int MAX_ITERATIONS = timeoutMillis / intervalWait;
		int iteration = 0;
		boolean egressActive = false;
		JsonObject egressObject = null;

		while (!egressActive && iteration < MAX_ITERATIONS) {
			iteration++;
			try {
				user.getDriver().findElement(By.cssSelector("#list-egress-api-btn")).click();
				String textareaContent = user.getDriver().findElement(By.cssSelector("#api-response-text-area"))
						.getDomProperty("value");
				JsonArray egressArray = JsonParser.parseString(textareaContent).getAsJsonArray();

				// Find the egress object with the matching egressId
				JsonObject targetEgress = null;
				for (int i = 0; i < egressArray.size(); i++) {
					egressObject = egressArray.get(i).getAsJsonObject();
					if (egressId.equals(egressObject.get("egressId").getAsString())) {
						targetEgress = egressObject;
						break;
					}
				}

				if (targetEgress != null && egressStatus.equals(targetEgress.get("status").getAsString())) {
					egressActive = true;
				}
			} catch (Exception e) {
				// Continue polling if there's an exception
			}

			if (!egressActive) {
				try {
					Thread.sleep(intervalWait);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}
		}

		if (!egressActive) {
			Assertions.fail("Timeout waiting for egress '" + egressId + "' to reach status '" + egressStatus + "'");
		}
		return egressObject;
	}

	protected boolean isMinioAvailable() {
		MinioClient minioClient = MinioClient.builder().endpoint("localhost", 9000, false)
				.credentials("minioadmin", "minioadmin").build();
		try {
			minioClient.bucketExists(BucketExistsArgs.builder().bucket("openvidu-appdata").build());
			return true;
		} catch (Exception e) {
			return false;
		}
	}

	/**
	 * Records the video track of a Chrome publisher with Track Egress and checks
	 * the file. {@code codec} is vp8, h264, vp9 or av1 (only openvidu/egress-pro
	 * writes AV1); {@code layers} is "single", "simulcast" or a scalability mode.
	 */
	protected void trackEgressVideoCodec(String codec, String layers) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp("chrome");

		log.info("Track egress {} {}", codec, layers);

		// A single participant publishing a single 1280x720 video track (Chrome sends
		// fewer than 3 spatial layers below that): simulcast or not for VP8 and H264,
		// an explicit scalability mode for the SVC codecs (without one, livekit-client
		// publishes them L3T3_KEY)
		final boolean simulcast = "simulcast".equals(layers);
		final String scalabilityMode = layers.startsWith("L") ? layers : null;
		final boolean singleLayer = !simulcast && !"L3T3".equals(scalabilityMode);
		this.addPublisher(user, false, simulcast, false, false, false, true, 1280, 720, scalabilityMode);
		this.forceCodec(user, 0, codec);
		user.getDriver().findElement(By.cssSelector(".connect-btn")).sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 1);

		// The publisher sends the requested codec and layers
		WebElement publisherVideo = user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 video.local"));
		this.waitUntilVideoLayersNotEmpty(user, publisherVideo);
		Assertions.assertEquals("video/" + codec.toUpperCase(),
				getPublisherVideoLayerAttribute(user, publisherVideo, null, "codec").getAsString());
		if (scalabilityMode != null) {
			Assertions.assertEquals(scalabilityMode,
					getPublisherVideoLayerAttribute(user, publisherVideo, null, "scalabilityMode").getAsString());
		} else {
			int publishedLayers = countNumberOfPublishedLayers(user, publisherVideo);
			Assertions.assertTrue(simulcast ? publishedLayers > 1 : publishedLayers == 1,
					"Wrong number of simulcast layers: " + publishedLayers);
		}
		// And it sends its top layer before the egress starts: Chrome turns its top
		// simulcast layer on as its uplink estimate allows, which toward mediasoup
		// takes up to 20 s for H264
		this.waitUntilPublisherSendsWidth(user, publisherVideo, 1280, 40);
		this.waitAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);

		// The API dialog fills in the room and the video track
		user.getDriver().findElement(By.cssSelector("#room-api-btn-0")).click();
		Thread.sleep(300);
		user.getDriver().findElement(By.cssSelector("#start-track-egress-api-btn")).click();
		WebElement egressIdField = user.getDriver().findElement(By.id("egress-id-field"));
		new WebDriverWait(user.getDriver(), Duration.ofSeconds(10))
				.until(ExpectedConditions.textToBePresentInElementValue(egressIdField, "EG_"));
		String egressId = egressIdField.getDomProperty("value");

		// Long enough for the egress to reach the top layer of a multi-layer track
		this.waitUntilEgressStatus(user, egressId, "EGRESS_ACTIVE", 10000);
		Thread.sleep(8000);
		user.getDriver().findElement(By.cssSelector("#stop-egress-api-btn")).click();
		JsonObject egress = this.waitUntilEgressStatus(user, egressId, "EGRESS_COMPLETE", 10000);

		this.assertHealthyVideoRecording(this.downloadRecording(egress), codec, 5, 1280, 720, singleLayer);
	}

	protected void waitUntilPublisherSendsWidth(OpenViduTestappUser user, WebElement publisherVideo, int width,
			int timeoutSeconds) throws InterruptedException {
		final long deadline = System.currentTimeMillis() + timeoutSeconds * 1000L;
		JsonArray layers = null;
		while (System.currentTimeMillis() < deadline) {
			layers = getLayersAsJsonArray(user, publisherVideo);
			for (JsonElement layer : layers) {
				JsonElement frameWidth = layer.getAsJsonObject().get("frameWidth");
				if (frameWidth != null && !frameWidth.isJsonNull() && frameWidth.getAsInt() == width) {
					return;
				}
			}
			Thread.sleep(500);
		}
		Assertions.fail("The publisher did not send its " + width + " px layer in " + timeoutSeconds + " s: " + layers);
	}

	/**
	 * Downloads the media file of a completed egress, from MinIO or, when the
	 * deployment has none, from the egress container's backup folder.
	 */
	protected Path downloadRecording(JsonObject egress) throws Exception {
		String filename = egress.get("file").getAsJsonObject().get("filename").getAsString();
		Path file = Files.createTempDirectory("egress").resolve(Path.of(filename).getFileName());
		if (isMinioAvailable()) {
			MinioClient.builder().endpoint("localhost", 9000, false).credentials("minioadmin", "minioadmin").build()
					.downloadObject(DownloadObjectArgs.builder().bucket("openvidu-appdata").object(filename)
							.filename(file.toString()).build());
		} else {
			runMediaCommand("docker", "cp", "egress:/home/egress/backup_storage/" + filename, file.toString());
		}
		return file;
	}

	/**
	 * The file is a playable recording of a single video track: the codec's native
	 * container holding one track of the given codec, starting with a keyframe,
	 * decoding without errors, lasting at least minSeconds at a real frame rate,
	 * showing a moving picture, and reaching the published width x height: in every
	 * frame for a single-layer track, from the top layer on for a multi-layer one
	 * (the egress starts on a low layer and moves up as its bandwidth allows).
	 */
	protected void assertHealthyVideoRecording(Path file, String codec, double minSeconds, int width, int height,
			boolean singleLayer) throws Exception {
		String container = "h264".equals(codec) ? "mp4" : "webm";
		Assertions.assertTrue(file.toString().endsWith("." + container), "Wrong file extension: " + file);

		JsonObject probe = JsonParser.parseString(runMediaCommand("ffprobe", "-v", "error", "-show_format",
				"-show_streams", "-count_packets", "-of", "json", file.toString())[0]).getAsJsonObject();
		JsonObject format = probe.getAsJsonObject("format");
		JsonArray streams = probe.getAsJsonArray("streams");
		log.info("Track egress recording {}: {}, {}", file.getFileName(), format, streams);
		Assertions.assertTrue(format.get("format_name").getAsString().contains(container),
				"Wrong container: " + format);
		Assertions.assertEquals(1, streams.size(), "A single track expected: " + streams);
		JsonObject video = streams.get(0).getAsJsonObject();
		Assertions.assertEquals("video", video.get("codec_type").getAsString());
		Assertions.assertEquals(codec, video.get("codec_name").getAsString());
		Assertions.assertTrue(video.get("width").getAsInt() >= 16 && video.get("height").getAsInt() >= 16,
				"Wrong video size: " + video);

		double duration = format.get("duration").getAsDouble();
		int frames = video.get("nb_read_packets").getAsInt();
		Assertions.assertTrue(duration >= minSeconds && duration < 30, "Wrong duration: " + duration + " s");
		Assertions.assertTrue(frames / duration >= 10,
				"Too few frames: " + frames + " in " + duration + " s");

		// Starts with a keyframe, and its timestamps never go back. A simulcast layer
		// switch gives the keyframe of the new layer the timestamp of the frame it
		// replaces, so a timestamp may repeat on a keyframe of a multi-layer track only
		List<String[]> packets = runMediaCommand("ffprobe", "-v", "error", "-select_streams", "v:0",
				"-show_entries", "packet=dts_time,flags", "-of", "csv=p=0", file.toString())[0].lines()
				.map(l -> l.trim().split(",")).filter(p -> p.length == 2 && !"N/A".equals(p[0])).toList();
		Assertions.assertTrue(packets.get(0)[1].startsWith("K"), "The recording must start with a keyframe");
		for (int i = 1; i < packets.size(); i++) {
			double dts = Double.parseDouble(packets.get(i)[0]);
			double previous = Double.parseDouble(packets.get(i - 1)[0]);
			Assertions.assertTrue(dts > previous || (dts == previous && !singleLayer && packets.get(i)[1].startsWith("K")),
					"Wrong timestamp " + dts + " after " + previous + " (flags " + packets.get(i)[1] + ")");
		}

		// Decode every frame: no errors, the picture moves (Chrome's fake camera changes
		// on every frame) and reaches the published size. VP9 goes through libvpx, the
		// decoder of browsers and GStreamer: FFmpeg's own shows only the base layer of a
		// VP9 SVC superframe. AV1 goes through dav1d: FFmpeg's own needs hardware
		List<String> command = new ArrayList<>(List.of("ffmpeg", "-nostdin", "-loglevel", "level+info"));
		if ("vp9".equals(codec)) {
			command.addAll(List.of("-c:v", "libvpx-vp9"));
		} else if ("av1".equals(codec)) {
			command.addAll(List.of("-c:v", "libdav1d"));
		}
		command.addAll(List.of("-i", file.toString(), "-map", "0:v", "-vf", "showinfo", "-fps_mode", "passthrough",
				"-enc_time_base", "demux", "-f", "null", "-"));
		String decodeLog = runMediaCommand(command.toArray(new String[0]))[1];
		// Errors of the demuxer and the decoder: the null muxer's own complaints about a
		// repeated timestamp are covered above
		List<String> errors = decodeLog.lines().filter(l -> l.contains("[error]") || l.contains("[fatal]"))
				.filter(l -> !l.startsWith("[null @")).toList();
		Assertions.assertTrue(errors.isEmpty(), "Decoding reported errors: " + errors);
		java.util.regex.Matcher frame = java.util.regex.Pattern
				.compile("Parsed_showinfo.* n: *\\d+ .* s:(\\d+x\\d+) .* checksum:([0-9A-F]+)").matcher(decodeLog);
		Map<String, Long> framesBySize = new LinkedHashMap<>();
		List<String> checksums = new ArrayList<>();
		while (frame.find()) {
			framesBySize.merge(frame.group(1), 1L, Long::sum);
			checksums.add(frame.group(2));
		}
		log.info("Track egress recording {}: decoded frames by size {}", file.getFileName(), framesBySize);
		// MP4's edit list can leave the last packet out of the presentation (flag D)
		long presented = packets.stream().filter(p -> !p[1].contains("D")).count();
		Assertions.assertEquals(presented, checksums.size(), "Every presented packet must decode to one frame");
		long distinct = checksums.stream().distinct().count();
		Assertions.assertTrue(distinct >= checksums.size() / 2,
				"The video looks frozen: " + distinct + " distinct frames out of " + checksums.size());

		String expected = width + "x" + height;
		if (singleLayer) {
			Assertions.assertEquals(Map.of(expected, (long) checksums.size()), framesBySize,
					"Every frame of a single-layer track must be " + expected);
		} else {
			Assertions.assertTrue(framesBySize.containsKey(expected),
					"The recording must reach the top layer " + expected + ": " + framesBySize);
		}
	}

	/** Runs a command and returns its stdout and stderr; it must exit with 0. */
	protected static String[] runMediaCommand(String... command) throws IOException, InterruptedException {
		Path out = Files.createTempFile("media-command", ".out");
		Path err = Files.createTempFile("media-command", ".err");
		try {
			Process process = new ProcessBuilder(command).redirectOutput(out.toFile()).redirectError(err.toFile())
					.start();
			Assertions.assertTrue(process.waitFor(120, TimeUnit.SECONDS), "Timeout: " + String.join(" ", command));
			Assertions.assertEquals(0, process.exitValue(),
					String.join(" ", command) + " failed: " + Files.readString(err));
			return new String[] { Files.readString(out), Files.readString(err) };
		} finally {
			Files.deleteIfExists(out);
			Files.deleteIfExists(err);
		}
	}
}
