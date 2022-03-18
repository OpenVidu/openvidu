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
package io.openvidu.server.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.server.core.Participant;

public class SDPMunging {

	private static final Logger log = LoggerFactory.getLogger(SDPMunging.class);

	private Set<VideoCodec> supportedVideoCodecs = new HashSet<>(Arrays.asList(VideoCodec.VP8, VideoCodec.VP9, VideoCodec.H264));

	private final String PT_PATTERN = "a=rtpmap:(\\d+) %s/90000";
	private final String EXTRA_PT_PATTERN = "a=fmtp:(\\d+) apt=%s";
	private final List<String> PATTERNS = Collections.unmodifiableList(
			Arrays.asList("^a=extmap:%s .+$", "^a=rtpmap:%s .+$", "^a=fmtp:%s .+$", "^a=rtcp-fb:%s .+$"));

	/**
	 * `codec` is an uppercase SDP-style codec name: "VP8", "VP9", "H264".
	 *
	 * This looks for all video m-sections (lines starting with "m=video"), then
	 * searches all of its related PayloadTypes trying to find those which
	 * correspond to the preferred codec. If any is found, they are moved to the
	 * front of the PayloadTypes list in the m= line, without removing the other
	 * codecs that might be present.
	 *
	 * If our preferred codec is not found, the m= line is left without changes.
	 *
	 * This works based on the basis that RFC 3264 "Offer/Answer Model SDP" section
	 * 6.1 "Unicast Streams" allows the answerer to list media formats in a
	 * different order of preference from what it got in the offer:
	 *
	 * > Although the answerer MAY list the formats in their desired order of >
	 * preference, it is RECOMMENDED that unless there is a specific reason, > the
	 * answerer list formats in the same relative order they were > present in the
	 * offer.
	 *
	 * Here we have a specific reason, thus we use this allowance to change the
	 * ordering of formats. Browsers (tested with Chrome 84) honor this change and
	 * use the first codec provided in the answer, so this operation actually works.
	 */
	public String setCodecPreference(VideoCodec codec, String sdp) throws OpenViduException {
		String codecStr = codec.name();
		log.info("[setCodecPreference] codec: {}", codecStr);

		List<String> usedCodecPts = new ArrayList<String>();
		List<String> unusedCodecPts = new ArrayList<String>();
		String[] lines = sdp.split("\\R+");
		Pattern ptRegex = Pattern.compile(String.format(PT_PATTERN, codecStr));

		for (int sl = 0; sl < lines.length; sl++) {
			String sdpLine = lines[sl];

			if (!sdpLine.startsWith("m=video")) {
				continue;
			}

			// m-section found. Prepare an array to store PayloadTypes
			usedCodecPts.clear();

			// Search the m-section to find our codec's PayloadType, if any
			for (int ml = sl + 1; ml < lines.length; ml++) {
				String mediaLine = lines[ml];

				// Abort if we reach the next m-section.
				if (mediaLine.startsWith("m=")) {
					break;
				}

				Matcher ptMatch = ptRegex.matcher(mediaLine);
				if (ptMatch.find()) {
					// PayloadType found
					String pt = ptMatch.group(1);
					usedCodecPts.add(pt);

					// Search the m-section to find the APT subtype, if any
					Pattern aptRegex = Pattern.compile(String.format(EXTRA_PT_PATTERN, pt));

					for (int al = sl + 1; al < lines.length; al++) {
						String aptLine = lines[al];

						// Abort if we reach the next m-section
						if (aptLine.startsWith("m=")) {
							break;
						}

						Matcher aptMatch = aptRegex.matcher(aptLine);
						if (aptMatch.find()) {
							// APT found
							String apt = aptMatch.group(1);
							usedCodecPts.add(apt);
						}
					}
				}
			}

			if (usedCodecPts.isEmpty()) {
				throw new OpenViduException(Code.FORCED_CODEC_NOT_FOUND_IN_SDPOFFER,
						"The specified forced codec " + codecStr + " is not present in the SDP");
			}

			// Build a new m= line where any PayloadTypes found have been moved
			// to the front of the PT list
			StringBuilder newLine = new StringBuilder(sdpLine.length());
			List<String> lineParts = new ArrayList<String>(Arrays.asList(sdpLine.split(" ")));

			if (lineParts.size() < 4) {
				log.error("[setCodecPreference] BUG in m= line: Expects at least 4 fields: '{}'", sdpLine);
				continue;
			}

			// Add "m=video", Port, and Protocol
			for (int i = 0; i < 3; i++) {
				newLine.append(lineParts.remove(0) + " ");
			}

			// Add the PayloadTypes that correspond to our preferred codec
			for (String pt : usedCodecPts) {
				lineParts.remove(pt);
				newLine.append(pt + " ");
			}

			// Collect all codecs to remove
			unusedCodecPts.addAll(lineParts);

			// Replace the original m= line with the one we just built
			lines[sl] = newLine.toString().trim();
		}

		lines = cleanLinesWithRemovedCodecs(unusedCodecPts, lines);

		return String.join("\r\n", lines) + "\r\n";
	}

	/**
	 * Return a SDP modified to force a specific codec
	 */
	public String forceCodec(String sdp, Participant participant, boolean isPublisher, boolean isReconnecting,
			boolean isTranscodingAllowed, VideoCodec forcedVideoCodec) throws OpenViduException {
		try {
			if (supportedVideoCodecs.contains(forcedVideoCodec)) {
				String mungedSdpOffer;

				log.debug(
						"PARTICIPANT '{}' in Session '{}'. Is Publisher: '{}'. Is Subscriber: '{}'. Is Reconnecting '{}'."
								+ " SDP before munging: \n {}",
						participant.getParticipantPublicId(), participant.getSessionId(), isPublisher, !isPublisher,
						isReconnecting, sdp);

				mungedSdpOffer = this.setCodecPreference(forcedVideoCodec, sdp);

				log.debug(
						"PARTICIPANT '{}' in Session '{}'. Is Publisher: '{}'. Is Subscriber: '{}'."
								+ " Is Reconnecting '{}'." + " SDP after munging: \n {}",
						participant.getParticipantPublicId(), participant.getSessionId(), isPublisher, !isPublisher,
						isReconnecting, mungedSdpOffer);

				return mungedSdpOffer;
			} else {
				throw new OpenViduException(Code.FORCED_CODEC_NOT_FOUND_IN_SDPOFFER,
						"Codec not supported by Media Server: " + forcedVideoCodec);
			}

		} catch (OpenViduException e) {

			String errorMessage = "Error forcing codec: '" + forcedVideoCodec + "', for PARTICIPANT: '"
					+ participant.getParticipantPublicId() + "' in Session: '" + participant.getSessionId()
					+ "'. Is publishing: '" + isPublisher + "'. Is Subscriber: '" + !isPublisher
					+ "'. Is Reconnecting: '" + isReconnecting + "'.\nException: " + e.getMessage() + "\nSDP:\n" + sdp;

			if (!isTranscodingAllowed) {
				throw new OpenViduException(Code.FORCED_CODEC_NOT_FOUND_IN_SDPOFFER, errorMessage);
			}

			log.info(
					"Codec: '{}' is not supported for PARTICIPANT: '{}' in Session: '{}'. Is publishing: '{}'. "
							+ "Is Subscriber: '{}'. Is Reconnecting: '{}'." + " Transcoding will be allowed",
					forcedVideoCodec, participant.getParticipantPublicId(), participant.getSessionId(), isPublisher,
					!isPublisher, isReconnecting);

			return sdp;
		}
	}

	private String[] cleanLinesWithRemovedCodecs(List<String> removedCodecs, String[] lines) {
		List<String> listOfLines = new ArrayList<>(Arrays.asList(lines));
		removedCodecs.forEach(unusedPt -> {
			for (String pattern : PATTERNS) {
				listOfLines.removeIf(Pattern.compile(String.format(pattern, unusedPt)).asPredicate());
			}
		});
		lines = listOfLines.toArray(new String[0]);
		return lines;
	}

}
