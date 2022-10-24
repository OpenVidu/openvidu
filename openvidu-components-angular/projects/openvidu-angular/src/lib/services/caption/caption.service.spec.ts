import { TestBed } from '@angular/core/testing';

import { CaptionService } from './caption.service';

describe('CaptionService', () => {
  let service: CaptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CaptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
