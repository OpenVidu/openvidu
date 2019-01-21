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
public class SeqNUsersEqualLifetime extends RoomFunctionalBrowserTest<WebPage> {

  public static final int NUM_USERS = 4;

  @Test
  public void test() throws Exception {

    for (int i = 0; i < NUM_USERS; i++) {
      String userName = getBrowserKey(i);
      joinToRoom(i, userName, roomName);
      log.info("User '{}' joined to room '{}'", userName, roomName);
    }

    // FIXME it fails sporadically (could be the TrickleICE mechanism)

    for (int i = 0; i < NUM_USERS; i++) {
      String userName = getBrowserKey(i);
      for (int j = 0; j < NUM_USERS; j++) {
        if (i != j) {
          waitForStream(i, userName, j);
          log.debug("Received media from '{}' in '{}'", getBrowserKey(j), userName);
        }
      }
    }

    // Guard time to see application in action
    sleep(PLAY_TIME);

    for (int i = 0; i < NUM_USERS; i++) {
      String userName = getBrowserKey(i);
      exitFromRoom(i, userName);
      log.info("User '{}' exited from room '{}'", userName, roomName);
    }
  }
}
