package io.openvidu.test.browsers;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;

public class AndroidAppUser extends BrowserUser {

	public AndroidAppUser(String userName, int timeOfWaitInSeconds, String appPath, boolean setAutoWebview) {
		super(userName, timeOfWaitInSeconds);

		String REMOTE_URL = System.getProperty("REMOTE_URL_ANDROID");
		if (REMOTE_URL == null) {
			REMOTE_URL = "http://172.17.0.1:4723/";
		}

		UiAutomator2Options options = new UiAutomator2Options();
		options.setApp(appPath);
		options.setAutoGrantPermissions(true);
		if (setAutoWebview) {
			options.setAutoWebview(true);
			options.setCapability("appium:chromeOptions", java.util.Map.of(
					"args", java.util.List.of(
							// Fake media stream for testing without hardware
							"--use-fake-ui-for-media-stream",
							"--use-fake-device-for-media-stream",
							"--disable-popup-blocking",
							// Video rendering in emulator
							"--ignore-gpu-blocklist",
							"--enable-gpu-rasterization",
							"--enable-zero-copy",
							"--disable-gpu-driver-bug-workarounds",
							// WebRTC optimizations
							"--enable-features=WebRTC-H264WithOpenH264FFmpeg",
							"--disable-features=WebRtcHideLocalIpsWithMdns",
							"--force-webrtc-ip-handling-policy=default",
							// General WebView stability
							"--disable-dev-shm-usage",
							"--no-sandbox",
							"--disable-setuid-sandbox",
							// Allow autoplay
							"--autoplay-policy=no-user-gesture-required")));
		}

		URL url = null;
		try {
			url = URI.create(REMOTE_URL).toURL();
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}

		this.driver = new AndroidDriver(url, options);

		this.configureDriver();
	}

}