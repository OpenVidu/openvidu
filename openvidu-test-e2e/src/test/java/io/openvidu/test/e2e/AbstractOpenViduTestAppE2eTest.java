package io.openvidu.test.e2e;

import static org.openqa.selenium.OutputType.BASE64;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.imageio.ImageIO;

import org.apache.commons.io.FileUtils;
import org.jcodec.api.FrameGrab;
import org.jcodec.api.JCodecException;
import org.jcodec.common.model.Picture;
import org.jcodec.scale.AWTUtil;
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

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;

import io.github.bonigarcia.wdm.WebDriverManager;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.ChromeAndroidUser;
import io.openvidu.test.browsers.ChromeUser;
import io.openvidu.test.browsers.FirefoxUser;
import io.openvidu.test.browsers.OperaUser;
import io.openvidu.test.browsers.utils.CommandLineExecutor;
import io.openvidu.test.browsers.utils.MultimediaFileMetadata;
import io.openvidu.test.browsers.utils.Unzipper;

public class AbstractOpenViduTestAppE2eTest {

	final protected String DEFAULT_JSON_SESSION = "{'id':'STR','object':'session','sessionId':'STR','createdAt':0,'mediaMode':'STR','recordingMode':'STR','defaultOutputMode':'STR','defaultRecordingLayout':'STR','customSessionId':'STR','connections':{'numberOfElements':0,'content':[]},'recording':false}";
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
	protected static OpenVidu OV;

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
			browserUser = new FirefoxUser("TestUser", 50);
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

	protected static boolean checkVideoAverageRgbGreen(Map<String, Long> rgb) {
		// GREEN color: {r < 15, g > 130, b <15}
		return (rgb.get("r") < 15) && (rgb.get("g") > 130) && (rgb.get("b") < 15);
	}

	protected static boolean checkVideoAverageRgbGray(Map<String, Long> rgb) {
		// GRAY color: {r < 50, g < 50, b < 50} and the absolute difference between them
		// not greater than 2
		return (rgb.get("r") < 50) && (rgb.get("g") < 50) && (rgb.get("b") < 50)
				&& (Math.abs(rgb.get("r") - rgb.get("g")) <= 2) && (Math.abs(rgb.get("r") - rgb.get("b")) <= 2)
				&& (Math.abs(rgb.get("b") - rgb.get("g")) <= 2);
	}

	protected static boolean checkVideoAverageRgbRed(Map<String, Long> rgb) {
		// RED color: {r > 240, g < 15, b <15}
		return (rgb.get("r") > 240) && (rgb.get("g") < 15) && (rgb.get("b") < 15);
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

	protected boolean recordedFileFine(File file, Recording recording,
			Function<Map<String, Long>, Boolean> colorCheckFunction) throws IOException {
		this.checkMultimediaFile(file, recording.hasAudio(), recording.hasVideo(), recording.getDuration(),
				recording.getResolution(), "aac", "h264", true);

		boolean isFine = false;
		Picture frame;
		try {
			// Get a frame at 75% duration and check that it has the expected color
			frame = FrameGrab.getFrameAtSec(file, (double) (recording.getDuration() * 0.75));
			BufferedImage image = AWTUtil.toBufferedImage(frame);
			Map<String, Long> colorMap = this.averageColor(image);

			String realResolution = image.getWidth() + "x" + image.getHeight();
			Assert.assertEquals(
					"Resolution (" + recording.getResolution()
							+ ") of recording entity is not equal to real video resolution (" + realResolution + ")",
					recording.getResolution(), realResolution);

			log.info("Recording map color: {}", colorMap.toString());
			log.info("Recording frame below");
			System.out.println(bufferedImageToBase64PngString(image));
			isFine = colorCheckFunction.apply(colorMap);
		} catch (IOException | JCodecException e) {
			log.warn("Error getting frame from video recording: {}", e.getMessage());
			isFine = false;
		}
		return isFine;
	}

	protected boolean recordedGreenFileFine(File file, Recording recording) throws IOException {
		return this.recordedFileFine(file, recording, OpenViduTestAppE2eTest::checkVideoAverageRgbGreen);
	}

	protected boolean recordedRedFileFine(File file, Recording recording) throws IOException {
		return this.recordedFileFine(file, recording, OpenViduTestAppE2eTest::checkVideoAverageRgbRed);
	}

	protected String bufferedImageToBase64PngString(BufferedImage image) {
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		String imageString = null;
		try {
			ImageIO.write(image, "png", bos);
			byte[] imageBytes = bos.toByteArray();
			imageString = "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes);
			bos.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		return imageString;
	}

	protected void checkIndividualRecording(String recPath, Recording recording, int numberOfVideoFiles,
			String audioDecoder, String videoDecoder, boolean checkAudio) throws IOException {

		// Should be only 2 files: zip and metadata
		File folder = new File(recPath);
		Assert.assertEquals("There are more than 2 files (ZIP and metadata) inside individual recording folder "
				+ recPath + ": " + Arrays.toString(folder.listFiles()), 2, folder.listFiles().length);

		File file1 = new File(recPath + recording.getName() + ".zip");
		File file2 = new File(recPath + ".recording." + recording.getId());

		Assert.assertTrue("File " + file1.getAbsolutePath() + " does not exist or is empty",
				file1.exists() && file1.length() > 0);
		Assert.assertTrue("File " + file2.getAbsolutePath() + " does not exist or is empty",
				file2.exists() && file2.length() > 0);

		List<File> unzippedWebmFiles = new Unzipper().unzipFile(recPath, recording.getName() + ".zip");

		Assert.assertEquals("Expecting " + numberOfVideoFiles + " videos inside ZIP file but "
				+ unzippedWebmFiles.size() + " found: " + unzippedWebmFiles.toString(), numberOfVideoFiles,
				unzippedWebmFiles.size());

		File jsonSyncFile = new File(recPath + recording.getName() + ".json");
		Assert.assertTrue("JSON sync file " + jsonSyncFile.getAbsolutePath() + "does not exist or is empty",
				jsonSyncFile.exists() && jsonSyncFile.length() > 0);

		JsonObject jsonSyncMetadata;
		try {
			Gson gson = new Gson();
			JsonReader reader = new JsonReader(new FileReader(jsonSyncFile));
			jsonSyncMetadata = gson.fromJson(reader, JsonObject.class);
		} catch (Exception e) {
			log.error("Cannot read JSON sync metadata file from {}. Error: {}", jsonSyncFile.getAbsolutePath(),
					e.getMessage());
			Assert.fail("Cannot read JSON sync metadata file from " + jsonSyncFile.getAbsolutePath());
			return;
		}

		long totalFileSize = 0;
		JsonArray syncArray = jsonSyncMetadata.get("files").getAsJsonArray();
		for (File webmFile : unzippedWebmFiles) {
			totalFileSize += webmFile.length();

			Assert.assertTrue("WEBM file " + webmFile.getAbsolutePath() + " does not exist or is empty",
					webmFile.exists() && webmFile.length() > 0);

			double durationInSeconds = 0;
			boolean found = false;
			for (int i = 0; i < syncArray.size(); i++) {
				JsonObject j = syncArray.get(i).getAsJsonObject();
				if (webmFile.getName().contains(j.get("streamId").getAsString())) {
					durationInSeconds = (double) (j.get("endTimeOffset").getAsDouble()
							- j.get("startTimeOffset").getAsDouble()) / 1000;
					found = true;
					break;
				}
			}

			Assert.assertTrue("Couldn't find in JSON sync object information for webm file " + webmFile.getName(),
					found);

			log.info("Duration of {} according to sync metadata json file: {} s", webmFile.getName(),
					durationInSeconds);
			this.checkMultimediaFile(webmFile, recording.hasAudio(), recording.hasVideo(), durationInSeconds,
					recording.getResolution(), audioDecoder, videoDecoder, checkAudio);
			webmFile.delete();
		}

		Assert.assertEquals("Size of recording entity (" + recording.getSessionId()
				+ ") is not equal to real file size (" + totalFileSize + ")", recording.getSize(), totalFileSize);

		jsonSyncFile.delete();
	}

	protected void checkMultimediaFile(File file, boolean hasAudio, boolean hasVideo, double duration,
			String resolution, String audioDecoder, String videoDecoder, boolean checkAudio) throws IOException {
		// Check tracks, duration, resolution, framerate and decoders
		MultimediaFileMetadata metadata = new MultimediaFileMetadata(file.getAbsolutePath());

		if (hasVideo) {
			if (checkAudio) {
				if (hasAudio) {
					Assert.assertTrue("Media file " + file.getAbsolutePath() + " should have audio",
							metadata.hasAudio() && metadata.hasVideo());
					Assert.assertTrue(metadata.getAudioDecoder().toLowerCase().contains(audioDecoder));
				} else {
					Assert.assertTrue("Media file " + file.getAbsolutePath() + " should have video",
							metadata.hasVideo());
					Assert.assertFalse(metadata.hasAudio());
				}
			}
			if (resolution != null) {
				Assert.assertEquals(resolution, metadata.getVideoWidth() + "x" + metadata.getVideoHeight());
			}
			Assert.assertTrue(metadata.getVideoDecoder().toLowerCase().contains(videoDecoder));
		} else if (hasAudio && checkAudio) {
			Assert.assertTrue(metadata.hasAudio());
			Assert.assertFalse(metadata.hasVideo());
			Assert.assertTrue(metadata.getAudioDecoder().toLowerCase().contains(audioDecoder));
		} else {
			Assert.fail("Cannot check a file witho no audio and no video");
		}
		// Check duration with 1 decimal precision
		DecimalFormat df = new DecimalFormat("#0.0");
		df.setRoundingMode(RoundingMode.UP);
		log.info("Duration of {} according to ffmpeg: {} s", file.getName(), metadata.getDuration());
		log.info("Duration of {} according to 'duration' property: {} s", file.getName(), duration);
		log.info("Difference in s duration: {}", Math.abs(metadata.getDuration() - duration));
		final double difference = 10;
		Assert.assertTrue(
				"Difference between recording entity duration (" + duration + ") and real video duration ("
						+ metadata.getDuration() + ") is greater than " + difference + "  in file " + file.getName(),
				Math.abs((metadata.getDuration() - duration)) < difference);
	}

	protected boolean thumbnailIsFine(File file, Function<Map<String, Long>, Boolean> colorCheckFunction) {
		boolean isFine = false;
		BufferedImage image = null;
		try {
			image = ImageIO.read(file);
		} catch (IOException e) {
			log.error(e.getMessage());
			return false;
		}
		log.info("Recording thumbnail dimensions: {}x{}", image.getWidth(), image.getHeight());
		Map<String, Long> colorMap = this.averageColor(image);
		log.info("Thumbnail map color: {}", colorMap.toString());
		isFine = colorCheckFunction.apply(colorMap);
		return isFine;
	}

	protected Map<String, Long> averageColor(BufferedImage bi) {
		int x0 = 0;
		int y0 = 0;
		int w = bi.getWidth();
		int h = bi.getHeight();
		int x1 = x0 + w;
		int y1 = y0 + h;
		long sumr = 0, sumg = 0, sumb = 0;
		for (int x = x0; x < x1; x++) {
			for (int y = y0; y < y1; y++) {
				Color pixel = new Color(bi.getRGB(x, y));
				sumr += pixel.getRed();
				sumg += pixel.getGreen();
				sumb += pixel.getBlue();
			}
		}
		int num = w * h;
		Map<String, Long> colorMap = new HashMap<>();
		colorMap.put("r", (long) (sumr / num));
		colorMap.put("g", (long) (sumg / num));
		colorMap.put("b", (long) (sumb / num));
		return colorMap;
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
