package io.openvidu.server.cdr;

import java.util.List;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class CDREventNodeCrashed extends CDREvent {

	public enum NodeRole {
		masternode, medianode
	}

	private String id;
	private String environmentId;
	private String ip;
	private String uri;
	private NodeRole nodeRole;
	private List<String> sessionIds;
	private List<String> recordingIds;
	private String clusterId;

	public CDREventNodeCrashed(Long timeStamp, String id, String environmentId, String ip, String uri,
			NodeRole nodeRole, List<String> sessionIds, List<String> recordingIds, String clusterId) {
		super(CDREventName.nodeCrashed, null, null, timeStamp);
		this.id = id;
		this.environmentId = environmentId;
		this.ip = ip;
		this.uri = uri;
		this.nodeRole = nodeRole;
		this.sessionIds = sessionIds;
		this.recordingIds = recordingIds;
		this.clusterId = clusterId;
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();

		json.addProperty("id", this.id);
		if (this.environmentId != null) {
			json.addProperty("environmentId", this.environmentId);
		}
		json.addProperty("ip", this.ip);
		json.addProperty("uri", this.uri);
		json.addProperty("nodeRole", this.nodeRole.name());

		JsonArray sIds = new JsonArray();
		this.sessionIds.forEach(sId -> sIds.add(sId));
		json.add("sessionIds", sIds);

		JsonArray rIds = new JsonArray();
		this.recordingIds.forEach(rId -> rIds.add(rId));
		json.add("recordingIds", rIds);
		json.addProperty("clusterId", this.clusterId);

		return json;
	}

}
