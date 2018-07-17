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

package io.openvidu.server.kurento.core;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.kurento.client.Continuation;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.IceCandidate;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaPipeline;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;

/**
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class KurentoSession implements Session {

	private final static Logger log = LoggerFactory.getLogger(Session.class);
	public static final int ASYNC_LATCH_TIMEOUT = 30;

	private OpenviduConfig openviduConfig;

	private final ConcurrentMap<String, KurentoParticipant> participants = new ConcurrentHashMap<>();
	private String sessionId;
	private SessionProperties sessionProperties;

	private MediaPipeline pipeline;
	private CountDownLatch pipelineLatch = new CountDownLatch(1);

	private KurentoClient kurentoClient;
	private KurentoSessionEventsHandler kurentoSessionHandler;

	private volatile boolean closed = false;

	private final ConcurrentHashMap<String, String> filterStates = new ConcurrentHashMap<>();
	private AtomicInteger activePublishers = new AtomicInteger(0);

	private Object pipelineCreateLock = new Object();
	private Object pipelineReleaseLock = new Object();
	private volatile boolean pipelineReleased = false;
	private boolean destroyKurentoClient;

	private CallDetailRecord CDR;

	public final ConcurrentHashMap<String, String> publishedStreamIds = new ConcurrentHashMap<>();

	public KurentoSession(String sessionId, SessionProperties sessionProperties, KurentoClient kurentoClient,
			KurentoSessionEventsHandler kurentoSessionHandler, boolean destroyKurentoClient, CallDetailRecord CDR,
			OpenviduConfig openviduConfig) {
		this.sessionId = sessionId;
		this.sessionProperties = sessionProperties;
		this.kurentoClient = kurentoClient;
		this.destroyKurentoClient = destroyKurentoClient;
		this.kurentoSessionHandler = kurentoSessionHandler;
		this.CDR = CDR;
		this.openviduConfig = openviduConfig;
		log.debug("New SESSION instance with id '{}'", sessionId);
	}

	@Override
	public String getSessionId() {
		return this.sessionId;
	}

	@Override
	public SessionProperties getSessionProperties() {
		return this.sessionProperties;
	}

	@Override
	public void join(Participant participant) {
		checkClosed();
		createPipeline();

		KurentoParticipant kurentoParticipant = new KurentoParticipant(participant, this, getPipeline(),
				kurentoSessionHandler.getInfoHandler(), this.CDR, this.openviduConfig);
		participants.put(participant.getParticipantPrivateId(), kurentoParticipant);

		filterStates.forEach((filterId, state) -> {
			log.info("Adding filter {}", filterId);
			kurentoSessionHandler.updateFilter(sessionId, participant, filterId, state);
		});

		log.info("SESSION {}: Added participant {}", sessionId, participant);

		if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(participant.getParticipantPublicId())) {
			CDR.recordParticipantJoined(participant, sessionId);
		}
	}

	public void newPublisher(Participant participant) {
		registerPublisher();

		// pre-load endpoints to recv video from the new publisher
		for (KurentoParticipant p : participants.values()) {
			if (participant.equals(p)) {
				continue;
			}
			p.getNewOrExistingSubscriber(participant.getParticipantPublicId());
		}

		log.debug("SESSION {}: Virtually subscribed other participants {} to new publisher {}", sessionId,
				participants.values(), participant.getParticipantPublicId());
	}

	public void cancelPublisher(Participant participant, String reason) {
		deregisterPublisher();

		// cancel recv video from this publisher
		for (KurentoParticipant subscriber : participants.values()) {
			if (participant.equals(subscriber)) {
				continue;
			}
			subscriber.cancelReceivingMedia(participant.getParticipantPublicId(), reason);

		}

		log.debug("SESSION {}: Unsubscribed other participants {} from the publisher {}", sessionId,
				participants.values(), participant.getParticipantPublicId());

	}

	@Override
	public void leave(String participantPrivateId, String reason) throws OpenViduException {

		checkClosed();

		KurentoParticipant participant = participants.get(participantPrivateId);
		if (participant == null) {
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE, "Participant with private id "
					+ participantPrivateId + " not found in session '" + sessionId + "'");
		}
		participant.releaseAllFilters();

		log.info("PARTICIPANT {}: Leaving session {}", participant.getParticipantPublicId(), this.sessionId);
		if (participant.isStreaming()) {
			this.deregisterPublisher();
		}
		this.removeParticipant(participant, reason);
		participant.close(reason);

		if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(participant.getParticipantPublicId())) {
			CDR.recordParticipantLeft(participant, participant.getSession().getSessionId(), reason);
		}
	}

	@Override
	public Set<Participant> getParticipants() {
		checkClosed();
		return new HashSet<Participant>(this.participants.values());
	}

	@Override
	public Participant getParticipantByPrivateId(String participantPrivateId) {
		checkClosed();
		return participants.get(participantPrivateId);
	}

	@Override
	public Participant getParticipantByPublicId(String participantPublicId) {
		checkClosed();
		for (Participant p : participants.values()) {
			if (p.getParticipantPublicId().equals(participantPublicId)) {
				return p;
			}
		}
		return null;
	}

	@Override
	public boolean close(String reason) {
		if (!closed) {

			for (KurentoParticipant participant : participants.values()) {
				participant.releaseAllFilters();
				participant.close(reason);
			}

			participants.clear();

			closePipeline();

			log.debug("Session {} closed", this.sessionId);

			if (destroyKurentoClient) {
				kurentoClient.destroy();
			}

			this.closed = true;
			return true;
		} else {
			log.warn("Closing an already closed session '{}'", this.sessionId);
			return false;
		}
	}

	public void sendIceCandidate(String participantId, String endpointName, IceCandidate candidate) {
		this.kurentoSessionHandler.onIceCandidate(sessionId, participantId, endpointName, candidate);
	}

	public void sendMediaError(String participantId, String description) {
		this.kurentoSessionHandler.onMediaElementError(sessionId, participantId, description);
	}

	@Override
	public boolean isClosed() {
		return closed;
	}

	private void checkClosed() {
		if (isClosed()) {
			throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "The session '" + sessionId + "' is closed");
		}
	}

	private void removeParticipant(Participant participant, String reason) {

		checkClosed();

		participants.remove(participant.getParticipantPrivateId());

		log.debug("SESSION {}: Cancel receiving media from participant '{}' for other participant", this.sessionId,
				participant.getParticipantPublicId());
		for (KurentoParticipant other : participants.values()) {
			other.cancelReceivingMedia(participant.getParticipantPublicId(), reason);
		}
	}

	@Override
	public int getActivePublishers() {
		return activePublishers.get();
	}

	public void registerPublisher() {
		this.activePublishers.incrementAndGet();
	}

	public void deregisterPublisher() {
		this.activePublishers.decrementAndGet();
	}

	public MediaPipeline getPipeline() {
		try {
			pipelineLatch.await(KurentoSession.ASYNC_LATCH_TIMEOUT, TimeUnit.SECONDS);
		} catch (InterruptedException e) {
			throw new RuntimeException(e);
		}
		return this.pipeline;
	}

	private void createPipeline() {
		synchronized (pipelineCreateLock) {
			if (pipeline != null) {
				return;
			}
			log.info("SESSION {}: Creating MediaPipeline", sessionId);
			try {
				kurentoClient.createMediaPipeline(new Continuation<MediaPipeline>() {
					@Override
					public void onSuccess(MediaPipeline result) throws Exception {
						pipeline = result;
						pipelineLatch.countDown();
						log.debug("SESSION {}: Created MediaPipeline", sessionId);
					}

					@Override
					public void onError(Throwable cause) throws Exception {
						pipelineLatch.countDown();
						log.error("SESSION {}: Failed to create MediaPipeline", sessionId, cause);
					}
				});
			} catch (Exception e) {
				log.error("Unable to create media pipeline for session '{}'", sessionId, e);
				pipelineLatch.countDown();
			}
			if (getPipeline() == null) {
				throw new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
						"Unable to create media pipeline for session '" + sessionId + "'");
			}

			pipeline.addErrorListener(new EventListener<ErrorEvent>() {
				@Override
				public void onEvent(ErrorEvent event) {
					String desc = event.getType() + ": " + event.getDescription() + "(errCode=" + event.getErrorCode()
							+ ")";
					log.warn("SESSION {}: Pipeline error encountered: {}", sessionId, desc);
					kurentoSessionHandler.onPipelineError(sessionId, getParticipants(), desc);
				}
			});
		}
	}

	private void closePipeline() {
		synchronized (pipelineReleaseLock) {
			if (pipeline == null || pipelineReleased) {
				return;
			}
			getPipeline().release(new Continuation<Void>() {

				@Override
				public void onSuccess(Void result) throws Exception {
					log.debug("SESSION {}: Released Pipeline", sessionId);
					pipelineReleased = true;
				}

				@Override
				public void onError(Throwable cause) throws Exception {
					log.warn("SESSION {}: Could not successfully release Pipeline", sessionId, cause);
					pipelineReleased = true;
				}
			});
		}
	}

	public synchronized void updateFilter(String filterId) {
		String state = filterStates.get(filterId);
		String newState = kurentoSessionHandler.getNextFilterState(filterId, state);

		filterStates.put(filterId, newState);

		for (Participant participant : participants.values()) {
			kurentoSessionHandler.updateFilter(this.sessionId, participant, filterId, newState);
		}
	}

	@Override
	public JSONObject toJSON() {
		return this.sharedJSON(KurentoParticipant::toJSON);
	}

	@Override
	public JSONObject withStatsToJSON() {
		return this.sharedJSON(KurentoParticipant::withStatsToJSON);
	}

	@SuppressWarnings("unchecked")
	private JSONObject sharedJSON(Function<KurentoParticipant, JSONObject> toJsonFunction) {
		JSONObject json = new JSONObject();
		json.put("sessionId", this.sessionId);
		json.put("mediaMode", this.sessionProperties.mediaMode().name());
		json.put("recordingMode", this.sessionProperties.recordingMode().name());
		json.put("defaultRecordingLayout", this.sessionProperties.defaultRecordingLayout().name());
		if (RecordingLayout.CUSTOM.equals(this.sessionProperties.defaultRecordingLayout())) {
			json.put("defaultCustomLayout", this.sessionProperties.defaultCustomLayout());
		}
		JSONObject connections = new JSONObject();
		JSONArray participants = new JSONArray();
		this.participants.values().forEach(p -> {
			participants.add(toJsonFunction.apply(p));
		});
		connections.put("numberOfElements", participants.size());
		connections.put("content", participants);
		json.put("connections", connections);
		return json;
	}

	public String getParticipantPrivateIdFromStreamId(String streamId) {
		return this.publishedStreamIds.get(streamId);
	}

}
