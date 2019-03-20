/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

import org.springframework.beans.factory.annotation.Autowired;

import io.openvidu.server.config.OpenviduConfig;
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
 * CDR logger to register all information of a Session.
 * Enabled by property 'openvidu.cdr=true'
 * 
 * - 'sessionCreated':				{sessionId, timestamp}
 * - 'sessionDestroyed':			{sessionId, timestamp, startTime, duration, reason}
 * - 'participantJoined':			{sessionId, timestamp, participantId, location, platform}
 * - 'participantLeft':				{sessionId, timestamp, participantId, startTime, duration, reason}
 * - 'webrtcConnectionCreated'		{sessionId, timestamp, participantId, connection, [receivingFrom], audioEnabled, videoEnabled, [videoSource], [videoFramerate]}
 * - 'webrtcConnectionDestroyed'	{sessionId, timestamp, participantId, startTime, duration, connection, [receivingFrom], audioEnabled, videoEnabled, [videoSource], [videoFramerate], reason}
 * - 'recordingStarted'				{sessionId, timestamp, id, name, hasAudio, hasVideo, resolution, recordingLayout, size}
 * - 'recordingStopped'				{sessionId, timestamp, id, name, hasAudio, hasVideo, resolution, recordingLayout, size}
 * 
 * PROPERTIES VALUES:
 * 
 * - sessionId:			string
 * - timestamp:			number
 * - startTime:			number
 * - duration:			number
 * - participantId:		string
 * - connection: 		"INBOUND", "OUTBOUND"
 * - receivingFrom: 	string
 * - audioEnabled: 		boolean
 * - videoEnabled: 		boolean
 * - videoSource: 		"CAMERA", "SCREEN"
 * - videoFramerate:	number
 * - videoDimensions:	string
 * - id:				string
 * - name:				string
 * - hasAudio:			boolean
 * - hasVideo:			boolean
 * - resolution			string
 * - recordingLayout:	string
 * - size: 				number
 * - webrtcConnectionDestroyed.reason: 	"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "mediaServerDisconnect", "openviduServerStopped"
 * - participantLeft.reason: 			"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "openviduServerStopped"
 * - sessionDestroyed.reason: 			"lastParticipantLeft", "openviduServerStopped"
 * - recordingStopped.reason:			"recordingStoppedByServer", "lastParticipantLeft", "sessionClosedByServer", "automaticStop", "mediaServerDisconnect", "openviduServerStopped"
 * 
 * [OPTIONAL_PROPERTIES]:
 * - receivingFrom:		only if connection = "INBOUND"
 * - videoSource:		only if videoEnabled = true
 * - videoFramerate: 	only if videoEnabled = true
 * - videoDimensions: 	only if videoEnabled = true
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class CallDetailRecord {

	@Autowired
	protected SessionManager sessionManager;

	@Autowired
	protected OpenviduConfig openviduConfig;

	private Collection<CDRLogger> loggers;

	private Map<String, CDREventSession> sessions = new ConcurrentHashMap<>();
	private Map<String, CDREventParticipant> participants = new ConcurrentHashMap<>();
	private Map<String, CDREventWebrtcConnection> publications = new ConcurrentHashMap<>();
	private Map<String, Set<CDREventWebrtcConnection>> subscriptions = new ConcurrentHashMap<>();
	private Map<String, CDREventRecording> recordings = new ConcurrentHashMap<>();

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

	public void recordSessionDestroyed(String sessionId, EndReason reason) {
		CDREventSession e = this.sessions.remove(sessionId);
		if (e != null) {
			CDREventSession eventSessionEnd = new CDREventSession(e, RecordingManager.finalReason(reason));
			this.log(eventSessionEnd);

			// Summary: log closed session
			this.log(new SessionSummary(eventSessionEnd, sessionManager.removeFinalUsers(sessionId),
					sessionManager.removeAccumulatedRecordings(sessionId)));
		}
	}

	public void recordParticipantJoined(Participant participant, String sessionId) {
		CDREventParticipant e = new CDREventParticipant(sessionId, participant);
		this.participants.put(participant.getParticipantPublicId(), e);
		this.log(e);
	}

	public void recordParticipantLeft(Participant participant, String sessionId, EndReason reason) {
		CDREventParticipant e = this.participants.remove(participant.getParticipantPublicId());
		CDREventParticipant eventParticipantEnd = new CDREventParticipant(e, reason);
		this.log(eventParticipantEnd);

		// Summary: update final user ended connection
		sessionManager.getFinalUsers(sessionId).get(participant.getFinalUserId()).setConnection(eventParticipantEnd);
	}

	public void recordNewPublisher(Participant participant, String sessionId, String streamId,
			MediaOptions mediaOptions, Long timestamp) {
		CDREventWebrtcConnection publisher = new CDREventWebrtcConnection(sessionId, streamId, participant,
				mediaOptions, null, timestamp);
		this.publications.put(participant.getParticipantPublicId(), publisher);
		this.log(publisher);
	}

	public void stopPublisher(String participantPublicId, String streamId, EndReason reason) {
		CDREventWebrtcConnection eventPublisherEnd = this.publications.remove(participantPublicId);
		if (eventPublisherEnd != null) {
			eventPublisherEnd = new CDREventWebrtcConnection(eventPublisherEnd, reason);
			this.log(eventPublisherEnd);

			// Summary: update final user ended publisher
			sessionManager.getFinalUsers(eventPublisherEnd.getSessionId())
					.get(eventPublisherEnd.getParticipant().getFinalUserId()).getConnections().get(participantPublicId)
					.addPublisherClosed(streamId, eventPublisherEnd);
		}
	}

	public void recordNewSubscriber(Participant participant, String sessionId, String streamId, String senderPublicId,
			Long timestamp) {
		CDREventWebrtcConnection publisher = this.publications.get(senderPublicId);
		CDREventWebrtcConnection subscriber = new CDREventWebrtcConnection(sessionId, streamId, participant,
				publisher.mediaOptions, senderPublicId, timestamp);
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
					eventSubscriberEnd = new CDREventWebrtcConnection(eventSubscriberEnd, reason);
					this.log(eventSubscriberEnd);

					// Summary: update final user ended subscriber
					sessionManager.getFinalUsers(eventSubscriberEnd.getSessionId())
							.get(eventSubscriberEnd.getParticipant().getFinalUserId()).getConnections()
							.get(participantPublicId).addSubscriberClosed(streamId, eventSubscriberEnd);
				}
			}
		}
	}

	public void recordRecordingStarted(String sessionId, Recording recording) {
		CDREventRecording recordingStartedEvent = new CDREventRecording(sessionId, recording);
		this.recordings.putIfAbsent(recording.getId(), recordingStartedEvent);
		this.log(new CDREventRecording(sessionId, recording));
	}

	public void recordRecordingStopped(String sessionId, Recording recording, EndReason reason) {
		CDREventRecording recordingStartedEvent = this.recordings.remove(recording.getId());
		CDREventRecording recordingStoppedEvent = new CDREventRecording(recordingStartedEvent, recording,
				RecordingManager.finalReason(reason));
		this.log(recordingStoppedEvent);

		// Summary: update ended recording
		sessionManager.getAccumulatedRecordings(sessionId).add(recordingStoppedEvent);
	}

	private void log(CDREvent event) {
		this.loggers.forEach(logger -> {
			if (openviduConfig.isCdrEnabled() || !logger.canBeDisabled()) {
				logger.log(event);
			}
		});
	}

	public void log(KmsEvent event) {
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
