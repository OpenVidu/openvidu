package io.openvidu.server.test.unit;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.openvidu.client.OpenViduException;
import io.openvidu.java.client.VideoCodec;
import io.openvidu.server.utils.SDPMunging;

public class SDPMungingTest {

	private SDPMunging sdpMungin = new SDPMunging();

	private String oldSdp;

	private String newSdp;

	List<String> h264codecPayloads;

	List<String> forceCodecPayloads;

	String validSDPH264Files[] = new String[] { "sdp_kurento_h264.txt", "sdp_chrome84.txt", "sdp_firefox79.txt",
			"sdp_safari13-1.txt" };

	String validSDPVP8Files[] = new String[] { "sdp_kurento_h264.txt", "sdp_chrome84.txt", "sdp_firefox79.txt",
			"sdp_safari13-1.txt" };

	String validSDPVP9Files[] = new String[] { "sdp_chrome84.txt", "sdp_firefox79.txt" };

	String notValidVP9Files[] = new String[] { "sdp_kurento_h264.txt", "sdp_safari13-1.txt" };

	@Test
	@DisplayName("[setCodecPreference] Force VP8 Codec prevalence in 'm=video' line")
	public void checkPreferenceCodecVP8() throws IOException {
		for (String sdpFileName : validSDPVP8Files) {
			initTestsSetCodecPrevalence(VideoCodec.VP8, sdpFileName);
			checkPrevalenceCodecInML();
		}
	}

	@Test
	@DisplayName("[setCodecPreference] Force VP8 Codec prevalence in 'm=video' line")
	public void checkPreferenceCodecVP9() throws IOException {
		for (String sdpFileName : validSDPVP9Files) {
			initTestsSetCodecPrevalence(VideoCodec.VP9, sdpFileName);
			checkPrevalenceCodecInML();
		}
	}

	@Test
	@DisplayName("[setCodecPreference] Force H264 Codec prevalence in 'm=video' line")
	public void checkPreferenceCodecH264() throws IOException {
		for (String sdpFileName : validSDPH264Files) {
			initTestsSetCodecPrevalence(VideoCodec.H264, sdpFileName);
			checkPrevalenceCodecInML();
		}
	}

	@Test
	@DisplayName("[setCodecPreference] Exception when codec does not exists on SDP")
	public void checkPreferenceCodecException() throws IOException {
		for (String sdpFile : notValidVP9Files) {
			Exception exception = assertThrows(OpenViduException.class, () -> {
				initTestsSetCodecPrevalence(VideoCodec.VP9, sdpFile);
			});
			String expectedMessage = "The specified forced codec VP9 is not present in the SDP";
			assertTrue(exception.getMessage().contains(expectedMessage));
		}
	}

	private String getSdpFile(String sdpNameFile) throws IOException {
		Path sdpFile = Files.createTempFile("sdp-test", ".tmp");
		Files.copy(getClass().getResourceAsStream("/sdp/" + sdpNameFile), sdpFile, StandardCopyOption.REPLACE_EXISTING);
		String sdpUnformatted = new String(Files.readAllBytes(sdpFile));
		return String.join("\r\n", sdpUnformatted.split("\\R+")) + "\r\n";
	}

	private void initTestsSetCodecPrevalence(VideoCodec codec, String sdpNameFile) throws IOException {
		this.oldSdp = getSdpFile(sdpNameFile);
		this.newSdp = this.sdpMungin.setCodecPreference(codec, oldSdp);
		this.forceCodecPayloads = new ArrayList<>();

		// Get all Payload-Type for video Codec
		for (String oldSdpLine : oldSdp.split("\\R+")) {
			if (oldSdpLine.startsWith("a=rtpmap") && oldSdpLine.endsWith(codec.name() + "/90000")) {
				String pt = oldSdpLine.split(":")[1].split(" ")[0];
				this.forceCodecPayloads.add(pt);
			}
		}

		// Get all Payload-Types rtx related with codec
		// Not the best way to do it, but enough to check if the sdp
		// generated is correct
		String[] oldSdpLines = oldSdp.split("\\R+");
		List<String> rtxForcedCodecs = new ArrayList<>();
		for (String oldSdpLine : oldSdpLines) {
			if (oldSdpLine.startsWith("a=rtpmap") && oldSdpLine.endsWith("rtx/90000")) {
				String rtxPayload = oldSdpLine.split(":")[1].split(" ")[0];
				for (String auxOldSdpLine : oldSdpLines) {
					if (auxOldSdpLine.contains("a=fmtp:" + rtxPayload + " apt=")) {
						for (String auxForcedCodec : this.forceCodecPayloads) {
							if (auxOldSdpLine.contains("a=fmtp:" + rtxPayload + " apt=" + auxForcedCodec)) {
								String pt = oldSdpLine.split(":")[1].split(" ")[0];
								rtxForcedCodecs.add(pt);
							}
						}
					}
				}
			}
		}
		this.forceCodecPayloads.addAll(rtxForcedCodecs);
	}

	private void checkPrevalenceCodecInML() {

		String newml = null;
		String[] newSdpLines = this.newSdp.split("\\R+");
		for (String newSdpLine : newSdpLines) {
			if (newSdpLine.startsWith("m=video")) {
				newml = newSdpLine;
				break;
			}
		}

		if (newml == null) {
			fail("'m=video' line not found in SDP");
		}

		List<String> newMlCodecPrevalenceList = new ArrayList<>();
		String[] lmParams = newml.split(" ");
		int numOfCodecsWithPrevalence = this.forceCodecPayloads.size();
		int indexStartCodecs = 3;
		int indexEndPreferencedCodecs = 3 + numOfCodecsWithPrevalence;
		for (int i = indexStartCodecs; i < indexEndPreferencedCodecs; i++) {
			newMlCodecPrevalenceList.add(lmParams[i]);
		}

		for (int j = 0; j < numOfCodecsWithPrevalence; j++) {
			String codecToCheck = newMlCodecPrevalenceList.get(j);
			boolean codecFoundInPrevalenceList = false;
			for (String codecToForce : this.forceCodecPayloads) {
				if (codecToCheck.equals(codecToForce)) {
					codecFoundInPrevalenceList = true;
					break;
				}
			}
			assertTrue(codecFoundInPrevalenceList);
		}
	}

}