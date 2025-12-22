package io.openvidu.test.e2e;

import static org.openqa.selenium.OutputType.BASE64;
import static org.rnorth.ducttape.unreliables.Unreliables.retryUntilSuccess;

import java.io.File;
import java.io.IOException;
import java.net.HttpURLConnection;
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
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.io.FileUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.openqa.selenium.By;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.AbstractWaitStrategy;
import org.testcontainers.utility.DockerImageName;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.test.browsers.AndroidAppUser;
import io.openvidu.test.browsers.AndroidChromeUser;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.ChromeUser;
import io.openvidu.test.browsers.EdgeUser;
import io.openvidu.test.browsers.FirefoxUser;
import io.openvidu.test.browsers.utils.BrowserNames;
import io.openvidu.test.browsers.utils.CommandLineExecutor;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.RecordingUtils;

public class OpenViduTestE2e {

	private static class AndroidContainerWaitStrategy extends AbstractWaitStrategy {
		@Override
		protected void waitUntilReady() {
			retryUntilSuccess(600, TimeUnit.SECONDS, () -> {
				if (!"READY".equals(
						this.waitStrategyTarget.execInContainer("bash", "-c", "cat device_status").getStdout())) {
					throw new Exception();
				}
				return true;
			});
		}
	}

	// Media server variables
	final String PLAYGROUND_SCRIPT = "/opt/openvidu-deployment/playground/dev.sh ";

	final protected String DEFAULT_JSON_SESSION = "{'id':'STR','object':'session','sessionId':'STR','createdAt':0,'mediaMode':'STR','recordingMode':'STR','defaultRecordingProperties':{'hasVideo':true,'frameRate':25,'hasAudio':true,'shmSize':536870912,'name':'','outputMode':'COMPOSED','resolution':'1280x720','recordingLayout':'BEST_FIT'},'customSessionId':'STR','connections':{'numberOfElements':0,'content':[]},'recording':false,'broadcasting':false,'forcedVideoCodec':'STR','allowTranscoding':false}";
	final protected String DEFAULT_JSON_PENDING_CONNECTION = "{'id':'STR','object':'connection','type':'WEBRTC','status':'pending','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':null,'location':null,'ip':null,'platform':null,'token':'STR','serverData':'STR','record':true,'role':'STR','kurentoOptions':null,'rtspUri':null,'adaptativeBitrate':null,'onlyPlayWithSubscribers':null,'networkCache':null,'clientData':null,'publishers':null,'subscribers':null, 'customIceServers':[]}";
	final protected String DEFAULT_JSON_ACTIVE_CONNECTION = "{'id':'STR','object':'connection','type':'WEBRTC','status':'active','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':0,'location':'STR','ip':'STR','platform':'STR','token':'STR','serverData':'STR','record':true,'role':'STR','kurentoOptions':null,'rtspUri':null,'adaptativeBitrate':null,'onlyPlayWithSubscribers':null,'networkCache':null,'clientData':'STR','publishers':[],'subscribers':[], 'customIceServers':[]}";
	final protected String DEFAULT_JSON_IPCAM_CONNECTION = "{'id':'STR','object':'connection','type':'IPCAM','status':'active','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':0,'location':'STR','ip':'STR','platform':'IPCAM','token':null,'serverData':'STR','record':true,'role':null,'kurentoOptions':null,'rtspUri':'STR','adaptativeBitrate':true,'onlyPlayWithSubscribers':true,'networkCache':2000,'clientData':null,'publishers':[],'subscribers':[], 'customIceServers':[]}";
	final protected String DEFAULT_JSON_TOKEN = "{'id':'STR','token':'STR','connectionId':'STR','createdAt':0,'session':'STR','role':'STR','data':'STR','kurentoOptions':{}}";

	protected static String OPENVIDU_SECRET = "secret";
	protected static String OPENVIDU_URL = "http://localhost:4443/";
	protected static String APP_URL = "http://localhost:4200/";
	protected static String EXTERNAL_CUSTOM_LAYOUT_URL = "http://host.docker.internal:7880/openvidu/layouts/v2compat/";
	protected static String OPENVIDU_PRO_LICENSE = "not_valid";
	protected static String OPENVIDU_PRO_LICENSE_API = "not_valid";
	protected static String OPENVIDU_PRO_SPEECH_TO_TEXT = "vosk";
	protected static String DOCKERHUB_PRIVATE_REGISTRY_PASSWORD = "not_valid";
	protected static String EXTERNAL_CUSTOM_LAYOUT_PARAMS = "sessionId=CUSTOM_LAYOUT_SESSION&secret=secret";

	protected static String AWS_REGION = "fakeRegion";
	protected static String AWS_ACCESS_KEY_ID = "fakeKey";
	protected static String AWS_SECRET_ACCESS_KEY = "fakeSecret";

	protected static String OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_KEY = "fakeKey";
	protected static String OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_REGION = "fakeRegion";

	// https://hub.docker.com/r/selenium/standalone-chrome/tags
	protected static String CHROME_VERSION = "latest";
	// https://hub.docker.com/r/selenium/standalone-firefox/tags
	protected static String FIREFOX_VERSION = "latest";
	// https://hub.docker.com/r/selenium/standalone-edge/tags
	protected static String EDGE_VERSION = "latest";

	protected static String OPENVIDU_DEPLOYMENT = "http://localhost:5000/";
	protected static String OPENVIDU_LOCAL_RECORDING_PATH = "/opt/openvidu/recordings";
	protected static String DOCKER_ANDROID_IMAGE = "budtmo/docker-android:latest";

	protected static Exception ex = null;
	protected final Object lock = new Object();

	protected static final Logger log = LoggerFactory.getLogger(OpenViduTestE2e.class);
	protected static final CommandLineExecutor commandLine = new CommandLineExecutor();
	protected static final String RECORDING_IMAGE = "openvidu/openvidu-recording";

	protected Collection<BrowserUser> browserUsers = new HashSet<>();
	protected static Collection<GenericContainer<?>> containers = new HashSet<>();
	protected volatile static boolean isRecordingTest;
	protected volatile static boolean isKurentoRestartTest;

	protected volatile static boolean isAndroidTest;

	protected static VideoCodec defaultForcedVideoCodec;
	protected static boolean defaultAllowTranscoding;

	protected static OpenVidu OV;

	protected RecordingUtils recordingUtils = new RecordingUtils();

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

	private GenericContainer<?> createBrowserContainer(String image, long shmSize, int maxBrowserSessions,
			boolean headless, int port) {
		Map<String, String> envVars = new HashMap<>();

		if (headless) {
			// envVars.put("START_XVFB", "false");
		}
		if (maxBrowserSessions > 1) {
			envVars.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			envVars.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		envVars.put("SE_ENABLE_TRACING", "false");
		// Avoid port collision
		int vncPort = 8900 + (containers.size());
		envVars.put("SE_OPTS", "--port " + port + " --no-vnc-port " + vncPort);

		GenericContainer<?> browser = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(envVars).withNetworkMode("host")
				// .withLogConsumer(new Slf4jLogConsumer(log))
				// .waitingFor(Wait.forHttp("/wd/hub/status").forStatusCode(200))
				.withStartupTimeout(Duration.ofSeconds(60));
		return browser;
	}

	private GenericContainer<?> chromeContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		return this.createBrowserContainer(image, shmSize, maxBrowserSessions, headless, 4444);
	}

	private GenericContainer<?> firefoxContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		return this.createBrowserContainer(image, shmSize, maxBrowserSessions, headless, 4445);
	}

	private GenericContainer<?> edgeContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		return this.createBrowserContainer(image, shmSize, maxBrowserSessions, headless, 4446);
	}

	private static GenericContainer<?> androidContainer(String image, long shmSize) {
		GenericContainer<?> android = new GenericContainer<>(DockerImageName.parse(image)).withEnv(Map.of(
				"EMULATOR_DEVICE", "Samsung Galaxy S10", "APPIUM", "true", "APPIUM_HOST", "172.17.0.1", "APPIUM_PORT",
				"4723", "APPIUM_ADDITIONAL_ARGS",
				"--log /var/log/supervisor/appium.log --relaxed-security --allow-cors --allow-insecure=chromedriver_autodownload",
				"MOBILE_WEB_TEST", "true", "RELAXED_SECURITY", "true", "WEB_VNC", "true", "WEB_LOG", "false",
				"DATAPARTITION", "2500m")).withPrivilegedMode(true).withSharedMemorySize(shmSize)
				.withExposedPorts(6080, 5554, 5555, 4723).withFileSystemBind("/dev/kvm", "/dev/kvm")
				.withFileSystemBind("/opt/openvidu/android", "/opt/openvidu/android").withReuse(true)
				.waitingFor(new AndroidContainerWaitStrategy());
		android.setPortBindings(Arrays.asList("6080:6080", "5554:5554", "5555:5555", "4723:4723"));
		return android;
	}

	protected static void cleanFoldersAndSetUpOpenViduJavaClient() {
		try {
			log.info("Cleaning folder " + OPENVIDU_LOCAL_RECORDING_PATH);
			FileUtils.cleanDirectory(new File(OPENVIDU_LOCAL_RECORDING_PATH));
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
				Assertions.fail();
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
		log.info("Using query params {} when connecting to external custom layout", EXTERNAL_CUSTOM_LAYOUT_PARAMS);

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

		String openviduProSpeechToText = System.getProperty("OPENVIDU_PRO_SPEECH_TO_TEXT");
		if (openviduProSpeechToText != null) {
			OPENVIDU_PRO_SPEECH_TO_TEXT = openviduProSpeechToText;
		}

		String awsRegion = System.getProperty("AWS_REGION");
		if (awsRegion != null) {
			AWS_REGION = awsRegion;
		}

		String awsAccessKeyId = System.getProperty("AWS_ACCESS_KEY_ID");
		if (awsAccessKeyId != null) {
			AWS_ACCESS_KEY_ID = awsAccessKeyId;
		}

		String awsSecretAccessKey = System.getProperty("AWS_SECRET_ACCESS_KEY");
		if (awsSecretAccessKey != null) {
			AWS_SECRET_ACCESS_KEY = awsSecretAccessKey;
		}

		String azureKey = System.getProperty("OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_KEY");
		if (azureKey != null) {
			OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_KEY = azureKey;
		}

		String azureRegion = System.getProperty("OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_REGION");
		if (azureRegion != null) {
			OPENVIDU_PRO_SPEECH_TO_TEXT_AZURE_REGION = azureRegion;
		}

		String dockerhubPrivateRegistryPassword = System.getProperty("DOCKERHUB_PRIVATE_REGISTRY_PASSWORD");
		if (dockerhubPrivateRegistryPassword != null) {
			DOCKERHUB_PRIVATE_REGISTRY_PASSWORD = dockerhubPrivateRegistryPassword;
		}

		String dockerAndroidImage = System.getProperty("DOCKER_ANDROID_IMAGE");
		if (dockerAndroidImage != null && !dockerAndroidImage.isBlank()) {
			DOCKER_ANDROID_IMAGE = dockerAndroidImage;
		}
		log.info("Using Docker Android image {}", DOCKER_ANDROID_IMAGE);

		String openviduDeployment = System.getProperty("OPENVIDU_DEPLOYMENT");
		if (openviduDeployment != null) {
			OPENVIDU_DEPLOYMENT = openviduDeployment;
		}
		log.info("Using URL {} to connect to OpenVidu deployment", OPENVIDU_DEPLOYMENT);

		String openviduLocalRecordingPath = System.getProperty("OPENVIDU_LOCAL_RECORDING_PATH");
		if (openviduLocalRecordingPath != null && !openviduLocalRecordingPath.isBlank()) {
			OPENVIDU_LOCAL_RECORDING_PATH = openviduLocalRecordingPath;
		}
		if (OPENVIDU_LOCAL_RECORDING_PATH.endsWith("/")) {
			OPENVIDU_LOCAL_RECORDING_PATH = OPENVIDU_LOCAL_RECORDING_PATH.substring(0,
					OPENVIDU_LOCAL_RECORDING_PATH.length() - 1);
		}
		log.info("Using local recording path {}", OPENVIDU_LOCAL_RECORDING_PATH);
	}

	protected BrowserUser setupBrowser(String browser) throws Exception {

		BrowserUser browserUser = null;
		GenericContainer<?> container;
		Path path;

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
			container = firefoxContainer("selenium/standalone-firefox:" + FIREFOX_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.FIREFOX, container, false);
			browserUser = new FirefoxUser("TestUser", 50, false);
			break;
		case "firefoxDisabledOpenH264":
			container = firefoxContainer("selenium/standalone-firefox:" + FIREFOX_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.FIREFOX, container, false);
			browserUser = new FirefoxUser("TestUser", 50, true);
			break;
		case "edge":
			container = edgeContainer("selenium/standalone-edge:" + EDGE_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.EDGE, container, false);
			browserUser = new EdgeUser("TestUser", 50);
			break;
		case "androidChrome":
			container = setupDockerAndroidContainer();
			browserUser = new AndroidChromeUser("TestUser", 50);
			break;
		case "ionicApp":
			container = setupDockerAndroidContainer();
			browserUser = new AndroidAppUser("TestUser", 50, "/opt/openvidu/android/openvidu-ionic.apk");
			break;
		case "reactNativeApp":
			container = setupDockerAndroidContainer();
			browserUser = new AndroidAppUser("TestUser", 50, "/opt/openvidu/android/openvidu-react-native.apk");
			break;
		case "androidApp":
			container = setupDockerAndroidContainer();
			browserUser = new AndroidAppUser("TestUser", 50, "/opt/openvidu/android/openvidu-android.apk");
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
				try {
					// Avoid error starting container
					Thread.sleep(5000);
				} catch (InterruptedException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				containers.add(container);
				return true;
			}
		}
		return false;
	}

	protected static GenericContainer<?> setupDockerAndroidContainer() throws Exception {
		GenericContainer<?> container = androidContainer(DOCKER_ANDROID_IMAGE, 4294967296L);
		boolean newContainer = setupBrowserAux(BrowserNames.ANDROID, container, false);
		if (!newContainer) {
			container = containers.stream().filter(c -> DOCKER_ANDROID_IMAGE.equals(c.getDockerImageName())).findFirst()
					.get();
		}
		return container;
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
		JsonObject ovConfig = restClient.rest(HttpMethod.GET, "/openvidu/api/config", HttpURLConnection.HTTP_OK);
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
		// if (isKurentoRestartTest) {
		// this.stopMediaServer(false);
		// this.startMediaServer(true);
		// isKurentoRestartTest = false;
		// }

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
			if (isAndroidTest && DOCKER_ANDROID_IMAGE.equals(c.getDockerImageName())) {
				log.info("Do not remove docker-android image");
			} else {
				waitUntilContainerIsRemovedCommands
						.add("while docker inspect " + c.getContainerId() + " >/dev/null 2>&1; do sleep 1; done");
			}
		});
		while (it2.hasNext()) {
			GenericContainer<?> c = it2.next();
			if (!(isAndroidTest && DOCKER_ANDROID_IMAGE.equals(c.getDockerImageName()))) {
				stopContainerIfPossible(c);
				it2.remove();
			}
		}
		waitUntilContainerIsRemovedCommands.forEach(command -> {
			commandLine.executeCommand(command, 30);
		});
		isAndroidTest = false;

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
		// removeAllRecordingContiners();
		try {
			FileUtils.cleanDirectory(new File(OPENVIDU_LOCAL_RECORDING_PATH));
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
		commandLine.executeCommand(PLAYGROUND_SCRIPT + "start-service master-node-1 openvidu", true, 60);
		if (waitUntilKurentoClientReconnection) {
			try {
				Thread.sleep(5000);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}

	protected void stopMediaServer(boolean waitUntilNodeCrashedEvent) {
		commandLine.executeCommand(PLAYGROUND_SCRIPT + "stop-service master-node-1 openvidu", true, 60);
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
		Assertions.assertEquals(amount, number,
				"Wrong number of Docker containers for image " + imageName + " running");
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
		return "mp4";
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
				int kbsFile = (int) Math.ceil(bytes / 1024.0);
				bigger = kbsFile > kbs;
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

	protected void waitUntilUserHasEventsPresent(BrowserUser user, int numberOfUser, String eventType,
			int numberOfEvents) {
		user.getWaiter().until(d -> {
			List<WebElement> elements = d.findElements(By.cssSelector("#openvidu-instance-" + numberOfUser
					+ " .mat-expansion-panel .mat-expansion-panel-header .mat-content"));
			long numberOfEventsOfRequiredType = elements.stream().filter(e -> eventType.equals(e.getText().trim()))
					.count();
			if (numberOfEvents == numberOfEventsOfRequiredType) {
				return true;
			} else {
				return null;
			}
		});
	}

	private void checkMediafilePath(Path path) throws Exception {
		if (!Files.exists(path)) {
			throw new Exception("File " + path.toAbsolutePath().toString() + " does not exist");
		} else if (!Files.isReadable(path)) {
			throw new Exception("File " + path.toAbsolutePath().toString() + " exists but is not readable");
		}
	}

	public static String getRandom(Set<String> set) {
		return set.stream().skip((int) (set.size() * Math.random())).findFirst().get();
	}

	protected JsonObject restartOpenViduServer(Map<String, Object> newConfig) {
		return new JsonObject();
		// return this.restartOpenViduServer(newConfig, false,
		// HttpURLConnection.HTTP_OK);
	}

	protected JsonObject restartOpenViduServer(Map<String, Object> newConfig, boolean force, int status) {
		CustomHttpClient restClient = null;
		try {
			restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
			Gson gson = new Gson();
			String body = gson.toJson(newConfig);
			JsonObject currentConfig = restClient.rest(HttpMethod.GET, "/openvidu/api/config", 200);
			boolean mustRestart = false;

			for (Entry<String, Object> newProp : newConfig.entrySet()) {
				mustRestart = !currentConfig.has(newProp.getKey())
						|| !currentConfig.get(newProp.getKey()).equals(gson.toJsonTree(newProp.getValue()));
				if (mustRestart) {
					break;
				}
			}

			if (mustRestart || force) {
				final int currentRestartCounter = restClient
						.rest(HttpMethod.GET, "/openvidu/api/status", null, HttpURLConnection.HTTP_OK, true, false,
								true, "{'startTime': 0, 'restartCounter': 0, 'lastRestartTime': 0}")
						.get("restartCounter").getAsInt();
				JsonObject response = restClient.rest(HttpMethod.POST, "/openvidu/api/restart", body, status);
				if (HttpURLConnection.HTTP_OK == status) {
					waitUntilOpenViduRestarted(restClient, currentRestartCounter, 120);
				}
				return response;
			} else {
				log.info("Restarting OpenVidu Server is not necessary and is \"force\" is false");
			}
		} catch (Exception e) {
			log.error(e.getMessage());
			Assertions.fail("Error restarting OpenVidu Server");
		}
		return null;
	}

	protected void waitUntilOpenViduRestarted(CustomHttpClient restClient, int previouesRestartCounter,
			int maxSecondsWait) throws Exception {
		boolean restarted = false;
		int msInterval = 500;
		int attempts = 0;
		final int maxAttempts = maxSecondsWait * 1000 / msInterval;
		while (!restarted && attempts < maxAttempts) {
			try {
				JsonObject response = restClient.rest(HttpMethod.GET, "/openvidu/api/status",
						HttpURLConnection.HTTP_OK);
				if (response.get("restartCounter").getAsInt() == (previouesRestartCounter + 1)) {
					restarted = true;
				} else {
					throw new Exception("Wrong restartCounter");
				}
			} catch (Exception e) {
				try {
					log.warn("Waiting for OpenVidu Server...");
					Thread.sleep(msInterval);
				} catch (InterruptedException e1) {
					log.error("Sleep interrupted");
				}
				attempts++;
			}
		}
		if (!restarted && attempts == maxAttempts) {
			throw new TimeoutException();
		}
	}

}
