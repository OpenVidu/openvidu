package io.openvidu.server.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.VideoCodec;

public class SDPMunging {
    
    private static final Logger log = LoggerFactory.getLogger(SDPMunging.class);

    /**
    * `codec` is a uppercase SDP-style codec name: "VP8", "H264".
    *
    * This looks for all video m-sections (lines starting with "m=video"),
    * then searches all of its related PayloadTypes trying to find those which
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
    *   > Although the answerer MAY list the formats in their desired order of
    *   > preference, it is RECOMMENDED that unless there is a specific reason,
    *   > the answerer list formats in the same relative order they were
    *   > present in the offer.
    *
    * Here we have a specific reason, thus we use this allowance to change the
    * ordering of formats. Browsers (tested with Chrome 84) honor this change and
    * use the first codec provided in the answer, so this operation actually works.
    */
    public String setCodecPreference(VideoCodec codec, String sdp) throws OpenViduException {
        String codecStr = codec.name();
        log.info("[setCodecPreference] codec: {}", codecStr);

        List<String> codecPts = new ArrayList<String>();
        String[] lines = sdp.split("\\R+");
        Pattern ptRegex = Pattern.compile(String.format("a=rtpmap:(\\d+) %s/90000", codecStr));

        for (int sl = 0; sl < lines.length; sl++) {
            String sdpLine = lines[sl];

            if (!sdpLine.startsWith("m=video")) {
                continue;
            }

            // m-section found. Prepare an array to store PayloadTypes.
            codecPts.clear();

            // Search the m-section to find our codec's PayloadType, if any.
            for (int ml = sl + 1; ml < lines.length; ml++) {
                String mediaLine = lines[ml];

                // Abort if we reach the next m-section.
                if (mediaLine.startsWith("m=")) {
                    break;
                }

                Matcher ptMatch = ptRegex.matcher(mediaLine);
                if (ptMatch.find()) {
                    // PayloadType found.
                    String pt = ptMatch.group(1);
                    codecPts.add(pt);

                    // Search the m-section to find the APT subtype, if any.
                    Pattern aptRegex = Pattern.compile(String.format("a=fmtp:(\\d+) apt=%s", pt));

                    for (int al = sl + 1; al < lines.length; al++) {
                        String aptLine = lines[al];

                        // Abort if we reach the next m-section.
                        if (aptLine.startsWith("m=")) {
                            break;
                        }

                        Matcher aptMatch = aptRegex.matcher(aptLine);
                        if (aptMatch.find()) {
                            // APT found.
                            String apt = aptMatch.group(1);
                            codecPts.add(apt);
                        }
                    }
                }
            }

            if (codecPts.isEmpty()) {
                throw new OpenViduException(Code.FORCED_CODEC_NOT_FOUND_IN_SDPOFFER, "The specified forced codec " + codecStr + " is not present in the SDP");
            }

            // Build a new m= line where any PayloadTypes found have been moved
            // to the front of the PT list.
            StringBuilder newLine = new StringBuilder(sdpLine.length());
            List<String> lineParts = new ArrayList<String>(Arrays.asList(sdpLine.split(" ")));

            if (lineParts.size() < 4) {
                log.error("[setCodecPreference] BUG in m= line: Expects at least 4 fields: '{}'", sdpLine);
                continue;
            }

            // Add "m=video", Port, and Protocol.
            for (int i = 0; i < 3; i++) {
                newLine.append(lineParts.remove(0) + " ");
            }

            // Add the PayloadTypes that correspond to our preferred codec.
            for (String pt : codecPts) {
                lineParts.remove(pt);
                newLine.append(pt + " ");
            }

            // Add the rest of PayloadTypes.
            newLine.append(String.join(" ", lineParts));

            // Replace the original m= line with the one we just built.
            lines[sl] = newLine.toString();
        }

        return String.join("\r\n", lines);
    }
       
}