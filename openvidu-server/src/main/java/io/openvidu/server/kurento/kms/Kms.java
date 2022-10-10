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

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Collection;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import org.kurento.client.KurentoClient;
import org.kurento.client.ModuleInfo;
import org.kurento.client.ServerInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.core.MediaServer;
import io.openvidu.server.kurento.core.KurentoSession;
import io.openvidu.server.utils.UpdatableTimerTask;

/**
 * Abstraction of a KMS instance: an object of this class corresponds to a KMS
 * process running somewhere.
 * 
 * It is uniquely identified by the KMS ws URI endpoint. It encapsulates the
 * WebSocket client to communicate openvidu-server Java process with it and has
 * a specific LoadManager service to calculate the load of this KMS based on
 * different measures
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public class Kms {

	private static final Logger log = LoggerFactory.getLogger(Kms.class);

	private String id; // Dynamic ID
	private String uri;
	private String ip;
	private String masterNodePrivateIp;
	private KurentoClient client;
	private MediaServer mediaServer;
	private UpdatableTimerTask clientReconnectTimer;
	private LoadManager loadManager;
	private KmsManager kmsManager;

	private boolean hasTriggeredNodeCrashedEvent = false;
	private AtomicBoolean isKurentoClientConnected = new AtomicBoolean(false);
	private AtomicLong timeOfKurentoClientConnection = new AtomicLong(0);
	private AtomicLong timeOfKurentoClientDisconnection = new AtomicLong(0);

	private Map<String, KurentoSession> kurentoSessions = new ConcurrentHashMap<>();
	private Map<String, String> activeRecordings = new ConcurrentHashMap<>();
	private AtomicLong activeComposedRecordings = new AtomicLong();

	public Kms(KmsProperties props, LoadManager loadManager, KmsManager kmsManager) {
		this.id = props.getId();
		this.uri = props.getUri();

		String parsedUri = uri.replaceAll("^ws://", "http://").replaceAll("^wss://", "https://");
		URL url = null;
		try {
			url = new URL(parsedUri);
		} catch (MalformedURLException e) {
			log.error(e.getMessage());
		}
		this.ip = url.getHost();

		this.loadManager = loadManager;
		this.kmsManager = kmsManager;
	}

	public KurentoClient getKurentoClient() {
		return this.client;
	}

	public void setKurentoClient(KurentoClient client) {
		this.client = client;
	}

	public UpdatableTimerTask getKurentoClientReconnectTimer() {
		return this.clientReconnectTimer;
	}

	public void setKurentoClientReconnectTimer(UpdatableTimerTask clientReconnectTimer) {
		this.clientReconnectTimer = clientReconnectTimer;
	}

	public String getId() {
		return id;
	}

	public String getUri() {
		return uri;
	}

	public String getIp() {
		return ip;
	}

	public String getMasterNodePrivateIp() {
		return masterNodePrivateIp;
	}

	public void setMasterNodePrivateIp(String masterNodePrivateIp) {
		this.masterNodePrivateIp = masterNodePrivateIp;
	}

	public double getLoad() {
		return loadManager.calculateLoad(this);
	}

	public boolean allowMoreElements() {
		return true; // loadManager.allowMoreElements(this);
	}

	public boolean hasTriggeredNodeCrashedEvent() {
		return this.hasTriggeredNodeCrashedEvent;
	}

	public void setHasTriggeredNodeCrashedEvent(boolean hasTriggeredNodeCrashedEvent) {
		this.hasTriggeredNodeCrashedEvent = hasTriggeredNodeCrashedEvent;
	}

	public boolean isKurentoClientConnected() {
		return this.isKurentoClientConnected.get();
	}

	public void setKurentoClientConnected(boolean isConnected, boolean nodeRecovered) {
		final long timestamp = System.currentTimeMillis();
		this.isKurentoClientConnected.set(isConnected);
		if (isConnected) {
			this.setTimeOfKurentoClientConnection(timestamp);
			this.setTimeOfKurentoClientDisconnection(0);
			this.setHasTriggeredNodeCrashedEvent(false);
			kmsManager.getMediaNodeManager().mediaNodeUsageRegistration(this, timestamp, kmsManager.getKmss(),
					nodeRecovered);
			if (this.mediaServer == null) {
				this.fetchMediaServerType();
			}
		} else {
			this.setTimeOfKurentoClientDisconnection(timestamp);
		}
	}

	public long getTimeOfKurentoClientConnection() {
		return this.timeOfKurentoClientConnection.get();
	}

	public void setTimeOfKurentoClientConnection(long time) {
		this.timeOfKurentoClientConnection.set(time);
	}

	public long getTimeOfKurentoClientDisconnection() {
		return this.timeOfKurentoClientDisconnection.get();
	}

	public void setTimeOfKurentoClientDisconnection(long time) {
		this.timeOfKurentoClientDisconnection.set(time);
	}

	public Collection<KurentoSession> getKurentoSessions() {
		return this.kurentoSessions.values();
	}

	public void addKurentoSession(KurentoSession session) {
		this.kurentoSessions.put(session.getSessionId(), session);
	}

	public void removeKurentoSession(String sessionId) {
		this.kurentoSessions.remove(sessionId);
	}

	public synchronized Set<Entry<String, String>> getActiveRecordings() {
		return this.activeRecordings.entrySet();
	}

	public synchronized void incrementActiveRecordings(String sessionId, String recordingId,
			RecordingProperties properties) {
		this.activeRecordings.put(recordingId, sessionId);
		if (RecordingProperties.IS_COMPOSED(properties.outputMode())) {
			this.activeComposedRecordings.incrementAndGet();
		}
	}

	public synchronized void decrementActiveRecordings(String recordingId, RecordingProperties properties) {
		this.activeRecordings.remove(recordingId);
		if (RecordingProperties.IS_COMPOSED(properties.outputMode())) {
			this.activeComposedRecordings.decrementAndGet();
		}
		kmsManager.getMediaNodeManager().dropIdleMediaNode(this.id);
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.id);
		json.addProperty("object", "mediaNode");
		json.addProperty("ip", this.ip);
		json.addProperty("uri", this.uri);
		final boolean connected = this.isKurentoClientConnected();
		json.addProperty("connected", connected);
		json.addProperty("connectionTime", this.getTimeOfKurentoClientConnection());
		if (!connected) {
			json.addProperty("disconnectionTime", this.getTimeOfKurentoClientDisconnection());
		}
		return json;
	}

	public JsonObject toJsonExtended(boolean withSessions, boolean withRecordings, boolean withExtraInfo) {

		JsonObject json = this.toJson();
		json.addProperty("mediaServer", this.mediaServer.name());

		if (withSessions) {
			JsonArray sessions = new JsonArray();
			for (KurentoSession session : this.kurentoSessions.values()) {
				sessions.add(session.toJson(false, false));
			}
			json.add("sessions", sessions);
		}

		if (withRecordings) {
			JsonArray activeRecordingsJson = new JsonArray();
			for (String recordingId : this.activeRecordings.keySet()) {
				activeRecordingsJson.add(recordingId);
			}
			json.add("recordingIds", activeRecordingsJson);
		}

		if (withExtraInfo) {

			if (json.get("connected").getAsBoolean()) {

				JsonObject kurentoExtraInfo = new JsonObject();

				try {
					if (MediaServer.kurento.equals(this.mediaServer)) {
						kurentoExtraInfo.addProperty("memory", this.client.getServerManager().getUsedMemory() / 1024);

						ServerInfo info = this.client.getServerManager().getInfo();
						kurentoExtraInfo.addProperty("version", info.getVersion());
						kurentoExtraInfo.addProperty("capabilities", info.getCapabilities().toString());

						JsonArray modules = new JsonArray();
						for (ModuleInfo moduleInfo : info.getModules()) {
							JsonObject moduleJson = new JsonObject();
							moduleJson.addProperty("name", moduleInfo.getName());
							moduleJson.addProperty("version", moduleInfo.getVersion());
							moduleJson.addProperty("generationTime", moduleInfo.getGenerationTime());
							JsonArray factories = new JsonArray();
							moduleInfo.getFactories().forEach(fact -> factories.add(fact));
							moduleJson.add("factories", factories);
							modules.add(moduleJson);
						}
						kurentoExtraInfo.add("modules", modules);

						json.add("kurentoInfo", kurentoExtraInfo);
					}
				} catch (Exception e) {
					log.warn("KMS {} extra info was requested but there's no connection to it", this.id);
				}
			}
		}

		return json;
	}

	@Override
	public String toString() {
		return this.uri;
	}

	public int getNumberOfConnections() {
		return this.kurentoSessions.values().stream().mapToInt(kSession -> kSession.getNumberOfConnections()).reduce(0,
				Integer::sum);
	}

	public int getNumberOfWebrtcConnections() {
		return this.kurentoSessions.values().stream().mapToInt(kSession -> kSession.getNumberOfWebrtcConnections())
				.reduce(0, Integer::sum);
	}

	public int getNumberOfRecordings() {
		return this.activeRecordings.size();
	}

	public int getNumberOfComposedRecordings() {
		return this.activeComposedRecordings.intValue();
	}

	public MediaServer getMediaServerType() {
		if (this.mediaServer == null) {
			this.fetchMediaServerType();
		}
		return this.mediaServer;
	}

	public MediaServer fetchMediaServerType() {
		ServerInfo serverInfo = this.client.getServerManager().getInfo();
		if (serverInfo.getVersion().startsWith("openvidu/mediasoup-controller")) {
			this.mediaServer = MediaServer.mediasoup;
		} else {
			this.mediaServer = MediaServer.kurento;
		}
		return this.mediaServer;
	}

}
