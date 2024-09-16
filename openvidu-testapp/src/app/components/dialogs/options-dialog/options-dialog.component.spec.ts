import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionsDialogComponent } from './options-dialog.component';

describe('OptionsDialogComponent', () => {
  let component: OptionsDialogComponent;
  let fixture: ComponentFixture<OptionsDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OptionsDialogComponent]
    });
    fixture = TestBed.createComponent(OptionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
