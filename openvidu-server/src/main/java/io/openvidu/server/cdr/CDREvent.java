package io.openvidu.server.cdr;

import org.json.simple.JSONObject;

import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.recording.Recording;

public class CDREvent implements Comparable<CDREvent> {

	static final String SESSION_CREATED = "sessionCreated";
	static final String SESSION_DESTROYED = "sessionDestroyed";
	static final String PARTICIPANT_JOINED = "participantJoined";
	static final String PARTICIPANT_LEFT = "participantLeft";
	static final String CONNECTION_CREATED = "webrtcConnectionCreated";
	static final String CONNECTION_DESTROYED = "webrtcConnectionDestroyed";
	static final String RECORDING_STARTED = "recordingStarted";
	static final String RECORDING_STOPPED = "recordingStopped";

	protected String eventName;
	protected String sessionId;
	protected Long timeStamp;
	private Long startTime;
	private Integer duration;
	private Participant participant;
	private MediaOptions mediaOptions;
	private String receivingFrom;
	private String reason;
	
	// Recording events
	private Long size;
	private String id;
	private String name;
	private Boolean hasAudio;
	private Boolean hasVideo;

	public CDREvent(String eventName, CDREvent event) {
		this(eventName, event.participant, event.sessionId, event.mediaOptions, event.receivingFrom, event.startTime, event.reason);
		this.duration = (int) (this.timeStamp - this.startTime / 1000);
	}
	
	public CDREvent(String eventName, CDREvent event, String reason) {
		this(eventName, event.participant, event.sessionId, event.mediaOptions, event.receivingFrom, event.startTime, reason);
		this.duration = (int) (this.timeStamp - this.startTime / 1000);
	}

	public CDREvent(String eventName, String sessionId) {
		this.eventName = eventName;
		if ((sessionId.indexOf('/')) != -1) {
			this.sessionId = sessionId.substring(sessionId.lastIndexOf('/') + 1, sessionId.length());
		} else {
			this.sessionId = sessionId;
		}
		this.timeStamp = System.currentTimeMillis();
		this.startTime = this.timeStamp;
	}
	
	public CDREvent(String eventName, String sessionId, Recording recording) {
		this.eventName = eventName;
		if ((sessionId.indexOf('/')) != -1) {
			this.sessionId = sessionId.substring(sessionId.lastIndexOf('/') + 1, sessionId.length());
		} else {
			this.sessionId = sessionId;
		}
		this.timeStamp = System.currentTimeMillis();
		this.id = recording.getId();
		this.name = recording.getName();
		this.duration = (int) recording.getDuration();
		this.size = recording.getSize();
		this.hasAudio = recording.hasAudio();
		this.hasVideo = recording.hasVideo();
	}

	public CDREvent(String eventName, Participant participant, String sessionId) {
		this(eventName, sessionId);
		this.participant = participant;
		this.startTime = this.timeStamp;
	}

	public CDREvent(String eventName, Participant participant, String sessionId, MediaOptions mediaOptions,
			String receivingFrom, Long startTime, String reason) {
		this(eventName, sessionId);
		this.participant = participant;
		this.mediaOptions = mediaOptions;
		this.receivingFrom = receivingFrom;
		this.startTime = startTime;
		this.reason = reason;
	}

	public MediaOptions getMediaOptions() {
		return mediaOptions;
	}

	public String getParticipantPublicId() {
		return this.participant.getParticipantPublicId();
	}

	public String getReceivingFrom() {
		return this.receivingFrom;
	}

	@Override
	@SuppressWarnings("unchecked")
	public String toString() {
		JSONObject json = new JSONObject();
		json.put("sessionId", this.sessionId);
		json.put("timestamp", this.timeStamp);

		if (this.participant != null) {
			json.put("participantId", this.participant.getParticipantPublicId());
		}
		if (this.mediaOptions != null) {
			json.put("connection", this.receivingFrom != null ? "INBOUND" : "OUTBOUND");
			json.put("audioEnabled", this.mediaOptions.audioActive);
			json.put("videoEnabled", this.mediaOptions.videoActive);
			if (this.mediaOptions.videoActive) {
				json.put("videoSource", this.mediaOptions.typeOfVideo);
				json.put("videoFramerate", this.mediaOptions.frameRate);
			}
			if (this.receivingFrom != null) {
				json.put("receivingFrom", this.receivingFrom);
			}
		}
		if (this.startTime != null && this.duration != null) {
			json.put("startTime", this.startTime);
			json.put("endTime", this.timeStamp);
			json.put("duration", (this.timeStamp - this.startTime) / 1000);
		} else if (this.duration != null) {
			json.put("duration", duration);
		}
		if (this.reason != null) {
			json.put("reason", this.reason);
		}
		if (this.id != null) {
			json.put("id", this.id);
		}
		if (this.name != null) {
			json.put("name", this.name);
		}
		if (this.size != null) {
			json.put("size", this.size);
		}
		if (this.hasAudio != null) {
			json.put("hasAudio", this.hasAudio);
		}
		if (this.hasVideo != null) {
			json.put("hasVideo", this.hasVideo);
		}

		JSONObject root = new JSONObject();
		root.put(this.eventName, json);

		return root.toJSONString();
	}

	@Override
	public int compareTo(CDREvent other) {
		if (this.participant.equals(other.participant)) {
			if (this.receivingFrom != null && other.receivingFrom != null) {
				if (this.receivingFrom.equals(other.receivingFrom)) {
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
