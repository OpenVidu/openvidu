package io.openvidu.server.utils.ice;

import org.kurento.client.IceCandidate;

import java.util.Objects;

/**
 * Ice candidate data following rfc5245, section-15.1 (only necessary data for OpenVidu)
 */
public class IceCandidateDataParser {

    /**
     * Max priority and Min priority possible defined in rfc5245 15.1
     * "<priority>:  is a positive integer between 1 and (2**31 - 1)"
     * MAX_PRIORITY = (2^24)*126 + (2^8)*65535 + 255
     * MIN_PRIORITY = (2^24)*1 + (2^8)*1 + 255
     */
    private final int MAX_PRIORITY = 2130706431;
    private final int MIN_PRIORITY = 16777727;


    /**
     * Full string with the candidate
     */
    private String[] candidate;

    public IceCandidateDataParser(IceCandidate iceCandidate) {
        this.candidate = iceCandidate.getCandidate().split(" ");
    }

    public IceCandidateDataParser(String iceCandidate) {
        this.candidate = iceCandidate.split(" ");
    }

    /**
     * Following rfc5245, section-15.1, the priority is the 4th element
     * @return The priority of the candidate
     */
    public String getPriority() {
        return candidate[3];
    }

    /**
     * Following rfc5245, section-15.1, the priority to replace is the 4th element
     * @param priority
     */
    public void setPriority(String priority) {
        candidate[3] = priority;
    }

    /**
     * Following rfc5245, section-15.1, set max priority value
     */
    public void setMaxPriority() {
        this.setPriority(Long.toString(MAX_PRIORITY));
    }

    /**
     * Following rfc5245, section-15.1, set min priority value
     */
    public void setMinPriority() {
        this.setPriority(Long.toString(MIN_PRIORITY));
    }

    /**
     * Following rfc5245, section-15.1, the ip to replace is the 4th element
     * @return ip of the candidate
     */
    public String getIp() {
        return candidate[4];
    }

    /**
     * Following rfc5245, section-15.1, the ip to replace is the 4th element
     * @param ip New ip for the ICE candidate
     */
    public void setIp(String ip) {
        this.candidate[4] = ip;
    }

    /**
     * Following rfc5245, section-15.1, the typ to get is the 7th element
     * @return typ of the candidate
     */
    public IceCandidateType getType() {
        return IceCandidateType.valueOf(candidate[7]);
    }

    /**
     * Following rfc5245, section-15.1, the typ to replace is the 7th element
     * @return typ of the candidate
     */
    public void setType(IceCandidateType type) {
        candidate[7] = type.toString();
    }

    /** Check if Ice candidate type is of the passed argument
     * @param iceCandidateType Ice candidate type
     * @return
     */
    public boolean isType(IceCandidateType iceCandidateType) {
        return Objects.equals(iceCandidateType, this.getType());
    }

    @Override
    public String toString() {
        return String.join(" ", candidate);
    }


}
