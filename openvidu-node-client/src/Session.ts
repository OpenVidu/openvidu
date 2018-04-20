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

import { TokenOptions } from './TokenOptions';
import { OpenViduRole } from './OpenViduRole';
import { SessionProperties } from './SessionProperties';

declare const Buffer;
declare const require;

let https = require('https');

export class Session {

    private static readonly API_SESSIONS: string = '/api/sessions';
    private static readonly API_TOKENS: string = '/api/tokens';

    private sessionId: string = "";
    private properties: SessionProperties;

    constructor(private hostname: string, private port: number, private basicAuth: string, properties?: SessionProperties) {
        if (properties == null) {
            this.properties = new SessionProperties.Builder().build();
        } else {
            this.properties = properties;
        }
    }

    public getSessionId(): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            if (this.sessionId) {
                resolve(this.sessionId);
            }

            let requestBody = JSON.stringify({
                'mediaMode': this.properties.mediaMode(),
                'recordingMode': this.properties.recordingMode(),
                'defaultRecordingLayout': this.properties.defaultRecordingLayout(),
                'defaultCustomLayout': this.properties.defaultCustomLayout()
            });

            let options = {
                hostname: this.hostname,
                port: this.port,
                path: Session.API_SESSIONS,
                method: 'POST',
                headers: {
                    'Authorization': this.basicAuth,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            }
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (d) => {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server. Resolve sessionId
                        let parsed = JSON.parse(body);
                        this.sessionId = parsed.id;
                        resolve(parsed.id);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        });
    }

    public generateToken(tokenOptions?: TokenOptions): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            let requestBody;

            if (!!tokenOptions) {
                requestBody = JSON.stringify({
                    'session': this.sessionId,
                    'role': tokenOptions.getRole(),
                    'data': tokenOptions.getData()
                });
            } else {
                requestBody = JSON.stringify({
                    'session': this.sessionId,
                    'role': OpenViduRole.PUBLISHER,
                    'data': ''
                });
            }

            let options = {
                hostname: this.hostname,
                port: this.port,
                path: Session.API_TOKENS,
                method: 'POST',
                headers: {
                    'Authorization': this.basicAuth,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (d) => {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server. Resolve token
                        let parsed = JSON.parse(body);
                        resolve(parsed.id);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        });
    }

    public getProperties(): SessionProperties {
        return this.properties;
    }

}