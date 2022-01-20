import { TestBed } from '@angular/core/testing';
import { LibConfig } from '../../config/lib.config';

import { LibraryConfigService } from './library-config.service';

describe('LibraryConfigService', () => {
  let service: LibraryConfigService;
  const libConfig: LibConfig = { environment: {production: false} };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LibraryConfigService,
        {provide: 'LIB_CONFIG', useValue: libConfig}]
    });
    service = TestBed.inject(LibraryConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
