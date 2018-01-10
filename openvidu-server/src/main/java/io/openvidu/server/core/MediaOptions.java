package io.openvidu.server.core;

public class MediaOptions {
	
	public boolean audioActive;
	public boolean videoActive;
	public String typeOfVideo;
	
	public MediaOptions(boolean audioActive, boolean videoActive, String typeOfVideo) {
		this.audioActive = audioActive;
		this.videoActive = videoActive;
		this.typeOfVideo = typeOfVideo;
	}

}
