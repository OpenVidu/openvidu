package io.openvidu.server.utils;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Volume;

public interface DockerManager {

	public DockerManager init();

	public String runContainer(String mediaNodeId, String image, String containerName, String user,
			List<Volume> volumes, List<Bind> binds, String networkMode, List<String> envs, List<String> command,
			Long shmSize, boolean privileged, Map<String, String> labels, boolean enableGPU) throws Exception;

	public void removeContainer(String mediaNodeId, String containerId, boolean force);

	public void runCommandInContainerSync(String mediaNodeId, String containerId, String command, int secondsOfWait)
			throws IOException;

	public void runCommandInContainerAsync(String mediaNodeId, String containerId, String command) throws IOException;

	public void waitForContainerStopped(String mediaNodeId, String containerId, int secondsOfWait) throws Exception;

}
