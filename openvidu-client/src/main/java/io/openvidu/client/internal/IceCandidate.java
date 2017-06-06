package io.openvidu.client.internal;

public class IceCandidate {

  private String candidate;
  private String sdpMid;
  private int sdpMLineIndex;

  public IceCandidate(String candidate, String sdpMid, int sdpMLineIndex) {
    super();
    this.candidate = candidate;
    this.sdpMid = sdpMid;
    this.sdpMLineIndex = sdpMLineIndex;
  }

  public String getCandidate() {
    return candidate;
  }

  public String getSdpMid() {
    return sdpMid;
  }

  public int getSdpMLineIndex() {
    return sdpMLineIndex;
  }

  @Override
  public String toString() {
    return "IceCandidate [candidate=" + candidate + ", sdpMid=" + sdpMid + ", sdpMLineIndex="
        + sdpMLineIndex + "]";
  }
}
