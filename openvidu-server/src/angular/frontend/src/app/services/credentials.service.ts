import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class CredentialsService {

    url: string;

    constructor(private http: Http) {
        this.url = 'https://' + location.hostname + ':8443'
    }

    getSessionId(secret: string) {
        let headers = new Headers({ 'Authorization': 'Basic ' + btoa('OPENVIDUAPP:' + secret) });
        let options = new RequestOptions({ headers });
        return this.http.post('api/sessions', options)
            .map(response => response.json())
            .catch(error => this.handleError(error));
    }

    getToken(sessionId: string, secret: string) {
        let body = JSON.stringify({ "session": sessionId, "role": "PUBLISHER", "data": "" });
        let headers = new Headers({ 'Authorization': 'Basic ' + btoa('OPENVIDUAPP:' + secret), 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers });
        return this.http.post('api/tokens', body, options)
            .map(response => response.json())
            .catch(error => this.handleError(error));
    }

    private handleError(error: any) {
        console.error(error);
        return Observable.throw('Server error (' + error.status + '): ' + error.text())
    }

}
