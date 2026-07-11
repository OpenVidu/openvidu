import { Component, EventEmitter, Input, Output, ChangeDetectorRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgClass, KeyValuePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  AudioCaptureOptions,
  CreateLocalTracksOptions,
  LocalAudioTrack,
  LocalDataTrack,
  LocalParticipant,
  LocalTrack,
  LocalTrackPublication,
  LocalVideoTrack,
  Participant,
  ParticipantEvent,
  RemoteDataTrack,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  ScreenShareCaptureOptions,
  Track,
  TrackEvent,
  TrackPublication,
  TrackPublishOptions,
  VideoCaptureOptions,
  createLocalAudioTrack,
  createLocalScreenTracks,
  createLocalVideoTrack,
} from 'livekit-client';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';
import { OptionsDialogComponent } from '../dialogs/options-dialog/options-dialog.component';
import { VideoTrackComponent } from '../video-track/video-track.component';
import { AudioTrackComponent } from '../audio-track/audio-track.component';
import { DataTrackComponent } from '../data-track/data-track.component';
import {
  registerParticipantEventListeners,
  removeAllManagedListeners,
} from 'src/app/utils/event-listener-utils';

@Component({
    selector: 'app-participant',
    templateUrl: './participant.component.html',
    styleUrl: './participant.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [NgClass, KeyValuePipe, MatIconModule, MatTooltipModule, MatExpansionModule, VideoTrackComponent, AudioTrackComponent, DataTrackComponent],
})
export class ParticipantComponent {
  @Input()
  participant: Participant;

  @Input()
  room: Room;

  @Input()
  index: number;

  @Input()
  participantEvents: Map<string, boolean> = new Map();

  @Input()
  trackEvents: Map<string, boolean> = new Map();

  @Input()
  earlyParticipantEvents: Map<string, TestAppEvent[]> = new Map();

  @Input()
  earlyParticipantListeners: Map<string, Map<string, (...args: any[]) => void>> = new Map();

  @Input()
  earlyTrackEvents: Map<string, TestAppEvent[]> = new Map();

  @Input()
  earlyTrackListeners: Map<string, Map<string, (...args: any[]) => void>> = new Map();

  @Output()
  sendReliableDataToOneParticipant = new EventEmitter<string>();

  @Output()
  sendLossyDataToOneParticipant = new EventEmitter<string>();

  localParticipant: LocalParticipant | undefined;

  events: TestAppEvent[] = [];

  localDataTracks: LocalDataTrack[] = [];
  remoteDataTracks: RemoteDataTrack[] = [];
  dataTrackCounter: number = 1;
  dataTrackName: string = 'data_track_1';

  createLocalTracksOptions: CreateLocalTracksOptions;
  screenShareCaptureOptions: ScreenShareCaptureOptions = {};
  trackPublishOptions?: TrackPublishOptions;

  private decoder = new TextDecoder();
  private participantEventListeners: Map<string, (...args: any[]) => void> = new Map();
  private roomListenersFromParticipant: Map<string, (...args: any[]) => void> = new Map();

  private dialog = inject(MatDialog);

  constructor(
    private testFeedService: TestFeedService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Drain early participant events buffered before this component existed
    const key = this.participant.sid || this.participant.identity;
    const earlyEvents = this.earlyParticipantEvents?.get(key);
    if (earlyEvents) {
      this.events.push(...earlyEvents);
      this.earlyParticipantEvents.delete(key);
    }
    // Remove early listeners and replace with component-owned ones
    const earlyListeners = this.earlyParticipantListeners?.get(key);
    if (earlyListeners) {
      removeAllManagedListeners(this.participant, earlyListeners);
      this.earlyParticipantListeners.delete(key);
    }
    this.setupParticipantEventListeners();
    this.localParticipant = this.participant.isLocal
      ? (this.participant as LocalParticipant)
      : undefined;
    this.createLocalTracksOptions = {
      audio: JSON.parse(JSON.stringify(this.room.options.audioCaptureDefaults)),
      video: JSON.parse(JSON.stringify(this.room.options.videoCaptureDefaults)),
    };
    this.trackPublishOptions = JSON.parse(
      JSON.stringify(this.room.options.publishDefaults)
    );
    if (!this.participant.isLocal) {
      this.setupDataTrackListeners();
    }
  }

  onTrackEvent(event: TestAppEvent) {
    if (this.trackEvents.size > 0 && !this.trackEvents.get(event.eventType)) {
      return;
    }
    this.events.push(event);
    this.testFeedService.pushNewEvent({ user: this.index, event });
    this.cdr.detectChanges();
  }

  async addDataTrack() {
    const localParticipant = this.participant as LocalParticipant;
    const track = await localParticipant.publishDataTrack({ name: this.dataTrackName });
    this.localDataTracks.push(track);
    this.dataTrackCounter++;
    this.dataTrackName = 'data_track_' + this.dataTrackCounter;
    this.cdr.detectChanges();
  }

  openDataTrackOptionsDialog() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      data: { dataTrackName: this.dataTrackName },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!!result) {
        this.dataTrackName = result.dataTrackName;
      }
    });
  }

  onLocalDataTrackUnpublished(track: LocalDataTrack) {
    this.localDataTracks = this.localDataTracks.filter((t) => t !== track);
    this.cdr.detectChanges();
  }

  async addVideoTrack() {
    const options =
      this.createLocalTracksOptions.video === true
        ? undefined
        : (this.createLocalTracksOptions.video as VideoCaptureOptions);
    const localVideoTrack: LocalVideoTrack = await createLocalVideoTrack(
      options
    );
    (this.participant as LocalParticipant).publishTrack(
      localVideoTrack,
      this.trackPublishOptions
    );
  }

  async addAudioTrack() {
    const options =
      this.createLocalTracksOptions.audio === true
        ? undefined
        : (this.createLocalTracksOptions.audio as AudioCaptureOptions);
    const localAudioTrack: LocalAudioTrack = await createLocalAudioTrack(
      options
    );
    (this.participant as LocalParticipant).publishTrack(
      localAudioTrack,
      this.trackPublishOptions
    );
  }

  async addScreenTrack() {
    const localScreenTracks: LocalTrack[] = await createLocalScreenTracks(
      this.screenShareCaptureOptions
    );
    localScreenTracks.forEach((track) =>
      (this.participant as LocalParticipant).publishTrack(
        track,
        this.trackPublishOptions
      )
    );
  }

  openVideoTrackOptionsDialog() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      data: {
        createLocalTracksOptions: {
          video: this.createLocalTracksOptions.video,
        },
        allowDisablingVideo: false,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!!result) {
        if (typeof result.createLocalTracksOptions.video === 'boolean') {
          this.createLocalTracksOptions.video =
            this.room.options.videoCaptureDefaults!;
        } else {
          this.createLocalTracksOptions.video = result.createLocalTracksOptions
            .video as VideoCaptureOptions;
        }
      }
    });
  }

  openAudioTrackOptionsDialog() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      data: {
        createLocalTracksOptions: {
          audio: this.createLocalTracksOptions.audio,
        },
        allowDisablingAudio: false,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!!result) {
        this.createLocalTracksOptions.audio =
          result.createLocalTracksOptions.audio;
      }
    });
  }

  openScreenTrackOptionsDialog() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      data: {
        shareScreen: true,
        screenShareCaptureOptions: this.screenShareCaptureOptions,
        allowDisablingScreen: false,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!!result) {
        this.screenShareCaptureOptions = result.screenShareCaptureOptions;
      }
    });
  }

  openTrackPublishOptionsDialog() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      data: {
        trackPublishOptions: this.trackPublishOptions,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!!result) {
        this.trackPublishOptions = result.trackPublishOptions;
      }
    });
  }

  /**
   * [ParticipantEventCallbacks]
   */
  setupParticipantEventListeners() {
    // Remove any previous listeners
    removeAllManagedListeners(this.participant, this.participantEventListeners);

    this.participantEventListeners = registerParticipantEventListeners(
      this.participant,
      (eventType, eventContent, eventDescription) => {
        this.updateEventList(eventType, 'ParticipantEvent', eventContent, eventDescription);
      },
      this.decoder
    );
  }

  updateEventList(
    eventType: ParticipantEvent | TrackEvent,
    eventCategory: 'ParticipantEvent' | 'TrackEvent',
    eventContent: any,
    eventDescription: string
  ) {
    if (this.participantEvents.size > 0 && !this.participantEvents.get(eventType)) {
      return;
    }
    const event: TestAppEvent = {
      eventType,
      eventCategory,
      eventContent,
      eventDescription,
    };
    this.events.push(event);
    this.testFeedService.pushNewEvent({ user: this.index, event });
  }

  sendDataReliable() {
    this.sendReliableDataToOneParticipant.emit(this.participant.identity);
  }

  sendDataLossy() {
    this.sendLossyDataToOneParticipant.emit(this.participant.identity);
  }

  private setupDataTrackListeners() {
    const publishedListener = (track: RemoteDataTrack) => {
      if (track.publisherIdentity === this.participant.identity) {
        this.remoteDataTracks.push(track);
        this.cdr.detectChanges();
      }
    };
    this.room.addListener(RoomEvent.DataTrackPublished, publishedListener);
    this.roomListenersFromParticipant.set(RoomEvent.DataTrackPublished, publishedListener as any);

    const unpublishedListener = (sid: string) => {
      this.remoteDataTracks = this.remoteDataTracks.filter(
        (t) => t.info.sid !== sid
      );
      this.cdr.detectChanges();
    };
    this.room.addListener(RoomEvent.DataTrackUnpublished, unpublishedListener);
    this.roomListenersFromParticipant.set(RoomEvent.DataTrackUnpublished, unpublishedListener as any);
  }
}
