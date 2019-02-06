import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { Event } from 'openvidu-browser';

@Injectable()
export class TestFeedService {

  lastEvent: Event;
  newLastEvent$ = new Subject<any>();

  constructor() { }

  getLastEvent() {
    return this.lastEvent;
  }

  pushNewEvent(session: string, connection: string, event: Event) {
    this.lastEvent = event;
    this.newLastEvent$.next(this.lastEvent);
  }

}
