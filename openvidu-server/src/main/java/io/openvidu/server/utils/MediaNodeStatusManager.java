package io.openvidu.server.utils;

public interface MediaNodeStatusManager {

	public boolean isPending(String mediaNodeId);

	public boolean isRunning(String mediaNodeId);

	public boolean isShuttingDown(String mediaNodeId);

	public boolean isWaitingIdleToShuttingDown(String mediaNodeId);

	public void setStatus(String mediaNodeId, String status);

}
