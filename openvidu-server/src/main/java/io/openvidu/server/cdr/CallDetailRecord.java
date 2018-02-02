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

/**
 * CDR logger to register all information of each WebRTC connection:
 * Enabled by property 'openvidu.cdr=true'
 * 
 * - Participant unique identifier
 * - Session unique identifier
 * - Inbound or Outbound WebRTC connection
 * - <if inbound connection> Sender unique identifier
 * - Audio media stream enabled
 * - Video media stream enabled
 * - <if Video media stream enabled> Video source [CAMERA, SCREEN]
 * - Time of start of the call
 * - Time of end of the call
 * - Total time duration
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
	
	public void recordSessionDestroyed(String sessionId) {
		CDREvent e = this.sessions.remove(sessionId);
		log.info("{}", new CDREvent(CDREvent.SESSION_DESTROYED, e));
	}
	
	public void recordParticipantJoined(Participant participant, String sessionId) {
		CDREvent e = new CDREvent(CDREvent.PARTICIPANT_JOINED, participant, sessionId);
		this.participants.put(participant.getParticipantPublicId(), e);
		log.info("{}", e);
	}
	
	public void recordParticipantLeft(Participant participant, String sessionId) {
		CDREvent e = this.participants.remove(participant.getParticipantPublicId());
		log.info("{}", new CDREvent(CDREvent.PARTICIPANT_LEFT, e));
	}
	
	public void recordNewPublisher(Participant participant, String sessionId, MediaOptions mediaOptions) {
		CDREvent publisher = new CDREvent(CDREvent.CONNECTION_CREATED, participant, sessionId, mediaOptions, null, System.currentTimeMillis());
		this.publications.put(participant.getParticipantPublicId(), publisher);
		log.info("{}", publisher);
	}

	public void recordNewSubscriber(Participant participant, String sessionId, String senderPublicId) {
		CDREvent publisher = this.publications.get(senderPublicId);
		CDREvent subscriber = new CDREvent(CDREvent.CONNECTION_CREATED, participant, sessionId, publisher.getMediaOptions(), publisher.getParticipantPublicId(), System.currentTimeMillis());
		this.subscriptions.putIfAbsent(participant.getParticipantPublicId(), new ConcurrentSkipListSet<>());
		this.subscriptions.get(participant.getParticipantPublicId()).add(subscriber);
		log.info("{}", subscriber);
	}

	public boolean stopPublisher(String participantPublicId) {
		CDREvent publisher = this.publications.remove(participantPublicId);
		if (publisher != null) {
			publisher = new CDREvent(CDREvent.CONNECTION_DESTROYED, publisher);
			log.info("{}", publisher);
			return true;
		}
		return false;
	}

	public boolean stopSubscriber(String participantPublicId, String senderPublicId) {
		Set<CDREvent> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDREvent subscription;
			for (Iterator<CDREvent> it = participantSubscriptions.iterator(); it.hasNext();) {
				subscription = it.next();
				if (subscription.getReceivingFrom().equals(senderPublicId)) {
					it.remove();
					subscription = new CDREvent(CDREvent.CONNECTION_DESTROYED, subscription);
					log.info("{}", subscription);
					return true;
				}
			}
		}
		return false;
	}

	public void stopAllSubscriptions(String participantPublicId) {
		Set<CDREvent> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDREvent subscription;
			for (Iterator<CDREvent> it = participantSubscriptions.iterator(); it.hasNext();) {
				subscription = it.next();
				subscription = new CDREvent(CDREvent.CONNECTION_DESTROYED, subscription);
				log.info("{}", subscription);
			}
			this.subscriptions.remove(participantPublicId).clear();
		}
	}
	
}
