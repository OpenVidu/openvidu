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

import org.kurento.client.KurentoClient;
import org.kurento.client.KurentoConnectionListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.server.kurento.core.KurentoSession;
import io.openvidu.server.kurento.core.KurentoSessionManager;

public class FixedOneKmsManager extends KmsManager {

	private static final Logger log = LoggerFactory.getLogger(FixedOneKmsManager.class);

	public FixedOneKmsManager(String kmsWsUri, LoadManager loadManager) {
		super(loadManager);

		KurentoClient kClient = KurentoClient.create(kmsWsUri, new KurentoConnectionListener() {

			@Override
			public void reconnected(boolean isReconnected) {
				((KurentoSessionManager) sessionManager).getKmsManager().setKurentoClientConnectedToKms(kmsWsUri, true);
				if (!isReconnected) {
					// Different KMS. Reset sessions status (no Publisher or SUbscriber endpoints)
					log.warn("Kurento Client reconnected to a different KMS instance, with uri {}", kmsWsUri);
					log.warn("Updating all webrtc endpoints for active sessions");
					sessionManager.getSessions().forEach(s -> {
						((KurentoSession) s).restartStatusInKurento();
					});
				} else {
					// Same KMS. We may infer that openvidu-server/KMS connection has been lost, but
					// not the clients/KMS connections
					log.warn("Kurento Client reconnected to same KMS with uri {}", kmsWsUri);
				}
			}

			@Override
			public void disconnected() {
				((KurentoSessionManager) sessionManager).getKmsManager().setKurentoClientConnectedToKms(kmsWsUri,
						false);
				((KurentoSessionManager) sessionManager).getKmsManager().setTimeOfKurentoClientDisconnection(kmsWsUri,
						System.currentTimeMillis());
				log.warn("Kurento Client disconnected from KMS with uri {}", kmsWsUri);
			}

			@Override
			public void connectionFailed() {
				((KurentoSessionManager) sessionManager).getKmsManager().setKurentoClientConnectedToKms(kmsWsUri,
						false);
				log.warn("Kurento Client failed connecting to KMS with uri {}", kmsWsUri);
			}

			@Override
			public void connected() {
				((KurentoSessionManager) sessionManager).getKmsManager().setKurentoClientConnectedToKms(kmsWsUri, true);
				log.warn("Kurento Client is now connected to KMS with uri {}", kmsWsUri);
			}
		});

		this.addKms(new Kms(kmsWsUri, kClient, loadManager));
	}

}
