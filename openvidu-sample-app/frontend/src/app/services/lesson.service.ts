import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { environment } from '../../environments/environment';

import { Lesson } from '../models/lesson';
import { User } from '../models/user';
import { AuthenticationService } from './authentication.service';

import 'rxjs/Rx';

@Injectable()
export class LessonService {

    private url = environment.URL_BACK + '/api-lessons';

    constructor(private http: Http, private authenticationService: AuthenticationService) { }

    getLessons(user: User) {
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.get(this.url + '/user/' + user.id, options) // Must send userId
            .map((response: Response) => response.json() as Lesson[])
            .catch(error => this.handleError(error));
    }

    getLesson(lessonId: number) {
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.get(this.url + '/lesson/' + lessonId, options) // Must send userId
            .map((response: Response) => response.json() as Lesson)
            .catch(error => this.handleError(error));
    }

    // POST new lesson. On success returns the created lesson
    newLesson(lesson: Lesson) {
        let body = JSON.stringify(lesson);
        let headers = new Headers({
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        });
        let options = new RequestOptions({ headers });
        return this.http.post(this.url + '/new', body, options)
            .map(response => response.json() as Lesson)
            .catch(error => this.handleError(error));
    }

    // PUT existing lesson. On success returns the updated lesson
    editLesson(lesson: Lesson) {
        let body = JSON.stringify(lesson);
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.put(this.url + '/edit', body, options)
            .map(response => response.json() as Lesson)
            .catch(error => this.handleError(error));
    }

    // DELETE existing lesson. On success returns the deleted lesson (simplified version)
    deleteLesson(lessonId: number) {
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.delete(this.url + '/delete/' + lessonId, options)
            .map(response => response.json() as Lesson)
            .catch(error => this.handleError(error));
    }

    // PUT existing lesson, modifying its attenders (adding them). On success returns the updated lesson.attenders array
    addLessonAttenders(lessonId: number, userEmails: string[]) {
        let body = JSON.stringify(userEmails);
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.put(this.url + '/edit/add-attenders/lesson/' + lessonId, body, options)
            .map(response => response.json())
            .catch(error => this.handleError(error));
    }

    // PUT existing lesson, modifying its attenders (deleting them). On success returns the updated lesson.attenders array
    deleteLessonAttenders(lesson: Lesson) {
        let body = JSON.stringify(lesson);
        let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers });
        return this.http.put(this.url + '/edit/delete-attenders', body, options)
            .map(response => response.json() as User[])
            .catch(error => this.handleError(error));
    }

    obtainLocalLesson(id: number) {
        return this.authenticationService.getCurrentUser().lessons.find(lesson => lesson.id == id);
    }

    private handleError(error: any) {
        console.error(error);
        return Observable.throw('Server error (' + error.status + '): ' + error.text())
    }
}
