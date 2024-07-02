import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSessionsComponent } from './test-sessions.component';

describe('TestSessionsComponent', () => {
  let component: TestSessionsComponent;
  let fixture: ComponentFixture<TestSessionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestSessionsComponent]
    });
    fixture = TestBed.createComponent(TestSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
