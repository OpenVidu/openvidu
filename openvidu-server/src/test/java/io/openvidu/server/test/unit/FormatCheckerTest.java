package io.openvidu.server.test.unit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

import io.openvidu.server.utils.FormatChecker;

public class FormatCheckerTest {

	@Test
	void customSessionIdFormatTest() {
		List<String> invalidCustomSessionIds = Arrays.asList("", "session#", "session!", "session*", "'session",
				"\"session", "sess(ion", "sess_ion)", "session:session", ";session;", "session@session", "$",
				"&session", "ses=sion", "+", "session,", "/session", "session?", "session#", "session%", "[session]",
				"session.", "session~", "~session", "session~1", "\\session");

		List<String> validCustomSessionIds = Arrays.asList("s", "1", "-", "_", "session", "session1", "0session10",
				"-session", "session-", "-session-", "_session", "session_", "_session_", "_-session", "session-_",
				"123_session-1");

		FormatChecker formatChecker = new FormatChecker();
		for (String id : invalidCustomSessionIds)
			assertFalse(formatChecker.isValidCustomSessionId(id));
		for (String id : validCustomSessionIds)
			assertTrue(formatChecker.isValidCustomSessionId(id));
	}

}