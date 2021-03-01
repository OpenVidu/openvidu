package io.openvidu.server.cdr;

import org.kurento.client.GenericMediaEvent;
import org.kurento.jsonrpc.Props;

import com.google.gson.JsonObject;

public class CDREventFilterEvent extends CDREvent {

	private GenericMediaEvent event;
	private String connectionId;
	private String streamId;
	private String filterType;

	public CDREventFilterEvent(String sessionId, String uniqueSessionId, String connectionId, String streamId,
			String filterType, GenericMediaEvent event) {
		super(CDREventName.filterEventDispatched, sessionId, uniqueSessionId,
				Long.parseLong(event.getTimestampMillis()));
		this.event = event;
		this.connectionId = connectionId;
		this.streamId = streamId;
		this.filterType = filterType;
	}

	public String getEventType() {
		return this.event.getType();
	}

	public Props getEventData() {
		return this.event.getData();
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		// TODO: remove deprecated "participantId" when possible
		json.addProperty("participantId", this.connectionId);
		json.addProperty("connectionId", this.connectionId);
		json.addProperty("streamId", this.streamId);
		json.addProperty("filterType", this.filterType);
		json.addProperty("eventType", this.event.getType());
		json.addProperty("data", this.event.getData().toString());
		return json;
	}

}
