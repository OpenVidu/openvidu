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

package io.openvidu.server.kurento.core;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.client.Continuation;
import org.kurento.client.ErrorEvent;
import org.kurento.client.Filter;
import org.kurento.client.IceCandidate;
import org.kurento.client.MediaElement;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaType;
import org.kurento.client.SdpEndpoint;
import org.kurento.client.internal.server.KurentoServerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.kurento.endpoint.MediaEndpoint;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.kurento.endpoint.SdpType;
import io.openvidu.server.kurento.endpoint.SubscriberEndpoint;
import io.openvidu.server.recording.service.RecordingManager;

public class KurentoParticipant extends Participant {

	private static final Logger log = LoggerFactory.getLogger(KurentoParticipant.class);

	private OpenviduConfig openviduConfig;
	private RecordingManager recordingManager;

	private boolean webParticipant = true;

	private final KurentoSession session;
	private KurentoParticipantEndpointConfig endpointConfig;

	private PublisherEndpoint publisher;
	private CountDownLatch endPointLatch = new CountDownLatch(1);

	private final ConcurrentMap<String, Filter> filters = new ConcurrentHashMap<>();
	private final ConcurrentMap<String, SubscriberEndpoint> subscribers = new ConcurrentHashMap<String, SubscriberEndpoint>();

	public KurentoParticipant(Participant participant, KurentoSession kurentoSession,
			KurentoParticipantEndpointConfig endpointConfig, OpenviduConfig openviduConfig,
			RecordingManager recordingManager) {
		super(participant.getFinalUserId(), participant.getParticipantPrivateId(), participant.getParticipantPublicId(),
				kurentoSession.getSessionId(), participant.getToken(), participant.getClientMetadata(),
				participant.getLocation(), participant.getPlatform(), participant.getCreatedAt());
		this.endpointConfig = endpointConfig;
		this.openviduConfig = openviduConfig;
		this.recordingManager = recordingManager;
		this.session = kurentoSession;

		if (!OpenViduRole.SUBSCRIBER.equals(participant.getToken().getRole())) {
			this.publisher = new PublisherEndpoint(webParticipant, this, participant.getParticipantPublicId(),
					this.session.getPipeline(), this.openviduConfig);
		}

		for (Participant other : session.getParticipants()) {
			if (!other.getParticipantPublicId().equals(this.getParticipantPublicId())) {
				getNewOrExistingSubscriber(other.getParticipantPublicId());
			}
		}
	}

	public void createPublishingEndpoint(MediaOptions mediaOptions) {

		publisher.createEndpoint(endPointLatch);
		if (getPublisher().getEndpoint() == null) {
			throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE, "Unable to create publisher endpoint");
		}
		publisher.setMediaOptions(mediaOptions);

		String publisherStreamId = this.getParticipantPublicId() + "_"
				+ (mediaOptions.hasVideo() ? mediaOptions.getTypeOfVideo() : "MICRO") + "_"
				+ RandomStringUtils.random(5, true, false).toUpperCase();

		this.publisher.setEndpointName(publisherStreamId);
		this.publisher.getEndpoint().setName(publisherStreamId);
		this.publisher.setStreamId(publisherStreamId);

		endpointConfig.addEndpointListeners(this.publisher, "publisher");

		// Remove streamId from publisher's map
		this.session.publishedStreamIds.putIfAbsent(this.getPublisherStreamId(), this.getParticipantPrivateId());

	}

	public synchronized Filter getFilterElement(String id) {
		return filters.get(id);
	}

	public synchronized void removeFilterElement(String id) {
		Filter filter = getFilterElement(id);
		filters.remove(id);
		if (filter != null) {
			publisher.revert(filter);
		}
	}

	public synchronized void releaseAllFilters() {
		// Check this, mutable array?
		filters.forEach((s, filter) -> removeFilterElement(s));
		if (this.publisher != null && this.publisher.getFilter() != null) {
			this.publisher.revert(this.publisher.getFilter());
		}
	}

	public PublisherEndpoint getPublisher() {
		try {
			if (!endPointLatch.await(KurentoSession.ASYNC_LATCH_TIMEOUT, TimeUnit.SECONDS)) {
				throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
						"Timeout reached while waiting for publisher endpoint to be ready");
			}
		} catch (InterruptedException e) {
			throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
					"Interrupted while waiting for publisher endpoint to be ready: " + e.getMessage());
		}
		return this.publisher;
	}

	public MediaOptions getPublisherMediaOptions() {
		return this.publisher.getMediaOptions();
	}

	public void setPublisherMediaOptions(MediaOptions mediaOptions) {
		this.publisher.setMediaOptions(mediaOptions);
	}

	public KurentoSession getSession() {
		return session;
	}

	public String publishToRoom(SdpType sdpType, String sdpString, boolean doLoopback,
			MediaElement loopbackAlternativeSrc, MediaType loopbackConnectionType) {
		log.info("PARTICIPANT {}: Request to publish video in room {} (sdp type {})", this.getParticipantPublicId(),
				this.session.getSessionId(), sdpType);
		log.trace("PARTICIPANT {}: Publishing Sdp ({}) is {}", this.getParticipantPublicId(), sdpType, sdpString);

		String sdpResponse = this.getPublisher().publish(sdpType, sdpString, doLoopback, loopbackAlternativeSrc,
				loopbackConnectionType);
		this.streaming = true;

		log.trace("PARTICIPANT {}: Publishing Sdp ({}) is {}", this.getParticipantPublicId(), sdpType, sdpResponse);
		log.info("PARTICIPANT {}: Is now publishing video in room {}", this.getParticipantPublicId(),
				this.session.getSessionId());

		if (this.openviduConfig.isRecordingModuleEnabled()
				&& this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
			this.recordingManager.startOneIndividualStreamRecording(session, null, null, this);
		}

		endpointConfig.getCdr().recordNewPublisher(this, session.getSessionId(), publisher.getStreamId(),
				publisher.getMediaOptions(), publisher.createdAt());

		return sdpResponse;
	}

	public void unpublishMedia(EndReason reason) {
		log.info("PARTICIPANT {}: unpublishing media stream from room {}", this.getParticipantPublicId(),
				this.session.getSessionId());
		releasePublisherEndpoint(reason);
		this.publisher = new PublisherEndpoint(webParticipant, this, this.getParticipantPublicId(), this.getPipeline(),
				this.openviduConfig);
		log.info("PARTICIPANT {}: released publisher endpoint and left it initialized (ready for future streaming)",
				this.getParticipantPublicId());
	}

	public String receiveMediaFrom(Participant sender, String sdpOffer) {
		final String senderName = sender.getParticipantPublicId();

		log.info("PARTICIPANT {}: Request to receive media from {} in room {}", this.getParticipantPublicId(),
				senderName, this.session.getSessionId());
		log.trace("PARTICIPANT {}: SdpOffer for {} is {}", this.getParticipantPublicId(), senderName, sdpOffer);

		if (senderName.equals(this.getParticipantPublicId())) {
			log.warn("PARTICIPANT {}: trying to configure loopback by subscribing", this.getParticipantPublicId());
			throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE, "Can loopback only when publishing media");
		}

		KurentoParticipant kSender = (KurentoParticipant) sender;

		if (kSender.getPublisher() == null) {
			log.warn("PARTICIPANT {}: Trying to connect to a user without " + "a publishing endpoint",
					this.getParticipantPublicId());
			return null;
		}

		log.debug("PARTICIPANT {}: Creating a subscriber endpoint to user {}", this.getParticipantPublicId(),
				senderName);

		SubscriberEndpoint subscriber = getNewOrExistingSubscriber(senderName);

		try {
			CountDownLatch subscriberLatch = new CountDownLatch(1);
			SdpEndpoint oldMediaEndpoint = subscriber.createEndpoint(subscriberLatch);
			try {
				if (!subscriberLatch.await(KurentoSession.ASYNC_LATCH_TIMEOUT, TimeUnit.SECONDS)) {
					throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
							"Timeout reached when creating subscriber endpoint");
				}
			} catch (InterruptedException e) {
				throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
						"Interrupted when creating subscriber endpoint: " + e.getMessage());
			}
			if (oldMediaEndpoint != null) {
				log.warn(
						"PARTICIPANT {}: Two threads are trying to create at "
								+ "the same time a subscriber endpoint for user {}",
						this.getParticipantPublicId(), senderName);
				return null;
			}
			if (subscriber.getEndpoint() == null) {
				throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE, "Unable to create subscriber endpoint");
			}

			String subscriberEndpointName = this.getParticipantPublicId() + "_" + kSender.getPublisherStreamId();

			subscriber.setEndpointName(subscriberEndpointName);
			subscriber.getEndpoint().setName(subscriberEndpointName);
			subscriber.setStreamId(kSender.getPublisherStreamId());

			endpointConfig.addEndpointListeners(subscriber, "subscriber");

		} catch (OpenViduException e) {
			this.subscribers.remove(senderName);
			throw e;
		}

		log.debug("PARTICIPANT {}: Created subscriber endpoint for user {}", this.getParticipantPublicId(), senderName);
		try {
			String sdpAnswer = subscriber.subscribe(sdpOffer, kSender.getPublisher());
			log.trace("PARTICIPANT {}: Subscribing SdpAnswer is {}", this.getParticipantPublicId(), sdpAnswer);
			log.info("PARTICIPANT {}: Is now receiving video from {} in room {}", this.getParticipantPublicId(),
					senderName, this.session.getSessionId());

			if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(this.getParticipantPublicId())) {
				endpointConfig.getCdr().recordNewSubscriber(this, this.session.getSessionId(),
						sender.getPublisherStreamId(), sender.getParticipantPublicId(), subscriber.createdAt());
			}

			return sdpAnswer;
		} catch (KurentoServerException e) {
			// TODO Check object status when KurentoClient sets this info in the object
			if (e.getCode() == 40101) {
				log.warn("Publisher endpoint was already released when trying "
						+ "to connect a subscriber endpoint to it", e);
			} else {
				log.error("Exception connecting subscriber endpoint " + "to publisher endpoint", e);
			}
			this.subscribers.remove(senderName);
			releaseSubscriberEndpoint(senderName, subscriber, null);
		}
		return null;
	}

	public void cancelReceivingMedia(String senderName, EndReason reason) {
		log.info("PARTICIPANT {}: cancel receiving media from {}", this.getParticipantPublicId(), senderName);
		SubscriberEndpoint subscriberEndpoint = subscribers.remove(senderName);
		if (subscriberEndpoint == null || subscriberEndpoint.getEndpoint() == null) {
			log.warn("PARTICIPANT {}: Trying to cancel receiving video from user {}. "
					+ "But there is no such subscriber endpoint.", this.getParticipantPublicId(), senderName);
		} else {
			releaseSubscriberEndpoint(senderName, subscriberEndpoint, reason);
			log.info("PARTICIPANT {}: stopped receiving media from {} in room {}", this.getParticipantPublicId(),
					senderName, this.session.getSessionId());
		}
	}

	public void close(EndReason reason, boolean definitelyClosed) {
		log.debug("PARTICIPANT {}: Closing user", this.getParticipantPublicId());
		if (isClosed()) {
			log.warn("PARTICIPANT {}: Already closed", this.getParticipantPublicId());
			return;
		}
		this.closed = definitelyClosed;
		for (String remoteParticipantName : subscribers.keySet()) {
			SubscriberEndpoint subscriber = this.subscribers.get(remoteParticipantName);
			if (subscriber != null && subscriber.getEndpoint() != null) {
				releaseSubscriberEndpoint(remoteParticipantName, subscriber, reason);
				log.debug("PARTICIPANT {}: Released subscriber endpoint to {}", this.getParticipantPublicId(),
						remoteParticipantName);
			} else {
				log.warn(
						"PARTICIPANT {}: Trying to close subscriber endpoint to {}. "
								+ "But the endpoint was never instantiated.",
						this.getParticipantPublicId(), remoteParticipantName);
			}
		}
		this.subscribers.clear();
		releasePublisherEndpoint(reason);
	}

	/**
	 * Returns a {@link SubscriberEndpoint} for the given participant public id. The
	 * endpoint is created if not found.
	 *
	 * @param remotePublicId id of another user
	 * @return the endpoint instance
	 */
	public SubscriberEndpoint getNewOrExistingSubscriber(String senderPublicId) {
		SubscriberEndpoint subscriberEndpoint = new SubscriberEndpoint(webParticipant, this, senderPublicId,
				this.getPipeline(), this.openviduConfig);

		SubscriberEndpoint existingSendingEndpoint = this.subscribers.putIfAbsent(senderPublicId, subscriberEndpoint);
		if (existingSendingEndpoint != null) {
			subscriberEndpoint = existingSendingEndpoint;
			log.trace("PARTICIPANT {}: Already exists a subscriber endpoint to user {}", this.getParticipantPublicId(),
					senderPublicId);
		} else {
			log.debug("PARTICIPANT {}: New subscriber endpoint to user {}", this.getParticipantPublicId(),
					senderPublicId);
		}

		return subscriberEndpoint;
	}

	public void addIceCandidate(String endpointName, IceCandidate iceCandidate) {
		if (this.getParticipantPublicId().equals(endpointName)) {
			this.publisher.addIceCandidate(iceCandidate);
		} else {
			this.getNewOrExistingSubscriber(endpointName).addIceCandidate(iceCandidate);
		}
	}

	public void sendIceCandidate(String senderPublicId, String endpointName, IceCandidate candidate) {
		session.sendIceCandidate(this.getParticipantPrivateId(), senderPublicId, endpointName, candidate);
	}

	public void sendMediaError(ErrorEvent event) {
		String desc = event.getType() + ": " + event.getDescription() + "(errCode=" + event.getErrorCode() + ")";
		log.warn("PARTICIPANT {}: Media error encountered: {}", getParticipantPublicId(), desc);
		session.sendMediaError(this.getParticipantPrivateId(), desc);
	}

	private void releasePublisherEndpoint(EndReason reason) {
		if (publisher != null && publisher.getEndpoint() != null) {

			// Remove streamId from publisher's map
			this.session.publishedStreamIds.remove(this.getPublisherStreamId());

			if (this.openviduConfig.isRecordingModuleEnabled()
					&& this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
				this.recordingManager.stopOneIndividualStreamRecording(session.getSessionId(),
						this.getPublisherStreamId(), false);
			}

			publisher.unregisterErrorListeners();
			if (publisher.kmsWebrtcStatsThread != null) {
				publisher.kmsWebrtcStatsThread.cancel(true);
			}

			for (MediaElement el : publisher.getMediaElements()) {
				releaseElement(getParticipantPublicId(), el);
			}
			releaseElement(getParticipantPublicId(), publisher.getEndpoint());
			this.streaming = false;
			this.session.deregisterPublisher();

			endpointConfig.getCdr().stopPublisher(this.getParticipantPublicId(), publisher.getStreamId(), reason);
			publisher = null;

		} else {
			log.warn("PARTICIPANT {}: Trying to release publisher endpoint but is null", getParticipantPublicId());
		}
	}

	private void releaseSubscriberEndpoint(String senderName, SubscriberEndpoint subscriber, EndReason reason) {
		if (subscriber != null) {

			subscriber.unregisterErrorListeners();
			if (subscriber.kmsWebrtcStatsThread != null) {
				subscriber.kmsWebrtcStatsThread.cancel(true);
			}

			releaseElement(senderName, subscriber.getEndpoint());

			if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(this.getParticipantPublicId())) {
				endpointConfig.getCdr().stopSubscriber(this.getParticipantPublicId(), senderName,
						subscriber.getStreamId(), reason);
			}

		} else {
			log.warn("PARTICIPANT {}: Trying to release subscriber endpoint for '{}' but is null",
					this.getParticipantPublicId(), senderName);
		}
	}

	private void releaseElement(final String senderName, final MediaElement element) {
		final String eid = element.getId();
		try {
			element.release(new Continuation<Void>() {
				@Override
				public void onSuccess(Void result) throws Exception {
					log.debug("PARTICIPANT {}: Released successfully media element #{} for {}",
							getParticipantPublicId(), eid, senderName);
				}

				@Override
				public void onError(Throwable cause) throws Exception {
					log.warn("PARTICIPANT {}: Could not release media element #{} for {}", getParticipantPublicId(),
							eid, senderName, cause);
				}
			});
		} catch (Exception e) {
			log.error("PARTICIPANT {}: Error calling release on elem #{} for {}", getParticipantPublicId(), eid,
					senderName, e);
		}
	}

	public MediaPipeline getPipeline() {
		return this.session.getPipeline();
	}

	@Override
	public String getPublisherStreamId() {
		return this.publisher.getStreamId();
	}

	public void resetPublisherEndpoint() {
		log.info("Reseting publisher endpoint for participant {}", this.getParticipantPublicId());
		this.publisher = new PublisherEndpoint(webParticipant, this, this.getParticipantPublicId(),
				this.session.getPipeline(), this.openviduConfig);
	}

	@Override
	public JsonObject toJson() {
		return this.sharedJson(MediaEndpoint::toJson);
	}

	public JsonObject withStatsToJson() {
		return this.sharedJson(MediaEndpoint::withStatsToJson);
	}

	private JsonObject sharedJson(Function<MediaEndpoint, JsonObject> toJsonFunction) {
		JsonObject json = super.toJson();
		JsonArray publisherEnpoints = new JsonArray();
		if (this.streaming && this.publisher.getEndpoint() != null) {
			publisherEnpoints.add(toJsonFunction.apply(this.publisher));
		}
		JsonArray subscriberEndpoints = new JsonArray();
		for (MediaEndpoint sub : this.subscribers.values()) {
			if (sub.getEndpoint() != null) {
				subscriberEndpoints.add(toJsonFunction.apply(sub));
			}
		}
		json.add("publishers", publisherEnpoints);
		json.add("subscribers", subscriberEndpoints);
		return json;
	}

}
