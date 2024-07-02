import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarProfileComponent } from './avatar-profile.component';

describe('AvatarProfileComponent', () => {
  let component: AvatarProfileComponent;
  let fixture: ComponentFixture<AvatarProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AvatarProfileComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AvatarProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
