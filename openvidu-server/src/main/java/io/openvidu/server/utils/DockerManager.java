/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.server.utils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import javax.ws.rs.ProcessingException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerCmd;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.api.exception.ConflictException;
import com.github.dockerjava.api.exception.DockerClientException;
import com.github.dockerjava.api.exception.InternalServerErrorException;
import com.github.dockerjava.api.exception.NotFoundException;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.api.model.Frame;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.core.command.ExecStartResultCallback;
import com.github.dockerjava.core.command.PullImageResultCallback;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.recording.service.WaitForContainerStoppedCallback;

public class DockerManager {

	private static final Logger log = LoggerFactory.getLogger(DockerManager.class);

	DockerClient dockerClient;

	public DockerManager() {
		DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
		this.dockerClient = DockerClientBuilder.getInstance(config).build();
	}

	public void downloadDockerImage(String image, int secondsOfWait) throws Exception {
		try {
			this.dockerClient.pullImageCmd(image).exec(new PullImageResultCallback()).awaitCompletion(secondsOfWait,
					TimeUnit.SECONDS);
		} catch (NotFoundException | InternalServerErrorException e) {
			if (dockerImageExistsLocally(image)) {
				log.info("Docker image '{}' exists locally", image);
			} else {
				throw e;
			}
		} catch (DockerClientException e) {
			log.info("Error on Pulling '{}' image. Probably because the user has stopped the execution", image);
			throw e;
		} catch (InterruptedException e) {
			log.info("Error on Pulling '{}' image. Thread was interrupted: {}", image, e.getMessage());
			throw e;
		}
	}

	public boolean dockerImageExistsLocally(String image) throws ProcessingException {
		boolean imageExists = false;
		try {
			this.dockerClient.inspectImageCmd(image).exec();
			imageExists = true;
		} catch (NotFoundException nfe) {
			imageExists = false;
		} catch (ProcessingException e) {
			throw e;
		}
		return imageExists;
	}

	public void checkDockerEnabled() throws OpenViduException {
		try {
			this.dockerImageExistsLocally("hello-world");
			log.info("Docker is installed and enabled");
		} catch (ProcessingException exception) {
			throw new OpenViduException(Code.DOCKER_NOT_FOUND, "Exception connecting to Docker daemon");
		}
	}

	public String runContainer(String container, String containerName, List<Volume> volumes, List<Bind> binds,
			String networkMode, List<String> envs) throws Exception {

		CreateContainerCmd cmd = dockerClient.createContainerCmd(container).withEnv(envs);
		if (containerName != null) {
			cmd.withName(containerName);
		}

		HostConfig hostConfig = new HostConfig().withNetworkMode(networkMode);
		if (volumes != null) {
			cmd.withVolumes(volumes);
		}
		if (binds != null) {
			hostConfig.withBinds(binds);
		}

		cmd.withHostConfig(hostConfig);

		CreateContainerResponse response = null;
		try {
			response = cmd.exec();
			dockerClient.startContainerCmd(response.getId()).exec();
			log.info("Container ID: {}", response.getId());
			return response.getId();
		} catch (ConflictException e) {
			log.error(
					"The container name {} is already in use. Probably caused by a session with unique publisher re-publishing a stream",
					containerName);
			throw e;
		} catch (NotFoundException e) {
			log.error("Docker image {} couldn't be found in docker host", container);
			throw e;
		}
	}

	public void removeDockerContainer(String containerId, boolean force) {
		dockerClient.removeContainerCmd(containerId).withForce(force).exec();
	}

	public void cleanStrandedContainers(String imageName) {
		List<Container> existingContainers = this.dockerClient.listContainersCmd().withShowAll(true).exec();
		for (Container container : existingContainers) {
			if (container.getImage().startsWith(imageName)) {
				log.info("Stranded {} Docker container ({}) removed on startup", imageName, container.getId());
				this.dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
			}
		}
	}

	public String runCommandInContainer(String containerId, String command, int secondsOfWait)
			throws InterruptedException {
		ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId).withAttachStdout(true)
				.withAttachStderr(true).withCmd("bash", "-c", command).exec();
		CountDownLatch latch = new CountDownLatch(1);
		final String[] stringResponse = new String[1];
		dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(new ExecStartResultCallback() {
			@Override
			public void onNext(Frame item) {
				stringResponse[0] = new String(item.getPayload());
				latch.countDown();
			}
		});
		latch.await(secondsOfWait, TimeUnit.SECONDS);
		return stringResponse[0];
	}

	public void waitForContainerStopped(String containerId, int secondsOfWait) throws Exception {
		CountDownLatch latch = new CountDownLatch(1);
		WaitForContainerStoppedCallback callback = new WaitForContainerStoppedCallback(latch);
		dockerClient.waitContainerCmd(containerId).exec(callback);
		boolean stopped = false;
		try {
			stopped = latch.await(secondsOfWait, TimeUnit.SECONDS);
		} catch (InterruptedException e) {
			throw e;
		}
		if (!stopped) {
			throw new Exception();
		}
	}

	public String getContainerIp(String containerId) {
		try {
			return CommandExecutor.execCommand("/bin/sh", "-c",
					"docker inspect -f \"{{ .NetworkSettings.IPAddress }}\" " + containerId);
		} catch (IOException | InterruptedException e) {
			log.error(e.getMessage());
			return null;
		}
	}

	public List<String> getRunningContainers(String fullImageName) {
		List<String> containerIds = new ArrayList<>();
		List<Container> existingContainers = this.dockerClient.listContainersCmd().exec();
		for (Container container : existingContainers) {
			if (container.getImage().startsWith(fullImageName)) {
				containerIds.add(container.getId());
			}
		}
		return containerIds;
	}

	static public String getDockerGatewayIp() {
		try {
			return CommandExecutor.execCommand("/bin/sh", "-c",
					"docker network inspect bridge --format='{{(index .IPAM.Config 0).Gateway}}'");
		} catch (IOException | InterruptedException e) {
			log.error(e.getMessage());
			return null;
		}
	}

}
