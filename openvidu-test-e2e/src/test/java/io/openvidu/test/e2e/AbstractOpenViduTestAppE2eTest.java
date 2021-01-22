package io.openvidu.test.e2e;

import static org.openqa.selenium.OutputType.BASE64;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.io.FileUtils;
import org.apache.http.HttpStatus;
import org.junit.Assert;
import org.junit.jupiter.api.AfterEach;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mashape.unirest.http.HttpMethod;

import io.github.bonigarcia.wdm.WebDriverManager;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.ChromeUser;
import io.openvidu.test.browsers.FirefoxUser;
import io.openvidu.test.browsers.OperaUser;
import io.openvidu.test.browsers.ChromeAndroidUser;
import io.openvidu.test.browsers.utils.CommandLineExecutor;
import io.openvidu.test.browsers.utils.CustomHttpClient;
import io.openvidu.test.browsers.utils.RecordingUtils;

public class AbstractOpenViduTestAppE2eTest {

	final protected String DEFAULT_JSON_SESSION = "{'id':'STR','object':'session','sessionId':'STR','createdAt':0,'mediaMode':'STR','recordingMode':'STR','defaultOutputMode':'STR','defaultRecordingLayout':'STR','customSessionId':'STR','connections':{'numberOfElements':0,'content':[]},'recording':false,'forcedVideoCodec':'STR','allowTranscoding':false}";
	final protected String DEFAULT_JSON_PENDING_CONNECTION = "{'id':'STR','object':'connection','type':'WEBRTC','status':'pending','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':null,'location':null,'platform':null,'token':'STR','serverData':'STR','record':true,'role':'STR','kurentoOptions':null,'rtspUri':null,'adaptativeBitrate':null,'onlyPlayWithSubscribers':null,'networkCache':null,'clientData':null,'publishers':null,'subscribers':null}";
	final protected String DEFAULT_JSON_ACTIVE_CONNECTION = "{'id':'STR','object':'connection','type':'WEBRTC','status':'active','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':0,'location':'STR','platform':'STR','token':'STR','serverData':'STR','record':true,'role':'STR','kurentoOptions':null,'rtspUri':null,'adaptativeBitrate':null,'onlyPlayWithSubscribers':null,'networkCache':null,'clientData':'STR','publishers':[],'subscribers':[]}";
	final protected String DEFAULT_JSON_IPCAM_CONNECTION = "{'id':'STR','object':'connection','type':'IPCAM','status':'active','connectionId':'STR','sessionId':'STR','createdAt':0,'activeAt':0,'location':'STR','platform':'IPCAM','token':null,'serverData':'STR','record':true,'role':null,'kurentoOptions':null,'rtspUri':'STR','adaptativeBitrate':true,'onlyPlayWithSubscribers':true,'networkCache':2000,'clientData':null,'publishers':[],'subscribers':[]}";
	final protected String DEFAULT_JSON_TOKEN = "{'id':'STR','token':'STR','connectionId':'STR','createdAt':0,'session':'STR','role':'STR','data':'STR','kurentoOptions':{}}";

	protected static String OPENVIDU_SECRET = "MY_SECRET";
	protected static String OPENVIDU_URL = "https://localhost:4443/";
	protected static String APP_URL = "http://localhost:4200/";
	protected static String EXTERNAL_CUSTOM_LAYOUT_URL = "http://localhost:5555";
	protected static String EXTERNAL_CUSTOM_LAYOUT_PARAMS = "sessionId,CUSTOM_LAYOUT_SESSION,secret,MY_SECRET";
	protected static Exception ex = null;
	protected final Object lock = new Object();

	protected static final Logger log = LoggerFactory.getLogger(OpenViduTestAppE2eTest.class);
	protected static final CommandLineExecutor commandLine = new CommandLineExecutor();
	protected static final String RECORDING_IMAGE = "openvidu/openvidu-recording";

	protected MyUser user;
	protected Collection<MyUser> otherUsers = new ArrayList<>();
	protected volatile static boolean isRecordingTest;
	protected volatile static boolean isKurentoRestartTest;

	protected static VideoCodec defaultForcedVideoCodec;
	protected static boolean defaultAllowTranscoding;

	protected static OpenVidu OV;

	protected RecordingUtils recordingUtils = new RecordingUtils();

	protected static void checkFfmpegInstallation() {
		String ffmpegOutput = commandLine.executeCommand("which ffmpeg");
		if (ffmpegOutput == null || ffmpegOutput.isEmpty()) {
			log.error("ffmpeg package is not installed in the host machine");
			Assert.fail();
			return;
		} else {
			log.info("ffmpeg is installed and accesible");
		}
	}

	protected static void setupBrowserDrivers() {
		WebDriverManager.chromedriver().setup();
		WebDriverManager.firefoxdriver().setup();
		WebDriverManager.operadriver().setup();
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
	}

	protected void setupBrowser(String browser) {

		BrowserUser browserUser;

		switch (browser) {
		case "chrome":
			browserUser = new ChromeUser("TestUser", 50, false);
			break;
		case "firefox":
			browserUser = new FirefoxUser("TestUser", 50, false);
			break;
		case "firefoxDisabledOpenH264":
			browserUser = new FirefoxUser("TestUser", 50, true);
			break;
		case "opera":
			browserUser = new OperaUser("TestUser", 50);
			break;
		case "chromeAndroid":
			browserUser = new ChromeAndroidUser("TestUser", 50);
			break;
		case "chromeAlternateScreenShare":
			browserUser = new ChromeUser("TestUser", 50, "OpenVidu TestApp", false);
			break;
		case "chromeAsRoot":
			browserUser = new ChromeUser("TestUser", 50, true);
			break;
		default:
			browserUser = new ChromeUser("TestUser", 50, false);
		}

		this.user = new MyUser(browserUser);

		user.getDriver().get(APP_URL);

		WebElement urlInput = user.getDriver().findElement(By.id("openvidu-url"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		WebElement secretInput = user.getDriver().findElement(By.id("openvidu-secret"));
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);

		user.getEventManager().startPolling();
	}

	protected void setupChromeWithFakeVideo(Path videoFileLocation) {
		this.user = new MyUser(new ChromeUser("TestUser", 50, videoFileLocation));
		user.getDriver().get(APP_URL);
		WebElement urlInput = user.getDriver().findElement(By.id("openvidu-url"));
		urlInput.clear();
		urlInput.sendKeys(OPENVIDU_URL);
		WebElement secretInput = user.getDriver().findElement(By.id("openvidu-secret"));
		secretInput.clear();
		secretInput.sendKeys(OPENVIDU_SECRET);
		user.getEventManager().startPolling();
	}

	protected static void getDefaultTranscodingValues() throws Exception {
		CustomHttpClient restClient = new CustomHttpClient(OPENVIDU_URL, "OPENVIDUAPP", OPENVIDU_SECRET);
		JsonObject ovConfig = restClient.rest(HttpMethod.GET, "/openvidu/api/config", HttpStatus.SC_OK);
		defaultForcedVideoCodec = VideoCodec.valueOf(ovConfig.get("OPENVIDU_STREAMS_FORCED_VIDEO_CODEC").getAsString());
		defaultAllowTranscoding = ovConfig.get("OPENVIDU_STREAMS_ALLOW_TRANSCODING").getAsBoolean();
	}

	@AfterEach
	protected void dispose() {
		if (user != null) {
			user.dispose();
		}
		Iterator<MyUser> it = otherUsers.iterator();
		while (it.hasNext()) {
			MyUser other = it.next();
			other.dispose();
			it.remove();
		}
		try {
			OV.fetch();
		} catch (OpenViduJavaClientException | OpenViduHttpException e1) {
			log.error("Error fetching sessions: {}", e1.getMessage());
		}
		OV.getActiveSessions().forEach(session -> {
			try {
				session.close();
				log.info("Session {} successfully closed", session.getSessionId());
			} catch (OpenViduJavaClientException e) {
				log.error("Error closing session: {}", e.getMessage());
			} catch (OpenViduHttpException e) {
				log.error("Error closing session: {}", e.getMessage());
			}
		});
		if (isRecordingTest) {
			removeAllRecordingContiners();
			try {
				FileUtils.cleanDirectory(new File("/opt/openvidu/recordings"));
			} catch (IOException e) {
				log.error(e.getMessage());
			}
			isRecordingTest = false;
		}
		if (isKurentoRestartTest) {
			this.restartKms();
			isKurentoRestartTest = false;
		}
		OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
	}

	protected void listEmptyRecordings() {
		// List existing recordings (empty)
		user.getDriver().findElement(By.id("list-recording-btn")).click();
		user.getWaiter()
				.until(ExpectedConditions.attributeToBe(By.id("api-response-text-area"), "value", "Recording list []"));
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

	protected void gracefullyLeaveParticipants(int numberOfParticipants) throws Exception {
		int accumulatedConnectionDestroyed = 0;
		for (int j = 1; j <= numberOfParticipants; j++) {
			user.getDriver().findElement(By.id("remove-user-btn")).sendKeys(Keys.ENTER);
			user.getEventManager().waitUntilEventReaches("sessionDisconnected", j);
			accumulatedConnectionDestroyed = (j != numberOfParticipants)
					? (accumulatedConnectionDestroyed + numberOfParticipants - j)
					: (accumulatedConnectionDestroyed);
			user.getEventManager().waitUntilEventReaches("connectionDestroyed", accumulatedConnectionDestroyed);
		}
	}

	protected String getBase64Screenshot(MyUser user) throws Exception {
		String screenshotBase64 = ((TakesScreenshot) user.getDriver()).getScreenshotAs(BASE64);
		return "data:image/png;base64," + screenshotBase64;
	}

	protected void startKms() {
		log.info("Starting KMS");
		commandLine.executeCommand("/usr/bin/kurento-media-server &>> /kms.log &");
	}

	protected void stopKms() {
		log.info("Stopping KMS");
		commandLine.executeCommand("kill -9 $(pidof kurento-media-server)");
	}

	protected void restartKms() {
		this.stopKms();
		try {
			Thread.sleep(1000);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		this.startKms();
	}

	protected void checkDockerContainerRunning(String imageName, int amount) {
		int number = Integer.parseInt(commandLine.executeCommand("docker ps | grep " + imageName + " | wc -l"));
		Assert.assertEquals("Wrong number of Docker containers for image " + imageName + " running", amount, number);
	}

	protected void removeAllRecordingContiners() {
		commandLine.executeCommand("docker ps -a | awk '{ print $1,$2 }' | grep " + RECORDING_IMAGE
				+ " | awk '{print $1 }' | xargs -I {} docker rm -f {}");
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

}
