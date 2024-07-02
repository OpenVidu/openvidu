import { TestBed } from '@angular/core/testing';

import { RecordingService } from './recording.service';

describe('RecordingService', () => {
  let service: RecordingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecordingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
