import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatTestComponent } from './chat-test.component';

describe('ChatTestComponent', () => {
  let component: ChatTestComponent;
  let fixture: ComponentFixture<ChatTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChatTestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
