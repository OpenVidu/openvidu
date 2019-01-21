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
public class TwoUsersEqualLifetime extends RoomFunctionalBrowserTest<WebPage> {

  public static final int NUM_USERS = 2;

  @Test
  public void test() throws Exception {

    String user0Name = getBrowserKey(0);
    String user1Name = getBrowserKey(1);

    joinToRoom(0, user0Name, roomName);
    log.info("User '{}' joined to room '{}'", user0Name, roomName);

    joinToRoom(1, user1Name, roomName);
    log.info("User '{}' joined to room '{}'", user1Name, roomName);

    // FIXME it fails sporadically (could be the TrickleICE mechanism)

    waitForStream(0, user0Name, 0);
    log.debug("Received media from '{}' in '{}'", user0Name, user0Name);
    waitForStream(0, user0Name, 1);
    log.debug("Received media from '{}' in '{}'", user1Name, user0Name);

    waitForStream(1, user1Name, 0);
    log.debug("Received media from '{}' in '{}'", user0Name, user1Name);
    waitForStream(1, user1Name, 1);
    log.debug("Received media from '{}' in '{}'", user1Name, user1Name);

    // Guard time to see application in action
    sleep(PLAY_TIME);

    // Stop application by caller
    exitFromRoom(0, user0Name);
    exitFromRoom(1, user1Name);
  }
}
