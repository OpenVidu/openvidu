package io.openvidu.test.e2e;

import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.livekit.server.AccessToken;
import io.livekit.server.CanPublish;
import io.livekit.server.CanSubscribe;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import io.openvidu.test.browsers.utils.BrowserNames;
import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.ParticipantPermission;
import livekit.LivekitModels.TrackInfo;
import livekit.LivekitModels.TrackSource;

/**
 * E2E tests of a native Android app built with the official LiveKit Android SDK
 * (src/test/resources/android-app), running in an Android emulator and driven
 * through Appium, in the same Room as openvidu-testapp in Chrome and Firefox.
 *
 * Kept apart from {@link OpenViduTestAppE2eTest} because they need the image
 * openvidu/openvidu-test-e2e-android (about 4.3 GB, see
 * docker/openvidu-test-e2e-android) and a host with KVM, where they are skipped
 * otherwise, and because they need minutes before the first one starts: the
 * APK is built and the emulator they share is booted (about 1 minute), then
 * each test gets the app as a new process (see setupAndroidApp). Run them with
 * {@code mvn -Dtest=OpenViduAndroidE2eTest test}.
 *
 * The emulator's camera gives a few frames per second, so the videos the app
 * sends and receives are held to {@link #ANDROID_MIN_VIDEO_FPS}, not to
 * MIN_FRAMES_DECODED_FPS: these tests check that video and audio flow and play
 * in both directions, not their quality. The video the app receives is judged
 * by the frames WebRTC decodes, as in the browsers (see {@link DecodedFrames}).
 * The emulator's microphone records silence: the app mixes 440 Hz beeps into it
 * ("Test tone"), as the fake microphone of a browser produces one. The app's
 * README (src/test/resources/README.md) explains the rest of what it does to
 * run in an emulator.
 */
@Tag("e2e")
@DisplayName("E2E tests for the Android app")
@ExtendWith(SpringExtension.class)
public class OpenViduAndroidE2eTest extends AbstractOpenViduTestappE2eTest {

	private static final String ROOM = "TestRoom"; // The testapp's default Room
	private static final String ANDROID = "AndroidUser";

	// A video that keeps decoding new frames at this rate is playing: frozen ones
	// decode none
	private static final long ANDROID_MIN_VIDEO_FPS = 1;

	// What an audio track must sustain to count as sound: in the Android app,
	// samples (any sample rate is at least 8 kHz) whose level (RMS of the 16-bit
	// samples over about 2 s) is far above silence and Opus comfort noise; in a
	// browser, a mean square of the audio level (the rate at which totalAudioEnergy
	// grows) of an audible sound, which is 1e-4 for an RMS of 1% of full scale
	private static final long ANDROID_MIN_AUDIO_SAMPLES_PER_SECOND = 8000;
	private static final long ANDROID_MIN_AUDIO_LEVEL = 300;
	private static final double BROWSER_MIN_AUDIO_MEAN_SQUARE = 1e-4;

	private static final Duration ANDROID_WAIT = Duration.ofSeconds(30);

	@BeforeAll()
	protected static void setupAll() throws Exception {
		loadEnvironmentVariables();
		setUpLiveKitClient();
		prePullAndroidImage();
		prePullRemoteBrowserImages(BrowserNames.CHROME, BrowserNames.FIREFOX);
	}

	@AfterAll()
	protected static void teardownAll() {
		stopAndroidEmulator();
	}

	@BeforeEach()
	protected void setupEach() {
		this.closeAllRooms(LK);
	}

	@AfterEach()
	protected void finishEach() {
		this.closeAllRooms(LK);
	}

	/**
	 * The Android app joins a Room, publishing its camera and microphone, and a
	 * Chrome and a Firefox testapp join it too. Each of the three plays the video
	 * and the audio of the other two, the server has the three of them with their
	 * tracks, every participant sees the connection quality of the others, and the
	 * browsers hear the app as an active speaker. Then the app leaves and
	 * everybody sees it go.
	 */
	@Test
	@DisplayName("Android app, Chrome and Firefox: video and audio in both directions")
	void androidAppChromeFirefoxTest() throws Exception {
		log.info("Android app, Chrome and Firefox: video and audio in both directions");
		// The slow part goes first, before the Room exists (OpenVidu in evaluation
		// mode closes Rooms after 5 minutes): building the app and booting the
		// emulator take minutes
		OpenViduAndroidAppUser android = setupAndroidAppUser();
		final Map<OpenViduTestappUser, String> browsers = new LinkedHashMap<>();
		browsers.put(setupBrowserAndConnectToOpenViduTestapp("chrome"), "ChromeUser");
		browsers.put(setupBrowserAndConnectToOpenViduTestapp("firefox"), "FirefoxUser");

		withAndroidDiagnostics(android, () -> {
			connectAndroidApp(android, null, true);
			for (Entry<OpenViduTestappUser, String> browser : browsers.entrySet()) {
				browser.getKey().getDriver().findElement(By.id("add-user-btn")).click();
				connectTestappInstance(browser.getKey(), browser.getValue());
			}
			for (OpenViduTestappUser user : browsers.keySet()) {
				waitUntilTestappConnected(user, true, 2);
			}

			// The server has the three participants, and the app publishes its camera
			// and its microphone unmuted
			List<ParticipantInfo> participants = LK.listParticipants(ROOM).execute().body();
			Assertions.assertNotNull(participants, "Could not list the participants of Room " + ROOM);
			Assertions.assertEquals(List.of(ANDROID, "ChromeUser", "FirefoxUser"),
					participants.stream().map(ParticipantInfo::getIdentity).sorted().toList(),
					"Wrong participants in Room " + ROOM);
			Assertions.assertTrue(
					participants.stream().allMatch(p -> p.getState() == ParticipantInfo.State.ACTIVE),
					"Every participant should be ACTIVE: " + participants);
			TrackInfo androidVideo = androidTrack(TrackSource.CAMERA);
			TrackInfo androidAudio = androidTrack(TrackSource.MICROPHONE);
			Assertions.assertFalse(androidVideo.getMuted(), "The Android app's camera track is muted");
			Assertions.assertFalse(androidAudio.getMuted(), "The Android app's microphone track is muted");
			log.info("The Android app publishes {} {}x{} ({} layers) and {}", androidVideo.getMimeType(),
					androidVideo.getWidth(), androidVideo.getHeight(), videoLayers(androidVideo),
					androidAudio.getMimeType());

			// Both browsers play the app's video and audio, and the app plays theirs
			for (OpenViduTestappUser user : browsers.keySet()) {
				waitUntilTestappPlaysAndroidApp(user, androidVideo);
			}
			waitUntilAndroidAppPlays(android, browsers.values());

			// Connection quality, as every participant sees it
			android.waitUntilStatus("its own connection quality and that of " + browsers.values()
					+ " to be EXCELLENT or GOOD",
					status -> isGoodQuality(status.get("connectionQuality").getAsString())
							&& browsers.values().stream().allMatch(identity -> isGoodQuality(OpenViduAndroidAppUser
									.remoteParticipant(status, identity).get("connectionQuality").getAsString())),
					ANDROID_WAIT);
			Assertions.assertTrue(android.getStatus().getAsJsonObject("events").has("ConnectionQualityChanged"),
					"The Android app never received a ConnectionQualityChanged event");
			for (OpenViduTestappUser user : browsers.keySet()) {
				waitUntilTestapp(user, "the connection quality of " + ANDROID + " to be excellent or good",
						"return window['room_0'].remoteParticipants.get(arguments[0])?.connectionQuality;",
						quality -> "excellent".equals(quality) || "good".equals(quality), ANDROID);
			}

			// The app's test tone makes it an active speaker
			for (OpenViduTestappUser user : browsers.keySet()) {
				waitUntilTestapp(user, ANDROID + " to be an active speaker",
						"return window['room_0'].activeSpeakers.map(p => p.identity).join(',');",
						speakers -> List.of(String.valueOf(speakers).split(",")).contains(ANDROID), ANDROID);
			}

			// The app leaves, and the browsers and the server see it go
			android.disconnect();
			android.waitUntilStatus("the Room to be disconnected",
					status -> "DISCONNECTED".equals(OpenViduAndroidAppUser.state(status)), ANDROID_WAIT);
			for (OpenViduTestappUser user : browsers.keySet()) {
				user.getEventManager().waitUntilEventReaches("participantDisconnected", "RoomEvent", 1);
				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("video.remote"), 1));
			}
			final long deadline = System.currentTimeMillis() + WAIT_UNTIL_MAX_MILLIS;
			List<String> remaining = participantIdentities();
			while (remaining.contains(ANDROID) && System.currentTimeMillis() < deadline) {
				Thread.sleep(250);
				remaining = participantIdentities();
			}
			Assertions.assertEquals(List.of("ChromeUser", "FirefoxUser"), remaining,
					"Wrong participants in Room " + ROOM + " after the Android app left");
		});
	}

	/**
	 * The Android app and a Chrome testapp in a Room: the app turns its camera and
	 * its microphone off and on again, which Chrome and the server see as the
	 * tracks being muted and unmuted, and Chrome plays them again once unmuted.
	 * Then the app and Chrome send each other a data message.
	 */
	@Test
	@DisplayName("Android app: mute and unmute, and data messages")
	void androidAppMuteAndDataTest() throws Exception {
		log.info("Android app: mute and unmute, and data messages");
		OpenViduAndroidAppUser android = setupAndroidAppUser();
		OpenViduTestappUser chrome = setupBrowserAndConnectToOpenViduTestapp("chrome");

		withAndroidDiagnostics(android, () -> {
			connectAndroidApp(android, null, true);
			chrome.getDriver().findElement(By.id("add-user-btn")).click();
			connectTestappInstance(chrome, "ChromeUser");
			waitUntilTestappConnected(chrome, true, 1);
			TrackInfo androidVideo = androidTrack(TrackSource.CAMERA);
			TrackInfo androidAudio = androidTrack(TrackSource.MICROPHONE);
			waitUntilTestappPlaysAndroidApp(chrome, androidVideo);

			// Camera off and on
			android.setSwitch("camera", false);
			chrome.getEventManager().waitUntilEventReaches("trackMuted", "RoomEvent", 1);
			waitUntilServerSeesMuted(androidVideo, true);
			android.waitUntilStatus("its camera track to be muted",
					status -> OpenViduAndroidAppUser.localTrack(status, "video").get("muted").getAsBoolean(),
					ANDROID_WAIT);
			android.setSwitch("camera", true);
			chrome.getEventManager().waitUntilEventReaches("trackUnmuted", "RoomEvent", 1);
			waitUntilServerSeesMuted(androidVideo, false);
			waitUntilSubscriberFramesDecodedIncrease(chrome, testappVideoOf(chrome, androidVideo),
					ANDROID_MIN_VIDEO_FPS);

			// Microphone off and on
			android.setSwitch("microphone", false);
			chrome.getEventManager().waitUntilEventReaches("trackMuted", "RoomEvent", 2);
			waitUntilServerSeesMuted(androidAudio, true);
			android.setSwitch("microphone", true);
			chrome.getEventManager().waitUntilEventReaches("trackUnmuted", "RoomEvent", 2);
			waitUntilServerSeesMuted(androidAudio, false);
			waitUntilRemoteAudioIsAudible(chrome, ANDROID);

			// Data, from the app to Chrome
			CompletableFuture<String> received = new CompletableFuture<>();
			chrome.getEventManager().on("dataReceived", "RoomEvent",
					event -> received.complete(event.get("eventDescription").getAsString()));
			android.tap("send_data");
			String dataReceived;
			try {
				dataReceived = received.get(15, TimeUnit.SECONDS);
			} catch (TimeoutException e) {
				dataReceived = null;
			}
			Assertions.assertEquals("Hello from Android (kind: RELIABLE)", dataReceived,
					"Wrong data message received by Chrome from the Android app (null: none in 15 s)");
			chrome.getEventManager().off("dataReceived", "RoomEvent");

			// And from Chrome to the app
			((JavascriptExecutor) chrome.getDriver()).executeScript("window['room_0'].localParticipant.publishData("
					+ "new TextEncoder().encode('Hello from Chrome'), { reliable: true, topic: 'openvidu-e2e' });");
			android.waitUntilStatus("the data message from Chrome", status -> {
				for (JsonElement message : status.getAsJsonArray("data")) {
					JsonObject m = message.getAsJsonObject();
					if ("ChromeUser".equals(m.get("from").getAsString())
							&& "Hello from Chrome".equals(m.get("text").getAsString())
							&& "openvidu-e2e".equals(m.get("topic").getAsString())) {
						return true;
					}
				}
				return false;
			}, ANDROID_WAIT);
		});
	}

	/**
	 * The Android app and a Chrome testapp in a Room, and the emulator loses its
	 * network for a few seconds (airplane mode). The app reconnects on its own,
	 * resuming its session or joining again, as the server decides, and then
	 * Chrome plays its video and audio again and the app plays Chrome's.
	 */
	@Test
	@DisplayName("Android app: reconnection after a network outage")
	void androidAppReconnectionTest() throws Exception {
		log.info("Android app: reconnection after a network outage");
		OpenViduAndroidAppUser android = setupAndroidAppUser();
		OpenViduTestappUser chrome = setupBrowserAndConnectToOpenViduTestapp("chrome");

		withAndroidDiagnostics(android, () -> {
			connectAndroidApp(android, null, true);
			chrome.getDriver().findElement(By.id("add-user-btn")).click();
			connectTestappInstance(chrome, "ChromeUser");
			waitUntilTestappConnected(chrome, true, 1);
			waitUntilTestappPlaysAndroidApp(chrome, androidTrack(TrackSource.CAMERA));
			waitUntilAndroidAppPlays(android, List.of("ChromeUser"));

			// No network for a few seconds
			androidShell("cmd", "connectivity", "airplane-mode", "enable");
			android.waitUntilStatus("the app to notice the outage (Reconnecting)",
					status -> status.getAsJsonObject("events").has("Reconnecting"), ANDROID_WAIT);
			Thread.sleep(5000);
			androidShell("cmd", "connectivity", "airplane-mode", "disable");
			JsonObject status = android.waitUntilStatus("the app to reconnect (Reconnected)",
					s -> "CONNECTED".equals(OpenViduAndroidAppUser.state(s))
							&& s.getAsJsonObject("events").has("Reconnected"),
					Duration.ofSeconds(60));
			log.info("The Android app reconnected. Its events: {}", status.getAsJsonObject("events"));

			// The media flows again both ways, through the tracks the app publishes now
			TrackInfo androidVideo = androidTrack(TrackSource.CAMERA);
			chrome.getWaiter().until(ExpectedConditions.presenceOfElementLocated(
					By.cssSelector("video.remote[id*='--" + androidVideo.getSid() + "']")));
			waitUntilTestappPlaysAndroidApp(chrome, androidVideo);
			waitUntilAndroidAppPlays(android, List.of("ChromeUser"));
			Assertions.assertEquals(List.of(ANDROID, "ChromeUser"), participantIdentities(),
					"Wrong participants in Room " + ROOM + " after the Android app reconnected");
		});
	}

	/**
	 * The Android app receives Chrome's 1080p simulcast video with adaptive stream,
	 * as LiveKit recommends for apps: the server sends the layer that fits the size
	 * of the app's video view (360p in a small view, 1080p in a large one) and
	 * nothing while the view is hidden. Chrome's encoder follows with dynacast: it
	 * pauses the layers that the app does not receive.
	 */
	@Test
	@DisplayName("Android app: adaptive stream")
	void androidAppAdaptiveStreamTest() throws Exception {
		log.info("Android app: adaptive stream");
		OpenViduAndroidAppUser android = setupAndroidAppUser();
		OpenViduTestappUser chrome = setupBrowserAndConnectToOpenViduTestapp("chrome");

		withAndroidDiagnostics(android, () -> {
			connectAndroidApp(android, null, true);
			chrome.getDriver().findElement(By.id("add-user-btn")).click();
			connectTestappInstance(chrome, "ChromeUser");
			waitUntilTestappConnected(chrome, true, 1);
			final WebElement chromeVideo = chrome.getDriver()
					.findElement(By.cssSelector("#openvidu-instance-0 video.local"));

			// A small view (90 dp high): the 360p layer, so Chrome pauses its 1080p one
			waitUntilAndroidAppReceivesVideoHeight(android, "ChromeUser", 360);
			waitUntilAndroidAppDecodes(android, "ChromeUser");
			waitUntilPublisherLayerActive(chrome, chromeVideo, "f", false);

			// A large view (180 dp high): the 1080p layer, which Chrome sends again
			android.setSwitch("large_videos", true);
			waitUntilAndroidAppReceivesVideoHeight(android, "ChromeUser", 1080);
			waitUntilAndroidAppDecodes(android, "ChromeUser");
			waitUntilPublisherLayerActive(chrome, chromeVideo, "f", true);

			// No view on screen: no video at all, and Chrome pauses every layer
			android.setSwitch("show_videos", false);
			waitUntilAndroidAppStopsReceiving(android, "ChromeUser");
			waitUntilPublisherLayerActive(chrome, chromeVideo, "q", false);

			// The view back: Chrome sends its 1080p layer again, and the app decodes it
			// (in this order: the size of the last frame decoded is still 1080p)
			android.setSwitch("show_videos", true);
			waitUntilPublisherLayerActive(chrome, chromeVideo, "f", true);
			waitUntilAndroidAppDecodes(android, "ChromeUser");
			waitUntilAndroidAppReceivesVideoHeight(android, "ChromeUser", 1080);
		});
	}

	/**
	 * The Android app publishes its camera with three VP8 simulcast layers, and a
	 * Chrome testapp without adaptive stream subscribes to it at a chosen maximum
	 * quality. Chrome receives the smaller or the larger layer, and the app's
	 * encoder follows with dynacast: it sends only the layers someone receives.
	 */
	@Test
	@DisplayName("Android app: simulcast and dynacast")
	void androidAppSimulcastDynacastTest() throws Exception {
		log.info("Android app: simulcast and dynacast");
		OpenViduAndroidAppUser android = setupAndroidAppUser();
		OpenViduTestappUser chrome = setupBrowserAndConnectToOpenViduTestapp("chrome");

		withAndroidDiagnostics(android, () -> {
			connectAndroidApp(android, "vp8", true);
			// Nobody receives its video yet: dynacast pauses every layer
			android.waitUntilStatus("its three simulcast layers to be paused (dynacast, no subscriber)",
					status -> activeLayers(status).isEmpty()
							&& OpenViduAndroidAppUser.localVideoLayers(status).size() == 3,
					ANDROID_WAIT);
			TrackInfo androidVideo = androidTrack(TrackSource.CAMERA);
			Assertions.assertEquals("video/VP8", androidVideo.getMimeType(), "Wrong codec of the Android app");
			Assertions.assertEquals(3, videoLayers(androidVideo),
					"The Android app should publish 3 simulcast layers: " + androidVideo);

			this.addSubscriber(chrome, false);
			connectTestappInstance(chrome, "ChromeUser");
			waitUntilTestappConnected(chrome, false, 1);
			final String instance = "#openvidu-instance-0";
			final WebElement video = testappVideoOf(chrome, androidVideo);
			waitUntilSubscriberFramesDecodedIncrease(chrome, video, ANDROID_MIN_VIDEO_FPS);

			// LOW: the lowest layer only
			this.selectSubscriberVideoQuality(chrome, instance, "LOW");
			waitUntilAndroidAppSendsLayers(android, List.of("q"));
			final int lowWidth = waitUntilSubscriberFrameWidthSettles(chrome, video);

			// MEDIUM: the two lower layers
			this.selectSubscriberVideoQuality(chrome, instance, "MEDIUM");
			waitUntilAndroidAppSendsLayers(android, List.of("h", "q"));
			waitUntilSubscriberFrameWidthAtLeast(chrome, video, (int) (1.5 * lowWidth));

			// HIGH: every layer, and Chrome receives the top one, at least twice as wide
			this.selectSubscriberVideoQuality(chrome, instance, "HIGH");
			waitUntilAndroidAppSendsLayers(android, List.of("f", "h", "q"));
			waitUntilSubscriberFrameWidthAtLeast(chrome, video, 2 * lowWidth);
			waitUntilSubscriberFramesDecodedIncrease(chrome, video, ANDROID_MIN_VIDEO_FPS);
		});
	}

	/**
	 * The Android app publishes its camera with an SVC codec (three spatial and
	 * three temporal layers, L3T3_KEY), and a Chrome testapp without adaptive
	 * stream plays it, receiving fewer spatial layers at a lower maximum quality.
	 * Chrome publishes the same SVC codec, which the app decodes.
	 */
	@ParameterizedTest(name = "Android app: SVC {0}")
	@ValueSource(strings = { "vp9", "av1" })
	@DisplayName("Android app: SVC")
	void androidAppSvcTest(String codec) throws Exception {
		log.info("Android app: SVC {}", codec);
		final String mimeType = "video/" + codec.toUpperCase();
		OpenViduAndroidAppUser android = setupAndroidAppUser();
		OpenViduTestappUser chrome = setupBrowserAndConnectToOpenViduTestapp("chrome");

		withAndroidDiagnostics(android, () -> {
			connectAndroidApp(android, codec, true);
			android.waitUntilStatus("its camera to be encoded with " + mimeType + " L3T3_KEY", status -> {
				JsonObject layer = OpenViduAndroidAppUser.localVideoLayers(status).isEmpty() ? null
						: OpenViduAndroidAppUser.localVideoLayers(status).get(0).getAsJsonObject();
				return layer != null && mimeType.equals(stringOrNull(layer, "codec"))
						&& "L3T3_KEY".equals(stringOrNull(layer, "scalabilityMode"));
			}, ANDROID_WAIT);
			TrackInfo androidVideo = androidTrack(TrackSource.CAMERA);
			Assertions.assertEquals(mimeType, androidVideo.getMimeType(), "Wrong codec of the Android app");

			// Chrome publishes the same codec, and subscribes without adaptive stream
			this.addPublisher(chrome, true, true, true, false, true, true, null, null, null);
			this.forceCodec(chrome, 0, codec, false);
			connectTestappInstance(chrome, "ChromeUser");
			waitUntilTestappConnected(chrome, true, 1);

			final String instance = "#openvidu-instance-0";
			final WebElement video = testappVideoOf(chrome, androidVideo);
			Assertions.assertEquals(mimeType, this.getSubscriberVideoCodec(chrome, video),
					"Wrong codec received by Chrome from the Android app");
			waitUntilSubscriberFramesDecodedIncrease(chrome, video, ANDROID_MIN_VIDEO_FPS);

			// Fewer spatial layers at LOW: a frame at least twice as narrow as at HIGH
			this.selectSubscriberVideoQuality(chrome, instance, "LOW");
			final int lowWidth = waitUntilSubscriberFrameWidthSettles(chrome, video);
			this.selectSubscriberVideoQuality(chrome, instance, "HIGH");
			waitUntilSubscriberFrameWidthAtLeast(chrome, video, 2 * lowWidth);
			waitUntilSubscriberFramesDecodedIncrease(chrome, video, ANDROID_MIN_VIDEO_FPS);

			// The app decodes Chrome's SVC video
			android.waitUntilStatus("Chrome's video to be received as " + mimeType,
					status -> mimeType.equals(
							stringOrNull(OpenViduAndroidAppUser.remoteTrack(status, "ChromeUser", "video"), "codec")),
					ANDROID_WAIT);
			waitUntilAndroidAppDecodes(android, "ChromeUser");
		});
	}

	/**
	 * The Android app receives the events of the LiveKit Android SDK: Room events,
	 * the participant events of the local participant and of a remote one (Chrome's
	 * testapp), and the track events of Chrome's camera. Each step triggers some of
	 * them, through the app, Chrome or the server API, and waits until every one
	 * has reached the app since the step began: 23 of the 32 Room events (and
	 * Reconnecting and Reconnected in androidAppReconnectionTest), 19 of the 23
	 * participant events and 2 of the 3 track events. Left out, as hard to trigger
	 * here: stream state changes (the server only sends them when it pauses a video
	 * for lack of bandwidth, and with pion only), the recording status (egress),
	 * data tracks, E2EE and transcriptions. And participant state changes but the
	 * local participant's own StateChanged: SDK 2.30.0 never emits the Room's
	 * ParticipantStateChanged of the local participant (the emitWhenConnected call
	 * is missing in Room#setupLocalParticipantEventHandling), and a remote
	 * participant reaches the app ACTIVE already, a state the SDK sets as it
	 * creates the participant, before anything listens to it, and that it does not
	 * change when the participant leaves.
	 *
	 * Chrome plays test.wav as its microphone: the beeps of its default fake
	 * microphone are too short to make it a speaker.
	 */
	@Test
	@DisplayName("Android app: SDK events")
	void androidAppEventsTest() throws Exception {
		log.info("Android app: SDK events");
		final String CHROME = "ChromeUser";
		OpenViduAndroidAppUser android = setupAndroidAppUser();
		OpenViduTestappUser chrome = setupBrowserAndConnectToOpenViduTestapp("chromeFakeAudio");

		withAndroidDiagnostics(android, () -> {
			// A token the server refuses
			JsonObject status = android.waitUntilStatus("its first status", s -> true, ANDROID_WAIT);
			AccessToken wrongToken = new AccessToken(LIVEKIT_API_KEY, "not-the-api-secret-of-the-openvidu-server");
			wrongToken.setIdentity(ANDROID);
			wrongToken.addGrants(new RoomJoin(true), new RoomName(ROOM));
			android.connect(livekitUrlForAndroidEmulator(), wrongToken.toJwt(), null, true);
			status = waitUntilEvents(android, "a token the server refuses", status, roomEvent("FailedToConnect"));
			Assertions.assertEquals("DISCONNECTED", OpenViduAndroidAppUser.state(status),
					"The Android app should not be connected after FailedToConnect");

			// The app joins, publishing its camera and its microphone, where its test tone
			// makes it speak
			connectAndroidApp(android, null, true);
			status = waitUntilEvents(android, "the app joins", status, roomEvent("Connected"),
					localEvent("LocalTrackPublished", 2), localEvent("StateChanged"), localEvent("SpeakingChanged"),
					roomEvent("ActiveSpeakersChanged"));

			// Chrome joins and publishes its camera and its microphone, which the app
			// subscribes to and shows, and subscribes to the app's
			status = android.getStatus();
			chrome.getDriver().findElement(By.id("add-user-btn")).click();
			connectTestappInstance(chrome, CHROME);
			waitUntilTestappConnected(chrome, true, 1);
			status = waitUntilEvents(android, "Chrome joins", status, roomEvent("ParticipantConnected"),
					roomEvent("TrackSubscribed", 2),
					remoteEvent(CHROME, "TrackSubscribed", 2), roomEvent("LocalTrackSubscribed", 2),
					localEvent("LocalTrackSubscribed", 2), remoteEvent(CHROME, "SpeakingChanged"),
					roomEvent("ConnectionQualityChanged"));
			// Adaptive stream reports the view of Chrome's camera (TrackEvents)
			status = android.waitUntilStatus("the view of Chrome's camera to be reported visible, with a size",
					s -> Boolean.TRUE.equals(cameraVisible(s, CHROME)) && cameraViewWidth(s, CHROME) > 0,
					ANDROID_WAIT);

			// The server API changes the Room's metadata, and the name, the metadata and
			// the attributes of Chrome and of the app
			serverCall(LK.updateRoomMetadata(ROOM, "Room metadata"));
			status = waitUntilEvents(android, "the Room's metadata changes", status, roomEvent("RoomMetadataChanged"));
			Assertions.assertEquals("Room metadata", status.get("roomMetadata").getAsString(),
					"Wrong Room metadata in the Android app");
			for (String identity : List.of(CHROME, ANDROID)) {
				boolean local = ANDROID.equals(identity);
				status = android.getStatus();
				serverCall(LK.updateParticipant(ROOM, identity, identity + " name", identity + " metadata", null,
						Map.of("e2e", identity)));
				status = waitUntilEvents(android, "the name, metadata and attributes of " + identity + " change",
						status, roomEvent("ParticipantNameChanged"), roomEvent("ParticipantMetadataChanged"),
						roomEvent("ParticipantAttributesChanged"),
						local ? localEvent("NameChanged") : remoteEvent(identity, "NameChanged"),
						local ? localEvent("MetadataChanged") : remoteEvent(identity, "MetadataChanged"),
						local ? localEvent("AttributesChanged") : remoteEvent(identity, "AttributesChanged"));
				JsonObject participant = local ? OpenViduAndroidAppUser.localParticipant(status)
						: OpenViduAndroidAppUser.remoteParticipant(status, identity);
				Assertions.assertEquals(identity + " name", stringOrNull(participant, "name"),
						"Wrong name of " + identity + " in the Android app");
				Assertions.assertEquals(identity + " metadata", stringOrNull(participant, "metadata"),
						"Wrong metadata of " + identity + " in the Android app");
				Assertions.assertEquals(identity, stringOrNull(participant.getAsJsonObject("attributes"), "e2e"),
						"Wrong attributes of " + identity + " in the Android app");
			}

			// Chrome mutes and unmutes its camera, and the app its own
			status = android.getStatus();
			chromeRun(chrome, "return window['room_0'].localParticipant.setCameraEnabled(false);");
			status = waitUntilEvents(android, "Chrome mutes its camera", status, roomEvent("TrackMuted"),
					remoteEvent(CHROME, "TrackMuted"));
			chromeRun(chrome, "return window['room_0'].localParticipant.setCameraEnabled(true);");
			status = waitUntilEvents(android, "Chrome unmutes its camera", status, roomEvent("TrackUnmuted"),
					remoteEvent(CHROME, "TrackUnmuted"));
			android.setSwitch("camera", false);
			status = waitUntilEvents(android, "the app mutes its camera", status, roomEvent("TrackMuted"),
					localEvent("TrackMuted"));
			android.setSwitch("camera", true);
			status = waitUntilEvents(android, "the app unmutes its camera", status, roomEvent("TrackUnmuted"),
					localEvent("TrackUnmuted"));

			// Chrome sends a data message
			status = android.getStatus();
			chromeRun(chrome, "return window['room_0'].localParticipant.publishData("
					+ "new TextEncoder().encode('Hello from Chrome'), { reliable: true, topic: 'openvidu-e2e' });");
			status = waitUntilEvents(android, "Chrome sends data", status, roomEvent("DataReceived"),
					remoteEvent(CHROME, "DataReceived"));

			// The view of Chrome's camera grows, is hidden and is shown again (TrackEvents)
			final int smallWidth = cameraViewWidth(status, CHROME);
			android.setSwitch("large_videos", true);
			status = waitUntilEvents(android, "the video views grow", status,
					cameraEvent(CHROME, "VideoDimensionsChanged"));
			status = android.waitUntilStatus("the view of Chrome's camera to be reported larger than " + smallWidth,
					s -> cameraViewWidth(s, CHROME) > smallWidth, ANDROID_WAIT);
			android.setSwitch("show_videos", false);
			status = waitUntilEvents(android, "the video views are hidden", status,
					cameraEvent(CHROME, "VisibilityChanged"));
			status = android.waitUntilStatus("the view of Chrome's camera to be reported hidden",
					s -> Boolean.FALSE.equals(cameraVisible(s, CHROME)), ANDROID_WAIT);
			android.setSwitch("show_videos", true);
			status = waitUntilEvents(android, "the video views are shown", status,
					cameraEvent(CHROME, "VisibilityChanged"));
			status = android.waitUntilStatus("the view of Chrome's camera to be reported visible",
					s -> Boolean.TRUE.equals(cameraVisible(s, CHROME)), ANDROID_WAIT);

			// Chrome forbids subscribing to its tracks, and then allows it again
			chromeRun(chrome, "window['room_0'].localParticipant.setTrackSubscriptionPermissions(false, []);");
			status = waitUntilEvents(android, "Chrome forbids its subscription", status,
					roomEvent("TrackSubscriptionPermissionChanged", 2),
					remoteEvent(CHROME, "TrackSubscriptionPermissionChanged", 2));
			chromeRun(chrome, "window['room_0'].localParticipant.setTrackSubscriptionPermissions(true, []);");
			status = waitUntilEvents(android, "Chrome allows its subscription", status,
					roomEvent("TrackSubscriptionPermissionChanged", 2),
					remoteEvent(CHROME, "TrackSubscriptionPermissionChanged", 2), roomEvent("TrackSubscribed", 2),
					remoteEvent(CHROME, "TrackSubscribed", 2));
			waitUntilAndroidAppDecodes(android, CHROME);

			// Chrome publishes an H.264 video, without a backup codec, and unpublishes it.
			// The app cannot subscribe to it: it decodes in software on an emulator, and
			// WebRTC's software decoders have no H.264 (SE_CODEC_UNSUPPORTED)
			status = android.getStatus();
			chromeRun(chrome, "const canvas = document.createElement('canvas');"
					+ "canvas.width = 320; canvas.height = 180;"
					+ "const context = canvas.getContext('2d');"
					+ "window.e2eCanvasTimer = setInterval(() => {"
					+ "  context.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');"
					+ "  context.fillRect(0, 0, 320, 180); }, 100);"
					+ "return window['room_0'].localParticipant.publishTrack(canvas.captureStream(10).getVideoTracks()[0],"
					+ "  { name: 'e2e-h264', source: 'screen_share', videoCodec: 'h264', simulcast: false,"
					+ "    backupCodec: false }).then(publication => { window.e2eH264 = publication; });");
			status = waitUntilEvents(android, "Chrome publishes an H.264 video", status, roomEvent("TrackPublished"),
					remoteEvent(CHROME, "TrackPublished"), roomEvent("TrackSubscriptionFailed"),
					remoteEvent(CHROME, "TrackSubscriptionFailed"));
			chromeRun(chrome, "clearInterval(window.e2eCanvasTimer);"
					+ "return window['room_0'].localParticipant.unpublishTrack(window.e2eH264.track);");
			status = waitUntilEvents(android, "Chrome unpublishes its H.264 video", status,
					roomEvent("TrackUnpublished"), remoteEvent(CHROME, "TrackUnpublished"));

			// The server takes the app's permission to publish: its tracks are unpublished,
			// and publishing its camera again fails
			serverCall(LK.updateParticipant(ROOM, ANDROID, null, null, ParticipantPermission.newBuilder()
					.setCanSubscribe(true).setCanPublish(false).setCanPublishData(true).build(), null));
			status = waitUntilEvents(android, "the app loses its permission to publish", status,
					roomEvent("ParticipantPermissionsChanged"), localEvent("ParticipantPermissionsChanged"),
					localEvent("LocalTrackUnpublished", 2));
			Assertions.assertFalse(
					OpenViduAndroidAppUser.localParticipant(status).get("canPublish").getAsBoolean(),
					"The Android app should not be allowed to publish");
			android.setSwitch("camera", false);
			android.setSwitch("camera", true);
			status = waitUntilEvents(android, "the app publishes its camera without permission", status,
					roomEvent("TrackPublicationFailed"), localEvent("LocalTrackPublicationFailed"));

			// Chrome leaves, and then the app
			chromeRun(chrome, "return window['room_0'].disconnect();");
			status = waitUntilEvents(android, "Chrome leaves", status, roomEvent("ParticipantDisconnected"),
					roomEvent("TrackUnsubscribed", 2), remoteEvent(CHROME, "TrackUnsubscribed", 2),
					roomEvent("TrackUnpublished", 2), remoteEvent(CHROME, "TrackUnpublished", 2));
			android.disconnect();
			status = waitUntilEvents(android, "the app leaves", status, roomEvent("Disconnected"));
			Assertions.assertEquals("DISCONNECTED", OpenViduAndroidAppUser.state(status),
					"The Android app should be disconnected");
		});
	}

	// Android app helpers

	private OpenViduAndroidAppUser setupAndroidAppUser() throws Exception {
		return new OpenViduAndroidAppUser(this.setupAndroidApp());
	}

	private interface AndroidTestBody {
		void run() throws Exception;
	}

	/**
	 * Runs the body of a test, and if it fails logs the app's status, its logcat
	 * and the emulator's output, and has the next test boot a new emulator, before
	 * failing
	 */
	private void withAndroidDiagnostics(OpenViduAndroidAppUser android, AndroidTestBody body) throws Exception {
		try {
			body.run();
		} catch (Exception | AssertionError e) {
			String status;
			try {
				status = android.getStatus().toString();
			} catch (Exception statusError) {
				status = "unavailable (" + statusError.getMessage() + ")";
			}
			log.error("The Android test failed. Status of the Android app: {}", status);
			log.error("Android diagnostics:\n{}", androidDiagnostics());
			discardAndroidEmulator();
			throw e;
		}
	}

	/**
	 * Connects the app to {@link #ROOM} as {@link #ANDROID}, with its test tone on,
	 * publishing its camera with the given codec (null for the SDK's default, VP8)
	 * and its microphone, and waits until both capture
	 */
	private void connectAndroidApp(OpenViduAndroidAppUser android, String videoCodec, boolean simulcast)
			throws Exception {
		AccessToken token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		token.setIdentity(ANDROID);
		token.addGrants(new RoomJoin(true), new RoomName(ROOM), new CanPublish(true), new CanSubscribe(true));
		android.setSwitch("test_tone", true);
		android.connect(livekitUrlForAndroidEmulator(), token.toJwt(), videoCodec, simulcast);
		android.waitUntilStatus("the Room to be connected with the camera and microphone published",
				status -> "CONNECTED".equals(OpenViduAndroidAppUser.state(status))
						&& OpenViduAndroidAppUser.localTrack(status, "video") != null
						&& OpenViduAndroidAppUser.localTrack(status, "audio") != null,
				ANDROID_WAIT);
		// What the others must receive: the images of the emulator's camera and the
		// test tone mixed into its microphone
		android.waitUntilStatus("the emulator's camera and microphone to capture (microphone level "
				+ ANDROID_MIN_AUDIO_LEVEL + " or more)",
				status -> OpenViduAndroidAppUser.localTrackCounter(status, "video", "frames") > 0
						&& OpenViduAndroidAppUser.localTrackCounter(status, "audio",
								"level") >= ANDROID_MIN_AUDIO_LEVEL,
				ANDROID_WAIT);
	}

	/**
	 * Waits until the app plays the video and the audio of every one of the
	 * remote participants: WebRTC decodes their video at ANDROID_MIN_VIDEO_FPS or
	 * more, and the app their audio in real time, over a window of at least
	 * MIN_FRAMES_DECODED_WINDOW_MILLIS, and the audio is not silence. The video is
	 * judged by the WebRTC stats, as in the browsers (see {@link DecodedFrames})
	 */
	private void waitUntilAndroidAppPlays(OpenViduAndroidAppUser android, Collection<String> identities)
			throws InterruptedException {
		final JsonObject first = android.waitUntilStatus(
				"the app to subscribe to the video and audio of " + identities + " and decode them",
				status -> identities.stream()
						.allMatch(identity -> OpenViduAndroidAppUser.remoteVideoInbound(status, identity,
								"framesDecoded") > 0
								&& OpenViduAndroidAppUser.remoteTrackCounter(status, identity, "audio", "samples") > 0),
				ANDROID_WAIT);
		final Map<String, DecodedFrames> decoded = new LinkedHashMap<>();
		identities.forEach(identity -> decoded.put(identity, new DecodedFrames(first, identity)));
		final long windowStart = System.currentTimeMillis();
		JsonObject last = android.waitUntilStatus(
				"the app to keep decoding the video (" + ANDROID_MIN_VIDEO_FPS + " fps or more) and the audio (level "
						+ ANDROID_MIN_AUDIO_LEVEL + " or more) of " + identities,
				status -> {
					long windowMillis = System.currentTimeMillis() - windowStart;
					return windowMillis >= MIN_FRAMES_DECODED_WINDOW_MILLIS
							&& identities.stream().allMatch(identity -> {
								long frames = decoded.get(identity).update(status);
								long samples = counterDelta(status, first, identity, "audio", "samples");
								long level = OpenViduAndroidAppUser.remoteTrackCounter(status, identity, "audio",
										"level");
								return frames * 1000 >= ANDROID_MIN_VIDEO_FPS * windowMillis
										&& samples * 1000 >= ANDROID_MIN_AUDIO_SAMPLES_PER_SECOND * windowMillis
										&& level >= ANDROID_MIN_AUDIO_LEVEL;
							});
				}, ANDROID_WAIT);
		for (String identity : identities) {
			Assertions.assertTrue(OpenViduAndroidAppUser.remoteVideoInbound(last, identity, "frameWidth") > 0
					&& OpenViduAndroidAppUser.remoteVideoInbound(last, identity, "frameHeight") > 0,
					"The Android app decodes video frames of " + identity + " without a size: " + last);
			warnIfFramesNotDelivered(first, last, identity);
		}
		log.info("The Android app plays every remote participant: {}", last);
	}

	/**
	 * Waits until WebRTC keeps decoding the video of the remote participant in the
	 * app at ANDROID_MIN_VIDEO_FPS or more, over a window of at least
	 * MIN_FRAMES_DECODED_WINDOW_MILLIS
	 */
	private void waitUntilAndroidAppDecodes(OpenViduAndroidAppUser android, String identity)
			throws InterruptedException {
		final JsonObject first = android.getStatus();
		final DecodedFrames decoded = new DecodedFrames(first, identity);
		final long windowStart = System.currentTimeMillis();
		final long[] windowMillis = { 0 };
		JsonObject last = android.waitUntilStatus(
				"the app to keep decoding the video of " + identity + " at " + ANDROID_MIN_VIDEO_FPS + " fps or more",
				status -> {
					windowMillis[0] = System.currentTimeMillis() - windowStart;
					return windowMillis[0] >= MIN_FRAMES_DECODED_WINDOW_MILLIS
							&& decoded.update(status) * 1000 >= ANDROID_MIN_VIDEO_FPS * windowMillis[0];
				}, ANDROID_WAIT);
		log.info("The Android app decodes the video of {} at {} fps", identity,
				String.format("%.1f", decoded.update(last) * 1000d / windowMillis[0]));
		warnIfFramesNotDelivered(first, last, identity);
	}

	/**
	 * Waits until the frames WebRTC decodes from the video of the remote
	 * participant in the app have the given height: the layer adaptive stream
	 * receives it at
	 */
	private void waitUntilAndroidAppReceivesVideoHeight(OpenViduAndroidAppUser android, String identity, int height)
			throws InterruptedException {
		JsonObject status = android.waitUntilStatus(
				"the app to receive the video of " + identity + " " + height + " pixels high",
				s -> OpenViduAndroidAppUser.remoteVideoInbound(s, identity, "frameHeight") == height, ANDROID_WAIT);
		log.info("The Android app receives the video of {}: {}", identity,
				OpenViduAndroidAppUser.remoteTrack(status, identity, "video"));
	}

	/**
	 * Waits until WebRTC decodes no new frame of the video of the remote
	 * participant in the app for 3 s in a row
	 */
	private void waitUntilAndroidAppStopsReceiving(OpenViduAndroidAppUser android, String identity)
			throws InterruptedException {
		final long[] previous = { -1, 0 }; // frames decoded, since
		android.waitUntilStatus("the app to stop receiving the video of " + identity + " for 3 s", status -> {
			long frames = OpenViduAndroidAppUser.remoteVideoInbound(status, identity, "framesDecoded");
			long now = System.currentTimeMillis();
			if (frames != previous[0]) {
				previous[0] = frames;
				previous[1] = now;
				return false;
			}
			return now - previous[1] >= 3000;
		}, ANDROID_WAIT);
	}

	/**
	 * The frames WebRTC decodes from the video of a remote participant in the app,
	 * from its inbound-rtp stats, accumulated across their restarts.
	 *
	 * The app's own VideoSink counts the frames that reach it as well ("frames"),
	 * but the tests do not rely on it. With adaptive stream, the LiveKit Android
	 * SDK makes WebRTC stop and recreate the receive stream of a video every time
	 * it stops receiving it and back (RemoteTrackPublication calls
	 * VideoTrack.setShouldReceive, from a coroutine of its IO dispatcher while that
	 * native call belongs to the signaling thread), and in about 4 of 10 runs, on
	 * pion and mediasoup alike, the recreated stream decodes frames that reach no
	 * sink ("VideoReceiveStreamInterface not connected to a VideoSink" in logcat):
	 * a problem of the SDK, not of the server. Then the browsers' criterion, frames
	 * decoded, is what tells the server delivered the video.
	 */
	private static final class DecodedFrames {
		private final String identity;
		private long last;
		private long total = 0;

		private DecodedFrames(JsonObject status, String identity) {
			this.identity = identity;
			this.last = OpenViduAndroidAppUser.remoteVideoInbound(status, identity, "framesDecoded");
		}

		// The frames decoded since the first status, given a later one
		private long update(JsonObject status) {
			long current = OpenViduAndroidAppUser.remoteVideoInbound(status, this.identity, "framesDecoded");
			if (current >= 0) {
				if (this.last >= 0) {
					this.total += current >= this.last ? current - this.last : current;
				} else {
					this.total += current;
				}
				this.last = current;
			}
			return this.total;
		}
	}

	/**
	 * Logs a warning if WebRTC decoded frames of the video of the remote
	 * participant between the two statuses but none reached the app (see
	 * {@link DecodedFrames})
	 */
	private void warnIfFramesNotDelivered(JsonObject first, JsonObject last, String identity) {
		long delivered = counterDelta(last, first, identity, "video", "frames");
		if (delivered <= 0) {
			log.warn("WebRTC decodes the video of {} in the Android app, but the LiveKit Android SDK delivers"
					+ " none of those frames to the app (a problem of the SDK with adaptive stream, see"
					+ " DecodedFrames): {}", identity, OpenViduAndroidAppUser.remoteTrack(last, identity, "video"));
		}
	}

	/**
	 * Waits until the app's encoder sends exactly the given simulcast layers (rids,
	 * sorted) and pauses the others, as dynacast asks it to
	 */
	private void waitUntilAndroidAppSendsLayers(OpenViduAndroidAppUser android, List<String> rids)
			throws InterruptedException {
		JsonObject status = android.waitUntilStatus(
				"its encoder to send only the simulcast layers " + rids + " (dynacast)",
				s -> activeLayers(s).equals(rids), ANDROID_WAIT);
		log.info("The Android app sends the simulcast layers {}: {}", rids,
				OpenViduAndroidAppUser.localVideoLayers(status));
	}

	/**
	 * An event the app counts (see {@link OpenViduAndroidAppUser}): a Room event,
	 * a participant event of the local participant or of a remote one, or a track
	 * event of the camera of a remote participant, which a step expects at least
	 * this many times
	 */
	private record AndroidEvent(String kind, Function<JsonObject, JsonObject> counts, String name, int times) {

		long count(JsonObject status) {
			JsonObject events;
			try {
				events = this.counts.apply(status);
			} catch (RuntimeException e) {
				events = null; // No such participant or track (yet)
			}
			return (events == null || !events.has(this.name)) ? 0 : events.get(this.name).getAsLong();
		}

		@Override
		public String toString() {
			return this.kind + " " + this.name + (this.times > 1 ? " x" + this.times : "");
		}
	}

	private static AndroidEvent roomEvent(String name) {
		return roomEvent(name, 1);
	}

	private static AndroidEvent roomEvent(String name, int times) {
		return new AndroidEvent("RoomEvent", status -> status.getAsJsonObject("events"), name, times);
	}

	private static AndroidEvent localEvent(String name) {
		return localEvent(name, 1);
	}

	private static AndroidEvent localEvent(String name, int times) {
		return new AndroidEvent("ParticipantEvent (local)",
				status -> OpenViduAndroidAppUser.localParticipant(status).getAsJsonObject("events"), name, times);
	}

	private static AndroidEvent remoteEvent(String identity, String name) {
		return remoteEvent(identity, name, 1);
	}

	private static AndroidEvent remoteEvent(String identity, String name, int times) {
		return new AndroidEvent("ParticipantEvent (" + identity + ")",
				status -> status.getAsJsonObject("remoteEvents").getAsJsonObject(identity), name, times);
	}

	private static AndroidEvent cameraEvent(String identity, String name) {
		return new AndroidEvent("TrackEvent (camera of " + identity + ")",
				status -> OpenViduAndroidAppUser.remoteTrackOfSource(status, identity, "CAMERA").getAsJsonObject("events"),
				name, 1);
	}

	/**
	 * Waits until the app has received every one of the events, as many times as
	 * each expects, since the status taken before the step that triggers them, and
	 * returns the status then
	 */
	private JsonObject waitUntilEvents(OpenViduAndroidAppUser android, String step, JsonObject before,
			AndroidEvent... events) throws InterruptedException {
		final long deadline = System.currentTimeMillis() + ANDROID_WAIT.toMillis();
		List<AndroidEvent> missing = List.of(events);
		JsonObject status = before;
		while (true) {
			try {
				final JsonObject current = android.getStatus();
				status = current;
				missing = Arrays.stream(events).filter(e -> e.count(current) - e.count(before) < e.times()).toList();
				if (missing.isEmpty()) {
					break;
				}
			} catch (RuntimeException e) {
				// The status is not JSON yet
			}
			if (System.currentTimeMillis() > deadline) {
				Assertions.fail("Android app, " + step + ": timeout after " + ANDROID_WAIT.toSeconds()
						+ " s waiting for " + missing + ". Last status: " + status);
			}
			Thread.sleep(500);
		}
		final JsonObject after = status;
		log.info("Android app, {}: {}", step, Arrays.stream(events)
				.map(e -> e + " (" + (e.count(after) - e.count(before)) + ")").collect(Collectors.joining(", ")));
		return status;
	}

	// What the last VisibilityChanged of the camera of the remote participant said, or null
	private static Boolean cameraVisible(JsonObject status, String identity) {
		JsonObject camera = OpenViduAndroidAppUser.remoteTrackOfSource(status, identity, "CAMERA");
		return (camera == null || !camera.has("visible") || camera.get("visible").isJsonNull()) ? null
				: camera.get("visible").getAsBoolean();
	}

	// The width of the views of the camera of the remote participant, as the last
	// VideoDimensionsChanged said, or 0
	private static int cameraViewWidth(JsonObject status, String identity) {
		String size = stringOrNull(OpenViduAndroidAppUser.remoteTrackOfSource(status, identity, "CAMERA"), "viewSize");
		return size == null ? 0 : Integer.parseInt(size.substring(0, size.indexOf('x')));
	}

	private static long counterDelta(JsonObject status, JsonObject first, String identity, String kind,
			String field) {
		return OpenViduAndroidAppUser.remoteTrackCounter(status, identity, kind, field)
				- OpenViduAndroidAppUser.remoteTrackCounter(first, identity, kind, field);
	}

	// The rids of the app's simulcast layers that are being sent, sorted
	private static List<String> activeLayers(JsonObject status) {
		return OpenViduAndroidAppUser.localVideoLayers(status).asList().stream().map(JsonElement::getAsJsonObject)
				.filter(layer -> layer.get("active").isJsonPrimitive() && layer.get("active").getAsBoolean())
				.map(layer -> stringOrNull(layer, "rid")).sorted().toList();
	}

	private static String stringOrNull(JsonObject json, String field) {
		return (json == null || !json.has(field) || json.get(field).isJsonNull()) ? null
				: json.get(field).getAsString();
	}

	// The layers of the track's first codec as the server has them (TrackInfo's own
	// layers are deprecated), 0 if it has no codec
	private static int videoLayers(TrackInfo track) {
		return track.getCodecsCount() == 0 ? 0 : track.getCodecs(0).getLayersCount();
	}

	private static boolean isGoodQuality(String quality) {
		return "EXCELLENT".equals(quality) || "GOOD".equals(quality);
	}

	// Server helpers

	private static <T> T serverCall(retrofit2.Call<T> call) throws IOException {
		retrofit2.Response<T> response = call.execute();
		Assertions.assertTrue(response.isSuccessful(),
				"Server API call failed: " + response.code() + " " + response.message());
		return response.body();
	}

	/** The app's published track of the given source, once the server has it */
	private TrackInfo androidTrack(TrackSource source) throws Exception {
		final long deadline = System.currentTimeMillis() + WAIT_UNTIL_MAX_MILLIS;
		while (true) {
			ParticipantInfo participant = LK.getParticipant(ROOM, ANDROID).execute().body();
			if (participant != null) {
				for (TrackInfo track : participant.getTracksList()) {
					if (track.getSource() == source) {
						return track;
					}
				}
			}
			if (System.currentTimeMillis() > deadline) {
				Assertions.fail(ANDROID + " has no published " + source + " track in Room " + ROOM + ": "
						+ participant);
			}
			Thread.sleep(250);
		}
	}

	private void waitUntilServerSeesMuted(TrackInfo track, boolean muted) throws Exception {
		final long deadline = System.currentTimeMillis() + WAIT_UNTIL_MAX_MILLIS;
		TrackInfo current = androidTrack(track.getSource());
		while (current.getMuted() != muted && System.currentTimeMillis() < deadline) {
			Thread.sleep(250);
			current = androidTrack(track.getSource());
		}
		Assertions.assertEquals(muted, current.getMuted(),
				"The server should see the Android app's " + track.getSource() + " track " + (muted ? "" : "un")
						+ "muted");
	}

	private static List<String> participantIdentities() throws IOException {
		List<ParticipantInfo> participants = LK.listParticipants(ROOM).execute().body();
		return participants == null ? List.of()
				: participants.stream().map(ParticipantInfo::getIdentity).sorted().toList();
	}

	// Testapp helpers

	/**
	 * Runs the script in the testapp as the body of a function, waits for the
	 * promise it may return, and fails if it throws or the promise rejects
	 */
	private static void chromeRun(OpenViduTestappUser user, String script) {
		Object result = ((JavascriptExecutor) user.getDriver())
				.executeAsyncScript("const done = arguments[arguments.length - 1];"
						+ "Promise.resolve().then(() => { " + script + " })"
						+ ".then(() => done('ok'), e => done('error: ' + e));");
		Assertions.assertEquals("ok", result, "Script failed in the testapp: " + script);
	}

	/**
	 * Names the last added testapp instance (index 0) and connects it to the Room
	 */
	private void connectTestappInstance(OpenViduTestappUser user, String name) {
		WebElement participantNameInput = user.getDriver().findElement(By.id("participant-name-input-0"));
		participantNameInput.clear();
		participantNameInput.sendKeys(name);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-0 .connect-btn")).click();
	}

	/**
	 * Waits until testapp instance 0 is connected, has published its camera and
	 * microphone (if it publishes) and plays the video and the audio of the given
	 * number of remote participants
	 */
	private void waitUntilTestappConnected(OpenViduTestappUser user, boolean publishes, int remoteParticipants)
			throws Exception {
		user.getEventManager().waitUntilEventReaches("connected", "RoomEvent", 1);
		if (publishes) {
			user.getEventManager().waitUntilEventReaches("localTrackPublished", "RoomEvent", 2);
		}
		user.getEventManager().waitUntilEventReaches("trackSubscribed", "RoomEvent", 2 * remoteParticipants);
		user.getWaiter().until(
				ExpectedConditions.numberOfElementsToBe(By.cssSelector("video.remote"), remoteParticipants));
		user.getWaiter().until(
				ExpectedConditions.numberOfElementsToBe(By.cssSelector("audio.remote"), remoteParticipants));
	}

	/** The video element of the testapp that plays the given track */
	private WebElement testappVideoOf(OpenViduTestappUser user, TrackInfo track) {
		return user.getDriver().findElement(By.cssSelector("video.remote[id*='--" + track.getSid() + "']"));
	}

	/**
	 * Waits until the testapp plays the app's video (at ANDROID_MIN_VIDEO_FPS or
	 * more) and its audio (audible)
	 */
	private void waitUntilTestappPlaysAndroidApp(OpenViduTestappUser user, TrackInfo androidVideo)
			throws InterruptedException {
		waitUntilSubscriberFramesDecodedIncrease(user, testappVideoOf(user, androidVideo), ANDROID_MIN_VIDEO_FPS);
		waitUntilRemoteAudioIsAudible(user, ANDROID);
	}

	/**
	 * Waits until the script, run in the testapp with the given arguments, returns
	 * a value that fulfils the condition
	 */
	private void waitUntilTestapp(OpenViduTestappUser user, String description, String script,
			Predicate<Object> condition, Object... arguments) throws InterruptedException {
		final JavascriptExecutor js = (JavascriptExecutor) user.getDriver();
		final long deadline = System.currentTimeMillis() + ANDROID_WAIT.toMillis();
		Object last = null;
		while (System.currentTimeMillis() < deadline) {
			last = js.executeScript(script, arguments);
			if (condition.test(last)) {
				return;
			}
			Thread.sleep(500);
		}
		Assertions.fail(browserName(user) + ": timeout waiting for " + description + ". Last value: " + last);
	}

	/**
	 * Waits until the testapp (instance 0) plays the audio of the remote
	 * participant: the inbound-rtp stats of that audio track keep receiving
	 * packets, and their audio energy grows at the rate of an audible sound, not of
	 * the comfort noise a silent microphone sends. Measured over a window of at
	 * least MIN_FRAMES_DECODED_WINDOW_MILLIS.
	 */
	private void waitUntilRemoteAudioIsAudible(OpenViduTestappUser user, String remoteIdentity)
			throws InterruptedException {
		// The inbound-rtp stats as JSON, or why there are none
		final String script = "const done = arguments[arguments.length - 1];"
				+ "const participant = window['room_0'].remoteParticipants.get(arguments[0]);"
				+ "const publication = participant && Array.from(participant.audioTrackPublications.values())[0];"
				+ "const receiver = publication && publication.track && publication.track.receiver;"
				+ "if (!receiver) { done('no audio track of ' + arguments[0]); return; }"
				+ "receiver.getStats().then(stats => {"
				+ "  let inbound = null;"
				+ "  stats.forEach(s => { if (s.type === 'inbound-rtp') inbound = s; });"
				+ "  done(inbound ? JSON.stringify(inbound) : 'no inbound-rtp stats');"
				+ "}, e => done('getStats failed: ' + e));";
		final JavascriptExecutor js = (JavascriptExecutor) user.getDriver();
		final long deadline = System.currentTimeMillis() + WAIT_UNTIL_MAX_MILLIS;
		JsonObject first = null;
		long windowStart = 0;
		String last = "none";
		while (System.currentTimeMillis() < deadline) {
			last = String.valueOf(js.executeAsyncScript(script, remoteIdentity));
			if (last.startsWith("{")) {
				JsonObject stats = JsonParser.parseString(last).getAsJsonObject();
				if (first == null) {
					first = stats;
					windowStart = System.currentTimeMillis();
				} else if (System.currentTimeMillis() - windowStart >= MIN_FRAMES_DECODED_WINDOW_MILLIS
						&& audioStat(stats, "packetsReceived") > audioStat(first, "packetsReceived")) {
					double seconds = audioStat(stats, "totalSamplesDuration")
							- audioStat(first, "totalSamplesDuration");
					double energy = audioStat(stats, "totalAudioEnergy") - audioStat(first, "totalAudioEnergy");
					if (seconds > 0 && energy / seconds >= BROWSER_MIN_AUDIO_MEAN_SQUARE) {
						log.info("{} plays the audio of {}: mean square of the audio level {} over {} s",
								browserName(user), remoteIdentity, energy / seconds, seconds);
						return;
					}
				}
			}
			Thread.sleep(500);
		}
		Assertions.fail(browserName(user) + ": timeout waiting to play audible audio from " + remoteIdentity
				+ " (mean square of the audio level " + BROWSER_MIN_AUDIO_MEAN_SQUARE + " or more). First stats: "
				+ first + ". Last stats: " + last);
	}

	private static double audioStat(JsonObject stats, String name) {
		return stats.has(name) ? stats.get(name).getAsDouble() : 0;
	}

	/**
	 * Waits until the frame width of the remote video is the same in three samples
	 * in a row, a second apart, and returns it
	 */
	private int waitUntilSubscriberFrameWidthSettles(OpenViduTestappUser user, WebElement video)
			throws InterruptedException {
		final long deadline = System.currentTimeMillis() + WAIT_UNTIL_MAX_MILLIS;
		int width = -1;
		int samples = 0;
		while (samples < 3 && System.currentTimeMillis() < deadline) {
			int current = this.getSubscriberVideoFrameWidth(user, video);
			samples = (current == width) ? samples + 1 : 1;
			width = current;
			Thread.sleep(1000);
		}
		Assertions.assertEquals(3, samples, "The frame width of the remote video never settled (last " + width + ")");
		log.info("{} receives the Android app's video {} pixels wide", browserName(user), width);
		return width;
	}

	private void waitUntilSubscriberFrameWidthAtLeast(OpenViduTestappUser user, WebElement video, int width) {
		final JsonObject[] lastLayer = { new JsonObject() };
		this.waitUntilAux(user, video, () -> {
			lastLayer[0] = this.getSubscriberVideoLayer(user, video);
			long frameWidth = this.getLayerCounter(lastLayer[0], "frameWidth");
			return isStatPresent(frameWidth) && frameWidth >= width;
		}, () -> "Timeout waiting for a frame width of at least " + width + ". "
				+ describeSubscriberVideoLayer(lastLayer[0]));
		log.info("{} receives the Android app's video {} pixels wide (at least {})", browserName(user),
				this.getLayerCounter(lastLayer[0], "frameWidth"), width);
	}

	private static String browserName(OpenViduTestappUser user) {
		return ((RemoteWebDriver) user.getDriver()).getCapabilities().getBrowserName();
	}

}
