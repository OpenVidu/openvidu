import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {
  TrackPublication,
  LocalParticipant,
  Track,
  TrackEvent,
  LocalTrack,
  RemoteTrack,
  TrackEventCallbacks,
  RemoteTrackPublication,
  AudioTrack,
  VideoTrack,
} from 'livekit-client';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';

@Component({
    selector: 'app-track',
    template: '',
    styleUrls: [],
    standalone: false
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

  protected finalElementRefId: string = '';
  private indexId: string;
  private trackId: string;

  public _track: Track | undefined;
  @ViewChild('mediaElement') protected elementRef: ElementRef;

  trackSubscribed: boolean = true;
  trackEnabled: boolean = true;

  constructor(protected testFeedService: TestFeedService) {}

  @Input() set index(index: number) {
    this.indexId = index.toString();
    this.finalElementRefId = `participant-${this.indexId}-${this.trackId}`;
  }

  @Input() set track(track: AudioTrack | VideoTrack | undefined) {
    this._track = track;

    this.setupTrackEventListeners();

    this.trackId = `-${this.getTrackOrigin()}--${this._track?.kind}--${
      this._track?.source
    }--${this._track?.sid}`;
    if (this._track?.sid !== this._track?.mediaStreamID) {
      this.trackId += `--${this._track?.mediaStreamID}`;
    }
    this.trackId = this.trackId.replace(/[^0-9a-z-A-Z_-]+/g, '');
    this.finalElementRefId = `participant-${this.indexId}-${this.trackId}`;

    this.attachTrack();
  }

  ngAfterViewInit() {
    this.attachTrack();
  }

  ngOnDestroy() {
    if (this.elementRef) {
      this._track?.detach(this.elementRef.nativeElement);
    }
  }

  private attachTrack() {
    if (
      this.elementRef &&
      (this._track?.kind === Track.Kind.Video ||
        (this._track?.kind === Track.Kind.Audio && !this.localParticipant))
    ) {
      this._track.attach(this.elementRef.nativeElement);
    }
  }

  protected async unpublishTrack() {
    await this.localParticipant?.unpublishTrack(this._track as LocalTrack);
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

    this._track
      ?.on(TrackEvent.Message, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Message,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      })
      .on(TrackEvent.Muted, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Muted,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      })
      .on(TrackEvent.Unmuted, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Unmuted,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      })
      .on(TrackEvent.AudioSilenceDetected, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.AudioSilenceDetected,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      })
      .on(TrackEvent.Restarted, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Restarted,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      })
      .on(TrackEvent.Ended, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.Ended,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      })
      .on(TrackEvent.VisibilityChanged, (visible: boolean) => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.VisibilityChanged,
          eventCategory: 'TrackEvent',
          eventContent: { visible, track: this._track },
          eventDescription: `${this._track!.source} is visible: ${visible}`,
        });
      })
      .on(TrackEvent.VideoDimensionsChanged, (dimensions: Track.Dimensions) => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.VideoDimensionsChanged,
          eventCategory: 'TrackEvent',
          eventContent: { dimensions, track: this._track },
          eventDescription: `${this._track?.source} ${JSON.stringify(
            dimensions
          )}`,
        });
      })
      .on(TrackEvent.UpstreamPaused, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.UpstreamPaused,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      })
      .on(TrackEvent.UpstreamResumed, () => {
        this.newTrackEvent.emit({
          eventType: TrackEvent.UpstreamResumed,
          eventCategory: 'TrackEvent',
          eventContent: {},
          eventDescription: this._track!.source,
        });
      });
  }

  protected getTrackOrigin(): string {
    let origin: string;
    if (this._track instanceof RemoteTrack) {
      origin = 'remote';
    } else if (this._track instanceof LocalTrack) {
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
