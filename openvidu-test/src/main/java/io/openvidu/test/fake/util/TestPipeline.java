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
package io.openvidu.test.fake.util;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaPipeline;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Wraps a pipeline used to execute fake participants in a test session (room).
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class TestPipeline {
  private static Logger log = LoggerFactory.getLogger(TestPipeline.class);

  private KurentoClient kurento;
  private MediaPipeline pipeline;
  private CountDownLatch pipelineLatch = new CountDownLatch(1);
  private Object pipelineCreateLock = new Object();
  private Object pipelineReleaseLock = new Object();
  private volatile boolean pipelineReleased = false;
  private String description = "default";
  private String room = "room";

  public TestPipeline(KurentoClient kurento, String room, String pipeDescription) {
    this.kurento = kurento;
    if (room != null) {
      this.room = room;
    }
    if (pipeDescription != null) {
      this.description = pipeDescription;
    }
  }

  public TestPipeline(KurentoClient kurento, String room) {
    this(kurento, room, null);
  }

  public MediaPipeline getPipeline() {
    try {
      pipelineLatch.await(60, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }
    return this.pipeline;
  }

  public void createPipeline() {
    synchronized (pipelineCreateLock) {
      if (pipeline != null) {
        return;
      }
      log.info("Session '{}': Creating MediaPipeline-{}", room, description);
      try {
        pipeline = kurento.createMediaPipeline();
        pipelineLatch.countDown();
        log.debug("Session '{}': Created MediaPipeline-{}", room, description);
      } catch (Exception e) {
        log.error("Unable to create MediaPipeline-{} for Session '{}'", description, room, e);
        pipelineLatch.countDown();
      }
      if (getPipeline() == null) {
        throw new RuntimeException(
            "Unable to create MediaPipeline-" + description + " for session '" + room + "'");
      }

      pipeline.addErrorListener(new EventListener<ErrorEvent>() {
        @Override
        public void onEvent(ErrorEvent event) {
          String desc = event.getType() + ": " + event.getDescription() + "(errCode="
              + event.getErrorCode() + ")";
          log.warn("Session '{}': Pipeline error encountered for MediaPipeline-{}: {}", room,
              description, desc);
        }
      });
    }
  }

  public void closePipeline() {
    synchronized (pipelineReleaseLock) {
      if (pipeline == null || pipelineReleased) {
        return;
      }
      getPipeline().release();
    }
  }
}
