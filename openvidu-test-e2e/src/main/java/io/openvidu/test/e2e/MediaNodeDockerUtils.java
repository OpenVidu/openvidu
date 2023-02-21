package io.openvidu.test.e2e;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.async.ResultCallback;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.jaxrs.JerseyDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;

public class MediaNodeDockerUtils {

	private static final Logger log = LoggerFactory.getLogger(MediaNodeDockerUtils.class);

	public static void crashMediaNode(String containerId) {
		log.info("Stopping Media Node container");
		DockerClient dockerClient = getDockerClient();
		dockerClient.removeContainerCmd(containerId).withForce(true).exec();
	}

	public static String getContainerIp(String containerId) {
		DockerClient dockerClient = getDockerClient();
		return dockerClient.inspectContainerCmd(containerId).exec().getNetworkSettings().getNetworks().get("bridge")
				.getIpAddress();
	}

	public static void crashMediaServerInsideMediaNode(String containerId) {
		log.info("Stopping KMS container inside Media Node");
		DockerClient dockerClient = getDockerClient();
		ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId).withAttachStdout(true)
				.withAttachStderr(true).withCmd("bash", "-c", "docker rm -f kms").exec();

		dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(new ResultCallback.Adapter<>() {
		});

	}

	public static void stopMediaServerInsideMediaNodeAndRecover(String containerId, int millisStop) {
		log.info("Stopping and starting KMS container inside Media Node " + containerId + "waiting " + millisStop
				+ " ms");
		DockerClient dockerClient = getDockerClient();
		ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId).withAttachStdout(true)
				.withAttachStderr(true)
				.withCmd("bash", "-c", "docker stop kms && sleep " + (millisStop / 1000) + " && docker start kms")
				.exec();
		dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(new ResultCallback.Adapter<>() {
		});
	}

	public static DockerClient getDockerClient() {
		DockerClientConfig dockerClientConfig = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
		DockerHttpClient dockerHttpClient = new JerseyDockerHttpClient.Builder()
				.dockerHost(dockerClientConfig.getDockerHost()).sslConfig(dockerClientConfig.getSSLConfig()).build();
		return DockerClientBuilder.getInstance(dockerClientConfig).withDockerHttpClient(dockerHttpClient).build();
	}

}
