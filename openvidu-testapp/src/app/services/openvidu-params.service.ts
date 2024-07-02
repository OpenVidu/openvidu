import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface OpenviduParams {
  openviduUrl: string;
  openviduSecret: string;
}

@Injectable()
export class OpenviduParamsService {

  params: OpenviduParams =
    {
      openviduUrl: window.location.protocol + '//' + window.location.hostname + ':7880/',
      openviduSecret: 'secret'
    };

  newParams$ = new Subject<OpenviduParams>();

  constructor() { }

  getParams() {
    return this.params;
  }

  updateParams(params: any) {
    this.params = params;
    this.newParams$.next(params);
  }

}
