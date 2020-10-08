package io.openvidu.java.client;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class Token {

	private String token;
	private String connectionId;
	private TokenOptions tokenOptions;

	protected Token(String token, String connectionId, TokenOptions tokenOptions) {
		this.token = token;
		this.connectionId = connectionId;
		this.tokenOptions = tokenOptions;
	}

	protected Token(JsonObject json) {

		this.token = json.get("token").getAsString();
		this.connectionId = json.get("connectionId").getAsString();

		OpenViduRole role = OpenViduRole.valueOf(json.get("role").getAsString());
		String data = json.get("data").getAsString();
		Boolean record = json.get("record").getAsBoolean();

		KurentoOptions kurentoOptions = null;
		if (json.has("kurentoOptions")) {
			JsonObject kurentoOptionsJson = json.get("kurentoOptions").getAsJsonObject();

			Integer videoMaxRecvBandwidth = null;
			Integer videoMinRecvBandwidth = null;
			Integer videoMaxSendBandwidth = null;
			Integer videoMinSendBandwidth = null;
			String[] allowedFilters = null;

			if (kurentoOptionsJson.has("videoMaxRecvBandwidth")) {
				videoMaxRecvBandwidth = kurentoOptionsJson.get("videoMaxRecvBandwidth").getAsInt();
			}
			if (kurentoOptionsJson.has("videoMinRecvBandwidth")) {
				videoMinRecvBandwidth = kurentoOptionsJson.get("videoMinRecvBandwidth").getAsInt();
			}
			if (kurentoOptionsJson.has("videoMaxSendBandwidth")) {
				videoMaxSendBandwidth = kurentoOptionsJson.get("videoMaxSendBandwidth").getAsInt();
			}
			if (kurentoOptionsJson.has("videoMinSendBandwidth")) {
				videoMinSendBandwidth = kurentoOptionsJson.get("videoMinSendBandwidth").getAsInt();
			}
			if (kurentoOptionsJson.has("allowedFilters")) {
				JsonArray filters = kurentoOptionsJson.get("allowedFilters").getAsJsonArray();
				allowedFilters = new String[filters.size()];
				for (int i = 0; i < filters.size(); i++) {
					allowedFilters[i] = filters.get(i).getAsString();
				}
			}
			kurentoOptions = new KurentoOptions(videoMaxRecvBandwidth, videoMinRecvBandwidth, videoMaxSendBandwidth,
					videoMinSendBandwidth, allowedFilters);
		}

		this.tokenOptions = new TokenOptions(role, data, record, kurentoOptions);
	}

	/**
	 * Returns the token string value that must be sent to clients. They need to use
	 * it to connect to the session.
	 */
	public String getToken() {
		return this.token;
	}

	/**
	 * Returns the connection identifier that will be associated to the user
	 * consuming this token. This means that the future
	 * {@link io.openvidu.java.client.Connection Connection} object created with
	 * this token will have as <code>connectionId</code> this string. In other
	 * words, method {@link io.openvidu.java.client.Connection#getConnectionId()
	 * Connection.getConnectionId()} will return this same value.
	 * 
	 * With <code>connectionId</code> you can call the following methods without
	 * having to fetch and search for the actual
	 * {@link io.openvidu.java.client.Connection Connection} object:
	 * <ul>
	 * <li>Call {@link io.openvidu.java.client.Session#forceDisconnect(String)
	 * Session.forceDisconnect()} to invalidate the token if no client has used it
	 * yet or force the connected client to leave the session if it has.</li>
	 * <li>Call
	 * {@link io.openvidu.java.client.Session#updateConnection(String, TokenOptions)
	 * Session.updateConnection()} to update the
	 * {@link io.openvidu.java.client.Connection Connection} options. And this is
	 * valid for unused tokens, but also for already used tokens, so you can
	 * dynamically change the connection options on the fly.</li>
	 * </ul>
	 * 
	 */
	public String getConnectionId() {
		return this.connectionId;
	}

	/**
	 * Returns the role assigned to this token.
	 */
	public OpenViduRole getRole() {
		return this.tokenOptions.getRole();
	}

	/**
	 * Returns the secure (server-side) metadata assigned to this token.
	 */
	public String getData() {
		return this.tokenOptions.getData();
	}

	/**
	 * Whether the streams published by the participant owning this token will be
	 * recorded or not. This only affects <a href=
	 * "https://docs.openvidu.io/en/stable/advanced-features/recording#selecting-streams-to-be-recorded"
	 * target="_blank">INDIVIDUAL recording</a>.
	 */
	public Boolean record() {
		return this.tokenOptions.record();
	}

	protected void overrideTokenOptions(TokenOptions tokenOptions) {
		this.tokenOptions = tokenOptions;
	}

}
