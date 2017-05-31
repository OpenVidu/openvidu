import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { Lesson } from '../models/lesson';

import { AuthenticationService } from './authentication.service';

@Injectable()
export class VideoSessionService {

    lesson: Lesson;
    cameraOptions: any;

    constructor(private http: Http, private authenticationService: AuthenticationService) { }

    // Returns {0: sessionId}
    createSession(lessonId: number) {
        let body = JSON.stringify(lessonId);
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.post('/api-sessions/create-session', body, options)
            .map(response => response.json())
            .catch(error => this.handleError(error));
    }

    // Returns {0: sessionId, 1: token}
    generateToken(lessonId: number) {
        let body = JSON.stringify(lessonId);
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.post('/api-sessions/generate-token', body, options)
            .map(response => response.json())
            .catch(error => this.handleError(error));
    }

    removeUser(lessonId: number) {
        let body = JSON.stringify(lessonId);
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.post('/api-sessions/remove-user', body, options)
            .map(response => response)
            .catch(error => this.handleError(error));
    }

    private handleError(error: any) {
        console.error(error);
        return Observable.throw('Server error (' + error.status + '): ' + error.text())
    }

}