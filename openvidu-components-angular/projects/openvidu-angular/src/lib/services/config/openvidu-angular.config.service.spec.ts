import { TestBed } from '@angular/core/testing';
import { OpenViduAngularConfig } from '../../config/openvidu-angular.config';

import { OpenViduAngularConfigService } from './openvidu-angular.config.service';

describe('OpenViduAngularConfigService', () => {
  let service: OpenViduAngularConfigService;
  const config: OpenViduAngularConfig = { production: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OpenViduAngularConfigService,
        {provide: 'LIB_CONFIG', useValue: config}]
    });
    service = TestBed.inject(OpenViduAngularConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
