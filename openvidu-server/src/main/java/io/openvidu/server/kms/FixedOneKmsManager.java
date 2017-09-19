/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
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

package io.openvidu.server.kms;

import org.kurento.client.KurentoClient;

public class FixedOneKmsManager extends KmsManager {

  public FixedOneKmsManager(String kmsWsUri) {
    this(kmsWsUri, 1);
  }

  public FixedOneKmsManager(String kmsWsUri, int numKmss) {
    for (int i = 0; i < numKmss; i++) {
      this.addKms(new Kms(KurentoClient.create(kmsWsUri), kmsWsUri));
    }
  }
}
