package io.openvidu.java.client;

public enum OpenViduRole {
	SUBSCRIBER, // Can subscribe to published streams of other users
	PUBLISHER,  // SUBSCRIBER permissions + can subscribe to published streams of other users and publish their own streams
	MODERATOR;  // SUBSCRIBER + PUBLIHSER permissions + can force unpublish() and disconnect() over a third-party stream or user
}
