import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { Event } from 'openvidu-browser';

import * as stringify from 'json-stringify-safe';

@Injectable()
export class TestFeedService {

  lastEvent: { user: number, event: Event };
  newLastEvent$ = new Subject<any>();

  constructor() { }

  getLastEvent() {
    return this.lastEvent;
  }

  pushNewEvent({ user: number, event: Event }) {
    this.lastEvent = { user: number, event: Event };
    this.newLastEvent$.next(this.lastEvent);
  }

  stringifyEventNoCircularDependencies(event: Event): string {
    return stringify(event, (key, value) => {
      // Remove unnecessary properties
      if (key == 'ee' || key == 'openvidu' || key == 'userHandlerArrowHandler' || key == 'handlers') {
        return undefined;
      }

      return value;
    });
  }

}
