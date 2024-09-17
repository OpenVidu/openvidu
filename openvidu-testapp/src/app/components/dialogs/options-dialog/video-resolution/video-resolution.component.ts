import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-video-resolution',
  templateUrl: './video-resolution.component.html',
  styleUrls: ['./video-resolution.component.css'],
})
export class VideoResolutionComponent {
  @Input() componentId: string;
  @Input() showTitle = true;
  @Input() width: number;
  @Input() height: number;
  @Input() frameRate?: number;
  @Input() aspectRatio?: number;
  @Output() resolutionChanged: EventEmitter<{
    width: number;
    height: number;
    frameRate?: number;
    aspectRatio?: number;
  }> = new EventEmitter();

  emitChanges() {
    this.resolutionChanged.emit({
      width: this.width,
      height: this.height,
      frameRate: this.frameRate,
      aspectRatio: this.aspectRatio,
    });
  }
}
