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
import java.util.function.Function;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.client.Continuation;
import org.kurento.client.ErrorEvent;
import org.kurento.client.Filter;
import org.kurento.client.GenericMediaElement;
import org.kurento.client.IceCandidate;
import org.kurento.client.IceComponentState;
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
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.InfoHandler;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.kurento.TrackType;
import io.openvidu.server.kurento.endpoint.KmsEvent;
import io.openvidu.server.kurento.endpoint.MediaEndpoint;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.kurento.endpoint.SdpType;
import io.openvidu.server.kurento.endpoint.SubscriberEndpoint;

public class KurentoParticipant extends Participant {

	private static final Logger log = LoggerFactory.getLogger(KurentoParticipant.class);

	private OpenviduConfig openviduConfig;

	private InfoHandler infoHandler;
	private CallDetailRecord CDR;

	private boolean webParticipant = true;

	private final KurentoSession session;
	private final MediaPipeline pipeline;

	private PublisherEndpoint publisher;
	private CountDownLatch endPointLatch = new CountDownLatch(1);

	private final ConcurrentMap<String, Filter> filters = new ConcurrentHashMap<>();
	private final ConcurrentMap<String, SubscriberEndpoint> subscribers = new ConcurrentHashMap<String, SubscriberEndpoint>();

	public KurentoParticipant(Participant participant, KurentoSession kurentoSession, MediaPipeline pipeline,
			InfoHandler infoHandler, CallDetailRecord CDR, OpenviduConfig openviduConfig) {
		super(participant.getParticipantPrivateId(), participant.getParticipantPublicId(), participant.getToken(),
				participant.getClientMetadata(), participant.getLocation(), participant.getPlatform(),
				participant.getCreatedAt());
		this.openviduConfig = openviduConfig;
		this.session = kurentoSession;
		this.pipeline = pipeline;
		this.publisher = new PublisherEndpoint(webParticipant, this, participant.getParticipantPublicId(), pipeline,
				this.openviduConfig);

		for (Participant other : session.getParticipants()) {
			if (!other.getParticipantPublicId().equals(this.getParticipantPublicId())) {
				getNewOrExistingSubscriber(other.getParticipantPublicId());
			}
		}
		this.infoHandler = infoHandler;
		this.CDR = CDR;
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
		this.publisher.getEndpoint().setName(publisherStreamId);
		addEndpointListeners(this.publisher);

		// Remove streamId from publisher's map
		this.session.publishedStreamIds.putIfAbsent(this.getPublisherStreamId(), this.getParticipantPrivateId());

	}

	public void shapePublisherMedia(GenericMediaElement element, MediaType type) {
		if (type == null) {
			this.publisher.apply(element);
		} else {
			this.publisher.apply(element, type);
		}
	}

	public synchronized Filter getFilterElement(String id) {
		return filters.get(id);
	}

	/*
	 * public synchronized void addFilterElement(String id, Filter filter) {
	 * filters.put(id, filter); shapePublisherMedia(filter, null); }
	 * 
	 * public synchronized void disableFilterelement(String filterID, boolean
	 * releaseElement) { Filter filter = getFilterElement(filterID);
	 * 
	 * if (filter != null) { try { publisher.revert(filter, releaseElement); } catch
	 * (OpenViduException e) { // Ignore error } } }
	 * 
	 * public synchronized void enableFilterelement(String filterID) { Filter filter
	 * = getFilterElement(filterID);
	 * 
	 * if (filter != null) { try { publisher.apply(filter); } catch
	 * (OpenViduException e) { // Ignore exception if element is already used } } }
	 */

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
		if (this.publisher.getFilter() != null) {
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

	public Set<SubscriberEndpoint> getAllConnectedSubscribedEndpoints() {
		Set<SubscriberEndpoint> subscribedToSet = new HashSet<>();
		for (SubscriberEndpoint se : subscribers.values()) {
			if (se.isConnectedToPublisher()) {
				subscribedToSet.add(se);
			}
		}
		return subscribedToSet;
	}

	public Set<SubscriberEndpoint> getConnectedSubscribedEndpoints(PublisherEndpoint publisher) {
		Set<SubscriberEndpoint> subscribedToSet = new HashSet<>();
		for (SubscriberEndpoint se : subscribers.values()) {
			if (se.isConnectedToPublisher() && se.getPublisher().equals(publisher)) {
				subscribedToSet.add(se);
			}
		}
		return subscribedToSet;
	}

	public String preparePublishConnection() {
		log.info("PARTICIPANT {}: Request to publish video in room {} by " + "initiating connection from server",
				this.getParticipantPublicId(), this.session.getSessionId());

		String sdpOffer = this.getPublisher().preparePublishConnection();

		log.trace("PARTICIPANT {}: Publishing SdpOffer is {}", this.getParticipantPublicId(), sdpOffer);
		log.info("PARTICIPANT {}: Generated Sdp offer for publishing in room {}", this.getParticipantPublicId(),
				this.session.getSessionId());
		return sdpOffer;
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

		CDR.recordNewPublisher(this, this.session.getSessionId(), this.publisher.getMediaOptions(),
				this.publisher.createdAt());

		return sdpResponse;
	}

	public void unpublishMedia(String reason) {
		log.info("PARTICIPANT {}: unpublishing media stream from room {}", this.getParticipantPublicId(),
				this.session.getSessionId());
		releasePublisherEndpoint(reason);
		this.publisher = new PublisherEndpoint(webParticipant, this, this.getParticipantPublicId(), pipeline,
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

			String subscriberStreamId = this.getParticipantPublicId() + "_" + kSender.getPublisherStreamId();

			subscriber.getEndpoint().setName(subscriberStreamId);

			addEndpointListeners(subscriber);

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
				CDR.recordNewSubscriber(this, this.session.getSessionId(), sender.getParticipantPublicId(),
						subscriber.createdAt());
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
			releaseSubscriberEndpoint(senderName, subscriber, "");
		}
		return null;
	}

	public void cancelReceivingMedia(String senderName, String reason) {
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

	public void mutePublishedMedia(TrackType trackType) {
		this.getPublisher().mute(trackType);
	}

	public void unmutePublishedMedia(TrackType trackType) {
		this.getPublisher().unmute(trackType);
	}

	public void close(String reason) {
		log.debug("PARTICIPANT {}: Closing user", this.getParticipantPublicId());
		if (isClosed()) {
			log.warn("PARTICIPANT {}: Already closed", this.getParticipantPublicId());
			return;
		}
		this.closed = true;
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

		SubscriberEndpoint sendingEndpoint = new SubscriberEndpoint(webParticipant, this, senderPublicId, pipeline,
				this.openviduConfig);

		SubscriberEndpoint existingSendingEndpoint = this.subscribers.putIfAbsent(senderPublicId, sendingEndpoint);
		if (existingSendingEndpoint != null) {
			sendingEndpoint = existingSendingEndpoint;
			log.trace("PARTICIPANT {}: Already exists a subscriber endpoint to user {}", this.getParticipantPublicId(),
					senderPublicId);
		} else {
			log.debug("PARTICIPANT {}: New subscriber endpoint to user {}", this.getParticipantPublicId(),
					senderPublicId);
		}

		return sendingEndpoint;
	}

	public void addIceCandidate(String endpointName, IceCandidate iceCandidate) {
		if (this.getParticipantPublicId().equals(endpointName)) {
			this.publisher.addIceCandidate(iceCandidate);
		} else {
			this.getNewOrExistingSubscriber(endpointName).addIceCandidate(iceCandidate);
		}
	}

	public void sendIceCandidate(String endpointName, IceCandidate candidate) {
		session.sendIceCandidate(this.getParticipantPrivateId(), endpointName, candidate);
	}

	public void sendMediaError(ErrorEvent event) {
		String desc = event.getType() + ": " + event.getDescription() + "(errCode=" + event.getErrorCode() + ")";
		log.warn("PARTICIPANT {}: Media error encountered: {}", getParticipantPublicId(), desc);
		session.sendMediaError(this.getParticipantPrivateId(), desc);
	}

	private void releasePublisherEndpoint(String reason) {
		if (publisher != null && publisher.getEndpoint() != null) {

			// Store streamId from publisher's map
			this.session.publishedStreamIds.remove(this.getPublisherStreamId());

			publisher.unregisterErrorListeners();
			for (MediaElement el : publisher.getMediaElements()) {
				releaseElement(getParticipantPublicId(), el);
			}
			releaseElement(getParticipantPublicId(), publisher.getEndpoint());
			this.streaming = false;
			publisher = null;

			CDR.stopPublisher(this.getParticipantPublicId(), reason);

		} else {
			log.warn("PARTICIPANT {}: Trying to release publisher endpoint but is null", getParticipantPublicId());
		}
	}

	private void releaseSubscriberEndpoint(String senderName, SubscriberEndpoint subscriber, String reason) {
		if (subscriber != null) {
			subscriber.unregisterErrorListeners();
			releaseElement(senderName, subscriber.getEndpoint());

			if (!ProtocolElements.RECORDER_PARTICIPANT_PUBLICID.equals(this.getParticipantPublicId())) {
				CDR.stopSubscriber(this.getParticipantPublicId(), senderName, reason);
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

	private void addEndpointListeners(MediaEndpoint endpoint) {

		/*
		 * endpoint.getWebEndpoint().addElementConnectedListener((element) -> { String
		 * msg = "                  Element connected (" +
		 * endpoint.getEndpoint().getName() + ") -> " + "SINK: " +
		 * element.getSink().getName() + " | SOURCE: " + element.getSource().getName() +
		 * " | MEDIATYPE: " + element.getMediaType(); System.out.println(msg);
		 * this.infoHandler.sendInfo(msg); });
		 */

		/*
		 * endpoint.getWebEndpoint().addElementDisconnectedListener((event) -> { String
		 * msg = "                  Element disconnected (" +
		 * endpoint.getEndpoint().getName() + ") -> " + "SINK: " +
		 * event.getSinkMediaDescription() + " | SOURCE: " +
		 * event.getSourceMediaDescription() + " | MEDIATYPE: " + event.getMediaType();
		 * System.out.println(msg); this.infoHandler.sendInfo(msg); });
		 */

		/*
		 * endpoint.getWebEndpoint().addErrorListener((event) -> { String msg =
		 * "                  Error (PUBLISHER) -> " + "ERRORCODE: " +
		 * event.getErrorCode() + " | DESCRIPTION: " + event.getDescription() +
		 * " | TIMESTAMP: " + System.currentTimeMillis(); log.debug(msg);
		 * this.infoHandler.sendInfo(msg); });
		 * 
		 * endpoint.getWebEndpoint().addMediaFlowInStateChangeListener((event) -> {
		 * String msg1 = "                  Media flow in state change (" +
		 * endpoint.getEndpoint().getName() + ") -> " + "STATE: " +
		 * event.getState() + " | SOURCE: " + event.getSource().getName() + " | PAD: " +
		 * event.getPadName() + " | MEDIATYPE: " + event.getMediaType() +
		 * " | TIMESTAMP: " + System.currentTimeMillis();
		 * 
		 * endpoint.flowInMedia.put(event.getSource().getName() + "/" +
		 * event.getMediaType(), event.getSource());
		 * 
		 * String msg2;
		 * 
		 * if (endpoint.flowInMedia.values().size() != 2) { msg2 =
		 * "                        THERE ARE LESS FLOW IN MEDIA'S THAN EXPECTED IN " +
		 * endpoint.getEndpoint().getName() + " (" +
		 * endpoint.flowInMedia.values().size() + ")"; } else { msg2 =
		 * "                        NUMBER OF FLOW IN MEDIA'S IS NOW CORRECT IN " +
		 * endpoint.getEndpoint().getName() + " (" +
		 * endpoint.flowInMedia.values().size() + ")"; }
		 * 
		 * log.debug(msg1); log.debug(msg2); this.infoHandler.sendInfo(msg1);
		 * this.infoHandler.sendInfo(msg2); });
		 * 
		 * endpoint.getWebEndpoint().addMediaFlowOutStateChangeListener((event) -> {
		 * String msg1 = "                  Media flow out state change (" +
		 * endpoint.getEndpoint().getName() + ") -> " + "STATE: " +
		 * event.getState() + " | SOURCE: " + event.getSource().getName() + " | PAD: " +
		 * event.getPadName() + " | MEDIATYPE: " + event.getMediaType() +
		 * " | TIMESTAMP: " + System.currentTimeMillis();
		 * 
		 * endpoint.flowOutMedia. @SuppressWarnings("unchecked")
		 * put(event.getSource().getName() + "/" + event.getMediaType(),
		 * event.getSource());
		 * 
		 * String msg2;
		 * 
		 * if (endpoint.flowOutMedia.values().size() != 2) { msg2 =
		 * "                        THERE ARE LESS FLOW OUT MEDIA'S THAN EXPECTED IN " +
		 * endpoint.getEndpoint().getName() + " (" +
		 * endpoint.flowOutMedia.values().size() + ")"; } else { msg2 =
		 * "                        NUMBER OF FLOW OUT MEDIA'S IS NOW CORRECT IN " +
		 * endpoint.getEndpoint().getName() + " (" +
		 * endpoint.flowOutMedia.values().size() + ")"; }
		 * 
		 * log.debug(msg1); log.debug(msg2); this.infoHandler.sendInfo(msg1);
		 * this.infoHandler.sendInfo(msg2); });
		 * 
		 * endpoint.getWebEndpoint().addMediaSessionStartedListener((event) -> { String
		 * msg = "                  Media session started (" +
		 * endpoint.getEndpoint().getName() + ") | TIMESTAMP: " +
		 * System.currentTimeMillis(); log.debug(msg); this.infoHandler.sendInfo(msg);
		 * });
		 * 
		 * endpoint.getWebEndpoint().addMediaSessionTerminatedListener((event) -> {
		 * String msg = "                  Media session terminated (" +
		 * endpoint.getEndpoint().getName() + ") | TIMESTAMP: " +
		 * System.currentTimeMillis(); log.debug(msg); this.infoHandler.sendInfo(msg);
		 * });
		 * 
		 * endpoint.getWebEndpoint().addMediaStateChangedListener((event) -> { String
		 * msg = "                  Media state changed (" +
		 * endpoint.getEndpoint().getName() + ") from " + event.getOldState() +
		 * " to " + event.getNewState(); log.debug(msg); this.infoHandler.sendInfo(msg);
		 * });
		 * 
		 * endpoint.getWebEndpoint().addConnectionStateChangedListener((event) -> {
		 * String msg = "                  Connection state changed (" +
		 * endpoint.getEndpoint().getName() + ") from " + event.getOldState() +
		 * " to " + event.getNewState() + " | TIMESTAMP: " + System.currentTimeMillis();
		 * log.debug(msg); this.infoHandler.sendInfo(msg); });
		 * 
		 * endpoint.getWebEndpoint().addIceCandidateFoundListener((event) -> { String
		 * msg = "                  ICE CANDIDATE FOUND (" +
		 * endpoint.getEndpoint().getName() + "): CANDIDATE: " +
		 * event.getCandidate().getCandidate() + " | TIMESTAMP: " +
		 * System.currentTimeMillis(); log.debug(msg); this.infoHandler.sendInfo(msg);
		 * });
		 * 
		 * endpoint.getWebEndpoint().addIceComponentStateChangeListener((event) -> {
		 * String msg = "                  ICE COMPONENT STATE CHANGE (" +
		 * endpoint.getEndpoint().getName() + "): for component " +
		 * event.getComponentId() + " - STATE: " + event.getState() + " | TIMESTAMP: " +
		 * System.currentTimeMillis(); log.debug(msg); this.infoHandler.sendInfo(msg);
		 * });
		 * 
		 * endpoint.getWebEndpoint().addIceGatheringDoneListener((event) -> { String msg
		 * = "                  ICE GATHERING DONE! (" +
		 * endpoint.getEndpoint().getName() + ")" + " | TIMESTAMP: " +
		 * System.currentTimeMillis(); log.debug(msg); this.infoHandler.sendInfo(msg);
		 * });
		 */

		endpoint.getWebEndpoint().addMediaFlowInStateChangeListener(event -> {
			String msg1 = "Media flow in state change (" + endpoint.getEndpoint().getName() + ") -> " + "STATE: "
					+ event.getState() + " | SOURCE: " + event.getSource().getName() + " | PAD: " + event.getPadName()
					+ " | MEDIATYPE: " + event.getMediaType() + " | TIMESTAMP: " + System.currentTimeMillis();

			/*
			 * endpoint.flowInMedia.put(event.getSource().getName(), event.getMediaType());
			 * if (endpoint.getPublisher().getMediaOptions().hasAudio() &&
			 * endpoint.getPublisher().getMediaOptions().hasVideo() &&
			 * endpoint.flowInMedia.values().size() == 2) {
			 */
			endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt()));
			/*
			 * } else if (endpoint.flowInMedia.values().size() == 1) {
			 * endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt())); }
			 */

			log.info(msg1);
			this.infoHandler.sendInfo(msg1);
		});

		endpoint.getWebEndpoint().addMediaFlowOutStateChangeListener(event -> {
			String msg1 = "Media flow out state change (" + endpoint.getEndpoint().getName() + ") -> " + "STATE: "
					+ event.getState() + " | SOURCE: " + event.getSource().getName() + " | PAD: " + event.getPadName()
					+ " | MEDIATYPE: " + event.getMediaType() + " | TIMESTAMP: " + System.currentTimeMillis();

			/*
			 * endpoint.flowOutMedia.put(event.getSource().getName(), event.getMediaType());
			 * if (endpoint.getPublisher().getMediaOptions().hasAudio() &&
			 * endpoint.getPublisher().getMediaOptions().hasVideo() &&
			 * endpoint.flowOutMedia.values().size() == 2) {
			 */
			endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt()));
			/*
			 * } else if (endpoint.flowOutMedia.values().size() == 1) {
			 * endpoint.kmsEvents.add(new KmsEvent(event)); }
			 */

			log.info(msg1);
			this.infoHandler.sendInfo(msg1);
		});

		endpoint.getWebEndpoint().addIceGatheringDoneListener(event -> {
			endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt()));
		});

		endpoint.getWebEndpoint().addConnectionStateChangedListener(event -> {
			endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt()));
		});

		endpoint.getWebEndpoint().addNewCandidatePairSelectedListener(event -> {
			endpoint.selectedLocalIceCandidate = event.getCandidatePair().getLocalCandidate();
			endpoint.selectedRemoteIceCandidate = event.getCandidatePair().getRemoteCandidate();
			endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt()));
			String msg = "ICE CANDIDATE SELECTED (" + endpoint.getEndpoint().getName() + "): LOCAL CANDIDATE: "
					+ endpoint.selectedLocalIceCandidate + " | REMOTE CANDIDATE: " + endpoint.selectedRemoteIceCandidate
					+ " | TIMESTAMP: " + System.currentTimeMillis();
			log.warn(msg);
			this.infoHandler.sendInfo(msg);
		});

		endpoint.getEndpoint().addMediaTranscodingStateChangeListener(event -> {
			endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt()));
		});

		endpoint.getWebEndpoint().addIceComponentStateChangeListener(event -> {
			if (!event.getState().equals(IceComponentState.READY)) {
				endpoint.kmsEvents.add(new KmsEvent(event, endpoint.createdAt()));
			}
		});
	}

	public MediaPipeline getPipeline() {
		return this.pipeline;
	}

	@Override
	public String getPublisherStreamId() {
		return this.publisher.getEndpoint().getName();
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
