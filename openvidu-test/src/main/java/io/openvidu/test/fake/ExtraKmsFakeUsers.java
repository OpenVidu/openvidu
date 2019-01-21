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

import static io.openvidu.test.config.RoomTestConfiguration.EXTRA_KMS_WS_URI_DEFAULT;
import static io.openvidu.test.config.RoomTestConfiguration.EXTRA_KMS_WS_URI_PROP;

import java.util.Arrays;
import java.util.concurrent.CountDownLatch;

import org.junit.Test;
import org.kurento.client.KurentoClient;
import org.kurento.client.KurentoConnectionListener;
import org.kurento.commons.PropertiesManager;
import org.kurento.test.browser.WebPage;

import io.openvidu.test.RoomFunctionalFakeTest;
import io.openvidu.test.config.RoomTestConfiguration;

/**
 * Tests multiple fake WebRTC users concurrently joining the same room. Some of them are built on a
 * pipeline from an extra KMS instance. (the config key for the WS URI of this instance is
 * {@link RoomTestConfiguration#EXTRA_KMS_WS_URI_PROP}, with the default value
 * {@link RoomTestConfiguration#EXTRA_KMS_WS_URI_DEFAULT})
 *
 * @see RoomTestConfiguration#EXTRA_KMS_WS_URI_PROP
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
public class ExtraKmsFakeUsers extends RoomFunctionalFakeTest<WebPage> {

  public final static int NUM_USERS = 0;

  public static String[] relativeUris = { "/video/filter/fiwarecut.webm",
    "/video/filter/fiwarecut_30.webm", "/video/filter/street.webm" };

  public static String[] extraRelativeUris = { "/video/filter/plates.webm" };

  public String testExtraFakeKmsWsUri;

  public KurentoClient testExtraFakeKurento;

  @Override
  public void setupBrowserTest() throws InterruptedException {
    testExtraFakeKmsWsUri = PropertiesManager
        .getProperty(EXTRA_KMS_WS_URI_PROP, fakeKms.getWsUri());
    if (testExtraFakeKmsWsUri == null) {
      testExtraFakeKmsWsUri = EXTRA_KMS_WS_URI_DEFAULT;
      log.debug(
          "Extra Fake KMS URI: {} (default value, as '{}' was not specified nor the Fake KMS had one)",
          testExtraFakeKmsWsUri, EXTRA_KMS_WS_URI_PROP);
    } else {
      log.debug("Extra Fake KMS URI: {}", testExtraFakeKmsWsUri);
    }

    super.setupBrowserTest();
  }

  @Override
  public void teardownBrowserTest() {
    super.teardownBrowserTest();
    if (testExtraFakeKurento != null) {
      testExtraFakeKurento.destroy();
      testExtraFakeKurento = null;
    }
  }

  protected synchronized KurentoClient getTestExtraFakeKurento() {
    if (testExtraFakeKurento == null) {
      testExtraFakeKurento = KurentoClient.create(testExtraFakeKmsWsUri,
          new KurentoConnectionListener() {
        @Override
        public void connected() {
        }

        @Override
        public void connectionFailed() {
        }

        @Override
        public void disconnected() {
          testExtraFakeKurento = null;
        }

        @Override
        public void reconnected(boolean sameServer) {
        }
      });
    }

    return testExtraFakeKurento;
  }

  @Test
  public void test() {
    int fakeUsers = relativeUris.length;

    CountDownLatch joinLatch = parallelJoinFakeUsers(Arrays.asList(relativeUris), roomName,
        fakeKurentoClient);

    await(joinLatch, JOIN_ROOM_TOTAL_TIMEOUT_IN_SECONDS, "joinRoom", fakeUsers);

    log.info("\n-----------------\n" + "Join concluded in room '{}'" + "\n-----------------\n",
        roomName);

    String aux = USER_FAKE_PREFIX;
    USER_FAKE_PREFIX = USER_FAKE_PREFIX + "extra";

    int extraFakeUsers = extraRelativeUris.length;

    joinLatch = parallelJoinFakeUsers(Arrays.asList(extraRelativeUris), roomName,
        getTestExtraFakeKurento());

    USER_FAKE_PREFIX = aux;
    CountDownLatch waitForLatch = parallelWaitActiveLive(roomName, fakeUsers);
    await(waitForLatch, ACTIVE_LIVE_TOTAL_TIMEOUT_IN_SECONDS, "waitForActiveLive", fakeUsers);

    USER_FAKE_PREFIX = USER_FAKE_PREFIX + "extra";
    waitForLatch = parallelWaitActiveLive(roomName, extraFakeUsers);
    await(waitForLatch, ACTIVE_LIVE_TOTAL_TIMEOUT_IN_SECONDS, "waitForActiveLiveExtra",
        extraFakeUsers);

    idlePeriod();

    USER_FAKE_PREFIX = aux;
    CountDownLatch leaveLatch = parallelLeaveFakeUsers(roomName, fakeUsers);
    await(leaveLatch, LEAVE_ROOM_TOTAL_TIMEOUT_IN_SECONDS, "leaveRoom", fakeUsers);

    USER_FAKE_PREFIX = USER_FAKE_PREFIX + "extra";
    leaveLatch = parallelLeaveFakeUsers(roomName, extraFakeUsers);
    await(leaveLatch, LEAVE_ROOM_TOTAL_TIMEOUT_IN_SECONDS, "leaveRoomExtra", extraFakeUsers);

    log.info("\n-----------------\n" + "Leave concluded in room '{}'" + "\n-----------------\n",
        roomName);
  }
}
