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

package io.openvidu.test.browser;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.Test;
import org.kurento.test.browser.WebPage;

import io.openvidu.test.RoomFunctionalBrowserTest;

/**
 * Room demo integration test (basic version).
 *
 * @author Micael Gallego (micael.gallego@gmail.com)
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 5.0.0
 */
public class AddRemoveUsers extends RoomFunctionalBrowserTest<WebPage> {

  public static final int NUM_USERS = 2;

  @Test
  public void test() throws Exception {
    final boolean[] activeUsers = new boolean[NUM_USERS];

    final CountDownLatch[] joinCdl = createCdl(ITERATIONS, NUM_USERS);
    final CountDownLatch[] leaveCdl = createCdl(ITERATIONS, NUM_USERS);

    iterParallelUsers(NUM_USERS, ITERATIONS, new UserLifecycle() {

      @Override
      public void run(int numUser, int iteration) throws Exception {
        String userName = getBrowserKey(numUser);
        log.info("User '{}' is joining room '{}'", userName, roomName);
        synchronized (browsersLock) {
          joinToRoom(numUser, userName, roomName);
          activeUsers[numUser] = true;
          verify(activeUsers);
          joinCdl[iteration].countDown();
        }
        log.info("User '{}' joined room '{}'", userName, roomName);

        joinCdl[iteration].await(PLAY_TIME * 5000L, TimeUnit.MILLISECONDS);
        sleep(PLAY_TIME);

        log.info("User '{}' is exiting from room '{}'", userName, roomName);
        synchronized (browsersLock) {
          exitFromRoom(numUser, userName);
          activeUsers[numUser] = false;
          verify(activeUsers);
          leaveCdl[iteration].countDown();
        }
        log.info("User '{}' exited from room '{}'", userName, roomName);
        leaveCdl[iteration].await(PLAY_TIME * 5000L, TimeUnit.MILLISECONDS);
      }

    });
  }

}
