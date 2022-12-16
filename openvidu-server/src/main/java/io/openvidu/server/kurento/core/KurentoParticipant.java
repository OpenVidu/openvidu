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

import java.util.Collection;
import java.util.Iterator;
import java.util.Map.Entry;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.function.Function;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.client.Continuation;
import org.kurento.client.Endpoint;
import org.kurento.client.ErrorEvent;
import org.kurento.client.Filter;
import org.kurento.client.IceCandidate;
import org.kurento.client.MediaElement;
import org.kurento.client.MediaPipeline;
import org.kurento.client.PassThrough;
import org.kurento.client.internal.server.KurentoServerException;
import org.kurento.jsonrpc.JsonRpcException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.server.cdr.WebrtcDebugEvent;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.IdentifierPrefixes;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.kurento.endpoint.MediaEndpoint;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.kurento.endpoint.SubscriberEndpoint;
import io.openvidu.server.recording.service.RecordingManager;
import io.openvidu.server.utils.RemoteOperationUtils;

public class KurentoParticipant extends Participant {

	private static final Logger log = LoggerFactory.getLogger(KurentoParticipant.class);

	private OpenviduConfig openviduConfig;
	private RecordingManager recordingManager;

	private final KurentoSession session;
	private KurentoParticipantEndpointConfig endpointConfig;

	private PublisherEndpoint publisher;
	private CountDownLatch publisherLatch = new CountDownLatch(1);

	private final ConcurrentMap<String, Filter> filters = new ConcurrentHashMap<>();
	private final ConcurrentMap<String, SubscriberEndpoint> subscribers = new ConcurrentHashMap<String, SubscriberEndpoint>();

	public KurentoParticipant(Participant participant, KurentoSession kurentoSession,
			KurentoParticipantEndpointConfig endpointConfig, OpenviduConfig openviduConfig,
			RecordingManager recordingManager) {
		super(participant.getFinalUserId(), participant.getParticipantPrivateId(), participant.getParticipantPublicId(),
				kurentoSession.getSessionId(), kurentoSession.getUniqueSessionId(), participant.getToken(),
				participant.getClientMetadata(), participant.getLocation(), participant.getPlatform(),
				participant.getEndpointType(), participant.getActiveAt());
		this.endpointConfig = endpointConfig;
		this.openviduConfig = openviduConfig;
		this.recordingManager = recordingManager;
		this.session = kurentoSession;

		if (!OpenViduRole.SUBSCRIBER.equals(participant.getToken().getRole())) {
			// Initialize a PublisherEndpoint
			initPublisherEndpoint();
		}
	}

	public void initPublisherEndpoint() {
		this.publisher = new PublisherEndpoint(endpointType, this, this.participantPublicId, this.session.getPipeline(),
				this.openviduConfig, null);
	}

	public void createPublishingEndpoint(MediaOptions mediaOptions, String streamId) {
		publisher.setStreamId(streamId);
		publisher.setEndpointName(streamId);
		publisher.setMediaOptions(mediaOptions);
		publisher.createEndpoint(publisherLatch);
		if (getPublisher().getEndpoint() == null) {
			throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE, "Unable to create publisher endpoint");
		}
		publisher.getEndpoint().setName(streamId);

		endpointConfig.addEndpointListeners(this.publisher, "publisher");

		// Put streamId in publisher's map
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

	public boolean isPublisherEndpointDefined() {
		return this.publisher != null;
	}

	public PublisherEndpoint getPublisher() {
		try {
			if (!publisherLatch.await(KurentoSession.ASYNC_LATCH_TIMEOUT, TimeUnit.SECONDS)) {
				throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
						"Timeout reached while waiting for publisher endpoint to be ready");
			}
		} catch (InterruptedException e) {
			throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
					"Interrupted while waiting for publisher endpoint to be ready: " + e.getMessage());
		}
		return this.publisher;
	}

	public SubscriberEndpoint getSubscriber(String senderPublicId) {
		return this.subscribers.get(senderPublicId);
	}

	public Collection<SubscriberEndpoint> getSubscribers() {
		return this.subscribers.values();
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

	public String publishToRoom(String sdpOffer, boolean doLoopback, boolean silent) {
		log.info("PARTICIPANT {}: Request to publish video in room {})", this.getParticipantPublicId(),
				this.session.getSessionId());
		log.trace("PARTICIPANT {}: Publishing SDPOffer is {}", this.getParticipantPublicId(), sdpOffer);

		String sdpResponse = this.getPublisher().publish(sdpOffer, doLoopback);
		this.streaming = true;

		log.trace("PARTICIPANT {}: Publishing Sdp is {}", this.getParticipantPublicId(), sdpResponse);
		log.info("PARTICIPANT {}: Is now publishing video in room {}", this.getParticipantPublicId(),
				this.session.getSessionId());

		if (this.openviduConfig.isRecordingModuleEnabled() && this.token.record()
				&& this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
			this.recordingManager.startOneIndividualStreamRecording(session, this);
		}

		if (!silent) {
			endpointConfig.getCdr().recordNewPublisher(this, publisher.getStreamId(), publisher.getMediaOptions(),
					publisher.createdAt());
		}

		return sdpResponse;
	}

	public void unpublishMedia(EndReason reason, Long kmsDisconnectionTime) {
		log.info("PARTICIPANT {}: unpublishing media stream from room {}", this.getParticipantPublicId(),
				this.session.getSessionId());
		final MediaOptions mediaOptions = this.getPublisher().getMediaOptions();
		releasePublisherEndpoint(reason, kmsDisconnectionTime);
		resetPublisherEndpoint(mediaOptions, null);
		log.info("PARTICIPANT {}: released publisher endpoint and left it initialized (ready for future streaming)",
				this.getParticipantPublicId());
	}

	public String prepareReceiveMediaFrom(Participant sender) {
		final String senderName = sender.getParticipantPublicId();

		log.info("PARTICIPANT {}: Request to prepare receive media from {} in room {}", this.getParticipantPublicId(),
				senderName, this.session.getSessionId());

		if (senderName.equals(this.getParticipantPublicId())) {
			log.warn("PARTICIPANT {}: trying to configure loopback by subscribing", this.getParticipantPublicId());
			throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE, "Can loopback only when publishing media");
		}

		KurentoParticipant kSender = (KurentoParticipant) sender;
		if (kSender.streaming && kSender.getPublisher() != null) {

			final Lock closingReadLock = kSender.getPublisher().closingLock.readLock();
			if (closingReadLock.tryLock()) {
				try {

					SubscriberEndpoint subscriber = initializeSubscriberEndpoint(kSender);

					try {
						String sdpOffer = subscriber.prepareSubscription(kSender.getPublisher());
						log.trace("PARTICIPANT {}: Subscribing SdpOffer is {}", this.getParticipantPublicId(),
								sdpOffer);
						log.info("PARTICIPANT {}: offer prepared to receive media from {} in room {}",
								this.getParticipantPublicId(), senderName, this.session.getSessionId());
						return sdpOffer;
					} catch (KurentoServerException e) {
						log.error("Exception preparing subscriber endpoint for user {}: {}",
								this.getParticipantPublicId(), e.getMessage());
						this.subscribers.remove(senderName);
						releaseSubscriberEndpoint(senderName, (KurentoParticipant) sender, subscriber, null, false);
						return null;
					}
				} finally {
					closingReadLock.unlock();
				}
			}
		}
		log.error(
				"PublisherEndpoint of participant {} of session {} is closed. Participant {} couldn't subscribe to it ",
				senderName, sender.getSessionId(), this.participantPublicId);
		throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
				"Unable to create subscriber endpoint. Publisher endpoint of participant " + senderName + "is closed");
	}

	public String receiveMedia(Participant sender, String sdpString, boolean silent, boolean initByServer) {
		final String senderName = sender.getParticipantPublicId();
		log.info("PARTICIPANT {}: Request to receive media from {} in room {}", this.getParticipantPublicId(),
				senderName, this.session.getSessionId());
		log.trace("PARTICIPANT {}: Sdp string for {} is {}", this.getParticipantPublicId(), senderName, sdpString);

		if (senderName.equals(this.getParticipantPublicId())) {
			log.warn("PARTICIPANT {}: trying to configure loopback by subscribing", this.getParticipantPublicId());
			throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE, "Can loopback only when publishing media");
		}
		KurentoParticipant kSender = (KurentoParticipant) sender;
		if (kSender.streaming && kSender.getPublisher() != null) {

			final Lock closingReadLock = kSender.getPublisher().closingLock.readLock();
			if (closingReadLock.tryLock()) {
				try {

					// If initialized by server SubscriberEndpoint was created on
					// prepareReceiveMediaFrom. If initialized by client must be created now
					final SubscriberEndpoint subscriber = initByServer ? getSubscriber(senderName)
							: initializeSubscriberEndpoint(kSender);

					if (subscriber.getEndpoint() == null) {
						throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
								"Unable to create subscriber endpoint");
					}
					try {
						String sdpAnswer = subscriber.subscribe(sdpString, kSender.getPublisher());
						log.info("PARTICIPANT {}: Is now receiving video from {} in room {}",
								this.getParticipantPublicId(), senderName, this.session.getSessionId());
						if (!silent && !this.isRecorderOrSttParticipant()) {
							endpointConfig.getCdr().recordNewSubscriber(this, sender.getPublisherStreamId(),
									sender.getParticipantPublicId(), subscriber.createdAt());
						}
						return sdpAnswer;
					} catch (KurentoServerException e) {
						// TODO Check object status when KurentoClient sets this info in the object
						if (e.getCode() == 40101) {
							log.warn(
									"Publisher endpoint was already released when trying to connect a subscriber endpoint to it",
									e);
						} else {
							log.error("Exception connecting subscriber endpoint to publisher endpoint", e);
						}
						this.subscribers.remove(senderName);
						releaseSubscriberEndpoint(senderName, (KurentoParticipant) sender, subscriber, null, false);
						return null;
					}
				} finally {
					closingReadLock.unlock();
				}

			}
		}
		log.error(
				"PublisherEndpoint of participant {} of session {} is closed. Participant {} couldn't subscribe to it ",
				senderName, sender.getSessionId(), this.participantPublicId);
		throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
				"Unable to create subscriber endpoint. Publisher endpoint of participant " + senderName + "is closed");
	}

	public void cancelReceivingMedia(KurentoParticipant senderKurentoParticipant, EndReason reason, boolean silent) {
		final String senderName = senderKurentoParticipant.getParticipantPublicId();
		final PublisherEndpoint pub = senderKurentoParticipant.publisher;
		if (pub != null) {
			try {
				final Lock closingWriteLock = pub.closingLock.writeLock();
				if (closingWriteLock.tryLock(15, TimeUnit.SECONDS)) {
					try {
						log.info("PARTICIPANT {}: cancel receiving media from {}", this.getParticipantPublicId(),
								senderName);
						SubscriberEndpoint subscriberEndpoint = subscribers.remove(senderName);
						if (subscriberEndpoint == null) {
							log.warn(
									"PARTICIPANT {}: Trying to cancel receiving video from user {}. "
											+ "But there is no such subscriber endpoint.",
									this.getParticipantPublicId(), senderName);
						} else {
							releaseSubscriberEndpoint(senderName, senderKurentoParticipant, subscriberEndpoint, reason,
									silent);
							log.info("PARTICIPANT {}: stopped receiving media from {} in room {}",
									this.getParticipantPublicId(), senderName, this.session.getSessionId());
						}
					} finally {
						closingWriteLock.unlock();
					}
				} else {
					log.error(
							"Timeout waiting for PublisherEndpoint closing lock of participant {} to be available for participant {} to call cancelReceivingMedia",
							senderName, this.getParticipantPublicId());
				}
			} catch (InterruptedException e) {
				log.error(
						"InterruptedException while waiting for PublisherEndpoint closing lock of participant {} to be available for participant {} to call cancelReceivingMedia",
						senderName, this.getParticipantPublicId());
			} finally {
				// Always clean map
				subscribers.remove(senderName);
			}
		}
	}

	public void close(EndReason reason, boolean definitelyClosed, Long kmsDisconnectionTime) {
		log.debug("PARTICIPANT {}: Closing user", this.getParticipantPublicId());
		if (isClosed()) {
			log.warn("PARTICIPANT {}: Already closed", this.getParticipantPublicId());
			return;
		}
		this.closed = definitelyClosed;
		Iterator<Entry<String, SubscriberEndpoint>> it = subscribers.entrySet().iterator();
		while (it.hasNext()) {
			final Entry<String, SubscriberEndpoint> entry = it.next();
			final String remoteParticipantName = entry.getKey();
			final SubscriberEndpoint subscriber = entry.getValue();
			it.remove();
			if (subscriber != null && subscriber.getEndpoint() != null) {

				try {
					releaseSubscriberEndpoint(remoteParticipantName,
							(KurentoParticipant) this.session.getParticipantByPublicId(remoteParticipantName),
							subscriber, reason, false);
					log.debug("PARTICIPANT {}: Released subscriber endpoint to {}", this.getParticipantPublicId(),
							remoteParticipantName);
				} catch (JsonRpcException e) {
					log.error("Error releasing subscriber endpoint of participant {}: {}", this.participantPublicId,
							e.getMessage());
				}
			} else {
				log.warn(
						"PARTICIPANT {}: Trying to close subscriber endpoint to {}. "
								+ "But the endpoint was never instantiated.",
						this.getParticipantPublicId(), remoteParticipantName);
			}
		}
		if (publisher != null && publisher.getEndpoint() != null) {
			releasePublisherEndpoint(reason, kmsDisconnectionTime);
		}
	}

	/**
	 * Returns a {@link SubscriberEndpoint} for the given participant public id. The
	 * endpoint is created if not found.
	 *
	 * @param remotePublicId id of another user
	 * @return the endpoint instance
	 */
	public SubscriberEndpoint getNewOrExistingSubscriber(String senderPublicId) {
		SubscriberEndpoint subscriberEndpoint = new SubscriberEndpoint(endpointType, this, senderPublicId,
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

	public String generateStreamId(MediaOptions mediaOptions) {
		String type = mediaOptions.hasVideo() ? mediaOptions.getTypeOfVideo() : "MICRO";
		return IdentifierPrefixes.STREAM_ID + type.substring(0, Math.min(type.length(), 3)) + "_"
				+ RandomStringUtils.randomAlphabetic(1).toUpperCase() + RandomStringUtils.randomAlphanumeric(3) + "_"
				+ this.getParticipantPublicId();
	}

	public String calculateSubscriberEndpointName(Participant senderParticipant) {
		return this.getParticipantPublicId() + "_" + senderParticipant.getPublisherStreamId();
	}

	private SubscriberEndpoint initializeSubscriberEndpoint(Participant kSender) {

		String senderName = kSender.getParticipantPublicId();

		log.debug("PARTICIPANT {}: Creating a subscriber endpoint to user {}", this.getParticipantPublicId(),
				senderName);

		SubscriberEndpoint subscriber = getNewOrExistingSubscriber(senderName);

		try {
			CountDownLatch subscriberLatch = new CountDownLatch(1);
			Endpoint oldMediaEndpoint = subscriber.createEndpoint(subscriberLatch);

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

			String subscriberEndpointName = calculateSubscriberEndpointName(kSender);

			subscriber.setEndpointName(subscriberEndpointName);
			subscriber.getEndpoint().setName(subscriberEndpointName);
			subscriber.setStreamId(kSender.getPublisherStreamId());

			endpointConfig.addEndpointListeners(subscriber, "subscriber");

		} catch (OpenViduException e) {
			this.subscribers.remove(senderName);
			throw e;
		}

		log.debug("PARTICIPANT {}: Created subscriber endpoint for user {}", this.getParticipantPublicId(), senderName);

		return subscriber;
	}

	private void releasePublisherEndpoint(EndReason reason, Long kmsDisconnectionTime) {
		if (publisher != null && publisher.getEndpoint() != null) {
			try {
				final Lock closingWriteLock = publisher.closingLock.writeLock();
				if (closingWriteLock.tryLock(15, TimeUnit.SECONDS)) {
					try {
						this.releasePublisherEndpointAux(reason, kmsDisconnectionTime);
					} finally {
						closingWriteLock.unlock();
					}
				}
			} catch (InterruptedException e) {
				log.error(
						"Timeout wating for PublisherEndpoint closing lock of participant {} to be available to call releasePublisherEndpoint",
						this.participantPublicId, this.getParticipantPublicId());
				log.error("Forcing PublisherEndpoint release. Possibly some session event will be incomplete");
				this.releasePublisherEndpointAux(reason, kmsDisconnectionTime);
			}
		} else {
			log.warn("PARTICIPANT {}: Trying to release publisher endpoint but is null", getParticipantPublicId());
		}
	}

	private void releasePublisherEndpointAux(EndReason reason, Long kmsDisconnectionTime) {
		try {
			// Remove streamId from publisher's map
			this.session.publishedStreamIds.remove(this.getPublisherStreamId());

			this.streaming = false;
			this.session.deregisterPublisher(this);

			if (this.openviduConfig.isRecordingModuleEnabled() && this.token.record()
					&& this.recordingManager.sessionIsBeingRecorded(session.getSessionId())) {
				this.recordingManager.stopOneIndividualStreamRecording(session, this.getPublisherStreamId(),
						kmsDisconnectionTime);
			}

			publisher.cancelStatsLoop.set(true);

			// These operations are all remote
			publisher.unregisterErrorListeners();
			for (MediaElement el : publisher.getMediaElements()) {
				releaseElement(getParticipantPublicId(), el);
			}
			releaseElement(getParticipantPublicId(), publisher.getEndpoint());

		} catch (JsonRpcException e) {
			log.error("Error releasing publisher endpoint of participant {}: {}", this.participantPublicId,
					e.getMessage());
		}

		endpointConfig.getCdr().stopPublisher(this.getParticipantPublicId(), publisher.getStreamId(), reason);
		publisher = null;
	}

	private void releaseSubscriberEndpoint(String senderName, KurentoParticipant publisherParticipant,
			SubscriberEndpoint subscriber, EndReason reason, boolean silent) {

		if (subscriber != null) {

			subscriber.unregisterErrorListeners();
			subscriber.cancelStatsLoop.set(true);

			if (subscriber.getEndpoint() != null) {
				releaseElement(senderName, subscriber.getEndpoint());
			}

			if (!silent) {

				// Stop PlayerEndpoint of IP CAM if last subscriber disconnected
				if (publisherParticipant != null && publisherParticipant.publisher != null) {
					final PublisherEndpoint senderPublisher = publisherParticipant.publisher;
					// If no PublisherEndpoint, then it means that the publisher already closed it
					final KurentoMediaOptions options = (KurentoMediaOptions) senderPublisher.getMediaOptions();
					if (options != null && options.onlyPlayWithSubscribers != null && options.onlyPlayWithSubscribers) {
						synchronized (senderPublisher) {
							senderPublisher.numberOfSubscribers--;
							if (senderPublisher.isPlayerEndpoint() && senderPublisher.numberOfSubscribers == 0) {
								try {
									if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
										senderPublisher.getPlayerEndpoint().stop();
									}
									log.info(
											"IP Camera stream {} feed is now disabled because there are no subscribers",
											senderPublisher.getStreamId());
								} catch (Exception e) {
									log.info("Error while disabling feed for IP camera {}: {}",
											senderPublisher.getStreamId(), e.getMessage());
								}
							}
						}
					}
				}

				if (!this.isRecorderOrSttParticipant()) {
					endpointConfig.getCdr().stopSubscriber(this.getParticipantPublicId(), senderName,
							subscriber.getStreamId(), reason);
				}

			}
		} else {
			log.warn("PARTICIPANT {}: Trying to release subscriber endpoint for '{}' but is null",
					this.getParticipantPublicId(), senderName);
		}
	}

	void releaseElement(final String senderName, final MediaElement element) {
		final String eid = element.getId();
		try {
			if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
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
			}
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
		if (this.publisher != null) {
			return this.publisher.getStreamId();
		}
		return null;
	}

	public void resetPublisherEndpoint(MediaOptions mediaOptions, PassThrough passThru) {
		log.info("Resetting publisher endpoint for participant {}", this.getParticipantPublicId());
		this.publisher = new PublisherEndpoint(endpointType, this, this.getParticipantPublicId(),
				this.session.getPipeline(), this.openviduConfig, passThru);
		this.publisher.setMediaOptions(mediaOptions);
		this.publisherLatch = new CountDownLatch(1);
	}

	public void logIceCandidate(WebrtcDebugEvent event) {
		endpointConfig.getCdr().log(event);
	}

	@Override
	public JsonObject toJson() {
		return this.sharedJson(MediaEndpoint::toJson);
	}

	@Override
	public JsonObject withStatsToJson() {
		return this.sharedJson(MediaEndpoint::withStatsToJson);
	}

	private JsonObject sharedJson(Function<MediaEndpoint, JsonObject> toJsonFunction) {
		JsonObject json = super.toJson();
		JsonArray publisherEndpoints = new JsonArray();
		if (this.streaming && this.publisher.getEndpoint() != null) {
			publisherEndpoints.add(toJsonFunction.apply(this.publisher));
		}
		JsonArray subscriberEndpoints = new JsonArray();
		for (MediaEndpoint sub : this.subscribers.values()) {
			if (sub.getEndpoint() != null) {
				subscriberEndpoints.add(toJsonFunction.apply(sub));
			}
		}
		json.add("publishers", publisherEndpoints);
		json.add("subscribers", subscriberEndpoints);
		return json;
	}

}
