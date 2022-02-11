import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioWaveComponent } from './audio-wave.component';

describe('AudioWaveComponent', () => {
  let component: AudioWaveComponent;
  let fixture: ComponentFixture<AudioWaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AudioWaveComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AudioWaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
