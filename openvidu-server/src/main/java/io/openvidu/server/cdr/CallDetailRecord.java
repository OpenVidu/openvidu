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
import io.openvidu.server.recording.Recording;

/**
 * CDR logger to register all information of a Session.
 * Enabled by property 'openvidu.cdr=true'
 * 
 * - 'sessionCreated':				{sessionId, timestamp}
 * - 'sessionDestroyed':			{sessionId, timestamp, startTime, endTime, duration, reason}
 * - 'participantJoined':			{sessionId, timestamp, participantId}
 * - 'participantLeft':				{sessionId, timestamp, participantId, startTime, endTime, duration, reason}
 * - 'webrtcConnectionCreated'		{sessionId, timestamp, participantId, connection, [receivingFrom], audioEnabled, videoEnabled, [videoSource], [videoFramerate]}
 * - 'webrtcConnectionDestroyed'	{sessionId, timestamp, participantId, startTime, endTime, duration, connection, [receivingFrom], audioEnabled, videoEnabled, [videoSource], [videoFramerate], reason}
 * - 'recordingStarted'				{sessionId, timestamp, id, name, hasAudio, hasVideo, recordingLayout, size}
 * - 'recordingStopped'				{sessionId, timestamp, id, name, hasAudio, hasVideo, recordingLayout, size}
 * 
 * PROPERTIES VALUES:
 * 
 * - sessionId:			string
 * - timestamp:			number
 * - startTime:			number
 * - endTime:			number
 * - duration:			number
 * - participantId:		string
 * - connection: 		"INBOUND", "OUTBOUND"
 * - receivingFrom: 	string
 * - audioEnabled: 		boolean
 * - videoEnabled: 		boolean
 * - videoSource: 		"CAMERA", "SCREEN"
 * - videoFramerate:	number
 * - id:				string
 * - name:				string
 * - hasAudio:			boolean
 * - hasVideo:			boolean
 * - recordingLayout:	string
 * - size: 				number
 * - webrtcConnectionDestroyed.reason: 	"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "openviduServerStopped"
 * - participantLeft.reason: 			"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "openviduServerStopped"
 * - sessionDestroyed.reason: 			"lastParticipantLeft", "openviduServerStopped"
 * 
 * [OPTIONAL_PROPERTIES]:
 * - receivingFrom:		only if connection = "INBOUND"
 * - videoSource:		only if videoEnabled = true
 * - videoFramerate: 	only if videoEnabled = true
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class CallDetailRecord {

	@Autowired
	protected OpenviduConfig openviduConfig;

	private CDRLogger logger;

	private Map<String, CDREvent> sessions = new ConcurrentHashMap<>();
	private Map<String, CDREvent> participants = new ConcurrentHashMap<>();
	private Map<String, CDREvent> publications = new ConcurrentHashMap<>();
	private Map<String, Set<CDREvent>> subscriptions = new ConcurrentHashMap<>();

	public CallDetailRecord(CDRLogger logger) {
		this.logger = logger;
	}

	public void recordSessionCreated(String sessionId) {
		CDREvent e = new CDREvent(CDREventName.sessionCreated, sessionId);
		this.sessions.put(sessionId, e);
		if (openviduConfig.isCdrEnabled()) this.logger.log(e);
	}

	public void recordSessionDestroyed(String sessionId, String reason) {
		CDREvent e = this.sessions.remove(sessionId);
		if (openviduConfig.isCdrEnabled()) this.logger.log(new CDREvent(CDREventName.sessionDestroyed, e, reason));
	}

	public void recordParticipantJoined(Participant participant, String sessionId) {
		CDREvent e = new CDREvent(CDREventName.participantJoined, participant, sessionId);
		this.participants.put(participant.getParticipantPublicId(), e);
		if (openviduConfig.isCdrEnabled()) this.logger.log(e);
	}

	public void recordParticipantLeft(Participant participant, String sessionId, String reason) {
		CDREvent e = this.participants.remove(participant.getParticipantPublicId());
		if (openviduConfig.isCdrEnabled()) this.logger.log(new CDREvent(CDREventName.participantLeft, e, reason));
	}

	public void recordNewPublisher(Participant participant, String sessionId, MediaOptions mediaOptions) {
		CDREvent publisher = new CDREvent(CDREventName.webrtcConnectionCreated, participant, sessionId, mediaOptions,
				null, System.currentTimeMillis(), null);
		this.publications.put(participant.getParticipantPublicId(), publisher);
		if (openviduConfig.isCdrEnabled()) this.logger.log(publisher);
	}

	public boolean stopPublisher(String participantPublicId, String reason) {
		CDREvent publisher = this.publications.remove(participantPublicId);
		if (publisher != null) {
			publisher = new CDREvent(CDREventName.webrtcConnectionDestroyed, publisher, reason);
			if (openviduConfig.isCdrEnabled()) this.logger.log(publisher);
			return true;
		}
		return false;
	}

	public void recordNewSubscriber(Participant participant, String sessionId, String senderPublicId) {
		CDREvent publisher = this.publications.get(senderPublicId);
		CDREvent subscriber = new CDREvent(CDREventName.webrtcConnectionCreated, participant, sessionId,
				publisher.getMediaOptions(), publisher.getParticipantPublicId(), System.currentTimeMillis(), null);
		this.subscriptions.putIfAbsent(participant.getParticipantPublicId(), new ConcurrentSkipListSet<>());
		this.subscriptions.get(participant.getParticipantPublicId()).add(subscriber);
		if (openviduConfig.isCdrEnabled()) this.logger.log(subscriber);
	}

	public boolean stopSubscriber(String participantPublicId, String senderPublicId, String reason) {
		Set<CDREvent> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDREvent subscription;
			for (Iterator<CDREvent> it = participantSubscriptions.iterator(); it.hasNext();) {
				subscription = it.next();
				if (subscription.getReceivingFrom().equals(senderPublicId)) {
					it.remove();
					subscription = new CDREvent(CDREventName.webrtcConnectionDestroyed, subscription, reason);
					if (openviduConfig.isCdrEnabled()) this.logger.log(subscription);
					return true;
				}
			}
		}
		return false;
	}

	public void recordRecordingStarted(String sessionId, Recording recording) {
		if (openviduConfig.isCdrEnabled()) this.logger.log(new CDREvent(CDREventName.recordingStarted, sessionId, recording));
	}

	public void recordRecordingStopped(String sessionId, Recording recording) {
		if (openviduConfig.isCdrEnabled()) this.logger.log(new CDREvent(CDREventName.recordingStopped, sessionId, recording));
	}

}
