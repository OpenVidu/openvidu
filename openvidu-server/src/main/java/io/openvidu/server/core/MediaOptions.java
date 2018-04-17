package io.openvidu.server.core;

public class MediaOptions {
	
	public boolean audioActive;
	public boolean videoActive;
	public String typeOfVideo;
	public int frameRate;
	
	public MediaOptions(boolean audioActive, boolean videoActive, String typeOfVideo, int frameRate) {
		this.audioActive = audioActive;
		this.videoActive = videoActive;
		this.typeOfVideo = typeOfVideo;
		this.frameRate = frameRate;
	}

}
