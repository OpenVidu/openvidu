package io.openvidu.test.e2e;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.lang3.tuple.Triple;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.containers.wait.strategy.WaitStrategy;
import org.testcontainers.utility.DockerImageName;

import io.livekit.server.IngressServiceClient;
import io.livekit.server.RoomServiceClient;
import io.openvidu.test.browsers.BrowserUser;
import io.openvidu.test.browsers.ChromeUser;
import io.openvidu.test.browsers.EdgeUser;
import io.openvidu.test.browsers.FirefoxUser;
import io.openvidu.test.browsers.utils.BrowserNames;
import io.openvidu.test.browsers.utils.CommandLineExecutor;
import livekit.LivekitIngress.IngressInfo;
import livekit.LivekitModels.Room;
import okhttp3.OkHttpClient;
import retrofit2.Response;

public class OpenViduTestE2e {

	private final static WaitStrategy waitBrowser = Wait.forLogMessage("^.*Started Selenium Standalone.*$", 1);

	protected static String RTSP_SERVER_IMAGE = "bluenviron/mediamtx:latest-ffmpeg";
	protected static int RTSP_SRT_PORT = 8554;

	// Key is the common name of the video codec. It must match the output log of
	// the RTSP server when receiving it.
	// Value is a pair with:
	// 1. The flag value of the ffmpeg command
	// 2. Any extra flags needed for that codec to work
	final protected static Map<String, Pair<String, ?>> FFMPEG_VIDEO_CODEC_NAMES = new HashMap<>() {
		{
			put("H264", Pair.of("libx264", ""));
			put("VP8", Pair.of("libvpx", ""));
			put("VP9", Pair.of("libvpx-vp9", ""));
			put("MPEG-4", Pair.of("mpeg4", ""));
			put("M-JPEG", Pair.of("mjpeg", "-force_duplicated_matrix:v 1 -huffman:v 0"));
			// put("AV1", Pair.of("libaom-av1", "")); // NOT SUPPORTED BY THE RTSP SERVER
			// (maybe gstreamer?)
			// put("H265", Pair.of("libx265", "")); // NOT SUPPORTED BY INGRESS
		}
	};

	// Key is the common name of the video codec. It must match the output log of
	// the RTSP server when receiving it.
	// Value is a triple with:
	// 1. The flag value of the ffmpeg command
	// 2. Any extra flags needed for that codec to work
	// 3. The string expected to appear on the server log when the stream starts
	final protected static Map<String, Triple<String, String, String>> FFMPEG_AUDIO_CODEC_NAMES = new HashMap<>() {
		{
			put("AAC", Triple.of("aac", "-ac 2 -b:a 128k", "MPEG-4 Audio"));
			put("AC3", Triple.of("ac3", "-b:a 128k", null));
			put("OPUS", Triple.of("libopus", "-ac 2", "Opus"));
			put("MP3", Triple.of("libmp3lame", "", "MPEG-1/2 Audio"));
			put("VORBIS", Triple.of("libvorbis", "", null));
			put("G711", Triple.of("pcm_mulaw", "", "G711"));
		}
	};

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
	protected static IngressServiceClient LK_INGRESS;

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
		map.put("SE_OPTS", "--port 4444");
		if (headless) {
			map.put("START_XVFB", "false");
		}
		if (maxBrowserSessions > 1) {
			map.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			map.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		GenericContainer<?> chrome = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(map).withNetworkMode("host")
				.waitingFor(waitBrowser);
		return chrome;
	}

	private GenericContainer<?> firefoxContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		Map<String, String> map = new HashMap<>();
		map.put("SE_OPTS", "--port 4445");
		if (headless) {
			map.put("START_XVFB", "false");
		}
		if (maxBrowserSessions > 1) {
			map.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			map.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		GenericContainer<?> firefox = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(map).withNetworkMode("host")
				.waitingFor(waitBrowser);
		return firefox;
	}

	private GenericContainer<?> edgeContainer(String image, long shmSize, int maxBrowserSessions, boolean headless) {
		Map<String, String> map = new HashMap<>();
		map.put("SE_OPTS", "--port 4446");
		if (headless) {
			map.put("START_XVFB", "false");
		}
		if (maxBrowserSessions > 1) {
			map.put("SE_NODE_OVERRIDE_MAX_SESSIONS", "true");
			map.put("SE_NODE_MAX_SESSIONS", String.valueOf(maxBrowserSessions));
		}
		GenericContainer<?> edge = new GenericContainer<>(DockerImageName.parse(image)).withSharedMemorySize(shmSize)
				.withFileSystemBind("/opt/openvidu", "/opt/openvidu").withEnv(map).withNetworkMode("host")
				.waitingFor(waitBrowser);
		return edge;
	}

	/**
	 * @return the rtsp URI where the stream is served
	 */
	public String startRtspServer(String videoCodec, String audioCodec) throws Exception {

		GenericContainer<?> rtspServerContainer = new GenericContainer<>(DockerImageName.parse(RTSP_SERVER_IMAGE))
				.withCreateContainerCmdModifier(cmd -> cmd.withName("rtsp-" + Math.random() * 100000))
				.withEnv(Map.of("MTX_LOGLEVEL", "info", "MTX_RTSPTRANSPORTS", "tcp", "MTX_RTSPADDRESS", ":" + RTSP_SRT_PORT,
						"MTX_HLS", "no", "MTX_RTSP", "yes", "MTX_WEBRTC", "yes", "MTX_SRT", "no", "MTX_RTMP", "no",
						"MTX_API", "no"))
				.withNetworkMode("host")
				.waitingFor(Wait.forLogMessage("^.*\\[RTSP\\] listener opened on :" + RTSP_SRT_PORT + ".*$", 1));

		rtspServerContainer.start();
		containers.add(rtspServerContainer);

		final String RTSP_PATH = "live";
		String fileUrl = getFileUrl(videoCodec != null, audioCodec != null, true);
		String codecs = getCodecs(videoCodec, audioCodec);
		String rtspServerIp = "host.docker.internal";

		String ffmpegCommand = "ffmpeg -i " + fileUrl + " " + codecs + " "
				+ " -async 50 -strict -2 -f rtsp -rtsp_transport tcp rtsp://" + rtspServerIp + ":" + RTSP_SRT_PORT + "/"
				+ RTSP_PATH;

		// Clean adjacent white spaces or the ffmpeg command will fail
		ffmpegCommand = ffmpegCommand.trim().replaceAll(" +", " ");

		GenericContainer<?> ffmpegPublishContainer = new GenericContainer<>(DockerImageName.parse(RTSP_SERVER_IMAGE))
				.withCreateContainerCmdModifier(cmd -> cmd.withName("ffmpeg-" + Math.random() * 100000))
				.withEnv("MTX_PATHS_RTSP_RUNONINIT", ffmpegCommand)
				.withExtraHost("host.docker.internal", "host-gateway")
				.waitingFor(Wait.forLogMessage(".*Press \\[q\\] to stop.*", 1));

		ffmpegPublishContainer.start();
		containers.add(ffmpegPublishContainer);

		// e.g. "[path live] stream is available and online, 2 tracks (H264, Opus)"
		if (videoCodec != null) {
			String regex = ".*\\[path " + RTSP_PATH + "\\] stream is available.*\\(.*(?i)(" + videoCodec + ").*\\).*";
			waitUntilLog(rtspServerContainer, regex, 15);
		}
		if (audioCodec != null) {
			String expectedValue = FFMPEG_AUDIO_CODEC_NAMES.get(audioCodec).getRight();
			String regex = ".*\\[path " + RTSP_PATH + "\\] stream is available.*\\(.*(?i)(" + expectedValue + ").*\\).*";
			waitUntilLog(rtspServerContainer, regex, 15);
		}

		return "rtsp://host.docker.internal:" + RTSP_SRT_PORT + "/" + RTSP_PATH;
	}

	/**
	 * @return the srt URI where the stream is served
	 */
	public String startSrtServer(String videoCodec, String audioCodec) throws Exception {

		String fileUrl = getFileUrl(videoCodec != null, audioCodec != null, true);
		String codecs = getCodecs(videoCodec, audioCodec);

		String ffmpegCommand = "ffmpeg -i " + fileUrl + " " + codecs + " -strict -2 -f mpegts srt://:" + RTSP_SRT_PORT
				+ "?mode=listener";

		// Clean adjacent white spaces or the ffmpeg command will fail
		ffmpegCommand = ffmpegCommand.trim().replaceAll(" +", " ");

		GenericContainer<?> srtServerContainer = new GenericContainer<>(DockerImageName.parse(RTSP_SERVER_IMAGE))
				.withCreateContainerCmdModifier(cmd -> cmd.withName("ffmpeg-" + Math.random() * 100000))
				.withEnv("MTX_PATHS_RTSP_RUNONINIT", ffmpegCommand)
				.waitingFor(Wait.forLogMessage(".*" + fileUrl + ".+", 1));

		srtServerContainer.start();
		containers.add(srtServerContainer);

		String srtServerIp = srtServerContainer.getContainerInfo().getNetworkSettings().getIpAddress();

		return "srt://" + srtServerIp + ":" + RTSP_SRT_PORT;
	}

	private void waitUntilLog(GenericContainer<?> container, String regex, int secondsTimeout) {
		int t = secondsTimeout * 2; // We wait half a second between retries
		Pattern pattern = Pattern.compile(regex);
		while (t > 0) {
			String logs = container.getLogs();
			if (pattern.matcher(logs).find()) {
				break;
			}
			try {
				Thread.sleep(500);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
			t--;
		}
		String logs = container.getLogs();
		if (!pattern.matcher(logs).find()) {
			System.err.println("Container logs:\n" + logs + "\nEnd of container logs\n");
			Assertions.fail("RTSP server has not published media in " + secondsTimeout + " seconds. Looking for regex "
					+ regex);
		}
	}

	private String getCodecs(String videoCodec, String audioCodec) {
		String codecs = " ";
		if (videoCodec != null) {
			String ffmpegVideoCodecFlag = FFMPEG_VIDEO_CODEC_NAMES.get(videoCodec).getLeft();
			codecs += " -vcodec " + ffmpegVideoCodecFlag + " ";
			codecs += FFMPEG_VIDEO_CODEC_NAMES.get(videoCodec).getRight() + " ";
		}
		if (audioCodec != null) {
			String ffmpegAudioCodecFlag = FFMPEG_AUDIO_CODEC_NAMES.get(audioCodec).getLeft();
			codecs += " -acodec " + ffmpegAudioCodecFlag + " ";
			codecs += FFMPEG_AUDIO_CODEC_NAMES.get(audioCodec).getMiddle() + " ";
		}
		codecs = codecs.trim().replaceAll(" +", " ");
		return " " + codecs + " ";
	}

	private String getFileUrl(boolean withVideo, boolean withAudio, boolean lossless) throws Exception {
		String fileUrl;
		if (withAudio && withVideo) {
			fileUrl = lossless
					? "https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_640x360_30fps_normal_fastdecode.mkv"
					: "https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_1080p_60fps_normal.mp4";
		} else if (!withAudio && withVideo) {
			fileUrl = lossless
					? "https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_640x360_30fps_normal_noaudio_fastdecode.mkv"
					: "https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_1080p_60fps_normal_noaudio.mp4";
		} else if (withAudio) {
			fileUrl = lossless
					? "https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_1080p_60fps_normal_onlyaudio_fastdecode.flac"
					: "https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_1080p_60fps_normal_onlyaudio.mp3";
		} else {
			throw new Exception("Must have audio or video");
		}
		return fileUrl;
	}

	protected static void setUpLiveKitClient() throws NoSuchAlgorithmException {
		URI uri = null;
		try {
			uri = new URI(LIVEKIT_URL);
		} catch (URISyntaxException e) {
			Assertions.fail("Wrong LIVEKIT_URL");
		}
		String url = (("wss".equals(uri.getScheme()) || "https".equals(uri.getScheme())) ? "https" : "http") + "://"
				+ uri.getAuthority() + uri.getPath();

		LK = RoomServiceClient.create(url.toString(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET, false,
				(okHttpClientBuilder) -> okHttpClientBuilder(okHttpClientBuilder));
		LK_INGRESS = IngressServiceClient.create(url.toString(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET, false);
	}

	private static OkHttpClient okHttpClientBuilder(okhttp3.OkHttpClient.Builder okHttpClientBuilder) {
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
		okHttpClientBuilder.sslSocketFactory(sslContext.getSocketFactory(), (X509TrustManager) trustAllCerts[0]);
		okHttpClientBuilder.hostnameVerifier((hostname, session) -> true);
		return okHttpClientBuilder.build();
	}

	protected static void loadEnvironmentVariables() {
		String appUrl = System.getProperty("APP_URL");
		if (appUrl != null) {
			APP_URL = appUrl;
		}
		log.info("Using URL {} to connect to openvidu-testapp", APP_URL);

		String livekitUrl = System.getProperty("LIVEKIT_URL");
		if (livekitUrl != null) {
			LIVEKIT_URL = livekitUrl;
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
		boolean headless = false;

		switch (browser) {
		case "chrome":
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
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			path = Paths.get("/opt/openvidu/barcode.y4m");
			checkMediafilePath(path);
			browserUser = new ChromeUser("TestUser", 50, path);
			break;
		case "chromeFakeAudio":
			container = chromeContainer("selenium/standalone-chrome:" + CHROME_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.CHROME, container, false);
			path = new File("/opt/openvidu/test.wav").toPath();
			try {
				checkMediafilePath(path);
			} catch (Exception e) {
				try {
					FileUtils.copyURLToFile(
							new URL("https://openvidu-loadtest-mediafiles.s3.amazonaws.com/interview.wav"),
							new File("/opt/openvidu/test.wav"), 60000, 60000);
				} catch (FileNotFoundException e2) {
					e2.printStackTrace();
					System.err.println("exception on: downLoadFile() function: " + e.getMessage());
				}
			}
			browserUser = new ChromeUser("TestUser", 50, null, path, headless);
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
			browserUser = new FirefoxUser("TestUser", 50, false, headless);
			break;
		case "firefoxDisabledOpenH264":
			container = firefoxContainer("selenium/standalone-firefox:" + FIREFOX_VERSION, 2147483648L, 1, true);
			setupBrowserAux(BrowserNames.FIREFOX, container, false);
			browserUser = new FirefoxUser("TestUser", 50, true, headless);
			break;
		case "edge":
			container = edgeContainer("selenium/standalone-edge:" + EDGE_VERSION, 2147483648L, 1, false);
			setupBrowserAux(BrowserNames.EDGE, container, false);
			browserUser = new EdgeUser("TestUser", 50, headless);
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

		// Dispose all browsers users
		Iterator<BrowserUser> it1 = browserUsers.iterator();
		while (it1.hasNext()) {
			BrowserUser u = it1.next();
			u.dispose();
			it1.remove();
		}

		// Stop and remove all containers
		Iterator<GenericContainer<?>> it2 = containers.iterator();
		while (it2.hasNext()) {
			GenericContainer<?> c = it2.next();
			c.stop();
			c.close();
			it2.remove();
		}
	}

	protected void closeAllRooms(RoomServiceClient client) {
		try {
			Response<List<Room>> response = client.listRooms().execute();
			if (response.isSuccessful()) {
				List<Room> roomList = response.body();
				if (roomList != null) {
					client.listRooms().execute().body().forEach(r -> {
						log.info("Closing existing room " + r.getName());
						try {
							log.info("Response: " + client.deleteRoom(r.getName()).execute().code());
						} catch (IOException e) {
							log.error("Error closing room " + r.getName(), e);
						}
					});
				}
			} else {
				log.error("Error listing rooms: " + response.errorBody());
			}
		} catch (Exception e) {
			log.error("Error closing rooms: {}", e.getMessage());
		}
	}

	protected void deleteAllIngresses(IngressServiceClient client) {
		try {
			Response<List<IngressInfo>> response = client.listIngress().execute();
			if (response.isSuccessful()) {
				List<IngressInfo> ingressList = response.body();
				if (ingressList != null) {
					client.listIngress().execute().body().forEach(i -> {
						log.info("Deleting existing ingress " + i.getName());
						try {
							log.info("Response: " + client.deleteIngress(i.getIngressId()).execute().code());
						} catch (IOException e) {
							log.error("Error deleting ingress " + i.getName(), e);
						}
					});
				}
			} else {
				log.error("Error listing ingresses: " + response.errorBody());
			}
		} catch (Exception e) {
			log.error("Error deleting ingresses: {}", e.getMessage());
		}
	}

	private void checkMediafilePath(Path path) throws Exception {
		if (!Files.exists(path)) {
			throw new Exception("File " + path.toAbsolutePath().toString() + " does not exist");
		} else if (!Files.isReadable(path)) {
			throw new Exception("File " + path.toAbsolutePath().toString() + " exists but is not readable");
		}
	}
}
