import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomOptionsDialogComponent } from './room-options-dialog.component';

describe('RoomOptionsDialogComponent', () => {
  let component: RoomOptionsDialogComponent;
  let fixture: ComponentFixture<RoomOptionsDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RoomOptionsDialogComponent]
    });
    fixture = TestBed.createComponent(RoomOptionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
