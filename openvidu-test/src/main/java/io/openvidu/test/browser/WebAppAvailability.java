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
 * Web app availability basic test.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
public class WebAppAvailability extends RoomFunctionalBrowserTest<WebPage> {

  public static final int NUM_USERS = 1;

  @Test
  public void test() throws Exception {
    boolean[] activeUsers = new boolean[NUM_USERS];

    int numUser = 0;
    String userName = getBrowserKey(numUser);
    log.info("User '{}' is joining room '{}'", userName, roomName);
    joinToRoom(numUser, userName, roomName);
    activeUsers[numUser] = true;
    verify(activeUsers);
    log.info("User '{}' joined room '{}'", userName, roomName);

    long start = System.currentTimeMillis();
    waitForStream(numUser, userName, numUser);
    long duration = System.currentTimeMillis() - start;
    log.info("Video received in browser of user '{}' for user '{}' in {} millis", userName,
        userName, duration);

    log.info("User '{}' is exiting from room '{}'", userName, roomName);
    exitFromRoom(numUser, userName);
    activeUsers[numUser] = false;
    verify(activeUsers);
    log.info("User '{}' exited from room '{}'", userName, roomName);
  }
}
