import { TestBed } from '@angular/core/testing';
import { OpenViduComponentsConfig } from '../../config/openvidu-components-angular.config';

import { OpenViduComponentsConfigService } from './openvidu-components-angular.config.service';

describe('OpenViduAngularConfigService', () => {
  let service: OpenViduComponentsConfigService;
  const config: OpenViduComponentsConfig = { production: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OpenViduComponentsConfigService,
        {provide: 'LIB_CONFIG', useValue: config}]
    });
    service = TestBed.inject(OpenViduComponentsConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
