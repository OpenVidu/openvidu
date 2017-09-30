import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestApirestComponent } from './test-apirest.component';

describe('TestApirestComponent', () => {
  let component: TestApirestComponent;
  let fixture: ComponentFixture<TestApirestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestApirestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestApirestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
