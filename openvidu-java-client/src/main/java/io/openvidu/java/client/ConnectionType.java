package io.openvidu.java.client;

/**
 * See
 * {@link io.openvidu.java.client.Session#createConnection(ConnectionProperties)}
 */
public enum ConnectionType {

	/**
	 * WebRTC connection. This is the normal type of Connection for a regular user
	 * connecting to a session from an application.
	 */
	WEBRTC,

	/**
	 * IP camera connection. This is the type of Connection used by IP cameras to
	 * connect to a session.
	 */
	IPCAM
}
