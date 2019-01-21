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
package io.openvidu.server.test;

import static org.junit.Assert.fail;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.Test;
import org.kurento.client.internal.KmsProvider;
import org.kurento.client.internal.NotEnoughResourcesException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ConfigurableApplicationContext;

import com.google.common.base.StandardSystemProperty;

import io.openvidu.server.OpenViduServer;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.core.Token;
import io.openvidu.server.kurento.core.KurentoSessionManager;

/**
 * Integration server test, checks the autodiscovery of KMS URLs.
 *
 * @author Micael Gallego (micael.gallego@gmail.com)
 * @since 6.2.1
 */
public class AutodiscoveryKmsUrlTest {

  private static final Logger log = LoggerFactory.getLogger(AutodiscoveryKmsUrlTest.class);

  public static BlockingQueue<Boolean> queue = new ArrayBlockingQueue<>(10);

  public static class TestKmsUrlProvider implements KmsProvider {

    @Override
    public String reserveKms(String id, int loadPoints) throws NotEnoughResourcesException {
      if (loadPoints == 50) {
        log.debug("getKmsUrl called with 50");
        queue.add(true);
      } else {
        log.error("getKmsUrl called with {} instead of 50", loadPoints);
        queue.add(false);
      }

      return "ws://fakeUrl";
    }

    @Override
    public String reserveKms(String id) throws NotEnoughResourcesException {

      log.error("getKmsUrl called without load points");
      queue.add(false);

      return "ws://fakeUrl";
    }

    @Override
    public void releaseKms(String id) throws NotEnoughResourcesException {
      // TODO Auto-generated method stub

    }
  }

  @Test
  public void test() throws IOException {

    /*Path backup = null;

    Path configFile = Paths.get(StandardSystemProperty.USER_HOME.value(), ".kurento",
        "config.properties");

    System.setProperty("kms.uris", "[\"autodiscovery\"]");

    try {

      if (Files.exists(configFile)) {

        backup = configFile.getParent().resolve("config.properties.old");

        Files.move(configFile, backup);
        log.debug("Backed-up old config.properties");
      }

      Files.createDirectories(configFile.getParent());

      try (BufferedWriter writer = Files.newBufferedWriter(configFile, StandardCharsets.UTF_8)) {
        writer.write("kms.url.provider: " + TestKmsUrlProvider.class.getName() + "\r\n");
      }

      String contents = new String(Files.readAllBytes(configFile));
      log.debug("Config file contents:\n{}", contents);

      ConfigurableApplicationContext app = OpenViduServer
          .start(new String[] { "--server.port=7777" });

      final SessionManager roomManager = app.getBean(KurentoSessionManager.class);

      new Thread(new Runnable() {
        @Override
        public void run() {
        	Participant p = new Participant("privateId", "publicId", new Token("token"), "clientMetadata");
          roomManager
              .joinRoom(p, "sessionId", 1);
        }
      }).start();

      try {
        Boolean result = queue.poll(10, TimeUnit.SECONDS);

        if (result == null) {
          fail("Event in KmsUrlProvider not called");
        } else {
          if (!result) {
            fail("Test failed");
          }
        }

      } catch (InterruptedException e) {
        fail("KmsUrlProvider was not called");
      }

    } finally {

      Files.delete(configFile);

      if (backup != null) {
        Files.move(backup, configFile);
      }
    }*/
  }

}
