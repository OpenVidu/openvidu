/*
 * (C) Copyright 2016 Kurento (http://kurento.org/)
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
package org.openvidu.server.test;

import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.fail;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.doAnswer;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.client.JsonRpcClientLocal;
import org.kurento.jsonrpc.message.Request;
import org.mockito.Matchers;
import org.mockito.Mock;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.runners.MockitoJUnitRunner;
import org.mockito.stubbing.Answer;
import org.openvidu.client.OpenViduClient;
import org.openvidu.client.ServerJsonRpcHandler;
import org.openvidu.client.internal.Notification;
import org.openvidu.client.internal.ParticipantJoinedInfo;
import org.openvidu.client.internal.ProtocolElements;
import org.openvidu.client.internal.Notification.Method;
import org.openvidu.server.RoomJsonRpcHandler;
import org.openvidu.server.core.api.pojo.ParticipantRequest;
import org.openvidu.server.core.api.pojo.UserParticipant;
import org.openvidu.server.core.internal.DefaultNotificationRoomHandler;
import org.openvidu.server.rpc.JsonRpcNotificationService;
import org.openvidu.server.rpc.JsonRpcUserControl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

/**
 * Integration tests for the room server protocol.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.3.1
 */
@RunWith(MockitoJUnitRunner.class)
public class RoomProtocolTest {

  private final Logger log = LoggerFactory.getLogger(RoomProtocolTest.class);

  private JsonRpcNotificationService notificationService;

  private DefaultNotificationRoomHandler roomEventHandler;

  @Mock
  private JsonRpcUserControl userControl;

  private RoomJsonRpcHandler roomJsonRpcHandler;

  private JsonRpcClientLocal localClient0;
  private OpenViduClient client0;
  private ServerJsonRpcHandler serverHandler0;

  private JsonRpcClientLocal localClient1;
  private OpenViduClient client1;
  private ServerJsonRpcHandler serverHandler1;

  @Before
  public void init() {
    notificationService = new JsonRpcNotificationService();
    roomEventHandler = new DefaultNotificationRoomHandler(notificationService);
    roomJsonRpcHandler = new RoomJsonRpcHandler();
  }

  @Test
  public void joinRoom() throws IOException, InterruptedException, ExecutionException {
    final Map<String, List<String>> expectedEmptyPeersList = new HashMap<String, List<String>>();

    final Map<String, List<String>> expectedPeersList = new HashMap<String, List<String>>();
    List<String> user0Streams = new ArrayList<String>();
    user0Streams.add("webcam");
    expectedPeersList.put("user0", user0Streams);

    final Set<UserParticipant> existingParticipants = new HashSet<UserParticipant>();

    doAnswer(new Answer<Void>() {
      @Override
      public Void answer(InvocationOnMock invocation) throws Throwable {
        Request<?> argsRequest = invocation.getArgumentAt(1, Request.class);
        Request<JsonObject> request = new Request<JsonObject>(argsRequest.getSessionId(),
            argsRequest.getId(), argsRequest.getMethod(), (JsonObject) argsRequest.getParams());

        String roomName = JsonRpcUserControl.getStringParam(request,
            ProtocolElements.JOINROOM_ROOM_PARAM);
        String userName = JsonRpcUserControl.getStringParam(request,
            ProtocolElements.JOINROOM_USER_PARAM);

        ParticipantRequest preq = invocation.getArgumentAt(2, ParticipantRequest.class);

        log.debug("joinRoom -> {} to {}, preq: {}", userName, roomName, preq);

        roomEventHandler.onParticipantJoined(preq, roomName, userName, existingParticipants, null);

        if (userName.equalsIgnoreCase("user0")) {
          existingParticipants.add(new UserParticipant(preq.getParticipantId(), "user0", true));
        }

        return null;
      }

    }).when(userControl).joinRoom(any(Transaction.class), Matchers.<Request<JsonObject>> any(),
        any(ParticipantRequest.class));

    // controls the join order
    final CountDownLatch joinCdl = new CountDownLatch(1);

    ExecutorService threadPool = Executors.newCachedThreadPool();
    ExecutorCompletionService<Void> exec = new ExecutorCompletionService<>(threadPool);

    exec.submit(new Callable<Void>() {
      @Override
      public Void call() throws Exception {
        String thname = Thread.currentThread().getName();
        Thread.currentThread().setName("user0");

        localClient0 = new JsonRpcClientLocal(roomJsonRpcHandler);
        localClient0.setSessionId("session0");
        serverHandler0 = new ServerJsonRpcHandler();
        client0 = new OpenViduClient(localClient0, serverHandler0);
        try {
          Map<String, List<String>> emptyPeersList = client0.joinRoom("room", "user0", null);
          assertThat(emptyPeersList.entrySet(), equalTo(expectedEmptyPeersList.entrySet()));
        } catch (IOException e) {
          log.error("Unable to join room", e);
          fail("Unable to join room: " + e.getMessage());
        } finally {
          joinCdl.countDown();
        }
        Thread.currentThread().setName(thname);
        return null;
      }
    });

    exec.submit(new Callable<Void>() {
      @Override
      public Void call() throws Exception {
        String thname = Thread.currentThread().getName();
        Thread.currentThread().setName("user1");

        localClient1 = new JsonRpcClientLocal(roomJsonRpcHandler);
        localClient1.setSessionId("session1");
        serverHandler1 = new ServerJsonRpcHandler();
        client1 = new OpenViduClient(localClient1, serverHandler1);
        joinCdl.await();
        try {
          Map<String, List<String>> peersList = client1.joinRoom("room", "user1", null);
          assertThat(peersList, is(expectedPeersList));
        } catch (IOException e) {
          log.error("Unable to join room", e);
          fail("Unable to join room: " + e.getMessage());
        }
        Thread.currentThread().setName(thname);
        return null;
      }
    });

    exec.take().get();
    exec.take().get();

    threadPool.shutdown();

    Notification notif = serverHandler0.getNotification();
    assertThat(notif.getMethod(), is(Method.PARTICIPANTJOINED_METHOD));
    ParticipantJoinedInfo joinedNotif = (ParticipantJoinedInfo) notif;
    assertThat(joinedNotif.getId(), is("user1"));
  }
}
