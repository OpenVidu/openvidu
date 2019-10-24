package io.openvidu.server.utils;

public interface MediaNodeStatusManager {

	public boolean isLaunching(String mediaNodeId);

	public boolean isRunning(String mediaNodeId);

	public boolean isTerminating(String mediaNodeId);

	public boolean isWaitingIdleToTerminating(String mediaNodeId);

	public void setStatus(String mediaNodeId, String uri, String status, boolean sendConnectedEvent);

}
