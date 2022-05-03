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

package io.openvidu.server.kurento.endpoint;

import java.util.Map.Entry;

import org.kurento.client.MediaPipeline;
import org.kurento.client.OfferOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.server.cdr.WebrtcDebugEvent.WebrtcDebugEventOperation;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.kurento.core.KurentoParticipant;

/**
 * Subscriber aspect of the {@link MediaEndpoint}.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class SubscriberEndpoint extends MediaEndpoint {

	private final static Logger log = LoggerFactory.getLogger(SubscriberEndpoint.class);

	private String publisherStreamId;

	public SubscriberEndpoint(EndpointType endpointType, KurentoParticipant owner, String endpointName,
			MediaPipeline pipeline, OpenviduConfig openviduConfig) {
		super(endpointType, owner, endpointName, pipeline, openviduConfig, log);
	}

	public synchronized String prepareSubscription(PublisherEndpoint publisher) {
		registerIceCandidateFoundEventListener(publisher.getOwner().getParticipantPublicId());
		publisher.connect(this.getEndpoint(), true);
		this.createdAt = System.currentTimeMillis();
		this.publisherStreamId = publisher.getStreamId();

		OfferOptions offerOptions = new OfferOptions();
		offerOptions.setOfferToReceiveAudio(publisher.getMediaOptions().hasAudio());
		offerOptions.setOfferToReceiveVideo(publisher.getMediaOptions().hasVideo());
		String sdpOffer = generateOffer(offerOptions);

		gatherCandidates();
		return sdpOffer;
	}

	public synchronized String subscribe(String sdpString, PublisherEndpoint publisher) {
		if (this.publisherStreamId == null) {
			// Client initiated negotiation
			registerIceCandidateFoundEventListener(publisher.getOwner().getParticipantPublicId());
			this.createdAt = System.currentTimeMillis();
			String realSdpAnswer = processOffer(sdpString);
			gatherCandidates();
			publisher.connect(this.getEndpoint(), false);
			this.publisherStreamId = publisher.getStreamId();
			return realSdpAnswer;
		} else {
			// Server initiated negotiation
			return processAnswer(sdpString);
		}
	}

	@Override
	public JsonObject toJson() {
		JsonObject json = super.toJson();
		try {
			json.addProperty("streamId", this.publisherStreamId);
		} catch (NullPointerException ex) {
			json.addProperty("streamId", "NOT_FOUND");
		}
		return json;
	}

	@Override
	public JsonObject withStatsToJson() {
		JsonObject json = super.withStatsToJson();
		JsonObject toJson = this.toJson();
		for (Entry<String, JsonElement> entry : toJson.entrySet()) {
			json.add(entry.getKey(), entry.getValue());
		}
		return json;
	}

	@Override
	protected WebrtcDebugEventOperation getWebrtcDebugOperation() {
		return WebrtcDebugEventOperation.subscribe;
	}

}
