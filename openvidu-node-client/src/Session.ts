import { TokenOptions } from './TokenOptions';
import { OpenViduRole } from './OpenViduRole';
import { SessionProperties } from './SessionProperties';

declare const Buffer;
declare const require;

let https = require('https');

export class Session {

    private sessionIdURL: string = '/api/sessions';
    private tokenURL: string = '/api/tokens';
    private sessionId: string = "";
    private properties: SessionProperties;
    private hostname: string;
    private port: number;

    constructor(private urlOpenViduServer: string, private secret: string, properties?: SessionProperties) {
        if (properties == null) {
            this.properties = new SessionProperties.Builder().build();
        } else {
            this.properties = properties;
        }
        this.setHostnameAndPort();
    }

    public getSessionId(callback: Function) {
        return new Promise((resolve, reject) => {
            if (this.sessionId) {
                resolve(this.sessionId);
            }

            let requestBody = JSON.stringify({
                'archiveLayout': this.properties.archiveLayout(),
                'archiveMode': this.properties.archiveMode(),
                'mediaMode': this.properties.mediaMode()
            });

            let options = {
                hostname: this.hostname,
                port: this.port,
                path: this.sessionIdURL,
                method: 'POST',
                headers: {
                    'Authorization': this.getBasicAuth(),
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
                    // Data reception is done
                    let parsed = JSON.parse(body);
                    this.sessionId = parsed.id;
                    resolve(parsed.id);
                });
            });

            req.on('error', (e) => {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        })
    }

    public generateToken(callback: Function);
    public generateToken(tokenOptions: TokenOptions, callback: Function);

    public generateToken(tokenOptions: any, callback?: any) {
        return new Promise((resolve, reject) => {
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
                path: this.tokenURL,
                method: 'POST',
                headers: {
                    'Authorization': this.getBasicAuth(),
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
                    // Data reception is done
                    let parsed = JSON.parse(body);
                    resolve(parsed.id);
                });
            });

            req.on('error', (e) => {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        })
    }

    public getProperties(): SessionProperties {
		return this.properties;
	}

    private getBasicAuth() {
        return 'Basic ' + (new Buffer('OPENVIDUAPP:' + this.secret).toString('base64'));
    }

    private setHostnameAndPort() {
        let urlSplitted = this.urlOpenViduServer.split(':');
        if (urlSplitted.length === 3) { // URL has format: http:// + hostname + :port
            this.hostname = this.urlOpenViduServer.split(':')[1].replace(/\//g, '');
            this.port = parseInt(this.urlOpenViduServer.split(':')[2].replace(/\//g, ''));
        } else if (urlSplitted.length == 2) { // URL has format: hostname + :port
            this.hostname = this.urlOpenViduServer.split(':')[0].replace(/\//g, '');
            this.port = parseInt(this.urlOpenViduServer.split(':')[1].replace(/\//g, ''));
        } else {
            console.error("URL format incorrect: it must contain hostname and port (current value: '" + this.urlOpenViduServer + "')");
        }
    }

}