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
 *
 */

package io.openvidu.server.kurento;

import org.kurento.client.KurentoClient;
import org.kurento.client.Properties;

import io.openvidu.client.OpenViduException;

public class AutodiscoveryKurentoClientProvider implements KurentoClientProvider {

  private static final int ROOM_PIPELINE_LOAD_POINTS = 50;

  @Override
  public KurentoClient getKurentoClient(KurentoClientSessionInfo sessionInfo) throws OpenViduException {

    return KurentoClient.create(Properties.of("loadPoints", ROOM_PIPELINE_LOAD_POINTS));

  }

  @Override
  public boolean destroyWhenUnused() {
    return true;
  }
}
