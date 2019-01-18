/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListSet;

import org.springframework.beans.factory.annotation.Autowired;

import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.service.RecordingManager;

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
 * - 'recordingStarted'				{sessionId, timestamp, id, name, hasAudio, hasVideo, recordingLayout, size}
 * - 'recordingStopped'				{sessionId, timestamp, id, name, hasAudio, hasVideo, recordingLayout, size}
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
 * - recordingLayout:	string
 * - size: 				number
 * - webrtcConnectionDestroyed.reason: 	"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "openviduServerStopped"
 * - participantLeft.reason: 			"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "openviduServerStopped"
 * - sessionDestroyed.reason: 			"lastParticipantLeft", "openviduServerStopped"
 * - recordingStopped.reason:			"recordingStoppedByServer", "lastParticipantLeft", "sessionClosedByServer", "openviduServerStopped"
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
	protected OpenviduConfig openviduConfig;

	private CDRLogger logger;

	private Map<String, CDREventSession> sessions = new ConcurrentHashMap<>();
	private Map<String, CDREventParticipant> participants = new ConcurrentHashMap<>();
	private Map<String, CDREventWebrtcConnection> publications = new ConcurrentHashMap<>();
	private Map<String, Set<CDREventWebrtcConnection>> subscriptions = new ConcurrentHashMap<>();
	private Map<String, CDREventRecording> recordings = new ConcurrentHashMap<>();

	public CallDetailRecord(CDRLogger logger) {
		this.logger = logger;
	}

	public void recordSessionCreated(Session session) {
		CDREventSession e = new CDREventSession(session);
		this.sessions.put(session.getSessionId(), e);
		if (openviduConfig.isCdrEnabled())
			this.logger.log(e);
	}

	public void recordSessionDestroyed(String sessionId, String reason) {
		CDREvent e = this.sessions.remove(sessionId);
		if (openviduConfig.isCdrEnabled())
			this.logger.log(new CDREventSession(e, RecordingManager.finalReason(reason)));
	}

	public void recordParticipantJoined(Participant participant, String sessionId) {
		CDREventParticipant e = new CDREventParticipant(sessionId, participant);
		this.participants.put(participant.getParticipantPublicId(), e);
		if (openviduConfig.isCdrEnabled())
			this.logger.log(e);
	}

	public void recordParticipantLeft(Participant participant, String sessionId, String reason) {
		CDREvent e = this.participants.remove(participant.getParticipantPublicId());
		if (openviduConfig.isCdrEnabled())
			this.logger.log(new CDREventParticipant(e, reason));
	}

	public void recordNewPublisher(Participant participant, String sessionId, MediaOptions mediaOptions,
			Long timestamp) {
		CDREventWebrtcConnection publisher = new CDREventWebrtcConnection(sessionId,
				participant.getParticipantPublicId(), mediaOptions, null, timestamp);
		this.publications.put(participant.getParticipantPublicId(), publisher);
		if (openviduConfig.isCdrEnabled())
			this.logger.log(publisher);
	}

	public boolean stopPublisher(String participantPublicId, String reason) {
		CDREventWebrtcConnection publisher = this.publications.remove(participantPublicId);
		if (publisher != null) {
			publisher = new CDREventWebrtcConnection(publisher, reason);
			if (openviduConfig.isCdrEnabled())
				this.logger.log(publisher);
			return true;
		}
		return false;
	}

	public void recordNewSubscriber(Participant participant, String sessionId, String senderPublicId, Long timestamp) {
		CDREventWebrtcConnection publisher = this.publications.get(senderPublicId);
		CDREventWebrtcConnection subscriber = new CDREventWebrtcConnection(sessionId,
				participant.getParticipantPublicId(), publisher.mediaOptions, senderPublicId, timestamp);
		this.subscriptions.putIfAbsent(participant.getParticipantPublicId(), new ConcurrentSkipListSet<>());
		this.subscriptions.get(participant.getParticipantPublicId()).add(subscriber);
		if (openviduConfig.isCdrEnabled())
			this.logger.log(subscriber);
	}

	public boolean stopSubscriber(String participantPublicId, String senderPublicId, String reason) {
		Set<CDREventWebrtcConnection> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDREventWebrtcConnection subscription;
			for (Iterator<CDREventWebrtcConnection> it = participantSubscriptions.iterator(); it.hasNext();) {
				subscription = it.next();
				if (senderPublicId.equals(subscription.receivingFrom)) {
					it.remove();
					subscription = new CDREventWebrtcConnection(subscription, reason);
					if (openviduConfig.isCdrEnabled())
						this.logger.log(subscription);
					return true;
				}
			}
		}
		return false;
	}

	public void recordRecordingStarted(String sessionId, Recording recording) {
		CDREventRecording recordingStartedEvent = new CDREventRecording(sessionId, recording);
		this.recordings.putIfAbsent(recording.getId(), recordingStartedEvent);
		if (openviduConfig.isCdrEnabled())
			this.logger.log(new CDREventRecording(sessionId, recording));
	}

	public void recordRecordingStopped(String sessionId, Recording recording, String reason) {
		CDREventRecording recordingStartedEvent = this.recordings.remove(recording.getId());
		if (openviduConfig.isCdrEnabled())
			this.logger.log(new CDREventRecording(recordingStartedEvent, RecordingManager.finalReason(reason)));
	}

}
