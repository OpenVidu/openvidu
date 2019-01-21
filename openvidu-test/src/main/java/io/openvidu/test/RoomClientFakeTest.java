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
package io.openvidu.test;

import static org.kurento.commons.PropertiesManager.getProperty;
import static org.kurento.test.config.TestConfiguration.TEST_HOST_PROPERTY;
import static org.kurento.test.config.TestConfiguration.TEST_PORT_PROPERTY;
import static org.kurento.test.config.TestConfiguration.TEST_PROTOCOL_DEFAULT;
import static org.kurento.test.config.TestConfiguration.TEST_PROTOCOL_PROPERTY;
import static org.kurento.test.config.TestConfiguration.TEST_PUBLIC_IP_DEFAULT;
import static org.kurento.test.config.TestConfiguration.TEST_PUBLIC_IP_PROPERTY;
import static org.kurento.test.config.TestConfiguration.TEST_PUBLIC_PORT_PROPERTY;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.Assert;
import org.kurento.client.KurentoClient;
import org.kurento.commons.PropertiesManager;
import org.kurento.commons.exception.KurentoException;
import org.kurento.test.base.KurentoTest;
import org.kurento.test.browser.WebPage;
import org.kurento.test.config.BrowserScope;
import org.kurento.test.config.Protocol;
import org.kurento.test.docker.Docker;
import org.kurento.test.services.FakeKmsService;
import org.kurento.test.services.KmsService;
import org.kurento.test.services.Service;
import org.kurento.test.services.WebServerService;
import org.kurento.test.utils.Shell;

import io.openvidu.test.fake.util.FakeSession;

/**
 * Base for Kurento Room tests with browsers and fake clients.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
public abstract class RoomClientFakeTest<W extends WebPage> extends OpenViduClientBrowserTest<W> {

  public static @Service(3) KmsService fakeKms = new FakeKmsService();

  public static String testFiles = KurentoTest.getTestFilesDiskPath();

  // overwritten if running in Docker
  public static String serverAddress = PropertiesManager.getProperty(TEST_HOST_PROPERTY,
      getProperty(TEST_PUBLIC_IP_PROPERTY, TEST_PUBLIC_IP_DEFAULT));
  public static int serverPort = getProperty(TEST_PORT_PROPERTY,
      getProperty(TEST_PUBLIC_PORT_PROPERTY, WebServerService.getAppHttpsPort()));
  public static Protocol protocol = Protocol.valueOf(getProperty(TEST_PROTOCOL_PROPERTY,
      TEST_PROTOCOL_DEFAULT).toUpperCase());

  // might get overwritten by custom room apps
  public static String appWsPath = "/openvidu";

  public long JOIN_ROOM_TOTAL_TIMEOUT_IN_SECONDS = 30;
  public long ACTIVE_LIVE_TOTAL_TIMEOUT_IN_SECONDS = 180;
  public long ROOM_ACTIVITY_IN_SECONDS = 30;
  public long LEAVE_ROOM_TOTAL_TIMEOUT_IN_SECONDS = 10;

  public URI appWsUrl;
  public URI appBaseUrl;
  public URI appUrl;

  public ConcurrentMap<String, FakeSession> sessions = new ConcurrentHashMap<String, FakeSession>();

  public KurentoClient fakeKurentoClient;

  public RoomClientFakeTest() {
    super();
  }

  @Override
  public void setupBrowserTest() throws InterruptedException {
    super.setupBrowserTest();

    calculateUrl();

    String wsProtocol = "ws";
    if (protocol.equals(Protocol.HTTPS)) {
      wsProtocol = "wss";
    }
    String hostName = appUrl.getHost();
    try {
      appWsUrl = new URI(wsProtocol, null, hostName, serverPort, appWsPath, null, null);
    } catch (URISyntaxException e) {
      throw new KurentoException("Exception generating WS URI from " + wsProtocol + ", " + hostName
          + ", server port " + serverPort + " and WS path " + appWsPath);
    }
    log.debug("Protocol: {}, Hostname: {}, Port: {}, Path: {}", wsProtocol, hostName, serverPort,
        appWsPath);

    fakeKurentoClient = fakeKms.getKurentoClient();
    Assert.assertNotNull("Fake Kurento Client is null", fakeKurentoClient);
  }

  @Override
  public void teardownBrowserTest() {
    for (FakeSession s : sessions.values()) {
      try {
        s.close();
      } catch (IOException e) {
        log.warn("Error closing session", e);
      }
    }
    fakeKms.closeKurentoClient();
    super.teardownBrowserTest();
  }

  public void calculateUrl() {
    if (appUrl == null) {
      String hostName = serverAddress;

      if (BrowserScope.DOCKER.equals(testScope)) {
        Docker docker = Docker.getSingleton();
        if (docker.isRunningInContainer()) {
          hostName = docker.getContainerIpAddress();
        } else {
          hostName = docker.getHostIpForContainers();
        }
      }

      log.debug("Protocol: {}, Hostname: {}, Port: {}, Web page type: {}", protocol, hostName,
          serverPort, webPageType);

      try {
        appUrl = new URI(protocol.toString(), null, hostName, serverPort, webPageType.toString(),
            null, null);
      } catch (URISyntaxException e) {
        throw new KurentoException("Exception generating URI from " + protocol + ", " + hostName
            + ", server port " + serverPort + " and webpage type " + webPageType);
      }
      try {
        appBaseUrl = new URI(protocol.toString(), null, hostName, serverPort, null, null, null);
      } catch (URISyntaxException e) {
        throw new KurentoException("Exception generating URI from " + protocol + ", " + hostName
            + ", server port " + serverPort);
      }
    }
  }

  public FakeSession getSession(String room) {
    return sessions.get(room);
  }

  public FakeSession createSession(String room) {
    if (sessions.containsKey(room)) {
      return sessions.get(room);
    }
    FakeSession s = new FakeSession(appWsUrl.toString(), room, fakeKurentoClient);
    FakeSession old = sessions.putIfAbsent(room, s);
    if (old != null) {
      return old;
    }
    return s;
  }

  public void closeSession(String room) {
    FakeSession session = sessions.get(room);
    if (session != null) {
      try {
        session.close();
      } catch (IOException e) {
        log.warn("Error closing session", e);
      }
    }
  }

  public FakeSession removeSession(String room) {
    return sessions.remove(room);
  }

  public CountDownLatch parallelJoinFakeUsers(final List<String> relativePaths, final String room,
      final KurentoClient kurento) {
    if (relativePaths == null || relativePaths.isEmpty()) {
      execExceptions.put("parallelJoinFakeUsers-" + room, new Exception(
          "Null or empty play paths list"));
      return null;
    }
    int userThreads = relativePaths.size();
    log.info("Joining room '{}': {} fake users with relative play paths:\n{}", room, userThreads,
        relativePaths);

    final CountDownLatch joinLatch = new CountDownLatch(userThreads);
    parallelTasks(userThreads, USER_FAKE_PREFIX, "parallelJoinFakeUsers-" + room, new Task() {
      @Override
      public void exec(int numTask) throws Exception {
        try {
          String userName = getFakeKey(numTask);
          FakeSession s = createSession(room);
          String fullPlayPath = getPlaySourcePath(userName, relativePaths.get(numTask));
          if (kurento == null) {
            s.newParticipant(userName, fullPlayPath, true, true);
          } else {
            s.newParticipant(userName, fullPlayPath, true, true, kurento);
          }
        } finally {
          joinLatch.countDown();
        }
      }
    });
    return joinLatch;
  }

  protected CountDownLatch parallelLeaveFakeUsers(final String room, int userThreads) {
    final CountDownLatch leaveLatch = new CountDownLatch(userThreads);
    parallelTasks(userThreads, USER_FAKE_PREFIX, "parallelLeaveFakeUsers-" + room, new Task() {
      @Override
      public void exec(int numTask) throws Exception {
        try {
          getSession(room).getParticipant(getFakeKey(numTask)).leaveRoom();
        } finally {
          leaveLatch.countDown();
        }
      }
    });
    return leaveLatch;
  }

  protected CountDownLatch parallelWaitActiveLive(final String room, int userThreads) {
    final CountDownLatch waitForLatch = new CountDownLatch(userThreads);
    parallelTasks(userThreads, USER_FAKE_PREFIX, "parallelWaitForActiveLive-" + room, new Task() {
      @Override
      public void exec(int numTask) throws Exception {
        getSession(room).getParticipant(getFakeKey(numTask)).waitForActiveLive(waitForLatch);
      }
    });
    return waitForLatch;
  }

  public void await(CountDownLatch waitLatch, long actionTimeoutInSeconds, String action,
      int userThreads) {
    failWithExceptions();
    try {
      if (!waitLatch.await(actionTimeoutInSeconds, TimeUnit.SECONDS)) {
        execExceptions.put(action, new Exception("Timeout waiting for '" + action + "' of "
            + userThreads + " tasks (max " + actionTimeoutInSeconds + "s)"));
      } else {
        log.debug("Finished waiting for {}", action);
      }
    } catch (InterruptedException e) {
      log.warn("Interrupted when waiting for {} of {} tasks (max {}s)", action, userThreads,
          actionTimeoutInSeconds, e);
    }
  }

  public void idlePeriod() {
    idlePeriod("ACTIVE_LIVE", "LEAVE_ROOM", roomName);
  }

  public void idlePeriod(String room) {
    idlePeriod("ACTIVE_LIVE", "LEAVE_ROOM", room);
  }

  public void idlePeriod(String previousAction, String nextAction, String room) {
    failWithExceptions();
    log.info("\n-----------------\n" + "Wait for {} concluded in '{}'" + "\n-----------------\n"
        + "Waiting {} seconds", previousAction, room, ROOM_ACTIVITY_IN_SECONDS);
    sleep(ROOM_ACTIVITY_IN_SECONDS);
    log.info("\n-----------------\n" + "{} in '{}'" + "\n-----------------\n", nextAction, room);
  }

  public static String getPlaySourcePath(String userName, String relativePath) throws Exception {
    return getPlaySourcePath(userName, relativePath, testFiles);
  }

  public static String getPlaySourcePath(String userName, String relativePath, String basePath)
      throws Exception {
    if (relativePath == null) {
      throw new Exception("Null play path for user " + userName);
    }
    if (!basePath.startsWith("http://") && !basePath.startsWith("https://")
        && !basePath.startsWith("file://")) {
      basePath = "file://" + basePath;
    }
    URI playerUri = null;
    try {
      playerUri = new URI(basePath + relativePath);
    } catch (URISyntaxException e) {
      throw new Exception("Unable to construct player URI for user " + userName
          + " from base path " + basePath + " and file " + relativePath);
    }
    String fullPlayPath = playerUri.toString();
    log.debug("Fake user '{}': using play URI {}", userName, fullPlayPath);
    return fullPlayPath;
  }

  // use fake.kms.ws.uri instead
  @Deprecated
  public static String getFreePort(String wsUri) {
    if (BrowserScope.DOCKER.equals(testScope)) {
      log.info("Test is dockerized, returning the same WS for the KMS: {}", wsUri);
      return wsUri;
    }

    URI url;
    try {
      url = new URI(wsUri);
    } catch (URISyntaxException e) {
      log.warn("WebSocket URI {} is malformed: " + e.getMessage(), wsUri);
      throw new KurentoException("WebSocket URI " + wsUri + " is malformed");
    }

    int c = 0;
    do {
      try {
        c++;
        int newPort = url.getPort() + c * c * c;
        url = new URI(url.getScheme(), null, url.getHost(), newPort, url.getPath(), null, null);
        String updatedWsUri = url.toString();
        log.debug("try#{} Is port available for running (fake) KMS using this URI? {}", c,
            updatedWsUri);
        String result = Shell.runAndWait("/bin/bash", "-c",
            "nc -z " + url.getHost() + " " + url.getPort() + "; echo $?");
        if (result.trim().equals("0")) {
          log.warn("Port " + url.getPort()
              + " is used. Maybe another KMS instance is running in this port");
        } else {
          log.debug("URI is available: {}", updatedWsUri);
          return updatedWsUri;
        }
      } catch (URISyntaxException e) {
        log.warn("WebSocket URI {} is malformed: " + e.getMessage(), wsUri);
      }
    } while (c < 3);

    log.warn("Giving up, will return the original URI: {}", wsUri);
    return wsUri;
  }
}
