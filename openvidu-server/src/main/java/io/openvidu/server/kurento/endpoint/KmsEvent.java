package io.openvidu.server.kurento.endpoint;

import org.kurento.client.MediaEvent;

public class KmsEvent {

	long timestamp;
	long msSinceCreation;
	String endpoint;
	MediaEvent event;

	public KmsEvent(MediaEvent event, long createdAt) {
		this.event = event;
		this.endpoint = event.getSource().getName();
		this.event.setSource(null);
		this.timestamp = System.currentTimeMillis();
		this.msSinceCreation = this.timestamp - createdAt;
	}
}