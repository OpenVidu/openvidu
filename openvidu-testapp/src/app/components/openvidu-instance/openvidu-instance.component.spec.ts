import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenviduInstanceComponent } from './openvidu-instance.component';

describe('OpenviduInstanceComponent', () => {
  let component: OpenviduInstanceComponent;
  let fixture: ComponentFixture<OpenviduInstanceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OpenviduInstanceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OpenviduInstanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
