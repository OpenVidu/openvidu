/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

package io.openvidu.server.kurento.kms;

import org.kurento.client.KurentoClient;
import org.kurento.client.KurentoConnectionListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FixedOneKmsManager extends KmsManager {

	private static final Logger log = LoggerFactory.getLogger(FixedOneKmsManager.class);

	public FixedOneKmsManager(String kmsWsUri) {
		this(kmsWsUri, 1);
	}

	public FixedOneKmsManager(String kmsWsUri, int numKmss) {
		for (int i = 0; i < numKmss; i++) {
			this.addKms(new Kms(KurentoClient.create(kmsWsUri, new KurentoConnectionListener() {

				@Override
				public void reconnected(boolean isReconnected) {
					log.warn("Kurento Client reconnected ({}) to KMS with uri {}", isReconnected, kmsWsUri);
				}

				@Override
				public void disconnected() {
					log.warn("Kurento Client disconnected from KMS with uri {}", kmsWsUri);
				}

				@Override
				public void connectionFailed() {
					log.warn("Kurento Client failed connecting to KMS with uri {}", kmsWsUri);
				}

				@Override
				public void connected() {
					log.warn("Kurento Client is now connected to KMS with uri {}", kmsWsUri);
				}
			}), kmsWsUri));
		}
	}
}
