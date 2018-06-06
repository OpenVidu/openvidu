import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class InfoService {

  info: string;
  newInfo$: Subject<string>;

  constructor() {
    this.newInfo$ = new Subject<string>();
  }

  getInfo() {
    return this.info;
  }

  updateInfo(info: string) {
    this.info = info;
    this.newInfo$.next(info);
  }

}
