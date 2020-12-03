/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.client.KurentoConnectionListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.IdentifierPrefixes;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.core.KurentoSession;
import io.openvidu.server.utils.MediaNodeStatusManager;
import io.openvidu.server.utils.QuarantineKiller;
import io.openvidu.server.utils.UpdatableTimerTask;

public abstract class KmsManager {

	protected static final Logger log = LoggerFactory.getLogger(KmsManager.class);

	public static final Lock selectAndRemoveKmsLock = new ReentrantLock(true);
	public static final int MAX_SECONDS_LOCK_WAIT = 15;

	private Map<String, Lock> kmsReconnectionLocks = new ConcurrentHashMap<>();

	private UpdatableTimerTask kurentoReconnectTimer;

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

		public JsonObject toJson() {
			JsonObject json = this.kms.toJson();
			json.addProperty("load", this.load);
			return json;
		}

		public JsonObject toJsonExtended(boolean withSessions, boolean withActiveRecordings, boolean withExtraInfo) {
			JsonObject json = this.kms.toJsonExtended(withSessions, withActiveRecordings, withExtraInfo);
			json.addProperty("load", this.load);
			return json;
		}
	}

	@Autowired
	protected OpenviduConfig openviduConfig;

	@Autowired
	protected LoadManager loadManager;

	@Autowired
	protected QuarantineKiller quarantineKiller;

	@Autowired
	protected MediaNodeStatusManager mediaNodeStatusManager;

	final protected Map<String, Kms> kmss = new ConcurrentHashMap<>();

	public synchronized void addKms(Kms kms) {
		this.kmss.put(kms.getId(), kms);
	}

	public synchronized Kms removeKms(String kmsId) {
		return this.kmss.remove(kmsId);
	}

	public synchronized Kms getLessLoadedConnectedAndRunningKms() throws NoSuchElementException {
		List<KmsLoad> kmsLoads = getKmsLoads().stream().filter(kmsLoad -> kmsLoad.kms.isKurentoClientConnected()
				&& mediaNodeStatusManager.isRunning(kmsLoad.kms.getId())).collect(Collectors.toList());
		if (kmsLoads.isEmpty()) {
			throw new NoSuchElementException();
		} else {
			return Collections.min(kmsLoads).kms;
		}
	}

	public synchronized boolean atLeastOneConnectedAndRunningKms() {
		Optional<Kms> optional = this.kmss.values().stream()
				.filter(kms -> kms.isKurentoClientConnected() && mediaNodeStatusManager.isRunning(kms.getId()))
				.findFirst();
		return optional.isPresent();
	}

	public synchronized List<KmsLoad> getKmssSortedByLoad() {
		List<KmsLoad> kmsLoads = getKmsLoads();
		Collections.sort(kmsLoads);
		return kmsLoads;
	}

	public Kms getKms(String kmsId) {
		return this.kmss.get(kmsId);
	}

	public Collection<Kms> getKmss() {
		return this.kmss.values();
	}

	public boolean kmsWithUriExists(String kmsUri) {
		return this.kmss.values().stream().anyMatch(kms -> kms.getUri().equals(kmsUri));
	}

	private List<KmsLoad> getKmsLoads() {
		ArrayList<KmsLoad> kmsLoads = new ArrayList<>();
		for (Kms kms : kmss.values()) {
			double load = kms.getLoad();
			kmsLoads.add(new KmsLoad(kms, load));
			log.trace("Calc load {} for kms {}", load, kms.getUri());
		}
		return kmsLoads;
	}

	protected KurentoConnectionListener generateKurentoConnectionListener(final String kmsId) {
		return new KurentoConnectionListener() {

			@Override
			public void reconnected(boolean sameServer) {

				final Kms kms = kmss.get(kmsId);

				log.info("Kurento Client \"reconnected\" event for KMS {} (sameServer: {}) [{}]", kms.getUri(),
						sameServer, kms.getKurentoClient().toString());

				kmsReconnectionLocks.putIfAbsent(kms.getId(), new ReentrantLock());
				boolean lockAcquired = false;
				try {
					if (kmsReconnectionLocks.get(kms.getId()).tryLock(5, TimeUnit.SECONDS)) {
						lockAcquired = true;
						if (kms.isKurentoClientConnected()) {
							// Timer task of disconnected event successfully executed
							log.warn(
									"Timer task already executed for reconnected Kurento Client [{}] to KMS with uri {}. Skipping event listener execution",
									kms.getKurentoClient().toString(), kms.getUri());
							return;
						}
						kms.setKurentoClientConnected(true);
						kms.setTimeOfKurentoClientConnection(System.currentTimeMillis());
						if (!sameServer) {
							// Different KMS. Reset sessions status (no Publisher or SUbscriber endpoints)
							log.warn("Kurento Client reconnected to a different KMS instance, with uri {}",
									kms.getUri());
							log.warn("Updating all webrtc endpoints for active sessions");
							final long timeOfKurentoDisconnection = kms.getTimeOfKurentoClientDisconnection();
							kms.getKurentoSessions().forEach(kSession -> {
								kSession.restartStatusInKurento(timeOfKurentoDisconnection);
							});
						} else {
							// Same KMS. We may infer that openvidu-server/KMS connection has been lost, but
							// not the clients/KMS connections
							log.warn("Kurento Client reconnected to same KMS {} with uri {}", kmsId, kms.getUri());
						}
						kms.setTimeOfKurentoClientDisconnection(0);
					}
				} catch (InterruptedException e) {
					log.error("InterruptedException when waiting for lock on reconnected event of KMS with uri {}",
							kms.getUri());
				} finally {
					if (lockAcquired) {
						kmsReconnectionLocks.get(kms.getId()).unlock();
					}
				}
			}

			@Override
			public void disconnected() {
				final Kms kms = kmss.get(kmsId);

				kms.setKurentoClientConnected(false);
				kms.setTimeOfKurentoClientDisconnection(System.currentTimeMillis());

				if (kms.getKurentoClient().isClosed()) {
					log.info("Kurento Client \"disconnected\" event for KMS {} [{}]. Closed explicitly", kms.getUri(),
							kms.getKurentoClient().toString());
					return;
				} else {
					log.info("Kurento Client \"disconnected\" event for KMS {} [{}]. Waiting reconnection",
							kms.getUri(), kms.getKurentoClient().toString());
				}

				// TODO: this is a fix for the lack of reconnected event
				kmsReconnectionLocks.putIfAbsent(kms.getId(), new ReentrantLock());
				final AtomicInteger ITERATION = new AtomicInteger(0);

				kurentoReconnectTimer = new UpdatableTimerTask(() -> {
					boolean lockAcquired = false;
					try {
						if (kmsReconnectionLocks.get(kms.getId()).tryLock(5, TimeUnit.SECONDS)) {
							lockAcquired = true;

							if (kms.isKurentoClientConnected()) {
								// reconnected listener already executed
								log.info(
										"Timer of KMS with uri {} and KurentoClient [{}] cancelled (reconnected event received during interval wait)",
										kms.getUri(), kms.getKurentoClient().toString());
								kurentoReconnectTimer.cancelTimer();
								return;
							}

							if (kms.getKurentoClient().isClosed()) {
								log.info(
										"Timer of KMS with uri {} and KurentoClient [{}] has been closed. Cancelling Timer",
										kms.getUri(), kms.getKurentoClient().toString());
								kurentoReconnectTimer.cancelTimer();
								return;
							}

							kms.getKurentoClient().getServerManager().getInfo();
							log.info("According to Timer KMS with uri {} and KurentoClient [{}] is now reconnected",
									kms.getUri(), kms.getKurentoClient().toString());
							kurentoReconnectTimer.cancelTimer();
							kms.setKurentoClientConnected(true);
							kms.setTimeOfKurentoClientConnection(System.currentTimeMillis());

							final long timeOfKurentoDisconnection = kms.getTimeOfKurentoClientDisconnection();

							if (kms.getKurentoSessions().isEmpty()) {
								log.info("There were no sessions in the KMS with uri {}. Nothing must be done",
										kms.getUri());
							} else {
								if (isNewKms(kms)) {
									log.warn("KMS with URI {} is a new KMS process. Resetting {} sessions: {}",
											kms.getUri(), kms.getKurentoSessions().size(),
											kms.getKurentoSessions().stream().map(s -> s.getSessionId())
													.collect(Collectors.joining(",", "[", "]")));
									kms.getKurentoSessions().forEach(kSession -> {
										kSession.restartStatusInKurento(timeOfKurentoDisconnection);
									});
								} else {
									log.info("KMS with URI {} is the same process. Nothing must be done", kms.getUri());
								}
							}

							kms.setTimeOfKurentoClientDisconnection(0);
						}
					} catch (Exception e) {
						log.error(
								"According to Timer KMS with uri {} and KurentoClient [{}] is not reconnected yet. Exception {}",
								kms.getUri(), kms.getKurentoClient().toString(), e.getClass().getName());
					} finally {
						if (lockAcquired) {
							kmsReconnectionLocks.get(kms.getId()).unlock();
						}
					}
				}, () -> Long.valueOf(dynamicReconnectLoopSeconds(ITERATION.getAndIncrement()) * 1000));

				kurentoReconnectTimer.updateTimer();
			}

			@Override
			public void connectionFailed() {
				final Kms kms = kmss.get(kmsId);
				log.error("Kurento Client \"connectionFailed\" event for KMS {} [{}]", kms.getUri(),
						kms.getKurentoClient().toString());
				kms.setKurentoClientConnected(false);
			}

			@Override
			public void connected() {
				final Kms kms = kmss.get(kmsId);
				log.info("Kurento Client \"connected\" event for KMS {} [{}]", kms.getUri(),
						kms.getKurentoClient().toString());
				// TODO: This should be done here, not after KurentoClient#create method returns
				// kms.setKurentoClientConnected(true);
				// kms.setTimeOfKurentoClientConnection(System.currentTimeMillis());
			}
		};
	}

	private boolean isNewKms(Kms kms) {
		try {
			KurentoSession kSession = kms.getKurentoSessions().iterator().next();
			kSession.getPipeline().getName();
			return false;
		} catch (NoSuchElementException e) {
			return false;
		} catch (Exception e) {
			return true;
		}
	}

	private int dynamicReconnectLoopSeconds(int iteration) {
		// First 10 loops every second, next 20 loops ever 3s, the rest every 10s
		final int[][] intervals = { new int[] { 1, 10 }, new int[] { 3, 20 }, new int[] { 10, Integer.MAX_VALUE } };

		int accumulatedIntervals = 0;
		for (int i = 0; i < intervals.length - 1; i++) {
			if ((accumulatedIntervals + intervals[i][1]) > iteration) {
				// Interval found for current iteration
				return intervals[i][0];
			} else {
				// This iteration has already been surpassed
				accumulatedIntervals += intervals[i][1];
			}
		}
		// Return last interval
		return intervals[intervals.length - 1][0];
	}

	public abstract List<Kms> initializeKurentoClients(List<KmsProperties> kmsProperties, boolean disconnectUponFailure)
			throws Exception;

	public abstract void incrementActiveRecordings(RecordingProperties recordingProperties, String recordingId,
			Session session);

	public abstract void decrementActiveRecordings(RecordingProperties recordingProperties, String recordingId,
			Session session);

	@PostConstruct
	protected abstract void postConstructInitKurentoClients();

	@PreDestroy
	public void close() {
		log.info("Closing all KurentoClients");
		this.kmss.values().forEach(kms -> {
			kms.getKurentoClient().destroy();
		});
		if (kurentoReconnectTimer != null) {
			kurentoReconnectTimer.cancelTimer();
		}
	}

	public static String generateKmsId() {
		return IdentifierPrefixes.KMS_ID + RandomStringUtils.randomAlphabetic(1).toUpperCase()
				+ RandomStringUtils.randomAlphanumeric(7);
	}

}
