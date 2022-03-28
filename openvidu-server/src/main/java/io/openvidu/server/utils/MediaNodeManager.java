package io.openvidu.server.utils;

import java.util.Collection;

import io.openvidu.server.kurento.kms.Kms;

public interface MediaNodeManager {

	public void mediaNodeUsageRegistration(Kms kms, long timeOfConnection, Collection<Kms> existingKmss, boolean nodeRecovered);

	public void mediaNodeUsageDeregistration(String mediaNodeId, long timeOfDisconnection);

	public void dropIdleMediaNode(String mediaNodeId);

	public boolean isLaunching(String mediaNodeId);

	public boolean isCanceled(String mediaNodeId);

	public boolean isRunning(String mediaNodeId);

	public boolean isTerminating(String mediaNodeId);

	public boolean isWaitingIdleToTerminate(String mediaNodeId);

}
