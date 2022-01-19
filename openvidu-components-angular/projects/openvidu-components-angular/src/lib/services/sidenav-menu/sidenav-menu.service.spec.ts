import { TestBed } from '@angular/core/testing';

import { SidenavMenuService } from './sidenav-menu.service';

describe('SidenavMenuService', () => {
  let service: SidenavMenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidenavMenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
