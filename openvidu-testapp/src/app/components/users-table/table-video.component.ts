import {
  Component,
  Input,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { AudioTrack, VideoTrack } from 'livekit-client';

@Component({
    selector: 'app-table-video',
    template: `
    <video #mediaElement [id]="videoId" autoplay playsinline></video>
  `,
    styles: [
        `
      video {
        width: 100px;
      }
    `,
    ],
    standalone: false
})
export class TableVideoComponent implements AfterViewInit {
  @ViewChild('mediaElement') elementRef: ElementRef;

  @Input() videoId: string;

  @Input()
  get tracks(): { audio: AudioTrack; video: VideoTrack } {
    return this._tracks;
  }
  set tracks(tracks: { audio: AudioTrack; video: VideoTrack }) {
    this._tracks = tracks;
    if (this.elementRef) {
      if (this.tracks.audio) {
        this.tracks.audio.attach(this.elementRef.nativeElement);
      }
      if (this.tracks.video) {
        this.tracks.video.attach(this.elementRef.nativeElement);
      }
    }
  }
  private _tracks: { audio: AudioTrack; video: VideoTrack };

  ngAfterViewInit() {
    if (this.elementRef) {
      if (this._tracks.audio) {
        this._tracks.audio.attach(this.elementRef.nativeElement);
      }
      if (this._tracks.video) {
        this._tracks.video.attach(this.elementRef.nativeElement);
      }
    }
  }

  ngOnDestroy() {
    if (this.elementRef) {
      if (this._tracks.audio) {
        this._tracks.audio.detach(this.elementRef.nativeElement);
      }
      if (this._tracks.video) {
        this._tracks.video.detach(this.elementRef.nativeElement);
      }
    }
  }
}
