import { TestBed } from '@angular/core/testing';

import { BroadcastingService } from './broadcasting.service';

describe('BroadcastingService', () => {
  let service: BroadcastingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BroadcastingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
