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
public class SeqAddRemoveUser extends RoomFunctionalBrowserTest<WebPage> {

  private static final int WAIT_TIME = 1;

  public static final int NUM_USERS = 2;

  @Test
  public void test() throws Exception {

    boolean[] activeUsers = new boolean[NUM_USERS];

    for (int cycle = 0; cycle < ITERATIONS; cycle++) {

      for (int i = 0; i < NUM_USERS; i++) {
        String userName = getBrowserKey(i);
        log.info("User '{}' joining room '{}'", userName, roomName);
        joinToRoom(i, userName, roomName);
        activeUsers[i] = true;
        sleep(WAIT_TIME);
        verify(activeUsers);
        log.info("User '{}' joined to room '{}'", userName, roomName);
      }

      for (int i = 0; i < NUM_USERS; i++) {
        for (int j = 0; j < NUM_USERS; j++) {
          waitForStream(i, getBrowserKey(i), j);
          log.debug("Received media from '{}' in browser of '{}'", getBrowserKey(j),
              getBrowserKey(i));
        }
      }

      // Guard time to see application in action
      sleep(PLAY_TIME);

      // Stop application by caller
      for (int i = 0; i < NUM_USERS; i++) {
        String userName = getBrowserKey(i);
        log.info("User '{}' is exiting from room '{}'", userName, roomName);
        exitFromRoom(i, userName);
        activeUsers[i] = false;
        sleep(WAIT_TIME);
        verify(activeUsers);
        log.info("User '{}' exited from room '{}'", userName, roomName);
      }
    }
  }

}
