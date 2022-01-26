import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamTestComponent } from './stream-test.component';

describe('StreamTestComponent', () => {
  let component: StreamTestComponent;
  let fixture: ComponentFixture<StreamTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StreamTestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StreamTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
