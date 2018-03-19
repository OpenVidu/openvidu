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

    public getSessionId(callback: Function) {

        if (this.sessionId) {
            callback(this.sessionId);
            return;
        }

        let requestBody = JSON.stringify({
            'archiveLayout': this.properties.archiveLayout(),
            'archiveMode': this.properties.archiveMode(),
            'mediaMode': this.properties.mediaMode()
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
                    callback(parsed.id);
                } else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    console.error(res.statusCode);
                }
            });
        });

        req.on('error', (e) => {
            console.error(e);
        });
        req.write(requestBody);
        req.end();
    }

    public generateToken(callback: Function);
    public generateToken(tokenOptions: TokenOptions, callback: Function);

    public generateToken(tokenOptions: any, callback?: any) {
        let requestBody;

        if (callback) {
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
            callback = tokenOptions;
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
                    callback(parsed.id);
                } else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    console.error(res.statusCode);
                }
            });
        });

        req.on('error', (e) => {
            console.error(e);
        });
        req.write(requestBody);
        req.end();
    }

    public getProperties(): SessionProperties {
        return this.properties;
    }

}