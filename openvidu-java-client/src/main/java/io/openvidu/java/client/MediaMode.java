package io.openvidu.java.client;

public enum MediaMode {
	RELAYED, // The session will attempt to transmit streams directly between clients
	ROUTED	 // The session will transmit streams using OpenVidu Media Server
}
