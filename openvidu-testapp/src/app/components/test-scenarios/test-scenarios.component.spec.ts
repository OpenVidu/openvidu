import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestScenariosComponent } from './test-scenarios.component';

describe('TestScenariosComponent', () => {
  let component: TestScenariosComponent;
  let fixture: ComponentFixture<TestScenariosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestScenariosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
