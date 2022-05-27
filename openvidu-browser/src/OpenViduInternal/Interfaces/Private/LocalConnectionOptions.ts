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

import { RemoteConnectionOptions } from './RemoteConnectionOptions';
import { IceServerProperties } from './IceServerProperties';

export interface LocalConnectionOptions {
    id: string;
    finalUserId: string;
    createdAt: number;
    metadata: string;
    value: RemoteConnectionOptions[];
    session: string; // OpenVidu Session identifier
    sessionId: string; // JSON-RPC session identifier
    role: string;
    record: boolean;
    coturnIp: string;
    coturnPort: number;
    turnUsername: string;
    turnCredential: string;
    version: string;
    mediaServer: string;
    videoSimulcast: boolean;
    life: number;
    customIceServers?: IceServerProperties[];
    recordingId?: string; // Defined if the session is being recorded and the client must be notified
    recordingName?: string; // Defined if the session is being recorded and the client must be notified
}
