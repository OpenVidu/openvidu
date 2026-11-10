package io.openvidu.test.e2e;

import java.time.Duration;
import java.util.function.Predicate;

import org.junit.jupiter.api.Assertions;
import org.openqa.selenium.WebElement;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;
import io.openvidu.test.browsers.AndroidAppUser;

/**
 * The Android app of src/test/resources/android-app, driven through Appium: it
 * types the LiveKit URL and token into the app, taps its buttons and reads the
 * JSON status the app shows (see the app's MainActivity#showStatus):
 *
 * <pre>
 * {"state":"CONNECTED", "identity":"...", "error":null, "connectionQuality":"EXCELLENT", "speaking":true,
 *  "activeSpeakers":["..."], "events":{"Connected":1, ...}, "data":[{"from":"...", "topic":"...", "text":"..."}],
 *  "roomMetadata":"...", "localParticipant":{"name":"...", "metadata":"...", "attributes":{...}, "state":"ACTIVE",
 *                                            "canPublish":true, "events":{"LocalTrackPublished":2, ...}},
 *  "remoteEvents":{"<identity>":{"TrackSubscribed":2, ...}, ...},
 *  "local":[{"sid":"TR_...", "kind":"video", "source":"CAMERA", "muted":false, "frames":300, "width":720,
 *            "height":1280, "layers":[{"rid":"f", "active":true, "codec":"video/VP8", ...}, ...]},
 *           {"sid":"TR_...", "kind":"audio", "source":"MICROPHONE", "muted":false, "samples":96000, "level":5792}],
 *  "remote":[{"identity":"...", "connectionQuality":"EXCELLENT", "speaking":false, "name":"...", "metadata":"...",
 *    "attributes":{...}, "state":"ACTIVE", "tracks":[
 *    {"sid":"TR_...", "kind":"video", ..., "subscribed":true, "streamState":"ACTIVE", "frames":120,
 *     "width":640, "height":360, "codec":"video/VP8", "decoder":"libvpx",
 *     "inbound":{"ssrc":..., "packetsReceived":..., "framesDecoded":..., "frameWidth":..., ...},
 *     "events":{"VisibilityChanged":1, ...}, "visible":true, "viewSize":"420x236"},
 *    {"sid":"TR_...", "kind":"audio", ..., "subscribed":true, "samples":96000, "level":3000}]}]}
 * </pre>
 *
 * "frames" and "samples" count what each local track captured and what the app
 * decoded from each remote track, "level" is the RMS of the 16-bit audio samples
 * of the last complete window of about 2 s, and "layers" and "inbound" come from
 * the WebRTC stats of the app's publisher and subscriber (see
 * {@link #localVideoLayers} and {@link #remoteVideoInbound}). Each "events"
 * counts by name the events the app received: Room events at the top, the
 * participant events of the local participant, and the track events of each
 * remote video, whose last ones give "visible" and "viewSize" (the size of its
 * views). "remoteEvents" counts the participant events of each remote
 * participant, by identity, also after it left.
 */
public class OpenViduAndroidAppUser {

	private static final long POLL_INTERVAL_MILLIS = 500;

	private final AndroidAppUser appUser;

	public OpenViduAndroidAppUser(AndroidAppUser appUser) {
		this.appUser = appUser;
	}

	public AndroidDriver getDriver() {
		return this.appUser.getAndroidDriver();
	}

	/**
	 * Sets the publishing options, types the LiveKit URL and the access token and
	 * taps "Connect". The app then publishes its camera with the given video codec
	 * ("vp8", "h264", "vp9" or "av1"; VP9 and AV1 with SVC, L3T3_KEY; null for the
	 * SDK's default, VP8) and its microphone.
	 */
	public void connect(String livekitUrl, String token, String videoCodec, boolean simulcast) {
		this.type("codec", videoCodec);
		this.setSwitch("simulcast", simulcast);
		this.type("url", livekitUrl);
		this.type("token", token);
		this.tap("connect");
	}

	/** Taps "Disconnect" */
	public void disconnect() {
		this.tap("disconnect");
	}

	/**
	 * Turns a switch of the app on or off, and checks that it is. The switches:
	 * "simulcast" and "test_tone" (the tone the app mixes into its microphone audio,
	 * as the fake microphone of a browser produces one) apply when connecting;
	 * "camera" and "microphone" mute and unmute the published tracks; and
	 * "large_videos" (320x180 dp instead of 160x90 dp) and "show_videos" resize and
	 * hide the remote videos, which adaptive stream follows.
	 */
	public void setSwitch(String id, boolean on) {
		WebElement view = this.view(id);
		if (Boolean.parseBoolean(view.getAttribute("checked")) != on) {
			view.click();
		}
		Assertions.assertEquals(String.valueOf(on), this.view(id).getAttribute("checked"),
				"Could not turn " + (on ? "on" : "off") + " switch " + id + " of the Android app");
	}

	/** Taps a button of the app: "connect", "disconnect" or "send_data" */
	public void tap(String id) {
		this.view(id).click();
	}

	public JsonObject getStatus() {
		return JsonParser.parseString(this.view("status").getText()).getAsJsonObject();
	}

	/**
	 * Waits until the app's status fulfils the condition and returns it. Fails
	 * after the timeout, quoting the last status.
	 */
	public JsonObject waitUntilStatus(String description, Predicate<JsonObject> condition, Duration timeout)
			throws InterruptedException {
		final long deadline = System.currentTimeMillis() + timeout.toMillis();
		String lastStatus = "none";
		RuntimeException lastError = null;
		while (true) {
			try {
				JsonObject status = this.getStatus();
				lastStatus = status.toString();
				lastError = null;
				if (condition.test(status)) {
					return status;
				}
			} catch (RuntimeException e) {
				// Not yet: the status is not JSON until the app writes its first one, half a
				// second after starting, and the condition may look for what it lacks yet
				lastError = e;
			}
			if (System.currentTimeMillis() > deadline) {
				Assertions.fail("Android app: timeout after " + timeout.toSeconds() + " s waiting for " + description
						+ ". Last status: " + lastStatus + (lastError == null ? "" : ". Last error: " + lastError),
						lastError);
			}
			Thread.sleep(POLL_INTERVAL_MILLIS);
		}
	}

	public static String state(JsonObject status) {
		return status.get("state").getAsString();
	}

	/** The local track of the given kind ("audio" or "video"), or null */
	public static JsonObject localTrack(JsonObject status, String kind) {
		for (JsonElement track : status.getAsJsonArray("local")) {
			if (kind.equals(track.getAsJsonObject().get("kind").getAsString())) {
				return track.getAsJsonObject();
			}
		}
		return null;
	}

	/**
	 * The outbound video layers of the local camera track, as the app's WebRTC
	 * stats give them: one per simulcast layer ("rid" q, h and f), or one with SVC.
	 * Each with "active", "codec", "scalabilityMode", "encoder", "width", "height",
	 * "framesEncoded", "fps" and "limitation".
	 */
	public static JsonArray localVideoLayers(JsonObject status) {
		JsonObject video = localTrack(status, "video");
		return (video == null || !video.has("layers")) ? new JsonArray() : video.getAsJsonArray("layers");
	}

	/**
	 * The remote participant, with its "identity", "connectionQuality", "speaking"
	 * and "tracks", or null
	 */
	public static JsonObject remoteParticipant(JsonObject status, String identity) {
		for (JsonElement participant : status.getAsJsonArray("remote")) {
			JsonObject p = participant.getAsJsonObject();
			if (!p.get("identity").isJsonNull() && identity.equals(p.get("identity").getAsString())) {
				return p;
			}
		}
		return null;
	}

	/** The local participant, with its "name", "metadata", "attributes", "state", "canPublish" and "events" */
	public static JsonObject localParticipant(JsonObject status) {
		return status.getAsJsonObject("localParticipant");
	}

	/**
	 * The track of the given source ("CAMERA", "MICROPHONE", "SCREEN_SHARE"...) of
	 * the remote participant, or null
	 */
	public static JsonObject remoteTrackOfSource(JsonObject status, String identity, String source) {
		JsonObject participant = remoteParticipant(status, identity);
		if (participant != null) {
			for (JsonElement track : participant.getAsJsonArray("tracks")) {
				if (source.equals(track.getAsJsonObject().get("source").getAsString())) {
					return track.getAsJsonObject();
				}
			}
		}
		return null;
	}

	/** The track of the given kind ("audio" or "video") of the remote participant, or null */
	public static JsonObject remoteTrack(JsonObject status, String identity, String kind) {
		JsonObject participant = remoteParticipant(status, identity);
		if (participant != null) {
			for (JsonElement track : participant.getAsJsonArray("tracks")) {
				if (kind.equals(track.getAsJsonObject().get("kind").getAsString())) {
					return track.getAsJsonObject();
				}
			}
		}
		return null;
	}

	/**
	 * A numeric field ("frames", "samples", "level", "width"...) of the local track
	 * of the given kind, or -1 if there is no such track or it has captured nothing
	 * yet
	 */
	public static long localTrackCounter(JsonObject status, String kind, String field) {
		JsonObject track = localTrack(status, kind);
		return (track == null || !track.has(field)) ? -1 : track.get(field).getAsLong();
	}

	/**
	 * A numeric field ("framesDecoded", "frameWidth", "frameHeight",
	 * "packetsReceived"...) of the inbound-rtp WebRTC stats of the video of the
	 * remote participant, or -1 if there are none yet. WebRTC restarts them
	 * whenever it recreates the receive stream, as adaptive stream does every time
	 * it stops and resumes receiving the video.
	 */
	public static long remoteVideoInbound(JsonObject status, String identity, String field) {
		JsonObject track = remoteTrack(status, identity, "video");
		if (track == null || !track.has("inbound")) {
			return -1;
		}
		JsonElement value = track.getAsJsonObject("inbound").get(field);
		return (value == null || value.isJsonNull()) ? -1 : value.getAsLong();
	}

	/**
	 * A numeric field ("frames", "samples", "level", "width"...) of the track of the
	 * given kind of the remote participant, or -1 if there is no such track or the
	 * app has not decoded anything from it yet
	 */
	public static long remoteTrackCounter(JsonObject status, String identity, String kind, String field) {
		JsonObject track = remoteTrack(status, identity, kind);
		return (track == null || !track.has(field)) ? -1 : track.get(field).getAsLong();
	}

	private WebElement view(String id) {
		return this.getDriver().findElement(AppiumBy.id(OpenViduTestE2e.ANDROID_APP_PACKAGE + ":id/" + id));
	}

	private void type(String id, String text) {
		WebElement input = this.view(id);
		input.clear();
		if (text != null && !text.isEmpty()) {
			input.sendKeys(text);
		}
	}

}
