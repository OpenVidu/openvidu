import { Session } from "./Session";
import { SessionProperties } from "./SessionProperties";
import { Recording } from "./Recording";

declare const Buffer;
let https = require('https');

export class OpenVidu {

  private static readonly API_RECORDINGS: string = '/api/recordings';
  private static readonly API_RECORDINGS_START: string = '/start';
  private static readonly API_RECORDINGS_STOP: string = '/stop';

  private hostname: string;
  private port: number;
  private basicAuth: string;

  constructor(private urlOpenViduServer: string, secret: string) {
    this.setHostnameAndPort();
    this.basicAuth = this.getBasicAuth(secret);
  }

  public createSession(properties?: SessionProperties): Session {
    return new Session(this.hostname, this.port, this.basicAuth, properties);
  }

  public startRecording(sessionId: string): Promise<Recording> {
    return new Promise<Recording>((resolve, reject) => {

      let requestBody = JSON.stringify({
        'session': sessionId
      });

      let options = {
        hostname: this.hostname,
        port: this.port,
        path: OpenVidu.API_RECORDINGS + OpenVidu.API_RECORDINGS_START,
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
            // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
            resolve(new Recording(JSON.parse(body)));
          } else {
            // ERROR response from openvidu-server. Resolve HTTP status
            reject(new Error(res.statusCode));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(e));
      });
      req.write(requestBody);
      req.end();

    });
  }

  public stopRecording(recordingId: string): Promise<Recording> {
    return new Promise<Recording>((resolve, reject) => {

      let options = {
        hostname: this.hostname,
        port: this.port,
        path: OpenVidu.API_RECORDINGS + OpenVidu.API_RECORDINGS_STOP + '/' + recordingId,
        method: 'POST',
        headers: {
          'Authorization': this.basicAuth,
          'Content-Type': 'application/x-www-form-urlencoded'
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
            // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
            resolve(new Recording(JSON.parse(body)));
          } else {
            // ERROR response from openvidu-server. Resolve HTTP status
            reject(new Error(res.statusCode));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(e));
      });
      //req.write();
      req.end();

    });
  }

  public getRecording(recordingId: string): Promise<Recording> {
    return new Promise<Recording>((resolve, reject) => {

      let options = {
        hostname: this.hostname,
        port: this.port,
        path: OpenVidu.API_RECORDINGS + '/' + recordingId,
        method: 'GET',
        headers: {
          'Authorization': this.basicAuth,
          'Content-Type': 'application/x-www-form-urlencoded'
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
            // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
            resolve(new Recording(JSON.parse(body)));
          } else {
            // ERROR response from openvidu-server. Resolve HTTP status
            reject(new Error(res.statusCode));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(e));
      });
      //req.write();
      req.end();

    });
  }

  public listRecordings(): Promise<Recording[]> {
    return new Promise<Recording[]>((resolve, reject) => {

      let options = {
        hostname: this.hostname,
        port: this.port,
        path: OpenVidu.API_RECORDINGS,
        method: 'GET',
        headers: {
          'Authorization': this.basicAuth,
          'Content-Type': 'application/x-www-form-urlencoded'
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
            // SUCCESS response from openvidu-server (JSON arrays of recordings in JSON format). Resolve list of new recordings
            let recordingArray: Recording[] = [];
            let responseItems = JSON.parse(body)['items'];
            for (let i = 0; i < responseItems.length; i++) {
              recordingArray.push(new Recording(responseItems[i]));
            }
            resolve(recordingArray);
          } else {
            // ERROR response from openvidu-server. Resolve HTTP status
            reject(new Error(res.statusCode));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(e));
      });
      //req.write();
      req.end();

    });
  }

  public deleteRecording(recordingId: string): Promise<Error> {
    return new Promise<Error>((resolve, reject) => {

      let options = {
        hostname: this.hostname,
        port: this.port,
        path: OpenVidu.API_RECORDINGS + '/' + recordingId,
        method: 'DELETE',
        headers: {
          'Authorization': this.basicAuth,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => {
          // Continuously update stream with data
          body += d;
        });
        res.on('end', () => {
          if (res.statusCode === 204) {
            // SUCCESS response from openvidu-server. Resolve undefined
            resolve(undefined);
          } else {
            // ERROR response from openvidu-server. Resolve HTTP status
            reject(new Error(res.statusCode));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(e));
      });
      //req.write();
      req.end();

    });
  }

  private getBasicAuth(secret: string): string {
    return 'Basic ' + (new Buffer('OPENVIDUAPP:' + secret).toString('base64'));
  }

  private setHostnameAndPort(): void {
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