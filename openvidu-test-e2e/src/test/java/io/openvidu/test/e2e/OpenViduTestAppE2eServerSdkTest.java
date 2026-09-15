package io.openvidu.test.e2e;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.TrackInfo;
import livekit.LivekitModels.TrackType;
import livekit.LivekitModels.VideoLayer;

/**
 * E2E tests of the LiveKit server RTC SDK publishers (go, node, python, rust,
 * dotnet) against browser subscribers.
 *
 * Split out of {@link OpenViduTestAppE2eTest} because the full matrix is slow:
 * this way it can be run on its own with
 * {@code mvn -Dtest=OpenViduTestAppE2eServerSdkTest test}, and the system
 * properties {@code sdk.codecs} / {@code sdk.layers} narrow it further.
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@Tag("e2e")
@DisplayName("E2E tests for OpenVidu TestApp: server SDK publishers")
@ExtendWith(SpringExtension.class)
public class OpenViduTestAppE2eServerSdkTest extends AbstractOpenViduTestappE2eTest {

	@BeforeAll()
	protected static void setupAll() throws Exception {
		loadEnvironmentVariables();
		setUpLiveKitClient();
		CompletableFuture.runAsync(OpenViduTestAppE2eServerSdkTest::pullRemoteBrowserImages);
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
	 * {vp8, h264, vp9, av1} x {1, 2, 3} layers, single-layer cases first. System
	 * properties sdk.codecs / sdk.layers (comma-separated) restrict the matrix,
	 * e.g. -Dsdk.layers=2,3 -Dsdk.codecs=vp9,av1; unset means all. A blank
	 * property or a selection matching no case fails here with the offending
	 * values.
	 */
	static Stream<Arguments> serverSdkPublisherMatrix() {
		List<String> layersFilter = matrixFilter("sdk.layers", "1,2,3");
		List<String> codecsFilter = matrixFilter("sdk.codecs", "vp8,h264,vp9,av1");
		List<Arguments> matrix = Stream.of(1, 2, 3).filter(layers -> layersFilter.contains(String.valueOf(layers)))
				.flatMap(layers -> Stream.of("vp8", "h264", "vp9", "av1").filter(codecsFilter::contains)
						.map(codec -> Arguments.of(codec, layers)))
				.toList();
		if (matrix.isEmpty()) {
			throw new IllegalArgumentException("System properties sdk.layers=" + layersFilter + " and sdk.codecs="
					+ codecsFilter + " select no server SDK test case: sdk.layers takes values among 1, 2, 3 and "
					+ "sdk.codecs among vp8, h264, vp9, av1 (comma-separated)");
		}
		return matrix.stream();
	}

	private static List<String> matrixFilter(String property, String defaultValue) {
		String value = System.getProperty(property);
		if (value == null) {
			return List.of(defaultValue.split(","));
		}
		if (value.isBlank()) {
			throw new IllegalArgumentException("System property " + property
					+ " is blank and would select no server SDK test case: set it to comma-separated values ("
					+ defaultValue + " for all) or leave it unset");
		}
		return Arrays.stream(value.split(",")).map(String::trim).toList();
	}

	@ParameterizedTest(name = "Go SDK {0} {1}-layer publisher to Chrome and Firefox early and late subscribers")
	@MethodSource("serverSdkPublisherMatrix")
	@DisplayName("Go SDK publisher to Chrome and Firefox early and late subscribers")
	void goSdkPublisherToBrowserSubscribersTest(String codec, int layers) throws Exception {
		serverSdkPublisherToBrowserSubscribersAux("go", codec, layers);
	}

	@ParameterizedTest(name = "Node SDK {0} {1}-layer publisher to Chrome and Firefox early and late subscribers")
	@MethodSource("serverSdkPublisherMatrix")
	@DisplayName("Node SDK publisher to Chrome and Firefox early and late subscribers")
	void nodeSdkPublisherToBrowserSubscribersTest(String codec, int layers) throws Exception {
		serverSdkPublisherToBrowserSubscribersAux("node", codec, layers);
	}

	@ParameterizedTest(name = "Python SDK {0} {1}-layer publisher to Chrome and Firefox early and late subscribers")
	@MethodSource("serverSdkPublisherMatrix")
	@DisplayName("Python SDK publisher to Chrome and Firefox early and late subscribers")
	void pythonSdkPublisherToBrowserSubscribersTest(String codec, int layers) throws Exception {
		serverSdkPublisherToBrowserSubscribersAux("python", codec, layers);
	}

	@ParameterizedTest(name = "Rust SDK {0} {1}-layer publisher to Chrome and Firefox early and late subscribers")
	@MethodSource("serverSdkPublisherMatrix")
	@DisplayName("Rust SDK publisher to Chrome and Firefox early and late subscribers")
	void rustSdkPublisherToBrowserSubscribersTest(String codec, int layers) throws Exception {
		serverSdkPublisherToBrowserSubscribersAux("rust", codec, layers);
	}

	@ParameterizedTest(name = ".NET SDK {0} {1}-layer publisher to Chrome and Firefox early and late subscribers")
	@MethodSource("serverSdkPublisherMatrix")
	@DisplayName(".NET SDK publisher to Chrome and Firefox early and late subscribers")
	void dotnetSdkPublisherToBrowserSubscribersTest(String codec, int layers) throws Exception {
		// Requires Livekit.Rtc.Dotnet >= 0.1.4 (TrackPublishOptions.VideoCodec)
		serverSdkPublisherToBrowserSubscribersAux("dotnet", codec, layers);
	}

	/**
	 * A subscriber-only participant of the room: the testapp instance (index
	 * within its browser page) that hosts it, and its participant name.
	 */
	private record Subscriber(OpenViduTestappUser user, int instance, String name) {
		String instanceSelector() {
			return "#openvidu-instance-" + instance;
		}

		WebElement remoteVideo() {
			return user.getDriver().findElement(By.cssSelector(instanceSelector() + " video.remote"));
		}
	}

	/**
	 * A Chrome browser and a Firefox browser each connect one subscriber-only
	 * participant to the room; then a LiveKit server RTC SDK participant joins it,
	 * publishing a single video track with the given codec and number of layers:
	 * one plain RTP encoding (1), or two or three layers (simulcast for VP8/H264,
	 * SVC L2T2 / L3T3 for VP9/AV1). Both early subscribers, already subscribed when
	 * the track appears, must receive it with that codec and those layers; with
	 * several layers they switch to the LOW, (MEDIUM) and HIGH layers. Then each
	 * browser adds a second subscriber-only participant as a late subscriber (the
	 * publisher has been streaming for a while, so its first frame depends on the
	 * SFU requesting a keyframe) that goes through the same media and layer checks
	 * while the early subscribers keep the HIGH layer. The room ends up with 5
	 * participants, and both join orders are covered in both browsers.
	 */
	private void serverSdkPublisherToBrowserSubscribersAux(String sdk, String codec, int layers) throws Exception {
		final String expectedCodec = "video/" + codec.toUpperCase();
		final String publisherIdentity = sdk + "-publisher";
		final boolean multiLayer = layers > 1;

		// The Go SDK forwards pre-encoded samples (no encoder), so its only
		// multi-layer shape is RID simulcast — and LiveKit does not support RID
		// simulcast for the SVC-class codecs (multi-layer VP9/AV1 must be SVC):
		// that combination is skipped as an unsupported publish shape
		Assumptions.assumeFalse(multiLayer && "go".equals(sdk) && ("vp9".equals(codec) || "av1".equals(codec)),
				"The Go SDK cannot publish SVC, and VP9/AV1 RID simulcast is not a supported LiveKit publish shape");

		log.info("{} SDK {} {}-layer publisher to Chrome and Firefox early and late subscribers", sdk, codec,
				layers);

		OpenViduTestappUser chrome = setupBrowserAndConnectToOpenViduTestapp("chrome");
		OpenViduTestappUser firefox = setupBrowserAndConnectToOpenViduTestapp("firefox");

		// Early subscribers: in the room before the SDK publishes
		List<Subscriber> earlySubscribers = List.of(joinAsSubscriberOnly(chrome, "early"),
				joinAsSubscriberOnly(firefox, "early"));

		this.startServerSdkPublisher(sdk, "TestRoom", codec, layers);

		// The server's authoritative view of the publication (RoomService API):
		// the LiveKit TrackInfo of a video publication lists one layer per
		// simulcast layer or SVC spatial layer, so one plain encoding (no
		// simulcast, no SVC / L1T1) has exactly one layer and a two- or
		// three-layer publish (simulcast or SVC L2T2 / L3T3) has two or three
		TrackInfo trackInfo = this.getPublishedVideoTrackInfo("TestRoom", publisherIdentity);
		Assertions.assertEquals(layers, trackInfo.getLayersCount(), "Expected " + layers
				+ " video layer(s) in the track published by the " + sdk + " SDK, but the server reports "
				+ trackInfo.getLayersList());
		Assertions.assertEquals(layers, trackInfo.getCodecs(0).getLayersCount(),
				"Expected " + layers + " video layer(s) for codec " + expectedCodec + " published by the " + sdk
						+ " SDK");
		Assertions.assertEquals(layers, sortedLayerWidths(trackInfo).size(),
				"Expected " + layers + " video layers of distinct widths published by the " + sdk + " SDK, but got "
						+ trackInfo.getLayersList());
		// VP8/H264 multi-layer publishes are simulcast and VP9/AV1 ones are SVC,
		// except for the Go SDK: it forwards pre-encoded samples (no encoder, so
		// no SVC) and publishes simulcast for every codec
		final boolean expectSimulcast = multiLayer && ("vp8".equals(codec) || "h264".equals(codec) || "go".equals(sdk));
		if (!multiLayer || expectSimulcast) {
			Assertions.assertEquals(expectSimulcast, trackInfo.getSimulcast(),
					"Simulcast flag of the track published by the " + sdk + " SDK");
			// (the server's explicit SVC verdict: an SVC publication would be
			// MULTIPLE_SPATIAL_LAYERS_PER_STREAM)
			Assertions.assertEquals(VideoLayer.Mode.ONE_SPATIAL_LAYER_PER_STREAM,
					trackInfo.getCodecs(0).getVideoLayerMode(),
					"The track published by the " + sdk + " SDK should not be SVC");
		}

		for (Subscriber subscriber : earlySubscribers) {
			assertSubscriberReceivesVideo(subscriber, sdk, publisherIdentity, expectedCodec, trackInfo);
		}
		assertSubscribersSwitchLayers(earlySubscribers, trackInfo);

		// Late subscribers: the publisher has been streaming for a while
		List<Subscriber> lateSubscribers = List.of(joinAsSubscriberOnly(chrome, "late"),
				joinAsSubscriberOnly(firefox, "late"));
		for (Subscriber subscriber : lateSubscribers) {
			assertSubscriberReceivesVideo(subscriber, sdk, publisherIdentity, expectedCodec, trackInfo);
		}
		assertSubscribersSwitchLayers(lateSubscribers, trackInfo);

		gracefullyLeaveParticipants(chrome, 2);
		gracefullyLeaveParticipants(firefox, 2);
	}

	/**
	 * Adds a testapp instance to the browser page and connects it to the default
	 * room as a subscriber-only participant named "<Browser>-<role>-subscriber"
	 * (e.g. "Chrome-early-subscriber"), with adaptiveStream disabled, and waits
	 * until it is active.
	 */
	private Subscriber joinAsSubscriberOnly(OpenViduTestappUser user, String role) throws Exception {
		// The new instance takes the next index
		final int instance = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size();
		final String name = browserName(user) + "-" + role + "-subscriber";
		this.addSubscriber(user, false);
		WebElement participantNameInput = user.getDriver().findElement(By.id("participant-name-input-" + instance));
		participantNameInput.clear();
		participantNameInput.sendKeys(name);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + instance + " .connect-btn"))
				.sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(instance, "connected", "RoomEvent", 1);
		user.getEventManager().waitUntilEventReaches(instance, "active", "ParticipantEvent", 1);
		return new Subscriber(user, instance, name);
	}

	/** "Chrome", "Firefox"... from the BrowserUser class of the testapp user. */
	private String browserName(OpenViduTestappUser user) {
		return user.getBrowserUser().getClass().getSimpleName().replace("User", "");
	}

	/**
	 * Selects the max video quality (LOW, MEDIUM or HIGH) of the remote track of
	 * the subscriber's testapp instance, closing the track info dialog if it is
	 * open. The selection is verified (selectMatOption): a click that only opened
	 * or closed the mat-select panel is retried instead of leaving the panel open
	 * over the page, which would block the later clicks on the video controls.
	 */
	private void selectSubscriberVideoQuality(Subscriber subscriber, String quality) throws InterruptedException {
		this.selectSubscriberVideoQuality(subscriber.user(), subscriber.instanceSelector(), quality);
	}

	/**
	 * The subscriber-only participant must receive the video track published by
	 * the SDK participant: media actually flowing, with the expected codec, with
	 * the layers the server reports in trackInfo.
	 */
	private void assertSubscriberReceivesVideo(Subscriber subscriber, String sdk, String publisherIdentity,
			String expectedCodec, TrackInfo trackInfo) throws Exception {
		final OpenViduTestappUser user = subscriber.user();
		final String name = subscriber.name();

		user.getEventManager().waitUntilEventReaches(subscriber.instance(), "trackSubscribed", "ParticipantEvent",
				1);

		user.getWaiter().until(
				ExpectedConditions.numberOfElementsToBe(By.cssSelector(subscriber.instanceSelector() + " video"), 1));
		Assertions.assertTrue(assertAllElementsHaveTracks(user, subscriber.instanceSelector() + " video", false, true),
				name + ": HTMLVideoElements were expected to have only one video track");

		WebElement subscriberVideo = subscriber.remoteVideo();

		// Media must actually reach the subscriber (with the codec-binding bug
		// present the track subscribes but receives 0 bytes forever; a late
		// subscriber additionally depends on the SFU requesting a keyframe)
		waitUntilVideoLayersNotEmpty(user, subscriberVideo);
		this.waitUntilSubscriberBytesReceivedIncreasing(user, subscriberVideo);
		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);

		// And with the codec the publisher actually sends (a Producer bound to
		// the wrong codec makes every subscriber negotiate that wrong codec)
		Assertions.assertEquals(expectedCodec, this.getSubscriberVideoCodec(user, subscriberVideo),
				name + " should negotiate the codec the " + sdk + " SDK publisher sends");

		// And with the layers the server reports, in the track info received by
		// the subscriber
		JsonArray subscriberLayers = this.getRemoteVideoTrackInfoLayers(subscriber, publisherIdentity);
		Assertions.assertEquals(trackInfo.getLayersCount(), subscriberLayers.size(),
				"Expected " + trackInfo.getLayersCount() + " video layer(s) in the track published by the " + sdk
						+ " SDK, but " + name + " sees " + subscriberLayers);
	}

	/**
	 * With more than one published layer, the given subscribers (all of them
	 * receiving the track already) switch together to the LOW layer, then (with
	 * three layers) to the MEDIUM one and then to the HIGH one, each subscriber
	 * recognising each layer by its frame width. With adaptiveStream disabled the
	 * received layer only changes through the max-video-quality selector, and
	 * each layer must actually decode (framesPerSecond > 0: an undecodable layer
	 * still reports its frame size): this proves that the publisher sends every
	 * layer and that the SFU forwards the requested one, also the middle spatial
	 * layer, which neither LOW nor HIGH can clamp to. The declared widths are
	 * reliable because the FFI publishers publish with degradation preference
	 * MAINTAIN_RESOLUTION and capture at 15 fps: with the SDKs' default
	 * (MAINTAIN_FRAMERATE) libwebrtc scales the source down under CPU load
	 * (1280x720 to 960x540 and 640x360, dropping the smallest simulcast layer),
	 * so on loaded CI runners the SFU forwarded the requested layer but its frames
	 * never had the declared width.
	 */
	private void assertSubscribersSwitchLayers(List<Subscriber> subscribers, TrackInfo trackInfo) throws Exception {
		List<Integer> layerWidths = sortedLayerWidths(trackInfo);
		if (layerWidths.size() < 2) {
			return;
		}
		for (Subscriber subscriber : subscribers) {
			this.selectQualityAndAwaitLayer(subscriber, "LOW", layerWidths.get(0));
		}
		if (layerWidths.size() > 2) {
			for (Subscriber subscriber : subscribers) {
				this.selectQualityAndAwaitLayer(subscriber, "MEDIUM", layerWidths.get(1));
			}
		}
		for (Subscriber subscriber : subscribers) {
			this.selectQualityAndAwaitLayer(subscriber, "HIGH", layerWidths.get(layerWidths.size() - 1));
		}
	}

	/**
	 * Selects the max video quality of the subscriber's remote track and waits
	 * until the received video has the frame width of that layer and decodes
	 * (framesPerSecond > 0). Retries the selection once: under CPU load the SFU
	 * can take longer than one wait window to ramp back up to a higher layer.
	 */
	private void selectQualityAndAwaitLayer(Subscriber subscriber, String quality, int expectedFrameWidth)
			throws Exception {
		OpenViduTestappUser user = subscriber.user();
		WebElement subscriberVideo = subscriber.remoteVideo();
		for (int attempt = 1; attempt <= 2; attempt++) {
			this.selectSubscriberVideoQuality(subscriber, quality);
			try {
				this.waitUntilSubscriberFrameWidthIs(user, subscriberVideo, expectedFrameWidth);
				break;
			} catch (AssertionError e) {
				if (attempt == 2) {
					throw e;
				}
			}
		}
		this.waitUntilSubscriberFramesPerSecondNotZero(user, subscriberVideo);
	}

	/**
	 * Distinct widths of the published layers, lowest first, from the server's
	 * TrackInfo. The layers are picked by width, not by their VideoQuality label:
	 * the SDKs label a two-layer publish inconsistently (simulcast: LOW + MEDIUM;
	 * SVC L2T2: MEDIUM + HIGH; the Go program: LOW + HIGH), while the
	 * subscriber's LOW/HIGH selection always clamps to the lowest/highest
	 * available layer and MEDIUM, only used with three layers, is the middle one.
	 */
	private List<Integer> sortedLayerWidths(TrackInfo trackInfo) {
		return trackInfo.getLayersList().stream().map(VideoLayer::getWidth).distinct().sorted().toList();
	}

	/**
	 * The first video track published by the given participant, as reported by
	 * the LiveKit server (RoomService GetParticipant). Waits up to 10 seconds for
	 * it: the SDK programs log TRACK_PUBLISHED as soon as their publish call
	 * returns, a few milliseconds before the server registers the track.
	 */
	private TrackInfo getPublishedVideoTrackInfo(String roomName, String participantIdentity) throws Exception {
		for (int attempt = 0; attempt < 40; attempt++) {
			ParticipantInfo participant = LK.getParticipant(roomName, participantIdentity).execute().body();
			if (participant != null) {
				Optional<TrackInfo> videoTrack = participant.getTracksList().stream()
						.filter(track -> track.getType() == TrackType.VIDEO).findFirst();
				if (videoTrack.isPresent()) {
					return videoTrack.get();
				}
			}
			Thread.sleep(250);
		}
		throw new AssertionError(participantIdentity + " has no published video track in room " + roomName);
	}

	/**
	 * Video layers (VideoLayer[] of the LiveKit TrackInfo) of the first video
	 * track published by the remote participant with the given identity, as seen
	 * by the local participant of the subscriber's testapp instance.
	 */
	private JsonArray getRemoteVideoTrackInfoLayers(Subscriber subscriber, String participantIdentity) {
		String layers = (String) ((JavascriptExecutor) subscriber.user().getDriver()).executeScript(
				"var room = window['room_" + subscriber.instance() + "'];"
						+ "var participant = room.remoteParticipants.get(arguments[0]);"
						+ "var publication = participant.videoTrackPublications.values().next().value;"
						+ "return JSON.stringify(publication.trackInfo.layers);",
				participantIdentity);
		return JsonParser.parseString(layers).getAsJsonArray();
	}
}
