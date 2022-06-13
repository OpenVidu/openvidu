package io.openvidu.java.client.test;

import java.util.Arrays;
import java.util.List;

import io.openvidu.java.client.utils.FormatChecker;
import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

public class FormatCheckerTest extends TestCase {

	public FormatCheckerTest(String testName) {
		super(testName);
	}

	public static Test suite() {
		return new TestSuite(FormatCheckerTest.class);
	}

	public void testCustomSessionIdFormat() {

		List<String> invalidCustomSessionIds = Arrays.asList("", "session#", "session!", "session*", "'session",
				"\"session", "sess(ion", "sess_ion)", "session:session", ";session;", "session@session", "$",
				"&session", "ses=sion", "+", "session,", "/session", "session?", "session#", "session%", "[session]",
				"session.", "~", "session~", "~session", "session~1", "\\session");

		List<String> validCustomSessionIds = Arrays.asList("s", "1", "-", "_", "_-_", "session", "session1",
				"0session10", "-session", "session-", "-session-", "_session", "session_", "_session_", "_-session",
				"session-_", "123_session-1");

		for (String id : invalidCustomSessionIds)
			assertFalse(FormatChecker.isValidCustomSessionId(id));
		for (String id : validCustomSessionIds)
			assertTrue(FormatChecker.isValidCustomSessionId(id));
	}

	public void testAcceptableRecordingResolution() {

		List<String> invalidResolutions = Arrays.asList("", "a", "123", "true", "AXB", "AxB", "12x", "x12", "0920x1080",
				"1080x0720", "720x2000", "99x720", "1920X1080");

		List<String> validResolutions = Arrays.asList("1920x1080", "1280x720", "100x1999");

		for (String resolution : invalidResolutions)
			assertFalse(FormatChecker.isAcceptableRecordingResolution(resolution));
		for (String resolution : validResolutions)
			assertTrue(FormatChecker.isAcceptableRecordingResolution(resolution));
	}

	public void testAcceptableRecordingFrameRate() {

		List<Integer> invalidFrameRates = Arrays.asList(-1, 0, 121, 9999);

		List<Integer> validFramerates = Arrays.asList(1, 2, 30, 60, 119, 120);

		for (int framerate : invalidFrameRates)
			assertFalse(FormatChecker.isAcceptableRecordingFrameRate(framerate));
		for (int framerate : validFramerates)
			assertTrue(FormatChecker.isAcceptableRecordingFrameRate(framerate));
	}

}