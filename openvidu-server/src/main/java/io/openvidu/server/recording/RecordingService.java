package io.openvidu.server.recording;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerCmd;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.api.exception.ConflictException;
import com.github.dockerjava.api.exception.DockerClientException;
import com.github.dockerjava.api.exception.InternalServerErrorException;
import com.github.dockerjava.api.exception.NotFoundException;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.core.command.ExecStartResultCallback;
import com.github.dockerjava.core.command.PullImageResultCallback;

import io.openvidu.server.CommandExecutor;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Session;

@Service
public class RecordingService {

	private Logger log = LoggerFactory.getLogger(RecordingService.class);

	@Autowired
	OpenviduConfig openviduConfig;

	private static final Map<String, String> createdContainers = new HashMap<>();
	private final String IMAGE_NAME = "openvidu/openvidu-recording";

	private DockerClient dockerClient;
	private Map<String, String> recordingSessions = new HashMap<>();;

	public RecordingService() {
		DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
		this.dockerClient = DockerClientBuilder.getInstance(config).build();
	}

	public void startRecording(Session session) {
		List<String> envs = new ArrayList<>();
		String shortSessionId = session.getSessionId().substring(session.getSessionId().lastIndexOf('/') + 1,
				session.getSessionId().length());
		String secret = openviduConfig.getOpenViduSecret();

		String uid = null;
		try {
			uid = System.getenv("MY_UID");
			if (uid==null) {
				uid = CommandExecutor.execCommand("/bin/sh", "-c", "id -u " + System.getProperty("user.name"));
			}
		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}

		envs.add("URL=https://OPENVIDUAPP:" + secret + "@localhost:8443/#/layout-best-fit/" + shortSessionId + "/"
				+ secret);
		envs.add("RESOLUTION=1920x1080");
		envs.add("FRAMERATE=30");
		envs.add("VIDEO_NAME=" + shortSessionId);
		envs.add("VIDEO_FORMAT=mp4");
		envs.add("USER_ID=" + uid);

		System.out.println(
				"https://OPENVIDUAPP:" + secret + "@localhost:8443/#/layout-best-fit/" + shortSessionId + "/" + secret);

		String containerId = this.runRecordingContainer(envs, "recording" + shortSessionId);
		this.recordingSessions.putIfAbsent(session.getSessionId(), containerId);
	}

	public void stopRecording(Session session) {
		String containerId = this.recordingSessions.remove(session.getSessionId());
		ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId)
				.withAttachStdout(true)
        		.withAttachStderr(true)
        		.withCmd("bash", "-c", "echo 'q' > stop")
        		.exec();
        try {
			dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(new ExecStartResultCallback()).awaitCompletion();
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		this.stopDockerContainer(containerId);
		this.removeDockerContainer(containerId);
	}
	
	public boolean recordingImageExistsLocally() {
		boolean imageExists = false;
		try {
			dockerClient.inspectImageCmd(IMAGE_NAME).exec();
			imageExists = true;
		} catch (NotFoundException nfe) {
			imageExists = false;
		}
		return imageExists;
	}

	public void downloadRecordingImage() {
		try {
			dockerClient.pullImageCmd(IMAGE_NAME).exec(new PullImageResultCallback()).awaitSuccess();
		} catch (NotFoundException | InternalServerErrorException e) {
			if (imageExistsLocally(IMAGE_NAME)) {
				log.info("Docker image '{}' exists locally", IMAGE_NAME);
			} else {
				throw e;
			}
		} catch (DockerClientException e) {
			log.info("Error on Pulling '{}' image. Probably because the user has stopped the execution",
					IMAGE_NAME);
			throw e;
		}
	}

	private String runRecordingContainer(List<String> envs, String containerName) {
		Volume volume1 = new Volume("/recordings");
		CreateContainerCmd cmd = dockerClient.createContainerCmd(IMAGE_NAME).withName(containerName).withEnv(envs)
				.withNetworkMode("host").withVolumes(volume1)
				.withBinds(new Bind(openviduConfig.getOpenViduRecordingPath(), volume1));
		CreateContainerResponse container = null;
		try {
			container = cmd.exec();
			dockerClient.startContainerCmd(container.getId()).exec();
			createdContainers.put(container.getId(), containerName);
			log.info("Container ID: {}", container.getId());
			return container.getId();
		} catch (ConflictException e) {
			log.error(
					"The container name {} is already in use. Probably caused by a session with unique publisher re-publishing a stream",
					containerName);
			return null;
		}
	}

	private void removeDockerContainer(String containerId) {
		dockerClient.removeContainerCmd(containerId).exec();
		createdContainers.remove(containerId);
	}

	private void stopDockerContainer(String containerId) {
		dockerClient.stopContainerCmd(containerId).exec();
	}

	private boolean imageExistsLocally(String imageName) {
		boolean imageExists = false;
		try {
			dockerClient.inspectImageCmd(imageName).exec();
			imageExists = true;
		} catch (NotFoundException nfe) {
			imageExists = false;
		}
		return imageExists;
	}

}
