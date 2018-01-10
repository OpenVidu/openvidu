package io.openvidu.server.core;

import java.util.Set;

public interface Session {

	String getSessionId();

	void join(Participant participant);
	
	void leave(String participantPrivateId);
	
	void close();

	boolean isClosed();

	Set<Participant> getParticipants();

	Participant getParticipantByPrivateId(String participantPrivateId);

	Participant getParticipantByPublicId(String participantPublicId);

}
