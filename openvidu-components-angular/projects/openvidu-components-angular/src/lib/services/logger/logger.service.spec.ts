import { TestBed } from '@angular/core/testing';
import { LibraryConfigService } from '../library-config/library-config.service';
import { LibraryConfigServiceMock } from '../library-config/library-config.service.mock';

import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LibraryConfigService, useClass: LibraryConfigServiceMock },
      ]
    });
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
