/*
 * (C) Copyright 2013 Kurento (http://kurento.org/)
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
 */

package io.openvidu.server.core.endpoint;

import java.util.LinkedList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

import org.kurento.client.Continuation;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.IceCandidate;
import org.kurento.client.ListenerSubscription;
import org.kurento.client.MediaElement;
import org.kurento.client.MediaObject;
import org.kurento.client.MediaPipeline;
import org.kurento.client.OnIceCandidateEvent;
import org.kurento.client.RtpEndpoint;
import org.kurento.client.SdpEndpoint;
import org.kurento.client.WebRtcEndpoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.core.api.MutedMediaType;
import io.openvidu.server.core.internal.Participant;

/**
 * {@link WebRtcEndpoint} wrapper that supports buffering of {@link IceCandidate}s until the
 * {@link WebRtcEndpoint} is created. Connections to other peers are opened using the corresponding
 * method of the internal endpoint.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public abstract class MediaEndpoint {
  private static Logger log;

  private boolean web = false;
  private boolean dataChannels = false;

  private WebRtcEndpoint webEndpoint = null;
  private RtpEndpoint endpoint = null;

  private Participant owner;
  private String endpointName;

  private MediaPipeline pipeline = null;
  private ListenerSubscription endpointSubscription = null;

  private LinkedList<IceCandidate> candidates = new LinkedList<IceCandidate>();

  private MutedMediaType muteType;
  
  public Map<String, MediaObject> flowInMedia = new ConcurrentHashMap<>();
  public Map<String, MediaObject> flowOutMedia = new ConcurrentHashMap<>();

  /**
   * Constructor to set the owner, the endpoint's name and the media pipeline.
   *
   * @param web
   * @param dataChannels
   * @param owner
   * @param endpointName
   * @param pipeline
   * @param log
   */
  public MediaEndpoint(boolean web, boolean dataChannels, Participant owner, String endpointName,
      MediaPipeline pipeline, Logger log) {
    if (log == null) {
      MediaEndpoint.log = LoggerFactory.getLogger(MediaEndpoint.class);
    } else {
      MediaEndpoint.log = log;
    }
    this.web = web;
    this.dataChannels = dataChannels;
    this.owner = owner;
    this.setEndpointName(endpointName);
    this.setMediaPipeline(pipeline);
  }

  public boolean isWeb() {
    return web;
  }

  /**
   * @return the user session that created this endpoint
   */
  public Participant getOwner() {
    return owner;
  }

  /**
   * @return the internal endpoint ({@link RtpEndpoint} or {@link WebRtcEndpoint})
   */
  public SdpEndpoint getEndpoint() {
    if (this.isWeb()) {
      return this.webEndpoint;
    } else {
      return this.endpoint;
    }
  }

  public WebRtcEndpoint getWebEndpoint() {
    return webEndpoint;
  }

  protected RtpEndpoint getRtpEndpoint() {
    return endpoint;
  }

  /**
   * If this object doesn't have a {@link WebRtcEndpoint}, it is created in a thread-safe way using
   * the internal {@link MediaPipeline}. Otherwise no actions are taken. It also registers an error
   * listener for the endpoint and for any additional media elements.
   *
   * @param endpointLatch
   *          latch whose countdown is performed when the asynchronous call to build the
   *          {@link WebRtcEndpoint} returns
   *
   * @return the existing endpoint, if any
   */
  public synchronized SdpEndpoint createEndpoint(CountDownLatch endpointLatch) {
    SdpEndpoint old = this.getEndpoint();
    if (old == null) {
      internalEndpointInitialization(endpointLatch);
    } else {
      endpointLatch.countDown();
    }
    if (this.isWeb()) {
      while (!candidates.isEmpty()) {
        internalAddIceCandidate(candidates.removeFirst());
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
   * Sets the {@link MediaPipeline} used to create the internal {@link WebRtcEndpoint}.
   *
   * @param pipeline
   *          the {@link MediaPipeline}
   */
  public void setMediaPipeline(MediaPipeline pipeline) {
    this.pipeline = pipeline;
  }

  /**
   * @return name of this endpoint (as indicated by the browser)
   */
  public String getEndpointName() {
    return endpointName;
  }

  /**
   * Sets the endpoint's name (as indicated by the browser).
   *
   * @param endpointName
   *          the name
   */
  public void setEndpointName(String endpointName) {
    this.endpointName = endpointName;
  }

  /**
   * Unregisters all error listeners created for media elements owned by this instance.
   */
  public synchronized void unregisterErrorListeners() {
    unregisterElementErrListener(endpoint, endpointSubscription);
  }

  /**
   * Mute the media stream.
   *
   * @param muteType
   *          which type of leg to disconnect (audio, video or both)
   */
  public abstract void mute(MutedMediaType muteType);

  /**
   * Reconnect the muted media leg(s).
   */
  public abstract void unmute();

  public void setMuteType(MutedMediaType muteType) {
    this.muteType = muteType;
  }

  public MutedMediaType getMuteType() {
    return this.muteType;
  }

  protected void resolveCurrentMuteType(MutedMediaType newMuteType) {
    MutedMediaType prev = this.getMuteType();
    if (prev != null) {
      switch (prev) {
        case AUDIO :
          if (muteType.equals(MutedMediaType.VIDEO)) {
            this.setMuteType(MutedMediaType.ALL);
            return;
          }
          break;
        case VIDEO :
          if (muteType.equals(MutedMediaType.AUDIO)) {
            this.setMuteType(MutedMediaType.ALL);
            return;
          }
          break;
        case ALL :
          return;
      }
    }
    this.setMuteType(newMuteType);
  }

  /**
   * Creates the endpoint (RTP or WebRTC) and any other additional elements (if needed).
   *
   * @param endpointLatch
   */
  protected void internalEndpointInitialization(final CountDownLatch endpointLatch) {
    if (this.isWeb()) {
      WebRtcEndpoint.Builder builder = new WebRtcEndpoint.Builder(pipeline);
      if (this.dataChannels) {
        builder.useDataChannels();
      }
      builder.buildAsync(new Continuation<WebRtcEndpoint>() {
        @Override
        public void onSuccess(WebRtcEndpoint result) throws Exception {
          webEndpoint = result;

          webEndpoint.setMaxVideoRecvBandwidth(600);
          webEndpoint.setMinVideoRecvBandwidth(300);
          webEndpoint.setMaxVideoSendBandwidth(600);
          webEndpoint.setMinVideoSendBandwidth(300);

          endpointLatch.countDown();
          log.trace("EP {}: Created a new WebRtcEndpoint", endpointName);
          endpointSubscription = registerElemErrListener(webEndpoint);
        }

        @Override
        public void onError(Throwable cause) throws Exception {
          endpointLatch.countDown();
          log.error("EP {}: Failed to create a new WebRtcEndpoint", endpointName, cause);
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
   * @param candidate
   *          the remote candidate
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
   * Registers a listener for when the {@link MediaElement} triggers an {@link ErrorEvent}. Notifies
   * the owner with the error.
   *
   * @param element
   *          the {@link MediaElement}
   * @return {@link ListenerSubscription} that can be used to deregister the listener
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
   * Unregisters the error listener from the media element using the provided subscription.
   *
   * @param element
   *          the {@link MediaElement}
   * @param subscription
   *          the associated {@link ListenerSubscription}
   */
  protected void unregisterElementErrListener(MediaElement element,
      final ListenerSubscription subscription) {
    if (element == null || subscription == null) {
      return;
    }
    element.removeErrorListener(subscription);
  }

  /**
   * Orders the internal endpoint ({@link RtpEndpoint} or {@link WebRtcEndpoint}) to process the
   * offer String.
   *
   * @see SdpEndpoint#processOffer(String)
   * @param offer
   *          String with the Sdp offer
   * @return the Sdp answer
   */
  protected String processOffer(String offer) throws OpenViduException {
    if (this.isWeb()) {
      if (webEndpoint == null) {
        throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
            "Can't process offer when WebRtcEndpoint is null (ep: " + endpointName + ")");
      }
      return webEndpoint.processOffer(offer);
    } else {
      if (endpoint == null) {
        throw new OpenViduException(Code.MEDIA_RTP_ENDPOINT_ERROR_CODE,
            "Can't process offer when RtpEndpoint is null (ep: " + endpointName + ")");
      }
      return endpoint.processOffer(offer);
    }
  }

  /**
   * Orders the internal endpoint ({@link RtpEndpoint} or {@link WebRtcEndpoint}) to generate the
   * offer String that can be used to initiate a connection.
   *
   * @see SdpEndpoint#generateOffer()
   * @return the Sdp offer
   */
  protected String generateOffer() throws OpenViduException {
    if (this.isWeb()) {
      if (webEndpoint == null) {
        throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
            "Can't generate offer when WebRtcEndpoint is null (ep: " + endpointName + ")");
      }
      return webEndpoint.generateOffer();
    } else {
      if (endpoint == null) {
        throw new OpenViduException(Code.MEDIA_RTP_ENDPOINT_ERROR_CODE,
            "Can't generate offer when RtpEndpoint is null (ep: " + endpointName + ")");
      }
      return endpoint.generateOffer();
    }
  }

  /**
   * Orders the internal endpoint ({@link RtpEndpoint} or {@link WebRtcEndpoint}) to process the
   * answer String.
   *
   * @see SdpEndpoint#processAnswer(String)
   * @param answer
   *          String with the Sdp answer from remote
   * @return the updated Sdp offer, based on the received answer
   */
  protected String processAnswer(String answer) throws OpenViduException {
    if (this.isWeb()) {
      if (webEndpoint == null) {
        throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
            "Can't process answer when WebRtcEndpoint is null (ep: " + endpointName + ")");
      }
      return webEndpoint.processAnswer(answer);
    } else {
      if (endpoint == null) {
        throw new OpenViduException(Code.MEDIA_RTP_ENDPOINT_ERROR_CODE,
            "Can't process answer when RtpEndpoint is null (ep: " + endpointName + ")");
      }
      return endpoint.processAnswer(answer);
    }
  }

  /**
   * If supported, it registers a listener for when a new {@link IceCandidate} is gathered by the
   * internal endpoint ({@link WebRtcEndpoint}) and sends it to the remote User Agent as a
   * notification using the messaging capabilities of the {@link Participant}.
   *
   * @see WebRtcEndpoint#addOnIceCandidateListener(org.kurento.client.EventListener)
   * @see Participant#sendIceCandidate(String, IceCandidate)
   * @throws OpenViduException
   *           if thrown, unable to register the listener
   */
  protected void registerOnIceCandidateEventListener() throws OpenViduException {
    if (!this.isWeb()) {
      return;
    }
    if (webEndpoint == null) {
      throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
          "Can't register event listener for null WebRtcEndpoint (ep: " + endpointName + ")");
    }
    webEndpoint.addOnIceCandidateListener(new EventListener<OnIceCandidateEvent>() {
      @Override
      public void onEvent(OnIceCandidateEvent event) {
        owner.sendIceCandidate(endpointName, event.getCandidate());
      }
    });
  }

  /**
   * If supported, it instructs the internal endpoint to start gathering {@link IceCandidate}s.
   */
  protected void gatherCandidates() throws OpenViduException {
    if (!this.isWeb()) {
      return;
    }
    if (webEndpoint == null) {
      throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
          "Can't start gathering ICE candidates on null WebRtcEndpoint (ep: " + endpointName + ")");
    }
    webEndpoint.gatherCandidates(new Continuation<Void>() {
      @Override
      public void onSuccess(Void result) throws Exception {
        log.trace("EP {}: Internal endpoint started to gather candidates", endpointName);
      }

      @Override
      public void onError(Throwable cause) throws Exception {
        log.warn("EP {}: Internal endpoint failed to start gathering candidates", endpointName,
            cause);
      }
    });
  }

  private void internalAddIceCandidate(IceCandidate candidate) throws OpenViduException {
    if (webEndpoint == null) {
      throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
          "Can't add existing ICE candidates to null WebRtcEndpoint (ep: " + endpointName + ")");
    }
    this.webEndpoint.addIceCandidate(candidate, new Continuation<Void>() {
      @Override
      public void onSuccess(Void result) throws Exception {
        log.trace("Ice candidate added to the internal endpoint");
      }

      @Override
      public void onError(Throwable cause) throws Exception {
        log.warn("EP {}: Failed to add ice candidate to the internal endpoint", endpointName, cause);
      }
    });
  }
}
