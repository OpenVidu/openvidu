package io.openvidu.java.client;

import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

public class OpenViduHttpExceptionTest {

	@Test
	public void shouldThrowGenericOpenViduException() {
		assertThrows(OpenViduException.class, () -> {
			throw new OpenViduHttpException(401);
		});
	}
}
