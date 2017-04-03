import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { User } from '../models/user';

@Injectable()
export class UserService {

  private url = '/api-users';

  constructor(private http: Http) { }

  newUser(name: string, pass: string, nickName: string, role: string) {
    let body = JSON.stringify([name, pass, nickName, role]);
    let headers = new Headers({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });
    let options = new RequestOptions({ headers });
    return this.http.post(this.url + "/new", body, options)
    .map(response => response.json() as User)
    .catch(error => this.handleError(error));
  }

  private handleError(error: any) {
    return Observable.throw(error.status);
  }
}
