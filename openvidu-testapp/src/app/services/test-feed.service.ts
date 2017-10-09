import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class TestFeedService {

  lastEvent;
  newLastEvent$ = new Subject<any>();

  constructor() { }

  getLastEvent() {
    return this.lastEvent;
  }

  pushNewEvent(session: string, connection: string, event: string, eventContent: string) {
    this.lastEvent = ({ session: session, connection: connection, event: event, eventContent: eventContent });
    this.newLastEvent$.next(this.lastEvent);
  }

}
