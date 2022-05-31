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

package io.openvidu.server.kurento.endpoint;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import io.openvidu.server.utils.ice.IceCandidateDataParser;
import io.openvidu.server.utils.ice.IceCandidateType;
import org.kurento.client.BaseRtpEndpoint;
import org.kurento.client.Continuation;
import org.kurento.client.Endpoint;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.IceCandidate;
import org.kurento.client.ListenerSubscription;
import org.kurento.client.MediaElement;
import org.kurento.client.MediaPipeline;
import org.kurento.client.OfferOptions;
import org.kurento.client.PlayerEndpoint;
import org.kurento.client.RtpEndpoint;
import org.kurento.client.SdpEndpoint;
import org.kurento.client.WebRtcEndpoint;
import org.kurento.client.internal.server.KurentoServerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.server.cdr.WebrtcDebugEvent;
import io.openvidu.server.cdr.WebrtcDebugEvent.WebrtcDebugEventIssuer;
import io.openvidu.server.cdr.WebrtcDebugEvent.WebrtcDebugEventOperation;
import io.openvidu.server.cdr.WebrtcDebugEvent.WebrtcDebugEventType;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Participant;
import io.openvidu.server.kurento.core.KurentoMediaOptions;
import io.openvidu.server.kurento.core.KurentoParticipant;
import io.openvidu.server.utils.RemoteOperationUtils;

/**
 * {@link Endpoint} wrapper. Can be based on WebRtcEndpoint (that supports
 * buffering of {@link IceCandidate}s until the {@link WebRtcEndpoint} is
 * created), PlayerEndpoint (to play RTSP or file streams) and RtpEndpoint.
 * Connections to other peers are opened using the corresponding method of the
 * internal endpoint.
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public abstract class MediaEndpoint {
	private static Logger log;
	private OpenviduConfig openviduConfig;

	private EndpointType endpointType;

	private WebRtcEndpoint webEndpoint = null;
	private RtpEndpoint endpoint = null;
	private PlayerEndpoint playerEndpoint = null;

	private final int maxRecvKbps;
	private final int minRecvKbps;
	private final int maxSendKbps;
	private final int minSendKbps;

	private KurentoParticipant owner;
	protected String endpointName; // KMS media object identifier. Unique for every MediaEndpoint
	protected String streamId; // OpenVidu Stream identifier. Common property for a
								// PublisherEndpoint->SubscriberEndpoint flow. Equal to endpointName for
								// PublisherEndpoints, different for SubscriberEndpoints
	protected Long createdAt; // Timestamp when this [publisher / subscriber] started [publishing / receiving]

	private MediaPipeline pipeline = null;
	private ListenerSubscription endpointSubscription = null;

	private final List<IceCandidate> receivedCandidateList = Collections.synchronizedList(new ArrayList<>());
	private final List<IceCandidate> gatheredCandidateList = Collections.synchronizedList(new ArrayList<>());
	private LinkedList<IceCandidate> candidates = new LinkedList<IceCandidate>();


	public String selectedLocalIceCandidate;
	public String selectedRemoteIceCandidate;
	public Queue<KmsEvent> kmsEvents = new ConcurrentLinkedQueue<>();

	public Runnable kmsWebrtcStatsRunnable;
	public AtomicInteger statsNotFoundErrors = new AtomicInteger(0);
	public AtomicBoolean cancelStatsLoop = new AtomicBoolean(false);

	private Gson gson = new GsonBuilder().create();

	/**
	 * Constructor to set the owner, the endpoint's name and the media pipeline.
	 *
	 * @param web
	 * @param owner
	 * @param endpointName
	 * @param pipeline
	 * @param log
	 */
	public MediaEndpoint(EndpointType endpointType, KurentoParticipant owner, String endpointName,
			MediaPipeline pipeline, OpenviduConfig openviduConfig, Logger log) {
		if (log == null) {
			MediaEndpoint.log = LoggerFactory.getLogger(MediaEndpoint.class);
		} else {
			MediaEndpoint.log = log;
		}
		this.endpointType = endpointType;
		this.owner = owner;
		this.setEndpointName(endpointName);
		this.setMediaPipeline(pipeline);

		this.openviduConfig = openviduConfig;

		KurentoOptions kurentoTokenOptions = this.owner.getToken().getKurentoOptions();
		if (kurentoTokenOptions != null) {
			this.maxRecvKbps = kurentoTokenOptions.getVideoMaxRecvBandwidth() != null
					? kurentoTokenOptions.getVideoMaxRecvBandwidth()
					: this.openviduConfig.getVideoMaxRecvBandwidth();
			this.minRecvKbps = kurentoTokenOptions.getVideoMinRecvBandwidth() != null
					? kurentoTokenOptions.getVideoMinRecvBandwidth()
					: this.openviduConfig.getVideoMinRecvBandwidth();
			this.maxSendKbps = kurentoTokenOptions.getVideoMaxSendBandwidth() != null
					? kurentoTokenOptions.getVideoMaxSendBandwidth()
					: this.openviduConfig.getVideoMaxSendBandwidth();
			this.minSendKbps = kurentoTokenOptions.getVideoMinSendBandwidth() != null
					? kurentoTokenOptions.getVideoMinSendBandwidth()
					: this.openviduConfig.getVideoMinSendBandwidth();
		} else {
			this.maxRecvKbps = this.openviduConfig.getVideoMaxRecvBandwidth();
			this.minRecvKbps = this.openviduConfig.getVideoMinRecvBandwidth();
			this.maxSendKbps = this.openviduConfig.getVideoMaxSendBandwidth();
			this.minSendKbps = this.openviduConfig.getVideoMinSendBandwidth();
		}
	}

	public boolean isWeb() {
		return EndpointType.WEBRTC_ENDPOINT.equals(this.endpointType);
	}

	public boolean isPlayerEndpoint() {
		return EndpointType.PLAYER_ENDPOINT.equals(this.endpointType);
	}

	/**
	 * @return the user session that created this endpoint
	 */
	public Participant getOwner() {
		return owner;
	}

	/**
	 * @return the internal endpoint ({@link RtpEndpoint} or {@link WebRtcEndpoint}
	 *         or {@link PlayerEndpoint})
	 */
	public Endpoint getEndpoint() {
		if (this.isWeb()) {
			return this.webEndpoint;
		} else if (this.isPlayerEndpoint()) {
			return this.playerEndpoint;
		} else {
			return this.endpoint;
		}
	}

	public BaseRtpEndpoint getBaseRtpEndpoint() {
		if (this.isWeb()) {
			return this.webEndpoint;
		}
		return this.endpoint;
	}

	public long createdAt() {
		return this.createdAt;
	}

	public WebRtcEndpoint getWebEndpoint() {
		return webEndpoint;
	}

	public RtpEndpoint getRtpEndpoint() {
		return endpoint;
	}

	public PlayerEndpoint getPlayerEndpoint() {
		return playerEndpoint;
	}

	/**
	 * If this object doesn't have a {@link WebRtcEndpoint}, it is created in a
	 * thread-safe way using the internal {@link MediaPipeline}. Otherwise no
	 * actions are taken. It also registers an error listener for the endpoint and
	 * for any additional media elements.
	 *
	 * @param endpointLatch latch whose countdown is performed when the asynchronous
	 *                      call to build the {@link WebRtcEndpoint} returns
	 *
	 * @return the existing endpoint, if any
	 */
	public synchronized Endpoint createEndpoint(CountDownLatch endpointLatch) {
		Endpoint old = this.getEndpoint();
		if (old == null) {
			internalEndpointInitialization(endpointLatch);
		} else {
			endpointLatch.countDown();
			if (this.isWeb()) {
				while (!candidates.isEmpty()) {
					internalAddIceCandidate(candidates.removeFirst());
				}
			}
		}
		return old;
	}

	/**
	 * @return the pipeline
	 */
	public MediaPipeline getPipeline() {
		return this.pipeline;
	}

	/**
	 * Sets the {@link MediaPipeline} used to create the internal
	 * {@link WebRtcEndpoint}.
	 *
	 * @param pipeline the {@link MediaPipeline}
	 */
	public void setMediaPipeline(MediaPipeline pipeline) {
		this.pipeline = pipeline;
	}

	public String getEndpointName() {
		if (endpointName == null) {
			endpointName = this.getEndpoint().getName();
		}
		return endpointName;
	}

	public void setEndpointName(String endpointName) {
		this.endpointName = endpointName;
	}

	public String getStreamId() {
		return streamId;
	}

	public void setStreamId(String streamId) {
		this.streamId = streamId;
	}

	/**
	 * Unregisters all error listeners created for media elements owned by this
	 * instance.
	 */
	public synchronized void unregisterErrorListeners() {
		unregisterElementErrListener(endpoint, endpointSubscription);
	}

	/**
	 * Creates the endpoint (RTP or WebRTC) and any other additional elements (if
	 * needed).
	 *
	 * @param endpointLatch
	 */
	protected void internalEndpointInitialization(final CountDownLatch endpointLatch) {
		if (this.isWeb()) {
			WebRtcEndpoint.Builder builder = new WebRtcEndpoint.Builder(pipeline);
			/*
			 * if (this.dataChannels) { builder.useDataChannels(); }
			 */
			builder.buildAsync(new Continuation<WebRtcEndpoint>() {
				@Override
				public void onSuccess(WebRtcEndpoint result) throws Exception {
					webEndpoint = result;
					String kmsUri = owner.getSession().getKms().getUri();
					String coturnIp = openviduConfig.getCoturnIp(kmsUri);
					if (coturnIp != null && !coturnIp.isEmpty()) {
						webEndpoint.setStunServerAddress(coturnIp);
						webEndpoint.setStunServerPort(openviduConfig.getCoturnPort());
					}

					endpointLatch.countDown();

					while (!candidates.isEmpty()) {
						internalAddIceCandidate(candidates.removeFirst());
					}

					log.trace("EP {}: Created a new WebRtcEndpoint", endpointName);
					endpointSubscription = registerElemErrListener(webEndpoint);

					// This can be done after unlocking latch. Not necessary to wait
					webEndpoint.setMaxVideoRecvBandwidth(maxRecvKbps, new Continuation<Void>() {
						@Override
						public void onSuccess(Void result) throws Exception {
						}

						@Override
						public void onError(Throwable cause) throws Exception {
							log.error("Error setting max video receive bandwidth for endpoint {}: {}", endpointName,
									cause.getMessage());
						}
					});
					webEndpoint.setMinVideoRecvBandwidth(minRecvKbps, new Continuation<Void>() {
						@Override
						public void onSuccess(Void result) throws Exception {
						}

						@Override
						public void onError(Throwable cause) throws Exception {
							log.error("Error setting min video receive bandwidth for endpoint {}: {}", endpointName,
									cause.getMessage());
						}
					});
					webEndpoint.setMaxVideoSendBandwidth(maxSendKbps, new Continuation<Void>() {
						@Override
						public void onSuccess(Void result) throws Exception {
						}

						@Override
						public void onError(Throwable cause) throws Exception {
							log.error("Error setting max video send bandwidth for endpoint {}: {}", endpointName,
									cause.getMessage());
						}
					});
					webEndpoint.setMinVideoSendBandwidth(minSendKbps, new Continuation<Void>() {
						@Override
						public void onSuccess(Void result) throws Exception {
						}

						@Override
						public void onError(Throwable cause) throws Exception {
							log.error("Error setting min video send bandwidth for endpoint {}: {}", endpointName,
									cause.getMessage());
						}
					});
				}

				@Override
				public void onError(Throwable cause) throws Exception {
					endpointLatch.countDown();
					log.error("EP {}: Failed to create a new WebRtcEndpoint", endpointName, cause);
				}
			});
		} else if (this.isPlayerEndpoint()) {
			final KurentoMediaOptions mediaOptions = (KurentoMediaOptions) this.owner.getPublisherMediaOptions();
			PlayerEndpoint.Builder playerBuilder = new PlayerEndpoint.Builder(pipeline, mediaOptions.rtspUri);

			if (!mediaOptions.adaptativeBitrate) {
				playerBuilder = playerBuilder.useEncodedMedia();
			}
			if (mediaOptions.networkCache != null) {
				playerBuilder = playerBuilder.withNetworkCache(mediaOptions.networkCache);
			}

			playerBuilder.buildAsync(new Continuation<PlayerEndpoint>() {

				@Override
				public void onSuccess(PlayerEndpoint result) throws Exception {
					playerEndpoint = result;

					if (!mediaOptions.onlyPlayWithSubscribers) {
						playerEndpoint.play(new Continuation<Void>() {
							@Override
							public void onSuccess(Void result) throws Exception {
								log.info("IP Camera stream {} feed is now enabled", streamId);
							}

							@Override
							public void onError(Throwable cause) throws Exception {
								log.info("Error while enabling feed for IP camera {}: {}", streamId,
										cause.getMessage());
							}
						});
					}

					log.trace("EP {}: Created a new PlayerEndpoint", endpointName);
					endpointSubscription = registerElemErrListener(playerEndpoint);
					endpointLatch.countDown();
				}

				@Override
				public void onError(Throwable cause) throws Exception {
					endpointLatch.countDown();
					log.error("EP {}: Failed to create a new PlayerEndpoint", endpointName, cause);
				}
			});
		} else {
			new RtpEndpoint.Builder(pipeline).buildAsync(new Continuation<RtpEndpoint>() {
				@Override
				public void onSuccess(RtpEndpoint result) throws Exception {
					endpoint = result;
					endpointLatch.countDown();
					log.trace("EP {}: Created a new RtpEndpoint", endpointName);
					endpointSubscription = registerElemErrListener(endpoint);
				}

				@Override
				public void onError(Throwable cause) throws Exception {
					endpointLatch.countDown();
					log.error("EP {}: Failed to create a new RtpEndpoint", endpointName, cause);
				}
			});
		}
	}

	/**
	 * Add a new {@link IceCandidate} received gathered by the remote peer of this
	 * {@link WebRtcEndpoint}.
	 *
	 * @param candidate the remote candidate
	 */
	public synchronized void addIceCandidate(IceCandidate candidate) throws OpenViduException {
		if (!this.isWeb()) {
			throw new OpenViduException(Code.MEDIA_NOT_A_WEB_ENDPOINT_ERROR_CODE, "Operation not supported");
		}
		if (webEndpoint == null) {
			candidates.addLast(candidate);
		} else {
			internalAddIceCandidate(candidate);
		}
	}

	/**
	 * Registers a listener for when the {@link MediaElement} triggers an
	 * {@link ErrorEvent}. Notifies the owner with the error.
	 *
	 * @param element the {@link MediaElement}
	 * @return {@link ListenerSubscription} that can be used to deregister the
	 *         listener
	 */
	protected ListenerSubscription registerElemErrListener(MediaElement element) {
		return element.addErrorListener(new EventListener<ErrorEvent>() {
			@Override
			public void onEvent(ErrorEvent event) {
				owner.sendMediaError(event);
			}
		});
	}

	/**
	 * Unregisters the error listener from the media element using the provided
	 * subscription.
	 *
	 * @param element      the {@link MediaElement}
	 * @param subscription the associated {@link ListenerSubscription}
	 */
	protected void unregisterElementErrListener(MediaElement element, final ListenerSubscription subscription) {
		if (element == null || subscription == null) {
			return;
		}
		if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
			element.removeErrorListener(subscription);
		}
	}

	/**
	 * Orders the internal endpoint ({@link RtpEndpoint} or {@link WebRtcEndpoint})
	 * to process the offer String.
	 *
	 * @see SdpEndpoint#processOffer(String)
	 * @param offer String with the Sdp offer
	 * @return the Sdp answer
	 */
	protected String processOffer(String offer) throws OpenViduException {
		if (this.isWeb()) {
			if (webEndpoint == null) {
				throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
						"Can't process offer when WebRtcEndpoint is null (ep: " + endpointName + ")");
			}
			return webEndpoint.processOffer(offer);
		} else if (this.isPlayerEndpoint()) {
			return "";
		} else {
			if (endpoint == null) {
				throw new OpenViduException(Code.MEDIA_RTP_ENDPOINT_ERROR_CODE,
						"Can't process offer when RtpEndpoint is null (ep: " + endpointName + ")");
			}
			return endpoint.processOffer(offer);
		}
	}

	/**
	 * Orders the internal endpoint ({@link RtpEndpoint} or {@link WebRtcEndpoint})
	 * to process the answer String.
	 *
	 * @see SdpEndpoint#processAnswer(String)
	 * @param answer String with the Sdp answer from remote
	 * @return the updated Sdp offer, based on the received answer
	 */
	protected String processAnswer(String answer) throws OpenViduException {
		if (this.isWeb()) {
			if (webEndpoint == null) {
				throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
						"Can't process answer when WebRtcEndpoint is null (ep: " + endpointName + ")");
			}
			return webEndpoint.processAnswer(answer);
		} else if (this.isPlayerEndpoint()) {
			return "";
		} else {
			if (endpoint == null) {
				throw new OpenViduException(Code.MEDIA_RTP_ENDPOINT_ERROR_CODE,
						"Can't process answer when RtpEndpoint is null (ep: " + endpointName + ")");
			}
			return endpoint.processAnswer(answer);
		}
	}

	protected String generateOffer(OfferOptions offerOptions) throws OpenViduException {
		if (this.isWeb()) {
			if (webEndpoint == null) {
				throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
						"Can't generate offer when WebRtcEndpoint is null (ep: " + endpointName + ")");
			}
			return webEndpoint.generateOffer(offerOptions);
		} else if (this.isPlayerEndpoint()) {
			return "";
		} else {
			if (endpoint == null) {
				throw new OpenViduException(Code.MEDIA_RTP_ENDPOINT_ERROR_CODE,
						"Can't generate offer when RtpEndpoint is null (ep: " + endpointName + ")");
			}
			return endpoint.generateOffer(offerOptions);
		}
	}

	/**
	 * If supported, it registers a listener for when a new {@link IceCandidate} is
	 * gathered by the internal endpoint ({@link WebRtcEndpoint}) and sends it to
	 * the remote User Agent as a notification using the messaging capabilities of
	 * the {@link Participant}.
	 *
	 * @see WebRtcEndpoint#addIceCandidateFoundListener(org.kurento.client.EventListener)
	 * @see Participant#sendIceCandidate(String, IceCandidate)
	 * @throws OpenViduException if thrown, unable to register the listener
	 */
	protected void registerIceCandidateFoundEventListener(String senderPublicId) throws OpenViduException {
		if (!this.isWeb()) {
			return;
		}
		if (webEndpoint == null) {
			throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
					"Can't register event listener for null WebRtcEndpoint (ep: " + endpointName + ")");
		}
		webEndpoint.addIceCandidateFoundListener(event -> {
			final IceCandidate candidate = event.getCandidate();

			if (this.openviduConfig.areMediaNodesPublicIpsDefined()) {
				sendCandidatesWithConfiguredIp(senderPublicId, candidate);
			} else {
				sendCandidate(senderPublicId, candidate);
			}
		});
	}

	private void sendCandidatesWithConfiguredIp(String senderPublicId, IceCandidate candidate) {
		try {
			// Get media node private IP
			String kurentoPrivateIp = this.owner.getSession().getKms().getIp();

			// Get Ip to be replaced
			String ipToReplace = this.openviduConfig.getMediaNodesPublicIpsMap().get(kurentoPrivateIp);

			// If Ip is configured
			if (ipToReplace != null && !ipToReplace.isEmpty()) {
				// Create IceCandidateParser to modify original candidate information
				IceCandidateDataParser candidateParser = new IceCandidateDataParser(candidate);

				// get original IP
				String originalIp = candidateParser.getIp();

				// Replace all candidates with with new configured IP
				IceCandidate candidateMaxPriority = new IceCandidate(candidate.getCandidate(), candidate.getSdpMid(),
						candidate.getSdpMLineIndex());
				candidateParser.setIp(ipToReplace);
				candidateParser.setMaxPriority();
				candidateMaxPriority.setCandidate(candidateParser.toString());
				sendCandidate(senderPublicId, candidateMaxPriority);

				// Resend old public IP next to the new one
				if (candidateParser.isType(IceCandidateType.srflx)) {
					IceCandidate candidateMinPriority = new IceCandidate(candidate.getCandidate(), candidate.getSdpMid(),
							candidate.getSdpMLineIndex());
					if (openviduConfig.isCoturnUsingInternalRelay()) {
						// If coturn is using internal relay, there should be candidates with the private IP
						// to relay on the internal network
						candidateParser.setIp(kurentoPrivateIp); // Send candidate with private ip
					} else {
						// If coturn is configured using public IP as relay, candidates with the original IP
						// and the new one should be sent
						// to relay using the public internet
						candidateParser.setIp(originalIp); // Send candidate with original IP
					}
					candidateParser.setMinPriority(); // Set min priority for this candidate
					candidateMinPriority.setCandidate(candidateParser.toString());
					sendCandidate(senderPublicId, candidateMinPriority);
				}
			}
		} catch (Exception e) {
			log.error("Error on adding additional IP in candidates: {}", e.getMessage());
			// On Exception, send candidate without any modification
			sendCandidate(senderPublicId, candidate);
		}
	}

	private void sendCandidate(String senderPublicId, IceCandidate candidate) {
		gatheredCandidateList.add(candidate);
		this.owner.logIceCandidate(new WebrtcDebugEvent(this.owner, this.streamId, WebrtcDebugEventIssuer.server,
				this.getWebrtcDebugOperation(), WebrtcDebugEventType.iceCandidate,
				gson.toJsonTree(candidate).toString()));
		owner.sendIceCandidate(senderPublicId, endpointName, candidate);
	}

	/**
	 * If supported, it instructs the internal endpoint to start gathering
	 * {@link IceCandidate}s.
	 */
	protected void gatherCandidates() throws OpenViduException {
		if (!this.isWeb()) {
			return;
		}
		if (webEndpoint == null) {
			throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
					"Can't start gathering ICE candidates on null WebRtcEndpoint (ep: " + endpointName + ")");
		}
		webEndpoint.gatherCandidates();
		log.trace("EP {}: Internal endpoint started to gather candidates", endpointName);
	}

	private void internalAddIceCandidate(IceCandidate candidate) throws OpenViduException {
		if (webEndpoint == null) {
			throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
					"Can't add existing ICE candidates to null WebRtcEndpoint (ep: " + endpointName + ")");
		}

		this.receivedCandidateList.add(candidate);
		this.owner.logIceCandidate(new WebrtcDebugEvent(this.owner, this.streamId, WebrtcDebugEventIssuer.client,
				this.getWebrtcDebugOperation(), WebrtcDebugEventType.iceCandidate,
				gson.toJsonTree(candidate).toString()));

		this.webEndpoint.addIceCandidate(candidate, new Continuation<Void>() {
			@Override
			public void onSuccess(Void result) throws Exception {
				log.trace("Ice candidate \"{}\" added to the internal endpoint", candidate.getCandidate());
			}

			@Override
			public void onError(Throwable cause) throws Exception {
				log.warn("EP {}: Failed to add ice candidate \"{}\" to the internal endpoint: {}", endpointName,
						candidate.getCandidate(), cause.getMessage());
			}
		});
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("createdAt", this.createdAt);
		return json;
	}

	public JsonObject withStatsToJson() {
		JsonObject json = new JsonObject();
		json.addProperty("createdAt", this.createdAt);
		json.addProperty("webrtcEndpointName", this.getEndpointName());
		if (!this.isPlayerEndpoint()) {
			try {
				json.addProperty("remoteSdp", ((SdpEndpoint) this.getEndpoint()).getRemoteSessionDescriptor());
			} catch (KurentoServerException e) {
				log.error("Error retrieving remote SDP for endpoint {} of stream {}: {}", this.endpointName,
						this.streamId, e.getMessage());
				json.add("remoteSdp", JsonNull.INSTANCE);
			}
			try {
				json.addProperty("localSdp", ((SdpEndpoint) this.getEndpoint()).getLocalSessionDescriptor());
			} catch (KurentoServerException e) {
				log.error("Error retrieving local SDP for endpoint {} of stream {}: {}", this.endpointName,
						this.streamId, e.getMessage());
				json.add("localSdp", JsonNull.INSTANCE);
			}
		}
		JsonArray clientIceCandidates = new JsonArray();
		Iterator<IceCandidate> it1 = this.receivedCandidateList.iterator();
		while (it1 != null && it1.hasNext()) {
			clientIceCandidates.add(gson.toJsonTree(it1.next()));
		}
		json.add("clientIceCandidates", clientIceCandidates);
		JsonArray serverIceCandidates = new JsonArray();
		Iterator<IceCandidate> it2 = this.gatheredCandidateList.iterator();
		while (it2 != null && it2.hasNext()) {
			serverIceCandidates.add(gson.toJsonTree(it2.next()));
		}
		json.add("serverIceCandidates", serverIceCandidates);
		json.addProperty("localCandidate", this.selectedLocalIceCandidate);
		json.addProperty("remoteCandidate", this.selectedRemoteIceCandidate);

		JsonArray jsonArray = new JsonArray();
		this.kmsEvents.forEach(ev -> {
			// Remove unwanted properties
			JsonObject j = ev.toJson();
			j.remove("sessionId");
			j.remove("user");
			j.remove("connection");
			j.remove("connectionId");
			j.remove("endpoint");
			j.remove("timestampMillis");
			jsonArray.add(j);
		});
		json.add("events", jsonArray);

		return json;
	}

	protected abstract WebrtcDebugEventOperation getWebrtcDebugOperation();

}
