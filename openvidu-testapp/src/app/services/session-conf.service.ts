import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class SessionConfService {

  private conf$ = new Subject();

  getConf() {
    return this.conf$;
  }

  updateConf(configuration: any) {
    this.conf$.next(configuration);
  }

}
