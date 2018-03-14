package io.openvidu.server.core;

import java.util.Set;

import io.openvidu.java.client.SessionProperties;

public interface Session {

	String getSessionId();
	
	SessionProperties getSessionProperties();

	void join(Participant participant);
	
	void leave(String participantPrivateId);
	
	boolean close();

	boolean isClosed();

	Set<Participant> getParticipants();

	Participant getParticipantByPrivateId(String participantPrivateId);

	Participant getParticipantByPublicId(String participantPublicId);

	int getActivePublishers();

}
