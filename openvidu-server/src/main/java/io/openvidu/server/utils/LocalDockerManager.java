/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import javax.ws.rs.ProcessingException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.async.ResultCallback;
import com.github.dockerjava.api.command.CreateContainerCmd;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.api.command.InspectContainerResponse;
import com.github.dockerjava.api.command.InspectContainerResponse.Mount;
import com.github.dockerjava.api.command.InspectImageResponse;
import com.github.dockerjava.api.command.PullImageResultCallback;
import com.github.dockerjava.api.exception.ConflictException;
import com.github.dockerjava.api.exception.DockerClientException;
import com.github.dockerjava.api.exception.InternalServerErrorException;
import com.github.dockerjava.api.exception.NotFoundException;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.api.model.DeviceRequest;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.jaxrs.JerseyDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import com.google.common.collect.ImmutableList;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.recording.service.WaitForContainerStoppedCallback;

public class LocalDockerManager implements DockerManager {

	private static final Logger log = LoggerFactory.getLogger(DockerManager.class);

	private DockerClient dockerClient;

	public LocalDockerManager(boolean init) {
		if (init) {
			this.init();
		}
	}

	@Override
	public DockerManager init() {
		DockerClientConfig dockerClientConfig = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
		DockerHttpClient dockerHttpClient = new JerseyDockerHttpClient.Builder()
				.dockerHost(dockerClientConfig.getDockerHost()).sslConfig(dockerClientConfig.getSSLConfig()).build();
		this.dockerClient = DockerClientBuilder.getInstance(dockerClientConfig).withDockerHttpClient(dockerHttpClient)
				.build();
		return this;
	}

	public void downloadDockerImage(String image, int secondsOfWait) throws Exception {
		try {
			// Pull image
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

	@Override
	public String runContainer(String mediaNodeId, String image, String containerName, String user,
			List<Volume> volumes, List<Bind> binds, String networkMode, List<String> envs, List<String> command,
			Long shmSize, boolean privileged, Map<String, String> labels, boolean enableGPU) throws Exception {

		CreateContainerCmd cmd = dockerClient.createContainerCmd(image).withEnv(envs);
		if (containerName != null) {
			cmd.withName(containerName);
		}

		if (user != null) {
			cmd.withUser(user);
		}

		HostConfig hostConfig = new HostConfig().withNetworkMode(networkMode).withPrivileged(privileged);
		if (shmSize != null) {
			hostConfig.withShmSize(shmSize);
		}

		if (enableGPU) {
			DeviceRequest deviceRequest = new DeviceRequest()
					.withCapabilities(ImmutableList.of(ImmutableList.of("gpu"))).withCount(-1).withOptions(null);
			hostConfig.withDeviceRequests(ImmutableList.of(deviceRequest));
		}

		if (volumes != null) {
			cmd.withVolumes(volumes);
		}
		if (binds != null) {
			hostConfig.withBinds(binds);
		}

		if (labels != null) {
			cmd.withLabels(labels);
		}

		if (command != null) {
			cmd.withCmd(command);
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
			log.error("Docker image {} couldn't be found in docker host", image);
			throw e;
		}
	}

	@Override
	public void removeContainer(String mediaNodeId, String containerId, boolean force) {
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

	@Override
	public void runCommandInContainerSync(String mediaNodeId, String containerId, String command, int secondsOfWait)
			throws IOException {
		ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId).withAttachStdout(true)
				.withAttachStderr(true).withCmd("bash", "-c", command).exec();
		CountDownLatch latch = new CountDownLatch(1);
		dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(new ResultCallback.Adapter<>() {
			@Override
			public void onComplete() {
				latch.countDown();
			}
		});
		try {
			latch.await(secondsOfWait, TimeUnit.SECONDS);
		} catch (InterruptedException e) {
			throw new IOException("Container " + containerId + " did not return from executing command \"" + command
					+ "\" in " + secondsOfWait + " seconds");
		}
	}

	@Override
	public void runCommandInContainerAsync(String mediaNodeId, String containerId, String command) throws IOException {
		ExecCreateCmdResponse execCreateCmdResponse = dockerClient.execCreateCmd(containerId).withAttachStdout(true)
				.withAttachStderr(true).withCmd("bash", "-c", command).exec();
		dockerClient.execStartCmd(execCreateCmdResponse.getId()).exec(new ResultCallback.Adapter<>() {
		});
	}

	@Override
	public void waitForContainerStopped(String mediaNodeId, String containerId, int secondsOfWait) throws Exception {
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
			return CommandExecutor.execCommand(5000, "/bin/sh", "-c",
					"docker inspect -f \"{{ .NetworkSettings.IPAddress }}\" " + containerId);
		} catch (IOException | InterruptedException e) {
			log.error(e.getMessage());
			return null;
		}
	}

	public List<String> getRunningContainers(String fullImageName) {
		List<String> containerIds = new ArrayList<>();
		List<Container> existingContainers = this.dockerClient.listContainersCmd()
				.withStatusFilter(Arrays.asList("created", "restarting", "running")).exec();
		for (Container container : existingContainers) {
			if (container.getImage().startsWith(fullImageName)) {
				containerIds.add(container.getId());
			} else if (container.getImageId().contains(fullImageName)) {
				containerIds.add(container.getId());
			}
		}
		return containerIds;
	}

	public List<Mount> getMountsForContainers(List<String> containers) {
		List<Mount> mounts = new ArrayList<>();
		for (String container : containers) {
			mounts.addAll(this.dockerClient.inspectContainerCmd(container).exec().getMounts());
		}
		return mounts;
	}

	public void removeVolume(String volumeId) throws NotFoundException {
		this.dockerClient.removeVolumeCmd(volumeId).exec();
	}

	public String getImageId(String fullImageName) {
		InspectImageResponse imageResponse = this.dockerClient.inspectImageCmd(fullImageName).exec();
		return imageResponse.getId();
	}

	public Map<String, String> getLabels(String containerId) {
		InspectContainerResponse containerInfo = dockerClient.inspectContainerCmd(containerId).exec();
		return containerInfo.getConfig().getLabels();
	}

	public void close() {
		try {
			this.dockerClient.close();
		} catch (IOException e) {
			log.error("Error closing DockerClient: {}", e.getMessage());
		}
	}

	static public String getDockerGatewayIp() {
		try {
			return CommandExecutor.execCommand(5000, "/bin/sh", "-c",
					"docker network inspect bridge --format='{{(index .IPAM.Config 0).Gateway}}'");
		} catch (IOException | InterruptedException e) {
			log.error(e.getMessage());
			return null;
		}
	}

}
