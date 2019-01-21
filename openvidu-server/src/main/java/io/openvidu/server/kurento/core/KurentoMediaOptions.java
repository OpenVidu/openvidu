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

package io.openvidu.server.kurento.core;

import org.kurento.client.MediaElement;
import org.kurento.client.MediaType;

import io.openvidu.server.core.MediaOptions;
import io.openvidu.server.kurento.KurentoFilter;

public class KurentoMediaOptions extends MediaOptions {

	public boolean isOffer;
	public String sdpOffer;
	public boolean doLoopback;
	public MediaElement loopbackAlternativeSrc;
	public MediaType loopbackConnectionType;
	public MediaElement[] mediaElements;

	public KurentoMediaOptions(boolean isOffer, String sdpOffer, MediaElement loopbackAlternativeSrc,
			MediaType loopbackConnectionType, Boolean hasAudio, Boolean hasVideo, Boolean audioActive,
			Boolean videoActive, String typeOfVideo, Integer frameRate, String videoDimensions, KurentoFilter filter,
			boolean doLoopback, MediaElement... mediaElements) {
		super(hasAudio, hasVideo, audioActive, videoActive, typeOfVideo, frameRate, videoDimensions, filter);
		this.isOffer = isOffer;
		this.sdpOffer = sdpOffer;
		this.loopbackAlternativeSrc = loopbackAlternativeSrc;
		this.loopbackConnectionType = loopbackConnectionType;
		this.doLoopback = doLoopback;
		this.mediaElements = mediaElements;
	}

}
