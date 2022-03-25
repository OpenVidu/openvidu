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

import java.util.Collection;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListSet;

import org.kurento.client.GenericMediaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import io.openvidu.java.client.Recording.Status;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.endpoint.KmsEvent;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.summary.SessionSummary;

/**
 * CDR logger to register all information of a Session. Enabled by property
 * 'OPENVIDU_CDR=true'
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class CallDetailRecord {

	private static final Logger log = LoggerFactory.getLogger(CallDetailRecord.class);

	@Autowired
	private SessionManager sessionManager;

	private Collection<CDRLogger> loggers;

	private Map<String, CDREventSession> sessions = new ConcurrentHashMap<>();
	private Map<String, CDREventParticipant> participants = new ConcurrentHashMap<>();
	private Map<String, CDREventWebrtcConnection> publications = new ConcurrentHashMap<>();
	private Map<String, Set<CDREventWebrtcConnection>> subscriptions = new ConcurrentHashMap<>();

	public CallDetailRecord(Collection<CDRLogger> loggers) {
		this.loggers = loggers;
	}

	public Collection<CDRLogger> getLoggers() {
		return this.loggers;
	}

	public void recordSessionCreated(Session session) {
		CDREventSession e = new CDREventSession(session);
		this.sessions.put(session.getSessionId(), e);
		this.log(e);
	}

	public void recordSessionDestroyed(Session session, EndReason reason) {
		String sessionId = session.getSessionId();
		CDREventSession e = this.sessions.remove(sessionId);
		if (e != null) {
			CDREventSession eventSessionEnd = new CDREventSession(e, session, RecordingManager.finalReason(reason),
					System.currentTimeMillis());
			this.log(eventSessionEnd);

			// Summary: log closed session
			this.log(new SessionSummary(eventSessionEnd, sessionManager.removeFinalUsers(sessionId),
					sessionManager.removeAccumulatedRecordings(sessionId)));
		}
	}

	public void recordParticipantJoined(Participant participant, String sessionId) {
		CDREventParticipant e = new CDREventParticipant(participant);
		this.participants.put(participant.getParticipantPublicId(), e);
		this.log(e);
	}

	public void recordParticipantLeft(Participant participant, String sessionId, EndReason reason) {
		CDREventParticipant e = this.participants.remove(participant.getParticipantPublicId());
		CDREventParticipant eventParticipantEnd = new CDREventParticipant(e, reason, System.currentTimeMillis());
		this.log(eventParticipantEnd);

		// Summary: update final user ended connection
		sessionManager.getFinalUsers(sessionId).get(participant.getFinalUserId()).setConnection(eventParticipantEnd);
	}

	public void recordNewPublisher(Participant participant, String streamId, MediaOptions mediaOptions,
			Long timestamp) {
		CDREventWebrtcConnection publisher = new CDREventWebrtcConnection(participant.getSessionId(),
				participant.getUniqueSessionId(), streamId, participant, mediaOptions, null, timestamp);
		this.publications.put(participant.getParticipantPublicId(), publisher);
		this.log(publisher);
	}

	public void stopPublisher(String participantPublicId, String streamId, EndReason reason) {
		CDREventWebrtcConnection eventPublisherEnd = this.publications.remove(participantPublicId);
		if (eventPublisherEnd != null) {
			eventPublisherEnd = new CDREventWebrtcConnection(eventPublisherEnd, reason, System.currentTimeMillis());
			this.log(eventPublisherEnd);

			// Summary: update final user ended publisher
			sessionManager.getFinalUsers(eventPublisherEnd.getSessionId())
					.get(eventPublisherEnd.getParticipant().getFinalUserId()).getConnections().get(participantPublicId)
					.addPublisherClosed(streamId, eventPublisherEnd);
		}
	}

	public void recordNewSubscriber(Participant participant, String streamId, String senderPublicId, Long timestamp) {
		CDREventWebrtcConnection publisher = this.publications.get(senderPublicId);
		CDREventWebrtcConnection subscriber = new CDREventWebrtcConnection(participant.getSessionId(),
				participant.getUniqueSessionId(), streamId, participant, publisher.mediaOptions, senderPublicId,
				timestamp);
		this.subscriptions.putIfAbsent(participant.getParticipantPublicId(), new ConcurrentSkipListSet<>());
		this.subscriptions.get(participant.getParticipantPublicId()).add(subscriber);
		this.log(subscriber);
	}

	public void stopSubscriber(String participantPublicId, String senderPublicId, String streamId, EndReason reason) {
		Set<CDREventWebrtcConnection> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDREventWebrtcConnection eventSubscriberEnd;
			for (Iterator<CDREventWebrtcConnection> it = participantSubscriptions.iterator(); it.hasNext();) {
				eventSubscriberEnd = it.next();
				if (senderPublicId.equals(eventSubscriberEnd.receivingFrom)) {
					it.remove();
					eventSubscriberEnd = new CDREventWebrtcConnection(eventSubscriberEnd, reason,
							System.currentTimeMillis());
					this.log(eventSubscriberEnd);

					// Summary: update final user ended subscriber
					sessionManager.getFinalUsers(eventSubscriberEnd.getSessionId())
							.get(eventSubscriberEnd.getParticipant().getFinalUserId()).getConnections()
							.get(participantPublicId).addSubscriberClosed(streamId, eventSubscriberEnd);
				}
			}
		} else {
			log.error("No subscriptions map in CDR for session participant {}", participantPublicId);
		}
	}

	public void recordRecordingStatusChanged(Recording recording, EndReason finalReason, long timestamp,
			Status status) {
		CDREventRecordingStatusChanged event = new CDREventRecordingStatusChanged(recording, recording.getCreatedAt(),
				finalReason, timestamp, status);
		if (Status.stopped.equals(status)) {
			// Summary: update ended recording
			sessionManager.accumulateNewRecording(event);
		}
		this.log(event);
	}

	public void recordFilterEventDispatched(String sessionId, String uniqueSessionId, String connectionId,
			String streamId, String filterType, GenericMediaEvent event) {
		this.log(new CDREventFilterEvent(sessionId, uniqueSessionId, connectionId, streamId, filterType, event));
	}

	public void recordSignalSent(String sessionId, String uniqueSessionId, String from, String[] to, String type,
			String data) {
		if (from != null) {
			type = type.replaceFirst("^signal:", "");
		}
		this.log(new CDREventSignal(sessionId, uniqueSessionId, from, to, type, data));
	}

	public void log(CDREvent event) {
		this.loggers.forEach(logger -> {
			logger.log(event);
		});
	}

	public void log(KmsEvent event) {
		this.loggers.forEach(logger -> {
			logger.log(event);
		});
	}

	public void log(WebrtcDebugEvent event) {
		this.loggers.forEach(logger -> {
			logger.log(event);
		});
	}

	public void log(SessionSummary sessionSummary) {
		this.loggers.forEach(logger -> {
			logger.log(sessionSummary);
		});
	}

}
