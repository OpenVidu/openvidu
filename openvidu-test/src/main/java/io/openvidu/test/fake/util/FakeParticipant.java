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
 */
package io.openvidu.test.fake.util;

import java.io.Closeable;
import java.io.IOException;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.Assert;
import org.kurento.client.EndOfStreamEvent;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.IceCandidate;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaState;
import org.kurento.client.MediaStateChangedEvent;
import org.kurento.client.OnIceCandidateEvent;
import org.kurento.client.PlayerEndpoint;
import org.kurento.client.WebRtcEndpoint;
import io.openvidu.client.OpenViduClient;
import io.openvidu.client.internal.IceCandidateInfo;
import io.openvidu.client.internal.Notification;
import io.openvidu.client.internal.ParticipantLeftInfo;
import io.openvidu.client.internal.ParticipantPublishedInfo;
import io.openvidu.client.internal.ParticipantUnpublishedInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 *
 */
public class FakeParticipant implements Closeable {
  private static final long WAIT_ACTIVE_LIVE_BY_PEER_TIMEOUT = 10; // seconds

  private static Logger log = LoggerFactory.getLogger(FakeParticipant.class);

  private OpenViduClient jsonRpcClient;

  private MediaPipeline pipeline;
  private WebRtcEndpoint webRtc;
  private CountDownLatch ownLatch = new CountDownLatch(1);
  private PlayerEndpoint player;

  private String name;
  private String room;
  private String playerUri;

  private boolean autoMedia = false;
  private boolean loopMedia = false;

  private Map<String, String> peerStreams = new ConcurrentSkipListMap<String, String>();
  private Map<String, WebRtcEndpoint> peerEndpoints = new ConcurrentSkipListMap<String, WebRtcEndpoint>();
  private Map<String, CountDownLatch> peerLatches = new ConcurrentSkipListMap<String, CountDownLatch>();

  private Thread notifThread;

  public FakeParticipant(String serviceUrl, String name, String room, String playerUri,
      MediaPipeline pipeline, boolean autoMedia, boolean loopMedia) {
    this.name = name;
    this.room = room;
    this.playerUri = playerUri;
    this.autoMedia = autoMedia;
    this.loopMedia = loopMedia;
    this.pipeline = pipeline;
    this.jsonRpcClient = new OpenViduClient(serviceUrl);
    this.notifThread = new Thread(name + "-notif") {
      @Override
      public void run() {
        try {
          internalGetNotification();
        } catch (InterruptedException e) {
          log.debug("Interrupted while running notification polling");
          return;
        }
      }
    };
    this.notifThread.start();
  }

  private void internalGetNotification() throws InterruptedException {
    log.info("Starting receiving notifications by polling blocking queue");
    while (true) {
      try {
        Notification notif = jsonRpcClient.getServerNotification();
        if (notif == null) {
          return;
        }
        log.debug("Polled notif {}", notif);
        switch (notif.getMethod()) {
        case ICECANDIDATE_METHOD:
          onIceCandidate(notif);
          break;
        case MEDIAERROR_METHOD:
          // TODO
          break;
        case PARTICIPANTEVICTED_METHOD:
          // TODO
          break;
        case PARTICIPANTJOINED_METHOD:
          // TODO
          break;
        case PARTICIPANTLEFT_METHOD:
          onParticipantLeft(notif);
          break;
        case PARTICIPANTPUBLISHED_METHOD:
          onParticipantPublished(notif);
          break;
        case PARTICIPANTSENDMESSAGE_METHOD:
          break;
        case PARTICIPANTUNPUBLISHED_METHOD:
          onParticipantUnpublish(notif);
          break;
        case ROOMCLOSED_METHOD:
          // TODO
          break;
        default:
          break;
        }
      } catch (Exception e) {
        log.warn("Encountered a problem when reading " + "the notifications queue", e);
      }
    }
  }

  private void onParticipantUnpublish(Notification notif) {
    ParticipantUnpublishedInfo info = (ParticipantUnpublishedInfo) notif;
    log.debug("Notif details {}: {}", info.getClass().getSimpleName(), info);
    releaseRemote(info.getName());
  }

  private void onParticipantLeft(Notification notif) {
    ParticipantLeftInfo info = (ParticipantLeftInfo) notif;
    log.debug("Notif details {}: {}", info.getClass().getSimpleName(), info);
    releaseRemote(info.getName());
  }

  private void releaseRemote(String remote) {
    WebRtcEndpoint peer = peerEndpoints.get(remote);
    if (peer != null) {
      peer.release();
    }
    peerEndpoints.remove(remote);
  }

  private void onParticipantPublished(Notification notif) {
    ParticipantPublishedInfo info = (ParticipantPublishedInfo) notif;
    log.debug("Notif details {}: {}", info.getClass().getSimpleName(), info);
    String remote = info.getId();
    addPeerStream(remote, info.getStreams());
    if (autoMedia) {
      if (peerEndpoints.containsKey(remote)) {
        log.info("(autosubscribe on) Already subscribed to {}. No actions required.", remote);
        return;
      }
      subscribe(remote);
    }
  }

  private void onIceCandidate(Notification notif) {
    IceCandidateInfo info = (IceCandidateInfo) notif;
    log.debug("Notif details {}: {}", info.getClass().getSimpleName(), info);
    String epname = info.getEndpointName();
    if (name.equals(epname)) {
      if (webRtc != null) {
        webRtc.addIceCandidate(toKurentoIceCandidate(info.getIceCandidate()));
      }
    } else {
      WebRtcEndpoint peer = peerEndpoints.get(epname);
      if (peer != null) {
        peer.addIceCandidate(toKurentoIceCandidate(info.getIceCandidate()));
      }
    }
  }

  private IceCandidate toKurentoIceCandidate(
      io.openvidu.client.internal.IceCandidate iceCandidate) {
    return new IceCandidate(iceCandidate.getCandidate(), iceCandidate.getSdpMid(),
        iceCandidate.getSdpMLineIndex());
  }

  public void joinRoom() {
    try {
      addPeers(jsonRpcClient.joinRoom(room, name));
      log.info("Joined room {}: {} peers", room, peerStreams);
      if (autoMedia) {
        log.debug("Automedia on, publishing and subscribing to as many as {} publishers",
            peerStreams.size());
        publish();
        if (!peerStreams.isEmpty()) {
          for (Entry<String, String> e : peerStreams.entrySet()) {
            String stream = e.getValue();
            String remote = e.getKey();
            if (stream != null) {
              subscribe(remote);
            }
          }
          log.debug("Finished subscribing to existing publishers");
        }
      }
    } catch (IOException e) {
      log.warn("Unable to join room '{}'", room, e);
      Assert.fail("Unable to join: " + e.getMessage());
    }
  }

  public void leaveRoom() {
    try {
      jsonRpcClient.leaveRoom();
      log.info("Left room '{}'", room);
    } catch (IOException e) {
      log.warn("Unable to leave room '{}'", room, e);
      Assert.fail("Unable to leave room: " + e.getMessage());
    }
  }

  public void publish() {
    try {
      String sdpOffer = createWebRtcForParticipant();
      String sdpAnswer = jsonRpcClient.publishVideo(sdpOffer, false);
      this.webRtc.processAnswer(sdpAnswer);
      this.webRtc.gatherCandidates();
      player.play();
      log.debug("Published media in room '{}'", room);
      log.trace("Published media in room '{}'- SDP OFFER:\n{}\nSDP ANSWER:\n{}", room, sdpOffer,
          sdpAnswer);
    } catch (IOException | URISyntaxException e) {
      log.warn("Unable to publish in room '{}'", room, e);
      Assert.fail("Unable to publish: " + e.getMessage());
    }
  }

  public void unpublish() {
    try {
      jsonRpcClient.unpublishVideo();
      log.debug("Unpublished media");
    } catch (IOException e) {
      log.warn("Unable to unpublish in room '{}'", room, e);
      Assert.fail("Unable to unpublish: " + e.getMessage());
    } finally {
      if (player != null) {
        player.stop();
        player.release();
      }
      if (webRtc != null) {
        webRtc.release();
      }
      ownLatch = null;
    }
  }

  public synchronized void subscribe(String remoteName) {
    try {
      if (peerEndpoints.containsKey(remoteName)) {
        log.warn("Already subscribed to {}", remoteName);
        return;
      }
      String sdpOffer = createWebRtcForPeer(remoteName);
      String sdpAnswer = jsonRpcClient.receiveVideoFrom(peerStreams.get(remoteName), sdpOffer);
      WebRtcEndpoint peer = peerEndpoints.get(remoteName);
      if (peer == null) {
        throw new Exception("Receiving endpoint not found for peer " + remoteName);
      }
      peer.processAnswer(sdpAnswer);
      peer.gatherCandidates();
      log.debug("Subscribed to '{}' in room '{}'", peerStreams.get(remoteName), room);
      log.trace("Subscribed to '{}' in room '{}' - SDP OFFER:\n{}\nSDP ANSWER:\n{}",
          peerStreams.get(remoteName), room, sdpOffer, sdpAnswer);
    } catch (Exception e) {
      log.warn("Unable to subscribe in room '{}' to '{}'", room, remoteName, e);
      Assert.fail("Unable to subscribe: " + e.getMessage());
    }
  }

  public synchronized void unsubscribe(String remoteName) {
    WebRtcEndpoint peer = null;
    try {
      peer = peerEndpoints.get(remoteName);
      if (peer == null) {
        log.warn("No local peer found for remote {}", remoteName);
      }
      jsonRpcClient.unsubscribeFromVideo(peerStreams.get(remoteName));
      log.debug("Unsubscribed from {}", peerStreams.get(remoteName));
    } catch (IOException e) {
      log.warn("Unable to unsubscribe in room '{}' from '{}'", room, remoteName, e);
      Assert.fail("Unable to unsubscribe: " + e.getMessage());
    } finally {
      if (peer != null) {
        peer.release();
      }
      peerEndpoints.remove(remoteName);
      peerLatches.remove(remoteName);
    }
  }

  public Set<String> getPeers() {
    return peerStreams.keySet();
  }

  private String createWebRtcForParticipant() throws URISyntaxException {

    webRtc = new WebRtcEndpoint.Builder(pipeline).build();
    ownLatch = new CountDownLatch(1);

    webRtc.addOnIceCandidateListener(new EventListener<OnIceCandidateEvent>() {
      @Override
      public void onEvent(OnIceCandidateEvent event) {
        try {
          log.debug("New ICE candidate: {}, {}, {}", event.getCandidate().getCandidate(),
              event.getCandidate().getSdpMid(), event.getCandidate().getSdpMLineIndex());
          jsonRpcClient.onIceCandidate(name, event.getCandidate().getCandidate(),
              event.getCandidate().getSdpMid(), event.getCandidate().getSdpMLineIndex());
        } catch (Exception e) {
          log.warn("Exception sending iceCanditate. Exception {}:{}", e.getClass().getName(),
              e.getMessage());
        }
      }
    });

    webRtc.addMediaStateChangedListener(new EventListener<MediaStateChangedEvent>() {
      @Override
      public void onEvent(MediaStateChangedEvent event) {
        log.info("Media state changed: {}", event.getNewState());
        if (event.getNewState() == MediaState.CONNECTED) {
          ownLatch.countDown();
        }
      }
    });

    player = new PlayerEndpoint.Builder(pipeline, playerUri).build();
    player.addErrorListener(new EventListener<ErrorEvent>() {
      @Override
      public void onEvent(ErrorEvent event) {
        log.warn("ErrorEvent for player of '{}': {}", name, event.getDescription());
      }
    });
    player.addEndOfStreamListener(new EventListener<EndOfStreamEvent>() {
      @Override
      public void onEvent(EndOfStreamEvent event) {
        if (loopMedia) {
          log.debug("Replaying {}", playerUri);
          player.play();
        } else {
          log.debug("Finished playing from {}", playerUri);
        }
      }

    });
    player.connect(webRtc);
    log.debug("Playing media from {}", playerUri);
    return webRtc.generateOffer();
  }

  private String createWebRtcForPeer(final String remoteName) throws Exception {
    if (peerEndpoints.containsKey(remoteName)) {
      throw new Exception("Already subscribed to " + remoteName);
    }

    WebRtcEndpoint peer = new WebRtcEndpoint.Builder(pipeline).build();
    final CountDownLatch peerLatch = new CountDownLatch(1);

    peer.addOnIceCandidateListener(new EventListener<OnIceCandidateEvent>() {
      @Override
      public void onEvent(OnIceCandidateEvent event) {
        try {
          jsonRpcClient.onIceCandidate(remoteName, event.getCandidate().getCandidate(),
              event.getCandidate().getSdpMid(), event.getCandidate().getSdpMLineIndex());
        } catch (Exception e) {
          log.warn("Exception sending iceCanditate. Exception {}:{}", e.getClass().getName(),
              e.getMessage());
        }
      }
    });

    peer.addMediaStateChangedListener(new EventListener<MediaStateChangedEvent>() {
      @Override
      public void onEvent(MediaStateChangedEvent event) {
        log.info("{}: Media state changed for remote {}: {}", name, remoteName,
            event.getNewState());
        if (event.getNewState() == MediaState.CONNECTED) {
          peerLatch.countDown();
        }
      }
    });

    peerEndpoints.put(remoteName, peer);
    peerLatches.put(remoteName, peerLatch);

    return peer.generateOffer();
  }

  @Override
  public void close() {
    log.debug("Closing {}", name);
    try {
      if (jsonRpcClient != null) {
        jsonRpcClient.close();
      }
    } catch (Exception e) {
      log.error("Exception closing jsonRpcClient", e);
    }
    notifThread.interrupt();
  }

  public void waitForActiveLive(CountDownLatch waitForLatch) {
    try {
      boolean allPeersConnected = true;
      for (WebRtcEndpoint peer : peerEndpoints.values()) {
        if (peer.getMediaState() != MediaState.CONNECTED) {
          allPeersConnected = false;
        }
      }

      boolean ownConnected = webRtc.getMediaState() == MediaState.CONNECTED;

      if (ownConnected && allPeersConnected) {
        return;
      }

      long remaining = WAIT_ACTIVE_LIVE_BY_PEER_TIMEOUT * (peerEndpoints.size() + 1);
      log.debug("{}: Start waiting for ACTIVE_LIVE in session '{}' - max {}s", name, room,
          remaining);
      remaining = remaining * 1000L;

      if (!ownConnected) {
        remaining = waitForLatch(remaining, ownLatch, name);
      }

      if (!allPeersConnected) {
        for (Entry<String, WebRtcEndpoint> e : peerEndpoints.entrySet()) {
          String remoteName = e.getKey();
          if (e.getValue().getMediaState() != MediaState.CONNECTED) {
            remaining = waitForLatch(remaining, peerLatches.get(remoteName), remoteName);
          }
        }
      }
    } catch (Exception e) {
      log.warn("{}: WaitForActiveLive error", name, e);
      throw e;
    } finally {
      waitForLatch.countDown();
    }
  }

  private long waitForLatch(long remaining, CountDownLatch latch, String epname) {
    long start = System.currentTimeMillis();
    try {
      if (!latch.await(remaining, TimeUnit.MILLISECONDS)) {
        throw new RuntimeException("Timeout waiting for ACTIVE_LIVE in participant '" + name
            + "' of session '" + room + "' for endpoint '" + epname + "'");
      }
      remaining -= System.currentTimeMillis() - start;
      log.trace("ACTIVE_LIVE - remaining {} ms", remaining);
    } catch (InterruptedException e) {
      log.warn("InterruptedException when waiting for ACTIVE_LIVE in participant '{}' "
          + "of session '{}' for endpoint '{}'", name, room, epname);
    }
    return remaining;
  }

  private void addPeers(Map<String, List<String>> newPeers) {
    for (String name : newPeers.keySet()) {
      addPeerStream(name, newPeers.get(name));
    }
  }

  private synchronized void addPeerStream(String name, List<String> streams) {
    if (streams == null || streams.isEmpty()) {
      log.warn("Wrong streams info for {}: {}", name, streams);
      return;
    }
    if (this.peerStreams.containsKey(name)) {
      log.warn("Overriding peer {}: {} - new: {}", name, this.peerStreams.get(name), streams);
    }
    this.peerStreams.put(name, name + "_" + streams.get(0));
    log.debug("Added first remote stream for {}: {}", name, this.peerStreams.get(name));
  }
}
