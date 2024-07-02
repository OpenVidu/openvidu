import { TestBed } from '@angular/core/testing';

import { VirtualBackgroundService } from './virtual-background.service';

describe('VirtualBackgroundService', () => {
  let service: VirtualBackgroundService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VirtualBackgroundService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
