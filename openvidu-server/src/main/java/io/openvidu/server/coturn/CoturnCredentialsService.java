package io.openvidu.server.coturn;

import io.openvidu.java.client.IceServerProperties;
import io.openvidu.server.config.OpenviduConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * This class implements the proposed standard https://datatracker.ietf.org/doc/html/draft-uberti-rtcweb-turn-rest-00
 * for obtaining access to TURN services via ephemeral (i.e. time-limited) credentials.
 */
public class CoturnCredentialsService {

    protected static final Logger log = LoggerFactory.getLogger(CoturnCredentialsService.class);

    @Autowired
    protected OpenviduConfig openviduConfig;

    public TurnCredentials createUser() {
        IceServerProperties iceServerProperties = new IceServerProperties.Builder()
                .ignoreEmptyUrl(true)
                .staticAuthSecret(openviduConfig.getOpenViduSecret())
                .build();
        return new TurnCredentials(iceServerProperties.getUsername(), iceServerProperties.getCredential());
    }

}
