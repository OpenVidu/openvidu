/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;

import javax.annotation.PostConstruct;

import org.kurento.client.KurentoClient;
import org.kurento.commons.exception.KurentoException;

import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionManager;

public class FixedOneKmsManager extends KmsManager {

	public FixedOneKmsManager(SessionManager sessionManager, LoadManager loadManager) {
		super(sessionManager, loadManager);
	}

	@Override
	public List<Kms> initializeKurentoClients(List<KmsProperties> kmsProperties, boolean disconnectUponFailure)
			throws Exception {
		KmsProperties firstProps = kmsProperties.get(0);
		KurentoClient kClient = null;
		Kms kms = new Kms(firstProps, loadManager, this);
		try {

			kClient = this.createKurentoClient(kms.getId(), firstProps.getUri());
			kms.setKurentoClient(kClient);

			// TODO: This should be done in KurentoClient connected event
			kms.setKurentoClientConnected(true, false);

			this.addKms(kms);

			// Set Media Server in OpenVidu configuration
			this.openviduConfig.setMediaServer(kms.getMediaServerType());

		} catch (KurentoException e) {
			log.error("KMS in {} is not reachable by OpenVidu Server", firstProps.getUri());
			if (kClient != null) {
				kClient.destroy();
			}
			throw new Exception();
		}
		return Arrays.asList(kms);
	}

	@Override
	public void incrementActiveRecordings(RecordingProperties properties, String recordingId, Session session) {
		try {
			this.getKmss().iterator().next().incrementActiveRecordings(session.getSessionId(), recordingId, properties);
		} catch (NoSuchElementException e) {
			log.error("There is no KMS available when incrementing active recordings");
		}
	}

	@Override
	public void decrementActiveRecordings(RecordingProperties properties, String recordingId, Session session) {
		try {
			this.getKmss().iterator().next().decrementActiveRecordings(recordingId, properties);
		} catch (NoSuchElementException e) {
			log.error("There is no KMS available when decrementing active recordings");
		}
	}

	@Override
	public void removeMediaNodeUponCrash(String mediaNodeId) {
	}

	@Override
	protected String getEnvironmentId(String mediaNodeId) {
		return null;
	}

	@Override
	@PostConstruct
	protected void postConstructInitKurentoClients() {
		try {
			List<KmsProperties> kmsProps = new ArrayList<>();
			for (String kmsUri : this.openviduConfig.getKmsUris()) {
				String kmsId = KmsManager.generateKmsId();
				kmsProps.add(new KmsProperties(kmsId, kmsUri));
			}
			this.initializeKurentoClients(kmsProps, true);
		} catch (Exception e) {
			// Some KMS wasn't reachable
			log.error("Shutting down OpenVidu Server");
			Runtime.getRuntime().halt(1);
		}
	}

}
