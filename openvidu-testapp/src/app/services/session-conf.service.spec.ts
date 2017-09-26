import { TestBed, inject } from '@angular/core/testing';

import { SessionConfService } from './session-conf.service';

describe('SessionConfService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionConfService]
    });
  });

  it('should be created', inject([SessionConfService], (service: SessionConfService) => {
    expect(service).toBeTruthy();
  }));
});
