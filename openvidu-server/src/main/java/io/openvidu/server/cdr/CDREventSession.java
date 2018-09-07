package io.openvidu.server.cdr;

import io.openvidu.server.core.Session;

public class CDREventSession extends CDREventEnd {

	Session session;

	// sessionCreated
	public CDREventSession(Session session) {
		super(CDREventName.sessionCreated, session.getSessionId(), session.getStartTime());
		this.session = session;
	}

	// sessionDestroyed
	public CDREventSession(CDREvent event, String reason) {
		super(CDREventName.sessionDestroyed, event.getSessionId(), event.getTimestamp(), reason);
	}

}
