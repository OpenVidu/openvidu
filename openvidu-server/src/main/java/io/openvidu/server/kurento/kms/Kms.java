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

import com.google.gson.JsonObject;

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

	private String kmsUri;
	private KurentoClient client;
	private LoadManager loadManager;

	private AtomicBoolean isKurentoClientConnected = new AtomicBoolean(false);
	private AtomicLong timeOfKurentoClientDisconnection = new AtomicLong(0);

	public Kms(String kmsUri, KurentoClient client, LoadManager loadManager) {
		this.kmsUri = kmsUri;
		this.client = client;
		this.loadManager = loadManager;
	}

	public String getUri() {
		return kmsUri;
	}

	public KurentoClient getKurentoClient() {
		return this.client;
	}

	public double getLoad() {
		return loadManager.calculateLoad(this);
	}

	public boolean allowMoreElements() {
		return loadManager.allowMoreElements(this);
	}

	public boolean isKurentoClientConnected() {
		return this.isKurentoClientConnected.get();
	}

	public void setKurentoClientConnected(boolean isConnected) {
		this.isKurentoClientConnected.set(isConnected);
	}

	public long getTimeOfKurentoClientDisconnection() {
		return this.timeOfKurentoClientDisconnection.get();
	}

	public void setTimeOfKurentoClientDisconnection(long time) {
		this.timeOfKurentoClientDisconnection.set(time);
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		json.addProperty("id", this.kmsUri);
		json.addProperty("uri", this.kmsUri);
		// json.addProperty("createdAt", this.client.getServerManager().getInfo().getVersion());
		return json;
	}

}
