/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
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

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

import org.kurento.client.Continuation;
import org.kurento.client.ListenerSubscription;
import org.kurento.client.MediaElement;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaType;
import org.kurento.client.PassThrough;
import org.kurento.client.WebRtcEndpoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.core.api.MutedMediaType;
import io.openvidu.server.core.internal.Participant;

/**
 * Publisher aspect of the {@link MediaEndpoint}.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class PublisherEndpoint extends MediaEndpoint {
  private final static Logger log = LoggerFactory.getLogger(PublisherEndpoint.class);

  private PassThrough passThru = null;
  private ListenerSubscription passThruSubscription = null;

  private Map<String, MediaElement> elements = new HashMap<String, MediaElement>();
  private LinkedList<String> elementIds = new LinkedList<String>();
  private boolean connected = false;

  private Map<String, ListenerSubscription> elementsErrorSubscriptions =
      new HashMap<String, ListenerSubscription>();

  public PublisherEndpoint(boolean web, boolean dataChannels, Participant owner,
      String endpointName, MediaPipeline pipeline) {
    super(web, dataChannels, owner, endpointName, pipeline, log);
  }

  @Override
  protected void internalEndpointInitialization(final CountDownLatch endpointLatch) {
    super.internalEndpointInitialization(endpointLatch);
    passThru = new PassThrough.Builder(getPipeline()).build();
    passThruSubscription = registerElemErrListener(passThru);
  }

  @Override
  public synchronized void unregisterErrorListeners() {
    super.unregisterErrorListeners();
    unregisterElementErrListener(passThru, passThruSubscription);
    for (String elemId : elementIds) {
      unregisterElementErrListener(elements.get(elemId), elementsErrorSubscriptions.remove(elemId));
    }
  }

  /**
   * @return all media elements created for this publisher, except for the main element (
   * {@link WebRtcEndpoint})
   */
  public synchronized Collection<MediaElement> getMediaElements() {
    if (passThru != null) {
      elements.put(passThru.getId(), passThru);
    }
    return elements.values();
  }

  /**
   * Initializes this media endpoint for publishing media and processes the SDP offer or answer. If
   * the internal endpoint is an {@link WebRtcEndpoint}, it first registers an event listener for
   * the ICE candidates and instructs the endpoint to start gathering the candidates. If required,
   * it connects to itself (after applying the intermediate media elements and the
   * {@link PassThrough}) to allow loopback of the media stream.
   *
   * @param sdpType                indicates the type of the sdpString (offer or answer)
   * @param sdpString              offer or answer from the remote peer
   * @param doLoopback             loopback flag
   * @param loopbackAlternativeSrc alternative loopback source
   * @param loopbackConnectionType how to connect the loopback source
   * @return the SDP response (the answer if processing an offer SDP, otherwise is the updated offer
   * generated previously by this endpoint)
   */
  public synchronized String publish(SdpType sdpType, String sdpString, boolean doLoopback,
      MediaElement loopbackAlternativeSrc, MediaType loopbackConnectionType) {
    registerOnIceCandidateEventListener();
    if (doLoopback) {
      if (loopbackAlternativeSrc == null) {
        connect(this.getEndpoint(), loopbackConnectionType);
      } else {
        connectAltLoopbackSrc(loopbackAlternativeSrc, loopbackConnectionType);
      }
    } else {
      innerConnect();
    }
    String sdpResponse = null;
    switch (sdpType) {
      case ANSWER:
        sdpResponse = processAnswer(sdpString);
        break;
      case OFFER:
        sdpResponse = processOffer(sdpString);
        break;
      default:
        throw new OpenViduException(Code.MEDIA_SDP_ERROR_CODE, "Sdp type not supported: " + sdpType);
    }
    gatherCandidates();
    return sdpResponse;
  }

  public synchronized String preparePublishConnection() {
    return generateOffer();
  }

  public synchronized void connect(MediaElement sink) {
    if (!connected) {
      innerConnect();
    }
    internalSinkConnect(passThru, sink);
  }

  public synchronized void connect(MediaElement sink, MediaType type) {
    if (!connected) {
      innerConnect();
    }
    internalSinkConnect(passThru, sink, type);
  }

  public synchronized void disconnectFrom(MediaElement sink) {
    internalSinkDisconnect(passThru, sink);
  }

  public synchronized void disconnectFrom(MediaElement sink, MediaType type) {
    internalSinkDisconnect(passThru, sink, type);
  }

  /**
   * Changes the media passing through a chain of media elements by applying the specified
   * element/shaper. The element is plugged into the stream only if the chain has been initialized
   * (a.k.a. media streaming has started), otherwise it is left ready for when the connections
   * between elements will materialize and the streaming begins.
   *
   * @param shaper {@link MediaElement} that will be linked to the end of the chain (e.g. a filter)
   * @return the element's id
   * @throws OpenViduException if thrown, the media element was not added
   */
  public String apply(MediaElement shaper) throws OpenViduException {
    return apply(shaper, null);
  }

  /**
   * Same as {@link #apply(MediaElement)}, can specify the media type that will be streamed through
   * the shaper element.
   *
   * @param shaper {@link MediaElement} that will be linked to the end of the chain (e.g. a filter)
   * @param type   indicates which type of media will be connected to the shaper
   *               ({@link MediaType}), if
   *               null then the connection is mixed
   * @return the element's id
   * @throws OpenViduException if thrown, the media element was not added
   */
  public synchronized String apply(MediaElement shaper, MediaType type) throws OpenViduException {
    String id = shaper.getId();
    if (id == null) {
      throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
          "Unable to connect media element with null id");
    }
    if (elements.containsKey(id)) {
      throw new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE,
          "This endpoint already has a media element with id " + id);
    }
    MediaElement first = null;
    if (!elementIds.isEmpty()) {
      first = elements.get(elementIds.getFirst());
    }
    if (connected) {
      if (first != null) {
        internalSinkConnect(first, shaper, type);
      } else {
        internalSinkConnect(this.getEndpoint(), shaper, type);
      }
      internalSinkConnect(shaper, passThru, type);
    }
    elementIds.addFirst(id);
    elements.put(id, shaper);
    elementsErrorSubscriptions.put(id, registerElemErrListener(shaper));
    return id;
  }

  /**
   * Removes the media element object found from the media chain structure. The object is released.
   * If the chain is connected, both adjacent remaining elements will be interconnected.
   *
   * @param shaper {@link MediaElement} that will be removed from the chain
   * @throws OpenViduException if thrown, the media element was not removed
   */
  public synchronized void revert(MediaElement shaper) throws OpenViduException {
    revert (shaper, true);
  }

  public synchronized void revert(MediaElement shaper, boolean releaseElement) throws
      OpenViduException {
    final String elementId = shaper.getId();
    if (!elements.containsKey(elementId)) {
      throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
          "This endpoint (" + getEndpointName() + ") has no media element with id " + elementId);
    }

    MediaElement element = elements.remove(elementId);
    unregisterElementErrListener(element, elementsErrorSubscriptions.remove(elementId));

    // careful, the order in the elems list is reverted
    if (connected) {
      String nextId = getNext(elementId);
      String prevId = getPrevious(elementId);
      // next connects to prev
      MediaElement prev = null;
      MediaElement next = null;
      if (nextId != null) {
        next = elements.get(nextId);
      } else {
        next = this.getEndpoint();
      }
      if (prevId != null) {
        prev = elements.get(prevId);
      } else {
        prev = passThru;
      }
      internalSinkConnect(next, prev);
    }
    elementIds.remove(elementId);
    if (releaseElement) {
      element.release(new Continuation<Void>() {
        @Override
        public void onSuccess(Void result) throws Exception {
          log.trace("EP {}: Released media element {}", getEndpointName(), elementId);
        }

        @Override
        public void onError(Throwable cause) throws Exception {
          log.error("EP {}: Failed to release media element {}", getEndpointName(), elementId, cause);
        }
      });
    }
  }

  @Override
  public synchronized void mute(MutedMediaType muteType) {
    MediaElement sink = passThru;
    if (!elements.isEmpty()) {
      String sinkId = elementIds.peekLast();
      if (!elements.containsKey(sinkId)) {
        throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
            "This endpoint (" + getEndpointName() + ") has no media element with id " + sinkId
                + " (should've been connected to the internal ep)");
      }
      sink = elements.get(sinkId);
    } else {
      log.debug("Will mute connection of WebRTC and PassThrough (no other elems)");
    }
    switch (muteType) {
      case ALL:
        internalSinkDisconnect(this.getEndpoint(), sink);
        break;
      case AUDIO:
        internalSinkDisconnect(this.getEndpoint(), sink, MediaType.AUDIO);
        break;
      case VIDEO:
        internalSinkDisconnect(this.getEndpoint(), sink, MediaType.VIDEO);
        break;
    }
    resolveCurrentMuteType(muteType);
  }

  @Override
  public synchronized void unmute() {
    MediaElement sink = passThru;
    if (!elements.isEmpty()) {
      String sinkId = elementIds.peekLast();
      if (!elements.containsKey(sinkId)) {
        throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
            "This endpoint (" + getEndpointName() + ") has no media element with id " + sinkId
                + " (should've been connected to the internal ep)");
      }
      sink = elements.get(sinkId);
    } else {
      log.debug("Will unmute connection of WebRTC and PassThrough (no other elems)");
    }
    internalSinkConnect(this.getEndpoint(), sink);
    setMuteType(null);
  }

  private String getNext(String uid) {
    int idx = elementIds.indexOf(uid);
    if (idx < 0 || idx + 1 == elementIds.size()) {
      return null;
    }
    return elementIds.get(idx + 1);
  }

  private String getPrevious(String uid) {
    int idx = elementIds.indexOf(uid);
    if (idx <= 0) {
      return null;
    }
    return elementIds.get(idx - 1);
  }

  private void connectAltLoopbackSrc(MediaElement loopbackAlternativeSrc,
      MediaType loopbackConnectionType) {
    if (!connected) {
      innerConnect();
    }
    internalSinkConnect(loopbackAlternativeSrc, this.getEndpoint(), loopbackConnectionType);
  }

  private void innerConnect() {
    if (this.getEndpoint() == null) {
      throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
          "Can't connect null endpoint (ep: " + getEndpointName() + ")");
    }
    MediaElement current = this.getEndpoint();
    String prevId = elementIds.peekLast();
    while (prevId != null) {
      MediaElement prev = elements.get(prevId);
      if (prev == null) {
        throw new OpenViduException(Code.MEDIA_ENDPOINT_ERROR_CODE,
            "No media element with id " + prevId + " (ep: " + getEndpointName() + ")");
      }
      internalSinkConnect(current, prev);
      current = prev;
      prevId = getPrevious(prevId);
    }
    internalSinkConnect(current, passThru);
    connected = true;
  }

  private void internalSinkConnect(final MediaElement source, final MediaElement sink) {
    source.connect(sink, new Continuation<Void>() {
      @Override
      public void onSuccess(Void result) throws Exception {
        log.debug("EP {}: Elements have been connected (source {} -> sink {})", getEndpointName(),
            source.getId(), sink.getId());
      }

      @Override
      public void onError(Throwable cause) throws Exception {
        log.warn("EP {}: Failed to connect media elements (source {} -> sink {})",
            getEndpointName(), source.getId(), sink.getId(), cause);
      }
    });
  }

  /**
   * Same as {@link #internalSinkConnect(MediaElement, MediaElement)}, but can specify the type of
   * the media that will be streamed.
   *
   * @param source
   * @param sink
   * @param type   if null, {@link #internalSinkConnect(MediaElement, MediaElement)} will be used
   *               instead
   * @see #internalSinkConnect(MediaElement, MediaElement)
   */
  private void internalSinkConnect(final MediaElement source, final MediaElement sink,
      final MediaType type) {
    if (type == null) {
      internalSinkConnect(source, sink);
    } else {
      source.connect(sink, type, new Continuation<Void>() {
        @Override
        public void onSuccess(Void result) throws Exception {
          log.debug("EP {}: {} media elements have been connected (source {} -> sink {})",
              getEndpointName(), type, source.getId(), sink.getId());
        }

        @Override
        public void onError(Throwable cause) throws Exception {
          log.warn("EP {}: Failed to connect {} media elements (source {} -> sink {})",
              getEndpointName(), type, source.getId(), sink.getId(), cause);
        }
      });
    }
  }

  private void internalSinkDisconnect(final MediaElement source, final MediaElement sink) {
    source.disconnect(sink, new Continuation<Void>() {
      @Override
      public void onSuccess(Void result) throws Exception {
        log.debug("EP {}: Elements have been disconnected (source {} -> sink {})",
            getEndpointName(), source.getId(), sink.getId());
      }

      @Override
      public void onError(Throwable cause) throws Exception {
        log.warn("EP {}: Failed to disconnect media elements (source {} -> sink {})",
            getEndpointName(), source.getId(), sink.getId(), cause);
      }
    });
  }

  /**
   * Same as {@link #internalSinkDisconnect(MediaElement, MediaElement)}, but can specify the type
   * of the media that will be disconnected.
   *
   * @param source
   * @param sink
   * @param type   if null, {@link #internalSinkConnect(MediaElement, MediaElement)} will be used
   *               instead
   * @see #internalSinkConnect(MediaElement, MediaElement)
   */
  private void internalSinkDisconnect(final MediaElement source, final MediaElement sink,
      final MediaType type) {
    if (type == null) {
      internalSinkDisconnect(source, sink);
    } else {
      source.disconnect(sink, type, new Continuation<Void>() {
        @Override
        public void onSuccess(Void result) throws Exception {
          log.debug("EP {}: {} media elements have been disconnected (source {} -> sink {})",
              getEndpointName(), type, source.getId(), sink.getId());
        }

        @Override
        public void onError(Throwable cause) throws Exception {
          log.warn("EP {}: Failed to disconnect {} media elements (source {} -> sink {})",
              getEndpointName(), type, source.getId(), sink.getId(), cause);
        }
      });
    }
  }
}
