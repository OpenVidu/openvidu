import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSessionsComponent } from './test-sessions.component';

describe('TestSessionsComponent', () => {
  let component: TestSessionsComponent;
  let fixture: ComponentFixture<TestSessionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestSessionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
