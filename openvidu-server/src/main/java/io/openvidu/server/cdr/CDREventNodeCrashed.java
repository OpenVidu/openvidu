package io.openvidu.server.cdr;

import java.util.ArrayList;
import java.util.List;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.server.kurento.kms.Kms;

public class CDREventNodeCrashed extends CDREvent {

	private Kms kms;
	private List<String> sessionIds = new ArrayList<>();
	private List<String> recordingIds = new ArrayList<>();
	private String environmentId;

	public CDREventNodeCrashed(CDREventName eventName, Long timeStamp, Kms kms, String environmentId) {
		super(eventName, null, null, timeStamp);
		this.kms = kms;
		kms.getKurentoSessions().forEach(session -> sessionIds.add(session.getSessionId()));
		kms.getActiveRecordings().forEach(entry -> recordingIds.add(entry.getKey()));
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

		JsonArray sIds = new JsonArray();
		this.sessionIds.forEach(sId -> sIds.add(sId));
		json.add("sessionIds", sIds);

		JsonArray rIds = new JsonArray();
		this.recordingIds.forEach(rId -> rIds.add(rId));
		json.add("recordingIds", rIds);

		return json;
	}

}
