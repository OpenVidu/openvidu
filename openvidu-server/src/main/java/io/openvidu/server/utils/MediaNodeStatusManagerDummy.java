package io.openvidu.server.utils;

public class MediaNodeStatusManagerDummy implements MediaNodeStatusManager {

	@Override
	public boolean isPending(String mediaNodeId) {
		return false;
	}

	@Override
	public boolean isRunning(String mediaNodeId) {
		return true;
	}

	@Override
	public boolean isShuttingDown(String mediaNodeId) {
		return false;
	}

	@Override
	public boolean isWaitingIdleToShuttingDown(String mediaNodeId) {
		return false;
	}

	@Override
	public void setStatus(String mediaNodeId, String status) {
	}

}
