package io.openvidu.server.core;

import io.openvidu.java.client.MediaMode;
import io.openvidu.java.client.SessionProperties;
import org.springframework.beans.factory.annotation.Autowired;

import javax.xml.ws.spi.WebServiceFeatureAnnotation;

public class SessionManagerProvider {

    @Autowired
    private SessionManager sessionManager;

    @Autowired
    private SessionStorage sessionStorage;

    public SessionManager get(MediaMode mediaMode) {
        if(mediaMode == MediaMode.RELAYED) {
            // Implement SessionManager for MediaMode.RELAYED
        }

        return this.sessionManager;
    }

    public SessionManager get(String sessionId) {
        SessionProperties sessionProperties = this.sessionStorage.getSessionProperties(sessionId);
        return this.get(sessionProperties.mediaMode());
    }

}
