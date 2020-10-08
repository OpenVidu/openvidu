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

package io.openvidu.java.client;

import com.google.gson.JsonArray;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;

/**
 * See {@link io.openvidu.java.client.Session#generateToken(TokenOptions)}
 */
public class TokenOptions {

	private OpenViduRole role;
	private String data;
	private Boolean record;
	private KurentoOptions kurentoOptions;

	/**
	 * 
	 * Builder for {@link io.openvidu.java.client.TokenOptions}
	 *
	 */
	public static class Builder {

		private OpenViduRole role = OpenViduRole.PUBLISHER;
		private String data;
		private Boolean record = true;
		private KurentoOptions kurentoOptions;

		/**
		 * Builder for {@link io.openvidu.java.client.TokenOptions}.
		 */
		public TokenOptions build() {
			return new TokenOptions(this.role, this.data, this.record, this.kurentoOptions);
		}

		/**
		 * Call this method to set the role assigned to this token.
		 */
		public Builder role(OpenViduRole role) {
			this.role = role;
			return this;
		}

		/**
		 * Call this method to set the secure (server-side) data associated to this
		 * token. Every client will receive this data in property
		 * <code>Connection.data</code>. Object <code>Connection</code> can be retrieved
		 * by subscribing to event <code>connectionCreated</code> of Session object in
		 * your clients.
		 * <ul>
		 * <li>If you have provided no data in your clients when calling method
		 * <code>Session.connect(TOKEN, DATA)</code> (<code>DATA</code> not defined),
		 * then <code>Connection.data</code> will only have this
		 * {@link io.openvidu.java.client.TokenOptions.Builder#data(String)}
		 * property.</li>
		 * <li>If you have provided some data when calling
		 * <code>Session.connect(TOKEN, DATA)</code> (<code>DATA</code> defined), then
		 * <code>Connection.data</code> will have the following structure:
		 * <code>&quot;CLIENT_DATA%/%SERVER_DATA&quot;</code>, being
		 * <code>CLIENT_DATA</code> the second parameter passed in OpenVidu Browser in
		 * method <code>Session.connect</code> and <code>SERVER_DATA</code> this
		 * {@link io.openvidu.java.client.TokenOptions.Builder#data(String)}
		 * property.</li>
		 * </ul>
		 */
		public Builder data(String data) {
			this.data = data;
			return this;
		}

		/**
		 * Call this method to flag the streams published by the participant owning this
		 * token to be recorded or not. This only affects <a href=
		 * "https://docs.openvidu.io/en/stable/advanced-features/recording#selecting-streams-to-be-recorded"
		 * target="_blank">INDIVIDUAL recording</a>. If not set by default will be true.
		 */
		public Builder record(boolean record) {
			this.record = record;
			return this;
		}

		/**
		 * Call this method to set a {@link io.openvidu.java.client.KurentoOptions}
		 * object for this token.
		 */
		public Builder kurentoOptions(KurentoOptions kurentoOptions) {
			this.kurentoOptions = kurentoOptions;
			return this;
		}

	}

	TokenOptions(OpenViduRole role, String data, Boolean record, KurentoOptions kurentoOptions) {
		this.role = role;
		this.data = data;
		this.record = record;
		this.kurentoOptions = kurentoOptions;
	}

	/**
	 * Returns the role assigned to this token.
	 */
	public OpenViduRole getRole() {
		return this.role;
	}

	/**
	 * Returns the secure (server-side) metadata assigned to this token.
	 */
	public String getData() {
		return this.data;
	}

	/**
	 * Whether the streams published by the participant owning this token will be
	 * recorded or not. This only affects <a href=
	 * "https://docs.openvidu.io/en/stable/advanced-features/recording#selecting-streams-to-be-recorded"
	 * target="_blank">INDIVIDUAL recording</a>.
	 */
	public Boolean record() {
		return this.record;
	}

	protected JsonObject toJsonObject(String sessionId) {
		JsonObject json = new JsonObject();
		json.addProperty("session", sessionId);
		if (getRole() != null) {
			json.addProperty("role", getRole().name());
		} else {
			json.add("role", JsonNull.INSTANCE);
		}
		if (getData() != null) {
			json.addProperty("data", getData());
		} else {
			json.add("data", JsonNull.INSTANCE);
		}
		if (record() != null) {
			json.addProperty("record", record());
		} else {
			json.add("record", JsonNull.INSTANCE);
		}
		if (this.kurentoOptions != null) {
			JsonObject kurentoOptions = new JsonObject();
			if (this.kurentoOptions.getVideoMaxRecvBandwidth() != null) {
				kurentoOptions.addProperty("videoMaxRecvBandwidth", this.kurentoOptions.getVideoMaxRecvBandwidth());
			}
			if (this.kurentoOptions.getVideoMinRecvBandwidth() != null) {
				kurentoOptions.addProperty("videoMinRecvBandwidth", this.kurentoOptions.getVideoMinRecvBandwidth());
			}
			if (this.kurentoOptions.getVideoMaxSendBandwidth() != null) {
				kurentoOptions.addProperty("videoMaxSendBandwidth", this.kurentoOptions.getVideoMaxSendBandwidth());
			}
			if (this.kurentoOptions.getVideoMinSendBandwidth() != null) {
				kurentoOptions.addProperty("videoMinSendBandwidth", this.kurentoOptions.getVideoMinSendBandwidth());
			}
			if (this.kurentoOptions.getAllowedFilters().length > 0) {
				JsonArray allowedFilters = new JsonArray();
				for (String filter : this.kurentoOptions.getAllowedFilters()) {
					allowedFilters.add(filter);
				}
				kurentoOptions.add("allowedFilters", allowedFilters);
			}
			json.add("kurentoOptions", kurentoOptions);
		}
		return json;
	}

}
