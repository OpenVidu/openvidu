package io.openvidu.server.kurento.endpoint;

import org.kurento.client.MediaEvent;

public class KmsEvent {

	long timestamp;
	MediaEvent event;

	public KmsEvent(MediaEvent event) {
		this.event = event;
		this.timestamp = System.currentTimeMillis();
	}
}