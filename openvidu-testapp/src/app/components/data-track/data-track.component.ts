import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LocalDataTrack,
  LocalParticipant,
  RemoteDataTrack,
} from 'livekit-client';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';

@Component({
  selector: 'app-data-track',
  templateUrl: './data-track.component.html',
  styleUrl: './data-track.component.css',
  imports: [MatIconModule, MatTooltipModule],
})
export class DataTrackComponent {
  @Input()
  localParticipant: LocalParticipant | undefined;

  @Input()
  index: number;

  @Input()
  localDataTrack?: LocalDataTrack;

  @Input()
  remoteDataTrack?: RemoteDataTrack;

  @Output()
  newTrackEvent = new EventEmitter<TestAppEvent>();

  @Output()
  trackUnpublished = new EventEmitter<LocalDataTrack>();

  // Received frame info
  frameCount: number = 0;
  lastPayload: string = '';

  private decoder = new TextDecoder();

  constructor(
    private testFeedService: TestFeedService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.remoteDataTrack) {
      this.subscribeToRemoteDataTrack(this.remoteDataTrack);
    }
  }

  sendDataFrame() {
    if (this.localDataTrack) {
      const payload = new TextEncoder().encode(
        `DataTrackFrame from ${this.localParticipant?.identity}`
      );
      this.localDataTrack.tryPush({ payload });
    }
  }

  async unpublishDataTrack() {
    if (this.localDataTrack) {
      const track = this.localDataTrack;
      await track.unpublish();
      this.trackUnpublished.emit(track);
    }
  }

  private async subscribeToRemoteDataTrack(track: RemoteDataTrack) {
    const stream = track.subscribe();
    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        this.frameCount++;
        this.lastPayload = this.decoder.decode(value.payload);
        this.cdr.detectChanges();
      }
    } catch (_) {
      // Stream closed
    }
  }

  getTrackName(): string {
    if (this.localDataTrack?.info) {
      return this.localDataTrack.info.name;
    }
    if (this.remoteDataTrack) {
      return this.remoteDataTrack.info.name;
    }
    return '';
  }
}
