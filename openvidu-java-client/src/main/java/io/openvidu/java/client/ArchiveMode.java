package io.openvidu.java.client;

public enum ArchiveMode {
	ALWAYS, // The session is archived automatically (as soon as there are clients publishing streams to the session)
	MANUAL; // The session is not archived automatically. To archive the session, you can call the OpenVidu.StartArchive() method
}

