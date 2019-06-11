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

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import io.openvidu.server.core.SessionManager;

@Service
public abstract class KmsManager {

	public class KmsLoad implements Comparable<KmsLoad> {

		private Kms kms;
		private double load;

		public KmsLoad(Kms kms, double load) {
			this.kms = kms;
			this.load = load;
		}

		public Kms getKms() {
			return kms;
		}

		public double getLoad() {
			return load;
		}

		@Override
		public int compareTo(KmsLoad o) {
			return Double.compare(this.load, o.load);
		}
	}

	@Autowired
	protected SessionManager sessionManager;

	protected LoadManager loadManager;

	private final Logger log = LoggerFactory.getLogger(KmsManager.class);

	// Using KMS websocket uris as unique identifiers
	private Map<String, Kms> kmss = new ConcurrentHashMap<>();

	private Iterator<Kms> usageIterator = null;

	public KmsManager(LoadManager loadManager) {
		this.loadManager = loadManager;
	}

	public synchronized void addKms(Kms kms) {
		this.kmss.put(kms.getUri(), kms);
	}

	public synchronized void removeKms(Kms kms) {
		this.kmss.remove(kms.getUri());
	}

	public synchronized Kms getKms(String sessionId) {
		if (usageIterator == null || !usageIterator.hasNext()) {
			usageIterator = kmss.values().iterator();
		}
		return usageIterator.next();
	}

	/**
	 * Returns a {@link Kms} using a round-robin strategy.
	 *
	 * @param sessionInfo session's id
	 */
	public synchronized Kms getKmsRoundRobin() {
		if (usageIterator == null || !usageIterator.hasNext()) {
			usageIterator = kmss.values().iterator();
		}
		return usageIterator.next();
	}

	public synchronized Kms getLessLoadedKms() {
		return Collections.min(getKmsLoads()).kms;
	}

	public synchronized Kms getNextLessLoadedKms() {
		List<KmsLoad> sortedLoads = getKmssSortedByLoad();
		if (sortedLoads.size() > 1) {
			return sortedLoads.get(1).kms;
		} else {
			return sortedLoads.get(0).kms;
		}
	}

	public synchronized List<KmsLoad> getKmssSortedByLoad() {
		List<KmsLoad> kmsLoads = getKmsLoads();
		Collections.sort(kmsLoads);
		return kmsLoads;
	}

	public boolean isKurentoClientConnectedToKms(Kms kms) {
		return this.kmss.get(kms.getUri()).isKurentoClientConnected();
	}

	public long getTimeOfKurentoClientDisconnection(Kms kms) {
		return this.kmss.get(kms.getUri()).getTimeOfKurentoClientDisconnection();
	}

	public void setKurentoClientConnectedToKms(String kmsUri, boolean isConnected) {
		this.kmss.get(kmsUri).setKurentoClientConnected(isConnected);
	}

	public void setTimeOfKurentoClientDisconnection(String kmsUri, long time) {
		this.kmss.get(kmsUri).setTimeOfKurentoClientDisconnection(time);
	}

	private List<KmsLoad> getKmsLoads() {
		ArrayList<KmsLoad> kmsLoads = new ArrayList<>();
		for (Kms kms : kmss.values()) {
			double load = kms.getLoad();
			kmsLoads.add(new KmsLoad(kms, load));
			log.trace("Calc load {} for kms: {}", load, kms.getUri());
		}
		return kmsLoads;
	}

	public boolean destroyWhenUnused() {
		return false;
	}
}
