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

	private Map<String, CDRTransmission> publications = new ConcurrentHashMap<>();
	private Map<String, Set<CDRTransmission>> subscriptions = new ConcurrentHashMap<>();
	
	public void recordNewPublisher(Participant participant, String sessionId, MediaOptions mediaOptions) {
		CDRTransmission publisher = new CDRTransmission(participant, sessionId, mediaOptions, null);
		this.publications.put(participant.getParticipantPublicId(), publisher);
	}

	public void recordNewSubscriber(Participant participant, String sessionId, String senderPublicId) {
		CDRTransmission publisher = this.publications.get(senderPublicId);
		CDRTransmission subscriber = new CDRTransmission(participant, sessionId, publisher.getMediaOptions(), publisher);
		this.subscriptions.putIfAbsent(participant.getParticipantPublicId(), new ConcurrentSkipListSet<>());
		this.subscriptions.get(participant.getParticipantPublicId()).add(subscriber);
	}

	public boolean stopPublisher(String participantPublicId) {
		CDRTransmission publisher = this.publications.remove(participantPublicId);
		if (publisher != null) {
			publisher.endCall();
			log.info("{}", getTransmissionMessage(publisher));
			return true;
		}
		return false;
	}

	public boolean stopSubscriber(String participantPublicId, String senderPublicId) {
		Set<CDRTransmission> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDRTransmission subscription;
			for (Iterator<CDRTransmission> it = participantSubscriptions.iterator(); it.hasNext();) {
				subscription = it.next();
				if (subscription.getReceivingFrom().getParticipant().getParticipantPublicId().equals(senderPublicId)) {
					it.remove();
					subscription.endCall();
					log.info("{}", getTransmissionMessage(subscription));
					return true;
				}
			}
		}
		return false;
	}

	public void stopAllSubscriptions(String participantPublicId) {
		Set<CDRTransmission> participantSubscriptions = this.subscriptions.get(participantPublicId);
		if (participantSubscriptions != null) {
			CDRTransmission subscription;
			for (Iterator<CDRTransmission> it = participantSubscriptions.iterator(); it.hasNext();) {
				subscription = it.next();
				subscription.endCall();
				log.info("{}", getTransmissionMessage(subscription));
			}
			this.subscriptions.remove(participantPublicId).clear();
		}
	}
	
	private String getTransmissionMessage(CDRTransmission cdr) {
		StringBuffer sb = new StringBuffer();
		sb.append("<participant>\n");
		sb.append("\t<id>").append(cdr.getParticipant().getParticipantPublicId()).append("</id>\n");
		sb.append("\t<session>").append(cdr.getSessionId()).append("</session>\n");
		sb.append("\t<connection>").append((cdr.getReceivingFrom() != null) ? "INBOUND" : "OUTBOUND").append("</connection>\n");
		if (cdr.getReceivingFrom() != null) sb.append("\t<from>").append((cdr.getReceivingFrom() != null)
				? cdr.getReceivingFrom().getParticipant().getParticipantPublicId()
				: "").append("</from>\n");
		sb.append("\t<audio-enabled>").append(cdr.getAudioEnabled()).append("</audio-enabled>\n");
		sb.append("\t<video-enabled>").append(cdr.getVideoEnabled()).append("</video-enabled>\n");
		if (cdr.getVideoEnabled()) sb.append("\t<videosource>").append(cdr.typeOfVideo()).append("</videosource>\n");
		sb.append("\t<start-time>").append(cdr.getDateOfStart()).append("</start-time>\n");
		sb.append("\t<end-time>").append(cdr.getDateOfEnd()).append("</end-time>\n");
		sb.append("\t<duration>").append(cdr.totalCallDuration()).append("</duration>\n");
		sb.append("</participant>\n");
		return sb.toString();
	}

}
