import { TestBed, inject } from '@angular/core/testing';

import { OpenviduRestService } from './openvidu-rest.service';

describe('OpenviduRestService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OpenviduRestService]
    });
  });

  it('should be created', inject([OpenviduRestService], (service: OpenviduRestService) => {
    expect(service).toBeTruthy();
  }));
});
