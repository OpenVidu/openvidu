package io.openvidu.server.utils;

import java.util.Collection;

import io.openvidu.server.kurento.kms.Kms;

public class MediaNodeManagerDummy implements MediaNodeManager {

	@Override
	public void mediaNodeUsageRegistration(Kms kms, long timeOfConnection, Collection<Kms> existingKmss,
			boolean nodeRecovered) {
	}

	@Override
	public void mediaNodeUsageDeregistration(String mediaNodeId, long timeOfDisconnection) {
	}

	@Override
	public void dropIdleMediaNode(String mediaNodeId) {
	}

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
