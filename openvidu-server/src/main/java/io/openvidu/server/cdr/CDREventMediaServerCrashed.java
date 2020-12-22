package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.server.kurento.kms.Kms;

public class CDREventMediaServerCrashed extends CDREvent {

	private Kms kms;

	public CDREventMediaServerCrashed(CDREventName eventName, String sessionId, Long timeStamp, Kms kms) {
		super(eventName, sessionId, timeStamp);
		this.kms = kms;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("id", this.kms.getId());
		json.addProperty("ip", this.kms.getIp());
		json.addProperty("uri", this.kms.getUri());
		return json;
	}

}
