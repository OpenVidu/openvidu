package io.openvidu.server.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedList;
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

        return String.join("\r\n", lines) + "\r\n";
    }
    
    /** 
     * Possible Kurento's bug
     * Some browsers can't use H264 as a video codec if in the offerer SDP
     * the parameter "a=fmtp: <...> profile-level-id=42e01f" is not defined.
     * This munging is only used when the forced codec needs to be H264 
     * References:
     * https://stackoverflow.com/questions/38432137/cannot-establish-webrtc-connection-different-codecs-and-payload-type-in-sdp
     */
    public String setfmtpH264(String sdp) {
        String codecStr = VideoCodec.H264.name();
    
        // Get all lines
        List<String> lines = new LinkedList<String>(Arrays.asList(sdp.split("\\R+")));
        
        // Index to reference the line with "m=video"
        int mVideoLineIndex = -1;
        List<String> validCodecsPayload = new ArrayList<>();
        
        for(int i = 0; i < lines.size(); i++) {
            String sdpLine = lines.get(i);
            
            // Check that we are in "m=video"
            if (sdpLine.startsWith("m=video")) {
                mVideoLineIndex = i;
                
                // Search for payload-type for the specified codec
                for(int j = i+1; j < lines.size(); j++) {
                    String auxLine = lines.get(j);
                    
                    // Check that the line we're going to analizae is not anoter "m="
                    if(auxLine.startsWith("m=")) {
                        break;
                    }
                    
                    if (auxLine.startsWith("a=rtpmap")) {
                        String[] rtpmapInfo = auxLine.split(":")[1].split(" ");
                        String possiblePayload = rtpmapInfo[0];
                        String possibleCodec = rtpmapInfo[1];
                        if (possibleCodec.contains(codecStr)) {
                            validCodecsPayload.add(possiblePayload);
                        }
                    }
                }
                // If a payload is not found, then the codec is not in the SDP
                if (validCodecsPayload.size() == 0) {
                    throw new OpenViduException(Code.FORCED_CODEC_NOT_FOUND_IN_SDPOFFER, String.format("Codec %s not found", codecStr));
                }
                continue;
            }
            
        }
        if (mVideoLineIndex == -1) {
           throw new OpenViduException(Code.FORCED_CODEC_NOT_FOUND_IN_SDPOFFER, "This SDP does not offer video");
        }
        
        if (mVideoLineIndex != -1) {
            for (String codecPayload: validCodecsPayload) {
                if (!sdp.contains(String.format("a=fmtp:%s", codecPayload))) {
                    String newfmtpLine = String.format("a=fmtp:%s level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f", codecPayload);
                    lines.add(mVideoLineIndex + 1, newfmtpLine);
                }    
            }
            
        }
        
        // Return munging sdp!!
        String[] munguedSdpLines = lines.toArray(new String[lines.size()]);
        return String.join("\r\n", munguedSdpLines) + "\r\n";
        
    }

}