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

import java.util.Arrays;
import java.util.List;

import org.kurento.client.KurentoClient;
import org.kurento.commons.exception.KurentoException;

public class FixedOneKmsManager extends KmsManager {

	@Override
	public List<Kms> initializeKurentoClients(List<String> kmsUris) throws Exception {
		final String kmsUri = kmsUris.get(0);
		KurentoClient kClient = null;
		Kms kms = new Kms(kmsUri, loadManager);
		this.addKms(kms);
		try {
			kClient = KurentoClient.create(kmsUri, this.generateKurentoConnectionListener(kms.getId()));
		} catch (KurentoException e) {
			log.error("KMS in {} is not reachable by OpenVidu Server", kmsUri);
			throw new Exception();
		}

		kms.setKurentoClient(kClient);

		return Arrays.asList(kms);
	}

}
