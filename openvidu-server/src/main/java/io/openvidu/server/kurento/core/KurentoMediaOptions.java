package io.openvidu.server.kurento.core;

import org.kurento.client.MediaElement;
import org.kurento.client.MediaType;

import io.openvidu.server.core.MediaOptions;

public class KurentoMediaOptions extends MediaOptions {

	public boolean isOffer;
	public String sdpOffer;
	public boolean doLoopback;
	public MediaElement loopbackAlternativeSrc;
	public MediaType loopbackConnectionType;
	public MediaElement[] mediaElements;

	public KurentoMediaOptions(boolean isOffer, String sdpOffer, MediaElement loopbackAlternativeSrc,
			MediaType loopbackConnectionType, boolean audioActive, boolean videoActive, String typeOfVideo,
			boolean doLoopback, MediaElement... mediaElements) {
		super(audioActive, videoActive, typeOfVideo);
		this.isOffer = isOffer;
		this.sdpOffer = sdpOffer;
		this.loopbackAlternativeSrc = loopbackAlternativeSrc;
		this.loopbackConnectionType = loopbackConnectionType;
		this.doLoopback = doLoopback;
		this.mediaElements = mediaElements;
	}

}
