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

package io.openvidu.server.kurento.kms;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import org.kurento.client.KurentoClient;
import org.kurento.client.KurentoConnectionListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.core.KurentoSession;

public class FixedOneKmsManager extends KmsManager {

	private static final Logger log = LoggerFactory.getLogger(FixedOneKmsManager.class);

	@Autowired
	SessionManager sessionManager;

	public static final AtomicBoolean CONNECTED_TO_KMS = new AtomicBoolean(false);
	public static final AtomicLong TIME_OF_DISCONNECTION = new AtomicLong(0);

	public FixedOneKmsManager(String kmsWsUri) {
		this(kmsWsUri, 1);
	}

	public FixedOneKmsManager(String kmsWsUri, int numKmss) {
		for (int i = 0; i < numKmss; i++) {
			this.addKms(new Kms(KurentoClient.create(kmsWsUri, new KurentoConnectionListener() {

				@Override
				public void reconnected(boolean isReconnected) {
					CONNECTED_TO_KMS.compareAndSet(false, true);
					if (!isReconnected) {
						// Different KMS. Reset sessions status (no Publisher or SUbscriber endpoints)
						log.warn("Kurento Client reconnected to a different KMS instance, with uri {}", kmsWsUri);
						log.warn("Updating all webrtc endpoints for active sessions");
						sessionManager.getSessions().forEach(s -> {
							((KurentoSession) s).restartStatusInKurento();
						});
					} else {
						// Same KMS. We can infer that openvidu-server/KMS connection has been lost, but
						// not the clients/KMS connections
						log.warn("Kurento Client reconnected to same KMS with uri {}", kmsWsUri);
					}
				}

				@Override
				public void disconnected() {
					CONNECTED_TO_KMS.compareAndSet(true, false);
					TIME_OF_DISCONNECTION.set(System.currentTimeMillis());
					log.warn("Kurento Client disconnected from KMS with uri {}", kmsWsUri);
				}

				@Override
				public void connectionFailed() {
					CONNECTED_TO_KMS.set(false);
					log.warn("Kurento Client failed connecting to KMS with uri {}", kmsWsUri);
				}

				@Override
				public void connected() {
					CONNECTED_TO_KMS.compareAndSet(false, true);
					log.warn("Kurento Client is now connected to KMS with uri {}", kmsWsUri);
				}
			}), kmsWsUri));
		}
	}
}
