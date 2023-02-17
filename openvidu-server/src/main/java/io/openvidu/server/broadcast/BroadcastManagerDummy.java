package io.openvidu.server.broadcast;

import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Session;

public class BroadcastManagerDummy implements BroadcastManager {

	@Override
	public boolean sessionIsBeingBroadcasted(String sessionId) {
		return false;
	}

	@Override
	public void stopBroadcast(Session session, RecordingProperties properties, EndReason reason) {
	}

}
