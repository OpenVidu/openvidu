import { Component, EventEmitter, Input, Output, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  AudioCaptureOptions,
  ConnectionQuality,
  CreateLocalTracksOptions,
  DataPacket_Kind,
  LocalAudioTrack,
  LocalParticipant,
  LocalTrack,
  LocalTrackPublication,
  LocalVideoTrack,
  Participant,
  ParticipantEvent,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  ScreenShareCaptureOptions,
  SubscriptionError,
  Track,
  TrackEvent,
  TrackPublication,
  TrackPublishOptions,
  VideoCaptureOptions,
  createLocalAudioTrack,
  createLocalScreenTracks,
  createLocalVideoTrack,
} from 'livekit-client';
import { ParticipantPermission } from 'livekit-server-sdk';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';
import { OptionsDialogComponent } from '../dialogs/options-dialog/options-dialog.component';
import { ParticipantEventCallbacks } from 'node_modules/livekit-client/dist/src/room/participant/Participant';

@Component({
    selector: 'app-participant',
    templateUrl: './participant.component.html',
    styleUrls: ['./participant.component.css'],
    standalone: false
})
export class ParticipantComponent {
  @Input()
  participant: Participant;

  @Input()
  room: Room;

  @Input()
  index: number;

  @Output()
  sendDataToOneParticipant = new EventEmitter<string>();

  localParticipant: LocalParticipant | undefined;

  events: TestAppEvent[] = [];

  createLocalTracksOptions: CreateLocalTracksOptions;
  screenShareCaptureOptions: ScreenShareCaptureOptions = {};
  trackPublishOptions?: TrackPublishOptions;

  private decoder = new TextDecoder();

  constructor(
    private testFeedService: TestFeedService,
    @Inject(MatDialog) private dialog: MatDialog
  ) {}

  ngOnInit() {
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
    // This is a link to the complete list of Participant events
    let callbacks: ParticipantEventCallbacks;
    let events: ParticipantEvent;

    this.participant

      .on(
        ParticipantEvent.TrackPublished,
        (publication: RemoteTrackPublication) => {
          this.updateEventList(
            ParticipantEvent.TrackPublished,
            'ParticipantEvent',
            { publication },
            publication.source
          );
        }
      )

      .on(
        ParticipantEvent.TrackSubscribed,
        (track: RemoteTrack, publication: RemoteTrackPublication) => {
          this.updateEventList(
            ParticipantEvent.TrackSubscribed,
            'ParticipantEvent',
            { track, publication },
            publication.source
          );
        }
      )

      .on(
        ParticipantEvent.TrackSubscriptionFailed,
        (trackSid: string, reason?: SubscriptionError) => {
          this.updateEventList(
            ParticipantEvent.TrackSubscriptionFailed,
            'ParticipantEvent',
            { trackSid, reason },
            trackSid +
              ' . Reason: ' +
              (reason ? SubscriptionError[reason] : reason)
          );
        }
      )

      .on(
        ParticipantEvent.TrackUnpublished,
        (publication: RemoteTrackPublication) => {
          this.updateEventList(
            ParticipantEvent.TrackUnpublished,
            'ParticipantEvent',
            { publication },
            publication.source
          );
        }
      )

      .on(
        ParticipantEvent.TrackUnsubscribed,
        (track: RemoteTrack, publication: RemoteTrackPublication) => {
          this.updateEventList(
            ParticipantEvent.TrackUnsubscribed,
            'ParticipantEvent',
            { track, publication },
            track.source
          );
        }
      )

      .on(ParticipantEvent.TrackMuted, (publication: TrackPublication) => {
        this.updateEventList(
          ParticipantEvent.TrackMuted,
          'ParticipantEvent',
          { publication },
          publication.source
        );
      })

      .on(ParticipantEvent.TrackUnmuted, (publication: TrackPublication) => {
        this.updateEventList(
          ParticipantEvent.TrackUnmuted,
          'ParticipantEvent',
          { publication },
          publication.source
        );
      })

      .on(
        ParticipantEvent.LocalTrackPublished,
        (publication: LocalTrackPublication) => {
          this.updateEventList(
            ParticipantEvent.LocalTrackPublished,
            'ParticipantEvent',
            { publication },
            publication.source
          );
        }
      )

      .on(
        ParticipantEvent.LocalTrackUnpublished,
        (publication: LocalTrackPublication) => {
          this.updateEventList(
            ParticipantEvent.LocalTrackUnpublished,
            'ParticipantEvent',
            { publication },
            publication.source
          );
        }
      )

      .on(
        ParticipantEvent.ParticipantMetadataChanged,
        (prevMetadata: string | undefined) => {
          this.updateEventList(
            ParticipantEvent.ParticipantMetadataChanged,
            'ParticipantEvent',
            { prevMetadata },
            `previous: ${prevMetadata}, new: ${this.participant.metadata}`
          );
        }
      )

      .on(ParticipantEvent.ParticipantNameChanged, (name: string) => {
        this.updateEventList(
          ParticipantEvent.ParticipantNameChanged,
          'ParticipantEvent',
          { name },
          `${name}`
        );
      })

      .on(
        ParticipantEvent.DataReceived,
        (payload: Uint8Array, kind: DataPacket_Kind) => {
          const decodedPayload = this.decoder.decode(payload);
          this.updateEventList(
            ParticipantEvent.DataReceived,
            'ParticipantEvent',
            { payload: decodedPayload, kind },
            decodedPayload
          );
        }
      )

      .on(ParticipantEvent.IsSpeakingChanged, (speaking: boolean) => {
        this.updateEventList(
          ParticipantEvent.IsSpeakingChanged,
          'ParticipantEvent',
          { speaking },
          `${speaking}`
        );
      })

      .on(
        ParticipantEvent.ConnectionQualityChanged,
        (connectionQuality: ConnectionQuality) => {
          this.updateEventList(
            ParticipantEvent.ConnectionQualityChanged,
            'ParticipantEvent',
            { connectionQuality },
            `${connectionQuality}`
          );
        }
      )

      .on(
        ParticipantEvent.TrackStreamStateChanged,
        (
          publication: RemoteTrackPublication,
          streamState: Track.StreamState
        ) => {
          this.updateEventList(
            ParticipantEvent.TrackStreamStateChanged,
            'ParticipantEvent',
            { publication, streamState },
            `${publication.source}: ${streamState}`
          );
        }
      )

      .on(
        ParticipantEvent.TrackSubscriptionPermissionChanged,
        (
          publication: RemoteTrackPublication,
          status: TrackPublication.PermissionStatus
        ) => {
          this.updateEventList(
            ParticipantEvent.TrackSubscriptionPermissionChanged,
            'ParticipantEvent',
            { publication, status },
            `${publication.source}: ${status}`
          );
        }
      )

      .on(ParticipantEvent.MediaDevicesError, (error: Error) => {
        this.updateEventList(
          ParticipantEvent.MediaDevicesError,
          'ParticipantEvent',
          { error },
          `${error.message}`
        );
      })

      .on(
        ParticipantEvent.ParticipantPermissionsChanged,
        (prevPermissions?: ParticipantPermission) => {
          this.updateEventList(
            ParticipantEvent.ParticipantPermissionsChanged,
            'ParticipantEvent',
            { prevPermissions },
            `previous: ${prevPermissions}, new: ${JSON.stringify(
              this.participant.permissions
            )}`
          );
        }
      )

      .on(
        ParticipantEvent.TrackSubscriptionStatusChanged,
        (
          publication: RemoteTrackPublication,
          status: TrackPublication.SubscriptionStatus
        ) => {
          this.updateEventList(
            ParticipantEvent.TrackSubscriptionStatusChanged,
            'ParticipantEvent',
            { publication, status },
            `${publication.source}: ${status}`
          );
        }
      )

      .on(
        ParticipantEvent.LocalTrackSubscribed,
        (trackPublication: LocalTrackPublication) => {
          this.updateEventList(
            ParticipantEvent.LocalTrackSubscribed,
            'ParticipantEvent',
            { trackPublication },
            trackPublication.source
          );
        }
      );
  }

  updateEventList(
    eventType: ParticipantEvent | TrackEvent,
    eventCategory: 'ParticipantEvent' | 'TrackEvent',
    eventContent: any,
    eventDescription: string
  ) {
    const event: TestAppEvent = {
      eventType,
      eventCategory,
      eventContent,
      eventDescription,
    };
    this.events.push(event);
    this.testFeedService.pushNewEvent({ user: this.index, event });
  }

  sendData() {
    this.sendDataToOneParticipant.emit(this.participant.identity);
  }
}
