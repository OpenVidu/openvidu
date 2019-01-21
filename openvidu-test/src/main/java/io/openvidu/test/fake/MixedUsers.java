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
package io.openvidu.test.fake;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

import org.junit.Test;
import org.kurento.test.browser.WebPage;

import io.openvidu.test.RoomFunctionalFakeTest;

/**
 * Tests multiple fake WebRTC and Selenium (Chrome) users sequentially joining the same room.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
public class MixedUsers extends RoomFunctionalFakeTest<WebPage> {

  public static String[] relativeUris = { "/video/filter/fiwarecut.webm",
  "/video/filter/fiwarecut_30.webm" };

  public final static int CHROME_SPINNER_USERS = 1;

  @Test
  public void test() {
    int fakeUsers = relativeUris.length;

    CountDownLatch joinLatch = parallelJoinFakeUsers(Arrays.asList(relativeUris), roomName,
        fakeKurentoClient);

    // fail if necessary before continuing
    failWithExceptions();

    boolean[] activeBrowserUsers = new boolean[CHROME_SPINNER_USERS];
    int numUser = 0;
    String userName = getBrowserKey(numUser);
    log.info("User '{}' is joining room '{}'", userName, roomName);
    joinToRoom(numUser, userName, roomName);
    activeBrowserUsers[numUser] = true;
    verify(activeBrowserUsers); // only browser users
    log.info("User '{}' joined room '{}'", userName, roomName);

    await(joinLatch, JOIN_ROOM_TOTAL_TIMEOUT_IN_SECONDS, "joinRoom", fakeUsers);
    log.info("\n-----------------\n" + "Join concluded in room '{}'" + "\n-----------------\n",
        roomName);

    CountDownLatch waitForLatch = parallelWaitActiveLive(roomName, fakeUsers);
    await(waitForLatch, ACTIVE_LIVE_TOTAL_TIMEOUT_IN_SECONDS, "waitForActiveLive", fakeUsers);

    // verify from the browser
    Map<String, Boolean> activeFakeWrUsers = new HashMap<String, Boolean>();
    for (int i = 0; i < fakeUsers; i++) {
      activeFakeWrUsers.put(getFakeKey(i), true);
    }
    verify(activeBrowserUsers, activeFakeWrUsers);

    // let's check that video streams are being received in the browser
    long start = System.currentTimeMillis();
    waitForStream(numUser, userName, numUser);
    long duration = System.currentTimeMillis() - start;
    log.info("Video received in browser of user '{}' for user '{}' in {} millis", userName,
        userName, duration);
    for (int i = 0; i < fakeUsers; i++) {
      start = System.currentTimeMillis();
      waitForStream(numUser, userName, getFakeNativeStreamName(i));
      duration = System.currentTimeMillis() - start;
      log.info("Video received in browser of user '{}' for user '{}' in {} millis", userName,
          getFakeKey(i), duration);
    }

    long aux = ROOM_ACTIVITY_IN_SECONDS;
    ROOM_ACTIVITY_IN_SECONDS = 20;
    idlePeriod();

    int targetIndex = random.nextInt(fakeUsers);
    log.debug("Selecting video of user {}", getFakeKey(targetIndex));
    selectVideoTag(numUser, getFakeVideoStreamName(targetIndex));

    ROOM_ACTIVITY_IN_SECONDS = aux;
    idlePeriod();

    CountDownLatch leaveLatch = parallelLeaveFakeUsers(roomName, fakeUsers);
    await(leaveLatch, LEAVE_ROOM_TOTAL_TIMEOUT_IN_SECONDS, "leaveRoom", fakeUsers);

    for (int i = 0; i < fakeUsers; i++) {
      activeFakeWrUsers.put(getFakeKey(i), false);
    }
    verify(activeBrowserUsers, activeFakeWrUsers);

    log.info("User '{}' is exiting from room '{}'", userName, roomName);
    exitFromRoom(numUser, userName);
    activeBrowserUsers[numUser] = false;
    verify(activeBrowserUsers);
    log.info("User '{}' exited from room '{}'", userName, roomName);

    log.info("\n-----------------\n" + "Leave concluded in room '{}'" + "\n-----------------\n",
        roomName);
  }
}
