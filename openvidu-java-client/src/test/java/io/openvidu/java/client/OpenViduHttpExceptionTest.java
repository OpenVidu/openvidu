package io.openvidu.java.client;

import org.junit.Test;

public class OpenViduHttpExceptionTest {

    @Test(expected = OpenViduException.class)
    public void shouldThrowGenericOpenViduException() throws OpenViduHttpException {
        throw new OpenViduHttpException(401);
    }
}
