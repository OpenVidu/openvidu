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
import java.util.concurrent.CountDownLatch;

import org.junit.Test;
import org.kurento.test.browser.WebPage;

import io.openvidu.test.RoomFunctionalFakeTest;

/**
 * Tests several fake WebRTC users' concurrently joining the same room.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
public abstract class ParallelNFakeUsers extends RoomFunctionalFakeTest<WebPage> {

  public final static int NUM_USERS = 0;

  public static String[] relativeUris = { "/video/filter/fiwarecut.webm",
    "/video/filter/fiwarecut_30.webm", "/video/filter/street.webm" };

  @Test
  public void test() {
    int fakeUsers = relativeUris.length;

    CountDownLatch joinLatch = parallelJoinFakeUsers(Arrays.asList(relativeUris), roomName,
        fakeKurentoClient);

    await(joinLatch, JOIN_ROOM_TOTAL_TIMEOUT_IN_SECONDS, "joinRoom", fakeUsers);

    log.info("\n-----------------\n" + "Join concluded in room '{}'" + "\n-----------------\n",
        roomName);

    CountDownLatch waitForLatch = parallelWaitActiveLive(roomName, fakeUsers);

    await(waitForLatch, ACTIVE_LIVE_TOTAL_TIMEOUT_IN_SECONDS, "waitForActiveLive", fakeUsers);

    idlePeriod();

    CountDownLatch leaveLatch = parallelLeaveFakeUsers(roomName, fakeUsers);

    await(leaveLatch, LEAVE_ROOM_TOTAL_TIMEOUT_IN_SECONDS, "leaveRoom", fakeUsers);

    log.info("\n-----------------\n" + "Leave concluded in room '{}'" + "\n-----------------\n",
        roomName);
  }

}
