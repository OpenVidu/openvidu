/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.server.cdr;

import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Session;

public class CDREventSession extends CDREventEnd {

	Session session;

	// sessionCreated
	public CDREventSession(Session session) {
		super(CDREventName.sessionCreated, session.getSessionId(), session.getUniqueSessionId(),
				session.getStartTime());
		this.session = session;
	}

	// sessionDestroyed
	public CDREventSession(CDREventSession event, Session session, EndReason reason, Long timestamp) {
		super(CDREventName.sessionDestroyed, event.getSessionId(), event.getUniqueSessionId(), event.getTimestamp(),
				reason, timestamp);
		this.session = session;
	}

	public Session getSession() {
		return this.session;
	}

}
