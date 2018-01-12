package io.openvidu.server.cdr;

import java.text.SimpleDateFormat;
import java.util.Date;

import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;

public class CDRTransmission implements Comparable<CDRTransmission> {

	private Participant participant;
	private String sessionId;
	private MediaOptions mediaOptions;
	private Long timeOfStart;
	private Long timeOfEnd;
	private CDRTransmission receivingFrom;

	private SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd yyyy, HH:mm:ss");

	public CDRTransmission(Participant participant, String sessionId, MediaOptions mediaOptions, CDRTransmission receivingFrom) {
		this.participant = participant;
		this.sessionId = sessionId;
		this.mediaOptions = mediaOptions;
		this.receivingFrom = receivingFrom;
		this.timeOfStart = System.currentTimeMillis();
	}

	public Participant getParticipant() {
		return this.participant;
	}
	
	public String getSessionId() {
		return this.sessionId;
	}

	public MediaOptions getMediaOptions() {
		return this.mediaOptions;
	}

	public void endCall() {
		this.timeOfEnd = System.currentTimeMillis();
	}

	public String getDateOfStart() {
		return this.dateFormat.format(new Date(this.timeOfStart));
	}

	public String getDateOfEnd() {
		return this.dateFormat.format(new Date(this.timeOfEnd));
	}

	public int totalCallDuration() {
		return (int) ((this.timeOfEnd - this.timeOfStart) / 1000);
	}
	
	public boolean getAudioEnabled() {
		return this.mediaOptions.audioActive;
	}
	
	public boolean getVideoEnabled() {
		return this.mediaOptions.videoActive;
	}

	public String typeOfVideo() {
		if (!this.mediaOptions.videoActive) {
			return "VIDEO_NOT_ENABLED";
		} else {
			return this.mediaOptions.typeOfVideo;
		}
	}

	public CDRTransmission getReceivingFrom() {
		return this.receivingFrom;
	}

	@Override
	public int compareTo(CDRTransmission other) {
		if (this.participant.equals(other.participant)) {
			if (this.receivingFrom != null && other.receivingFrom != null) {
				if (this.receivingFrom.getParticipant().equals(other.receivingFrom.getParticipant())) {
					return 0;
				} else {
					return 1;
				}
			} else {
				if (this.receivingFrom == null && other.receivingFrom == null) {
					return 0;
				} else {
					return 1;
				}
			}
		}
		return 1;
	}

}
