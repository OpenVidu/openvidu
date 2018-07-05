import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class MuteSubscribersService {

  muted = false;
  mutedEvent$ = new Subject<boolean>();

  constructor() { }

  getMuted() {
    return this.muted;
  }

  updateMuted(muted: boolean) {
    this.muted = muted;
    this.mutedEvent$.next(this.muted);
  }

}
