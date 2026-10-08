package io.openvidu.test.e2e;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.DoubleSummaryStatistics;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomCreate;
import io.livekit.server.RoomRecord;
import io.minio.DownloadObjectArgs;
import io.minio.MinioClient;
import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.TrackInfo;
import livekit.LivekitModels.TrackSource;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * E2E tests of the egress features that only openvidu/egress-pro has, so every
 * test here needs it (openvidu/egress fails them all): Participant Passthrough
 * Egress and AV1 Track Egress. The other egress tests, which Community's
 * openvidu/egress passes, stay in {@link OpenViduTestAppE2eTest}.
 *
 * Participant Passthrough Egress is the egress that records the
 * audio track and the video track of a participant, as they are published,
 * without transcoding, into one Matroska/WebM file whose tracks share one
 * timeline (OpenVidu egress fork: the PASSTHROUGH preset extended from one
 * track to an audio track plus a video track). It is requested with
 * StartParticipantEgress, or with StartEgress and a MediaSource, and preset
 * PASSTHROUGH.
 *
 * Publishers are openvidu-testapp instances whose camera, screen and microphone
 * are replaced (src/test/resources/participant-passthrough-sync-media.js) by
 * canvases (camera 640x480, screen 800x600) that flash white and a tone that
 * beeps during the first 100 ms of every second of one clock, the page clock.
 * The canvases also show a bar that crosses them once every 2 s of that clock,
 * so every video frame tells the page time it shows, to a few ms. Every
 * recording is downloaded and checked with ffprobe and ffmpeg: its container
 * and tracks, that it decodes without errors, that its audio is continuous,
 * that its timestamps are the original ones (every frame keeps the place the
 * bar gives it, and every beep lands on the same fraction of a second, across
 * mutes and republished tracks) and that every beep sounds when the video shows
 * a whole second (A/V sync), whenever each track was published.
 *
 * AV1 Track Egress writes an AV1 track to WebM without transcoding:
 * av1TrackEgressTest runs the AV1 cases of the Track Egress matrix, which
 * {@link OpenViduTestAppE2eTest} runs for the other codecs.
 *
 * Needs the Compose deployment (egress + MinIO) running openvidu/egress-pro,
 * which exits at startup without a valid OpenVidu PRO license (the CI workflow
 * "OpenVidu Pro E2E Egress Pro tests" sets both up), and ffmpeg/ffprobe on the
 * host, with libvpx and libdav1d.
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@Tag("e2e")
@DisplayName("E2E tests for OpenVidu TestApp: egress-pro")
@ExtendWith(SpringExtension.class)
public class OpenViduTestAppE2eEgressProTest extends AbstractOpenViduTestappE2eTest {

	private static final String EGRESS_CONTAINER = "egress";
	private static final String EGRESS_TMP_DIR = "/home/egress/tmp";
	private static final String MINIO_BUCKET = "openvidu-appdata";
	private static final MediaType JSON = MediaType.parse("application/json");

	// Sizes of the synthetic camera and screen
	private static final int CAMERA_WIDTH = 640;
	private static final int CAMERA_HEIGHT = 480;
	private static final int SCREEN_WIDTH = 800;
	private static final int SCREEN_HEIGHT = 600;

	// A/V sync tolerance, for every beep: how far from a whole second the page time
	// that the video shows at the beep's instant is (the bar gives it to a few ms).
	// The Opus encoder delays the beep by its look-ahead, and the sync engine moves
	// each track while it settles
	private static final double AV_SYNC_TOLERANCE_MS = 100;
	// A flash and a beep further apart than this are not each other's pair
	private static final double MARKER_PAIR_WINDOW = 0.4;
	// Timestamps are the original ones when every beep lands on the same fraction
	// of a second as the others, within this tolerance. The synthetic source itself
	// wanders: over a long recording the beeps move up to 40 ms in the audio, whose
	// timestamps are evenly spaced (the browser's audio clocks against the page
	// clock); the errors this check is for are 100 ms and more (a track placed off,
	// frames moved or dropped)
	private static final double AUDIO_PHASE_TOLERANCE_MS = 60;
	// And when every video frame keeps the place the bar gives it on the page clock
	// (file time - page time), within this tolerance of the track's median. The bar
	// is read to a few ms; what moves a track is the egress's sync engine: it slews a
	// track at 5 ms/s while it settles (by 40 ms in a minute on pion), and with
	// mediasoup it shifts the video by up to 82 ms around an unmute (it rejects the
	// sender reports that follow as outliers, then rebuilds its estimate). The
	// errors this check is for are 100 ms and more
	private static final double VIDEO_PLACEMENT_TOLERANCE_MS = 90;
	// The bar crosses the canvas once every BAR_PERIOD_MS of the page clock (a
	// multiple of 1000: it tells whole seconds too). A frame drawn late by the page
	// shows older content: a frame's placement is the lowest in the BAR_WINDOW_S
	// around it, which a track misplaced or frames moved for longer still show
	private static final double BAR_PERIOD_MS = 2000;
	private static final double BAR_WINDOW_S = 0.5;
	// Width of the luma row the bar is read from, whatever the frame size
	private static final int BAR_ROW_WIDTH = 640;
	// A/V offset drift allowed between the start and the end of a long recording
	private static final double MAX_AV_DRIFT_MS = 40;
	// The SDK egress's sync engine places a track by its arrival time until it has
	// four sender reports for it (about 12 s with LiveKit's SFU, which sends one
	// every 3 s), and then slews it at 5 ms per second to where the reports put it
	// (video arrives some 60 ms after it is captured): the A/V offset of a
	// recording may move 50-75 ms during its first 25 s. The checks of the A/V
	// offset over time start after that
	private static final double SYNC_CONVERGENCE_S = 25;
	// Longest hole allowed in an audio track: it must be continuous (gaps are
	// filled with silence)
	private static final double MAX_AUDIO_GAP_MS = 60;
	// Smallest video frame side: the SFU flushes a closed down-track with 8x8
	// (VP8) or 2x2 (H264) black keyframes, which the recording must not contain
	private static final int MIN_VIDEO_SIDE = 16;
	// Network trouble (see networkTrouble) starts once the sync engine has settled
	// and the A/V offset was measured for a while, and lasts NETWORK_TROUBLE_S (an
	// outage, SHORT_OUTAGE_S or LONG_OUTAGE_S, with OUTAGE_RECOVERY_S after it). The
	// first estimate the sync engine makes of a track's clock (at 12 s) is often
	// thrown away at 27-33 s, which puts the track back on arrival times for 9 s and
	// moves it by up to 90 ms: the trouble starts after that. The recording must be
	// back to what it was before it once the network has been fine for
	// NETWORK_RECOVERY_S (the sync engine absorbs what the trouble moved at 5 ms/s:
	// seen, up to 17 s), and is checked for NETWORK_HEALED_S more
	private static final double NETWORK_TROUBLE_AT_S = SYNC_CONVERGENCE_S + 20;
	private static final int NETWORK_TROUBLE_S = 15;
	private static final int NETWORK_RECOVERY_S = 30;
	private static final int NETWORK_HEALED_S = 12;
	// How far the A/V offset may be, once healed, from the range it spanned before
	// the trouble. The sync engine moves a track by itself, network trouble or
	// not: whenever it rebuilds the estimate of a track, the track goes from where
	// the sender reports place it to its arrival times and back, and the A/V offset
	// steps by 50-60 ms (seen with LiveKit's SFU 30 s after an outage). A range, not
	// a value, since such a step may come before the trouble. And the median of the
	// healed offsets, not each: with mediasoup, whose sender reports carry whole
	// milliseconds, the sync engine keeps rebuilding its audio estimate and the
	// offset wobbles some 15 ms. A track the trouble left misplaced is off by far
	// more (4.6 s, before the sync engine was set to keep capture times)
	// TODO: this will be fixed when upgrading mediasoup to 3.27.0 or later: its
	// sender reports carry microseconds (PR #1918), so the sync engine should stop
	// rebuilding its audio estimate every 10-30 s, and the wobble with it (needs a
	// mediasoup-go that speaks the 3.27 worker protocol)
	private static final double HEALED_AV_TOLERANCE_MS = 70;
	// Packets lost from the SFU to the egress: more than NACKs recover, so frames are
	// lost for good
	private static final int EGRESS_PACKET_LOSS_PERCENT = 30;
	// Packets lost on the publisher's uplink: NACKs recover nearly all of them
	private static final int PUBLISHER_PACKET_LOSS_PERCENT = 20;
	// Uplink of a congested publisher: room for its low layer only (the synthetic
	// camera's top layer takes some 300 kbit/s)
	private static final String CONGESTED_RATE = "250kbit";
	// Jitter on the publisher's uplink: every packet delayed by
	// PUBLISHER_JITTER_DELAY_MS +- PUBLISHER_JITTER_MS, drawn for each packet, so
	// packets also arrive out of order
	private static final int PUBLISHER_JITTER_DELAY_MS = 100;
	private static final int PUBLISHER_JITTER_MS = 50;
	// Outages of the publisher's uplink (its media cut, its signaling up). A short
	// one only cuts the media; a long one outlasts the ICE timeouts, and the client
	// restarts ICE and keeps its session
	private static final int SHORT_OUTAGE_S = 3;
	private static final int LONG_OUTAGE_S = 18;
	// How long the video may take to show again once the network is back after an
	// outage: an ICE restart, then a keyframe
	private static final int OUTAGE_VIDEO_BACK_S = 8;
	// How long the network must have been fine after an outage before the
	// recording is checked as healed (NETWORK_RECOVERY_S for other trouble). If the
	// sync engine was rebuilding the estimate of a track when the outage began, the
	// track is on its arrival times when the client sends what it queued, which
	// places that burst late, and the error, up to 0.5 s with mediasoup, is then
	// absorbed at 5 ms/s
	// TODO: this will be fixed when upgrading mediasoup to 3.27.0 or later: its
	// sender reports carry microseconds (PR #1918), so the sync engine should seldom
	// be rebuilding an estimate as an outage begins, and this can come down to what
	// LiveKit's SFU needs (a 205 ms correction, absorbed in 41 s; needs a
	// mediasoup-go that speaks the 3.27 worker protocol)
	private static final int OUTAGE_RECOVERY_S = 100;
	// A poor uplink from the moment the participant joins, as a weak mobile
	// connection has: some loss, jitter and little bandwidth at once, for
	// BAD_NETWORK_S of the recording
	private static final String BAD_NETWORK = "delay 50ms 30ms loss random 5% rate 300kbit";
	private static final int BAD_NETWORK_S = 40;
	// The SFU's media ports, UDP and ICE-TCP: what impairing a publisher's uplink
	// impairs (its signaling stays up)
	private static final String SFU_MEDIA_PORTS = NetworkConditioner.SFU_RTC_PORT_RANGE + ","
			+ NetworkConditioner.SFU_ICE_TCP_PORT;

	// The testapp components of the local tracks, by source
	private static final String CAMERA = "app-video-track:has(video.local[id*='--camera--'])";
	private static final String MICROPHONE = "app-audio-track:has(audio.local[id*='--microphone--'])";

	private static String syncMediaScript;
	private static MinioClient minio;

	@BeforeAll()
	protected static void setupAll() throws Exception {
		checkFfmpegInstallation();
		loadEnvironmentVariables();
		setUpLiveKitClient();
		syncMediaScript = Files.readString(Paths.get("src/test/resources/participant-passthrough-sync-media.js"));
		minio = MinioClient.builder().endpoint("localhost", 9000, false).credentials("minioadmin", "minioadmin")
				.build();
		CompletableFuture.runAsync(OpenViduTestAppE2eEgressProTest::pullRemoteBrowserImages);
	}

	@BeforeEach()
	protected void setupEach() {
		this.stopAllActiveEgresses();
		this.closeAllRooms(LK);
	}

	@AfterEach()
	protected void finishEach() {
		// no network impairment outlives a test, even one that failed while setting it up
		NetworkConditioner.clear();
		this.stopAllActiveEgresses();
		this.closeAllRooms(LK);
	}

	// ------------------------------------------------------------------------
	// Video codecs, audio and video published from the start
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("VP8 audio and video from the start")
	void vp8AudioAndVideoTest() throws Exception {
		log.info("Participant Passthrough: VP8 audio and video from the start");
		audioAndVideoFromTheStart("chrome", "vp8", true, "mkv");
	}

	@Test
	@DisplayName("VP9 audio and video from the start")
	void vp9AudioAndVideoTest() throws Exception {
		log.info("Participant Passthrough: VP9 audio and video from the start");
		audioAndVideoFromTheStart("chrome", "vp9", true, "mkv");
	}

	@Test
	@DisplayName("H264 audio and video from the start")
	void h264AudioAndVideoTest() throws Exception {
		log.info("Participant Passthrough: H264 audio and video from the start");
		audioAndVideoFromTheStart("chrome", "h264", true, "mkv");
	}

	@Test
	@DisplayName("VP8 without simulcast")
	void vp8WithoutSimulcastTest() throws Exception {
		log.info("Participant Passthrough: VP8 without simulcast");
		Recording recording = audioAndVideoFromTheStart("chrome", "vp8", false, "mkv");
		// a single layer: the captured size from the first frame
		recording.video(0).assertConstantSize(CAMERA_WIDTH, CAMERA_HEIGHT);
	}

	@Test
	@DisplayName("H264 without simulcast")
	void h264WithoutSimulcastTest() throws Exception {
		log.info("Participant Passthrough: H264 without simulcast");
		Recording recording = audioAndVideoFromTheStart("chrome", "h264", false, "mkv");
		recording.video(0).assertConstantSize(CAMERA_WIDTH, CAMERA_HEIGHT);
	}

	@Test
	@DisplayName("Firefox VP8 audio and video from the start")
	void firefoxVp8AudioAndVideoTest() throws Exception {
		log.info("Participant Passthrough: Firefox VP8 audio and video from the start");
		audioAndVideoFromTheStart("firefox", "vp8", true, "mkv");
	}

	@Test
	@DisplayName("Firefox H264 audio and video from the start")
	@Disabled // Firefox forces VP8 in linux/android when publishing even with Pion: the H264
				// camera track never gets media (see
				// OpenViduTestAppE2eTest.firefoxForceH264Test)
	void firefoxH264AudioAndVideoTest() throws Exception {
		log.info("Participant Passthrough: Firefox H264 audio and video from the start");
		audioAndVideoFromTheStart("firefox", "h264", true, "mkv");
	}

	@Test
	@DisplayName("WebM file with VP8")
	void webmVp8Test() throws Exception {
		log.info("Participant Passthrough: WebM file with VP8");
		audioAndVideoFromTheStart("chrome", "vp8", true, "webm");
	}

	@Test
	@DisplayName("WebM file with VP9")
	void webmVp9Test() throws Exception {
		log.info("Participant Passthrough: WebM file with VP9");
		audioAndVideoFromTheStart("chrome", "vp9", true, "webm");
	}

	@Test
	@DisplayName("AV1 from the start is not supported")
	void av1FromTheStartNotSupportedTest() throws Exception {
		log.info("Participant Passthrough: AV1 from the start is not supported");
		String room = uniqueRoom("av1-start");
		joinPublisher("chrome", room, "alice", "av1", true, true, true);

		// like every other egress, it fails on a track it cannot handle when started
		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		JsonObject info = waitUntilEgressEnds(egressId, 60);
		Assertions.assertEquals("EGRESS_FAILED", info.get("status").getAsString(), "Unexpected egress end: " + info);
		String error = info.has("error") ? info.get("error").getAsString() : "";
		Assertions.assertTrue(error.toLowerCase(Locale.ROOT).contains("av1"),
				"The egress error must name the AV1 codec: " + info);
	}

	@Test
	@DisplayName("AV1 published later is not supported")
	void av1PublishedLaterNotSupportedTest() throws Exception {
		log.info("Participant Passthrough: AV1 published later is not supported");
		String room = uniqueRoom("av1-later");
		Publisher alice = joinPublisher("chrome", room, "alice", "av1", true, true, false);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(4000);
		alice.addVideo();

		// like every other egress, it fails on a track it cannot handle, whenever it
		// is published
		JsonObject info = waitUntilEgressEnds(egressId, 30);
		Assertions.assertEquals("EGRESS_FAILED", info.get("status").getAsString(), "Unexpected egress end: " + info);
		String error = info.has("error") ? info.get("error").getAsString() : "";
		Assertions.assertTrue(error.toLowerCase(Locale.ROOT).contains("av1"),
				"The egress error must name the AV1 codec: " + info);
	}

	// ------------------------------------------------------------------------
	// A single track
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Audio only")
	void audioOnlyTest() throws Exception {
		log.info("Participant Passthrough: audio only");
		String room = uniqueRoom("audio-only");
		joinPublisher("chrome", room, "alice", "vp8", true, true, false);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(10000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus");
		recording.assertHealthy();
		recording.audio(0).assertMarkers(8);
		Assertions.assertTrue(recording.duration > 8, "Recording too short: " + recording.duration + " s");
	}

	@Test
	@DisplayName("Video only")
	void videoOnlyTest() throws Exception {
		log.info("Participant Passthrough: video only");
		String room = uniqueRoom("video-only");
		joinPublisher("chrome", room, "alice", "vp8", true, false, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(10000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("video:vp8");
		recording.assertHealthy();
		recording.video(0).assertMarkers(8);
		recording.video(0).assertReachedSize(CAMERA_WIDTH, CAMERA_HEIGHT);
		Assertions.assertTrue(recording.duration > 8, "Recording too short: " + recording.duration + " s");
	}

	// ------------------------------------------------------------------------
	// Tracks published after the recording started
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Audio first, VP8 video added later")
	void audioFirstThenVp8VideoTest() throws Exception {
		log.info("Participant Passthrough: audio first, VP8 video added later");
		audioFirstThenVideo("vp8");
	}

	@Test
	@DisplayName("Audio first, VP9 video added later")
	void audioFirstThenVp9VideoTest() throws Exception {
		log.info("Participant Passthrough: audio first, VP9 video added later");
		audioFirstThenVideo("vp9");
	}

	@Test
	@DisplayName("Audio first, H264 video added later")
	void audioFirstThenH264VideoTest() throws Exception {
		log.info("Participant Passthrough: audio first, H264 video added later");
		audioFirstThenVideo("h264");
	}

	@Test
	@DisplayName("Video first, audio added later")
	void videoFirstThenAudioTest() throws Exception {
		log.info("Participant Passthrough: video first, audio added later");
		String room = uniqueRoom("video-first");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, false, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		long active = System.currentTimeMillis();
		Thread.sleep(4000);
		alice.addAudio();
		double audioPublished = secondsSince(active);
		Thread.sleep(8000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertAvSync(5);
		assertStartsAfter(recording.audio(0), recording.video(0), audioPublished);
	}

	@Test
	@DisplayName("No tracks when started, audio and video added later")
	void noTracksWhenStartedTest() throws Exception {
		log.info("Participant Passthrough: no tracks when started, audio and video added later");
		String room = uniqueRoom("no-tracks");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, false, false);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		Thread.sleep(3000);
		alice.addAudio();
		long audioPublished = System.currentTimeMillis();
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(3000);
		alice.addVideo();
		double videoPublished = secondsSince(audioPublished);
		Thread.sleep(7000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertAvSync(5);
		assertStartsAfter(recording.video(0), recording.audio(0), videoPublished);
	}

	@Test
	@DisplayName("Participant joins after the recording started")
	void participantJoinsAfterStartTest() throws Exception {
		log.info("Participant Passthrough: participant joins after the recording started");
		String room = uniqueRoom("join-later");
		JsonObject createRoom = new JsonObject();
		createRoom.addProperty("name", room);
		twirp("RoomService", "CreateRoom", createRoom);

		// the egress waits for the participant to join
		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		Thread.sleep(3000);
		joinPublisher("chrome", room, "alice", "vp8", true, true, true);
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 30);
		Thread.sleep(8000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(5);
	}

	// ------------------------------------------------------------------------
	// Muted tracks
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Mute and unmute video")
	void muteUnmuteVideoTest() throws Exception {
		log.info("Participant Passthrough: mute and unmute video");
		String room = uniqueRoom("mute-video");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.muteVideo();
		Thread.sleep(4000);
		alice.unmuteVideo();
		Thread.sleep(6000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.video(0).assertOneGap(3, 7);
		recording.assertAvSync(6);
		// the beeps go on while the video is muted
		recording.assertUnpairedBeeps(2, 7);
	}

	@Test
	@DisplayName("Mute and unmute audio")
	void muteUnmuteAudioTest() throws Exception {
		log.info("Participant Passthrough: mute and unmute audio");
		String room = uniqueRoom("mute-audio");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.muteAudio();
		Thread.sleep(4000);
		alice.unmuteAudio();
		Thread.sleep(6000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		// the muted audio is silence: still continuous
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.video(0).assertNoGaps();
		recording.assertAvSync(6);
		// no beeps while muted
		recording.assertUnpairedFlashes(2, 6);
	}

	@Test
	@DisplayName("Mute and unmute audio and video")
	void muteUnmuteAudioAndVideoTest() throws Exception {
		log.info("Participant Passthrough: mute and unmute audio and video");
		String room = uniqueRoom("mute-both");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.muteAudio();
		alice.muteVideo();
		// nothing reaches the egress for a while: the audio is filled with silence
		// when it comes back
		Thread.sleep(4000);
		alice.unmuteVideo();
		alice.unmuteAudio();
		Thread.sleep(6000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.video(0).assertOneGap(3, 7);
		recording.assertAvSync(6);
		recording.assertUnpairedFlashes(0, 1);
	}

	@Test
	@DisplayName("Mute VP8 video and audio at different times")
	void muteAtDifferentTimesVp8Test() throws Exception {
		log.info("Participant Passthrough: mute VP8 video and audio at different times");
		muteAtDifferentTimes("vp8");
	}

	@Test
	@DisplayName("Mute H264 video and audio at different times")
	void muteAtDifferentTimesH264Test() throws Exception {
		log.info("Participant Passthrough: mute H264 video and audio at different times");
		muteAtDifferentTimes("h264");
	}

	@Test
	@DisplayName("Audio and video muted when the recording starts")
	void mutedWhenRecordingStartsTest() throws Exception {
		log.info("Participant Passthrough: audio and video muted when the recording starts");
		String room = uniqueRoom("muted-at-start");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);
		alice.muteAudio();
		alice.muteVideo();

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		Thread.sleep(4000);
		alice.unmuteAudio();
		long audioUnmuted = System.currentTimeMillis();
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(4000);
		alice.unmuteVideo();
		double videoUnmuted = secondsSince(audioUnmuted);
		Thread.sleep(7000);

		// each track starts when it is unmuted, and they are in sync from then on.
		// The audio track may start before, with the silence of the muted
		// microphone (LiveKit's SFU sends it, mediasoup sends nothing): its first
		// beep tells when it was unmuted
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertAvSync(5);
		FileTrack audio = recording.audio(0);
		audio.assertMarkers(1);
		double videoStart = recording.video(0).firstPacketTime() - audio.markers.get(0);
		Assertions.assertTrue(videoStart > videoUnmuted - 2.5 && videoStart < videoUnmuted + 3.5,
				String.format(Locale.ROOT,
						"The video, unmuted %.1f s after the audio, must start about that much after the first beep:"
								+ " it starts %.3f s after",
						videoUnmuted, videoStart));
		recording.assertUnpairedFlashes(0, 1);
		recording.assertUnpairedBeeps(0, 1);
	}

	/**
	 * For 30 s the audio, the video or both are muted or unmuted at random, every
	 * 0.3 to 1 s; then both are unmuted. Whatever happened in between, the file
	 * decodes, its audio is continuous, and after the last unmute both tracks are
	 * in sync, back where they were before the first mute: each one on its original
	 * timeline, and the A/V offset the one they had before the mutes. The mutes
	 * start once the sync engine has settled (SYNC_CONVERGENCE_S), and "before the
	 * mutes" is the time between the two. The mutes are random: the seed is
	 * logged, and -DMUTE_SEED=seed repeats them.
	 */
	@Test
	@DisplayName("Mute and unmute audio and video many times")
	void muteUnmuteManyTimesTest() throws Exception {
		long seed = Long.getLong("MUTE_SEED", System.nanoTime());
		log.info("Participant Passthrough: mute and unmute audio and video many times (seed {})", seed);
		Random random = new Random(seed);
		String room = uniqueRoom("mute-many");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep((long) (SYNC_CONVERGENCE_S * 1000) + 6000);

		boolean audioMuted = false;
		boolean videoMuted = false;
		StringBuilder operations = new StringBuilder();
		long start = System.currentTimeMillis();
		long at = start;
		while (System.currentTimeMillis() - start < 30000) {
			long wait = at - System.currentTimeMillis();
			if (wait > 0) {
				Thread.sleep(wait);
			}
			long operationStart = System.currentTimeMillis();
			// the next one 0.3 to 1 s after this one starts, or as soon as it ends
			at = operationStart + 300 + random.nextInt(701);
			int tracks = random.nextInt(3); // 0: audio, 1: video, 2: both
			operations.append(String.format(Locale.ROOT, " %.1f:", secondsSince(start)));
			if (tracks != 1) {
				if (audioMuted) {
					alice.unmuteAudio();
				} else {
					alice.muteAudio();
				}
				audioMuted = !audioMuted;
				operations.append(audioMuted ? "A-" : "A+");
			}
			if (tracks != 0) {
				if (videoMuted) {
					alice.unmuteVideo();
				} else {
					alice.muteVideo();
				}
				videoMuted = !videoMuted;
				operations.append(videoMuted ? "V-" : "V+");
			}
			operations.append(String.format(Locale.ROOT, "(%.1f)", secondsSince(operationStart)));
		}
		if (audioMuted) {
			alice.unmuteAudio();
		}
		if (videoMuted) {
			alice.unmuteVideo();
		}
		log.info("{} mutes and {} unmutes in {} s (A audio, V video, - muted, + unmuted, (seconds it took)):{}",
				alice.mutes,
				alice.unmutes, String.format(Locale.ROOT, "%.1f", secondsSince(start)), operations);
		// the egress went through all of them
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 1);
		Thread.sleep(12000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertDecodesWithoutErrors();
		recording.assertAudioContinuous();
		recording.assertNoTinyVideoFrames();
		recording.assertStartTogether();
		FileTrack audio = recording.audio(0);
		FileTrack video = recording.video(0);

		// Both tracks are on until the first mute and from the last unmute, as the
		// file shows them: the holes of the video and the stretches without beeps.
		// The markers right after the last one may be cut short (a beep resumed
		// half-way through), so the time after it starts half a second later. The
		// time before the mutes starts once the sync engine has settled
		List<double[]> mutes = new ArrayList<>(video.gaps(0.25));
		mutes.addAll(audio.markerGaps(1.5));
		Assertions.assertFalse(mutes.isEmpty(), "The mutes must show in the file: " + recording.streams);
		double[] before = { SYNC_CONVERGENCE_S, mutes.stream().mapToDouble(m -> m[0]).min().getAsDouble() };
		double[] after = { mutes.stream().mapToDouble(m -> m[1]).max().getAsDouble() + 0.5,
				Math.min(audio.lastPacketTime(), video.lastPacketTime()) };
		assertLasts("The time after the last unmute", after, 7.5, 20);
		Assertions.assertTrue(video.lastPacketTime() > audio.lastPacketTime() - 1.5, String.format(Locale.ROOT,
				"Both tracks must reach the end: video until %.3f, audio until %.3f", video.lastPacketTime(),
				audio.lastPacketTime()));

		List<double[]> pairs = recording.avPairs();
		List<double[]> pairsBefore = pairsInside(pairs, before);
		List<double[]> pairsAfter = pairsInside(pairs, after);
		log.info("A/V offsets (audio - video, ms) before the mutes: {}; during them: {}; after them: {}",
				offsets(pairsBefore), offsets(pairsInside(pairs, new double[] { before[1], after[0] })),
				offsets(pairsAfter));

		// each track is back on its original timeline
		for (FileTrack track : List.of(audio, video)) {
			track.assertOriginalTimestamps(List.of(before, new double[] { after[0], Double.MAX_VALUE }));
		}

		// and they are in sync at the end, as they were before the mutes
		Assertions.assertTrue(pairsBefore.size() >= 3,
				"At least 3 A/V pairs expected before the mutes: " + offsets(pairsBefore));
		Assertions.assertTrue(pairsAfter.size() >= 7,
				"At least 7 A/V pairs expected after the last unmute: " + offsets(pairsAfter));
		double worst = pairsAfter.stream().mapToDouble(p -> Math.abs(p[1])).max().getAsDouble();
		Assertions.assertTrue(worst <= AV_SYNC_TOLERANCE_MS, String.format(Locale.ROOT,
				"Audio and video out of sync after the last unmute, worst offset %.0f ms (tolerance %.0f ms): %s",
				worst, AV_SYNC_TOLERANCE_MS, offsets(pairsAfter)));
		double offsetBefore = pairsBefore.stream().mapToDouble(p -> p[1]).average().getAsDouble();
		double offsetAtTheEnd = pairsAfter.subList(pairsAfter.size() - 5, pairsAfter.size()).stream()
				.mapToDouble(p -> p[1]).average().getAsDouble();
		Assertions.assertTrue(Math.abs(offsetAtTheEnd - offsetBefore) <= MAX_AV_DRIFT_MS, String.format(Locale.ROOT,
				"The A/V offset moves from %+.0f ms before the mutes to %+.0f ms at the end (at most %.0f ms allowed)",
				offsetBefore, offsetAtTheEnd, MAX_AV_DRIFT_MS));
	}

	// ------------------------------------------------------------------------
	// Unpublished tracks, and tracks published again
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Unpublish and publish again VP8 video")
	void unpublishRepublishVp8VideoTest() throws Exception {
		log.info("Participant Passthrough: unpublish and publish again VP8 video");
		unpublishRepublishVideo("vp8");
	}

	@Test
	@DisplayName("Unpublish and publish again H264 video")
	void unpublishRepublishH264VideoTest() throws Exception {
		log.info("Participant Passthrough: unpublish and publish again H264 video");
		unpublishRepublishVideo("h264");
	}

	@Test
	@DisplayName("Unpublish and publish again audio")
	void unpublishRepublishAudioTest() throws Exception {
		log.info("Participant Passthrough: unpublish and publish again audio");
		String room = uniqueRoom("republish-audio");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.unpublishAudio();
		Thread.sleep(4000);
		alice.addAudio();
		Thread.sleep(6000);

		// the new publication continues the audio track, silent in between
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.video(0).assertNoGaps();
		recording.assertAvSync(6);
		recording.assertUnpairedFlashes(2, 7);
	}

	@Test
	@DisplayName("Unpublish video until the end")
	void unpublishVideoUntilTheEndTest() throws Exception {
		log.info("Participant Passthrough: unpublish video until the end");
		String room = uniqueRoom("unpublish-video");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(6000);
		alice.unpublishVideo();
		Thread.sleep(6000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		// no SFU blank frames at the end of the video track
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(3);
		double videoEnd = recording.video(0).lastPacketTime();
		double audioEnd = recording.audio(0).lastPacketTime();
		Assertions.assertTrue(audioEnd - videoEnd > 4,
				"The video must end about 6 s before the audio: video until " + videoEnd + ", audio until " + audioEnd);
	}

	@Test
	@DisplayName("Unpublish audio until the end")
	void unpublishAudioUntilTheEndTest() throws Exception {
		log.info("Participant Passthrough: unpublish audio until the end");
		String room = uniqueRoom("unpublish-audio");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(6000);
		alice.unpublishAudio();
		Thread.sleep(6000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(3);
		// the audio track stays, silent, as long as the video
		double videoEnd = recording.video(0).lastPacketTime();
		double audioEnd = recording.audio(0).lastPacketTime();
		Assertions.assertTrue(audioEnd > videoEnd - 1.5,
				"The audio must go on, silent, until the end: video until " + videoEnd + ", audio until " + audioEnd);
		recording.assertUnpairedFlashes(3, 8);
	}

	@Test
	@DisplayName("Publish video again with another codec")
	void republishVideoWithAnotherCodecTest() throws Exception {
		log.info("Participant Passthrough: publish video again with another codec");
		String room = uniqueRoom("republish-codec");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.unpublishVideo();
		alice.setVideoCodec("h264");
		alice.addVideo();
		Thread.sleep(7000);

		// a VP8 track cannot continue as H264: the file gets a second video track
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8", "video:h264");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(8);
		FileTrack vp8 = recording.videoWithCodec("vp8");
		FileTrack h264 = recording.videoWithCodec("h264");
		Assertions.assertTrue(vp8.lastPacketTime() <= h264.firstPacketTime(),
				"The H264 track must follow the VP8 track: " + vp8 + " / " + h264);
		vp8.assertMarkers(3);
		h264.assertMarkers(4);
		h264.assertReachedSize(CAMERA_WIDTH, CAMERA_HEIGHT);
		Assertions.assertEquals(1, recording.ofType("video").stream().filter(s -> s.isDefault).count(),
				"Exactly one video track must be the default one: " + recording.streams);
	}

	@Test
	@DisplayName("Unpublish and publish again audio and video")
	void unpublishRepublishAudioAndVideoTest() throws Exception {
		log.info("Participant Passthrough: unpublish and publish again audio and video");
		String room = uniqueRoom("republish-both");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.unpublishVideo();
		alice.unpublishAudio();
		// the participant publishes nothing for a while
		Thread.sleep(4000);
		alice.addAudio();
		alice.addVideo();
		Thread.sleep(7000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.video(0).assertOneGap(3.5, 8);
		recording.assertAvSync(6);
	}

	@Test
	@DisplayName("Many track changes")
	void manyTrackChangesTest() throws Exception {
		log.info("Participant Passthrough: many track changes");
		String room = uniqueRoom("many-changes");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(3000);
		alice.muteVideo();
		Thread.sleep(2500);
		alice.unmuteVideo();
		Thread.sleep(2500);
		alice.muteAudio();
		Thread.sleep(2500);
		alice.unpublishVideo();
		Thread.sleep(2500);
		alice.unmuteAudio();
		Thread.sleep(2500);
		alice.addVideo();
		Thread.sleep(2500);
		alice.unpublishAudio();
		Thread.sleep(2500);
		alice.addAudio();
		Thread.sleep(4000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(5);
		Assertions.assertTrue(recording.video(0).gaps(1).size() >= 2,
				"The video must have a gap for the mute and one for the unpublished time: " + recording.video(0));
	}

	// ------------------------------------------------------------------------
	// Playable while recording
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Playable while recording")
	void playableWhileRecordingTest() throws Exception {
		log.info("Participant Passthrough: playable while recording");
		String room = uniqueRoom("playable");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, false);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);

		// audio only so far
		playInPlace(egressId);
		Recording audioOnly = snapshotRecordingInProgress(egressId);
		audioOnly.assertInProgress();
		audioOnly.assertTracks("audio:opus");
		audioOnly.assertHealthy();
		Assertions.assertTrue(audioOnly.audio(0).lastPacketTime() > 2.5,
				"The file being recorded must already hold the first seconds of audio: " + audioOnly.audio(0));

		// the camera is published: the growing file announces it
		alice.addVideo();
		Thread.sleep(6000);
		playInPlace(egressId);
		Recording withVideo = snapshotRecordingInProgress(egressId);
		withVideo.assertInProgress();
		withVideo.assertTracks("audio:opus", "video:vp8");
		withVideo.assertHealthy();
		withVideo.assertAvSync(3);

		// the camera is unpublished: the file goes on growing with the audio
		alice.unpublishVideo();
		Thread.sleep(4000);
		playInPlace(egressId);
		Recording withoutVideo = snapshotRecordingInProgress(egressId);
		withoutVideo.assertInProgress();
		withoutVideo.assertTracks("audio:opus", "video:vp8");
		withoutVideo.assertHealthy();
		Assertions.assertTrue(withoutVideo.audio(0).lastPacketTime() > withVideo.audio(0).lastPacketTime() + 2,
				"The file being recorded must keep growing: " + withVideo.audio(0) + " / " + withoutVideo.audio(0));

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertAvSync(4);
	}

	@Test
	@DisplayName("Playable while recording WebM")
	void playableWhileRecordingWebmTest() throws Exception {
		log.info("Participant Passthrough: playable while recording WebM");
		String room = uniqueRoom("playable-webm");
		joinPublisher("chrome", room, "alice", "vp9", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "webm"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		double previous = 0;
		for (int i = 0; i < 3; i++) {
			Thread.sleep(3000);
			playInPlace(egressId);
			Recording snapshot = snapshotRecordingInProgress(egressId);
			snapshot.assertDocType("webm");
			snapshot.assertInProgress();
			snapshot.assertTracks("audio:opus", "video:vp9");
			snapshot.assertHealthy();
			double end = snapshot.audio(0).lastPacketTime();
			Assertions.assertTrue(end > previous + 1.5, "The file being recorded must keep growing: " + end
					+ " s of audio after " + previous + " s");
			previous = end;
		}

		Recording recording = stopAndGetRecording(egressId);
		recording.assertDocType("webm");
		recording.assertFinalized();
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(6);
	}

	// ------------------------------------------------------------------------
	// Recording lifecycle
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Participant leaving ends the recording")
	void participantLeavesTest() throws Exception {
		log.info("Participant Passthrough: participant leaving ends the recording");
		String room = uniqueRoom("leaves");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(8000);
		alice.leave();

		Recording recording = getRecording(waitUntilEgressStatus(egressId, "EGRESS_COMPLETE", 40));
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(5);
	}

	@Test
	@DisplayName("Room deleted ends the recording")
	void roomDeletedTest() throws Exception {
		log.info("Participant Passthrough: room deleted ends the recording");
		String room = uniqueRoom("room-deleted");
		joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(8000);
		JsonObject deleteRoom = new JsonObject();
		deleteRoom.addProperty("room", room);
		twirp("RoomService", "DeleteRoom", deleteRoom);

		Recording recording = getRecording(waitUntilEgressStatus(egressId, "EGRESS_COMPLETE", 40));
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(5);
	}

	@Test
	@DisplayName("Short recording")
	void shortRecordingTest() throws Exception {
		log.info("Participant Passthrough: short recording");
		String room = uniqueRoom("short");
		joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(2000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
	}

	/**
	 * Records for 65 s, or for -DLONG_RECORDING_S seconds (a soak test).
	 */
	@Test
	@DisplayName("Long recording keeps A/V sync")
	void longRecordingKeepsSyncTest() throws Exception {
		long seconds = Long.getLong("LONG_RECORDING_S", (long) SYNC_CONVERGENCE_S + 40);
		log.info("Participant Passthrough: long recording keeps A/V sync ({} s)", seconds);
		String room = uniqueRoom("long");
		joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(seconds * 1000);

		// the offset once the sync engine has settled stays until the end
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		List<double[]> settled = pairsInside(recording.assertAvSync(50),
				new double[] { SYNC_CONVERGENCE_S, Double.MAX_VALUE });
		Assertions.assertTrue(settled.size() >= 30,
				"At least 30 A/V pairs expected after the sync engine settled: " + offsets(settled));
		double start = settled.subList(0, 5).stream().mapToDouble(o -> o[1]).average().orElseThrow();
		double end = settled.subList(settled.size() - 5, settled.size()).stream().mapToDouble(o -> o[1]).average()
				.orElseThrow();
		Assertions.assertTrue(Math.abs(end - start) <= MAX_AV_DRIFT_MS, String.format(Locale.ROOT,
				"A/V offset drifts from %+.0f ms (at %.0f s) to %+.0f ms (at most %.0f ms allowed)", start,
				SYNC_CONVERGENCE_S, end, MAX_AV_DRIFT_MS));
	}

	// ------------------------------------------------------------------------
	// Network conditions
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Packet loss from the SFU to the egress VP8")
	void egressPacketLossVp8Test() throws Exception {
		log.info("Participant Passthrough: packet loss from the SFU to the egress VP8");
		networkTrouble(Trouble.EGRESS_LOSS, "vp8");
	}

	@Test
	@DisplayName("Packet loss from the SFU to the egress VP9")
	void egressPacketLossVp9Test() throws Exception {
		log.info("Participant Passthrough: packet loss from the SFU to the egress VP9");
		networkTrouble(Trouble.EGRESS_LOSS, "vp9");
	}

	@Test
	@DisplayName("Packet loss from the SFU to the egress H264")
	void egressPacketLossH264Test() throws Exception {
		log.info("Participant Passthrough: packet loss from the SFU to the egress H264");
		networkTrouble(Trouble.EGRESS_LOSS, "h264");
	}

	@Test
	@DisplayName("Packet loss on the publisher's uplink VP8")
	void publisherPacketLossVp8Test() throws Exception {
		log.info("Participant Passthrough: packet loss on the publisher's uplink VP8");
		networkTrouble(Trouble.PUBLISHER_LOSS, "vp8");
	}

	@Test
	@DisplayName("Packet loss on the publisher's uplink VP9")
	void publisherPacketLossVp9Test() throws Exception {
		log.info("Participant Passthrough: packet loss on the publisher's uplink VP9");
		networkTrouble(Trouble.PUBLISHER_LOSS, "vp9");
	}

	@Test
	@DisplayName("Publisher's uplink congested VP8")
	void publisherCongestionVp8Test() throws Exception {
		log.info("Participant Passthrough: publisher's uplink congested VP8");
		networkTrouble(Trouble.PUBLISHER_CONGESTION, "vp8");
	}

	@Test
	@DisplayName("Publisher's uplink congested VP9")
	void publisherCongestionVp9Test() throws Exception {
		log.info("Participant Passthrough: publisher's uplink congested VP9");
		networkTrouble(Trouble.PUBLISHER_CONGESTION, "vp9");
	}

	@Test
	@DisplayName("Publisher's uplink congested H264")
	void publisherCongestionH264Test() throws Exception {
		log.info("Participant Passthrough: publisher's uplink congested H264");
		networkTrouble(Trouble.PUBLISHER_CONGESTION, "h264");
	}

	@Test
	@DisplayName("Jitter on the publisher's uplink VP8")
	void publisherJitterVp8Test() throws Exception {
		log.info("Participant Passthrough: jitter on the publisher's uplink VP8");
		networkTrouble(Trouble.PUBLISHER_JITTER, "vp8");
	}

	@Test
	@DisplayName("Jitter on the publisher's uplink H264")
	void publisherJitterH264Test() throws Exception {
		log.info("Participant Passthrough: jitter on the publisher's uplink H264");
		networkTrouble(Trouble.PUBLISHER_JITTER, "h264");
	}

	@Test
	@DisplayName("Short outage of the publisher's uplink")
	void publisherShortOutageTest() throws Exception {
		log.info("Participant Passthrough: short outage of the publisher's uplink");
		networkTrouble(Trouble.PUBLISHER_SHORT_OUTAGE, "vp8");
	}

	@Test
	@DisplayName("Long outage of the publisher's uplink")
	void publisherLongOutageTest() throws Exception {
		log.info("Participant Passthrough: long outage of the publisher's uplink");
		networkTrouble(Trouble.PUBLISHER_LONG_OUTAGE, "vp8");
	}

	/**
	 * A participant on a poor uplink (BAD_NETWORK) from the moment it joins: the
	 * recording starts on that network, which lasts BAD_NETWORK_S. It must stay
	 * intact throughout, as in networkTrouble, and heal once the network is fine:
	 * with no time before the trouble to compare with, healed means in sync, the
	 * video without holes and the top layer back.
	 */
	@Test
	@DisplayName("Publisher's uplink bad from the start")
	void publisherBadNetworkFromTheStartTest() throws Exception {
		log.info("Participant Passthrough: publisher's uplink bad from the start");
		String room = uniqueRoom("bad-network-from-the-start");
		OpenViduTestappUser bridged = setupNetemBrowserUser(prepareNetemBrowsers());
		((JavascriptExecutor) bridged.getDriver()).executeScript(syncMediaScript);
		String egressId;
		long active;
		try {
			NetworkConditioner.applyOutboundNetem(getNetemContainerName(bridged), SFU_MEDIA_PORTS, BAD_NETWORK);
			addPublisherInstance(bridged, room, "alice", "vp8", true, true, true);
			egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
			waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 30);
			active = System.currentTimeMillis();
			Thread.sleep(BAD_NETWORK_S * 1000L);
		} finally {
			NetworkConditioner.clear();
		}
		double troubleTo = secondsSince(active);
		log.info("Bad network until {} s after the egress became active",
				String.format(Locale.ROOT, "%.1f", troubleTo));
		Thread.sleep((NETWORK_RECOVERY_S + NETWORK_HEALED_S) * 1000L);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertDecodesWithoutErrors();
		recording.assertPicturesIntact();
		recording.assertAudioContinuous();
		recording.assertNoTinyVideoFrames();
		recording.assertStartTogether();
		recording.assertRecovered(null, new double[] { troubleTo + NETWORK_RECOVERY_S, Double.MAX_VALUE });
		recording.video(0).assertReachesSizeAfter(CAMERA_WIDTH, CAMERA_HEIGHT, troubleTo);
	}

	// ------------------------------------------------------------------------
	// Dynacast
	// ------------------------------------------------------------------------

	/**
	 * A participant that nobody watched for a while: dynacast paused all its
	 * simulcast layers, since no subscriber needed them. The egress subscribing
	 * makes the SFU ask the publisher for them again.
	 */
	@Test
	@DisplayName("Dynacast paused all layers")
	void dynacastPausedAllLayersTest() throws Exception {
		log.info("Participant Passthrough: dynacast paused all layers");
		String room = uniqueRoom("dynacast-all");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);
		waitForEncodings(alice, "every layer paused", e -> e.stream().noneMatch(Encoding::active));
		recordPausedLayers(alice, room);
	}

	/**
	 * A participant watched by a viewer that asked for its low layer only:
	 * dynacast paused the layers above. The egress subscribing makes the SFU ask
	 * the publisher for the top layer again, while the viewer keeps the low one.
	 */
	@Test
	@DisplayName("Dynacast paused the top layer for a low quality viewer")
	void dynacastPausedTopLayerTest() throws Exception {
		log.info("Participant Passthrough: dynacast paused the top layer for a low quality viewer");
		String room = uniqueRoom("dynacast-top");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);
		OpenViduTestappUser user = alice.user;
		this.addSubscriber(user, false);
		int viewer = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size() - 1;
		WebElement roomInput = user.getDriver().findElement(By.id("room-name-input-" + viewer));
		roomInput.clear();
		roomInput.sendKeys(room);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + viewer + " .connect-btn"))
				.sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(viewer, "trackSubscribed", "RoomEvent", 2);
		((JavascriptExecutor) user.getDriver()).executeScript("const p = [...window.room_" + viewer
				+ ".remoteParticipants.values()].find(p => p.identity === 'alice');"
				+ "[...p.videoTrackPublications.values()][0].setVideoQuality(0);");
		waitForEncodings(alice, "the top layer paused, the low one sent",
				e -> e.size() > 1 && e.get(0).active() && !e.get(e.size() - 1).active());
		recordPausedLayers(alice, room);
	}

	// ------------------------------------------------------------------------
	// Screen share
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Screen share")
	void screenShareTest() throws Exception {
		log.info("Participant Passthrough: screen share");
		String room = uniqueRoom("screen");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);
		alice.addScreen();

		// the screen share and its audio, which it has not: not the camera or the
		// microphone
		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"), true);
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(10000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("video:vp8");
		recording.assertHealthy();
		recording.video(0).assertMarkers(6);
		recording.video(0).assertReachedSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	}

	// ------------------------------------------------------------------------
	// StartEgress with a MediaSource
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("MediaSource: participant video and participant audio")
	void mediaSourceParticipantVideoAndAudioTest() throws Exception {
		log.info("Participant Passthrough: MediaSource with participant video and participant audio");
		String room = uniqueRoom("media-participant");
		Publisher alice = joinPublisher("chrome", room, "alice", "h264", true, true, true);

		JsonObject media = new JsonObject();
		media.add("participant_video", participantVideo("alice", false));
		media.add("audio", audioRoutes(audioRoute("participant_identity", "alice")));
		String egressId = startMediaRecording(room, media, filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		// the participant's tracks as they come and go, like StartParticipantEgress
		alice.unpublishVideo();
		Thread.sleep(3000);
		alice.addVideo();
		Thread.sleep(5000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:h264");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.video(0).assertOneGap(2.5, 7);
		recording.assertAvSync(6);
	}

	@Test
	@DisplayName("MediaSource: video track id and audio track id")
	void mediaSourceTrackIdsTest() throws Exception {
		log.info("Participant Passthrough: MediaSource with video track id and audio track id");
		String room = uniqueRoom("media-track-ids");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);
		String videoTrackId = publishedTrack(room, "alice", TrackSource.CAMERA).getSid();
		String audioTrackId = publishedTrack(room, "alice", TrackSource.MICROPHONE).getSid();

		JsonObject media = new JsonObject();
		media.addProperty("video_track_id", videoTrackId);
		media.add("audio", audioRoutes(audioRoute("track_id", audioTrackId)));
		String egressId = startMediaRecording(room, media, filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(6000);
		// a new publication is another track id: not recorded
		alice.unpublishVideo();
		alice.addVideo();
		Thread.sleep(6000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(4);
		double videoEnd = recording.video(0).lastPacketTime();
		double audioEnd = recording.audio(0).lastPacketTime();
		Assertions.assertTrue(audioEnd - videoEnd > 4, "Only the selected video track must be recorded: video until "
				+ videoEnd + ", audio until " + audioEnd);
	}

	@Test
	@DisplayName("MediaSource: participant video only")
	void mediaSourceParticipantVideoOnlyTest() throws Exception {
		log.info("Participant Passthrough: MediaSource with participant video only");
		String room = uniqueRoom("media-video-only");
		joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		JsonObject media = new JsonObject();
		media.add("participant_video", participantVideo("alice", false));
		String egressId = startMediaRecording(room, media, filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(8000);

		// the participant's microphone is not selected
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("video:vp8");
		recording.assertHealthy();
		recording.video(0).assertMarkers(6);
	}

	@Test
	@DisplayName("MediaSource: participant audio only")
	void mediaSourceParticipantAudioOnlyTest() throws Exception {
		log.info("Participant Passthrough: MediaSource with participant audio only");
		String room = uniqueRoom("media-audio-only");
		joinPublisher("chrome", room, "alice", "vp8", true, true, true);

		JsonObject media = new JsonObject();
		media.add("audio", audioRoutes(audioRoute("participant_identity", "alice")));
		String egressId = startMediaRecording(room, media, filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(8000);

		// the participant's camera is not selected
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus");
		recording.assertHealthy();
		recording.audio(0).assertMarkers(6);
	}

	@Test
	@DisplayName("MediaSource: screen share and microphone")
	void mediaSourceScreenShareAndMicrophoneTest() throws Exception {
		log.info("Participant Passthrough: MediaSource with screen share and microphone");
		String room = uniqueRoom("media-screen");
		Publisher alice = joinPublisher("chrome", room, "alice", "vp8", true, true, true);
		alice.addScreen();

		JsonObject media = new JsonObject();
		media.add("participant_video", participantVideo("alice", true));
		media.add("audio", audioRoutes(audioRoute("participant_identity", "alice")));
		String egressId = startMediaRecording(room, media, filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(10000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		// the screen, not the camera, in sync with the microphone
		recording.video(0).assertReachedSize(SCREEN_WIDTH, SCREEN_HEIGHT);
		recording.assertAvSync(6);
	}

	// ------------------------------------------------------------------------
	// Track selection
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Only the recorded participant's tracks")
	void onlyRecordedParticipantTracksTest() throws Exception {
		log.info("Participant Passthrough: only the recorded participant's tracks");
		String room = uniqueRoom("selection");
		Publisher bob = joinPublisher("chrome", room, "bob", "vp8", true, true, true);
		Publisher alice = addPublisherInstance(bob.user, room, "alice", "vp8", true, true, false);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(4000);
		// changes of other participants do not reach the recording
		bob.unpublishVideo();
		bob.addVideo();
		Thread.sleep(3000);
		alice.addVideo();
		Thread.sleep(6000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertAvSync(4);
		double videoStart = recording.video(0).firstPacketTime() - recording.audio(0).firstPacketTime();
		Assertions.assertTrue(videoStart > 5, "The video must be alice's, published 7 s after the recording started:"
				+ " it starts " + videoStart + " s after the audio");
	}

	// ------------------------------------------------------------------------
	// Requests
	// ------------------------------------------------------------------------

	@Test
	@DisplayName("Requests Participant Passthrough cannot serve are rejected")
	void invalidRequestsRejectedTest() throws Exception {
		log.info("Participant Passthrough: requests Participant Passthrough cannot serve are rejected");
		String room = uniqueRoom("invalid");
		JsonObject createRoom = new JsonObject();
		createRoom.addProperty("name", room);
		twirp("RoomService", "CreateRoom", createRoom);

		String rtmp = "rtmp://localhost/live/key";
		String path = filepath(room, "alice", "mkv");

		// StartParticipantEgress: one file output of the default file type
		JsonObject mp4 = participantRecordingRequest(room, "alice", "passthrough/" + room + "/alice.mp4");
		mp4.getAsJsonArray("file_outputs").get(0).getAsJsonObject().addProperty("file_type", "MP4");
		assertRejected("StartParticipantEgress", mp4, "file_type");

		JsonObject twoFiles = participantRecordingRequest(room, "alice", path);
		twoFiles.getAsJsonArray("file_outputs").add(fileOutput("passthrough/" + room + "/alice-2.mkv"));
		assertRejected("StartParticipantEgress", twoFiles, "file outputs");

		JsonObject fileAndStream = participantRecordingRequest(room, "alice", path);
		fileAndStream.add("stream_outputs", streamOutputs(rtmp));
		assertRejected("StartParticipantEgress", fileAndStream, "passthrough outputs");

		JsonObject streamOnly = participantRecordingRequest(room, "alice", path);
		streamOnly.remove("file_outputs");
		streamOnly.add("stream_outputs", streamOutputs(rtmp));
		assertRejected("StartParticipantEgress", streamOnly, "passthrough outputs");

		JsonObject segments = participantRecordingRequest(room, "alice", path);
		segments.remove("file_outputs");
		JsonObject segmentOutput = new JsonObject();
		segmentOutput.addProperty("filename_prefix", "passthrough/" + room + "/alice");
		JsonArray segmentOutputs = new JsonArray();
		segmentOutputs.add(segmentOutput);
		segments.add("segment_outputs", segmentOutputs);
		assertRejected("StartParticipantEgress", segments, "passthrough outputs");

		// StartEgress with a MediaSource: one file output of the default file type,
		// and at most one audio route
		JsonObject participantVideo = new JsonObject();
		participantVideo.add("participant_video", participantVideo("alice", false));

		JsonObject mediaMp4 = mediaRecordingRequest(room, participantVideo, "passthrough/" + room + "/alice.mp4");
		mediaMp4.getAsJsonArray("outputs").get(0).getAsJsonObject().getAsJsonObject("file").addProperty("file_type",
				"MP4");
		assertRejected("StartEgress", mediaMp4, "file_type");

		JsonObject mediaTwoFiles = mediaRecordingRequest(room, participantVideo, path);
		JsonObject secondFile = new JsonObject();
		secondFile.add("file", fileOutput("passthrough/" + room + "/alice-2.mkv"));
		mediaTwoFiles.getAsJsonArray("outputs").add(secondFile);
		assertRejected("StartEgress", mediaTwoFiles, "file outputs");

		JsonObject mediaStream = mediaRecordingRequest(room, participantVideo, path);
		JsonObject stream = new JsonObject();
		stream.add("stream", new JsonObject());
		stream.getAsJsonObject("stream").add("urls", new JsonArray());
		stream.getAsJsonObject("stream").getAsJsonArray("urls").add(rtmp);
		mediaStream.add("outputs", new JsonArray());
		mediaStream.getAsJsonArray("outputs").add(stream);
		assertRejected("StartEgress", mediaStream, "passthrough outputs");

		JsonObject twoRoutes = new JsonObject();
		twoRoutes.add("audio", audioRoutes(audioRoute("participant_identity", "alice"),
				audioRoute("participant_identity", "bob")));
		assertRejected("StartEgress", mediaRecordingRequest(room, twoRoutes, path), "audio routes");

		JsonObject captureAll = new JsonObject();
		captureAll.add("participant_video", participantVideo("alice", false));
		JsonObject allAudio = new JsonObject();
		allAudio.addProperty("capture_all", true);
		captureAll.add("audio", allAudio);
		assertRejected("StartEgress", mediaRecordingRequest(room, captureAll, path), "participant_video");

		// nothing was started
		JsonObject list = new JsonObject();
		list.addProperty("room_name", room);
		JsonArray items = egressApi("ListEgress", list).getAsJsonArray("items");
		Assertions.assertTrue(items == null || items.isEmpty(), "No egress must have been started: " + items);
	}

	// ------------------------------------------------------------------------
	// AV1 Track Egress
	// ------------------------------------------------------------------------

	@ParameterizedTest(name = "AV1 Track Egress {0}")
	@ValueSource(strings = { "L1T1", "L3T3" })
	void av1TrackEgressTest(String scalabilityMode) throws Exception {
		this.trackEgressVideoCodec("av1", scalabilityMode);
	}

	// ------------------------------------------------------------------------
	// Scenarios
	// ------------------------------------------------------------------------

	private Recording audioAndVideoFromTheStart(String browser, String codec, boolean simulcast, String extension)
			throws Exception {
		String room = uniqueRoom("av-" + browser + "-" + codec + "-" + extension);
		joinPublisher(browser, room, "alice", codec, simulcast, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", extension));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(10000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertDocType("webm".equals(extension) ? "webm" : "matroska");
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:" + codec);
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(6);
		// simulcast: the egress may start on a low layer, and moves up to the captured
		// size
		recording.video(0).assertReachedSize(CAMERA_WIDTH, CAMERA_HEIGHT);
		Assertions.assertTrue(recording.duration > 8, "Recording too short: " + recording.duration + " s");
		return recording;
	}

	private void audioFirstThenVideo(String codec) throws Exception {
		String room = uniqueRoom("audio-first-" + codec);
		Publisher alice = joinPublisher("chrome", room, "alice", codec, true, true, false);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		long active = System.currentTimeMillis();
		Thread.sleep(4000);
		alice.addVideo();
		double videoPublished = secondsSince(active);
		// The video must reach its captured size. With H264, Chrome stops sending its
		// top simulcast layer half a second after a camera joins a connection that only
		// carried audio (its bandwidth estimate drops), and sends it again some 4 s later;
		// LiveKit's SFU forwards a layer that stopped only after 10 s of packets, so the
		// top layer reaches the egress about 13.5 s after the camera is published
		Thread.sleep("h264".equals(codec) ? 20000 : 8000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:" + codec);
		recording.assertHealthy();
		recording.assertAvSync(5);
		recording.video(0).assertReachedSize(CAMERA_WIDTH, CAMERA_HEIGHT);
		assertStartsAfter(recording.video(0), recording.audio(0), videoPublished);
	}

	private static double secondsSince(long millis) {
		return (System.currentTimeMillis() - millis) / 1000.0;
	}

	/**
	 * A track published publishedAfter seconds after another starts about that
	 * much after it in the file: its first frame takes a few seconds more to
	 * arrive (subscription, keyframe), and the other may itself start up to two
	 * seconds late (the start gate holds an Opus/DTX track). Their exact relative
	 * placement is what the A/V sync check verifies.
	 */
	private static void assertStartsAfter(FileTrack later, FileTrack earlier, double publishedAfter) {
		double start = later.firstPacketTime() - earlier.firstPacketTime();
		Assertions.assertTrue(start > publishedAfter - 2.5 && start < publishedAfter + 3.5,
				String.format(Locale.ROOT,
						"The %s track, published %.1f s after the %s track, must start about that much after it in the"
								+ " file: it starts %.3f s after",
						later.type, publishedAfter, earlier.type, start));
	}

	/**
	 * Mutes the tracks of the recorded participant along the way: the video on its
	 * own, then both, then the audio on its own, the audio once more, and the video
	 * until the end.
	 *
	 * <pre>
	 * video  on 5 s | muted 4 s | muted 4 s | on 4 s    | on 5 s | on 4 s    | on 5 s | muted 4 s
	 * audio  on 5 s | on 4 s    | muted 4 s | muted 4 s | on 5 s | muted 4 s | on 5 s | on 4 s
	 * </pre>
	 *
	 * A muted track reaches the egress as nothing: the video track has a hole
	 * (players hold its last frame) and the audio track goes on with silence. Each
	 * mute is found in the file from the track itself (the hole in the video, the
	 * stretches without beeps in the audio). The other track must go on through it,
	 * and lose its pairs only there; whenever both tracks are on, from the start
	 * and after every unmute, they are in sync.
	 */
	private void muteAtDifferentTimes(String codec) throws Exception {
		String room = uniqueRoom("mute-" + codec);
		Publisher alice = joinPublisher("chrome", room, "alice", codec, true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.muteVideo();
		Thread.sleep(4000);
		alice.muteAudio();
		Thread.sleep(4000);
		alice.unmuteVideo();
		Thread.sleep(4000);
		alice.unmuteAudio();
		Thread.sleep(5000);
		alice.muteAudio();
		Thread.sleep(4000);
		alice.unmuteAudio();
		Thread.sleep(5000);
		alice.muteVideo();
		Thread.sleep(4000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:" + codec);
		// it decodes, the audio is continuous (silence while muted), and every flash
		// and beep keeps its original timestamp across the mutes
		recording.assertHealthy();
		recording.assertStartTogether();
		FileTrack audio = recording.audio(0);
		FileTrack video = recording.video(0);

		// the video has one hole, its first mute (8 s), and ends with the second one
		video.assertOneGap(6.5, 10.5);
		double[] videoMuted = video.gaps(1).get(0);
		double videoEnd = video.lastPacketTime();
		double audioEnd = audio.lastPacketTime();
		Assertions.assertTrue(audioEnd - videoEnd > 2.5, String.format(Locale.ROOT,
				"The video, muted until the end, must end about 4 s before the audio: video until %.3f, audio until %.3f",
				videoEnd, audioEnd));

		// the audio has no beeps during its two mutes (8 s, then 4 s)
		List<double[]> audioMuted = audio.markerGaps(2.5);
		Assertions.assertEquals(2, audioMuted.size(),
				"The audio must have two stretches without beeps: " + FileTrack.format(audioMuted));
		assertLasts("The first audio mute", audioMuted.get(0), 7, 11);
		assertLasts("The second audio mute", audioMuted.get(1), 3, 7);

		// the first mutes overlap as they were made: the video was muted first, then
		// both were for a while, and the video came back first
		double[] bothMuted = { audioMuted.get(0)[0], videoMuted[1] };
		Assertions.assertTrue(videoMuted[0] < audioMuted.get(0)[0] && videoMuted[1] < audioMuted.get(0)[1],
				"The video must be muted and come back before the audio: video hole "
						+ FileTrack.format(List.of(videoMuted))
						+ ", first audio mute " + FileTrack.format(audioMuted.subList(0, 1)));
		assertLasts("The time both tracks are muted", bothMuted, 2.5, 7);

		// the other track goes on through each mute
		assertMarkersInside(audio, videoMuted, 2, "while the video is muted");
		assertMarkersInside(video, audioMuted.get(0), 2, "while the audio is muted");
		assertMarkersInside(video, audioMuted.get(1), 2, "while the audio is muted again");
		assertMarkersInside(audio, new double[] { videoEnd, audioEnd }, 2, "after the video is muted until the end");

		// and only there are markers missing their pair (the first frame after the
		// hole is never taken for a flash's onset: a beep just after it may lack one)
		List<Double> strayBeeps = recording.unpairedBeeps().stream()
				.filter(b -> b < videoMuted[0] || b > videoMuted[1] + 0.5).collect(Collectors.toList());
		Assertions.assertTrue(strayBeeps.isEmpty(), "Beeps without a flash while the video is on: " + strayBeeps);
		List<Double> strayFlashes = recording.unpairedFlashes().stream()
				.filter(f -> audioMuted.stream().noneMatch(m -> f > m[0] && f < m[1])).collect(Collectors.toList());
		Assertions.assertTrue(strayFlashes.isEmpty(), "Flashes without a beep while the audio is on: " + strayFlashes);

		// in sync whenever both tracks are on: before the first mute, and after
		// each unmute
		List<double[]> pairs = recording.assertAvSync(8);
		assertPairsInside(pairs, new double[] { 0, videoMuted[0] }, 2, "before the first mute");
		assertPairsInside(pairs, new double[] { audioMuted.get(0)[1], audioMuted.get(1)[0] }, 3,
				"after both tracks are unmuted");
		assertPairsInside(pairs, new double[] { audioMuted.get(1)[1], videoEnd }, 3,
				"after the audio is unmuted again");
	}

	/** window, as [from, to] in seconds, lasts between min and max seconds. */
	private static void assertLasts(String what, double[] window, double min, double max) {
		double length = window[1] - window[0];
		Assertions.assertTrue(length >= min && length <= max,
				String.format(Locale.ROOT, "%s lasts %.3f s (%.3f-%.3f), between %.1f and %.1f s expected", what,
						length, window[0], window[1], min, max));
	}

	/** track has at least min markers inside window, as [from, to] in seconds. */
	private static void assertMarkersInside(FileTrack track, double[] window, int min, String when) {
		long found = track.markers.stream().filter(m -> m > window[0] && m < window[1]).count();
		Assertions.assertTrue(found >= min,
				String.format(Locale.ROOT, "At least %d %s expected %s (%.3f-%.3f), %d found: %s", min,
						track.markerName(), when, window[0], window[1], found, track));
	}

	/** The A/V pairs (from avPairs) whose beep is inside window, as [from, to] in seconds. */
	private static List<double[]> pairsInside(List<double[]> pairs, double[] window) {
		return pairs.stream().filter(p -> p[0] >= window[0] && p[0] <= window[1]).collect(Collectors.toList());
	}

	/** A/V pairs as "beep time:offset in ms". */
	private static String offsets(List<double[]> pairs) {
		return pairs.stream().map(p -> String.format(Locale.ROOT, "%.2f:%+.0f", p[0], p[1]))
				.collect(Collectors.joining(" "));
	}

	/**
	 * At least min A/V pairs (from assertAvSync) are inside window, as
	 * [from, to] in seconds, widened by the pairing window: its edges are markers
	 * of one track, and the other's pair may land just outside.
	 */
	private static void assertPairsInside(List<double[]> pairs, double[] window, int min, String when) {
		long found = pairs.stream()
				.filter(p -> p[0] >= window[0] - MARKER_PAIR_WINDOW && p[0] <= window[1] + MARKER_PAIR_WINDOW)
				.count();
		Assertions.assertTrue(found >= min, String.format(Locale.ROOT,
				"At least %d A/V pairs expected %s (%.3f-%.3f), %d found", min, when, window[0], window[1],
				found));
	}

	private void unpublishRepublishVideo(String codec) throws Exception {
		String room = uniqueRoom("republish-video-" + codec);
		Publisher alice = joinPublisher("chrome", room, "alice", codec, true, true, true);

		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(5000);
		alice.unpublishVideo();
		Thread.sleep(4000);
		alice.addVideo();
		Thread.sleep(6000);

		// the new publication continues the video track
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:" + codec);
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.video(0).assertOneGap(3.5, 8);
		recording.video(0).assertReachedSize(CAMERA_WIDTH, CAMERA_HEIGHT);
		recording.assertAvSync(6);
		recording.assertUnpairedBeeps(3, 8);
	}

	/** Network trouble a network test puts a recording through. */
	private enum Trouble {
		/**
		 * Packets from the SFU to the egress lost, EGRESS_PACKET_LOSS_PERCENT of them:
		 * more than NACKs recover, so frames are lost for good.
		 */
		EGRESS_LOSS(NETWORK_TROUBLE_S),
		/**
		 * Packets of the publisher lost on its uplink, PUBLISHER_PACKET_LOSS_PERCENT of
		 * them: NACKs recover nearly all of them.
		 */
		PUBLISHER_LOSS(NETWORK_TROUBLE_S),
		/**
		 * The publisher's uplink limited to CONGESTED_RATE: its browser stops sending
		 * its top layer, and the SFU forwards a lower one.
		 */
		PUBLISHER_CONGESTION(NETWORK_TROUBLE_S),
		/**
		 * The publisher's packets delayed by PUBLISHER_JITTER_DELAY_MS +-
		 * PUBLISHER_JITTER_MS, and reordered.
		 */
		PUBLISHER_JITTER(NETWORK_TROUBLE_S),
		/** The publisher's media uplink cut for SHORT_OUTAGE_S. */
		PUBLISHER_SHORT_OUTAGE(SHORT_OUTAGE_S),
		/** The publisher's media uplink cut for LONG_OUTAGE_S: ICE is restarted. */
		PUBLISHER_LONG_OUTAGE(LONG_OUTAGE_S);

		/** How long the trouble lasts. */
		final int seconds;

		Trouble(int seconds) {
			this.seconds = seconds;
		}

		boolean outage() {
			return this == PUBLISHER_SHORT_OUTAGE || this == PUBLISHER_LONG_OUTAGE;
		}
	}

	/**
	 * Puts the recording of a participant through network trouble, and checks that
	 * the recording comes through it and recovers once the network does. The
	 * trouble on the publisher's link is made in a bridged browser, the only ones
	 * NetworkConditioner can impair.
	 *
	 * During the trouble, the recording must stay intact: it decodes, every frame
	 * shows the picture that was captured (a frame that refers to a lost one decodes
	 * into a corrupted picture, which decoders do not report: the egress drops such
	 * frames until a keyframe, and the video freezes instead), the audio is
	 * continuous, and both tracks go on. Its timing may move: the sync engine of the
	 * SDK egress follows the delay of a congested link and loses its sender reports
	 * with the packets (seen: the A/V offset moving up to 370 ms, with both SFU
	 * engines). Once the network has been fine for
	 * NETWORK_RECOVERY_S (OUTAGE_RECOVERY_S after an outage), it must be healed
	 * (see Recording.assertRecovered): the
	 * video without holes, every frame and beep where the others put it, in sync,
	 * with the A/V offset back to what it was before the trouble, and the top layer
	 * forwarded again (after congestion, jitter and outages).
	 *
	 * An outage leaves holes in the video during it only, which shows again at
	 * most OUTAGE_VIDEO_BACK_S after the network is back, while the audio goes on
	 * (as silence, but for what the client queued); the egress keeps recording
	 * the same tracks throughout.
	 */
	private void networkTrouble(Trouble trouble, String codec) throws Exception {
		String room = uniqueRoom(trouble.name().toLowerCase(Locale.ROOT).replace('_', '-') + "-" + codec);
		OpenViduTestappUser bridged = null;
		if (trouble == Trouble.EGRESS_LOSS) {
			NetworkConditioner.pullImages();
			joinPublisher("chrome", room, "alice", codec, true, true, true);
		} else {
			bridged = setupNetemBrowserUser(prepareNetemBrowsers());
			((JavascriptExecutor) bridged.getDriver()).executeScript(syncMediaScript);
			addPublisherInstance(bridged, room, "alice", codec, true, true, true);
		}
		String since = Instant.now().minusSeconds(5).toString();
		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		long active = System.currentTimeMillis();
		Thread.sleep((long) (NETWORK_TROUBLE_AT_S * 1000));

		// Times since the egress became active, which file times run ahead of by up to
		// a second or two (the session starts with the first packets): the time before
		// the trouble ends 3 s before it starts, and the trouble takes a moment to set in
		double troubleFrom = secondsSince(active);
		try {
			// Pumba reverts it by itself after that, should clear() never run (the
			// iptables rules of an outage only go with clear())
			int revertAfter = trouble.seconds + 30;
			switch (trouble) {
			case EGRESS_LOSS:
				NetworkConditioner.applyLossToInboundPackets(EGRESS_CONTAINER, NetworkConditioner.Protocol.UDP,
						NetworkConditioner.SFU_RTC_PORT_RANGE, EGRESS_PACKET_LOSS_PERCENT, revertAfter);
				break;
			case PUBLISHER_LOSS:
				NetworkConditioner.applyLossToOutboundPackets(getNetemContainerName(bridged), SFU_MEDIA_PORTS,
						PUBLISHER_PACKET_LOSS_PERCENT, revertAfter);
				break;
			case PUBLISHER_CONGESTION:
				NetworkConditioner.applyRateLimitToOutboundPackets(getNetemContainerName(bridged), SFU_MEDIA_PORTS,
						CONGESTED_RATE, revertAfter);
				break;
			case PUBLISHER_JITTER:
				NetworkConditioner.applyDelay(getNetemContainerName(bridged), PUBLISHER_JITTER_DELAY_MS,
						PUBLISHER_JITTER_MS, revertAfter, SFU_MEDIA_PORTS);
				break;
			case PUBLISHER_SHORT_OUTAGE:
			case PUBLISHER_LONG_OUTAGE:
				// the media ports, ICE-TCP and TURN: the client cannot escape the outage
				NetworkConditioner.blackoutOutbound(getNetemContainerName(bridged),
						NetworkConditioner.SFU_RTC_PORT_RANGE, trouble.seconds);
				break;
			}
			Thread.sleep(trouble.seconds * 1000L);
		} finally {
			NetworkConditioner.clear();
		}
		double troubleTo = secondsSince(active);
		log.info("{} from {} s to {} s after the egress became active", trouble,
				String.format(Locale.ROOT, "%.1f", troubleFrom), String.format(Locale.ROOT, "%.1f", troubleTo));
		int recovery = trouble.outage() ? OUTAGE_RECOVERY_S : NETWORK_RECOVERY_S;
		Thread.sleep((recovery + NETWORK_HEALED_S) * 1000L);

		if (trouble.outage()) {
			// whether the client resumed its session or left and joined again
			log.info("Publisher events after the outage: reconnecting {}, reconnected {}, localTrackPublished {}",
					bridged.getEventManager().getNumEvents("reconnecting-RoomEvent").get(),
					bridged.getEventManager().getNumEvents("reconnected-RoomEvent").get(),
					bridged.getEventManager().getNumEvents("localTrackPublished-RoomEvent").get());
			Assertions.assertEquals("EGRESS_ACTIVE", status(getEgress(egressId)), "The recording must go on through a "
					+ trouble.seconds + " s outage of its participant's uplink: " + getEgress(egressId));
		}
		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:" + codec);
		recording.assertDecodesWithoutErrors();
		recording.assertPicturesIntact();
		recording.assertAudioContinuous();
		recording.assertNoTinyVideoFrames();
		recording.assertStartTogether();
		recording.assertRecovered(new double[] { troubleFrom - 12, troubleFrom - 3 },
				new double[] { troubleTo + recovery, Double.MAX_VALUE });
		switch (trouble) {
		case EGRESS_LOSS:
			int losses = remuxFinalizedCount(egressId, since, "videoLosses");
			Assertions.assertTrue(losses > 0,
					"The egress must have lost video frames for good during the packet loss: videoLosses " + losses);
			break;
		case PUBLISHER_CONGESTION:
			recording.video(0).assertDropsAndRecovers(CAMERA_WIDTH, CAMERA_HEIGHT, 3);
			break;
		case PUBLISHER_JITTER:
			recording.video(0).assertReachesSizeAfter(CAMERA_WIDTH, CAMERA_HEIGHT, troubleTo);
			break;
		case PUBLISHER_SHORT_OUTAGE:
		case PUBLISHER_LONG_OUTAGE:
			// The video has holes during the outage only, and shows again at most
			// OUTAGE_VIDEO_BACK_S after it. Not necessarily a single hole: what the
			// client queued during the outage and sends once its network is back is
			// written at the time it was captured, and fills part of it. File times run
			// ahead of times since the egress became active by up to 2 s
			FileTrack video = recording.video(0);
			List<double[]> holes = video.gaps(1);
			double outageFrom = troubleFrom - 1;
			double videoBackBy = troubleTo + OUTAGE_VIDEO_BACK_S + 2;
			Assertions.assertTrue(holes.stream().allMatch(h -> h[0] >= outageFrom && h[1] <= videoBackBy),
					String.format(Locale.ROOT,
							"The video may only have holes during the %d s outage (%.1f-%.1f s), and must show again"
									+ " at most %d s after it (by %.1f s): it has %s",
							trouble.seconds, troubleFrom, troubleTo, OUTAGE_VIDEO_BACK_S, videoBackBy,
							FileTrack.format(holes)));
			video.assertReachesSizeAfter(CAMERA_WIDTH, CAMERA_HEIGHT, troubleTo);
			break;
		default:
			break;
		}
	}

	/**
	 * Records a participant whose layers dynacast paused: the egress subscribing
	 * gets the top layer sent again, and the recording has both tracks from the
	 * start, in sync, and reaches the captured size.
	 */
	private void recordPausedLayers(Publisher alice, String room) throws Exception {
		String egressId = startParticipantRecording(room, "alice", filepath(room, "alice", "mkv"));
		waitForEncodings(alice, "the top layer sent again", e -> !e.isEmpty() && e.get(e.size() - 1).active());
		waitUntilEgressStatus(egressId, "EGRESS_ACTIVE", 20);
		Thread.sleep(10000);

		Recording recording = stopAndGetRecording(egressId);
		recording.assertFinalized();
		recording.assertTracks("audio:opus", "video:vp8");
		recording.assertHealthy();
		recording.assertStartTogether();
		recording.assertAvSync(6);
		recording.video(0).assertReachedSize(CAMERA_WIDTH, CAMERA_HEIGHT);
	}

	// ------------------------------------------------------------------------
	// Publishers (openvidu-testapp)
	// ------------------------------------------------------------------------

	/** A simulcast encoding of the publisher's camera, as its browser sends it. */
	private record Encoding(String rid, boolean active) {
		@Override
		public String toString() {
			return rid + (active ? " sent" : " paused");
		}
	}

	private static final String ENCODINGS_SCRIPT = "const done = arguments[arguments.length - 1];"
			+ "const pub = [...window.room_%d.localParticipant.videoTrackPublications.values()][0];"
			+ "done(pub.track.sender.getParameters().encodings.map(e => (e.rid || '-') + (e.active ? '+' : '-'))"
			+ ".join(' '));";

	/** The encodings of the publisher's camera, lowest layer first. */
	private List<Encoding> encodings(Publisher p) {
		String result = String.valueOf(((JavascriptExecutor) p.user.getDriver())
				.executeAsyncScript(String.format(ENCODINGS_SCRIPT, p.instance)));
		List<String> order = List.of("q", "h", "f");
		List<Encoding> encodings = new ArrayList<>();
		for (String e : result.trim().split(" ")) {
			if (e.length() > 1) {
				encodings.add(new Encoding(e.substring(0, e.length() - 1), e.endsWith("+")));
			}
		}
		encodings.sort((a, b) -> Integer.compare(order.indexOf(a.rid()), order.indexOf(b.rid())));
		return encodings;
	}

	private void waitForEncodings(Publisher p, String what, Predicate<List<Encoding>> condition) throws Exception {
		long deadline = System.currentTimeMillis() + 45000;
		List<Encoding> encodings = encodings(p);
		while (!condition.test(encodings)) {
			Assertions.assertTrue(System.currentTimeMillis() < deadline,
					"The camera of " + p.identity + " never got to " + what + ": " + encodings);
			Thread.sleep(250);
			encodings = encodings(p);
		}
		log.info("Camera of {}: {} ({})", p.identity, encodings, what);
	}

	private static String uniqueRoom(String name) {
		return "passthrough-" + name + "-" + Long.toString(System.nanoTime() % 1_000_000_000L, 36);
	}

	private static String filepath(String room, String identity, String extension) {
		return "passthrough/" + room + "/" + identity + "." + extension;
	}

	/**
	 * A testapp instance publishing the synchronized synthetic media.
	 */
	private class Publisher {
		final OpenViduTestappUser user;
		final int instance;
		final String identity;
		int published;
		int unpublished;
		int mutes;
		int unmutes;

		Publisher(OpenViduTestappUser user, int instance, String identity, int published) {
			this.user = user;
			this.instance = instance;
			this.identity = identity;
			this.published = published;
		}

		private void click(String css) {
			waitAndClick(user, "#openvidu-instance-" + instance + " " + css);
		}

		private void waitForEvent(String event, int count) throws Exception {
			user.getEventManager().waitUntilEventReaches(instance, event, "RoomEvent", count);
		}

		void addVideo() throws Exception {
			click(".add-video-btn");
			waitForEvent("localTrackPublished", ++published);
		}

		void addAudio() throws Exception {
			click(".add-audio-btn");
			waitForEvent("localTrackPublished", ++published);
		}

		void addScreen() throws Exception {
			click(".add-screen-btn");
			waitForEvent("localTrackPublished", ++published);
		}

		void unpublishVideo() throws Exception {
			click(CAMERA + " .publish-unpublish-video");
			waitForEvent("localTrackUnpublished", ++unpublished);
		}

		void unpublishAudio() throws Exception {
			click(MICROPHONE + " mat-icon[aria-label='Unpublish track']");
			waitForEvent("localTrackUnpublished", ++unpublished);
		}

		void muteVideo() throws Exception {
			click(CAMERA + " .mute-unmute-video");
			waitForEvent("trackMuted", ++mutes);
		}

		void unmuteVideo() throws Exception {
			click(CAMERA + " .mute-unmute-video");
			waitForEvent("trackUnmuted", ++unmutes);
		}

		void muteAudio() throws Exception {
			click(MICROPHONE + " mat-icon[aria-label='Mute/Unmute audio']");
			waitForEvent("trackMuted", ++mutes);
		}

		void unmuteAudio() throws Exception {
			click(MICROPHONE + " mat-icon[aria-label='Mute/Unmute audio']");
			waitForEvent("trackUnmuted", ++unmutes);
		}

		/** The video codec of the tracks published from now on. */
		void setVideoCodec(String codec) throws Exception {
			click(".options-track-publish-btn");
			Thread.sleep(300);
			selectVideoCodec(user, codec);
			waitAndClick(user, "#close-dialog-btn");
			Thread.sleep(300);
		}

		void leave() throws Exception {
			click(".disconnect-btn");
			waitForEvent("disconnected", 1);
		}
	}

	/**
	 * Opens a browser with the testapp, replaces its camera, screen and microphone
	 * by the synchronized synthetic media, and joins room as identity publishing
	 * the given tracks (codec is the video codec, without backup codec).
	 */
	private Publisher joinPublisher(String browser, String room, String identity, String codec, boolean simulcast,
			boolean audio, boolean video) throws Exception {
		OpenViduTestappUser user = setupBrowserAndConnectToOpenViduTestapp(browser);
		((JavascriptExecutor) user.getDriver()).executeScript(syncMediaScript);
		return addPublisherInstance(user, room, identity, codec, simulcast, audio, video);
	}

	private Publisher addPublisherInstance(OpenViduTestappUser user, String room, String identity, String codec,
			boolean simulcast, boolean audio, boolean video) throws Exception {
		int instance = user.getDriver().findElements(By.cssSelector("app-openvidu-instance")).size();
		this.addPublisher(user, false, simulcast, true, false, audio, video, null, null, null);
		this.waitAndClick(user, "#room-options-btn-" + instance);
		Thread.sleep(300);
		// enabled by default: the recording must see the selected codec only
		user.getDriver().findElement(By.id("trackPublish-backupCodec")).click();
		this.selectVideoCodec(user, codec);
		this.waitAndClick(user, "#close-dialog-btn");
		Thread.sleep(300);
		WebElement roomInput = user.getDriver().findElement(By.id("room-name-input-" + instance));
		roomInput.clear();
		roomInput.sendKeys(room);
		WebElement identityInput = user.getDriver().findElement(By.id("participant-name-input-" + instance));
		identityInput.clear();
		identityInput.sendKeys(identity);
		user.getDriver().findElement(By.cssSelector("#openvidu-instance-" + instance + " .connect-btn"))
				.sendKeys(Keys.ENTER);
		user.getEventManager().waitUntilEventReaches(instance, "connected", "RoomEvent", 1);
		Publisher publisher = new Publisher(user, instance, identity, (audio ? 1 : 0) + (video ? 1 : 0));
		if (publisher.published > 0) {
			publisher.waitForEvent("localTrackPublished", publisher.published);
		}
		if (audio) {
			publishedTrack(room, identity, TrackSource.MICROPHONE);
		}
		if (video) {
			publishedTrack(room, identity, TrackSource.CAMERA);
		}
		return publisher;
	}

	/**
	 * Selects the video codec in the open publish options dialog, verifying the
	 * selection (option ids are lower case, the select shows them upper case).
	 */
	private void selectVideoCodec(OpenViduTestappUser user, String codec) throws InterruptedException {
		String expected = codec.toUpperCase(Locale.ROOT);
		By select = By.cssSelector("#trackPublish-videoCodec mat-select");
		for (int attempt = 1; attempt <= 5; attempt++) {
			this.waitAndClick(user, "#trackPublish-videoCodec");
			this.waitAndClick(user, "#mat-option-" + codec.toLowerCase(Locale.ROOT));
			Thread.sleep(300);
			if (expected.equals(user.getDriver().findElement(select).getText().trim())) {
				return;
			}
			if (!user.getDriver().findElements(By.cssSelector(".cdk-overlay-backdrop")).isEmpty()) {
				new Actions(user.getDriver()).sendKeys(Keys.ESCAPE).perform();
				Thread.sleep(300);
			}
		}
		Assertions.fail("Could not select video codec " + expected);
	}

	/**
	 * The track of the given source published by the participant, as the server
	 * sees it: once its media arrives, which is when subscribers such as the
	 * egress see it.
	 */
	private TrackInfo publishedTrack(String room, String identity, TrackSource source) throws Exception {
		for (int attempt = 0; attempt < 120; attempt++) {
			ParticipantInfo participant = LK.getParticipant(room, identity).execute().body();
			if (participant != null) {
				for (TrackInfo track : participant.getTracksList()) {
					if (track.getSource() == source) {
						return track;
					}
				}
			}
			Thread.sleep(250);
		}
		throw new AssertionError(identity + " has no " + source + " track in room " + room);
	}

	// ------------------------------------------------------------------------
	// Egress API (Twirp JSON: the Java server SDK predates the PASSTHROUGH preset)
	// ------------------------------------------------------------------------

	private static class TwirpException extends IOException {
		final int httpStatus;

		TwirpException(int httpStatus, String body) {
			super("HTTP " + httpStatus + ": " + body);
			this.httpStatus = httpStatus;
		}
	}

	private JsonObject twirp(String service, String method, JsonObject body) throws IOException {
		AccessToken token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		token.setIdentity("participant-passthrough-e2e");
		token.addGrants(new RoomRecord(true), new RoomCreate(true));
		Request request = new Request.Builder().url(LIVEKIT_HTTP_URL + "twirp/livekit." + service + "/" + method)
				.header("Authorization", "Bearer " + token.toJwt()).post(RequestBody.create(body.toString(), JSON))
				.build();
		try (Response response = LK_HTTP_CLIENT.newCall(request).execute()) {
			String text = response.body().string();
			if (!response.isSuccessful()) {
				throw new TwirpException(response.code(), text);
			}
			return JsonParser.parseString(text).getAsJsonObject();
		}
	}

	private JsonObject egressApi(String method, JsonObject body) throws IOException {
		return twirp("Egress", method, body);
	}

	private void assertRejected(String method, JsonObject body, String reason) throws IOException {
		try {
			JsonObject info = egressApi(method, body);
			Assertions.fail(method + " must be rejected, it started egress " + info + " for " + body);
		} catch (TwirpException e) {
			Assertions.assertEquals(400, e.httpStatus, "Unexpected rejection of " + body + ": " + e.getMessage());
			Assertions.assertTrue(e.getMessage().contains(reason),
					"The rejection of " + body + " must mention '" + reason + "': " + e.getMessage());
			log.info("Rejected as expected: {}", e.getMessage());
		}
	}

	private static JsonObject fileOutput(String filepath) {
		JsonObject file = new JsonObject();
		file.addProperty("filepath", filepath);
		return file;
	}

	private static JsonArray streamOutputs(String url) {
		JsonObject stream = new JsonObject();
		JsonArray urls = new JsonArray();
		urls.add(url);
		stream.add("urls", urls);
		JsonArray streams = new JsonArray();
		streams.add(stream);
		return streams;
	}

	private static JsonObject participantRecordingRequest(String room, String identity, String filepath) {
		JsonObject request = new JsonObject();
		request.addProperty("room_name", room);
		request.addProperty("identity", identity);
		request.addProperty("preset", "PASSTHROUGH");
		JsonArray files = new JsonArray();
		files.add(fileOutput(filepath));
		request.add("file_outputs", files);
		return request;
	}

	/**
	 * StartParticipantEgress with preset PASSTHROUGH.
	 */
	private String startParticipantRecording(String room, String identity, String filepath) throws IOException {
		return startParticipantRecording(room, identity, filepath, false);
	}

	private String startParticipantRecording(String room, String identity, String filepath, boolean screenShare)
			throws IOException {
		JsonObject request = participantRecordingRequest(room, identity, filepath);
		if (screenShare) {
			request.addProperty("screen_share", true);
		}
		String egressId = egressApi("StartParticipantEgress", request).get("egress_id").getAsString();
		log.info("Started Participant Passthrough egress {} of {} in room {}", egressId, identity, room);
		return egressId;
	}

	private static JsonObject participantVideo(String identity, boolean preferScreenShare) {
		JsonObject video = new JsonObject();
		video.addProperty("identity", identity);
		if (preferScreenShare) {
			video.addProperty("prefer_screen_share", true);
		}
		return video;
	}

	private static JsonObject audioRoute(String match, String value) {
		JsonObject route = new JsonObject();
		route.addProperty(match, value);
		return route;
	}

	private static JsonObject audioRoutes(JsonObject... routes) {
		JsonObject audio = new JsonObject();
		JsonArray array = new JsonArray();
		Arrays.stream(routes).forEach(array::add);
		audio.add("routes", array);
		return audio;
	}

	private static JsonObject mediaRecordingRequest(String room, JsonObject media, String filepath) {
		JsonObject request = new JsonObject();
		request.addProperty("room_name", room);
		request.add("media", media);
		request.addProperty("preset", "PASSTHROUGH");
		JsonObject output = new JsonObject();
		output.add("file", fileOutput(filepath));
		JsonArray outputs = new JsonArray();
		outputs.add(output);
		request.add("outputs", outputs);
		return request;
	}

	/**
	 * StartEgress with a MediaSource and preset PASSTHROUGH.
	 */
	private String startMediaRecording(String room, JsonObject media, String filepath) throws IOException {
		String egressId = egressApi("StartEgress", mediaRecordingRequest(room, media, filepath)).get("egress_id")
				.getAsString();
		log.info("Started Participant Passthrough egress {} of {} in room {}", egressId, media, room);
		return egressId;
	}

	private JsonObject getEgress(String egressId) throws IOException {
		JsonObject request = new JsonObject();
		request.addProperty("egress_id", egressId);
		JsonArray items = egressApi("ListEgress", request).getAsJsonArray("items");
		return items == null || items.isEmpty() ? null : items.get(0).getAsJsonObject();
	}

	private static String status(JsonObject info) {
		return info == null || !info.has("status") ? "unknown" : info.get("status").getAsString();
	}

	private JsonObject waitUntilEgressStatus(String egressId, String status, int timeoutSeconds) throws Exception {
		long deadline = System.currentTimeMillis() + timeoutSeconds * 1000L;
		JsonObject info = null;
		while (System.currentTimeMillis() < deadline) {
			info = getEgress(egressId);
			String current = status(info);
			if (status.equals(current)) {
				return info;
			}
			if (List.of("EGRESS_FAILED", "EGRESS_ABORTED").contains(current)) {
				Assertions.fail("Egress " + egressId + " ended as " + current + " waiting for " + status + ": " + info);
			}
			Thread.sleep(250);
		}
		Assertions.fail("Timeout waiting for egress " + egressId + " to reach " + status + ", last seen: " + info);
		return null;
	}

	private JsonObject waitUntilEgressEnds(String egressId, int timeoutSeconds) throws Exception {
		long deadline = System.currentTimeMillis() + timeoutSeconds * 1000L;
		JsonObject info = null;
		while (System.currentTimeMillis() < deadline) {
			info = getEgress(egressId);
			if (List.of("EGRESS_COMPLETE", "EGRESS_FAILED", "EGRESS_ABORTED", "EGRESS_LIMIT_REACHED")
					.contains(status(info))) {
				return info;
			}
			Thread.sleep(250);
		}
		Assertions.fail("Timeout waiting for egress " + egressId + " to end, last seen: " + info);
		return null;
	}

	private JsonObject stopEgress(String egressId) throws IOException {
		JsonObject request = new JsonObject();
		request.addProperty("egress_id", egressId);
		return egressApi("StopEgress", request);
	}

	private void stopAllActiveEgresses() {
		try {
			JsonObject request = new JsonObject();
			request.addProperty("active", true);
			JsonArray items = egressApi("ListEgress", request).getAsJsonArray("items");
			if (items == null) {
				return;
			}
			for (JsonElement item : items) {
				String egressId = item.getAsJsonObject().get("egress_id").getAsString();
				log.info("Stopping leftover egress {}", egressId);
				try {
					stopEgress(egressId);
				} catch (IOException e) {
					log.warn("Could not stop egress {}: {}", egressId, e.getMessage());
				}
			}
		} catch (IOException e) {
			log.warn("Could not list active egresses: {}", e.getMessage());
		}
	}

	// ------------------------------------------------------------------------
	// Recordings
	// ------------------------------------------------------------------------

	/**
	 * A count the egress logged when it finalized the file of egressId ("remux file
	 * finalized"), read from its container log since the given instant.
	 */
	private static int remuxFinalizedCount(String egressId, String since, String field) throws Exception {
		Exec logs = Exec.run(60, "sh", "-c", "docker logs --since " + since + " " + EGRESS_CONTAINER
				+ " 2>&1 | grep -F '\"egressID\": \"" + egressId + "\"' | grep -F 'remux file finalized'");
		Matcher m = Pattern.compile("\"" + field + "\": (\\d+)").matcher(logs.stdout);
		Assertions.assertTrue(m.find(), "The egress logged no \"remux file finalized\" with " + field + " for "
				+ egressId + ": " + logs.stdout + logs.stderr);
		return Integer.parseInt(m.group(1));
	}

	private Recording stopAndGetRecording(String egressId) throws Exception {
		stopEgress(egressId);
		return getRecording(waitUntilEgressStatus(egressId, "EGRESS_COMPLETE", 30));
	}

	private static String fileKey(JsonObject egressInfo) {
		JsonArray files = egressInfo.getAsJsonArray("file_results");
		if (files != null && !files.isEmpty()) {
			Assertions.assertEquals(1, files.size(), "One file expected: " + egressInfo);
			return files.get(0).getAsJsonObject().get("filename").getAsString();
		}
		Assertions.assertTrue(egressInfo.has("file"), "The egress has no file: " + egressInfo);
		return egressInfo.getAsJsonObject("file").get("filename").getAsString();
	}

	/**
	 * Downloads the uploaded file of a completed egress from MinIO.
	 */
	private Recording getRecording(JsonObject egressInfo) throws Exception {
		String key = fileKey(egressInfo);
		Path local = Files.createTempDirectory("participant-passthrough").resolve(Paths.get(key).getFileName());
		minio.downloadObject(DownloadObjectArgs.builder().bucket(MINIO_BUCKET).object(key)
				.filename(local.toString()).build());
		return Recording.analyze(local);
	}

	/**
	 * Where an active egress writes its file, inside the egress container.
	 */
	private String fileBeingRecorded(String egressId) throws IOException {
		String name = Paths.get(fileKey(getEgress(egressId))).getFileName().toString();
		return EGRESS_TMP_DIR + "/" + egressId + "/" + name;
	}

	/**
	 * Copies the file an active egress is writing, from the egress container.
	 */
	private Recording snapshotRecordingInProgress(String egressId) throws Exception {
		String remote = fileBeingRecorded(egressId);
		Path local = Files.createTempDirectory("participant-passthrough-live").resolve(Paths.get(remote).getFileName());
		Exec copy = Exec.run(60, "docker", "cp", EGRESS_CONTAINER + ":" + remote, local.toString());
		Assertions.assertEquals(0, copy.exitCode, "Could not copy the file being recorded: " + copy.stderr);
		return Recording.analyze(local);
	}

	/**
	 * Plays (demuxes and decodes every track of) the file an active egress is
	 * writing, in place, with GStreamer inside the egress container.
	 */
	private void playInPlace(String egressId) throws Exception {
		String remote = fileBeingRecorded(egressId);
		Exec play = Exec.run(120, "docker", "exec", EGRESS_CONTAINER, "gst-launch-1.0", "-q", "playbin",
				"uri=file://" + remote, "video-sink=fakesink", "audio-sink=fakesink");
		log.info("Played {} while recording: exit {} {}", remote, play.exitCode, play.stderr.trim());
		Assertions.assertEquals(0, play.exitCode,
				"GStreamer could not play the file being recorded: " + play.stdout + play.stderr);
		Assertions.assertFalse((play.stdout + play.stderr).contains("ERROR"),
				"GStreamer reported errors playing the file being recorded: " + play.stdout + play.stderr);
	}

	// ------------------------------------------------------------------------
	// Media analysis (ffprobe / ffmpeg)
	// ------------------------------------------------------------------------

	private static class Exec {
		final int exitCode;
		final String stdout;
		final String stderr;

		private Exec(int exitCode, String stdout, String stderr) {
			this.exitCode = exitCode;
			this.stdout = stdout;
			this.stderr = stderr;
		}

		static Exec run(int timeoutSeconds, String... command) throws IOException, InterruptedException {
			Path out = Files.createTempFile("exec", ".out");
			Path err = Files.createTempFile("exec", ".err");
			try {
				Process process = new ProcessBuilder(command).redirectOutput(out.toFile()).redirectError(err.toFile())
						.start();
				if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
					process.destroyForcibly();
					throw new IOException("Timeout running " + String.join(" ", command));
				}
				return new Exec(process.exitValue(), Files.readString(out, StandardCharsets.UTF_8),
						Files.readString(err, StandardCharsets.UTF_8));
			} finally {
				Files.deleteIfExists(out);
				Files.deleteIfExists(err);
			}
		}
	}

	private static class FileTrack {
		int index;
		String type;
		String codec;
		boolean isDefault;
		List<Double> packets = new ArrayList<>();
		// onsets of the white flashes (video) or of the beeps (audio)
		List<Double> markers = new ArrayList<>();
		// [file time in s, page time in ms within BAR_PERIOD_MS] of every video frame
		// that shows the bar
		List<double[]> bar = new ArrayList<>();
		private List<double[]> placements;
		int tinyFrames;
		int maxWidth;
		int maxHeight;
		int minWidth = Integer.MAX_VALUE;
		int minHeight = Integer.MAX_VALUE;
		// [file time in s, width, height] of every video frame
		List<double[]> frameSizes = new ArrayList<>();
		// video frames whose picture is not intact (see readVideo), and where
		int brokenPictures;
		List<String> brokenAt = new ArrayList<>();
		// the size the header of the file gives the track
		int headerWidth;
		int headerHeight;

		double firstPacketTime() {
			return packets.isEmpty() ? 0 : packets.get(0);
		}

		double lastPacketTime() {
			return packets.isEmpty() ? 0 : packets.get(packets.size() - 1);
		}

		/** Holes between consecutive packets longer than seconds, as [from, to]. */
		List<double[]> gaps(double seconds) {
			List<double[]> gaps = new ArrayList<>();
			for (int i = 1; i < packets.size(); i++) {
				if (packets.get(i) - packets.get(i - 1) > seconds) {
					gaps.add(new double[] { packets.get(i - 1), packets.get(i) });
				}
			}
			return gaps;
		}

		/**
		 * Stretches longer than seconds between consecutive markers, as [from, to]:
		 * where the other markers stop, as when the track is muted.
		 */
		List<double[]> markerGaps(double seconds) {
			List<double[]> gaps = new ArrayList<>();
			for (int i = 1; i < markers.size(); i++) {
				if (markers.get(i) - markers.get(i - 1) > seconds) {
					gaps.add(new double[] { markers.get(i - 1), markers.get(i) });
				}
			}
			return gaps;
		}

		static String format(List<double[]> gaps) {
			return gaps.stream().map(g -> String.format(Locale.ROOT, "%.3f-%.3f", g[0], g[1]))
					.collect(Collectors.joining(", "));
		}

		void assertReachedSize(int width, int height) {
			Assertions.assertTrue(maxWidth == width && maxHeight == height, "Video track " + index
					+ " should reach " + width + "x" + height + ", its largest frame is " + maxWidth + "x" + maxHeight);
		}

		void assertConstantSize(int width, int height) {
			Assertions.assertTrue(
					minWidth == width && minHeight == height && maxWidth == width && maxHeight == height,
					"Every frame of video track " + index + " should be " + width + "x" + height + ", they go from "
							+ minWidth + "x" + minHeight + " to " + maxWidth + "x" + maxHeight);
		}

		/** Consecutive frames of the same size, as [from, to, width, height]. */
		List<double[]> sizeRuns() {
			List<double[]> runs = new ArrayList<>();
			for (double[] f : frameSizes) {
				double[] last = runs.isEmpty() ? null : runs.get(runs.size() - 1);
				if (last != null && last[2] == f[1] && last[3] == f[2]) {
					last[1] = f[0];
				} else {
					runs.add(new double[] { f[0], f[0], f[1], f[2] });
				}
			}
			return runs;
		}

		String formatSizeRuns() {
			return sizeRuns().stream().map(r -> String.format(Locale.ROOT, "%.0fx%.0f %.3f-%.3f", r[2], r[3], r[0], r[1]))
					.collect(Collectors.joining(", "));
		}

		/**
		 * The track drops from width x height to a smaller size (a lower layer) for at
		 * least seconds, and later gets back to width x height.
		 */
		void assertDropsAndRecovers(int width, int height, double seconds) {
			boolean reached = false;
			boolean dropped = false;
			for (double[] r : sizeRuns()) {
				boolean top = r[2] == width && r[3] == height;
				if (top && dropped) {
					return;
				}
				if (top) {
					reached = true;
				} else if (reached && r[2] * r[3] < width * height && r[1] - r[0] >= seconds) {
					dropped = true;
				}
			}
			Assertions.fail("Video track " + index + " should drop from " + width + "x" + height
					+ " to a smaller size for " + seconds + " s or more, and get back to " + width + "x" + height + ": "
					+ formatSizeRuns());
		}

		/** The track shows width x height at some point after seconds into the file. */
		void assertReachesSizeAfter(int width, int height, double seconds) {
			Assertions.assertTrue(frameSizes.stream().anyMatch(f -> f[0] >= seconds && f[1] == width && f[2] == height),
					String.format(Locale.ROOT, "Video track %d should get back to %dx%d after %.1f s: %s", index, width,
							height, seconds, formatSizeRuns()));
		}

		void assertMarkers(int min) {
			Assertions.assertTrue(markers.size() >= min,
					"Track " + index + " should have at least " + min + " " + markerName() + ": " + this);
		}

		void assertNoGaps() {
			List<double[]> gaps = gaps(1);
			Assertions.assertTrue(gaps.isEmpty(), "Track " + index + " should have no gaps: " + format(gaps));
		}

		/** One hole in the track, between min and max seconds long. */
		void assertOneGap(double min, double max) {
			List<double[]> gaps = gaps(1);
			Assertions.assertEquals(1, gaps.size(), "Track " + index + " should have one gap: " + format(gaps));
			double length = gaps.get(0)[1] - gaps.get(0)[0];
			Assertions.assertTrue(length >= min && length <= max, String.format(Locale.ROOT,
					"The gap of track %d lasts %.3f s, between %.1f and %.1f s expected", index, length, min, max));
		}

		String markerName() {
			return "video".equals(type) ? "flashes" : "beeps";
		}

		/**
		 * [file time in s, placement in ms] of every frame that shows the bar: its file
		 * time minus the page time it shows. The bar gives the page time within its
		 * period, so each frame's is taken nearest to the previous frame's placement:
		 * a placement could only be misread if it jumped by half a period (1 s).
		 */
		List<double[]> placements() {
			if (placements == null) {
				placements = new ArrayList<>(bar.size());
				Double previous = null;
				for (double[] b : bar) {
					double placement = b[0] * 1000 - b[1];
					if (previous != null) {
						placement -= Math.rint((placement - previous) / BAR_PERIOD_MS) * BAR_PERIOD_MS;
					}
					placements.add(new double[] { b[0], placement });
					previous = placement;
				}
			}
			return placements;
		}

		/**
		 * The placement of every frame that shows the bar, as the lowest one in the
		 * BAR_WINDOW_S around it: a frame drawn late by the page shows older content
		 * (a higher placement), and so does a frame the egress moved forward a little.
		 */
		List<double[]> steadyPlacements() {
			List<double[]> all = placements();
			List<double[]> steady = new ArrayList<>(all.size());
			int from = 0;
			int to = 0;
			for (int i = 0; i < all.size(); i++) {
				double t = all.get(i)[0];
				while (all.get(from)[0] < t - BAR_WINDOW_S / 2) {
					from++;
				}
				while (to + 1 < all.size() && all.get(to + 1)[0] <= t + BAR_WINDOW_S / 2) {
					to++;
				}
				double lowest = Double.MAX_VALUE;
				for (int j = from; j <= to; j++) {
					lowest = Math.min(lowest, all.get(j)[1]);
				}
				steady.add(new double[] { t, lowest });
			}
			return steady;
		}

		/**
		 * The page time in ms that the video shows at file time t, interpolated
		 * between the frames around t that show the bar (a flash hides it for 100 ms),
		 * or null without such frames less than 0.25 s apart.
		 */
		Double pageTimeAt(double t) {
			List<double[]> all = placements();
			int after = 0;
			while (after < all.size() && all.get(after)[0] < t) {
				after++;
			}
			if (after == 0 || after == all.size()) {
				return null;
			}
			double[] p1 = all.get(after - 1);
			double[] p2 = all.get(after);
			if (p2[0] - p1[0] > 0.25) {
				return null;
			}
			double placement = p1[1] + (t - p1[0]) * (p2[1] - p1[1]) / (p2[0] - p1[0]);
			return t * 1000 - placement;
		}

		/**
		 * The timestamps are the original ones, whatever happened to the track in
		 * between: every frame of a video track keeps the place the bar gives it on
		 * the page clock, and every beep of an audio track lands on the same fraction
		 * of a second (the beeps are on whole seconds of the page clock).
		 */
		void assertOriginalTimestamps() {
			assertOriginalTimestamps(null);
		}

		/** The same, only inside windows (as [from, to] in seconds). */
		void assertOriginalTimestamps(List<double[]> windows) {
			if ("video".equals(type)) {
				assertPlacementsSteady(windows);
			} else {
				assertMarkersOnWholeSeconds(
						markers.stream().filter(m -> inside(windows, m)).collect(Collectors.toList()));
			}
		}

		private static boolean inside(List<double[]> windows, double t) {
			return windows == null || windows.stream().anyMatch(w -> t >= w[0] && t <= w[1]);
		}

		private void assertPlacementsSteady(List<double[]> windows) {
			// the bar must be found: a frame without it is a flash or a frame of nothing
			Assertions.assertTrue(packets.size() < 30 || bar.size() >= packets.size() / 2, String.format(Locale.ROOT,
					"Video track %d: the moving bar is found in only %d of %d frames", index, bar.size(), packets.size()));
			List<double[]> checked = steadyPlacements().stream().filter(p -> inside(windows, p[0]))
					.collect(Collectors.toList());
			if (checked.size() < 2) {
				return;
			}
			List<Double> sorted = checked.stream().map(p -> p[1]).sorted().collect(Collectors.toList());
			double median = sorted.get(sorted.size() / 2);
			List<String> off = new ArrayList<>();
			int count = 0;
			for (double[] p : checked) {
				double deviation = p[1] - median;
				if (Math.abs(deviation) > VIDEO_PLACEMENT_TOLERANCE_MS) {
					if (off.size() < 10) {
						off.add(String.format(Locale.ROOT, "%.3f (%+.0f ms)", p[0], deviation));
					}
					count++;
				}
			}
			Assertions.assertTrue(count == 0, String.format(Locale.ROOT,
					"The frames of video track %d must keep the place the bar gives them on the page clock (within"
							+ " %.0f ms of the median), %d of %d do not: %s%s",
					index, VIDEO_PLACEMENT_TOLERANCE_MS, count, checked.size(), String.join(", ", off),
					count > off.size() ? ", ..." : ""));
		}

		/**
		 * Every beep of the list lands on the same fraction of a second as the others,
		 * within AUDIO_PHASE_TOLERANCE_MS of their median.
		 */
		private void assertMarkersOnWholeSeconds(List<Double> checked) {
			if (checked.size() < 2) {
				return;
			}
			double tolerance = AUDIO_PHASE_TOLERANCE_MS;
			List<Double> phases = new ArrayList<>();
			for (double m : checked) {
				double d = m - checked.get(0);
				phases.add((d - Math.rint(d)) * 1000);
			}
			List<Double> sorted = new ArrayList<>(phases);
			Collections.sort(sorted);
			double median = sorted.get(sorted.size() / 2);
			List<String> off = new ArrayList<>();
			for (int i = 0; i < checked.size(); i++) {
				if (Math.abs(phases.get(i) - median) > tolerance) {
					off.add(String.format(Locale.ROOT, "%.3f (%+.0f ms)", checked.get(i), phases.get(i) - median));
				}
			}
			Assertions.assertTrue(off.isEmpty(), String.format(Locale.ROOT,
					"The %s of track %d must land on whole seconds (within %.0f ms), these do not: %s", markerName(),
					index, tolerance, String.join(", ", off)));
		}

		@Override
		public String toString() {
			return String.format(Locale.ROOT, "#%d %s:%s%s%s %d packets %.3f-%.3f, %d %s%s%s%s", index, type, codec,
					"video".equals(type) ? " " + minWidth + "x" + minHeight + " to " + maxWidth + "x" + maxHeight : "",
					isDefault ? " (default)" : "", packets.size(), firstPacketTime(), lastPacketTime(),
					markers.size(), markerName(), "video".equals(type) ? ", " + bar.size() + " with the bar" : "",
					tinyFrames > 0 ? ", " + tinyFrames + " tiny frames" : "",
					brokenPictures > 0 ? ", " + brokenPictures + " broken pictures" : "");
		}
	}

	private static class Recording {
		final Path file;
		String formatName;
		String docType;
		Double duration; // null while recording: written when the file is finalized
		List<FileTrack> streams = new ArrayList<>();
		String decodeErrors;

		private Recording(Path file) {
			this.file = file;
		}

		static Recording analyze(Path file) throws Exception {
			Recording r = new Recording(file);
			r.readHeader();
			r.probe();
			for (FileTrack s : r.streams) {
				// ffprobe numbers the streams in the order of the header's track entries
				if (s.index < r.headerSizes.size()) {
					s.headerWidth = r.headerSizes.get(s.index)[0];
					s.headerHeight = r.headerSizes.get(s.index)[1];
				}
			}
			r.readPackets();
			r.decode();
			for (FileTrack s : r.streams) {
				if ("video".equals(s.type)) {
					r.readVideo(s);
				} else if ("audio".equals(s.type)) {
					r.readAudio(s);
				}
			}
			log.info("Recording {}: {} ({}), duration {}\n  {}", file.getFileName(), r.formatName, r.docType,
					r.duration, r.streams.stream().map(FileTrack::toString).collect(Collectors.joining("\n  ")));
			return r;
		}

		private void readHeader() throws IOException {
			// The EBML DocType is in the first bytes of the file, and the track entries in
			// the first kilobytes
			byte[] head;
			try (var in = Files.newInputStream(file)) {
				head = in.readNBytes(1 << 20);
			}
			String text = new String(head, 0, Math.min(64, head.length), StandardCharsets.ISO_8859_1);
			docType = text.contains("webm") ? "webm" : text.contains("matroska") ? "matroska" : "unknown";
			headerSizes = trackEntrySizes(head);
		}

		// [width, height] each track entry of the header gives its track (0 x 0 for
		// audio), in track order
		List<int[]> headerSizes = new ArrayList<>();

		private static List<int[]> trackEntrySizes(byte[] b) {
			List<int[]> sizes = new ArrayList<>();
			for (long[] top : ebmlChildren(b, 0, b.length)) {
				if (top[0] != 0x18538067L) { // Segment
					continue;
				}
				for (long[] element : ebmlChildren(b, (int) top[1], (int) top[2])) {
					if (element[0] != 0x1654AE6BL) { // Tracks
						continue;
					}
					for (long[] entry : ebmlChildren(b, (int) element[1], (int) element[2])) {
						if (entry[0] != 0xAEL) { // TrackEntry
							continue;
						}
						int[] size = { 0, 0 };
						for (long[] field : ebmlChildren(b, (int) entry[1], (int) entry[2])) {
							if (field[0] == 0xE0L) { // Video
								for (long[] v : ebmlChildren(b, (int) field[1], (int) field[2])) {
									if (v[0] == 0xB0L) { // PixelWidth
										size[0] = (int) ebmlUint(b, v);
									} else if (v[0] == 0xBAL) { // PixelHeight
										size[1] = (int) ebmlUint(b, v);
									}
								}
							}
						}
						sizes.add(size);
					}
					return sizes;
				}
			}
			return sizes;
		}

		/**
		 * The EBML elements in b[from, to), as [id, data start, data end]. An element
		 * of unknown size (the Segment of a file being recorded), or one that goes
		 * past to, ends at to. One whose header does not fit before to is left out.
		 */
		private static List<long[]> ebmlChildren(byte[] b, int from, int to) {
			List<long[]> elements = new ArrayList<>();
			int pos = from;
			while (pos + 2 <= to) {
				long[] id = ebmlVint(b, pos, true);
				if (pos + id[1] >= to) {
					break;
				}
				long[] size = ebmlVint(b, pos + (int) id[1], false);
				long data = pos + id[1] + size[1];
				if (data > to) {
					break;
				}
				boolean unknown = size[0] == (1L << (7 * size[1])) - 1;
				long end = unknown || data + size[0] > to ? to : data + size[0];
				elements.add(new long[] { id[0], data, end });
				pos = (int) end;
			}
			return elements;
		}

		/** An EBML variable size integer at pos, as [value, length in bytes]. */
		private static long[] ebmlVint(byte[] b, int pos, boolean keepMarker) {
			int first = b[pos] & 0xff;
			int length = 1;
			for (int mask = 0x80; length < 8 && (first & mask) == 0; mask >>= 1) {
				length++;
			}
			long value = keepMarker ? first : first & ((0x100 >> length) - 1);
			for (int i = 1; i < length && pos + i < b.length; i++) {
				value = (value << 8) | (b[pos + i] & 0xff);
			}
			return new long[] { value, length };
		}

		private static long ebmlUint(byte[] b, long[] element) {
			long value = 0;
			for (long i = element[1]; i < element[2]; i++) {
				value = (value << 8) | (b[(int) i] & 0xff);
			}
			return value;
		}

		private void probe() throws Exception {
			Exec probe = Exec.run(60, "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json",
					file.toString());
			Assertions.assertEquals(0, probe.exitCode, "ffprobe failed on " + file + ": " + probe.stderr);
			JsonObject json = JsonParser.parseString(probe.stdout).getAsJsonObject();
			JsonObject format = json.getAsJsonObject("format");
			formatName = format.get("format_name").getAsString();
			duration = format.has("duration") ? format.get("duration").getAsDouble() : null;
			for (JsonElement e : json.getAsJsonArray("streams")) {
				JsonObject o = e.getAsJsonObject();
				FileTrack s = new FileTrack();
				s.index = o.get("index").getAsInt();
				s.type = o.get("codec_type").getAsString();
				s.codec = o.has("codec_name") ? o.get("codec_name").getAsString() : "unknown";
				s.isDefault = o.getAsJsonObject("disposition").get("default").getAsInt() == 1;
				streams.add(s);
			}
		}

		private void readPackets() throws Exception {
			Exec packets = Exec.run(120, "ffprobe", "-v", "error", "-show_entries", "packet=stream_index,pts_time",
					"-of", "csv=p=0", file.toString());
			Assertions.assertEquals(0, packets.exitCode, "ffprobe could not read the packets: " + packets.stderr);
			for (String line : packets.stdout.split("\n")) {
				String[] fields = line.trim().split(",");
				if (fields.length < 2 || fields[1].isEmpty() || "N/A".equals(fields[1])) {
					continue;
				}
				stream(Integer.parseInt(fields[0])).packets.add(Double.parseDouble(fields[1]));
			}
			for (FileTrack s : streams) {
				Collections.sort(s.packets);
			}
		}

		private void decode() throws Exception {
			// passthrough timestamps in the demuxer's time base: frames 33 +/- 1 ms apart
			// must not collide in a 1/30 s encoder time base
			Exec decode = Exec.run(300, "ffmpeg", "-nostdin", "-v", "error", "-i", file.toString(), "-map", "0",
					"-fps_mode", "passthrough", "-enc_time_base", "demux", "-f", "null", "-");
			decodeErrors = decode.exitCode == 0 ? decode.stderr.trim()
					: "exit " + decode.exitCode + ": " + decode.stderr;
		}

		private static final Pattern SHOWINFO_PTS = Pattern.compile("Parsed_showinfo.*?pts_time:\\s*(-?[0-9.]+)");
		private static final Pattern SILENCE = Pattern.compile("silence_(start|end): (-?[0-9.]+)");

		private void readVideo(FileTrack s) throws Exception {
			// One luma row across the middle of every frame, BAR_ROW_WIDTH wide whatever
			// the frame size: all white during a flash, and crossing the bar otherwise
			Path rows = Files.createTempFile("rows", ".gray");
			List<Double> times = new ArrayList<>();
			byte[] data;
			try {
				// ffmpeg's own VP9 decoder shows garbage around the spatial layer switches of
				// SVC streams: libvpx decodes them as browsers do
				List<String> command = new ArrayList<>(List.of("ffmpeg", "-nostdin", "-y", "-copyts"));
				if ("vp9".equals(s.codec)) {
					command.addAll(List.of("-c:v", "libvpx-vp9"));
				}
				command.addAll(List.of("-i", file.toString(), "-map", "0:" + s.index, "-fps_mode", "passthrough", "-vf",
						"crop=iw:2:0:trunc(ih/4)*2,scale=" + BAR_ROW_WIDTH + ":1:flags=area,format=gray,showinfo",
						"-f", "rawvideo", rows.toString()));
				Exec frames = Exec.run(300, command.toArray(new String[0]));
				Assertions.assertEquals(0, frames.exitCode, "ffmpeg could not read the video: " + frames.stderr);
				Matcher pts = SHOWINFO_PTS.matcher(frames.stderr);
				while (pts.find()) {
					times.add(Double.parseDouble(pts.group(1)));
				}
				data = Files.readAllBytes(rows);
			} finally {
				Files.deleteIfExists(rows);
			}
			Double previousTime = null;
			double previousLuma = 0;
			int[] row = new int[BAR_ROW_WIDTH];
			// [time, runs] of every frame that is not a flash: the stretches of the row
			// as bright as the bar, null if nothing stands out
			List<Object[]> barRuns = new ArrayList<>();
			for (int i = 0; i < Math.min(times.size(), data.length / BAR_ROW_WIDTH); i++) {
				double time = times.get(i);
				long sum = 0;
				for (int x = 0; x < BAR_ROW_WIDTH; x++) {
					row[x] = data[i * BAR_ROW_WIDTH + x] & 0xff;
					sum += row[x];
				}
				double luma = (double) sum / BAR_ROW_WIDTH;
				// the first frame of the track, or after a hole, may be in the middle of a
				// flash: not an onset
				boolean continuous = previousTime != null && time - previousTime < 0.2;
				if (continuous && luma > 180 && previousLuma <= 180) {
					s.markers.add(time);
				}
				if (luma <= 180) {
					Double edge = barEdge(row);
					if (edge != null) {
						s.bar.add(new double[] { time, edge / BAR_ROW_WIDTH * BAR_PERIOD_MS });
					}
					barRuns.add(new Object[] { time, brightRuns(row) });
				}
				previousLuma = luma;
				previousTime = time;
			}
			s.bar.sort((a, b) -> Double.compare(a[0], b[0]));
			countBrokenPictures(s, barRuns);
			Exec sizes = Exec.run(300, "ffprobe", "-v", "error", "-select_streams", String.valueOf(s.index),
					"-show_entries", "frame=pts_time,width,height", "-of", "csv=p=0", file.toString());
			Assertions.assertEquals(0, sizes.exitCode, "ffprobe could not read the frame sizes: " + sizes.stderr);
			for (String line : sizes.stdout.split("\n")) {
				String[] fields = line.trim().split(",");
				if (fields.length != 3 || fields[1].isEmpty() || fields[2].isEmpty()) {
					continue;
				}
				int w = Integer.parseInt(fields[1]);
				int h = Integer.parseInt(fields[2]);
				if (!fields[0].isEmpty() && !"N/A".equals(fields[0])) {
					s.frameSizes.add(new double[] { Double.parseDouble(fields[0]), w, h });
				}
				if (w < MIN_VIDEO_SIDE || h < MIN_VIDEO_SIDE) {
					s.tinyFrames++;
				}
				if (w * h > s.maxWidth * s.maxHeight) {
					s.maxWidth = w;
					s.maxHeight = h;
				}
				if (w * h < s.minWidth * (long) s.minHeight) {
					s.minWidth = w;
					s.minHeight = h;
				}
			}
		}

		/**
		 * The left edge of the bar in a luma row, in pixels with a fraction, or null if
		 * the row does not cross it: the first of three pixels brighter than halfway
		 * between the background (the median) and the brightest pixel.
		 */
		private static Double barEdge(int[] row) {
			int[] sorted = row.clone();
			Arrays.sort(sorted);
			int background = sorted[sorted.length / 2];
			int brightest = sorted[sorted.length - 1];
			if (brightest - background < 30) {
				return null;
			}
			double threshold = (background + brightest) / 2.0;
			for (int x = 0; x + 2 < row.length; x++) {
				if (row[x] >= threshold && row[x + 1] >= threshold && row[x + 2] >= threshold) {
					if (x == 0) {
						return 0.0;
					}
					double before = row[x - 1];
					double at = row[x];
					return x - 1 + (at > before ? (threshold - before) / (at - before) : 1);
				}
			}
			return null;
		}

		/**
		 * The stretches of a luma row, of 3 pixels or more, brighter than halfway
		 * between the background (the median) and the brightest pixel, as [start,
		 * width]; null if nothing stands out of the background.
		 */
		private static List<int[]> brightRuns(int[] row) {
			int[] sorted = row.clone();
			Arrays.sort(sorted);
			int background = sorted[sorted.length / 2];
			int brightest = sorted[sorted.length - 1];
			if (brightest - background < 40) {
				return null;
			}
			double threshold = (background + brightest) / 2.0;
			List<int[]> runs = new ArrayList<>();
			int start = -1;
			for (int x = 0; x <= row.length; x++) {
				boolean bright = x < row.length && row[x] >= threshold;
				if (bright && start < 0) {
					start = x;
				} else if (!bright && start >= 0) {
					if (x - start >= 3) {
						runs.add(new int[] { start, x - start });
					}
					start = -1;
				}
			}
			return runs;
		}

		/**
		 * Counts the frames whose picture is not intact. The row of an intact frame
		 * crosses one bar, as wide as in every other frame of the track, unless the
		 * edge of the canvas cuts it. A frame decoded from a reference that was lost
		 * does not show what was captured: decoders report no error, but the bar is
		 * smeared, doubled, or where an older frame had it.
		 */
		private static void countBrokenPictures(FileTrack s, List<Object[]> barRuns) {
			List<Integer> widths = new ArrayList<>();
			for (Object[] f : barRuns) {
				@SuppressWarnings("unchecked")
				List<int[]> runs = (List<int[]>) f[1];
				if (runs != null && runs.size() == 1 && runs.get(0)[0] > 0
						&& runs.get(0)[0] + runs.get(0)[1] < BAR_ROW_WIDTH - 1) {
					widths.add(runs.get(0)[1]);
				}
			}
			if (widths.isEmpty()) {
				return;
			}
			Collections.sort(widths);
			int median = widths.get(widths.size() / 2);
			int tolerance = Math.max(8, median / 6);
			for (Object[] f : barRuns) {
				@SuppressWarnings("unchecked")
				List<int[]> runs = (List<int[]>) f[1];
				boolean intact;
				if (runs == null) {
					intact = false;
				} else if (runs.isEmpty()) {
					// the bar leaving the canvas, a sliver of less than 3 pixels
					intact = true;
				} else if (runs.size() > 1) {
					intact = false;
				} else {
					int[] r = runs.get(0);
					boolean cut = r[0] == 0 || r[0] + r[1] >= BAR_ROW_WIDTH - 1;
					intact = Math.abs(r[1] - median) <= tolerance || (cut && r[1] <= median + tolerance);
				}
				if (!intact) {
					s.brokenPictures++;
					if (s.brokenAt.size() < 10) {
						s.brokenAt.add(String.format(Locale.ROOT, "%.3f %s", (double) f[0], runs == null ? "no bar"
								: runs.stream().map(r -> r[0] + "+" + r[1]).collect(Collectors.joining(" "))));
					}
				}
			}
		}

		private void readAudio(FileTrack s) throws Exception {
			Exec beeps = Exec.run(300, "ffmpeg", "-nostdin", "-copyts", "-i", file.toString(), "-map", "0:" + s.index,
					"-af", "silencedetect=n=-30dB:d=0.3", "-f", "null", "-");
			Assertions.assertEquals(0, beeps.exitCode, "ffmpeg could not read the audio: " + beeps.stderr);
			// A beep is sound between a silence_end and the next silence_start. One cut
			// short (the track resumed, after silence, in the middle of a beep) does not
			// start at the beep's onset. A silence_end without a silence_start after it
			// is the end of the file (silencedetect ends the trailing silence there)
			Matcher m = SILENCE.matcher(beeps.stderr);
			Double soundFrom = null;
			while (m.find()) {
				double t = Double.parseDouble(m.group(2));
				if ("end".equals(m.group(1))) {
					soundFrom = t;
				} else if (soundFrom != null) {
					if (t - soundFrom >= 0.07) {
						s.markers.add(soundFrom);
					}
					soundFrom = null;
				}
			}
		}

		FileTrack stream(int index) {
			return streams.stream().filter(s -> s.index == index).findFirst()
					.orElseThrow(() -> new IllegalStateException("No stream " + index));
		}

		List<FileTrack> ofType(String type) {
			return streams.stream().filter(s -> type.equals(s.type)).collect(Collectors.toList());
		}

		FileTrack audio(int n) {
			return ofType("audio").get(n);
		}

		FileTrack video(int n) {
			return ofType("video").get(n);
		}

		FileTrack videoWithCodec(String codec) {
			return ofType("video").stream().filter(s -> codec.equals(s.codec)).findFirst()
					.orElseThrow(() -> new AssertionError("No " + codec + " video track: " + streams));
		}

		private static List<Double> markersOf(List<FileTrack> tracks) {
			List<Double> markers = new ArrayList<>();
			tracks.forEach(s -> markers.addAll(s.markers));
			Collections.sort(markers);
			return markers;
		}

		private static Double nearest(List<Double> candidates, double to) {
			Double nearest = null;
			for (double c : candidates) {
				if (nearest == null || Math.abs(c - to) < Math.abs(nearest - to)) {
					nearest = c;
				}
			}
			return nearest == null || Math.abs(nearest - to) > MARKER_PAIR_WINDOW ? null : nearest;
		}

		/**
		 * Whether t is inside one of the tracks, far enough from its ends for a marker
		 * to be detected there: before a track starts (the start gate holds an
		 * Opus/DTX track for a second or two) there is nothing to pair with, and a
		 * beep is only found with 0.3 s of silence on both sides.
		 */
		private static boolean within(List<FileTrack> tracks, double t) {
			return tracks.stream().anyMatch(s -> !s.packets.isEmpty() && t >= s.firstPacketTime() + 0.5
					&& t <= s.lastPacketTime() - 0.5);
		}

		/** Flashes without a beep while there is audio, as when the audio is muted. */
		List<Double> unpairedFlashes() {
			List<FileTrack> audio = ofType("audio");
			List<Double> beeps = markersOf(audio);
			return markersOf(ofType("video")).stream().filter(f -> within(audio, f) && nearest(beeps, f) == null)
					.collect(Collectors.toList());
		}

		/** Beeps without a flash while there is video, as when the video is muted. */
		List<Double> unpairedBeeps() {
			List<FileTrack> video = ofType("video");
			List<Double> flashes = markersOf(video);
			return markersOf(ofType("audio")).stream().filter(b -> within(video, b) && nearest(flashes, b) == null)
					.collect(Collectors.toList());
		}

		// ----- assertions -----

		void assertDocType(String expected) {
			Assertions.assertEquals(expected, docType, "EBML DocType of " + file.getFileName());
		}

		/**
		 * The tracks of the file as "type:codec", in any order: tracks are numbered
		 * as their first frame arrives.
		 */
		void assertTracks(String... expected) {
			List<String> actual = streams.stream().map(s -> s.type + ":" + s.codec).sorted()
					.collect(Collectors.toList());
			List<String> wanted = Arrays.stream(expected).sorted().collect(Collectors.toList());
			Assertions.assertEquals(wanted, actual, "Tracks of " + file.getFileName());
		}

		void assertFinalized() {
			Assertions.assertNotNull(duration, "A finalized recording has a duration");
			// whatever size its first frames had (a simulcast track often starts on its
			// low layer), the header of a finalized file gives every video track its
			// largest picture: the size tools that read the header report
			for (FileTrack s : ofType("video")) {
				Assertions.assertTrue(s.headerWidth == s.maxWidth && s.headerHeight == s.maxHeight,
						"The header of " + file.getFileName() + " must give video track " + s.index
								+ " its largest picture, " + s.maxWidth + "x" + s.maxHeight + ": it gives "
								+ s.headerWidth + "x" + s.headerHeight);
			}
		}

		void assertInProgress() {
			Assertions.assertNull(duration, "A file still being recorded has no duration yet");
			Assertions.assertTrue(streams.stream().allMatch(s -> !s.packets.isEmpty()),
					"Every track of the file being recorded must have packets: " + streams);
		}

		/**
		 * What every recording must be, whatever happened to its tracks: it decodes
		 * without errors, every video frame shows the picture that was captured, its
		 * audio is continuous, it has no SFU blank frames, and its timestamps are the
		 * original ones.
		 */
		void assertHealthy() {
			assertDecodesWithoutErrors();
			assertPicturesIntact();
			assertAudioContinuous();
			assertNoTinyVideoFrames();
			streams.forEach(FileTrack::assertOriginalTimestamps);
		}

		/**
		 * Every video frame shows the bar as it was drawn. Decoders report no error for
		 * a frame that refers to one that was lost, they decode it from a wrong
		 * reference into a corrupted picture: the egress must not write such frames.
		 */
		void assertPicturesIntact() {
			for (FileTrack s : ofType("video")) {
				Assertions.assertEquals(0, s.brokenPictures, "Video track " + s.index + " of " + file.getFileName()
						+ " has frames with a corrupted picture (time, bright stretches of the row): " + s.brokenAt);
			}
		}

		void assertDecodesWithoutErrors() {
			Assertions.assertEquals("", decodeErrors, "Decoding " + file.getFileName() + " reported errors");
		}

		void assertAudioContinuous() {
			for (FileTrack s : ofType("audio")) {
				List<double[]> gaps = s.gaps(MAX_AUDIO_GAP_MS / 1000);
				Assertions.assertTrue(gaps.isEmpty(),
						"Audio track " + s.index + " has holes: " + FileTrack.format(gaps));
			}
		}

		void assertNoTinyVideoFrames() {
			for (FileTrack s : ofType("video")) {
				Assertions.assertEquals(0, s.tinyFrames, "Video track " + s.index + " has frames smaller than "
						+ MIN_VIDEO_SIDE + "px (the SFU's blank frames)");
			}
		}

		/**
		 * Audio and video published together start together in the file, up to a few
		 * seconds apart either way as in assertStartsAfter: the start gate holds an
		 * Opus/DTX track for a second or two, and the first keyframe takes a moment. A
		 * video starting later is video lost; the egress logs "remux video track
		 * records nothing" when its publication was not muted meanwhile.
		 */
		void assertStartTogether() {
			double start = video(0).firstPacketTime() - audio(0).firstPacketTime();
			Assertions.assertTrue(start > -2.5 && start < 3.5, String.format(Locale.ROOT,
					"Audio and video, published together, must start together in %s: the video starts %.3f s after"
							+ " the audio. Look for \"remux video track\" in the egress log",
					file.getFileName(), start));
		}

		void assertUnpairedFlashes(int min, int max) {
			List<Double> unpaired = unpairedFlashes();
			Assertions.assertTrue(unpaired.size() >= min && unpaired.size() <= max, "Between " + min + " and " + max
					+ " flashes without a beep expected in " + file.getFileName() + ": " + unpaired);
		}

		void assertUnpairedBeeps(int min, int max) {
			List<Double> unpaired = unpairedBeeps();
			Assertions.assertTrue(unpaired.size() >= min && unpaired.size() <= max, "Between " + min + " and " + max
					+ " beeps without a flash expected in " + file.getFileName() + ": " + unpaired);
		}

		/**
		 * Every beep that sounds while the video shows the bar is within
		 * AV_SYNC_TOLERANCE_MS of a whole second of what the video shows, and there are
		 * at least minPairs such beeps. Returns the pairs as [beep time, offset in ms].
		 */
		List<double[]> assertAvSync(int minPairs) {
			List<double[]> pairs = avPairs();
			double worst = pairs.stream().mapToDouble(p -> Math.abs(p[1])).max().orElse(0);
			String report = offsets(pairs);
			log.info("A/V offsets (audio - video, ms) of {}: {}", file.getFileName(), report);
			Assertions.assertTrue(pairs.size() >= minPairs, "Only " + pairs.size() + " A/V pairs found in "
					+ file.getFileName() + " (at least " + minPairs + " expected): " + report);
			Assertions.assertTrue(worst <= AV_SYNC_TOLERANCE_MS, "Audio and video out of sync in " + file.getFileName()
					+ ", worst offset " + worst + " ms (tolerance " + AV_SYNC_TOLERANCE_MS + " ms): " + report);
			return pairs;
		}

		/**
		 * The recording is back, in after, to what it was in before, with a
		 * disturbance in between: in after, the video without holes until the end,
		 * the timestamps of each track consistent (assertOriginalTimestamps), every
		 * A/V offset within AV_SYNC_TOLERANCE_MS, and their median within
		 * HEALED_AV_TOLERANCE_MS of the range the offsets spanned in before. Before is
		 * only the reference for the A/V offset: neither the offsets nor the
		 * timestamps are compared across the two, since the sync engine moves the
		 * tracks of a recording by itself (see NETWORK_TROUBLE_AT_S). A null before
		 * (no time without trouble) skips that comparison.
		 */
		void assertRecovered(double[] before, double[] after) {
			List<double[]> pairs = avPairs();
			List<double[]> pairsBefore = before == null ? List.of() : pairsInside(pairs, before);
			List<double[]> pairsAfter = pairsInside(pairs, after);
			log.info("A/V offsets (audio - video, ms) of {} before the disturbance: {}; during it and its recovery: {};"
					+ " after: {}", file.getFileName(), offsets(pairsBefore),
					offsets(pairsInside(pairs, new double[] { before == null ? 0 : before[1], after[0] })),
					offsets(pairsAfter));

			for (FileTrack track : streams) {
				track.assertOriginalTimestamps(List.of(after));
			}
			for (FileTrack video : ofType("video")) {
				List<double[]> holes = video.gaps(1).stream().filter(g -> g[1] > after[0]).collect(Collectors.toList());
				Assertions.assertTrue(holes.isEmpty() && video.lastPacketTime() > duration - 2, String.format(Locale.ROOT,
						"Video track %d of %s must go on without holes from %.1f s to the end (%.1f s): it has %s, and its"
								+ " last frame is at %.3f s",
						video.index, file.getFileName(), after[0], duration, FileTrack.format(holes),
						video.lastPacketTime()));
			}

			Assertions.assertTrue(before == null || pairsBefore.size() >= 5, "At least 5 A/V pairs expected in "
					+ file.getFileName() + " before the disturbance: " + offsets(pairsBefore));
			Assertions.assertTrue(pairsAfter.size() >= 5, "At least 5 A/V pairs expected in " + file.getFileName()
					+ " after the disturbance: " + offsets(pairsAfter));
			double worstAfter = pairsAfter.stream().mapToDouble(p -> Math.abs(p[1])).max().getAsDouble();
			Assertions.assertTrue(worstAfter <= AV_SYNC_TOLERANCE_MS, String.format(Locale.ROOT,
					"Audio and video out of sync in %s after the disturbance, worst offset %.0f ms (tolerance %.0f ms): %s",
					file.getFileName(), worstAfter, AV_SYNC_TOLERANCE_MS, offsets(pairsAfter)));
			if (before == null) {
				return;
			}
			DoubleSummaryStatistics range = pairsBefore.stream().mapToDouble(p -> p[1]).summaryStatistics();
			List<Double> healed = pairsAfter.stream().map(p -> p[1]).sorted().collect(Collectors.toList());
			double median = healed.get(healed.size() / 2);
			double off = Math.max(range.getMin() - median, median - range.getMax());
			Assertions.assertTrue(off <= HEALED_AV_TOLERANCE_MS, String.format(Locale.ROOT,
					"The A/V offset of %s must get back to the %+.0f..%+.0f ms it had before the disturbance (within"
							+ " %.0f ms): it is %+.0f ms (median) after the disturbance: %s",
					file.getFileName(), range.getMin(), range.getMax(), HEALED_AV_TOLERANCE_MS, median,
					offsets(pairsAfter)));
		}

		/**
		 * The beeps of every audio track that sound while a video track shows the bar,
		 * as [beep time, offset in ms]: how far from a whole second the page time that
		 * the video shows then is, positive when the audio is late. Nothing pairs a
		 * beep while the video is muted or not published, or a flash while the audio
		 * is.
		 */
		List<double[]> avPairs() {
			List<double[]> pairs = new ArrayList<>();
			for (double beep : markersOf(ofType("audio"))) {
				for (FileTrack video : ofType("video")) {
					Double page = video.pageTimeAt(beep);
					if (page != null) {
						pairs.add(new double[] { beep, page - Math.rint(page / 1000) * 1000 });
						break;
					}
				}
			}
			return pairs;
		}
	}
}
