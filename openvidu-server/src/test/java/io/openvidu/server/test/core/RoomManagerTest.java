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

package io.openvidu.server.test.core;

import static org.junit.matchers.JUnitMatchers.containsString;
import static org.junit.matchers.JUnitMatchers.hasItem;
import static org.hamcrest.CoreMatchers.instanceOf;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.not;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.powermock.api.mockito.PowerMockito.whenNew;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.hamcrest.CoreMatchers;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.runner.RunWith;
import org.kurento.client.Continuation;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.FaceOverlayFilter;
import org.kurento.client.HubPort;
import org.kurento.client.IceCandidate;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaElement;
import org.kurento.client.MediaPipeline;
import org.kurento.client.MediaType;
import org.kurento.client.Mixer;
import org.kurento.client.OnIceCandidateEvent;
import org.kurento.client.PassThrough;
import org.kurento.client.RtpEndpoint;
import org.kurento.client.ServerManager;
import org.kurento.client.WebRtcEndpoint;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Matchers;
import org.mockito.Mock;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.powermock.core.classloader.annotations.PowerMockIgnore;
import org.powermock.core.classloader.annotations.PrepareForTest;
import org.powermock.modules.junit4.PowerMockRunner;
import org.springframework.context.ConfigurableApplicationContext;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.Token;
import io.openvidu.server.kurento.KurentoClientProvider;
import io.openvidu.server.kurento.KurentoClientSessionInfo;
import io.openvidu.server.kurento.core.KurentoSessionEventsHandler;
import io.openvidu.server.kurento.core.KurentoSessionManager;

/**
 * Tests for {@link RoomManager} when using mocked {@link KurentoClient} resources.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
@RunWith(PowerMockRunner.class)
@PrepareForTest(fullyQualifiedNames = "org.kurento.*")
@PowerMockIgnore( {"javax.management.*"})
public class RoomManagerTest {

  private static final String SDP_WEB_OFFER = "peer sdp web offer";
  private static final String SDP_WEB_ANSWER = "endpoint sdp web answer";
  private static final String SDP_WEB_SERVER_OFFER = "server sdp web offer";
  private static final String SDP_WEB_PEER_ANSWER = "peer sdp web answer";
  private static final String SDP_WEB_SERVER_UPDATED_OFFER = "server sdp updated web offer";

  private static final String SDP_RTP_OFFER = "peer sdp rtp offer";
  private static final String SDP_RTP_ANSWER = "endpoint sdp rtp answer";
  // private static final String SDP_WEB_SERVER_OFFER = "server sdp offer";
  // private static final String SDP_WEB_PEER_ANSWER = "peer sdp answer";
  // private static final String SDP_WEB_SERVER_UPDATED_OFFER =
  // "server sdp updated offer";

  private static final int USERS = 10;
  private static final int ROOMS = 3;

  private SessionManager manager;

  @Mock
  private KurentoClientProvider kcProvider;
  @Mock
  private KurentoSessionEventsHandler roomHandler;

  @Mock
  private KurentoClient kurentoClient;
  @Mock
  private ServerManager serverManager;
  @Captor
  private ArgumentCaptor<Continuation<MediaPipeline>> kurentoClientCaptor;

  @Mock
  private MediaPipeline pipeline;
  @Mock
  private WebRtcEndpoint endpoint;
  @Mock
  private PassThrough passThru;
  @Mock
  private RtpEndpoint rtpEndpoint;

  @Mock
  private WebRtcEndpoint.Builder webRtcBuilder;
  @Captor
  private ArgumentCaptor<Continuation<WebRtcEndpoint>> webRtcCaptor;
  @Captor
  private ArgumentCaptor<Continuation<Void>> webRtcConnectCaptor;
  @Captor
  private ArgumentCaptor<Continuation<Void>> webRtcDisconnectCaptor;

  @Mock
  private PassThrough.Builder passThruBuilder;
  @Captor
  private ArgumentCaptor<Continuation<Void>> passThruConnectCaptor;
  @Captor
  private ArgumentCaptor<Continuation<Void>> passThruDisconnectCaptor;

  @Mock
  private RtpEndpoint.Builder rtpBuilder;
  @Captor
  private ArgumentCaptor<Continuation<RtpEndpoint>> rtpCaptor;
  @Captor
  private ArgumentCaptor<Continuation<Void>> rtpConnectCaptor;
  @Captor
  private ArgumentCaptor<Continuation<Void>> rtpDisconnectCaptor;

  @Mock
  private Mixer mixer;
  @Mock
  private Mixer.Builder mixerBuilder;

  @Mock
  private HubPort hubPort;
  @Mock
  private HubPort.Builder hubPortBuilder;
  @Captor
  private ArgumentCaptor<Continuation<Void>> hubPortConnectCaptor;
  @Captor
  private ArgumentCaptor<MediaType> hubPortConnectTypeCaptor;

  @Mock
  private FaceOverlayFilter.Builder faceFilterBuilder;
  @Mock
  private FaceOverlayFilter faceFilter;
  @Captor
  private ArgumentCaptor<Continuation<Void>> faceFilterConnectCaptor;

  @Captor
  private ArgumentCaptor<EventListener<OnIceCandidateEvent>> iceEventCaptor;
  @Captor
  private ArgumentCaptor<EventListener<ErrorEvent>> mediaErrorEventCaptor;
  @Captor
  private ArgumentCaptor<EventListener<ErrorEvent>> pipelineErrorEventCaptor;

  @Rule
  public final ExpectedException exception = ExpectedException.none();

  private String userx = "userx";
  private String pidx = "pidx";
  private String roomx = "roomx";

  // usernames will be used as participantIds
  private String[] users = new String[USERS];
  private String[] rooms = new String[ROOMS];

  private Map<String, String> usersParticipantIds = new HashMap<String, String>();
  private Map<String, Participant> usersParticipants = new HashMap<String, Participant>();

  @Before
  public void setup() {
	  
	/* ConfigurableApplicationContext app = OpenViduServer
	          .start(new String[] { "--server.port=7777" });
	
	manager = app.getBean(KurentoSessionManager.class);

    when(kcProvider.getKurentoClient(any(KurentoClientSessionInfo.class)))
    .thenReturn(kurentoClient);
    when(kurentoClient.getServerManager()).thenReturn(serverManager);

    when(serverManager.getName()).thenReturn("mocked-kurento-client");

    // call onSuccess when creating the pipeline to use the mocked instance
    doAnswer(new Answer<Continuation<MediaPipeline>>() {
      @Override
      public Continuation<MediaPipeline> answer(InvocationOnMock invocation) throws Throwable {
        kurentoClientCaptor.getValue().onSuccess(pipeline);
        return null;
      }
    }).when(kurentoClient).createMediaPipeline(kurentoClientCaptor.capture());

    // call onSuccess when building the endpoint to use the mocked instance
    doAnswer(new Answer<Continuation<WebRtcEndpoint>>() {
      @Override
      public Continuation<WebRtcEndpoint> answer(InvocationOnMock invocation) throws Throwable {
        webRtcCaptor.getValue().onSuccess(endpoint);
        return null;
      }
    }).when(webRtcBuilder).buildAsync(webRtcCaptor.capture());

    // call onSuccess when building the RTP endpoint to use the mocked
    // instance
    doAnswer(new Answer<Continuation<RtpEndpoint>>() {
      @Override
      public Continuation<RtpEndpoint> answer(InvocationOnMock invocation) throws Throwable {
        rtpCaptor.getValue().onSuccess(rtpEndpoint);
        return null;
      }
    }).when(rtpBuilder).buildAsync(rtpCaptor.capture());

    // still using the sync version
    when(passThruBuilder.build()).thenReturn(passThru);

    try { // mock the constructor for the endpoint builder
      whenNew(WebRtcEndpoint.Builder.class).withArguments(pipeline).thenReturn(webRtcBuilder);
    } catch (Exception e) {
      e.printStackTrace();
      fail(e.getMessage());
    }

    try { // mock the constructor for the RTP endpoint builder
      whenNew(RtpEndpoint.Builder.class).withArguments(pipeline).thenReturn(rtpBuilder);
    } catch (Exception e) {
      e.printStackTrace();
      fail(e.getMessage());
    }

    try { // mock the constructor for the passThru builder
      whenNew(PassThrough.Builder.class).withArguments(pipeline).thenReturn(passThruBuilder);
    } catch (Exception e) {
      e.printStackTrace();
      fail(e.getMessage());
    }

    // mock the SDP answer when processing the offer on the endpoint
    when(endpoint.processOffer(SDP_WEB_OFFER)).thenReturn(SDP_WEB_ANSWER);

    // mock the SDP offer when generating it from the server endpoint
    when(endpoint.generateOffer()).thenReturn(SDP_WEB_SERVER_OFFER);

    // mock the SDP offer when generating it from the server endpoint
    when(endpoint.processAnswer(SDP_WEB_PEER_ANSWER)).thenReturn(SDP_WEB_SERVER_UPDATED_OFFER);

    // mock the SDP answer when processing the offer on the RTP endpoint
    when(rtpEndpoint.processOffer(SDP_RTP_OFFER)).thenReturn(SDP_RTP_ANSWER);

    // call onSuccess when connecting the WebRtc endpoint to any media
    // element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        webRtcConnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(endpoint).connect(any(MediaElement.class), webRtcConnectCaptor.capture());

    // call onSuccess when disconnecting the WebRtc endpoint from any media
    // element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        webRtcDisconnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(endpoint).disconnect(any(MediaElement.class), webRtcDisconnectCaptor.capture());

    // call onSuccess when connecting the RTP endpoint to any media
    // element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        rtpConnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(rtpEndpoint).connect(any(MediaElement.class), rtpConnectCaptor.capture());

    // call onSuccess when disconnecting the RTP endpoint from any media
    // element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        rtpDisconnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(rtpEndpoint).disconnect(any(MediaElement.class), rtpDisconnectCaptor.capture());

    // call onSuccess when connecting the PassThrough element to any media
    // element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        passThruConnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(passThru).connect(any(MediaElement.class), passThruConnectCaptor.capture());

    // call onSuccess when disconnecting the PassThrough element from any
    // media
    // element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        passThruDisconnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(passThru).disconnect(any(MediaElement.class), passThruDisconnectCaptor.capture());

    try { // mock the constructor for the mixer builder
      whenNew(Mixer.Builder.class).withArguments(pipeline).thenReturn(mixerBuilder);
    } catch (Exception e) {
      e.printStackTrace();
      fail(e.getMessage());
    }
    // using the sync version to build the mixer
    when(mixerBuilder.build()).thenReturn(mixer);

    try { // mock the constructor for the hubPort builder
      whenNew(HubPort.Builder.class).withArguments(mixer).thenReturn(hubPortBuilder);
    } catch (Exception e) {
      e.printStackTrace();
      fail(e.getMessage());
    }
    // using the sync version to build the hubPort
    when(hubPortBuilder.build()).thenReturn(hubPort);

    // call onSuccess when connecting the hubPort to any media element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        hubPortConnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(hubPort).connect(any(MediaElement.class), hubPortConnectCaptor.capture());

    // call onSuccess when connecting the hubPort to any media element and
    // with a given media type
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        hubPortConnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(hubPort).connect(any(MediaElement.class), hubPortConnectTypeCaptor.capture(),
        hubPortConnectCaptor.capture());

    try { // mock the constructor for the face filter builder
      whenNew(FaceOverlayFilter.Builder.class).withArguments(pipeline)
      .thenReturn(faceFilterBuilder);
    } catch (Exception e) {
      e.printStackTrace();
      fail(e.getMessage());
    }
    // using the sync version to build the face filter
    when(faceFilterBuilder.build()).thenReturn(faceFilter);

    // call onSuccess when connecting the face filter to any media element
    doAnswer(new Answer<Continuation<Void>>() {
      @Override
      public Continuation<Void> answer(InvocationOnMock invocation) throws Throwable {
        faceFilterConnectCaptor.getValue().onSuccess(null);
        return null;
      }
    }).when(faceFilter).connect(any(MediaElement.class), faceFilterConnectCaptor.capture());

    when(pipeline.getId()).thenReturn("mocked-pipeline");
    when(endpoint.getId()).thenReturn("mocked-webrtc-endpoint");
    when(rtpEndpoint.getId()).thenReturn("mocked-rtp-endpoint");
    when(passThru.getId()).thenReturn("mocked-pass-through");
    when(hubPort.getId()).thenReturn("mocked-hub-port");
    when(faceFilter.getId()).thenReturn("mocked-faceoverlay-filter");

    for (int i = 0; i < USERS; i++) {
      users[i] = "user" + i;
      usersParticipantIds.put(users[i], "pid" + i);
      usersParticipants.put(users[i], new Participant(users[i], users[i], new Token("token"), "clientMetadata"));
    }
    for (int i = 0; i < ROOMS; i++) {
      rooms[i] = "room" + i;
    }*/
  }

  @After
  public void tearDown() {
    /* manager.close(); */
  }

  @Test
  public void joinNewRoom() {
    /*assertThat(manager.getRooms(), not(hasItem(roomx)));

    assertTrue(userJoinRoom(roomx, userx, pidx, true).isEmpty());

    assertThat(manager.getRooms(), hasItem(roomx));
    assertThat(manager.getParticipants(roomx), hasItem(new UserParticipant(pidx, userx)));*/
  }

  /*@Test
  public void rtpJoinNewRoom() {
    assertThat(manager.getRooms(), not(hasItem(roomx)));

    assertTrue(userJoinRoom(roomx, userx, pidx, true).isEmpty());

    assertThat(manager.getRooms(), hasItem(roomx));
    assertThat(manager.getParticipants(roomx), hasItem(new UserParticipant(pidx, userx)));
  }

  @Test
  public void joinRoomFail() {
    assertThat(manager.getSessions(), not(hasItem(roomx)));

    //exception.expect(OpenViduException.class);
    //exception.expectMessage(containsString("must be created before"));
    userJoinRoom(roomx, userx, pidx, false);

    assertThat(manager.getSessions(), (hasItem(roomx)));
  }

  @Test
  public void joinManyUsersOneRoom() {
    int count = 0;
    for (Entry<String, String> userPid : usersParticipantIds.entrySet()) {
      String user = userPid.getKey();
      String pid = userPid.getValue();

      if (count == 0) {
        assertThat(manager.getRooms(), not(hasItem(roomx)));
      } else {
        assertThat(manager.getParticipants(roomx), not(hasItem(usersParticipants.get(user))));
      }

      Set<UserParticipant> peers = userJoinRoom(roomx, user, pid, count == 0);

      if (count == 0) {
        assertTrue(peers.isEmpty());
        assertThat(manager.getRooms(), hasItem(roomx));
      } else {
        assertTrue(!peers.isEmpty());
      }

      assertThat(manager.getParticipants(roomx), hasItem(usersParticipants.get(user)));

      count++;
    }
  }

  @Test
  public void joinManyWebUsersAndOneRTP() {
    joinManyUsersOneRoom();

    assertFalse(userJoinRoom(roomx, userx, pidx, false, false).isEmpty());

    assertThat(manager.getRooms(), hasItem(roomx));
    assertThat(manager.getParticipants(roomx), hasItem(new UserParticipant(pidx, userx)));
  }

  @Test
  public void joinManyUsersManyRooms() {
    final Map<String, String> usersRooms = new HashMap<String, String>();
    final Map<String, List<String>> roomsUsers = new HashMap<String, List<String>>();
    for (int i = 0; i < users.length; i++) {
      String room = rooms[i % rooms.length];
      usersRooms.put(users[i], room);
      if (!roomsUsers.containsKey(room)) {
        roomsUsers.put(room, new ArrayList<String>());
      }
      roomsUsers.get(room).add(users[i]);
    }
    for (final String room : roomsUsers.keySet()) {
      manager.createRoom(new KurentoClientSessionInfo() {
        @Override
        public String getRoomName() {
          return room;
        }
      });
    }
    for (Entry<String, String> userRoom : usersRooms.entrySet()) {
      String user = userRoom.getKey();
      final String room = userRoom.getValue();
      Set<UserParticipant> peers = manager.joinRoom(user, room, false, true,
          new KurentoClientSessionInfo() {
        @Override
        public String getRoomName() {
          return room;
        }
      }, usersParticipantIds.get(user)).existingParticipants;
      if (peers.isEmpty()) {
        assertEquals("Expected one peer in room " + room + ": " + user, 1,
            manager.getParticipants(room).size());
      }
    }
    // verifies create media pipeline was called once for each new room
    verify(kurentoClient, times(roomsUsers.size())).createMediaPipeline(
        kurentoClientCaptor.capture());
  }

  @Test
  public void leaveRoom() {
    joinManyUsersOneRoom();
    assertTrue(!userJoinRoom(roomx, userx, pidx, false).isEmpty());
    UserParticipant userxParticipant = new UserParticipant(pidx, userx);
    assertThat(manager.getParticipants(roomx), hasItem(userxParticipant));
    Set<UserParticipant> remainingUsers = manager.leaveRoom(pidx);
    assertEquals(new HashSet<UserParticipant>(usersParticipants.values()), remainingUsers);
    assertEquals(manager.getParticipants(roomx), remainingUsers);
    assertThat(manager.getParticipants(roomx), not(hasItem(userxParticipant)));
  }

  @Test
  public void rtpLeaveRoom() {
    joinManyWebUsersAndOneRTP();
    UserParticipant userxParticipant = new UserParticipant(pidx, userx);
    assertThat(manager.getParticipants(roomx), hasItem(userxParticipant));
    Set<UserParticipant> remainingUsers = manager.leaveRoom(pidx);
    assertEquals(new HashSet<UserParticipant>(usersParticipants.values()), remainingUsers);
    assertEquals(manager.getParticipants(roomx), remainingUsers);
    assertThat(manager.getParticipants(roomx), not(hasItem(userxParticipant)));
  }

  @Test
  public void publisherLifecycle() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    manager.unpublishMedia(participantId0);
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void rtpPublisherLifecycle() {
    joinManyWebUsersAndOneRTP();

    assertEquals("SDP RTP answer doesn't match", SDP_RTP_ANSWER,
        manager.publishMedia(pidx, true, SDP_RTP_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    for (String pid : usersParticipantIds.values()) {
      assertEquals("SDP WEB answer (for the web peer) doesn't match", SDP_WEB_ANSWER,
          manager.subscribe(userx, SDP_WEB_OFFER, pid));
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length));

    manager.unpublishMedia(pidx);
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void invertedPublisherLifecycle() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP server offer doesn't match", SDP_WEB_SERVER_OFFER,
        manager.generatePublishOffer(participantId0));

    assertThat(manager.getPublishers(roomx).size(), is(0));

    assertEquals("SDP updated offer doesn't match", SDP_WEB_SERVER_UPDATED_OFFER,
        manager.publishMedia(participantId0, false, SDP_WEB_PEER_ANSWER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    manager.unpublishMedia(participantId0);
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void publishAndLeave() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected without loopback, publisher's internal connection
    verify(endpoint, times(1)).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    // no external connection until someone subscribes
    verify(passThru, never()).connect(any(MediaElement.class), passThruConnectCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // connected without loopback,
    verify(endpoint, times(1)).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    // using same endpoint, subscribers connections
    verify(passThru, times(users.length - 1)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }*/

  /**
   * Tests publishing (w/o loopback) when the SDP offer is generated on the server-side.
   *
   * @throws AdminException
   */
  /*@Test
  public void invertedPublishAndLeave() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP server offer doesn't match", SDP_WEB_SERVER_OFFER,
        manager.generatePublishOffer(participantId0));

    assertThat(manager.getPublishers(roomx).size(), is(0));

    assertEquals("SDP updated offer doesn't match", SDP_WEB_SERVER_UPDATED_OFFER,
        manager.publishMedia(participantId0, false, SDP_WEB_PEER_ANSWER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected without loopback, no external connection until someone
    // subscribes
    verify(endpoint, times(1)).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    verify(passThru, never()).connect(any(MediaElement.class), passThruConnectCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // connected without loopback, publisher's internal connection
    verify(endpoint, times(1)).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    // using same endpoint, subscribers connections
    verify(passThru, times(users.length - 1)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void publishWithLoopbackError() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    doThrow(
        new OpenViduException(Code.MEDIA_WEBRTC_ENDPOINT_ERROR_CODE, "Loopback connection error test"))
        .when(passThru).connect(any(WebRtcEndpoint.class), Matchers.<Continuation<Void>> any());

    exception.expect(OpenViduException.class);
    exception.expectMessage(containsString("Loopback connection error test"));

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, true));

    assertThat(manager.getPublishers(roomx).size(), is(0));
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void publishWithLoopback() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, true));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected with loopback, so the internal connection is performed
    // right away
    verify(endpoint).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    verify(passThru).connect(any(MediaElement.class), passThruConnectCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // using same endpoint, subscribers connections + the internal one
    verify(passThru, times(users.length)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }*/

  /**
   * Tests publishing (w/ loopback) when the SDP offer is generated on the server-side.
   *
   * @throws AdminException
   */
  /*@Test
  public void invertedPublishWithLoopback() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP server offer doesn't match", SDP_WEB_SERVER_OFFER,
        manager.generatePublishOffer(participantId0));

    assertThat(manager.getPublishers(roomx).size(), is(0));

    assertEquals("SDP updated offer doesn't match", SDP_WEB_SERVER_UPDATED_OFFER,
        manager.publishMedia(participantId0, false, SDP_WEB_PEER_ANSWER, true));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected with loopback, so the internal connection is performed
    // right away
    verify(endpoint).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    verify(passThru).connect(any(MediaElement.class), passThruConnectCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // using same endpoint, subscribers connections + the internal one
    verify(passThru, times(users.length)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void publishWithAlternativeLoopbackSrc() {
    joinManyUsersOneRoom();

    Mixer m = new Mixer.Builder(pipeline).build();
    assertThat("Mixer returned by the builder is not the same as the mocked one", m, is(mixer));

    HubPort hb = new HubPort.Builder(m).build();
    assertThat("HubPort returned by the builder is not the same as the mocked one", hb, is(hubPort));

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, hb, null, true));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected with loopback, so the internal connection is performed
    // right away
    verify(endpoint).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    // the loopback is not done using the passThru elem
    verify(passThru, never()).connect(any(MediaElement.class), passThruConnectCaptor.capture());
    // the hubPort is connected to the webrtc endpoint
    verify(hubPort).connect(any(MediaElement.class), hubPortConnectCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // using same endpoint, subscribers connections only
    verify(passThru, times(users.length - 1)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void publishWithAlternativeLoopbackSrcAudioType() {
    joinManyUsersOneRoom();

    Mixer m = new Mixer.Builder(pipeline).build();
    assertThat("Mixer returned by the builder is not the same as the mocked one", m, is(mixer));

    HubPort hb = new HubPort.Builder(m).build();
    assertThat("HubPort returned by the builder is not the same as the mocked one", hb, is(hubPort));

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, hb, MediaType.AUDIO, true));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected with loopback, so the internal connection is performed
    // right away
    verify(endpoint).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    // the loopback is not done using the passThru elem
    verify(passThru, never()).connect(any(MediaElement.class), passThruConnectCaptor.capture());
    // the hubPort is connected to the webrtc endpoint
    verify(hubPort).connect(any(MediaElement.class), hubPortConnectTypeCaptor.capture(),
        hubPortConnectCaptor.capture());
    assertThat("Connection type is not audio", hubPortConnectTypeCaptor.getValue(),
        is(MediaType.AUDIO));

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // using same endpoint, subscribers connections only
    verify(passThru, times(users.length - 1)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void muteUnmutePublished() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected without loopback, publisher's internal connection
    verify(endpoint).connect(passThru, webRtcConnectCaptor.getValue());
    // no external connection until someone subscribes
    verify(passThru, never()).connect(any(MediaElement.class), passThruConnectCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // connected without loopback,
    verify(endpoint, times(1)).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    // using same endpoint, subscribers connections
    verify(passThru, times(users.length - 1)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    manager.mutePublishedMedia(MutedMediaType.ALL, participantId0);

    // disconnects once from the PassThrough
    verify(endpoint).disconnect(passThru, webRtcDisconnectCaptor.getValue());

    manager.unmutePublishedMedia(participantId0);

    // reconnects once to the PassThrough
    verify(endpoint).connect(passThru, webRtcConnectCaptor.getValue());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void muteUnmuteSubscribed() {
    joinManyUsersOneRoom();

    String participantId0 = usersParticipantIds.get(users[0]);
    String participantId1 = usersParticipantIds.get(users[1]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // connected without loopback, publisher's internal connection
    verify(endpoint).connect(passThru, webRtcConnectCaptor.getValue());
    // no external connection until someone subscribes
    verify(passThru, never()).connect(any(MediaElement.class), passThruConnectCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // connected without loopback,
    verify(endpoint, times(1)).connect(any(MediaElement.class), webRtcConnectCaptor.capture());
    // using same endpoint, subscribers connections
    verify(passThru, times(users.length - 1)).connect(any(MediaElement.class),
        passThruConnectCaptor.capture());

    manager.muteSubscribedMedia(users[0], MutedMediaType.ALL, participantId1);

    // disconnects the PassThrough once from the subscriber's endpoint
    verify(passThru).disconnect(endpoint, passThruDisconnectCaptor.getValue());

    manager.unmuteSubscribedMedia(users[0], participantId1);

    // reconnects once to the subscriber's endpoint
    verify(passThru).connect(endpoint, passThruConnectCaptor.getValue());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void addMediaFilterInParallel() throws InterruptedException, ExecutionException {
    joinManyUsersOneRoom();

    final FaceOverlayFilter filter = new FaceOverlayFilter.Builder(pipeline).build();
    assertNotNull("FaceOverlayFiler is null", filter);
    assertThat("Filter returned by the builder is not the same as the mocked one", filter,
        is(faceFilter));

    final String participantId0 = usersParticipantIds.get(users[0]);

    ExecutorService threadPool = Executors.newFixedThreadPool(1);
    ExecutorCompletionService<Void> exec = new ExecutorCompletionService<>(threadPool);
    exec.submit(new Callable<Void>() {
      @Override
      public Void call() throws Exception {
        System.out.println("Starting execution of addMediaElement");
        manager.addMediaElement(participantId0, filter);
        return null;
      }
    });

    Thread.sleep(10);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    boolean firstSubscriber = true;
    for (String pid : usersParticipantIds.values()) {
      if (pid.equals(participantId0)) {
        continue;
      }
      assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
          manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      if (firstSubscriber) {
        firstSubscriber = false;
        try {
          exec.take().get();
          System.out
          .println("Execution of addMediaElement ended (just after first peer subscribed)");
        } finally {
          threadPool.shutdownNow();
        }
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    verify(faceFilter, times(1)).connect(passThru, faceFilterConnectCaptor.getValue());
    verify(endpoint, times(1)).connect(faceFilter, webRtcConnectCaptor.getValue());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void addMediaFilterBeforePublishing() throws InterruptedException, ExecutionException {
    joinManyUsersOneRoom();

    final FaceOverlayFilter filter = new FaceOverlayFilter.Builder(pipeline).build();
    assertNotNull("FaceOverlayFiler is null", filter);
    assertThat("Filter returned by the builder is not the same as the mocked one", filter,
        is(faceFilter));

    final String participantId0 = usersParticipantIds.get(users[0]);

    System.out.println("Starting execution of addMediaElement");
    manager.addMediaElement(participantId0, filter);
    System.out.println("Execution of addMediaElement ended");

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    verify(faceFilter, times(1)).connect(passThru, faceFilterConnectCaptor.getValue());
    verify(endpoint, times(1)).connect(faceFilter, webRtcConnectCaptor.getValue());

    Set<UserParticipant> remainingUsers = manager.leaveRoom(participantId0);
    Set<UserParticipant> roomParticipants = manager.getParticipants(roomx);
    assertEquals(roomParticipants, remainingUsers);
    assertThat(roomParticipants, not(hasItem(usersParticipants.get(users[0]))));
    assertThat(manager.getPublishers(roomx).size(), is(0));

    // peers are automatically unsubscribed
    assertThat(manager.getSubscribers(roomx).size(), is(0));
  }

  @Test
  public void iceCandidate() {
    joinManyUsersOneRoom();

    final String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // verifies listener is added to publisher
    verify(endpoint, times(1)).addOnIceCandidateListener(iceEventCaptor.capture());

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // verifies listener is added to each subscriber
    verify(endpoint, times(usersParticipantIds.size())).addOnIceCandidateListener(
        iceEventCaptor.capture());

    final IceCandidate ic = new IceCandidate("1 candidate test", "audio", 1);

    doAnswer(new Answer<Void>() {

      @Override
      public Void answer(InvocationOnMock invocation) throws Throwable {
        Object[] args = invocation.getArguments();
        assertThat(args.length, is(4));

        // first arg : roomName
        assertThat(args[0], instanceOf(String.class));
        assertEquals(roomx, args[0]);

        // second arg : participantId
        assertThat(args[1], instanceOf(String.class));
        String participantId = (String) args[1];
        assertThat(usersParticipantIds.values(), hasItem(participantId));
        // not the publisher cus the captored event
        // is for one of the subscribers
        assertThat(participantId, is(not(participantId0)));

        // third arg : endpointName == publisher's userName
        assertThat(args[2], instanceOf(String.class));
        String epn = (String) args[2];
        assertEquals(users[0], epn);

        // fourth arg : iceCandidate
        assertThat(args[3], instanceOf(IceCandidate.class));
        IceCandidate icParam = (IceCandidate) args[3];
        assertEquals(ic, icParam);

        return null;
      }
    }).when(roomHandler).onIceCandidate(anyString(), anyString(), anyString(),
        Matchers.any(IceCandidate.class));

    // triggers the last captured listener
    iceEventCaptor.getValue().onEvent(
        new OnIceCandidateEvent(endpoint, "12345", null, "candidate", ic));

    // verifies the handler's method was called once (we only triggered the
    // event once)
    verify(roomHandler, times(1)).onIceCandidate(anyString(), anyString(), anyString(),
        Matchers.any(IceCandidate.class));
  }

  @Test
  public void mediaError() {
    joinManyUsersOneRoom();

    final String participantId0 = usersParticipantIds.get(users[0]);

    assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
        manager.publishMedia(participantId0, true, SDP_WEB_OFFER, false));

    assertThat(manager.getPublishers(roomx).size(), is(1));

    // verifies error listener is added to publisher
    verify(endpoint, times(1)).addErrorListener(mediaErrorEventCaptor.capture());

    final String expectedErrorMessage = "TEST_ERR: Fake media error(errCode=101)";

    doAnswer(new Answer<Void>() {
      @Override
      public Void answer(InvocationOnMock invocation) throws Throwable {
        Object[] args = invocation.getArguments();
        assertThat(args.length, is(3));

        // first arg : roomName
        assertThat(args[0], instanceOf(String.class));
        assertEquals(roomx, args[0]);

        // second arg : participantId
        assertThat(args[1], instanceOf(String.class));
        String participantId = (String) args[1];
        assertThat(usersParticipantIds.values(), hasItem(participantId));
        // error on the publisher's endpoint
        assertThat(participantId, is(participantId0));

        // third arg : error description
        assertThat(args[2], instanceOf(String.class));
        assertEquals(expectedErrorMessage, args[2]);

        return null;
      }
    }).when(roomHandler).onMediaElementError(anyString(), anyString(), anyString());

    // triggers the last captured listener
    mediaErrorEventCaptor.getValue().onEvent(
        new ErrorEvent(endpoint, "12345", null, "Fake media error", 101, "TEST_ERR"));

    for (String pid : usersParticipantIds.values()) {
      if (!pid.equals(participantId0)) {
        assertEquals("SDP answer doesn't match", SDP_WEB_ANSWER,
            manager.subscribe(users[0], SDP_WEB_OFFER, pid));
      }
    }
    assertThat(manager.getSubscribers(roomx).size(), is(users.length - 1));

    // verifies listener is added to each subscriber
    verify(endpoint, times(usersParticipantIds.size())).addErrorListener(
        mediaErrorEventCaptor.capture());

    doAnswer(new Answer<Void>() {
      @Override
      public Void answer(InvocationOnMock invocation) throws Throwable {
        Object[] args = invocation.getArguments();
        assertThat(args.length, is(3));

        // first arg : roomName
        assertThat(args[0], instanceOf(String.class));
        assertEquals(roomx, args[0]);

        // second arg : participantId
        assertThat(args[1], instanceOf(String.class));
        String participantId = (String) args[1];
        assertThat(usersParticipantIds.values(), hasItem(participantId));
        // error on a subscriber's endpoint
        assertThat(participantId, is(not(participantId0)));

        // third arg : error description
        assertThat(args[2], instanceOf(String.class));
        assertEquals(expectedErrorMessage, args[2]);

        return null;
      }
    }).when(roomHandler).onMediaElementError(anyString(), anyString(), anyString());

    // triggers the last captured listener (once again)
    mediaErrorEventCaptor.getValue().onEvent(
        new ErrorEvent(endpoint, "12345", null, "Fake media error", 101, "TEST_ERR"));

    // verifies the handler's method was called twice
    verify(roomHandler, times(2)).onMediaElementError(anyString(), anyString(), anyString());;

  }

  @Test
  public void pipelineError() {
    joinManyUsersOneRoom();

    // verifies pipeline error listener is added to room
    verify(pipeline, times(1)).addErrorListener(pipelineErrorEventCaptor.capture());

    final String expectedErrorMessage = "TEST_PP_ERR: Fake pipeline error(errCode=505)";

    doAnswer(new Answer<Void>() {
      @Override
      public Void answer(InvocationOnMock invocation) throws Throwable {
        Object[] args = invocation.getArguments();
        assertThat(args.length, is(3));

        // first arg : roomName
        assertThat(args[0], instanceOf(String.class));
        assertEquals(roomx, args[0]);

        // second arg : participantIds
        assertThat(args[1], instanceOf(Set.class));
        Set<String> pids = new HashSet<String>();
        for (Object o : (Set<?>) args[1]) {
          assertThat(o, instanceOf(String.class));
          pids.add((String) o);
        }
        assertThat(
            pids,
            CoreMatchers.hasItems(usersParticipantIds.values().toArray(
                new String[usersParticipantIds.size()])));

        // third arg : error description
        assertThat(args[2], instanceOf(String.class));
        assertEquals(expectedErrorMessage, args[2]);

        return null;
      }
    }).when(roomHandler).onPipelineError(anyString(), Matchers.<Set<String>> any(), anyString());

    // triggers the last captured listener
    pipelineErrorEventCaptor.getValue().onEvent(
        new ErrorEvent(pipeline, "12345", null, "Fake pipeline error", 505, "TEST_PP_ERR"));

    // verifies the handler's method was called only once (one captor event)
    verify(roomHandler, times(1)).onPipelineError(anyString(), Matchers.<Set<String>> any(),
        anyString());;
  }

  private Set<Participant> userJoinRoom(final String room, String user, String pid,
      boolean joinMustSucceed) {
    return userJoinRoom(room, user, pid, joinMustSucceed, true);
  }

  private Set<Participant> userJoinRoom(final String room, String user, String pid,
      boolean joinMustSucceed) {
    KurentoClientSessionInfo kcsi = null;

    if (joinMustSucceed) {
      kcsi = new KurentoClientSessionInfo() {
        @Override
        public String getRoomName() {
          return room;
        }
      };
    }
    
    Participant p = new Participant(user, user, new Token(user), user);

    manager.joinRoom(p, room, 1);
    
    Set<Participant> existingPeers = this.manager.getParticipants(room);

    // verifies create media pipeline was called once
    verify(kurentoClient, times(0)).createMediaPipeline(kurentoClientCaptor.capture());

    return existingPeers;
  }*/
}
