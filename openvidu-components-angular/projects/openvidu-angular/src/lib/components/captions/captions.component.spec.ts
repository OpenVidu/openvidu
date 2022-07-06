import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubtitlesComponent } from './subtitles.component';

describe('SubtitlesComponent', () => {
  let component: SubtitlesComponent;
  let fixture: ComponentFixture<SubtitlesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubtitlesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubtitlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
