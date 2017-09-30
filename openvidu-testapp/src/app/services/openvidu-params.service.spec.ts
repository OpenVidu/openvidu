import { TestBed, inject } from '@angular/core/testing';

import { OpenviduParamsService } from './openvidu-params.service';

describe('OpenviduParamsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OpenviduParamsService]
    });
  });

  it('should be created', inject([OpenviduParamsService], (service: OpenviduParamsService) => {
    expect(service).toBeTruthy();
  }));
});
