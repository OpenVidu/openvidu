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
 * Room browser test. Designed for the demo app.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.0.0
 */
public class UnpublishMedia extends RoomFunctionalBrowserTest<WebPage> {

  public static final int NUM_USERS = 3;

  @Test
  public void test() throws Exception {
    ITERATIONS = 3;

    final boolean[] activeUsers = new boolean[NUM_USERS];

    final CountDownLatch[] joinCdl = createCdl(ITERATIONS, NUM_USERS);
    final CountDownLatch[] publishCdl = createCdl(ITERATIONS, NUM_USERS * NUM_USERS);
    final CountDownLatch[] unpublishCdl = createCdl(ITERATIONS, 1);
    final CountDownLatch[] verifyCdl = createCdl(ITERATIONS, NUM_USERS);
    final CountDownLatch[] leaveCdl = createCdl(ITERATIONS, NUM_USERS);

    final int[] unpublisherIndex = new int[ITERATIONS];
    for (int i = 0; i < unpublisherIndex.length; i++) {
      unpublisherIndex[i] = random.nextInt(NUM_USERS);
    }

    iterParallelUsers(NUM_USERS, ITERATIONS, new UserLifecycle() {

      @Override
      public void run(final int numUser, final int iteration) throws Exception {
        final String userName = getBrowserKey(numUser);

        log.info("User '{}' is joining room '{}'", userName, roomName);
        synchronized (browsersLock) {
          joinToRoom(numUser, userName, roomName);
          activeUsers[numUser] = true;
          verify(activeUsers);
          joinCdl[iteration].countDown();
        }
        log.info("User '{}' joined room '{}'", userName, roomName);
        joinCdl[iteration].await(PLAY_TIME * 5000L, TimeUnit.MILLISECONDS);

        final long start = System.currentTimeMillis();

        parallelTasks(NUM_USERS, USER_BROWSER_PREFIX, "parallelWaitForStream", new Task() {
          @Override
          public void exec(int numTask) throws Exception {
            String videoUserName = getBrowserKey(numTask);
            synchronized (browsersLock) {
              waitForStream(numUser, userName, numTask);
            }
            long duration = System.currentTimeMillis() - start;
            log.info("Video received in browser of user '{}' for user '{}' in {} millis", userName,
                videoUserName, duration);
            publishCdl[iteration].countDown();
          }
        });
        publishCdl[iteration].await(PLAY_TIME * 5000L, TimeUnit.MILLISECONDS);

        synchronized (browsersLock) {
          if (numUser == unpublisherIndex[iteration]) {
            log.info("User '{}' unpublishing media in room '{}'", userName, roomName);
            unpublish(numUser);
            log.info("User '{}' unpublished media in room '{}'", userName, roomName);
            activeUsers[numUser] = false;
            unpublishCdl[iteration].countDown();
          }
        }
        unpublishCdl[iteration].await(PLAY_TIME * 5000L, TimeUnit.MILLISECONDS);

        synchronized (browsersLock) {
          verify(activeUsers);
          verifyCdl[iteration].countDown();
        }
        log.info("{} - Verified that '{}' unpublished media in room '{}'", userName,
            getBrowserKey(unpublisherIndex[iteration]), roomName);
        verifyCdl[iteration].await(PLAY_TIME * 5000L, TimeUnit.MILLISECONDS);

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
