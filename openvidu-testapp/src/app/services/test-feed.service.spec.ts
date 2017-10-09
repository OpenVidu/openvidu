import { TestBed, inject } from '@angular/core/testing';

import { TestFeedService } from './test-feed.service';

describe('TestFeedService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestFeedService]
    });
  });

  it('should be created', inject([TestFeedService], (service: TestFeedService) => {
    expect(service).toBeTruthy();
  }));
});
