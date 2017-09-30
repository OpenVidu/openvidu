import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

export interface OpenviduParams {
  openviduUrl: string;
  openviduSecret: string;
}

@Injectable()
export class OpenviduParamsService {

  params: OpenviduParams =
  {
    openviduUrl: 'https://localhost:8443/',
    openviduSecret: 'MY_SECRET'
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
