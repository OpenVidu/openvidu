import { TestBed } from '@angular/core/testing';

import { LivekitParamsService } from './livekit-params.service';

describe('LivekitParamsService', () => {
  let service: LivekitParamsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LivekitParamsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
