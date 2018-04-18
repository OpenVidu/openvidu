/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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

import { OpenViduRole } from "./OpenViduRole";

export class TokenOptions {

    constructor(private data: string, private role: OpenViduRole) { }

    getData(): string {
        return this.data;
    }

    getRole(): OpenViduRole {
        return this.role;
    }
}

export namespace TokenOptions {
    export class Builder {

        private dataProp: string = '';
        private roleProp: OpenViduRole = OpenViduRole.PUBLISHER;

        build(): TokenOptions {
            return new TokenOptions(this.dataProp, this.roleProp);
        }

        data(data: string): Builder {
            this.dataProp = data;
            return this;
        }

        role(role: OpenViduRole): Builder {
            this.roleProp = role;
            return this;
        }

    };
}
