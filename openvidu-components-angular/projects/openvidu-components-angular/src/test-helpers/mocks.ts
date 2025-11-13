import { BehaviorSubject } from 'rxjs';

export class LoggerServiceMock {
  get() {
    return {
      d: () => {},
      i: () => {},
      e: () => {}
    };
  }
}

export class OpenViduComponentsConfigServiceMock {
  // Expose e2eeKey$ as a BehaviorSubject so tests can emit values
  e2eeKey$ = new BehaviorSubject<string | null>(null);

  getE2EEKey() {
    return this.e2eeKey$.getValue();
  }

  updateE2EEKey(value: string | null) {
    this.e2eeKey$.next(value);
  }
}
