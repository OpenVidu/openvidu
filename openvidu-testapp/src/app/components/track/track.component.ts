import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  TrackPublication,
  LocalParticipant,
  Track,
  TrackEvent,
  LocalTrack,
  RemoteTrack,
  TrackEventCallbacks,
  LocalTrackPublication,
  RemoteTrackPublication,
} from 'livekit-client';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';

@Component({
  selector: 'app-track',
  template: '',
  styleUrls: [],
})
export class TrackComponent {
  @Output()
  newTrackEvent = new EventEmitter<{
    eventType: TrackEvent;
    eventCategory: 'TrackEvent';
    eventContent: any;
    eventDescription: string;
  }>();

  @Input()
  trackPublication: TrackPublication;

  @Input()
  localParticipant: LocalParticipant | undefined;

  @Input()
  index: number;

  protected track: Track | undefined;

  trackSubscribed: boolean = true;
  trackEnabled: boolean = true;

  constructor(protected testFeedService: TestFeedService) {}

  protected async unpublishTrack() {
    await this.localParticipant?.unpublishTrack(this.track as LocalTrack);
  }

  protected async toggleSubscribeTrack() {
    this.trackSubscribed = !this.trackSubscribed;
    await (this.trackPublication as RemoteTrackPublication).setSubscribed(
      this.trackSubscribed
    );
  }

  protected async toggleEnableTrack() {
    this.trackEnabled = !this.trackEnabled;
    await (this.trackPublication as RemoteTrackPublication).setEnabled(
      this.trackEnabled
    );
  }

  protected setupTrackEventListeners() {
    // This is a link to the complete list of Track events
    let callbacks: TrackEventCallbacks;
    let events: TrackEvent;

    this.track
      ?.on(TrackEvent.Message, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Message,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      })
      .on(TrackEvent.Muted, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Muted,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      })
      .on(TrackEvent.Unmuted, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Unmuted,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      })
      .on(TrackEvent.AudioSilenceDetected, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.AudioSilenceDetected,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      })
      .on(TrackEvent.Restarted, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Restarted,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      })
      .on(TrackEvent.Ended, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Ended,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      })
      .on(TrackEvent.VisibilityChanged, (visible: boolean) => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.VisibilityChanged,
          eventCategory: 'TrackEvent',
          eventContent: { visible, track: this.track },
          eventDescription: `${this.track!.source} is visible: ${visible}`,
        });
      })
      .on(TrackEvent.VideoDimensionsChanged, (dimensions: Track.Dimensions) => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.VideoDimensionsChanged,
          eventCategory: 'TrackEvent',
          eventContent: { dimensions, track: this.track },
          eventDescription: `${this.track?.source} ${JSON.stringify(
            dimensions
          )}`,
        });
      })
      .on(TrackEvent.UpstreamPaused, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.UpstreamPaused,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      })
      .on(TrackEvent.UpstreamResumed, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.UpstreamResumed,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this.track!.source,
        });
      });
  }

  protected getTrackOrigin(): string {
    let origin: string;
    if (this.track instanceof RemoteTrack) {
      origin = 'remote';
    } else if (this.track instanceof LocalTrack) {
      origin = 'local';
    } else {
      origin = 'unknown';
    }
    return origin;
  }

  updateEventList(event: TestAppEvent) {
    this.testFeedService.pushNewEvent({ user: this.index, event });
  }
}
