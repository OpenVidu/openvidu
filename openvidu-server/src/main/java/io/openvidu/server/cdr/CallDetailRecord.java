package io.openvidu.server.cdr;

import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListSet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
 * - 'recordingStarted'				{sessionId, timestamp, id, name, hasAudio, hasVideo, size}
 * - 'recordingStopped'				{sessionId, timestamp, id, name, hasAudio, hasVideo, size}
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
 * - size: 				number
 * - webrtcConnectionDestroyed.reason: 	"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "openviduServerDestroyed"
 * - participantLeft.reason: 			"unsubscribe", "unpublish", "disconnect", "networkDisconnect", "openviduServerDestroyed"
 * - sessionDestroyed.reason: 			"lastParticipantLeft", "openviduServerDestroyed"
 * 
 * [OPTIONAL_PROPERTIES]:
 * - receivingFrom:		only if connection = "INBOUND"
 * - videoSource:		only if videoEnabled = true
 * - videoFramerate: 	only if videoEnabled = true
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class CallDetailRecord {

	private Logger log = LoggerFactory.getLogger(CallDetailRecord.class);

	private Map<String, CDREvent> sessions = new ConcurrentHashMap<>();
	private Map<String, CDREvent> participants = new ConcurrentHashMap<>();
	private Map<String, CDREvent> publications = new ConcurrentHashMap<>();
	private Map<String, Set<CDREvent>> subscriptions = new ConcurrentHashMap<>();

	public void recordSessionCreated(String sessionId) {
		CDREvent e = new CDREvent(CDREvent.SESSION_CREATED, sessionId);
		this.sessions.put(sessionId, e);
		log.info("{}", e);
	}

	public void recordSessionDestroyed(String sessionId, String reason) {
		CDREvent e = this.sessions.remove(sessionId);
		log.info("{}", new CDREvent(CDREvent.SESSION_DESTROYED, e, reason));
	}

	public void recordParticipantJoined(Participant participant, String sessionId) {
		CDREvent e = new CDREvent(CDREvent.PARTICIPANT_JOINED, participant, sessionId);
		this.participants.put(participant.getParticipantPublicId(), e);
		log.info("{}", e);
	}

	public void recordParticipantLeft(Participant participant, String sessionId, String reason) {
		CDREvent e = this.participants.remove(participant.getParticipantPublicId());
		log.info("{}", new CDREvent(CDREvent.PARTICIPANT_LEFT, e, reason));
	}

	public void recordNewPublisher(Participant participant, String sessionId, MediaOptions mediaOptions) {
		CDREvent publisher = new CDREvent(CDREvent.CONNECTION_CREATED, participant, sessionId, mediaOptions, null,
				System.currentTimeMillis(), null);
		this.publications.put(participant.getParticipantPublicId(), publisher);
		log.info("{}", publisher);
	}

	public boolean stopPublisher(String participantPublicId, String reason) {
		CDREvent publisher = this.publications.remove(participantPublicId);
		if (publisher != null) {
			publisher = new CDREvent(CDREvent.CONNECTION_DESTROYED, publisher, reason);
			log.info("{}", publisher);
			return true;
		}
		return false;
	}

	public void recordNewSubscriber(Participant participant, String sessionId, String senderPublicId) {
		CDREvent publisher = this.publications.get(senderPublicId);
		CDREvent subscriber = new CDREvent(CDREvent.CONNECTION_CREATED, participant, sessionId,
				publisher.getMediaOptions(), publisher.getParticipantPublicId(), System.currentTimeMillis(), null);
		this.subscriptions.putIfAbsent(participant.getParticipantPublicId(), new ConcurrentSkipListSet<>());
		this.subscriptions.get(participant.getParticipantPublicId()).add(subscriber);
		log.info("{}", subscriber);
	}

	public boolean stopSubscriber(String participantPublicId, String senderPublicId, String reason) {
		Set<CDREvent> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDREvent subscription;
			for (Iterator<CDREvent> it = participantSubscriptions.iterator(); it.hasNext();) {
				subscription = it.next();
				if (subscription.getReceivingFrom().equals(senderPublicId)) {
					it.remove();
					subscription = new CDREvent(CDREvent.CONNECTION_DESTROYED, subscription, reason);
					log.info("{}", subscription);
					return true;
				}
			}
		}
		return false;
	}

	public void recordRecordingStarted(String sessionId, Recording recording) {
		log.info("{}", new CDREvent(CDREvent.RECORDING_STARTED, sessionId, recording));
	}

	public void recordRecordingStopped(String sessionId, Recording recording) {
		log.info("{}", new CDREvent(CDREvent.RECORDING_STOPPED, sessionId, recording));
	}

}
