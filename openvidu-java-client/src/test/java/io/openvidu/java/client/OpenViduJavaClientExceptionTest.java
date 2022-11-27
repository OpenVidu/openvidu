package io.openvidu.java.client;

import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

public class OpenViduJavaClientExceptionTest {

	@Test
	public void shouldThrowGenericOpenViduException() {
		assertThrows(OpenViduException.class, () -> {
			throw new OpenViduJavaClientException("message");
		});
	}
}
