package io.openvidu.server.utils;

public class MediaNodeStatusManagerDummy implements MediaNodeStatusManager {

	@Override
	public boolean isLaunching(String mediaNodeId) {
		return false;
	}

	@Override
	public boolean isCanceled(String mediaNodeId) {
		return false;
	}

	@Override
	public boolean isRunning(String mediaNodeId) {
		return true;
	}

	@Override
	public boolean isTerminating(String mediaNodeId) {
		return false;
	}

	@Override
	public boolean isWaitingIdleToTerminate(String mediaNodeId) {
		return false;
	}

}
