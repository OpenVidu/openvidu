package io.openvidu.test.e2e;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.containers.wait.strategy.WaitStrategy;
import org.testcontainers.utility.DockerImageName;

import io.livekit.server.RoomServiceClient;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.ChromeUser;
import io.openvidu.test.browsers.EdgeUser;
import io.openvidu.test.browsers.FirefoxUser;
import io.openvidu.test.browsers.utils.BrowserNames;
import io.openvidu.test.browsers.utils.CommandLineExecutor;

public class OpenViduTestE2e {

	private final static WaitStrategy waitBrowser = Wait.forHttp("/wd/hub/status").forStatusCode(200);

	protected static String MEDIA_SERVER_IMAGE = "livekit-server:latest";

	protected static String LIVEKIT_API_KEY = "devkey";
	protected static String LIVEKIT_API_SECRET = "secret";
	protected static String LIVEKIT_URL = "ws://localhost:7880/";
	protected static String APP_URL = "https://localhost:4200/";

	protected static String OPENVIDU_PRO_LICENSE = "not_valid";
	protected static String OPENVIDU_PRO_LICENSE_API = "not_valid";

	// https://hub.docker.com/r/selenium/standalone-chrome/tags
	protected static String CHROME_VERSION = "latest";
	// https://hub.docker.com/r/selenium/standalone-firefox/tags
	protected static String FIREFOX_VERSION = "latest";
	// https://hub.docker.com/r/selenium/standalone-edge/tags
	protected static String EDGE_VERSION = "latest";

	protected static Exception ex = null;
	protected final Object lock = new Object();

	protected static final Logger log = LoggerFactory.getLogger(OpenViduTestE2e.class);
	protected static final CommandLineExecutor commandLine = new CommandLineExecutor();
	protected static final String RECORDING_IMAGE = "openvidu/openvidu-recording";

	protected Collection<BrowserUser> browserUsers = new HashSet<>();
	protected static Collection<GenericContainer<?>> containers = new HashSet<>();

	protected static RoomServiceClient LK;

	private static boolean isMediaServerRestartTest = false;

	protected static void checkFfmpegInstallation() {
		String ffmpegOutput = commandLine.executeCommand("which ffmpeg", 60);
		if (ffmpegOutput == null || ffmpegOutput.isEmpty()) {
			log.error("ffmpeg package is not installed in the host machine");
			Assertions.fail();
			return;
		} else {
			log.info("ffmpeg is installed and accesible");
		}
	}

	private GenericContainer<?> chromeContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		Map<String, String> map = new HashMap<>();
		if (headless) {
			map.put("START_XVFB", "false");
		}
		if (maxBrowserSessions > 1) {
			map.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			map.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		GenericContainer<?> chrome = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(map).withExposedPorts(4444)
				.waitingFor(waitBrowser);
		chrome.setPortBindings(Arrays.asList("6666:4444", "7900:7900"));
		return chrome;
	}

	private GenericContainer<?> firefoxContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		Map<String, String> map = new HashMap<>();
		if (headless) {
			map.put("START_XVFB", "false");
		}
		if (maxBrowserSessions > 1) {
			map.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			map.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		GenericContainer<?> firefox = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(map).withExposedPorts(4444)
				.waitingFor(waitBrowser);
		firefox.setPortBindings(Arrays.asList("6667:4444", "7901:7900"));
		return firefox;
	}

	private GenericContainer<?> edgeContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		Map<String, String> map = new HashMap<>();
		if (headless) {
			map.put("START_XVFB", "false");
		}
		if (maxBrowserSessions > 1) {
			map.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			map.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		GenericContainer<?> edge = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(map).withExposedPorts(4444)
				.waitingFor(waitBrowser);
		edge.setPortBindings(Arrays.asList("6668:4444", "7902:7900"));
		return edge;
	}

	protected static void setUpLiveKitClient() throws NoSuchAlgorithmException {
		URI uri = null;
		try {
			uri = new URI(LIVEKIT_URL);
		} catch (URISyntaxException e) {
			Assertions.fail("Wrong LIVEKIT_URL");
		}
		String url = ("wss".equals(uri.getScheme()) ? "https" : "http") + "://" + uri.getAuthority() + uri.getPath();

		LK = RoomServiceClient.create(url.toString(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET, false,
				(okHttpClientBuilder) -> {
					TrustManager[] trustAllCerts = new TrustManager[] { new X509TrustManager() {
						@Override
						public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {
						}

						@Override
						public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {
						}

						@Override
						public java.security.cert.X509Certificate[] getAcceptedIssuers() {
							return new java.security.cert.X509Certificate[] {};
						}
					} };
					SSLContext sslContext = null;
					try {
						sslContext = SSLContext.getInstance("SSL");
						sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
					} catch (KeyManagementException | NoSuchAlgorithmException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
					okHttpClientBuilder.sslSocketFactory(sslContext.getSocketFactory(),
							(X509TrustManager) trustAllCerts[0]);
					okHttpClientBuilder.hostnameVerifier((hostname, session) -> true);
				});
	}

	protected static void loadEnvironmentVariables() {
		String appUrl = System.getProperty("APP_URL");
		if (appUrl != null) {
			APP_URL = appUrl;
		}
		log.info("Using URL {} to connect to openvidu-testapp", APP_URL);

		String openviduUrl = System.getProperty("LIVEKIT_URL");
		if (openviduUrl != null) {
			LIVEKIT_URL = openviduUrl;
		}
		log.info("Using URL {} to connect to livekit-server", LIVEKIT_URL);

		String livekitApiKey = System.getProperty("LIVEKIT_API_KEY");
		if (livekitApiKey != null) {
			LIVEKIT_API_KEY = livekitApiKey;
		}
		log.info("Using api key {} to connect to livekit-server", LIVEKIT_API_KEY);

		String livekitApiSecret = System.getProperty("LIVEKIT_API_SECRET");
		if (livekitApiSecret != null) {
			LIVEKIT_API_SECRET = livekitApiSecret;
		}
		log.info("Using api secret {} to connect to livekit-server", LIVEKIT_API_SECRET);

		String mediaServerImage = System.getProperty("MEDIA_SERVER_IMAGE");
		if (mediaServerImage != null) {
			MEDIA_SERVER_IMAGE = mediaServerImage;
		}
		log.info("Using media server {} for e2e tests", MEDIA_SERVER_IMAGE);

		String chromeVersion = System.getProperty("CHROME_VERSION");
		if (chromeVersion != null && !chromeVersion.isBlank()) {
			CHROME_VERSION = chromeVersion;
		}
		log.info("Using Chrome {}", CHROME_VERSION);

		String firefoxVersion = System.getProperty("FIREFOX_VERSION");
		if (firefoxVersion != null && !firefoxVersion.isBlank()) {
			FIREFOX_VERSION = firefoxVersion;
		}
		log.info("Using Firefox {}", FIREFOX_VERSION);

		String edgeVersion = System.getProperty("EDGE_VERSION");
		if (edgeVersion != null && !edgeVersion.isBlank()) {
			EDGE_VERSION = edgeVersion;
		}
		log.info("Using Edge {}", EDGE_VERSION);

		String openviduProLicense = System.getProperty("OPENVIDU_PRO_LICENSE");
		if (openviduProLicense != null) {
			OPENVIDU_PRO_LICENSE = openviduProLicense;
		}

		String openviduProLicenseApi = System.getProperty("OPENVIDU_PRO_LICENSE_API");
		if (openviduProLicenseApi != null) {
			OPENVIDU_PRO_LICENSE_API = openviduProLicenseApi;
		}
	}

	protected BrowserUser setupBrowser(String browser) throws Exception {

		BrowserUser browserUser = null;
		GenericContainer<?> container;
		Path path;

		switch (browser) {
		case "chrome":
			boolean headless = false;
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, headless);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			browserUser = new ChromeUser("TestUser", 50, headless);
			break;
		case "chromeTwoInstances":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 2, true);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			browserUser = new ChromeUser("TestUser", 50, true);
			break;
		case "chromeAlternateScreenShare":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			browserUser = new ChromeUser("TestUser", 50, "OpenVidu TestApp");
			break;
		case "chromeAlternateFakeVideo":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			path = Paths.get("/opt/openvidu/barcode.y4m");
			checkMediafilePath(path);
			browserUser = new ChromeUser("TestUser", 50, path);
			break;
		case "chromeFakeAudio":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			path = Paths.get("/opt/openvidu/stt-test.wav");
			checkMediafilePath(path);
			browserUser = new ChromeUser("TestUser", 50, null, path);
			break;
		case "chromeVirtualBackgroundFakeVideo":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			path = Paths.get("/opt/openvidu/girl.mjpeg");
			checkMediafilePath(path);
			browserUser = new ChromeUser("TestUser", 50, path, false);
			break;
		case "firefox":
			container = firefoxContainer("selenium/standalone-firefox:" + FIREFOX_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.FIREFOX, container, false);
			browserUser = new FirefoxUser("TestUser", 50, false);
			break;
		case "firefoxDisabledOpenH264":
			container = firefoxContainer("selenium/standalone-firefox:" + FIREFOX_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.FIREFOX, container, false);
			browserUser = new FirefoxUser("TestUser", 50, true);
			break;
		case "edge":
			container = edgeContainer("selenium/standalone-edge:" + EDGE_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.EDGE, container, false);
			browserUser = new EdgeUser("TestUser", 50);
			break;
		default:
			log.error("Browser {} not recognized", browser);
		}

		this.browserUsers.add(browserUser);
		return browserUser;
	}

	private static boolean setupBrowserAux(BrowserNames browser, GenericContainer<?> container, boolean forceRestart) {
		if (isRemote(browser)) {
			String dockerImage = container.getDockerImageName();
			String ps = commandLine.executeCommand("docker ps | grep " + dockerImage, 30);
			boolean containerAlreadyRunning = container.isRunning() || !ps.isBlank();
			if (forceRestart && containerAlreadyRunning) {
				container.stop();
			}
			if (!containerAlreadyRunning) {
				container.start();
				containers.add(container);
				return true;
			}
		}
		return false;
	}

	private static boolean isRemote(BrowserNames browser) {
		String remoteUrl = null;
		switch (browser) {
		case CHROME:
			remoteUrl = System.getProperty("REMOTE_URL_CHROME");
			break;
		case FIREFOX:
			remoteUrl = System.getProperty("REMOTE_URL_FIREFOX");
			break;
		case OPERA:
			remoteUrl = System.getProperty("REMOTE_URL_OPERA");
			break;
		case EDGE:
			remoteUrl = System.getProperty("REMOTE_URL_EDGE");
			break;
		case ANDROID:
			return true;
		}
		return remoteUrl != null;
	}

	@AfterEach
	protected void dispose() {

		// Close all remaining Rooms
		this.closeAllRooms(LK);

		// Reset Media Server
		if (isMediaServerRestartTest) {
			this.stopMediaServer();
			this.startMediaServer();
			isMediaServerRestartTest = false;
		}

		// Dispose all browsers users
		Iterator<BrowserUser> it1 = browserUsers.iterator();
		while (it1.hasNext()) {
			BrowserUser u = it1.next();
			u.dispose();
			it1.remove();
		}

		// Stop and remove all browser containers if necessary
		Iterator<GenericContainer<?>> it2 = containers.iterator();
		List<String> waitUntilContainerIsRemovedCommands = new ArrayList<>();
		containers.forEach(c -> {
			waitUntilContainerIsRemovedCommands
					.add("while docker inspect " + c.getContainerId() + " >/dev/null 2>&1; do sleep 1; done");
		});
		while (it2.hasNext()) {
			GenericContainer<?> c = it2.next();
			stopContainerIfPossible(c);
			it2.remove();
		}
		waitUntilContainerIsRemovedCommands.forEach(command -> {
			commandLine.executeCommand(command, 30);
		});
	}

	private void stopContainerIfPossible(GenericContainer<?> container) {
		if (container != null && container.isRunning()) {
			container.stop();
			container.close();
		}
	}

	protected void closeAllRooms(RoomServiceClient client) {
		try {
			client.listRooms().execute().body().forEach(r -> client.deleteRoom(r.getName()));
		} catch (IOException e) {
			log.error("Error closing rooms: {}", e.getMessage());
		}
	}

	private void checkMediafilePath(Path path) throws Exception {
		if (!Files.exists(path)) {
			throw new Exception("File " + path.toAbsolutePath().toString() + " does not exist");
		} else if (!Files.isReadable(path)) {
			throw new Exception("File " + path.toAbsolutePath().toString() + " exists but is not readable");
		}
	}

	protected void startMediaServer() {
		String command = "docker run --rm -p 1880:7880 -e LIVEKIT_KEYS=\"" + LIVEKIT_API_KEY + " : "
				+ LIVEKIT_API_SECRET + "\" " + MEDIA_SERVER_IMAGE;
		commandLine.executeCommand(command, 60);
	}

	protected void stopMediaServer() {
		isMediaServerRestartTest = true;
		final String dockerRemoveCmd = "docker ps -a | awk '{ print $1,$2 }' | grep livekit-server | awk '{ print $1 }' | xargs -I {} docker rm -f {}";
		commandLine.executeCommand(dockerRemoveCmd, 60);
	}

}
