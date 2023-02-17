package io.openvidu.server.broadcast;

import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Session;

public interface BroadcastManager {

	boolean sessionIsBeingBroadcasted(String sessionId);

	void stopBroadcast(Session session, RecordingProperties properties, EndReason reason);

}
