package io.openvidu.test.e2e;

import static org.openqa.selenium.OutputType.BASE64;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.io.FileUtils;
import org.apache.http.HttpStatus;
import org.junit.Assert;
import org.junit.jupiter.api.AfterEach;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.containers.wait.strategy.WaitStrategy;
import org.testcontainers.utility.DockerImageName;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mashape.unirest.http.HttpMethod;

import io.github.bonigarcia.wdm.WebDriverManager;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.test.browsers.AndroidAppUser;
import io.openvidu.test.browsers.AndroidChromeUser;
import io.openvidu.test.browsers.AndroidFirefoxUser;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.ChromeUser;
import io.openvidu.test.browsers.EdgeUser;
import io.openvidu.test.browsers.FirefoxUser;
import io.openvidu.test.browsers.OperaUser;
import io.openvidu.test.browsers.utils.BrowserNames;
import io.openvidu.test.browsers.utils.CommandLineExecutor;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.RecordingUtils;

public class OpenViduTestE2e {

	private final static WaitStrategy waitBrowser = Wait.forHttp("/wd/hub/status").forStatusCode(200);
	private final static WaitStrategy waitAndroid = Wait.forHealthcheck().withStartupTimeout(Duration.ofSeconds(600));

	// Media server variables
	final protected static String KURENTO_IMAGE = "kurento/kurento-media-server";
	final protected static String MEDIASOUP_IMAGE = "openvidu/mediasoup-controller";
	protected static String MEDIA_SERVER_IMAGE = KURENTO_IMAGE + ":6.16.0";

	final protected String DEFAULT_JSON_SESSION = "{'id':'STR','object':'session','sessionId':'STR','createdAt':0,'mediaMode':'STR','recordingMode':'STR','defaultRecordingProperties':{'hasVideo':true,'frameRate':25,'hasAudio':true,'shmSize':536870912,'name':'','outputMode':'COMPOSED','resolution':'1280x720','recordingLayout':'BEST_FIT'},'customSessionId':'STR','connections':{'numberOfElements':0,'content':[]},'recording':false,'forcedVideoCodec':'STR','forcedVideoCodecResolved':'STR','allowTranscoding':false}";
	final protected String DEFAULT_JSON_PENDING_CONNECTION = "{'id':'STR','object':'connection','type':'WEBRTC','status':'pending','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':null,'location':null,'ip':null,'platform':null,'token':'STR','serverData':'STR','record':true,'role':'STR','kurentoOptions':null,'rtspUri':null,'adaptativeBitrate':null,'onlyPlayWithSubscribers':null,'networkCache':null,'clientData':null,'publishers':null,'subscribers':null, 'customIceServers':[]}";
	final protected String DEFAULT_JSON_ACTIVE_CONNECTION = "{'id':'STR','object':'connection','type':'WEBRTC','status':'active','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':0,'location':'STR','ip':'STR','platform':'STR','token':'STR','serverData':'STR','record':true,'role':'STR','kurentoOptions':null,'rtspUri':null,'adaptativeBitrate':null,'onlyPlayWithSubscribers':null,'networkCache':null,'clientData':'STR','publishers':[],'subscribers':[], 'customIceServers':[]}";
	final protected String DEFAULT_JSON_IPCAM_CONNECTION = "{'id':'STR','object':'connection','type':'IPCAM','status':'active','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':0,'location':'STR','ip':'STR','platform':'IPCAM','token':null,'serverData':'STR','record':true,'role':null,'kurentoOptions':null,'rtspUri':'STR','adaptativeBitrate':true,'onlyPlayWithSubscribers':true,'networkCache':2000,'clientData':null,'publishers':[],'subscribers':[], 'customIceServers':[]}";
	final protected String DEFAULT_JSON_TOKEN = "{'id':'STR','token':'STR','connectionId':'STR','createdAt':0,'session':'STR','role':'STR','data':'STR','kurentoOptions':{}}";

	protected static String OPENVIDU_SECRET = "MY_SECRET";
	protected static String OPENVIDU_URL = "https://localhost:4443/";
	protected static String APP_URL = "https://localhost:4200/";
	protected static String EXTERNAL_CUSTOM_LAYOUT_URL = "http://localhost:4114";
	protected static String OPENVIDU_PRO_LICENSE = "not_valid";
	protected static String OPENVIDU_PRO_LICENSE_API = "not_valid";
	protected static String EXTERNAL_CUSTOM_LAYOUT_PARAMS = "sessionId,CUSTOM_LAYOUT_SESSION,secret,MY_SECRET";

	// https://hub.docker.com/r/selenium/standalone-chrome/tags
	protected static String CHROME_VERSION = "latest";
	// https://hub.docker.com/r/selenium/standalone-firefox/tags
	protected static String FIREFOX_VERSION = "latest";
	// https://hub.docker.com/r/selenium/standalone-opera/tags
	protected static String OPERA_VERSION = "latest";
	// https://hub.docker.com/r/selenium/standalone-edge/tags
	protected static String EDGE_VERSION = "latest";

	protected static Exception ex = null;
	protected final Object lock = new Object();

	protected static final Logger log = LoggerFactory.getLogger(OpenViduTestE2e.class);
	protected static final CommandLineExecutor commandLine = new CommandLineExecutor();
	protected static final String RECORDING_IMAGE = "openvidu/openvidu-recording";

	protected Collection<BrowserUser> browserUsers = new HashSet<>();
	protected Collection<GenericContainer<?>> containers = new HashSet<>();
	protected volatile static boolean isRecordingTest;
	protected volatile static boolean isKurentoRestartTest;

	protected static VideoCodec defaultForcedVideoCodec;
	protected static boolean defaultAllowTranscoding;

	protected static OpenVidu OV;

	protected RecordingUtils recordingUtils = new RecordingUtils();

	protected static void checkFfmpegInstallation() {
		String ffmpegOutput = commandLine.executeCommand("which ffmpeg", 60);
		if (ffmpegOutput == null || ffmpegOutput.isEmpty()) {
			log.error("ffmpeg package is not installed in the host machine");
			Assert.fail();
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
		chrome.setPortBindings(Arrays.asList("6666:4444"));
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
		firefox.setPortBindings(Arrays.asList("6667:4444"));
		return firefox;
	}

	private GenericContainer<?> operaContainer(String image, long shmSize, int maxBrowserSessions) {
		Map<String, String> map = new HashMap<>();
		if (maxBrowserSessions > 1) {
			map.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			map.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		GenericContainer<?> opera = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(map).withExposedPorts(4444)
				.waitingFor(waitBrowser);
		opera.setPortBindings(Arrays.asList("6668:4444"));
		return opera;
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
		edge.setPortBindings(Arrays.asList("6669:4444"));
		return edge;
	}

	private GenericContainer<?> androidContainer(String image, long shmSize) {
		GenericContainer<?> android = new GenericContainer<>(DockerImageName.parse(image)).withPrivilegedMode(true)
				.withEnv(Map.of("DEVICE", "Samsung Galaxy S10", "APPIUM", "true", "APPIUM_HOST", "172.17.0.1",
						"APPIUM_PORT", "4723", "MOBILE_WEB_TEST", "true", "RELAXED_SECURITY", "true"))
				.withSharedMemorySize(shmSize).withExposedPorts(6080, 5554, 5555, 4723).waitingFor(waitAndroid)
				.withFileSystemBind("/opt/openvidu-cache", "/opt/openvidu-cache");
		android.setPortBindings(Arrays.asList("6080:6080", "5554:5554", "5555:5555", "4723:4723"));
		return android;
	}

	protected static void prepareBrowserDrivers(Set<BrowserNames> browsers) {
		if (browsers.contains(BrowserNames.CHROME) && !isRemote(BrowserNames.CHROME)) {
			WebDriverManager.chromedriver().setup();
		}
		if (browsers.contains(BrowserNames.FIREFOX) && !isRemote(BrowserNames.FIREFOX)) {
			WebDriverManager.firefoxdriver().setup();
		}
		if (browsers.contains(BrowserNames.OPERA) && !isRemote(BrowserNames.OPERA)) {
			WebDriverManager.operadriver().setup();
		}
		if (browsers.contains(BrowserNames.EDGE) && !isRemote(BrowserNames.EDGE)) {
			WebDriverManager.edgedriver().setup();
		}
	}

	protected static void cleanFoldersAndSetUpOpenViduJavaClient() {
		try {
			log.info("Cleaning folder /opt/openvidu/recordings");
			FileUtils.cleanDirectory(new File("/opt/openvidu/recordings"));
		} catch (IOException e) {
			log.error(e.getMessage());
		}
		OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
	}

	protected static void loadEnvironmentVariables() {
		String appUrl = System.getProperty("APP_URL");
		if (appUrl != null) {
			APP_URL = appUrl;
		}
		log.info("Using URL {} to connect to openvidu-testapp", APP_URL);

		String externalCustomLayoutUrl = System.getProperty("EXTERNAL_CUSTOM_LAYOUT_URL");
		if (externalCustomLayoutUrl != null) {
			EXTERNAL_CUSTOM_LAYOUT_URL = externalCustomLayoutUrl;
		}
		log.info("Using URL {} to connect to external custom layout", EXTERNAL_CUSTOM_LAYOUT_URL);

		String externalCustomLayoutParams = System.getProperty("EXTERNAL_CUSTOM_LAYOUT_PARAMS");
		if (externalCustomLayoutParams != null) {
			// Parse external layout parameters and build a URL formatted params string
			List<String> params = Stream.of(externalCustomLayoutParams.split(",", -1)).collect(Collectors.toList());
			if (params.size() % 2 != 0) {
				log.error(
						"Wrong configuration property EXTERNAL_CUSTOM_LAYOUT_PARAMS. Must be a comma separated list with an even number of elements. e.g: EXTERNAL_CUSTOM_LAYOUT_PARAMS=param1,value1,param2,value2");
				Assert.fail();
				return;
			} else {
				EXTERNAL_CUSTOM_LAYOUT_PARAMS = "";
				for (int i = 0; i < params.size(); i++) {
					if (i % 2 == 0) {
						// Param name
						EXTERNAL_CUSTOM_LAYOUT_PARAMS += params.get(i) + "=";
					} else {
						// Param value
						EXTERNAL_CUSTOM_LAYOUT_PARAMS += params.get(i);
						if (i < params.size() - 1) {
							EXTERNAL_CUSTOM_LAYOUT_PARAMS += "&";
						}
					}
				}
			}
		}
		log.info("Using URL {} to connect to external custom layout", EXTERNAL_CUSTOM_LAYOUT_PARAMS);

		String openviduUrl = System.getProperty("OPENVIDU_URL");
		if (openviduUrl != null) {
			OPENVIDU_URL = openviduUrl;
		}
		log.info("Using URL {} to connect to openvidu-server", OPENVIDU_URL);

		String openvidusecret = System.getProperty("OPENVIDU_SECRET");
		if (openvidusecret != null) {
			OPENVIDU_SECRET = openvidusecret;
		}
		log.info("Using secret {} to connect to openvidu-server", OPENVIDU_SECRET);

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

		String operaVersion = System.getProperty("OPERA_VERSION");
		if (operaVersion != null && !operaVersion.isBlank()) {
			OPERA_VERSION = operaVersion;
		}
		log.info("Using Opera {}", OPERA_VERSION);

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

	protected BrowserUser setupBrowser(String browser) {

		BrowserUser browserUser = null;
		GenericContainer<?> container;

		switch (browser) {
		case "chrome":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			browserUser = new ChromeUser("TestUser", 50, true);
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
			browserUser = new ChromeUser("TestUser", 50, Paths.get("/opt/openvidu/barcode.y4m"));
			break;
		case "chromeVirtualBackgroundFakeVideo":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			browserUser = new ChromeUser("TestUser", 50, Paths.get("/opt/openvidu/girl.mjpeg"), false);
			break;
		case "firefox":
			container = firefoxContainer("selenium/standalone-firefox:" + FIREFOX_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.FIREFOX, container, false);
			browserUser = new FirefoxUser("TestUser", 50, false);
			break;
		case "firefoxDisabledOpenH264":
			container = firefoxContainer("selenium/standalone-firefox:" + FIREFOX_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.FIREFOX, container, false);
			browserUser = new FirefoxUser("TestUser", 50, true);
			break;
		case "opera":
			container = operaContainer("selenium/standalone-opera:" + OPERA_VERSION, 2147483648L, 1);
			setupBrowserAux(BrowserNames.OPERA, container, false);
			browserUser = new OperaUser("TestUser", 50);
			break;
		case "edge":
			container = edgeContainer("selenium/standalone-edge:" + EDGE_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.EDGE, container, false);
			browserUser = new EdgeUser("TestUser", 50);
			break;
		case "androidChrome":
			container = androidContainer("budtmo/docker-android-x86-12.0:latest", 4294967296L);
			setupBrowserAux(BrowserNames.ANDROID, container, false);
			try {
				// TODO: remove this try-catch when possible. Fixes
				// https://github.com/budtmo/docker-android/issues/309
				container.execInContainer("bash", "-c",
						"rm chromedriver && wget https://chromedriver.storage.googleapis.com/91.0.4472.101/chromedriver_linux64.zip && unzip chromedriver_linux64.zip && rm chromedriver_linux64.zip");
			} catch (UnsupportedOperationException | IOException | InterruptedException e) {
				log.error("Error running command in Android container");
			}
			browserUser = new AndroidChromeUser("TestUser", 50);
			break;
		case "androidFirefox":
			container = androidContainer("budtmo/docker-android-x86-12.0:latest", 4294967296L);
			setupBrowserAux(BrowserNames.ANDROID, container, false);
			try {
				// Download geckodriver and place in PATH at /usr/bin/
				container.execInContainer("bash", "-c",
						"wget https://github.com/mozilla/geckodriver/releases/download/v0.30.0/geckodriver-v0.30.0-linux64.tar.gz && tar -xf geckodriver*.tar.gz && rm geckodriver*.tar.gz && mv geckodriver /usr/bin/.");
			} catch (UnsupportedOperationException | IOException | InterruptedException e) {
				log.error("Error running command in Android container");
			}
			browserUser = new AndroidFirefoxUser("TestUser", 50);
			break;
		case "androidApp":
			container = androidContainer("budtmo/docker-android-x86-12.0:latest", 4294967296L);
			setupBrowserAux(BrowserNames.ANDROID, container, false);
			try {
				// TODO: remove this try-catch when possible. Fixes
				// https://github.com/budtmo/docker-android/issues/309
				container.execInContainer("bash", "-c",
						"rm chromedriver && wget https://chromedriver.storage.googleapis.com/91.0.4472.101/chromedriver_linux64.zip && unzip chromedriver_linux64.zip && rm chromedriver_linux64.zip");
			} catch (UnsupportedOperationException | IOException | InterruptedException e) {
				log.error("Error running command in Android container");
			}
			browserUser = new AndroidAppUser("TestUser", 50, "/opt/openvidu-cache/app-debug.apk");
			break;
		default:
			log.error("Browser {} not recognized", browser);
		}

		this.browserUsers.add(browserUser);
		return browserUser;
	}

	private void setupBrowserAux(BrowserNames browser, GenericContainer<?> container, boolean forceRestart) {
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
			}
		}
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

	protected static void getDefaultTranscodingValues() throws Exception {
		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		JsonObject ovConfig = restClient.rest(HttpMethod.GET, "/openvidu/api/config", HttpStatus.SC_OK);
		defaultForcedVideoCodec = VideoCodec.valueOf(ovConfig.get("OPENVIDU_STREAMS_FORCED_VIDEO_CODEC").getAsString());
		defaultAllowTranscoding = ovConfig.get("OPENVIDU_STREAMS_ALLOW_TRANSCODING").getAsBoolean();
	}

	@AfterEach
	protected void dispose() {
		// Close all remaining OpenVidu sessions
		this.closeAllSessions(OV);
		// Remove all recordings
		if (isRecordingTest) {
			deleteAllRecordings(OV);
			isRecordingTest = false;
		}
		// Reset Media Server
		if (isKurentoRestartTest) {
			this.stopMediaServer(false);
			this.startMediaServer(true);
			isKurentoRestartTest = false;
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
		// Reset REST client
		OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
	}

	private void stopContainerIfPossible(GenericContainer<?> container) {
		if (container != null && container.isRunning()) {
			container.stop();
			container.close();
		}
	}

	protected void closeAllSessions(OpenVidu client) {
		try {
			client.fetch();
		} catch (OpenViduJavaClientException | OpenViduHttpException e) {
			log.error("Error fetching sessions: {}", e.getMessage());
		}
		client.getActiveSessions().forEach(session -> {
			try {
				session.close();
				log.info("Session {} successfully closed", session.getSessionId());
			} catch (OpenViduJavaClientException | OpenViduHttpException e) {
				log.error("Error closing session: {}", e.getMessage());
			}
		});
	}

	protected void deleteAllRecordings(OpenVidu client) {
		try {
			client.listRecordings().forEach(recording -> {
				try {
					client.deleteRecording(recording.getId());
					log.info("Recording {} successfully deleted", recording.getId());
				} catch (OpenViduJavaClientException | OpenViduHttpException e) {
					log.error("Error deleting recording: {}", e.getMessage());
				}
			});
		} catch (OpenViduJavaClientException | OpenViduHttpException e) {
			log.error("Error listing recordings: {}", e.getMessage());
		}
		removeAllRecordingContiners();
		try {
			FileUtils.cleanDirectory(new File("/opt/openvidu/recordings"));
		} catch (IOException e) {
			log.error(e.getMessage());
		}
	}

	protected ExpectedCondition<Boolean> waitForVideoDuration(WebElement element, int durationInSeconds) {
		return new ExpectedCondition<Boolean>() {
			@Override
			public Boolean apply(WebDriver input) {
				return element.getAttribute("duration").matches(
						durationInSeconds - 1 + "\\.[5-9][0-9]{0,5}|" + durationInSeconds + "\\.[0-5][0-9]{0,5}");
			}
		};
	}

	protected String getBase64Screenshot(BrowserUser user) throws Exception {
		String screenshotBase64 = ((TakesScreenshot) user.getDriver()).getScreenshotAs(BASE64);
		return "data:image/png;base64," + screenshotBase64;
	}

	protected void startMediaServer(boolean waitUntilKurentoClientReconnection) {
		String command = null;
		if (MEDIA_SERVER_IMAGE.startsWith(KURENTO_IMAGE)) {
			log.info("Starting kurento");
			command = "docker run -e KMS_UID=$(id -u) --network=host --detach=true"
					+ " --volume=/opt/openvidu/recordings:/opt/openvidu/recordings " + MEDIA_SERVER_IMAGE;
		} else if (MEDIA_SERVER_IMAGE.startsWith(MEDIASOUP_IMAGE)) {
			log.info("Starting mediaSoup");
			command = "docker run --network=host --restart=always --detach=true --env=KMS_MIN_PORT=40000 --env=KMS_MAX_PORT=65535"
					+ " --env=OPENVIDU_PRO_LICENSE=" + OPENVIDU_PRO_LICENSE + " --env=OPENVIDU_PRO_LICENSE_API="
					+ OPENVIDU_PRO_LICENSE_API
					+ " --env=WEBRTC_LISTENIPS_0_ANNOUNCEDIP=172.17.0.1 --env=WEBRTC_LISTENIPS_0_IP=172.17.0.1"
					+ " --volume=/opt/openvidu/recordings:/opt/openvidu/recordings " + MEDIA_SERVER_IMAGE;
		} else {
			log.error("Unrecognized MEDIA_SERVER_IMAGE: {}", MEDIA_SERVER_IMAGE);
			System.exit(1);
		}
		commandLine.executeCommand(command, 60);
		if (waitUntilKurentoClientReconnection) {
			try {
				Thread.sleep(5000);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}

	protected void stopMediaServer(boolean waitUntilNodeCrashedEvent) {
		final String dockerRemoveCmd = "docker ps -a | awk '{ print $1,$2 }' | grep GREP_PARAMETER | awk '{ print $1 }' | xargs -I {} docker rm -f {}";
		String grep = null;
		if (MEDIA_SERVER_IMAGE.startsWith(KURENTO_IMAGE)) {
			log.info("Stopping kurento");
			grep = KURENTO_IMAGE;
		} else if (MEDIA_SERVER_IMAGE.startsWith(MEDIASOUP_IMAGE)) {
			log.info("Stopping mediasoup");
			grep = MEDIASOUP_IMAGE;
		} else {
			log.error("Unrecognized MEDIA_SERVER_IMAGE: {}", MEDIA_SERVER_IMAGE);
			System.exit(1);
		}
		commandLine.executeCommand(dockerRemoveCmd.replaceFirst("GREP_PARAMETER", grep), 60);
		if (waitUntilNodeCrashedEvent) {
			try {
				Thread.sleep(4000);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}

	protected void checkDockerContainerRunning(String imageName, int amount) {
		int number = Integer.parseInt(commandLine.executeCommand("docker ps | grep " + imageName + " | wc -l", 60));
		Assert.assertEquals("Wrong number of Docker containers for image " + imageName + " running", amount, number);
	}

	protected void removeAllRecordingContiners() {
		commandLine.executeCommand("docker ps -a | awk '{ print $1,$2 }' | grep " + RECORDING_IMAGE
				+ " | awk '{print $1 }' | xargs -I {} docker rm -f {}", 60);
	}

	protected String mergeJson(String json, String newProperties, String[] removeProperties) {
		JsonObject jsonObj = JsonParser.parseString(json.replaceAll("'", "\"")).getAsJsonObject();
		JsonObject newJsonObj = JsonParser.parseString(newProperties.replaceAll("'", "\"")).getAsJsonObject();
		newJsonObj.entrySet().forEach(entry -> {
			jsonObj.remove(entry.getKey());
			jsonObj.add(entry.getKey(), entry.getValue());
		});
		for (String prop : removeProperties) {
			jsonObj.remove(prop);
		}
		return jsonObj.toString().replaceAll("\"", "'");
	}

	protected String getIndividualRecordingExtension() throws Exception {
		if (MEDIA_SERVER_IMAGE.contains(KURENTO_IMAGE)) {
			return "webm";
		}
		if (MEDIA_SERVER_IMAGE.contains(MEDIASOUP_IMAGE)) {
			return "mkv";
		} else {
			throw new Exception("Unknown media server");
		}
	}

	protected void waitUntilFileExistsAndIsBiggerThan(String absolutePath, int kbs, int maxSecondsWait)
			throws Exception {

		long startTime = System.currentTimeMillis();

		int interval = 100;
		int maxLoops = (maxSecondsWait * 1000) / interval;
		int loop = 0;
		long bytes = 0;

		boolean bigger = false;
		Path path = Paths.get(absolutePath);

		while (!bigger && loop < maxLoops) {
			bigger = Files.exists(path) && Files.isReadable(path);
			if (bigger) {
				try {
					bytes = Files.size(path);
				} catch (IOException e) {
					System.err.println("Error getting file size from " + path + ": " + e.getMessage());
				}
				bigger = (bytes / 1024) > kbs;
			}
			loop++;
			Thread.sleep(interval);
		}

		if (!bigger && loop >= maxLoops) {
			String errorMessage;
			if (!Files.exists(path)) {
				errorMessage = "File " + absolutePath + " does not exist and has not been created in " + maxSecondsWait
						+ " seconds";
			} else if (!Files.isReadable(path)) {
				errorMessage = "File " + absolutePath
						+ " exists but is not readable, and read permissions have not been granted in " + maxSecondsWait
						+ " seconds";
			} else {
				errorMessage = "File " + absolutePath + " did not reach a size of at least " + kbs + " KBs in "
						+ maxSecondsWait + " seconds. Last check was " + (bytes / 1024) + " KBs";
			}
			throw new Exception(errorMessage);
		} else {
			log.info("File " + absolutePath + " did reach a size of at least " + kbs + " KBs in "
					+ (System.currentTimeMillis() - startTime) + " ms (last checked size was " + (bytes / 1024)
					+ " KBs)");
		}
	}

}
