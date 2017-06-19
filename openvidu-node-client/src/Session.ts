import { TokenOptions } from './TokenOptions';
import { OpenViduRole } from './OpenViduRole';

declare const Buffer;
declare const require;

var https = require('https');

export class Session {

    private sessionIdURL: string = '/api/sessions';
    private tokenURL: string = '/api/tokens';
    private sessionId: string = "";
    private hostname: string;
    private port: number;

    constructor(private urlOpenViduServer: string, private secret: string) {
        this.setHostnameAndPort();
    }

    public getSessionId(callback: Function) {

        if (this.sessionId) {
            return this.sessionId;
        }

        let options = {
            hostname: this.hostname,
            port: this.port,
            path: this.sessionIdURL,
            method: 'POST',
            headers: {
                'Authorization': this.getBasicAuth()
            }
        }
        const req = https.request(options, (res) => {
            var body = '';
            res.on('data', (d) => {
                // Continuously update stream with data
                body += d;
            });
            res.on('end', () => {
                // Data reception is done
                var parsed = JSON.parse(body);
                this.sessionId = parsed.id;
                callback(parsed.id);
            });
        });

        req.on('error', (e) => {
            console.error(e);
        });
        req.end();
    }


    public generateToken(callback: Function);
    public generateToken(tokenOptions: TokenOptions, callback: Function);

    public generateToken(tokenOptions: any, callback?: any) {
        var requestBody;

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

        var options = {
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
            var body = '';
            res.on('data', (d) => {
                // Continuously update stream with data
                body += d;
            });
            res.on('end', () => {
                // Data reception is done
                var parsed = JSON.parse(body);
                callback(parsed.id);
            });
        });

        req.on('error', (e) => {
            console.error(e);
        });
        req.write(requestBody);
        req.end();
    }

    private getBasicAuth() {
        return 'Basic ' + (new Buffer('OPENVIDUAPP:' + this.secret).toString('base64'));
    }

    private setHostnameAndPort() {
        var urlSplitted = this.urlOpenViduServer.split(':');
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