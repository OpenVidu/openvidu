package io.openvidu.java.client;

import org.junit.Test;

public class OpenViduJavaClientExceptionTest {

    @Test(expected = OpenViduException.class)
    public void shouldThrowGenericOpenViduException() throws OpenViduJavaClientException {
        throw new OpenViduJavaClientException("message");
    }
}
