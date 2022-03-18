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

package io.openvidu.java.client;

import java.util.Arrays;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * See {@link io.openvidu.java.client.TokenOptions#getKurentoOptions()}
 */
public class KurentoOptions {

	private Integer videoMaxRecvBandwidth;
	private Integer videoMinRecvBandwidth;
	private Integer videoMaxSendBandwidth;
	private Integer videoMinSendBandwidth;
	private String[] allowedFilters;

	/**
	 *
	 * Builder for {@link io.openvidu.java.client.KurentoOptions}
	 *
	 */
	public static class Builder {

		private Integer videoMaxRecvBandwidth;
		private Integer videoMinRecvBandwidth;
		private Integer videoMaxSendBandwidth;
		private Integer videoMinSendBandwidth;
		private String[] allowedFilters = {};

		/**
		 * Builder for {@link io.openvidu.java.client.KurentoOptions}
		 */
		public KurentoOptions build() {
			return new KurentoOptions(this.videoMaxRecvBandwidth, this.videoMinRecvBandwidth,
					this.videoMaxSendBandwidth, this.videoMinSendBandwidth, this.allowedFilters);
		}

		/**
		 * Set value for
		 * {@link io.openvidu.java.client.KurentoOptions#getVideoMaxRecvBandwidth()}
		 */
		public Builder videoMaxRecvBandwidth(int videoMaxRecvBandwidth) {
			this.videoMaxRecvBandwidth = videoMaxRecvBandwidth;
			return this;
		}

		/**
		 * Set value for
		 * {@link io.openvidu.java.client.KurentoOptions#getVideoMinRecvBandwidth()}
		 */
		public Builder videoMinRecvBandwidth(int videoMinRecvBandwidth) {
			this.videoMinRecvBandwidth = videoMinRecvBandwidth;
			return this;
		}

		/**
		 * Set value for
		 * {@link io.openvidu.java.client.KurentoOptions#getVideoMaxSendBandwidth()}
		 */
		public Builder videoMaxSendBandwidth(int videoMaxSendBandwidth) {
			this.videoMaxSendBandwidth = videoMaxSendBandwidth;
			return this;
		}

		/**
		 * Set value for
		 * {@link io.openvidu.java.client.KurentoOptions#getVideoMinSendBandwidth()}
		 */
		public Builder videoMinSendBandwidth(int videoMinSendBandwidth) {
			this.videoMinSendBandwidth = videoMinSendBandwidth;
			return this;
		}

		/**
		 * Set value for
		 * {@link io.openvidu.java.client.KurentoOptions#getAllowedFilters()}
		 */
		public Builder allowedFilters(String[] allowedFilters) {
			this.allowedFilters = allowedFilters;
			return this;
		}
	}

	public KurentoOptions(Integer videoMaxRecvBandwidth, Integer videoMinRecvBandwidth, Integer videoMaxSendBandwidth,
			Integer videoMinSendBandwidth, String[] allowedFilters) {
		this.videoMaxRecvBandwidth = videoMaxRecvBandwidth;
		this.videoMinRecvBandwidth = videoMinRecvBandwidth;
		this.videoMaxSendBandwidth = videoMaxSendBandwidth;
		this.videoMinSendBandwidth = videoMinSendBandwidth;
		this.allowedFilters = allowedFilters;
	}

	/**
	 * Defines the maximum number of Kbps that the Connection will be able to
	 * receive from Kurento Media Server per media stream. 0 means unconstrained.
	 * Giving a value to this property will override the global configuration set in
	 * <a href="https://docs.openvidu.io/en/stable/reference-docs/openvidu-config/">
	 *   OpenVidu Server configuration
	 * </a> (parameter
	 * <code>OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH</code>) for every incoming
	 * stream of the user owning the token. <br>
	 * <strong>WARNING</strong>: the lower value set to this property limits every
	 * other bandwidth of the WebRTC pipeline this server-to-client stream belongs
	 * to. This includes the user publishing the stream and every other user
	 * subscribed to the stream
	 */
	public Integer getVideoMaxRecvBandwidth() {
		return videoMaxRecvBandwidth;
	}

	/**
	 * Defines the minimum number of Kbps that the Connection will try to receive
	 * from Kurento Media Server per media stream. 0 means unconstrained. Giving a
	 * value to this property will override the global configuration set in
	 * <a href= "https://docs.openvidu.io/en/stable/reference-docs/openvidu-config/">
	 *   OpenVidu Server configuration
	 * </a> (parameter
	 * <code>OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH</code>) for every incoming
	 * stream of the user owning the token.
	 */
	public Integer getVideoMinRecvBandwidth() {
		return videoMinRecvBandwidth;
	}

	/**
	 * Defines the maximum number of Kbps that the Connection will be able to send
	 * to Kurento Media Server per media stream. 0 means unconstrained. Giving a
	 * value to this property will override the global configuration set in
	 * <a href= "https://docs.openvidu.io/en/stable/reference-docs/openvidu-config/">
	 *   OpenVidu Server configuration
	 * </a> (parameter
	 * <code>OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH</code>) for every outgoing
	 * stream of the user owning the token. <br>
	 * <strong>WARNING</strong>: this value limits every other bandwidth of the
	 * WebRTC pipeline this client-to-server stream belongs to. This includes every
	 * other user subscribed to the stream
	 */
	public Integer getVideoMaxSendBandwidth() {
		return videoMaxSendBandwidth;
	}

	/**
	 * Defines the minimum number of Kbps that the Connection will try to send to
	 * Kurento Media Server per media stream. 0 means unconstrained. Giving a value
	 * to this property will override the global configuration set in
	 * <a href= "https://docs.openvidu.io/en/stable/reference-docs/openvidu-config/">
	 *   OpenVidu Server configuration
	 * </a> (parameter
	 * <code>OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH</code>) for every outgoing
	 * stream of the user owning the token.
	 */
	public Integer getVideoMinSendBandwidth() {
		return videoMinSendBandwidth;
	}

	/**
	 * Defines the names of the filters the Connection will be able to apply to its
	 * published streams. See
	 * <a href="https://docs.openvidu.io/en/stable/advanced-features/filters/">
	 *   Voice and video filters
	 * </a>.
	 */
	public String[] getAllowedFilters() {
		return allowedFilters;
	}

	/**
	 * See if the Connection can apply certain filter. See
	 * <a href="https://docs.openvidu.io/en/stable/advanced-features/filters/">
	 *   Voice and video filters
	 * </a>.
	 */
	public boolean isFilterAllowed(String filterType) {
		if (filterType == null) {
			return false;
		}
		return Arrays.stream(allowedFilters).anyMatch(filterType::equals);
	}

	public JsonObject toJson() {
		JsonObject json = new JsonObject();
		if (this.getVideoMaxRecvBandwidth() != null) {
			json.addProperty("videoMaxRecvBandwidth", this.getVideoMaxRecvBandwidth());
		}
		if (this.getVideoMinRecvBandwidth() != null) {
			json.addProperty("videoMinRecvBandwidth", this.getVideoMinRecvBandwidth());
		}
		if (this.getVideoMaxSendBandwidth() != null) {
			json.addProperty("videoMaxSendBandwidth", this.getVideoMaxSendBandwidth());
		}
		if (this.getVideoMinSendBandwidth() != null) {
			json.addProperty("videoMinSendBandwidth", this.getVideoMinSendBandwidth());
		}
		if (this.getAllowedFilters().length > 0) {
			JsonArray filtersJson = new JsonArray();
			String[] filters = this.getAllowedFilters();
			for (String filter : filters) {
				filtersJson.add(filter);
			}
			json.add("allowedFilters", filtersJson);
		}
		return json;
	}

}
