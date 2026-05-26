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
  RemoteTrackPublication,
  AudioTrack,
  VideoTrack,
} from 'livekit-client';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';
import {
  registerTrackEventListeners,
  removeAllManagedListeners,
} from 'src/app/utils/event-listener-utils';

@Component({
    selector: 'app-track',
    template: '',
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
  earlyTrackEvents: Map<string, TestAppEvent[]> = new Map();

  @Input()
  earlyTrackListeners: Map<string, Map<string, (...args: any[]) => void>> = new Map();

  protected finalElementRefId: string = '';
  private indexId: string;
  private trackId: string;

  public _track: Track | undefined;
  @ViewChild('mediaElement') protected elementRef: ElementRef;

  trackSubscribed: boolean = true;
  trackEnabled: boolean = true;

  private trackEventListeners: Map<string, (...args: any[]) => void> = new Map();

  constructor(protected testFeedService: TestFeedService) {}

  @Input() set index(index: number) {
    this.indexId = index.toString();
    this.finalElementRefId = `participant-${this.indexId}-${this.trackId}`;
  }

  @Input() set track(track: AudioTrack | VideoTrack | undefined) {
    this._track = track;

    // Drain early track events buffered before this component existed
    if (this._track) {
      const key = this._track.sid || this._track.mediaStreamID;
      const earlyEvents = this.earlyTrackEvents?.get(key);
      if (earlyEvents) {
        for (const event of earlyEvents) {
          this.newTrackEvent.emit(event as any);
        }
        this.earlyTrackEvents.delete(key);
      }
      const earlyListeners = this.earlyTrackListeners?.get(key);
      if (earlyListeners) {
        removeAllManagedListeners(this._track, earlyListeners);
        this.earlyTrackListeners.delete(key);
      }
    }

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
    if (!this._track) return;

    // Clear previous listeners (in case track changed)
    removeAllManagedListeners(this._track, this.trackEventListeners);

    this.trackEventListeners = registerTrackEventListeners(
      this._track,
      (eventType, eventContent, eventDescription) => {
        this.newTrackEvent.emit({
          eventType,
          eventCategory: 'TrackEvent',
          eventContent,
          eventDescription,
        });
      }
    );
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
