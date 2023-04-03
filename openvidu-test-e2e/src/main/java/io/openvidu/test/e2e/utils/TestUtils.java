package io.openvidu.test.e2e.utils;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.concurrent.TimeoutException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.test.browsers.utils.CommandLineExecutor;
import io.openvidu.test.e2e.MediaNodeDockerUtils;

public class TestUtils {

	private static final Logger log = LoggerFactory.getLogger(TestUtils.class);
	private static final CommandLineExecutor commandLine = new CommandLineExecutor();

	/**
	 * https://github.com/tiangolo/nginx-rtmp-docker
	 * 
	 * @return The IP address of the Docker container
	 * @throws InterruptedException
	 */
	public static String startRtmpServer() throws IOException, TimeoutException, InterruptedException {
		File file = writeRtmpServerConfigInFile();
		String dockerRunCommand = "docker run -d --name broadcast-nginx -p 1935:1935 -v " + file.getAbsolutePath()
				+ ":/etc/nginx/nginx.conf tiangolo/nginx-rtmp";
		commandLine.executeCommand(dockerRunCommand, 30);
		return waitForContainerIpAddress("broadcast-nginx", 10);
	}

	public static void stopRtmpServer() {
		String dockerRemoveCommand = "docker rm -f broadcast-nginx";
		commandLine.executeCommand(dockerRemoveCommand, 10);
	}

	private static String waitForContainerIpAddress(String containerNameOrId, int secondsTimeout)
			throws TimeoutException, UnknownHostException, InterruptedException {
		long currentTime = System.currentTimeMillis();
		long maxTime = currentTime + (secondsTimeout * 1000);
		while (System.currentTimeMillis() < maxTime) {
			try {
				String ip = MediaNodeDockerUtils.getContainerIp(containerNameOrId);
				if (ip.isBlank()) {
					log.warn("Container IP address is empty for container {}", containerNameOrId);
				} else {
					return ip;
				}
			} catch (Exception e) {
				log.error("Error obtaining container IP address for container {}: {}", containerNameOrId,
						e.getMessage());
			}
			Thread.sleep(50);
		}
		throw new TimeoutException();
	}

	private static File writeRtmpServerConfigInFile() throws IOException {
		String newLine = System.getProperty("line.separator");
		// @formatter:off
		String config = String.join(newLine,
                "worker_processes auto;",
                "rtmp_auto_push on;",
                "events {}",
                "rtmp {",
                "    server {",
                "        listen 1935;",
                "        listen [::]:1935 ipv6only=on;",
                "        application live {",
                "        	live on;",
                "			recorder all {",
                "				record video;",
                "				record_path /tmp;",
                "				record_max_size 100000K;",
                "				record_unique on;",
                "				record_suffix rtmp.flv;",
                "			}",
                "        }",
                "    }",
                "}");
		// @formatter:on
		Files.createDirectories(Paths.get("/opt/openvidu/tmp/"));
		File tmpFile = File.createTempFile("broadcast-nginx", ".conf", new File("/opt/openvidu/tmp/"));
		FileWriter writer = new FileWriter(tmpFile);
		writer.write(config);
		writer.close();
		return tmpFile;
	}

}
