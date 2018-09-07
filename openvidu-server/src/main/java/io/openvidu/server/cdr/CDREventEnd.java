package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

public class CDREventEnd extends CDREvent {

	protected Long startTime;
	protected Integer duration;
	protected String reason;

	public CDREventEnd(CDREventName eventName, String sessionId, Long timestamp) {
		super(eventName, sessionId, timestamp);
	}

	public CDREventEnd(CDREventName eventName, String sessionId, Long startTime, String reason) {
		super(eventName, sessionId, System.currentTimeMillis());
		this.startTime = startTime;
		this.duration = (int) ((this.timeStamp - this.startTime) / 1000);
		this.reason = reason;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		if (this.startTime != null) {
			json.addProperty("startTime", this.startTime);
		}
		if (this.duration != null) {
			json.addProperty("duration", this.duration);
		}
		if (this.reason != null) {
			json.addProperty("reason", this.reason);
		}
		return json;
	}

}
