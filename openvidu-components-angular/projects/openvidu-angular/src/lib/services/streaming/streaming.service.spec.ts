import { TestBed } from '@angular/core/testing';

import { StreamingService } from './streaming.service';

describe('StreamingService', () => {
  let service: StreamingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StreamingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
