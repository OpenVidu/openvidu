package io.openvidu.server.cdr;

import com.google.gson.JsonObject;

import io.openvidu.server.kurento.kms.Kms;

public class CDREventNodeCrashed extends CDREvent {

	private Kms kms;
	private String environmentId;

	public CDREventNodeCrashed(CDREventName eventName, Long timeStamp, Kms kms, String environmentId) {
		super(eventName, null, null, timeStamp);
		this.kms = kms;
		this.environmentId = environmentId;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		json.addProperty("id", this.kms.getId());
		if (this.environmentId != null) {
			json.addProperty("environmentId", this.environmentId);
		}
		json.addProperty("ip", this.kms.getIp());
		json.addProperty("uri", this.kms.getUri());
		return json;
	}

}
