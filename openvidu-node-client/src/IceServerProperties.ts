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

export interface IceServerProperties {
    /**
     * Set the url for the ICE Server you want to use.
     * It should follow a valid format:
     *
     * - [https://datatracker.ietf.org/doc/html/rfc7065#section-3.1](https://datatracker.ietf.org/doc/html/rfc7065#section-3.1)
     * - [https://datatracker.ietf.org/doc/html/rfc7064#section-3.1](https://datatracker.ietf.org/doc/html/rfc7064#section-3.1)
     *
     */
    url: string;

    /**
     * Secret for TURN authentication based on:
     *  - [https://tools.ietf.org/html/draft-uberti-behave-turn-rest-00](https://tools.ietf.org/html/draft-uberti-behave-turn-rest-00)
     *  - [https://www.ietf.org/proceedings/87/slides/slides-87-behave-10.pdf](https://www.ietf.org/proceedings/87/slides/slides-87-behave-10.pdf)
     * This will generate credentials valid for 24 hours which is the recommended value
     */
    staticAuthSecret?: string;

    /**
     * Set a username for the ICE Server you want to use.
     * This parameter should be defined only for TURN, not for STUN ICE Servers.
     */
    username?: string;

    /**
     * Set a credential for the ICE Server you want to use.
     * This parameter should be defined only for TURN, not for STUN ICE Servers.
     */
    credential?: string;
}
