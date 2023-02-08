package io.openvidu.server.broadcast;

public class BroadcastManagerDummy implements BroadcastManager {

	@Override
	public boolean sessionIsBeingBroadcasted(String sessionId) {
		return false;
	}

}
