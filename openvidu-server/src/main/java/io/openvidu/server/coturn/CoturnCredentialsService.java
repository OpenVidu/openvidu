/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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
                .staticAuthSecret(openviduConfig.getCoturnSharedSecretKey())
                .build();
        return new TurnCredentials(iceServerProperties.getUsername(), iceServerProperties.getCredential());
    }

}
