/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import java.io.IOException;
import java.net.InetAddress;
import java.net.MalformedURLException;
import java.net.URL;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.client.GenericMediaElement;
import org.kurento.client.IceCandidate;
import org.kurento.client.ListenerSubscription;
import org.kurento.client.PassThrough;
import org.kurento.jsonrpc.Props;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.KurentoOptions;
import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.Recording;
import io.openvidu.java.client.RecordingLayout;
import io.openvidu.java.client.RecordingMode;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.FinalUser;
import io.openvidu.server.core.IdentifierPrefixes;
import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.Token;
import io.openvidu.server.kurento.endpoint.KurentoFilter;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.kurento.endpoint.SdpType;
import io.openvidu.server.kurento.kms.Kms;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.rpc.RpcHandler;
import io.openvidu.server.utils.GeoLocation;
import io.openvidu.server.utils.JsonUtils;
import io.openvidu.server.utils.SDPMunging;

public class KurentoSessionManager extends SessionManager {

	private static final Logger log = LoggerFactory.getLogger(KurentoSessionManager.class);

	@Autowired
	protected KmsManager kmsManager;

	@Autowired
	protected KurentoSessionEventsHandler kurentoSessionEventsHandler;

	@Autowired
	protected KurentoParticipantEndpointConfig kurentoEndpointConfig;

	@Autowired
	private SDPMunging sdpMunging;

	@Override
	/* Protected by Session.closingLock.readLock */
	public void joinRoom(Participant participant, String sessionId, Integer transactionId) {
		Set<Participant> existingParticipants = null;
		try {

			KurentoSession kSession = (KurentoSession) sessions.get(sessionId);
			if (kSession == null) {
				// First user connecting to the session
				Session sessionNotActive = sessionsNotActive.get(sessionId);

				if (sessionNotActive == null && this.isInsecureParticipant(participant.getParticipantPrivateId())) {
					// Insecure user directly call joinRoom RPC method, without REST API use
					sessionNotActive = new Session(sessionId,
							new SessionProperties.Builder().mediaMode(MediaMode.ROUTED)
									.recordingMode(RecordingMode.ALWAYS)
									.defaultRecordingLayout(RecordingLayout.BEST_FIT).build(),
							openviduConfig, recordingManager);
				}

				try {
					if (KmsManager.selectAndRemoveKmsLock.tryLock(KmsManager.MAX_SECONDS_LOCK_WAIT, TimeUnit.SECONDS)) {
						try {
							kSession = (KurentoSession) sessions.get(sessionId);
							if (kSession == null) {
								// Session still null. It was not created by other thread while waiting for lock
								Kms selectedMediaNode = this.selectMediaNode(sessionNotActive);
								kSession = createSession(sessionNotActive, selectedMediaNode);
							}
						} finally {
							KmsManager.selectAndRemoveKmsLock.unlock();
						}
					} else {
						String error = "Timeout of " + KmsManager.MAX_SECONDS_LOCK_WAIT
								+ " seconds waiting to acquire lock";
						log.error(error);
						sessionEventsHandler.onParticipantJoined(participant, sessionId, null, transactionId,
								new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE, error));
						return;
					}
				} catch (InterruptedException e) {
					String error = "'" + participant.getParticipantPublicId() + "' is trying to join session '"
							+ sessionId + "' but was interrupted while waiting to acquire lock: " + e.getMessage();
					log.error(error);
					throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, error);
				}
			}

			// If Recording default layout is COMPOSED_QUICK_START
			Recording.OutputMode defaultOutputMode = kSession.getSessionProperties().defaultOutputMode();
			if (openviduConfig.isRecordingModuleEnabled()
					&& defaultOutputMode.equals(Recording.OutputMode.COMPOSED_QUICK_START)) {
				recordingManager.startComposedQuickStartContainer(kSession);
			}

			if (kSession.isClosed()) {
				log.warn("'{}' is trying to join session '{}' but it is closing", participant.getParticipantPublicId(),
						sessionId);
				throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "'" + participant.getParticipantPublicId()
						+ "' is trying to join session '" + sessionId + "' but it is closing");
			}

			try {
				if (kSession.joinLeaveLock.tryLock(15, TimeUnit.SECONDS)) {
					try {
						existingParticipants = getParticipants(sessionId);
						kSession.join(participant);
						sessionEventsHandler.onParticipantJoined(participant, sessionId, existingParticipants,
								transactionId, null);
					} finally {
						kSession.joinLeaveLock.unlock();
					}
				} else {
					log.error(
							"Timeout waiting for join-leave Session lock to be available for participant {} of session {} in joinRoom",
							participant.getParticipantPublicId(), sessionId);
					sessionEventsHandler.onParticipantJoined(participant, sessionId, null, transactionId,
							new OpenViduException(Code.GENERIC_ERROR_CODE, "Timeout waiting for Session lock"));
				}
			} catch (InterruptedException e) {
				log.error(
						"InterruptedException waiting for join-leave Session lock to be available for participant {} of session {} in joinRoom",
						participant.getParticipantPublicId(), sessionId);
				sessionEventsHandler.onParticipantJoined(participant, sessionId, null, transactionId,
						new OpenViduException(Code.GENERIC_ERROR_CODE,
								"InterruptedException waiting for Session lock"));
			}
		} catch (OpenViduException e) {
			log.error("PARTICIPANT {}: Error joining/creating session {}", participant.getParticipantPublicId(),
					sessionId, e);
			sessionEventsHandler.onParticipantJoined(participant, sessionId, null, transactionId, e);
		}
	}

	@Override
	public boolean leaveRoom(Participant participant, Integer transactionId, EndReason reason, boolean closeWebSocket) {
		log.info("Request [LEAVE_ROOM] for participant {} of session {} with reason {}",
				participant.getParticipantPublicId(), participant.getSessionId(),
				reason != null ? reason.name() : "NULL");

		boolean sessionClosedByLastParticipant = false;

		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		KurentoSession session = kParticipant.getSession();
		String sessionId = session.getSessionId();

		if (session.isClosed()) {
			log.warn("'{}' is trying to leave from session '{}' but it is closing",
					participant.getParticipantPublicId(), sessionId);
			throw new OpenViduException(Code.ROOM_CLOSED_ERROR_CODE, "'" + participant.getParticipantPublicId()
					+ "' is trying to leave from session '" + sessionId + "' but it is closing");
		}

		try {
			if (session.joinLeaveLock.tryLock(15, TimeUnit.SECONDS)) {
				try {

					session.leave(participant.getParticipantPrivateId(), reason);

					// Update control data structures

					if (sessionidParticipantpublicidParticipant.get(sessionId) != null) {
						Participant p = sessionidParticipantpublicidParticipant.get(sessionId)
								.remove(participant.getParticipantPublicId());

						if (p != null && this.openviduConfig.isTurnadminAvailable()) {
							this.coturnCredentialsService.deleteUser(p.getToken().getTurnCredentials().getUsername());
						}

						// TODO: why is this necessary??
						if (p != null && insecureUsers.containsKey(p.getParticipantPrivateId())) {
							boolean stillParticipant = false;
							for (Session s : sessions.values()) {
								if (!s.isClosed()
										&& (s.getParticipantByPrivateId(p.getParticipantPrivateId()) != null)) {
									stillParticipant = true;
									break;
								}
							}
							if (!stillParticipant) {
								insecureUsers.remove(p.getParticipantPrivateId());
							}
						}
					}

					// Close Session if no more participants

					Set<Participant> remainingParticipants = null;
					try {
						remainingParticipants = getParticipants(sessionId);
					} catch (OpenViduException e) {
						log.info("Possible collision when closing the session '{}' (not found)", sessionId);
						remainingParticipants = Collections.emptySet();
					}
					sessionEventsHandler.onParticipantLeft(participant, sessionId, remainingParticipants, transactionId,
							null, reason);

					if (!EndReason.sessionClosedByServer.equals(reason)) {
						// If session is closed by a call to "DELETE /api/sessions" do NOT stop the
						// recording. Will be stopped after in method
						// "SessionManager.closeSessionAndEmptyCollections"
						if (remainingParticipants.isEmpty()) {
							if (openviduConfig.isRecordingModuleEnabled()
									&& MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode())
									&& (this.recordingManager.sessionIsBeingRecorded(sessionId))) {
								// Start countdown to stop recording. Will be aborted if a Publisher starts
								// before timeout
								log.info(
										"Last participant left. Starting {} seconds countdown for stopping recording of session {}",
										this.openviduConfig.getOpenviduRecordingAutostopTimeout(), sessionId);
								recordingManager.initAutomaticRecordingStopThread(session);
							} else {
								try {
									if (session.closingLock.writeLock().tryLock(15, TimeUnit.SECONDS)) {
										try {
											if (session.isClosed()) {
												return false;
											}
											log.info("No more participants in session '{}', removing it and closing it",
													sessionId);
											this.closeSessionAndEmptyCollections(session, reason, true);
											sessionClosedByLastParticipant = true;
										} finally {
											session.closingLock.writeLock().unlock();
										}
									} else {
										log.error(
												"Timeout waiting for Session {} closing lock to be available for closing as last participant left",
												sessionId);
									}
								} catch (InterruptedException e) {
									log.error(
											"InterruptedException while waiting for Session {} closing lock to be available for closing as last participant left",
											sessionId);
								}
							}
						} else if (remainingParticipants.size() == 1 && openviduConfig.isRecordingModuleEnabled()
								&& MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode())
								&& this.recordingManager.sessionIsBeingRecorded(sessionId)
								&& ProtocolElements.RECORDER_PARTICIPANT_PUBLICID
										.equals(remainingParticipants.iterator().next().getParticipantPublicId())) {
							// RECORDER participant is the last one standing. Start countdown
							log.info(
									"Last participant left. Starting {} seconds countdown for stopping recording of session {}",
									this.openviduConfig.getOpenviduRecordingAutostopTimeout(), sessionId);
							recordingManager.initAutomaticRecordingStopThread(session);

						} else if (remainingParticipants.size() == 1 && openviduConfig.isRecordingModuleEnabled()
								&& MediaMode.ROUTED.equals(session.getSessionProperties().mediaMode())
								&& session.getSessionProperties().defaultOutputMode()
										.equals(Recording.OutputMode.COMPOSED_QUICK_START)
								&& ProtocolElements.RECORDER_PARTICIPANT_PUBLICID
										.equals(remainingParticipants.iterator().next().getParticipantPublicId())) {
							// If no recordings are active in COMPOSED_QUICK_START output mode, stop
							// container
							recordingManager.stopComposedQuickStartContainer(session, reason);
						}
					}

					// Finally close websocket session if required
					if (closeWebSocket) {
						sessionEventsHandler.closeRpcSession(participant.getParticipantPrivateId());
					}

					return sessionClosedByLastParticipant;

				} finally {
					session.joinLeaveLock.unlock();
				}
			} else {
				log.error(
						"Timeout waiting for join-leave Session lock to be available for participant {} of session {} in leaveRoom",
						kParticipant.getParticipantPublicId(), session.getSessionId());
				return false;
			}
		} catch (InterruptedException e) {
			log.error(
					"Timeout waiting for join-leave Session lock to be available for participant {} of session {} in leaveRoom",
					kParticipant.getParticipantPublicId(), session.getSessionId());
			return false;
		}
	}

	/**
	 * Represents a client's request to start streaming her local media to anyone
	 * inside the room. The media elements should have been created using the same
	 * pipeline as the publisher's. The streaming media endpoint situated on the
	 * server can be connected to itself thus realizing what is known as a loopback
	 * connection. The loopback is performed after applying all additional media
	 * elements specified as parameters (in the same order as they appear in the
	 * params list).
	 * <p>
	 * <br/>
	 * <strong>Dev advice:</strong> Send notifications to the existing participants
	 * in the room to inform about the new stream that has been published. Answer to
	 * the peer's request by sending it the SDP response (answer or updated offer)
	 * generated by the WebRTC endpoint on the server.
	 *
	 * @param participant   Participant publishing video
	 * @param MediaOptions  configuration of the stream to publish
	 * @param transactionId identifier of the Transaction
	 * @throws OpenViduException on error
	 */
	@Override
	public void publishVideo(Participant participant, MediaOptions mediaOptions, Integer transactionId)
			throws OpenViduException {

		Set<Participant> participants = null;
		String sdpAnswer = null;

		KurentoMediaOptions kurentoOptions = (KurentoMediaOptions) mediaOptions;
		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		KurentoSession kSession = kParticipant.getSession();
		SdpType sdpType = kurentoOptions.isOffer ? SdpType.OFFER : SdpType.ANSWER;
		boolean isTranscodingAllowed = kSession.getSessionProperties().isTranscodingAllowed();
		VideoCodec forcedVideoCodec = kSession.getSessionProperties().forcedVideoCodec();

		// Modify sdp if forced codec is defined
		if (forcedVideoCodec != VideoCodec.NONE && !participant.isIpcam()) {
			kurentoOptions.sdpOffer = sdpMunging.forceCodec(participant, kurentoOptions.sdpOffer,
					kurentoOptions.isOffer, kSession, true, false, isTranscodingAllowed, forcedVideoCodec);
		}
		log.debug(
				"Request [PUBLISH_MEDIA] isOffer={} sdp={} "
						+ "loopbackAltSrc={} lpbkConnType={} doLoopback={} rtspUri={} ({})",
				kurentoOptions.isOffer, kurentoOptions.sdpOffer, kurentoOptions.doLoopback, kurentoOptions.rtspUri,
				participant.getParticipantPublicId());

		kParticipant.createPublishingEndpoint(mediaOptions, null);

		/*
		 * for (MediaElement elem : kurentoOptions.mediaElements) {
		 * kurentoParticipant.getPublisher().apply(elem); }
		 */

		KurentoOptions kurentoTokenOptions = participant.getToken().getKurentoOptions();
		if (kurentoOptions.getFilter() != null && kurentoTokenOptions != null) {
			if (kurentoTokenOptions.isFilterAllowed(kurentoOptions.getFilter().getType())) {
				this.applyFilterInPublisher(kParticipant, kurentoOptions.getFilter());
			} else {
				OpenViduException e = new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"Error applying filter for publishing user " + participant.getParticipantPublicId()
								+ ". The token has no permissions to apply filter "
								+ kurentoOptions.getFilter().getType());
				log.error("PARTICIPANT {}: Error applying filter. The token has no permissions to apply filter {}",
						participant.getParticipantPublicId(), kurentoOptions.getFilter().getType(), e);
				sessionEventsHandler.onPublishMedia(participant, null, System.currentTimeMillis(),
						kSession.getSessionId(), mediaOptions, sdpAnswer, participants, transactionId, e);
				throw e;
			}
		}

		sdpAnswer = kParticipant.publishToRoom(sdpType, kurentoOptions.sdpOffer, kurentoOptions.doLoopback, false);

		if (sdpAnswer == null) {
			OpenViduException e = new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
					"Error generating SDP response for publishing user " + participant.getParticipantPublicId());
			log.error("PARTICIPANT {}: Error publishing media", participant.getParticipantPublicId(), e);
			sessionEventsHandler.onPublishMedia(participant, null, kParticipant.getPublisher().createdAt(),
					kSession.getSessionId(), mediaOptions, sdpAnswer, participants, transactionId, e);
		}

		if (this.openviduConfig.isRecordingModuleEnabled()
				&& MediaMode.ROUTED.equals(kSession.getSessionProperties().mediaMode())
				&& kSession.getActivePublishers() == 0) {

			// There were no previous publishers in the session

			try {
				if (kSession.recordingLock.tryLock(15, TimeUnit.SECONDS)) {
					try {

						if (RecordingMode.ALWAYS.equals(kSession.getSessionProperties().recordingMode())
								&& !recordingManager.sessionIsBeingRecorded(kSession.getSessionId())
								&& !kSession.recordingManuallyStopped.get()) {
							// Start automatic recording for sessions configured with RecordingMode.ALWAYS
							// that have not been been manually stopped
							new Thread(() -> {
								recordingManager.startRecording(kSession, new RecordingProperties.Builder().name("")
										.outputMode(kSession.getSessionProperties().defaultOutputMode())
										.recordingLayout(kSession.getSessionProperties().defaultRecordingLayout())
										.customLayout(kSession.getSessionProperties().defaultCustomLayout())
										.resolution(/*
													 * kSession.getSessionProperties().defaultRecordingResolution()
													 */"1920x1080").mediaNode(kSession.getMediaNodeId()).build());
							}).start();
						} else if (recordingManager.sessionIsBeingRecorded(kSession.getSessionId())) {
							// Abort automatic recording stop thread for any recorded session in which a
							// user published before timeout
							log.info(
									"Participant {} published before timeout finished. Aborting automatic recording stop",
									participant.getParticipantPublicId());
							boolean stopAborted = recordingManager.abortAutomaticRecordingStopThread(kSession,
									EndReason.automaticStop);
							if (stopAborted) {
								log.info("Automatic recording stopped successfully aborted");
							} else {
								log.info(
										"Automatic recording stopped couldn't be aborted. Recording of session {} has stopped",
										kSession.getSessionId());
							}
						}

					} finally {
						kSession.recordingLock.unlock();
					}
				} else {
					log.error(
							"Timeout waiting for recording Session lock to be available for participant {} of session {} in publishVideo",
							participant.getParticipantPublicId(), kSession.getSessionId());
				}
			} catch (InterruptedException e) {
				log.error(
						"InterruptedException waiting for recording Session lock to be available for participant {} of session {} in publishVideo",
						participant.getParticipantPublicId(), kSession.getSessionId());
			}

		}

		participant.setPublishedAt(new Timestamp(System.currentTimeMillis()).getTime());
		kSession.newPublisher(participant);

		participants = kParticipant.getSession().getParticipants();

		if (sdpAnswer != null) {
			log.debug("SDP Answer for publishing PARTICIPANT {}: {}", participant.getParticipantPublicId(), sdpAnswer);
			sessionEventsHandler.onPublishMedia(participant, participant.getPublisherStreamId(),
					kParticipant.getPublisher().createdAt(), kSession.getSessionId(), mediaOptions, sdpAnswer,
					participants, transactionId, null);
		}
	}

	@Override
	public void unpublishVideo(Participant participant, Participant moderator, Integer transactionId,
			EndReason reason) {
		try {
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			KurentoSession session = kParticipant.getSession();

			log.debug("Request [UNPUBLISH_MEDIA] ({})", participant.getParticipantPublicId());
			if (!participant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to unpublish video of user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"Participant '" + participant.getParticipantPublicId() + "' is not streaming media");
			}
			kParticipant.unpublishMedia(reason, null);
			session.cancelPublisher(participant, reason);

			Set<Participant> participants = session.getParticipants();

			sessionEventsHandler.onUnpublishMedia(participant, participants, moderator, transactionId, null, reason);

		} catch (OpenViduException e) {
			log.warn("PARTICIPANT {}: Error unpublishing media", participant.getParticipantPublicId(), e);
			sessionEventsHandler.onUnpublishMedia(participant, new HashSet<>(Arrays.asList(participant)), moderator,
					transactionId, e, null);
		}
	}

	@Override
	public void subscribe(Participant participant, String senderName, String sdpOffer, Integer transactionId) {
		String sdpAnswer = null;
		Session session = null;
		try {
			log.debug("Request [SUBSCRIBE] remoteParticipant={} sdpOffer={} ({})", senderName, sdpOffer,
					participant.getParticipantPublicId());

			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			session = ((KurentoParticipant) participant).getSession();
			Participant senderParticipant = session.getParticipantByPublicId(senderName);
			boolean isTranscodingAllowed = session.getSessionProperties().isTranscodingAllowed();
			VideoCodec forcedVideoCodec = session.getSessionProperties().forcedVideoCodec();

			// Modify sdp if forced codec is defined
			if (forcedVideoCodec != VideoCodec.NONE && !participant.isIpcam()) {
				sdpOffer = sdpMunging.forceCodec(participant, sdpOffer, true, session, false, false,
						isTranscodingAllowed, forcedVideoCodec);
			}

			if (senderParticipant == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to recv media from user {} "
								+ "in session {} but user could not be found",
						participant.getParticipantPublicId(), senderName, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
						"User '" + senderName + " not found in session '" + session.getSessionId() + "'");
			}
			if (!senderParticipant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to recv media from user {} "
								+ "in session {} but user is not streaming media",
						participant.getParticipantPublicId(), senderName, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + senderName + " not streaming media in session '" + session.getSessionId() + "'");
			}

			sdpAnswer = kParticipant.receiveMediaFrom(senderParticipant, sdpOffer, false);
			if (sdpAnswer == null) {
				throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
						"Unable to generate SDP answer when subscribing '" + participant.getParticipantPublicId()
								+ "' to '" + senderName + "'");
			}
		} catch (OpenViduException e) {
			log.error("PARTICIPANT {}: Error subscribing to {}", participant.getParticipantPublicId(), senderName, e);
			sessionEventsHandler.onSubscribe(participant, session, null, transactionId, e);
		}
		if (sdpAnswer != null) {
			log.debug("SDP Answer for subscribing PARTICIPANT {}: {}", participant.getParticipantPublicId(), sdpAnswer);
			sessionEventsHandler.onSubscribe(participant, session, sdpAnswer, transactionId, null);
		}
	}

	@Override
	public void unsubscribe(Participant participant, String senderName, Integer transactionId) {
		log.debug("Request [UNSUBSCRIBE] remoteParticipant={} ({})", senderName, participant.getParticipantPublicId());

		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		Session session = ((KurentoParticipant) participant).getSession();
		Participant sender = session.getParticipantByPublicId(senderName);

		if (sender == null) {
			log.warn(
					"PARTICIPANT {}: Requesting to unsubscribe from user {} "
							+ "in session {} but user could not be found",
					participant.getParticipantPublicId(), senderName, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"User " + senderName + " not found in session " + session.getSessionId());
		}

		kParticipant.cancelReceivingMedia((KurentoParticipant) sender, EndReason.unsubscribe, false);

		sessionEventsHandler.onUnsubscribe(participant, transactionId, null);
	}

	@Override
	public void streamPropertyChanged(Participant participant, Integer transactionId, String streamId, String property,
			JsonElement newValue, String reason) {
		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		streamId = kParticipant.getPublisherStreamId();
		KurentoMediaOptions streamProperties = (KurentoMediaOptions) kParticipant.getPublisherMediaOptions();

		Boolean hasAudio = streamProperties.hasAudio();
		Boolean hasVideo = streamProperties.hasVideo();
		Boolean audioActive = streamProperties.isAudioActive();
		Boolean videoActive = streamProperties.isVideoActive();
		String typeOfVideo = streamProperties.getTypeOfVideo();
		Integer frameRate = streamProperties.getFrameRate();
		String videoDimensions = streamProperties.getVideoDimensions();
		KurentoFilter filter = streamProperties.getFilter();

		switch (property) {
		case "audioActive":
			audioActive = newValue.getAsBoolean();
			break;
		case "videoActive":
			videoActive = newValue.getAsBoolean();
			break;
		case "videoDimensions":
			videoDimensions = newValue.getAsString();
			break;
		}

		kParticipant.setPublisherMediaOptions(new KurentoMediaOptions(hasAudio, hasVideo, audioActive, videoActive,
				typeOfVideo, frameRate, videoDimensions, filter, streamProperties));

		sessionEventsHandler.onStreamPropertyChanged(participant, transactionId,
				kParticipant.getSession().getParticipants(), streamId, property, newValue, reason);
	}

	@Override
	public void onIceCandidate(Participant participant, String endpointName, String candidate, int sdpMLineIndex,
			String sdpMid, Integer transactionId) {
		try {
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			log.debug("Request [ICE_CANDIDATE] endpoint={} candidate={} " + "sdpMLineIdx={} sdpMid={} ({})",
					endpointName, candidate, sdpMLineIndex, sdpMid, participant.getParticipantPublicId());
			kParticipant.addIceCandidate(endpointName, new IceCandidate(candidate, sdpMid, sdpMLineIndex));
			sessionEventsHandler.onRecvIceCandidate(participant, transactionId, null);
		} catch (OpenViduException e) {
			log.error("PARTICIPANT {}: Error receiving ICE " + "candidate (epName={}, candidate={})",
					participant.getParticipantPublicId(), endpointName, candidate, e);
			sessionEventsHandler.onRecvIceCandidate(participant, transactionId, e);
		}
	}

	/**
	 * Creates a session with the already existing not-active session in the
	 * indicated KMS, if it doesn't already exist
	 * 
	 * @throws OpenViduException in case of error while creating the session
	 */
	public KurentoSession createSession(Session sessionNotActive, Kms kms) throws OpenViduException {
		KurentoSession session = (KurentoSession) sessions.get(sessionNotActive.getSessionId());
		if (session != null) {
			throw new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
					"Session '" + session.getSessionId() + "' already exists");
		}
		session = new KurentoSession(sessionNotActive, kms, kurentoSessionEventsHandler, kurentoEndpointConfig);

		KurentoSession oldSession = (KurentoSession) sessions.putIfAbsent(session.getSessionId(), session);
		sessionsNotActive.remove(session.getSessionId());
		if (oldSession != null) {
			log.warn("Session '{}' has just been created by another thread", session.getSessionId());
			return oldSession;
		}

		// Also associate the KurentoSession with the Kms
		kms.addKurentoSession(session);

		log.info("No session '{}' exists yet. Created one on KMS '{}' with ip '{}'", session.getSessionId(),
				kms.getId(), kms.getIp());

		sessionEventsHandler.onSessionCreated(session);
		return session;
	}

	@Override
	public boolean evictParticipant(Participant evictedParticipant, Participant moderator, Integer transactionId,
			EndReason reason) throws OpenViduException {

		boolean sessionClosedByLastParticipant = false;

		if (evictedParticipant != null) {
			KurentoParticipant kParticipant = (KurentoParticipant) evictedParticipant;
			Set<Participant> participants = kParticipant.getSession().getParticipants();
			sessionClosedByLastParticipant = this.leaveRoom(kParticipant, null, reason, false);
			this.sessionEventsHandler.onForceDisconnect(moderator, evictedParticipant, participants, transactionId,
					null, reason);
			sessionEventsHandler.closeRpcSession(evictedParticipant.getParticipantPrivateId());
		} else {
			if (moderator != null && transactionId != null) {
				this.sessionEventsHandler.onForceDisconnect(moderator, evictedParticipant,
						new HashSet<>(Arrays.asList(moderator)), transactionId,
						new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
								"Connection not found when calling 'forceDisconnect'"),
						null);
			}
		}

		return sessionClosedByLastParticipant;
	}

	@Override
	public KurentoMediaOptions generateMediaOptions(Request<JsonObject> request) throws OpenViduException {

		String sdpOffer = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_SDPOFFER_PARAM);
		boolean hasAudio = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_HASAUDIO_PARAM);
		boolean hasVideo = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_HASVIDEO_PARAM);

		Boolean audioActive = null, videoActive = null;
		String typeOfVideo = null, videoDimensions = null;
		Integer frameRate = null;
		KurentoFilter kurentoFilter = null;

		try {
			audioActive = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_AUDIOACTIVE_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			videoActive = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_VIDEOACTIVE_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			typeOfVideo = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_TYPEOFVIDEO_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			videoDimensions = RpcHandler.getStringParam(request, ProtocolElements.PUBLISHVIDEO_VIDEODIMENSIONS_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			frameRate = RpcHandler.getIntParam(request, ProtocolElements.PUBLISHVIDEO_FRAMERATE_PARAM);
		} catch (RuntimeException noParameterFound) {
		}
		try {
			JsonObject kurentoFilterJson = (JsonObject) RpcHandler.getParam(request,
					ProtocolElements.PUBLISHVIDEO_KURENTOFILTER_PARAM);
			if (kurentoFilterJson != null) {
				try {
					kurentoFilter = new KurentoFilter(kurentoFilterJson.get("type").getAsString(),
							kurentoFilterJson.get("options").getAsJsonObject());
				} catch (Exception e) {
					throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
							"'filter' parameter wrong:" + e.getMessage());
				}
			}
		} catch (OpenViduException e) {
			throw e;
		} catch (RuntimeException noParameterFound) {
		}

		boolean doLoopback = RpcHandler.getBooleanParam(request, ProtocolElements.PUBLISHVIDEO_DOLOOPBACK_PARAM);

		return new KurentoMediaOptions(true, sdpOffer, hasAudio, hasVideo, audioActive, videoActive, typeOfVideo,
				frameRate, videoDimensions, kurentoFilter, doLoopback);
	}

	@Override
	public boolean unpublishStream(Session session, String streamId, Participant moderator, Integer transactionId,
			EndReason reason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant participant = this.getParticipant(participantPrivateId);
			if (participant != null) {
				if (participant.isIpcam()) {
					throw new OpenViduException(Code.USER_GENERIC_ERROR_CODE, "Stream '" + streamId
							+ " belonging to an IPCAM participant cannot be unpublished. IPCAM streams can only be unpublished by forcing the disconnection of the IPCAM connection");
				}
				this.unpublishVideo(participant, moderator, transactionId, reason);
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

	@Override
	public void applyFilter(Session session, String streamId, String filterType, JsonObject filterOptions,
			Participant moderator, Integer transactionId, String filterReason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant publisher = this.getParticipant(participantPrivateId);
			moderator = (moderator != null
					&& publisher.getParticipantPublicId().equals(moderator.getParticipantPublicId())) ? null
							: moderator;
			log.debug("Request [APPLY_FILTER] over stream [{}] for reason [{}]", streamId, filterReason);
			KurentoParticipant kParticipantPublisher = (KurentoParticipant) publisher;
			if (!publisher.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to applyFilter to user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : publisher.getParticipantPublicId(),
						publisher.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + publisher.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipantPublisher.getPublisher().getFilter() != null) {
				log.warn(
						"PARTICIPANT {}: Requesting to applyFilter to user {} "
								+ "in session {} but user already has a filter",
						moderator != null ? moderator.getParticipantPublicId() : publisher.getParticipantPublicId(),
						publisher.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.EXISTING_FILTER_ALREADY_APPLIED_ERROR_CODE,
						"User '" + publisher.getParticipantPublicId() + " already has a filter applied in session '"
								+ session.getSessionId() + "'");
			} else {
				try {
					KurentoFilter filter = new KurentoFilter(filterType, filterOptions);
					this.applyFilterInPublisher(kParticipantPublisher, filter);
					Set<Participant> participants = kParticipantPublisher.getSession().getParticipants();
					sessionEventsHandler.onFilterChanged(publisher, moderator, transactionId, participants, streamId,
							filter, null, filterReason);
				} catch (OpenViduException e) {
					log.warn("PARTICIPANT {}: Error applying filter", publisher.getParticipantPublicId(), e);
					sessionEventsHandler.onFilterChanged(publisher, moderator, transactionId, new HashSet<>(), streamId,
							null, e, "");
				}
			}

			log.info("State of filter for participant {}: {}", publisher.getParticipantPublicId(),
					((KurentoParticipant) publisher).getPublisher().filterCollectionsToString());

		} else {
			log.warn("PARTICIPANT {}: Requesting to applyFilter to stream {} "
					+ "in session {} but the owner cannot be found", streamId, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Owner of stream '" + streamId + "' not found in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void removeFilter(Session session, String streamId, Participant moderator, Integer transactionId,
			String filterReason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant participant = this.getParticipant(participantPrivateId);
			log.debug("Request [REMOVE_FILTER] over stream [{}] for reason [{}]", streamId, filterReason);
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			if (!participant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilter to user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipant.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilter to user {} "
								+ "in session {} but user does NOT have a filter",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " has no filter applied in session '"
								+ session.getSessionId() + "'");
			} else {
				this.removeFilterInPublisher(kParticipant);
				Set<Participant> participants = kParticipant.getSession().getParticipants();
				sessionEventsHandler.onFilterChanged(participant, moderator, transactionId, participants, streamId,
						null, null, filterReason);
			}

			log.info("State of filter for participant {}: {}", kParticipant.getParticipantPublicId(),
					kParticipant.getPublisher().filterCollectionsToString());

		} else {
			log.warn("PARTICIPANT {}: Requesting to removeFilter to stream {} "
					+ "in session {} but the owner cannot be found", streamId, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Owner of stream '" + streamId + "' not found in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void execFilterMethod(Session session, String streamId, String filterMethod, JsonObject filterParams,
			Participant moderator, Integer transactionId, String filterReason) {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			Participant participant = this.getParticipant(participantPrivateId);
			log.debug("Request [EXEC_FILTER_MTEHOD] over stream [{}] for reason [{}]", streamId, filterReason);
			KurentoParticipant kParticipant = (KurentoParticipant) participant;
			if (!participant.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to execFilterMethod to user {} "
								+ "in session {} but user is not streaming media",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipant.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to execFilterMethod to user {} "
								+ "in session {} but user does NOT have a filter",
						moderator != null ? moderator.getParticipantPublicId() : participant.getParticipantPublicId(),
						participant.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + participant.getParticipantPublicId() + " has no filter applied in session '"
								+ session.getSessionId() + "'");
			} else {
				KurentoFilter updatedFilter = this.execFilterMethodInPublisher(kParticipant, filterMethod,
						filterParams);
				Set<Participant> participants = kParticipant.getSession().getParticipants();
				sessionEventsHandler.onFilterChanged(participant, moderator, transactionId, participants, streamId,
						updatedFilter, null, filterReason);
			}
		} else {
			log.warn("PARTICIPANT {}: Requesting to removeFilter to stream {} "
					+ "in session {} but the owner cannot be found", streamId, session.getSessionId());
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Owner of stream '" + streamId + "' not found in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void addFilterEventListener(Session session, Participant userSubscribing, String streamId, String eventType)
			throws OpenViduException {
		String publisherPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (publisherPrivateId != null) {
			log.debug("Request [ADD_FILTER_LISTENER] over stream [{}]", streamId);
			KurentoParticipant kParticipantPublishing = (KurentoParticipant) this.getParticipant(publisherPrivateId);
			KurentoParticipant kParticipantSubscribing = (KurentoParticipant) userSubscribing;
			if (!kParticipantPublishing.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to addFilterEventListener to stream {} "
								+ "in session {} but the publisher is not streaming media",
						userSubscribing.getParticipantPublicId(), streamId, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + kParticipantPublishing.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipantPublishing.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to addFilterEventListener to user {} "
								+ "in session {} but user does NOT have a filter",
						kParticipantSubscribing.getParticipantPublicId(),
						kParticipantPublishing.getParticipantPublicId(), session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + kParticipantPublishing.getParticipantPublicId()
								+ " has no filter applied in session '" + session.getSessionId() + "'");
			} else {
				try {
					this.addFilterEventListenerInPublisher(kParticipantPublishing, eventType);
					kParticipantPublishing.getPublisher().addParticipantAsListenerOfFilterEvent(eventType,
							userSubscribing.getParticipantPublicId());
				} catch (OpenViduException e) {
					throw e;
				}
			}

			log.info("State of filter for participant {}: {}", kParticipantPublishing.getParticipantPublicId(),
					kParticipantPublishing.getPublisher().filterCollectionsToString());

		} else {
			throw new OpenViduException(Code.USER_NOT_FOUND_ERROR_CODE,
					"Not user found for streamId '" + streamId + "' in session '" + session.getSessionId() + "'");
		}
	}

	@Override
	public void removeFilterEventListener(Session session, Participant subscriber, String streamId, String eventType)
			throws OpenViduException {
		String participantPrivateId = ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
		if (participantPrivateId != null) {
			log.debug("Request [REMOVE_FILTER_LISTENER] over stream [{}]", streamId);
			Participant participantPublishing = this.getParticipant(participantPrivateId);
			KurentoParticipant kParticipantPublishing = (KurentoParticipant) participantPublishing;
			if (!participantPublishing.isStreaming()) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilterEventListener to stream {} "
								+ "in session {} but user is not streaming media",
						subscriber.getParticipantPublicId(), streamId, session.getSessionId());
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"User '" + participantPublishing.getParticipantPublicId() + " not streaming media in session '"
								+ session.getSessionId() + "'");
			} else if (kParticipantPublishing.getPublisher().getFilter() == null) {
				log.warn(
						"PARTICIPANT {}: Requesting to removeFilterEventListener to user {} "
								+ "in session {} but user does NOT have a filter",
						subscriber.getParticipantPublicId(), participantPublishing.getParticipantPublicId(),
						session.getSessionId());
				throw new OpenViduException(Code.FILTER_NOT_APPLIED_ERROR_CODE,
						"User '" + participantPublishing.getParticipantPublicId()
								+ " has no filter applied in session '" + session.getSessionId() + "'");
			} else {
				try {
					PublisherEndpoint pub = kParticipantPublishing.getPublisher();
					if (pub.removeParticipantAsListenerOfFilterEvent(eventType, subscriber.getParticipantPublicId())) {
						// If there are no more participants listening to the event remove the event
						// from the GenericMediaElement
						this.removeFilterEventListenerInPublisher(kParticipantPublishing, eventType);
					}
				} catch (OpenViduException e) {
					throw e;
				}
			}

			log.info("State of filter for participant {}: {}", kParticipantPublishing.getParticipantPublicId(),
					kParticipantPublishing.getPublisher().filterCollectionsToString());

		}
	}

	@Override
	/* Protected by Session.closingLock.readLock */
	public Participant publishIpcam(Session session, MediaOptions mediaOptions,
			ConnectionProperties connectionProperties) throws Exception {
		final String sessionId = session.getSessionId();
		final KurentoMediaOptions kMediaOptions = (KurentoMediaOptions) mediaOptions;

		// Generate the location for the IpCam
		GeoLocation location = null;
		URL url = null;
		String protocol = null;
		try {
			Pattern pattern = Pattern.compile("^(file|rtsp)://");
			Matcher matcher = pattern.matcher(kMediaOptions.rtspUri);
			if (matcher.find()) {
				protocol = matcher.group(0).replaceAll("://$", "");
			} else {
				throw new MalformedURLException();
			}
			String parsedUrl = kMediaOptions.rtspUri.replaceAll("^.*?://", "http://");
			url = new URL(parsedUrl);
		} catch (Exception e) {
			throw new MalformedURLException();
		}

		try {
			location = this.geoLocationByIp.getLocationByIp(InetAddress.getByName(url.getHost()));
		} catch (IOException e) {
			e.printStackTrace();
			location = null;
		} catch (Exception e) {
			log.warn("Error getting address location: {}", e.getMessage());
			location = null;
		}

		String rtspConnectionId = kMediaOptions.getTypeOfVideo() + "_" + protocol + "_"
				+ RandomStringUtils.randomAlphanumeric(4).toUpperCase() + "_" + url.getHost()
				+ (url.getPort() != -1 ? (":" + url.getPort()) : "") + url.getPath();
		rtspConnectionId = rtspConnectionId.replace("/", "_").replace("-", "").replace(".", "_").replace(":", "_");
		rtspConnectionId = IdentifierPrefixes.IPCAM_ID + rtspConnectionId;

		// Store a "fake" participant for the IpCam connection
		this.newInsecureParticipant(rtspConnectionId);
		String token = IdentifierPrefixes.TOKEN_ID + RandomStringUtils.randomAlphabetic(1).toUpperCase()
				+ RandomStringUtils.randomAlphanumeric(15);

		this.newTokenForInsecureUser(session, token, connectionProperties);
		final Token tokenObj = session.consumeToken(token);

		Participant ipcamParticipant = this.newIpcamParticipant(sessionId, rtspConnectionId, tokenObj, location,
				mediaOptions.getTypeOfVideo());

		// Store a "fake" final user for the IpCam connection
		final String finalUserId = rtspConnectionId;
		this.sessionidFinalUsers.get(sessionId).computeIfAbsent(finalUserId, k -> {
			return new FinalUser(finalUserId, sessionId, ipcamParticipant);
		}).addConnectionIfAbsent(ipcamParticipant);

		// Join the participant to the session
		this.joinRoom(ipcamParticipant, sessionId, null);

		// Publish the IpCam stream into the session
		KurentoParticipant kParticipant = (KurentoParticipant) this.getParticipant(rtspConnectionId);
		kParticipant.deleteIpcamProperties();

		this.publishVideo(kParticipant, mediaOptions, null);
		return kParticipant;
	}

	@Override
	public void reconnectStream(Participant participant, String streamId, String sdpOffer, Integer transactionId) {
		KurentoParticipant kParticipant = (KurentoParticipant) participant;
		KurentoSession kSession = kParticipant.getSession();
		boolean isPublisher = streamId.equals(participant.getPublisherStreamId());
		boolean isTranscodingAllowed = kSession.getSessionProperties().isTranscodingAllowed();
		VideoCodec forcedVideoCodec = kSession.getSessionProperties().forcedVideoCodec();

		// Modify sdp if forced codec is defined
		if (forcedVideoCodec != VideoCodec.NONE && !participant.isIpcam()) {
			sdpOffer = sdpMunging.forceCodec(participant, sdpOffer, true, kSession, isPublisher, true,
					isTranscodingAllowed, forcedVideoCodec);
		}

		if (isPublisher) {

			// Reconnect publisher
			final KurentoMediaOptions kurentoOptions = (KurentoMediaOptions) kParticipant.getPublisher()
					.getMediaOptions();

			// 1) Disconnect broken PublisherEndpoint from its PassThrough
			PublisherEndpoint publisher = kParticipant.getPublisher();
			final PassThrough passThru = publisher.disconnectFromPassThrough();

			// 2) Destroy the broken PublisherEndpoint and nothing else
			publisher.cancelStatsLoop.set(true);
			kParticipant.releaseElement(participant.getParticipantPublicId(), publisher.getEndpoint());

			// 3) Create a new PublisherEndpoint connecting it to the previous PassThrough
			kParticipant.resetPublisherEndpoint(kurentoOptions, passThru);
			kParticipant.createPublishingEndpoint(kurentoOptions, streamId);
			SdpType sdpType = kurentoOptions.isOffer ? SdpType.OFFER : SdpType.ANSWER;
			String sdpAnswer = kParticipant.publishToRoom(sdpType, sdpOffer, kurentoOptions.doLoopback, true);
			log.debug("SDP Answer for publishing reconnection PARTICIPANT {}: {}", participant.getParticipantPublicId(),
					sdpAnswer);
			sessionEventsHandler.onPublishMedia(participant, participant.getPublisherStreamId(),
					kParticipant.getPublisher().createdAt(), kSession.getSessionId(), kurentoOptions, sdpAnswer,
					new HashSet<Participant>(), transactionId, null);

		} else {

			// Reconnect subscriber
			String senderPrivateId = kSession.getParticipantPrivateIdFromStreamId(streamId);
			if (senderPrivateId != null) {
				KurentoParticipant sender = (KurentoParticipant) kSession.getParticipantByPrivateId(senderPrivateId);
				kParticipant.cancelReceivingMedia(sender, null, true);
				String sdpAnswer = kParticipant.receiveMediaFrom(sender, sdpOffer, true);
				if (sdpAnswer == null) {
					throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE,
							"Unable to generate SDP answer when reconnecting subscriber to '" + streamId + "'");
				}

				log.debug("SDP Answer for subscribing reconnection PARTICIPANT {}: {}",
						participant.getParticipantPublicId(), sdpAnswer);
				sessionEventsHandler.onSubscribe(participant, kSession, sdpAnswer, transactionId, null);
			} else {
				throw new OpenViduException(Code.USER_NOT_STREAMING_ERROR_CODE,
						"Stream '" + streamId + "' does not exist in Session '" + kSession.getSessionId() + "'");
			}
		}
	}

	@Override
	public String getParticipantPrivateIdFromStreamId(String sessionId, String streamId) {
		Session session = this.getSession(sessionId);
		return ((KurentoSession) session).getParticipantPrivateIdFromStreamId(streamId);
	}

	@Override
	public void onVideoData(Participant participant, Integer transactionId, Integer height, Integer width,
			Boolean videoActive, Boolean audioActive) {
		sessionEventsHandler.onVideoData(participant, transactionId, height, width, videoActive, audioActive);
	}

	protected void applyFilterInPublisher(KurentoParticipant kParticipant, KurentoFilter filter)
			throws OpenViduException {
		GenericMediaElement.Builder builder = new GenericMediaElement.Builder(kParticipant.getPipeline(),
				filter.getType());
		Props props = new JsonUtils().fromJsonObjectToProps(filter.getOptions());
		props.forEach(prop -> {
			builder.withConstructorParam(prop.getName(), prop.getValue());
		});
		kParticipant.getPublisher().apply(builder.build());
		kParticipant.getPublisher().getMediaOptions().setFilter(filter);
	}

	protected void removeFilterInPublisher(KurentoParticipant kParticipant) {
		kParticipant.getPublisher().cleanAllFilterListeners();
		kParticipant.getPublisher().revert(kParticipant.getPublisher().getFilter());
		kParticipant.getPublisher().getMediaOptions().setFilter(null);
	}

	protected KurentoFilter execFilterMethodInPublisher(KurentoParticipant kParticipant, String method,
			JsonObject params) {
		kParticipant.getPublisher().execMethod(method, params);
		KurentoFilter filter = kParticipant.getPublisher().getMediaOptions().getFilter();
		KurentoFilter updatedFilter = new KurentoFilter(filter.getType(), filter.getOptions(), method, params);
		kParticipant.getPublisher().getMediaOptions().setFilter(updatedFilter);
		return updatedFilter;
	}

	protected void addFilterEventListenerInPublisher(KurentoParticipant kParticipant, String eventType)
			throws OpenViduException {
		PublisherEndpoint pub = kParticipant.getPublisher();
		if (!pub.isListenerAddedToFilterEvent(eventType)) {
			final String sessionId = kParticipant.getSessionId();
			final String connectionId = kParticipant.getParticipantPublicId();
			final String streamId = kParticipant.getPublisherStreamId();
			final String filterType = kParticipant.getPublisherMediaOptions().getFilter().getType();
			try {
				ListenerSubscription listener = pub.getFilter().addEventListener(eventType, event -> {
					sessionEventsHandler.onFilterEventDispatched(sessionId, connectionId, streamId, filterType, event,
							kParticipant.getSession().getParticipants(),
							kParticipant.getPublisher().getPartipantsListentingToFilterEvent(eventType));
				});
				pub.storeListener(eventType, listener);
			} catch (Exception e) {
				log.error("Request to addFilterEventListener to stream {} gone wrong. Error: {}", streamId,
						e.getMessage());
				throw new OpenViduException(Code.FILTER_EVENT_LISTENER_NOT_FOUND,
						"Request to addFilterEventListener to stream " + streamId + " gone wrong: " + e.getMessage());
			}
		}
	}

	protected void removeFilterEventListenerInPublisher(KurentoParticipant kParticipant, String eventType) {
		PublisherEndpoint pub = kParticipant.getPublisher();
		if (pub.isListenerAddedToFilterEvent(eventType)) {
			GenericMediaElement filter = kParticipant.getPublisher().getFilter();
			filter.removeEventListener(pub.removeListener(eventType));
		}
	}

	protected Kms selectMediaNode(Session session) throws OpenViduException {
		Kms lessLoadedKms = null;
		try {
			lessLoadedKms = this.kmsManager.getLessLoadedConnectedAndRunningKms();
		} catch (NoSuchElementException e) {
			// Restore session not active
			this.cleanCollections(session.getSessionId());
			this.storeSessionNotActive(session);
			throw new OpenViduException(Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
					"There is no available Media Node where to initialize session '" + session.getSessionId() + "'");
		}
		log.info("KMS less loaded is {} with a load of {}", lessLoadedKms.getUri(), lessLoadedKms.getLoad());
		return lessLoadedKms;
	}

}
