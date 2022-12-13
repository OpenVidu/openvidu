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

package io.openvidu.server.kurento.core;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.kurento.client.Continuation;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.IceCandidate;
import org.kurento.client.MediaPipeline;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.kms.Kms;
import io.openvidu.server.utils.RemoteOperationUtils;

/**
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class KurentoSession extends Session {

	private final static Logger log = LoggerFactory.getLogger(KurentoSession.class);
	public static final int ASYNC_LATCH_TIMEOUT = 30;

	private MediaPipeline pipeline;
	private CountDownLatch pipelineLatch = new CountDownLatch(1);
	private Throwable pipelineCreationErrorCause;

	private Kms kms;
	private KurentoSessionEventsHandler kurentoSessionHandler;
	private KurentoParticipantEndpointConfig kurentoEndpointConfig;

	private Object pipelineCreateLock = new Object();
	private Object pipelineReleaseLock = new Object();

	public final ConcurrentHashMap<String, String> publishedStreamIds = new ConcurrentHashMap<>();

	public KurentoSession(Session sessionNotActive, Kms kms, KurentoSessionEventsHandler kurentoSessionHandler,
			KurentoParticipantEndpointConfig kurentoEndpointConfig) {
		super(sessionNotActive);
		this.kms = kms;
		this.kurentoSessionHandler = kurentoSessionHandler;
		this.kurentoEndpointConfig = kurentoEndpointConfig;
		log.debug("New SESSION instance with id '{}'", sessionId);
	}

	@Override
	public void join(Participant participant) {
		checkClosed();
		createPipeline();

		KurentoParticipant kurentoParticipant = new KurentoParticipant(participant, this, this.kurentoEndpointConfig,
				this.openviduConfig, this.recordingManager);
		participants.put(participant.getParticipantPrivateId(), kurentoParticipant);

		log.info("SESSION {}: Added participant {}", sessionId, participant);

		if (!participant.isRecorderOrSttParticipant()) {
			kurentoEndpointConfig.getCdr().recordParticipantJoined(participant, sessionId);
		}
	}

	public void newPublisher(Participant participant) {
		registerPublisher(participant);
		log.debug("SESSION {}: Virtually subscribed other participants {} to new publisher {}", sessionId,
				participants.values(), participant.getParticipantPublicId());
	}

	public void cancelPublisher(Participant participant, EndReason reason) {
		// Cancel all subscribers for this publisher
		for (Participant subscriber : participants.values()) {
			if (participant.equals(subscriber)) {
				continue;
			}
			((KurentoParticipant) subscriber).cancelReceivingMedia((KurentoParticipant) participant, reason, false);
		}

		log.debug("SESSION {}: Unsubscribed other participants {} from the publisher {}", sessionId,
				participants.values(), participant.getParticipantPublicId());

	}

	@Override
	public void leave(String participantPrivateId, EndReason reason) throws OpenViduException {

		checkClosed();

		KurentoParticipant participant = (KurentoParticipant) participants.get(participantPrivateId);
		if (participant == null) {
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE, "Participant with private id "
					+ participantPrivateId + " not found in session '" + sessionId + "'");
		}
		participant.releaseAllFilters();

		log.info("PARTICIPANT {}: Leaving session {}", participant.getParticipantPublicId(), this.sessionId);

		this.removeParticipant(participant, reason);
		participant.close(reason, true, null);
	}

	@Override
	public boolean close(EndReason reason) {
		if (!closed) {

			this.tokens.clear();

			for (Participant participant : participants.values()) {
				((KurentoParticipant) participant).releaseAllFilters();
				((KurentoParticipant) participant).close(reason, true, null);
			}

			participants.clear();

			closePipeline(null);

			log.debug("Session {} closed", this.sessionId);

			// Also disassociate the KurentoSession from the Kms
			kms.removeKurentoSession(this.sessionId);

			this.closed = true;
			return true;
		} else {
			log.warn("Closing an already closed session '{}'", this.sessionId);
			return false;
		}
	}

	@Override
	public String getMediaNodeId() {
		return this.kms.getId();
	}

	@Override
	public String getMediaNodeIp() {
		return this.kms.getIp();
	}

	public void sendIceCandidate(String participantPrivateId, String senderPublicId, String endpointName,
			IceCandidate candidate) {
		this.kurentoSessionHandler.onIceCandidate(sessionId, participantPrivateId, senderPublicId, endpointName,
				candidate);
	}

	public void sendMediaError(String connectionId, String description) {
		this.kurentoSessionHandler.onMediaElementError(sessionId, connectionId, description);
	}

	private void removeParticipant(Participant participant, EndReason reason) {

		checkClosed();

		KurentoParticipant removedParticipant = (KurentoParticipant) participants
				.remove(participant.getParticipantPrivateId());

		log.debug("SESSION {}: Cancel receiving media from participant '{}' for other participant", this.sessionId,
				participant.getParticipantPublicId());
		for (Participant other : participants.values()) {
			((KurentoParticipant) other).cancelReceivingMedia(removedParticipant, reason, false);
		}
	}

	public Kms getKms() {
		return this.kms;
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
				kms.getKurentoClient().createMediaPipeline(new Continuation<MediaPipeline>() {
					@Override
					public void onSuccess(MediaPipeline result) throws Exception {
						pipeline = result;
						pipelineLatch.countDown();
						log.debug("SESSION {}: Created MediaPipeline", sessionId);
					}

					@Override
					public void onError(Throwable cause) throws Exception {
						pipelineCreationErrorCause = cause;
						pipelineLatch.countDown();
						log.error("SESSION {}: Failed to create MediaPipeline", sessionId, cause);
					}
				});
			} catch (Exception e) {
				log.error("Unable to create media pipeline for session '{}'", sessionId, e);
				pipelineLatch.countDown();
			}
			if (getPipeline() == null) {
				final String message = pipelineCreationErrorCause != null
						? pipelineCreationErrorCause.getLocalizedMessage()
						: "Unable to create media pipeline for session '" + sessionId + "'";
				pipelineCreationErrorCause = null;
				throw new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE, message);
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

	private void resetPipeline(Runnable callback) {
		pipeline = null;
		pipelineLatch = new CountDownLatch(1);
		pipelineCreationErrorCause = null;
		if (callback != null) {
			callback.run();
		}
	}

	private void closePipeline(Runnable callback) {
		synchronized (pipelineReleaseLock) {
			if (pipeline == null) {
				if (callback != null) {
					callback.run();
				}
				return;
			}

			if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
				getPipeline().release(new Continuation<Void>() {
					@Override
					public void onSuccess(Void result) throws Exception {
						log.debug("SESSION {}: Released Pipeline", sessionId);
						resetPipeline(callback);
					}

					@Override
					public void onError(Throwable cause) throws Exception {
						log.warn("SESSION {}: Could not successfully release Pipeline", sessionId, cause);
						resetPipeline(callback);
					}
				});
			} else {
				resetPipeline(callback);
			}
		}
	}

	public String getParticipantPrivateIdFromStreamId(String streamId) {
		return this.publishedStreamIds.get(streamId);
	}

	public Set<Participant> getParticipantsSubscribedToParticipant(String senderPublicId) {
		return this.participants.values().stream()
				.filter(p -> ((KurentoParticipant) p).getSubscriber(senderPublicId) != null)
				.collect(Collectors.toSet());
	}

	public void restartStatusInKurentoAfterReconnectionToNewKms(Long kmsDisconnectionTime) {

		log.info("Resetting process: resetting remote media objects for active session {}", this.sessionId);

		// Stop recording if session is being recorded
		if (recordingManager.sessionIsBeingRecorded(this.sessionId)) {
			if (recordingManager.sessionIsBeingRecordedIndividual(this.sessionId)) {
				// Disable KurentoClient RecorderEndpoint operations
				try {
					RemoteOperationUtils.setToSkipRemoteOperations();
					this.recordingManager.forceStopRecording(this, EndReason.mediaServerReconnect,
							kmsDisconnectionTime);
				} finally {
					RemoteOperationUtils.revertToRunRemoteOperations();
				}
			} else {
				this.recordingManager.forceStopRecording(this, EndReason.mediaServerReconnect, kmsDisconnectionTime);
			}
		}

		// Store MediaOptions for resetting PublisherEndpoints later
		Map<String, MediaOptions> mediaOptionsMap = new HashMap<>();

		// Close all MediaEndpoints of participants
		this.getParticipants().forEach(p -> {
			KurentoParticipant kParticipant = (KurentoParticipant) p;
			final boolean wasStreaming = kParticipant.isStreaming();
			if (wasStreaming) {
				mediaOptionsMap.put(kParticipant.getParticipantPublicId(),
						kParticipant.getPublisher().getMediaOptions());
			}
			try {
				// Skip remote operations to non-existant KMS
				RemoteOperationUtils.setToSkipRemoteOperations();
				kParticipant.releaseAllFilters();
				kParticipant.close(EndReason.mediaServerReconnect, false, kmsDisconnectionTime);
			} finally {
				RemoteOperationUtils.revertToRunRemoteOperations();
			}
			if (wasStreaming) {
				kurentoSessionHandler.onUnpublishMedia(kParticipant, this.getParticipants(), null, null, null,
						EndReason.mediaServerReconnect);
			}
		});

		// Release pipeline, create a new one and prepare new PublisherEndpoints for
		// allowed users
		log.info("Resetting process: closing media pipeline for active session {}", this.sessionId);
		try {
			RemoteOperationUtils.setToSkipRemoteOperations();
			this.closePipeline(() -> {
				RemoteOperationUtils.revertToRunRemoteOperations();
				log.info("Resetting process: media pipeline closed for active session {}", this.sessionId);
				createPipeline();
				try {
					if (!pipelineLatch.await(20, TimeUnit.SECONDS)) {
						throw new Exception("MediaPipeline was not created in 20 seconds");
					}
					getParticipants().forEach(p -> {
						if (!OpenViduRole.SUBSCRIBER.equals(p.getToken().getRole())) {

							((KurentoParticipant) p)
									.resetPublisherEndpoint(mediaOptionsMap.get(p.getParticipantPublicId()), null);
						}
					});
					log.info(
							"Resetting process: media pipeline created and publisher endpoints reseted for active session {}",
							this.sessionId);
				} catch (Exception e) {
					log.error("Error waiting to new MediaPipeline on KurentoSession restart: {}", e.getMessage());
				}
			});
		} finally {
			RemoteOperationUtils.revertToRunRemoteOperations();
		}
	}

	@Override
	public JsonObject toJson(boolean withPendingConnections, boolean withWebrtcStats) {
		JsonObject json = super.toJson(withPendingConnections, withWebrtcStats);
		if (this.kms != null && this.kurentoSessionHandler.addMediaNodeInfoToSessionEntity()) {
			json.addProperty("mediaNodeId", kms.getId());
		}
		return json;
	}

	public int getNumberOfWebrtcConnections() {
		return this.getActivePublishers()
				+ this.participants.values().stream().filter(p -> !p.isRecorderOrSttParticipant())
						.mapToInt(p -> ((KurentoParticipant) p).getSubscribers().size()).reduce(0, Integer::sum);
	}

}
