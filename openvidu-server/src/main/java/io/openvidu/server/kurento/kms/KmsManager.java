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
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;

import org.apache.commons.lang3.RandomStringUtils;
import org.kurento.client.KurentoClient;
import org.kurento.commons.exception.KurentoException;
import org.kurento.jsonrpc.JsonRpcClientClosedException;
import org.kurento.jsonrpc.client.JsonRpcClientNettyWebSocket;
import org.kurento.jsonrpc.client.JsonRpcWSConnectionListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.IdentifierPrefixes;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.core.SessionManager;
import io.openvidu.server.kurento.core.KurentoSession;
import io.openvidu.server.utils.MediaNodeManager;
import io.openvidu.server.utils.RemoteOperationUtils;
import io.openvidu.server.utils.UpdatableTimerTask;

public abstract class KmsManager {

	protected static final Logger log = LoggerFactory.getLogger(KmsManager.class);

	public static final Lock selectAndRemoveKmsLock = new ReentrantLock(true);
	public static final int MAX_SECONDS_LOCK_WAIT = 15;

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

		public JsonObject toJsonExtended(boolean withSessions, boolean withRecordings, boolean withExtraInfo) {
			JsonObject json = this.kms.toJsonExtended(withSessions, withRecordings, withExtraInfo);
			json.addProperty("load", this.load);
			return json;
		}
	}

	@Autowired
	protected OpenviduConfig openviduConfig;

	@Autowired
	protected MediaNodeManager mediaNodeManager;

	@Autowired
	protected SessionEventsHandler sessionEventsHandler;

	final protected Map<String, Kms> kmss = new ConcurrentHashMap<>();

	protected SessionManager sessionManager;
	protected LoadManager loadManager;

	protected final int MAX_REQUEST_TIMEOUT = 10000;
	protected final int MAX_CONNECT_TIME_MILLIS = 3000;

	// Media Node reconnection cycle: 6 attempts, 2 times per second (3s total)
	final int INTERVAL_WAIT_MS = 500;
	final int RECONNECTION_LOOPS = MAX_CONNECT_TIME_MILLIS / INTERVAL_WAIT_MS;

	public KmsManager(SessionManager sessionManager, LoadManager loadManager) {
		this.sessionManager = sessionManager;
		this.loadManager = loadManager;
	}

	public synchronized void addKms(Kms kms) {
		this.kmss.put(kms.getId(), kms);
	}

	public synchronized Kms removeKms(String kmsId) {
		return this.kmss.remove(kmsId);
	}

	public synchronized Kms getLessLoadedConnectedAndRunningKms() throws NoSuchElementException {
		List<KmsLoad> kmsLoads = getKmsLoads().stream().filter(
				kmsLoad -> kmsLoad.kms.isKurentoClientConnected() && mediaNodeManager.isRunning(kmsLoad.kms.getId()))
				.collect(Collectors.toList());
		if (kmsLoads.isEmpty()) {
			throw new NoSuchElementException();
		} else {
			return Collections.min(kmsLoads).kms;
		}
	}

	public synchronized boolean atLeastOneConnectedAndRunningKms() {
		Optional<Kms> optional = this.kmss.values().stream()
				.filter(kms -> kms.isKurentoClientConnected() && mediaNodeManager.isRunning(kms.getId())).findFirst();
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

	public MediaNodeManager getMediaNodeManager() {
		return this.mediaNodeManager;
	}

	protected KurentoClient createKurentoClient(String kmsId, String uri) {
		JsonRpcWSConnectionListener listener = this.generateKurentoConnectionListener(kmsId);
		JsonRpcClientNettyWebSocket client = new JsonRpcClientNettyWebSocket(uri, listener);
		client.setTryReconnectingMaxTime(0);
		client.setTryReconnectingForever(false);
		client.setConnectionTimeout(MAX_CONNECT_TIME_MILLIS);
		client.setRequestTimeout(MAX_REQUEST_TIMEOUT);
		return KurentoClient.createFromJsonRpcClientHonoringClientTimeouts(client);
	}

	protected JsonRpcWSConnectionListener generateKurentoConnectionListener(final String kmsId) {

		return new JsonRpcWSConnectionListener() {

			@Override
			public void connected() {
				final Kms kms = kmss.get(kmsId);
				log.info("Kurento Client \"connected\" event for KMS {} [{}]", kms.getUri(),
						kms.getKurentoClient().toString());
				// TODO: This should be done here, not after KurentoClient#create method
				// returns, but it seems that this event is never triggered
				// kms.setKurentoClientConnected(true, false);
			}

			@Override
			public void connectionFailed() {
				final Kms kms = kmss.get(kmsId);
				log.error("Kurento Client \"connectionFailed\" event for KMS {} [{}]", kms.getUri(),
						kms.getKurentoClient().toString());
			}

			@Override
			public void reconnecting() {
				final Kms kms = kmss.get(kmsId);
				log.info("Kurento Client \"reconnecting\" event for KMS {} [{}]", kms.getUri(),
						kms.getKurentoClient().toString());
			}

			@Override
			public void reconnected(boolean sameServer) {
				final Kms kms = kmss.get(kmsId);
				log.info("Kurento Client \"reconnected\" event for KMS {} (sameServer: {}) [{}]", kms.getUri(),
						sameServer, kms.getKurentoClient().toString());
			}

			@Override
			public void disconnected() {

				final Kms kms = kmss.get(kmsId);

				if (kms.getKurentoClient().isDestroyed()) {
					log.info(
							"Kurento Client \"disconnected\" event for KMS {} [{}]. Closed explicitly by openvidu-server. No reconnection process",
							kms.getUri(), kms.getKurentoClient().toString());
					return;
				} else {
					log.info("Kurento Client \"disconnected\" event for KMS {} [{}]. Reconnecting", kms.getUri(),
							kms.getKurentoClient().toString());
				}

				kms.setKurentoClientConnected(false, false);

				disconnectionHandler(kms, 0);
			}

			private void disconnectionHandler(Kms kms, int reconnectionSecondsConsumed) {

				final AtomicInteger iteration = new AtomicInteger(RECONNECTION_LOOPS);
				final long initTime = System.currentTimeMillis();

				final int accumulatedTimeout = reconnectionSecondsConsumed + (MAX_CONNECT_TIME_MILLIS / 1000);

				final UpdatableTimerTask kurentoClientReconnectTimer = new UpdatableTimerTask(() -> {
					if (iteration.decrementAndGet() < 0) {

						kms.getKurentoClientReconnectTimer().cancelTimer();
						boolean mustRetryReconnection = accumulatedTimeout < openviduConfig
								.getAppliedReconnectionTimeout();
						boolean mustRemoveMediaNode = !mustRetryReconnection;

						if (!kms.hasTriggeredNodeCrashedEvent()) {

							log.error(
									"OpenVidu Server [{}] could not reconnect to Media Node {} with IP {} in {} seconds. Media Node crashed",
									kms.getKurentoClient().toString(), kms.getId(), kms.getIp(),
									(INTERVAL_WAIT_MS * RECONNECTION_LOOPS / 1000));
							nodeCrashedHandler(kms, mustRemoveMediaNode);
							mustRemoveMediaNode = false; // nodeCrashed handler will have taken care of it

						} else {

							log.error(
									"Retry error. OpenVidu Server [{}] could not connect to Media Node {} with IP {} in {} seconds",
									kms.getKurentoClient().toString(), kms.getId(), kms.getIp(),
									(INTERVAL_WAIT_MS * RECONNECTION_LOOPS / 1000));

						}

						if (mustRetryReconnection) {

							log.info("Retrying reconnection to Media Node {} with IP {}. {}", kms.getId(), kms.getIp(),
									openviduConfig.getReconnectionTimeout() == -1 ? "Infinite retry"
											: (accumulatedTimeout + " seconds consumed of a maximum of "
													+ openviduConfig.getReconnectionTimeout()));
							disconnectionHandler(kms, accumulatedTimeout);

						} else {

							log.warn(
									"Reconnection process to Media Node {} with IP {} aborted. {} seconds have been consumed and the upper limit is {} seconds",
									kms.getId(), kms.getIp(), accumulatedTimeout,
									openviduConfig.getReconnectionTimeout());
							if (mustRemoveMediaNode) {
								removeMediaNodeUponCrash(kms.getId());
							}

						}

					} else {

						if ((System.currentTimeMillis() - initTime) > MAX_CONNECT_TIME_MILLIS) {
							// KurentoClient connection timeout exceeds the limit. This prevents a
							// single reconnection attempt to exceed the total timeout limit if the
							// connection gets stuck
							iteration.set(0);
							return;
						}

						if (reconnectKurentoClient(kms)) {
							nodeRecoveredHandler(kms);
						} else {
							return;
						}

					}
				}, () -> Long.valueOf(INTERVAL_WAIT_MS)); // Try 2 times per second

				kms.setKurentoClientReconnectTimer(kurentoClientReconnectTimer);
				kurentoClientReconnectTimer.updateTimer();
			}

		};
	}

	private boolean reconnectKurentoClient(Kms kms) {
		try {
			kms.getKurentoClient().getServerManager().getInfo();
			return true;
		} catch (JsonRpcClientClosedException exception) {
			log.error(
					"According to Timer KurentoClient [{}] of KMS with uri {} is closed ({}). Initializing a new KurentoClient",
					kms.getKurentoClient().toString(), kms.getUri(), exception.getClass().getName());
			KurentoClient kClient = null;
			try {
				kClient = createKurentoClient(kms.getId(), kms.getUri());
			} catch (KurentoException e) {
				log.error("Error creating new KurentoClient when connectig to KMS with uri {}. Exception {}: {}",
						kms.getUri(), e.getClass().getName(), e.getMessage());
				if (kClient != null) {
					kClient.destroy();
				}
				return false;
			}
			try {
				kClient.getServerManager().getInfo();
				kms.setKurentoClient(kClient);
				log.info("Success reconnecting to KMS with uri {} with a new KurentoClient", kms.getUri());
				return true;
			} catch (Exception e) {
				log.error("Error reconnecting to KMS with uri {} with a new KurentoClient. Exception {}: {}",
						kms.getUri(), e.getClass().getName(), e.getMessage());
				if (kClient != null) {
					kClient.destroy();
				}
				return false;
			}
		} catch (Exception exception) {
			log.error("According to Timer KMS with uri {} and KurentoClient [{}] is not reconnected yet. Exception {}",
					kms.getUri(), kms.getKurentoClient().toString(), exception.getClass().getName());
			return false;
		}
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

	public abstract List<Kms> initializeKurentoClients(List<KmsProperties> kmsProperties, boolean disconnectUponFailure)
			throws Exception;

	public abstract void incrementActiveRecordings(RecordingProperties recordingProperties, String recordingId,
			Session session);

	public abstract void decrementActiveRecordings(RecordingProperties recordingProperties, String recordingId,
			Session session);

	public abstract void removeMediaNodeUponCrash(String mediaNodeId);

	protected abstract String getEnvironmentId(String mediaNodeId);

	@PostConstruct
	protected abstract void postConstructInitKurentoClients();

	public void closeAllKurentoClients() {
		log.info("Closing all KurentoClients");
		this.kmss.values().forEach(kms -> {
			if (kms.getKurentoClientReconnectTimer() != null) {
				kms.getKurentoClientReconnectTimer().cancelTimer();
			}
			kms.getKurentoClient().destroy();
		});
	}

	public static String generateKmsId() {
		return IdentifierPrefixes.MEDIA_NODE_ID + RandomStringUtils.randomAlphabetic(1).toUpperCase()
				+ RandomStringUtils.randomAlphanumeric(7);
	}

	public void nodeCrashedHandler(Kms kms, boolean mustRemoveMediaNode) {

		kms.setHasTriggeredNodeCrashedEvent(true);

		final long timeOfKurentoDisconnection = kms.getTimeOfKurentoClientDisconnection();
		final List<String> affectedSessionIds = kms.getKurentoSessions().stream().map(session -> session.getSessionId())
				.collect(Collectors.toUnmodifiableList());
		final List<String> affectedRecordingIds = kms.getActiveRecordings().stream().map(entry -> entry.getKey())
				.collect(Collectors.toUnmodifiableList());

		// 1. Send nodeCrashed webhook event
		String environmentId = getEnvironmentId(kms.getId());
		sessionEventsHandler.onMediaNodeCrashed(kms, environmentId, timeOfKurentoDisconnection, affectedSessionIds,
				affectedRecordingIds);

		// 2. Remove Media Node from cluster if necessary
		if (mustRemoveMediaNode) {
			removeMediaNodeUponCrash(kms.getId());
		}

		// 3. Close all sessions and recordings with reason "nodeCrashed"
		log.warn("Closing {} sessions hosted by Media Node {} with IP {}: {}", kms.getKurentoSessions().size(),
				kms.getId(), kms.getIp(), kms.getKurentoSessions().stream().map(s -> s.getSessionId())
						.collect(Collectors.joining(",", "[", "]")));
		try {
			// Flag the thread to skip remote operations to KMS
			RemoteOperationUtils.setToSkipRemoteOperations();
			sessionManager.closeAllSessionsAndRecordingsOfKms(kms, EndReason.nodeCrashed);
		} finally {
			RemoteOperationUtils.revertToRunRemoteOperations();
		}
	}

	public void nodeRecoveredHandler(Kms kms) {

		final boolean mustTriggerNodeRecoveredEvent = kms.hasTriggeredNodeCrashedEvent();
		final long timeOfKurentoDisconnection = kms.getTimeOfKurentoClientDisconnection();

		log.info("According to Timer KMS with uri {} and KurentoClient [{}] is now reconnected after {} ms",
				kms.getUri(), kms.getKurentoClient().toString(),
				(System.currentTimeMillis() - timeOfKurentoDisconnection));

		kms.getKurentoClientReconnectTimer().cancelTimer();

		kms.setKurentoClientConnected(true, true);

		if (kms.getKurentoSessions().isEmpty()) {
			log.info("There were no sessions in the KMS with uri {}. Nothing must be done", kms.getUri());
		} else {
			if (isNewKms(kms)) {
				log.warn("KMS with URI {} is a new KMS process. Resetting {} sessions: {}", kms.getUri(),
						kms.getKurentoSessions().size(), kms.getKurentoSessions().stream().map(s -> s.getSessionId())
								.collect(Collectors.joining(",", "[", "]")));
				kms.getKurentoSessions().forEach(kSession -> {
					kSession.restartStatusInKurentoAfterReconnectionToNewKms(timeOfKurentoDisconnection);
				});
			} else {
				log.info("KMS with URI {} is the same process. Nothing must be done", kms.getUri());
			}
		}

		if (mustTriggerNodeRecoveredEvent) {
			// Send nodeRecovered webhook event
			String environmentId = getEnvironmentId(kms.getId());
			long timeOfConnection = kms.getTimeOfKurentoClientConnection();
			sessionEventsHandler.onMediaNodeRecovered(kms, environmentId, timeOfConnection);
		}
	}

}
