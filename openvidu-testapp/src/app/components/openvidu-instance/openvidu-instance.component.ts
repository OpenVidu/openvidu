import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { NgClass, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RoomConf } from '../test-sessions/test-sessions.component';
import { LivekitParamsService } from 'src/app/services/livekit-params.service';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';

import {
  ConnectionQuality,
  ConnectionState,
  CreateLocalTracksOptions,
  DataPacket_Kind,
  DataPublishOptions,
  DisconnectReason,
  LocalAudioTrack,
  LocalDataTrack,
  LocalParticipant,
  LocalTrack,
  LocalTrackPublication,
  LocalVideoTrack,
  MediaDeviceFailure,
  Participant,
  ParticipantEvent,
  RemoteAudioTrack,
  RemoteDataTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteVideoTrack,
  Room,
  RoomConnectOptions,
  RoomEvent,
  RoomOptions,
  ScreenShareCaptureOptions,
  SubscriptionError,
  TextStreamReader,
  Track,
  TrackEvent,
  TrackPublication,
  TrackPublishOptions,
} from 'livekit-client';
import { ParticipantPermission } from 'livekit-server-sdk';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';
import { RoomApiDialogComponent } from '../dialogs/room-api-dialog/room-api-dialog.component';
import { RoomApiService } from 'src/app/services/room-api.service';
import { EventsDialogComponent } from '../dialogs/events-dialog/events-dialog.component';
import { OptionsDialogComponent } from '../dialogs/options-dialog/options-dialog.component';
import { InfoDialogComponent } from '../dialogs/info-dialog/info-dialog.component';
import { ParticipantComponent } from '../participant/participant.component';
import { RoomEventCallbacks } from 'node_modules/livekit-client/dist/src/room/Room';
import PCTransport from 'node_modules/livekit-client/dist/src/room/PCTransport';
import {
  registerParticipantEventListeners,
  registerTrackEventListeners,
  removeAllManagedListeners,
} from 'src/app/utils/event-listener-utils';

@Component({
  selector: 'app-openvidu-instance',
  templateUrl: './openvidu-instance.component.html',
  styleUrl: './openvidu-instance.component.css',
  imports: [NgClass, KeyValuePipe, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatCheckboxModule, MatExpansionModule, ParticipantComponent],
})
export class OpenviduInstanceComponent {
  @Input()
  roomConf: RoomConf;

  @Input()
  index: number;

  @Output()
  remove = new EventEmitter<void>();

  room?: Room;
  roomEvents: Map<RoomEvent, Boolean> = new Map<RoomEvent, boolean>();
  participantEvents: Map<ParticipantEvent, boolean> = new Map<ParticipantEvent, boolean>();
  trackEvents: Map<TrackEvent, boolean> = new Map<TrackEvent, boolean>();

  // When false, interim transcription events are not added to the event list
  // (only final transcription events are rendered)
  renderInterimTranscriptionEvents: boolean = true;

  private roomEventListeners: Map<string, (...args: any[]) => void> = new Map();

  // Early event registration: buffers events for participant/track components
  // that don't yet exist when the SDK fires events during connect()
  earlyParticipantEvents: Map<string, TestAppEvent[]> = new Map();
  earlyParticipantListeners: Map<string, Map<string, (...args: any[]) => void>> = new Map();
  earlyTrackEvents: Map<string, TestAppEvent[]> = new Map();
  earlyTrackListeners: Map<string, Map<string, (...args: any[]) => void>> = new Map();
  private earlyParticipantConnectedListener: ((...args: any[]) => void) | undefined;

  roomName: string = 'TestRoom';
  participantName: string = 'TestParticipant';

  // Options
  roomOptions: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: {
        width: 640,
        height: 480,
        frameRate: 30,
      },
    },
    singlePeerConnection: false
  };
  roomConnectOptions: RoomConnectOptions = {
    autoSubscribe: false,
    rtcConfig: {
      iceTransportPolicy: 'all',
    },
  };
  createLocalTracksOptions: CreateLocalTracksOptions = {
    audio: true,
    video: {
      resolution: {
        width: 1920,
        height: 1080,
        frameRate: 30,
      },
    },
  };
  screenShareCaptureOptions: ScreenShareCaptureOptions;
  trackPublishOptions: TrackPublishOptions = {};

  localTracks: {
    audioTrack: LocalAudioTrack | undefined;
    videoTrack: LocalVideoTrack | undefined;
  } = { audioTrack: undefined, videoTrack: undefined };
  remoteTracks: Map<
    string,
    {
      audioTrack: RemoteAudioTrack | undefined;
      videoTrack: RemoteVideoTrack | undefined;
    }
  > = new Map();

  events: TestAppEvent[] = [];

  private decoder = new TextDecoder();

  private dialog = inject(MatDialog);

  constructor(
    private livekitParamsService: LivekitParamsService,
    private testFeedService: TestFeedService,
    private roomApiService: RoomApiService,
  ) {
    const roomForDefaults = new Room(this.roomOptions);
    this.roomOptions = roomForDefaults.options;
    this.trackPublishOptions = roomForDefaults.options.publishDefaults!;
  }

  async ngOnInit() {
    for (let event of Object.keys(RoomEvent)) {
      this.roomEvents.set(RoomEvent[event as keyof typeof RoomEvent], true);
      this.roomEvents.set(RoomEvent.ActiveSpeakersChanged, false);
    }
    for (let event of Object.keys(ParticipantEvent)) {
      this.participantEvents.set(ParticipantEvent[event as keyof typeof ParticipantEvent], true);
        this.participantEvents.set(ParticipantEvent.IsSpeakingChanged, false);
    }
    for (let event of Object.keys(TrackEvent)) {
      this.trackEvents.set(TrackEvent[event as keyof typeof TrackEvent], true);
      this.trackEvents.set(TrackEvent.TimeSyncUpdate, false);
    }
    this.participantName += this.index;
    if (this.roomConf.startSession) {
      const token = await this.roomApiService.createToken(
        { roomJoin: true, canPublishData: true },
        this.participantName,
        this.roomName
      );
      this.connectRoom(token);
    }
  }

  ngOnDestroy() {
    this.disconnectRoom();
  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    this.disconnectRoom();
  }

  async createTokenAndConnectRoom() {
    this.connectRoom(
      await this.roomApiService.createToken(
        { roomJoin: true, canPublishData: true },
        this.participantName,
        this.roomName
      )
    );
  }

  async connectRoom(token: string): Promise<void> {
    // creates a new room with options
    this.room = new Room(this.roomOptions);
    (window as any)['room_' + this.index] = this.room;

    // Register early participant event listeners on local participant BEFORE connect
    this.registerEarlyParticipantListeners(this.room.localParticipant);

    // Register early participant event listeners on remote participants as they connect
    // This fires during connect() for participants already in the room
    this.earlyParticipantConnectedListener = (participant: RemoteParticipant) => {
      this.registerEarlyParticipantListeners(participant);
    };
    this.room.addListener(RoomEvent.ParticipantConnected, this.earlyParticipantConnectedListener as any);

    this.setupRoomEventListeners(new Map(), true);

    // connect to room
    await this.room.connect(
      this.livekitParamsService.getParams().livekitUrl,
      token,
      this.roomConnectOptions
    );

    if (this.roomConf.publisher) {
      const tracks: LocalTrack[] = [];
      if (
        this.createLocalTracksOptions.audio ||
        this.createLocalTracksOptions.video
      ) {
        tracks.push(
          ...(await this.room.localParticipant.createTracks(
            this.createLocalTracksOptions
          ))
        );
      }
      if (this.screenShareCaptureOptions) {
        const screenTracks: LocalTrack[] =
          await this.room.localParticipant.createScreenTracks(
            this.screenShareCaptureOptions
          );
        tracks.push(...screenTracks);
      }
      await Promise.all(
        tracks.map((track) =>
          this.room!.localParticipant.publishTrack(
            track,
            this.trackPublishOptions
          )
        )
      );
    }
  }

  private registerRoomListener(event: RoomEvent, listener: (...args: any[]) => void) {
    this.room!.addListener(event, listener as any);
    this.roomEventListeners.set(event, listener);
  }

  private unregisterRoomListener(event: RoomEvent | string) {
    const existing = this.roomEventListeners.get(event as string);
    if (existing) {
      this.room?.removeListener(event as RoomEvent, existing as any);
      this.roomEventListeners.delete(event as string);
    }
  }

  setupRoomEventListeners(oldValues: Map<string, boolean>, firstTime: boolean) {
    // This is a link to the complete list of Room events
    let callbacks: RoomEventCallbacks;
    let events: RoomEvent;

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Connected) !==
        oldValues.get(RoomEvent.Connected)
    ) {
      this.unregisterRoomListener(RoomEvent.Connected);
      if (this.roomEvents.get(RoomEvent.Connected)) {
        this.registerRoomListener(RoomEvent.Connected, () => {
          this.updateEventList(RoomEvent.Connected, {}, '');
          this.room!.remoteParticipants.forEach(
            (remoteParticipant: RemoteParticipant) => {
              if (this.roomConf.subscriber) {
                // Subscribe to already existing tracks
                remoteParticipant.trackPublications.forEach(
                  (publication: RemoteTrackPublication) => {
                    publication.setSubscribed(true);
                  }
                );
              }
            }
          );
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Reconnecting) !==
        oldValues.get(RoomEvent.Reconnecting)
    ) {
      this.unregisterRoomListener(RoomEvent.Reconnecting);
      if (this.roomEvents.get(RoomEvent.Reconnecting)) {
        this.registerRoomListener(RoomEvent.Reconnecting, () => {
          this.updateEventList(RoomEvent.Reconnecting, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.SignalReconnecting) !==
        oldValues.get(RoomEvent.SignalReconnecting)
    ) {
      this.unregisterRoomListener(RoomEvent.SignalReconnecting);
      if (this.roomEvents.get(RoomEvent.SignalReconnecting)) {
        this.registerRoomListener(RoomEvent.SignalReconnecting, () => {
          this.updateEventList(RoomEvent.SignalReconnecting, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Reconnected) !==
        oldValues.get(RoomEvent.Reconnected)
    ) {
      this.unregisterRoomListener(RoomEvent.Reconnected);
      if (this.roomEvents.get(RoomEvent.Reconnected)) {
        this.registerRoomListener(RoomEvent.Reconnected, () => {
          this.updateEventList(RoomEvent.Reconnected, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Disconnected) !==
        oldValues.get(RoomEvent.Disconnected)
    ) {
      this.unregisterRoomListener(RoomEvent.Disconnected);
      if (this.roomEvents.get(RoomEvent.Disconnected)) {
        this.registerRoomListener(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
          this.updateEventList(
            RoomEvent.Disconnected,
            {},
            `Reason: ${reason ? DisconnectReason[reason] : reason}`
          );
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ConnectionStateChanged) !==
        oldValues.get(RoomEvent.ConnectionStateChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ConnectionStateChanged);
      if (this.roomEvents.get(RoomEvent.ConnectionStateChanged)) {
        this.registerRoomListener(
          RoomEvent.ConnectionStateChanged,
          (state: ConnectionState) => {
            this.updateEventList(
              RoomEvent.ConnectionStateChanged,
              { state },
              state
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Moved) !==
        oldValues.get(RoomEvent.Moved)
    ) {
      this.unregisterRoomListener(RoomEvent.Moved);
      if (this.roomEvents.get(RoomEvent.Moved)) {
        this.registerRoomListener(RoomEvent.Moved, (name: string) => {
          this.updateEventList(
            RoomEvent.Moved,
            { name },
            `moved to room: ${name}`
          );
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.MediaDevicesChanged) !==
        oldValues.get(RoomEvent.MediaDevicesChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.MediaDevicesChanged);
      if (this.roomEvents.get(RoomEvent.MediaDevicesChanged)) {
        this.registerRoomListener(RoomEvent.MediaDevicesChanged, () => {
          this.updateEventList(RoomEvent.MediaDevicesChanged, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantConnected) !==
        oldValues.get(RoomEvent.ParticipantConnected)
    ) {
      this.unregisterRoomListener(RoomEvent.ParticipantConnected);
      if (this.roomEvents.get(RoomEvent.ParticipantConnected)) {
        this.registerRoomListener(
          RoomEvent.ParticipantConnected,
          (participant: RemoteParticipant) => {
            this.updateEventList(
              RoomEvent.ParticipantConnected,
              { participant },
              participant.identity
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantActive) !==
        oldValues.get(RoomEvent.ParticipantActive)
    ) {
      this.unregisterRoomListener(RoomEvent.ParticipantActive);
      if (this.roomEvents.get(RoomEvent.ParticipantActive)) {
        this.registerRoomListener(
          RoomEvent.ParticipantActive,
          (participant: Participant) => {
            this.updateEventList(
              RoomEvent.ParticipantActive,
              { participant },
              participant.identity
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantDisconnected) !==
        oldValues.get(RoomEvent.ParticipantDisconnected)
    ) {
      this.unregisterRoomListener(RoomEvent.ParticipantDisconnected);
      if (this.roomEvents.get(RoomEvent.ParticipantDisconnected)) {
        this.registerRoomListener(
          RoomEvent.ParticipantDisconnected,
          (participant: RemoteParticipant) => {
            this.updateEventList(
              RoomEvent.ParticipantDisconnected,
              { participant },
              participant.identity
            );
            this.remoteTracks.delete(participant.identity);
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackPublished) !==
        oldValues.get(RoomEvent.TrackPublished)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackPublished);
      if (this.roomEvents.get(RoomEvent.TrackPublished)) {
        this.registerRoomListener(
          RoomEvent.TrackPublished,
          (
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            this.updateEventList(
              RoomEvent.TrackPublished,
              { publication, participant },
              `${participant.identity} (${publication.source})`
            );
            if (this.roomConf.subscriber) {
              publication.setSubscribed(true);
            }
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackSubscribed) !==
        oldValues.get(RoomEvent.TrackSubscribed)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackSubscribed);
      if (this.roomEvents.get(RoomEvent.TrackSubscribed)) {
        this.registerRoomListener(
          RoomEvent.TrackSubscribed,
          (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            this.updateEventList(
              RoomEvent.TrackSubscribed,
              { track, publication, participant },
              `${participant.identity} (${publication.source})`
            );
            if (!this.remoteTracks.has(participant.identity)) {
              this.remoteTracks.set(participant.identity, {
                audioTrack: undefined,
                videoTrack: undefined,
              });
            }
            if (publication.kind === Track.Kind.Video) {
              this.remoteTracks.get(participant.identity)!.videoTrack =
                track as RemoteVideoTrack;
            } else if (publication.kind === Track.Kind.Audio) {
              this.remoteTracks.get(participant.identity)!.audioTrack =
                track as RemoteAudioTrack;
            } else {
              console.warn('Unknown track kind');
            }
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackSubscriptionFailed) !==
        oldValues.get(RoomEvent.TrackSubscriptionFailed)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackSubscriptionFailed);
      if (this.roomEvents.get(RoomEvent.TrackSubscriptionFailed)) {
        this.registerRoomListener(
          RoomEvent.TrackSubscriptionFailed,
          (
            trackSid: string,
            participant: RemoteParticipant,
            reason?: SubscriptionError
          ) => {
            this.updateEventList(
              RoomEvent.TrackSubscriptionFailed,
              { trackSid, participant },
              `${participant.identity} (${trackSid}). Reason: ${
                reason ? SubscriptionError[reason] : reason
              }`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackUnpublished) !==
        oldValues.get(RoomEvent.TrackUnpublished)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackUnpublished);
      if (this.roomEvents.get(RoomEvent.TrackUnpublished)) {
        this.registerRoomListener(
          RoomEvent.TrackUnpublished,
          (
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            this.updateEventList(
              RoomEvent.TrackUnpublished,
              { publication, participant },
              `${participant.identity} (${publication.source})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackUnsubscribed) !==
        oldValues.get(RoomEvent.TrackUnsubscribed)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackUnsubscribed);
      if (this.roomEvents.get(RoomEvent.TrackUnsubscribed)) {
        this.registerRoomListener(
          RoomEvent.TrackUnsubscribed,
          (
            track: Track,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            this.updateEventList(
              RoomEvent.TrackUnsubscribed,
              { track, publication, participant },
              `${participant.identity} (${publication.source})`
            );
            let remoteTracks = this.remoteTracks.get(participant.identity);
            if (remoteTracks) {
              if (publication.kind === Track.Kind.Video) {
                delete remoteTracks.videoTrack;
              } else if (publication.kind === Track.Kind.Audio) {
                delete remoteTracks.audioTrack;
              } else {
                console.warn('Unknown track kind');
              }
              if (
                remoteTracks.audioTrack === undefined &&
                remoteTracks.videoTrack === undefined
              ) {
                this.remoteTracks.delete(participant.identity);
              }
            }
            track.detach();
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackMuted) !==
        oldValues.get(RoomEvent.TrackMuted)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackMuted);
      if (this.roomEvents.get(RoomEvent.TrackMuted)) {
        this.registerRoomListener(
          RoomEvent.TrackMuted,
          (publication: TrackPublication, participant: Participant) => {
            this.updateEventList(
              RoomEvent.TrackMuted,
              { publication, participant },
              `${participant.identity} (${publication.source})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackUnmuted) !==
        oldValues.get(RoomEvent.TrackUnmuted)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackUnmuted);
      if (this.roomEvents.get(RoomEvent.TrackUnmuted)) {
        this.registerRoomListener(
          RoomEvent.TrackUnmuted,
          (publication: TrackPublication, participant: Participant) => {
            this.updateEventList(
              RoomEvent.TrackUnmuted,
              { publication, participant },
              `${participant.identity} (${publication.source})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.LocalTrackPublished) !==
        oldValues.get(RoomEvent.LocalTrackPublished)
    ) {
      this.unregisterRoomListener(RoomEvent.LocalTrackPublished);
      if (this.roomEvents.get(RoomEvent.LocalTrackPublished)) {
        this.registerRoomListener(
          RoomEvent.LocalTrackPublished,
          (
            publication: LocalTrackPublication,
            participant: LocalParticipant
          ) => {
            this.updateEventList(
              RoomEvent.LocalTrackPublished,
              { publication, participant },
              publication.source
            );
            if (publication.kind === Track.Kind.Video) {
              this.localTracks.videoTrack = publication.videoTrack;
            } else if (publication.kind === Track.Kind.Audio) {
              this.localTracks.audioTrack = publication.audioTrack;
            }
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.LocalTrackUnpublished) !==
        oldValues.get(RoomEvent.LocalTrackUnpublished)
    ) {
      this.unregisterRoomListener(RoomEvent.LocalTrackUnpublished);
      if (this.roomEvents.get(RoomEvent.LocalTrackUnpublished)) {
        this.registerRoomListener(
          RoomEvent.LocalTrackUnpublished,
          (
            publication: LocalTrackPublication,
            participant: LocalParticipant
          ) => {
            this.updateEventList(
              RoomEvent.LocalTrackUnpublished,
              { publication, participant },
              publication.source
            );
            publication.track!.detach();
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.LocalAudioSilenceDetected) !==
        oldValues.get(RoomEvent.LocalAudioSilenceDetected)
    ) {
      this.unregisterRoomListener(RoomEvent.LocalAudioSilenceDetected);
      if (this.roomEvents.get(RoomEvent.LocalAudioSilenceDetected)) {
        this.registerRoomListener(
          RoomEvent.LocalAudioSilenceDetected,
          (publication: LocalTrackPublication) => {
            this.updateEventList(
              RoomEvent.LocalAudioSilenceDetected,
              { publication },
              publication.source
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantMetadataChanged) !==
        oldValues.get(RoomEvent.ParticipantMetadataChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ParticipantMetadataChanged);
      if (this.roomEvents.get(RoomEvent.ParticipantMetadataChanged)) {
        this.registerRoomListener(
          RoomEvent.ParticipantMetadataChanged,
          (metadata: string | undefined, participant: Participant) => {
            this.updateEventList(
              RoomEvent.ParticipantMetadataChanged,
              { metadata, participant },
              `previous: ${metadata}, new: ${participant.metadata}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantNameChanged) !==
        oldValues.get(RoomEvent.ParticipantNameChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ParticipantNameChanged);
      if (this.roomEvents.get(RoomEvent.ParticipantNameChanged)) {
        this.registerRoomListener(
          RoomEvent.ParticipantNameChanged,
          (name: string, participant: Participant) => {
            this.updateEventList(
              RoomEvent.ParticipantNameChanged,
              { name, participant },
              `${participant.identity} (${name})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantAttributesChanged) !==
        oldValues.get(RoomEvent.ParticipantAttributesChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ParticipantAttributesChanged);
      if (this.roomEvents.get(RoomEvent.ParticipantAttributesChanged)) {
        this.registerRoomListener(
          RoomEvent.ParticipantAttributesChanged,
          (
            changedAttributes: Record<string, string>,
            participant: RemoteParticipant | LocalParticipant
          ) => {
            this.updateEventList(
              RoomEvent.ParticipantAttributesChanged,
              { changedAttributes, participant },
              `${participant.identity} ${JSON.stringify(changedAttributes)}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantPermissionsChanged) !==
        oldValues.get(RoomEvent.ParticipantPermissionsChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ParticipantPermissionsChanged);
      if (this.roomEvents.get(RoomEvent.ParticipantPermissionsChanged)) {
        this.registerRoomListener(
          RoomEvent.ParticipantPermissionsChanged,
          (
            prevPermissions: ParticipantPermission | undefined,
            participant: RemoteParticipant | LocalParticipant
          ) => {
            this.updateEventList(
              RoomEvent.ParticipantPermissionsChanged,
              { prevPermissions, participant },
              `${
                participant.identity
              } (previous: ${prevPermissions}, new: ${JSON.stringify(
                participant.permissions
              )}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ActiveSpeakersChanged) !==
        oldValues.get(RoomEvent.ActiveSpeakersChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ActiveSpeakersChanged);
      if (this.roomEvents.get(RoomEvent.ActiveSpeakersChanged)) {
        this.registerRoomListener(
          RoomEvent.ActiveSpeakersChanged,
          (speakers: Participant[]) => {
            this.updateEventList(
              RoomEvent.ActiveSpeakersChanged,
              { speakers },
              JSON.stringify(
                speakers.map(
                  (speaker) => `${speaker.identity}: ${speaker.audioLevel}`
                )
              )
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.RoomMetadataChanged) !==
        oldValues.get(RoomEvent.RoomMetadataChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.RoomMetadataChanged);
      if (this.roomEvents.get(RoomEvent.RoomMetadataChanged)) {
        this.registerRoomListener(RoomEvent.RoomMetadataChanged, (metadata: string) => {
          this.updateEventList(
            RoomEvent.RoomMetadataChanged,
            { metadata },
            metadata
          );
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.DataReceived) !==
        oldValues.get(RoomEvent.DataReceived)
    ) {
      this.unregisterRoomListener(RoomEvent.DataReceived);
      if (this.roomEvents.get(RoomEvent.DataReceived)) {
        this.registerRoomListener(
          RoomEvent.DataReceived,
          (
            payload: Uint8Array,
            participant?: RemoteParticipant,
            kind?: DataPacket_Kind,
            topic?: string
          ) => {
            let decodedPayload = this.decoder.decode(payload);
            decodedPayload += ` (kind: ${DataPacket_Kind[kind!]})`;
            this.updateEventList(
              RoomEvent.DataReceived,
              { payload: decodedPayload, participant, kind, topic },
              decodedPayload
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.SipDTMFReceived) !==
        oldValues.get(RoomEvent.SipDTMFReceived)
    ) {
      this.unregisterRoomListener(RoomEvent.SipDTMFReceived);
      if (this.roomEvents.get(RoomEvent.SipDTMFReceived)) {
        this.registerRoomListener(
          RoomEvent.SipDTMFReceived,
          (dtmf: any, participant?: RemoteParticipant) => {
            this.updateEventList(
              RoomEvent.SipDTMFReceived,
              { dtmf, participant },
              `${participant?.identity ?? 'unknown'} ${JSON.stringify(dtmf)}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ConnectionQualityChanged) !==
        oldValues.get(RoomEvent.ConnectionQualityChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ConnectionQualityChanged);
      if (this.roomEvents.get(RoomEvent.ConnectionQualityChanged)) {
        this.registerRoomListener(
          RoomEvent.ConnectionQualityChanged,
          (quality: ConnectionQuality, participant: Participant) => {
            this.updateEventList(
              RoomEvent.ConnectionQualityChanged,
              { quality, participant },
              `${participant.identity} (${quality})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.MediaDevicesError) !==
        oldValues.get(RoomEvent.MediaDevicesError)
    ) {
      this.unregisterRoomListener(RoomEvent.MediaDevicesError);
      if (this.roomEvents.get(RoomEvent.MediaDevicesError)) {
        this.registerRoomListener(RoomEvent.MediaDevicesError, (error: Error) => {
          this.updateEventList(
            RoomEvent.MediaDevicesError,
            {
              error: error.message,
              failure: MediaDeviceFailure.getFailure(error),
            },
            `${error.message} (${MediaDeviceFailure.getFailure(error)})`
          );
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackStreamStateChanged) !==
        oldValues.get(RoomEvent.TrackStreamStateChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackStreamStateChanged);
      if (this.roomEvents.get(RoomEvent.TrackStreamStateChanged)) {
        this.registerRoomListener(
          RoomEvent.TrackStreamStateChanged,
          (
            publication: RemoteTrackPublication,
            streamState: Track.StreamState,
            participant: RemoteParticipant
          ) => {
            this.updateEventList(
              RoomEvent.TrackStreamStateChanged,
              { publication, streamState, participant },
              `${participant.identity} (${publication.source}: ${streamState})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackSubscriptionPermissionChanged) !==
        oldValues.get(RoomEvent.TrackSubscriptionPermissionChanged)
    ) {
      this.unregisterRoomListener(
        RoomEvent.TrackSubscriptionPermissionChanged
      );
      if (this.roomEvents.get(RoomEvent.TrackSubscriptionPermissionChanged)) {
        this.registerRoomListener(
          RoomEvent.TrackSubscriptionPermissionChanged,
          (
            publication: RemoteTrackPublication,
            status: TrackPublication.PermissionStatus,
            participant: RemoteParticipant
          ) => {
            this.updateEventList(
              RoomEvent.TrackSubscriptionPermissionChanged,
              { publication, status, participant },
              `${participant.identity} (${publication.source}: ${status})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TrackSubscriptionStatusChanged) !==
        oldValues.get(RoomEvent.TrackSubscriptionStatusChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.TrackSubscriptionStatusChanged);
      if (this.roomEvents.get(RoomEvent.TrackSubscriptionStatusChanged)) {
        this.registerRoomListener(
          RoomEvent.TrackSubscriptionStatusChanged,
          (
            publication: RemoteTrackPublication,
            status: TrackPublication.SubscriptionStatus,
            participant: RemoteParticipant
          ) => {
            this.updateEventList(
              RoomEvent.TrackSubscriptionStatusChanged,
              { publication, status, participant },
              `${participant.identity} (${publication.source} to ${status})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.AudioPlaybackStatusChanged) !==
        oldValues.get(RoomEvent.AudioPlaybackStatusChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.AudioPlaybackStatusChanged);
      if (this.roomEvents.get(RoomEvent.AudioPlaybackStatusChanged)) {
        this.registerRoomListener(
          RoomEvent.AudioPlaybackStatusChanged,
          (playing: boolean) => {
            this.updateEventList(
              RoomEvent.AudioPlaybackStatusChanged,
              { playing },
              `canPlaybackAudio: ${this.room!.canPlaybackAudio}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.VideoPlaybackStatusChanged) !==
        oldValues.get(RoomEvent.VideoPlaybackStatusChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.VideoPlaybackStatusChanged);
      if (this.roomEvents.get(RoomEvent.VideoPlaybackStatusChanged)) {
        this.registerRoomListener(
          RoomEvent.VideoPlaybackStatusChanged,
          (playing: boolean) => {
            this.updateEventList(
              RoomEvent.VideoPlaybackStatusChanged,
              { playing },
              `canPlaybackVideo: ${playing}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.SignalConnected) !==
        oldValues.get(RoomEvent.SignalConnected)
    ) {
      this.unregisterRoomListener(RoomEvent.SignalConnected);
      if (this.roomEvents.get(RoomEvent.SignalConnected)) {
        this.registerRoomListener(RoomEvent.SignalConnected, () => {
          this.updateEventList(RoomEvent.SignalConnected, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.RecordingStatusChanged) !==
        oldValues.get(RoomEvent.RecordingStatusChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.RecordingStatusChanged);
      if (this.roomEvents.get(RoomEvent.RecordingStatusChanged)) {
        this.registerRoomListener(
          RoomEvent.RecordingStatusChanged,
          (recording: boolean) => {
            this.updateEventList(
              RoomEvent.RecordingStatusChanged,
              { recording },
              `recording: ${recording}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantEncryptionStatusChanged) !==
        oldValues.get(RoomEvent.ParticipantEncryptionStatusChanged)
    ) {
      this.unregisterRoomListener(
        RoomEvent.ParticipantEncryptionStatusChanged
      );
      if (this.roomEvents.get(RoomEvent.ParticipantEncryptionStatusChanged)) {
        this.registerRoomListener(
          RoomEvent.ParticipantEncryptionStatusChanged,
          (encrypted: boolean, participant?: Participant) => {
            this.updateEventList(
              RoomEvent.ParticipantEncryptionStatusChanged,
              { encrypted, participant },
              `${participant?.identity} (encrypted: ${encrypted})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.EncryptionError) !==
        oldValues.get(RoomEvent.EncryptionError)
    ) {
      this.unregisterRoomListener(RoomEvent.EncryptionError);
      if (this.roomEvents.get(RoomEvent.EncryptionError)) {
        this.registerRoomListener(RoomEvent.EncryptionError, (error: Error) => {
          this.updateEventList(
            RoomEvent.EncryptionError,
            { error: error.message },
            `${error.message}`
          );
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.DCBufferStatusChanged) !==
        oldValues.get(RoomEvent.DCBufferStatusChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.DCBufferStatusChanged);
      if (this.roomEvents.get(RoomEvent.DCBufferStatusChanged)) {
        this.registerRoomListener(
          RoomEvent.DCBufferStatusChanged,
          (isLow: boolean, kind: any) => {
            this.updateEventList(
              RoomEvent.DCBufferStatusChanged,
              { isLow, kind },
              `isLow: ${isLow} (${kind})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ActiveDeviceChanged) !==
        oldValues.get(RoomEvent.ActiveDeviceChanged)
    ) {
      this.unregisterRoomListener(RoomEvent.ActiveDeviceChanged);
      if (this.roomEvents.get(RoomEvent.ActiveDeviceChanged)) {
        this.registerRoomListener(
          RoomEvent.ActiveDeviceChanged,
          (kind: MediaDeviceKind, deviceId: string) => {
            this.updateEventList(
              RoomEvent.DCBufferStatusChanged,
              { kind, deviceId },
              `${kind} (${deviceId})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.LocalTrackSubscribed) !==
        oldValues.get(RoomEvent.LocalTrackSubscribed)
    ) {
      this.unregisterRoomListener(RoomEvent.LocalTrackSubscribed);
      if (this.roomEvents.get(RoomEvent.LocalTrackSubscribed)) {
        this.registerRoomListener(
          RoomEvent.LocalTrackSubscribed,
          (
            publication: LocalTrackPublication,
            participant: LocalParticipant
          ) => {
            this.updateEventList(
              RoomEvent.LocalTrackSubscribed,
              { publication, participant },
              `${publication.source}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ChatMessage) !==
        oldValues.get(RoomEvent.ChatMessage)
    ) {
      this.unregisterRoomListener(RoomEvent.ChatMessage);
      if (this.roomEvents.get(RoomEvent.ChatMessage)) {
        this.registerRoomListener(
          RoomEvent.ChatMessage,
          (message: any, participant?: RemoteParticipant | LocalParticipant) => {
            this.updateEventList(
              RoomEvent.ChatMessage,
              { message, participant },
              `${participant?.identity ?? 'unknown'}: ${message.message}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.MetricsReceived) !==
        oldValues.get(RoomEvent.MetricsReceived)
    ) {
      this.unregisterRoomListener(RoomEvent.MetricsReceived);
      if (this.roomEvents.get(RoomEvent.MetricsReceived)) {
        this.registerRoomListener(
          RoomEvent.MetricsReceived,
          (metrics: any, participant?: Participant) => {
            this.updateEventList(
              RoomEvent.MetricsReceived,
              { metrics, participant },
              `${participant?.identity ?? 'unknown'}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.TranscriptionReceived) !==
        oldValues.get(RoomEvent.TranscriptionReceived)
    ) {
      this.room?.unregisterTextStreamHandler('lk.transcription');
      if (this.roomEvents.get(RoomEvent.TranscriptionReceived)) {
        this.room?.registerTextStreamHandler(
          'lk.transcription',
          async (reader: TextStreamReader, participantInfo) => {
            const message = await reader.readAll();
            const isFinal =
              reader.info.attributes!['lk.transcription_final'] === 'true';
            if (!isFinal && !this.renderInterimTranscriptionEvents) {
              return;
            }
            this.updateEventList(
              isFinal
                ? ('finalTranscription' as any)
                : ('interimTranscription' as any),
              { participant: participantInfo.identity, message },
              `${participantInfo.identity} ${
                isFinal ? 'said' : 'is saying'
              }: ${message}`,
              isFinal ? 'RoomEvent' : 'RoomEvent-InterimTranscription'
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.DataTrackPublished) !==
        oldValues.get(RoomEvent.DataTrackPublished)
    ) {
      this.unregisterRoomListener(RoomEvent.DataTrackPublished);
      if (this.roomEvents.get(RoomEvent.DataTrackPublished)) {
        this.registerRoomListener(
          RoomEvent.DataTrackPublished,
          (track: RemoteDataTrack) => {
            this.updateEventList(
              RoomEvent.DataTrackPublished,
              { name: track.info.name, sid: track.info.sid, publisherIdentity: track.publisherIdentity },
              `${track.publisherIdentity} (${track.info.name})`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.DataTrackUnpublished) !==
        oldValues.get(RoomEvent.DataTrackUnpublished)
    ) {
      this.unregisterRoomListener(RoomEvent.DataTrackUnpublished);
      if (this.roomEvents.get(RoomEvent.DataTrackUnpublished)) {
        this.registerRoomListener(
          RoomEvent.DataTrackUnpublished,
          (sid: string) => {
            this.updateEventList(
              RoomEvent.DataTrackUnpublished,
              { sid },
              `sid: ${sid}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.LocalDataTrackPublished) !==
        oldValues.get(RoomEvent.LocalDataTrackPublished)
    ) {
      this.unregisterRoomListener(RoomEvent.LocalDataTrackPublished);
      if (this.roomEvents.get(RoomEvent.LocalDataTrackPublished)) {
        this.registerRoomListener(
          RoomEvent.LocalDataTrackPublished,
          (track: LocalDataTrack) => {
            this.updateEventList(
              RoomEvent.LocalDataTrackPublished,
              { name: track.info?.name, sid: track.info?.sid },
              `${track.info?.name}`
            );
          }
        );
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.LocalDataTrackUnpublished) !==
        oldValues.get(RoomEvent.LocalDataTrackUnpublished)
    ) {
      this.unregisterRoomListener(RoomEvent.LocalDataTrackUnpublished);
      if (this.roomEvents.get(RoomEvent.LocalDataTrackUnpublished)) {
        this.registerRoomListener(
          RoomEvent.LocalDataTrackUnpublished,
          (sid: string) => {
            this.updateEventList(
              RoomEvent.LocalDataTrackUnpublished,
              { sid },
              `sid: ${sid}`
            );
          }
        );
      }
    }
  }

  updateEventList(
    eventType: RoomEvent,
    eventContent: any,
    eventDescription: string,
    eventCategory = 'RoomEvent'
  ) {
    const event: TestAppEvent = {
      eventType,
      eventCategory: eventCategory as any,
      eventContent,
      eventDescription,
    };
    this.events.push(event);
    this.testFeedService.pushNewEvent({ user: this.index, event });
  }

  async disconnectRoom() {
    if (this.room) {
      // Clean up early listeners that were never handed off
      if (this.earlyParticipantConnectedListener) {
        this.room.removeListener(
          RoomEvent.ParticipantConnected,
          this.earlyParticipantConnectedListener as any
        );
        this.earlyParticipantConnectedListener = undefined;
      }
      for (const [key, listeners] of this.earlyParticipantListeners) {
        const participant =
          this.room.localParticipant.sid === key || this.room.localParticipant.identity === key
            ? this.room.localParticipant
            : this.room.remoteParticipants.get(key);
        if (participant) {
          removeAllManagedListeners(participant, listeners);
        }
      }
      this.earlyParticipantEvents.clear();
      this.earlyParticipantListeners.clear();
      for (const [, listeners] of this.earlyTrackListeners) {
        // Track listeners are cleaned up by disconnect, but clear maps
        listeners.clear();
      }
      this.earlyTrackEvents.clear();
      this.earlyTrackListeners.clear();

      await this.room.disconnect();
      delete this.room;
      delete this.localTracks.audioTrack;
      delete this.localTracks.videoTrack;
      this.remoteTracks.clear();
    }
  }

  private registerEarlyParticipantListeners(participant: Participant) {
    const key = participant.sid || participant.identity;
    const buffer: TestAppEvent[] = [];
    this.earlyParticipantEvents.set(key, buffer);

    const listeners = registerParticipantEventListeners(
      participant,
      (eventType, eventContent, eventDescription) => {
        if (this.participantEvents.size > 0 && !this.participantEvents.get(eventType)) return;
        const event: TestAppEvent = {
          eventType,
          eventCategory: 'ParticipantEvent',
          eventContent,
          eventDescription,
        };
        buffer.push(event);
        this.testFeedService.pushNewEvent({ user: this.index, event });

        // When a track becomes available during early registration, register early track listeners too
        if (eventType === ParticipantEvent.TrackSubscribed && eventContent.track) {
          this.registerEarlyTrackListeners(eventContent.track);
        } else if (eventType === ParticipantEvent.LocalTrackPublished && eventContent.publication?.track) {
          this.registerEarlyTrackListeners(eventContent.publication.track);
        }
      },
      this.decoder
    );
    this.earlyParticipantListeners.set(key, listeners);
  }

  private registerEarlyTrackListeners(track: Track) {
    const key = track.sid || track.mediaStreamID;
    const buffer: TestAppEvent[] = [];
    this.earlyTrackEvents.set(key, buffer);

    const listeners = registerTrackEventListeners(
      track,
      (eventType, eventContent, eventDescription) => {
        if (this.trackEvents.size > 0 && !this.trackEvents.get(eventType)) return;
        const event: TestAppEvent = {
          eventType,
          eventCategory: 'TrackEvent',
          eventContent,
          eventDescription,
        };
        buffer.push(event);
        this.testFeedService.pushNewEvent({ user: this.index, event });
      }
    );
    this.earlyTrackListeners.set(key, listeners);
  }

  async setCameraEnabled() {
    this.room!.localParticipant.setCameraEnabled(true);
  }

  async setMicrophoneEnabled() {
    this.room!.localParticipant.setMicrophoneEnabled(true);
  }

  openOptionsDialog() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      data: {
        roomOptions: this.roomOptions,
        forceRelay:
          this.roomConnectOptions.rtcConfig!.iceTransportPolicy === 'relay',
        createLocalTracksOptions: this.createLocalTracksOptions,
        shareScreen: true,
        screenShareCaptureOptions: this.screenShareCaptureOptions,
        trackPublishOptions: this.trackPublishOptions,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!!result) {
        this.roomOptions = result.roomOptions;
        this.roomConnectOptions.rtcConfig!.iceTransportPolicy =
          result.forceRelay ? 'relay' : 'all';
        this.createLocalTracksOptions = result.createLocalTracksOptions;
        this.screenShareCaptureOptions = result.screenShareCaptureOptions;
        this.trackPublishOptions = result.trackPublishOptions;
        if (
          this.createLocalTracksOptions.audio != undefined &&
          typeof this.createLocalTracksOptions.audio !== 'boolean'
        ) {
          this.roomOptions.audioCaptureDefaults =
            this.createLocalTracksOptions.audio;
        }
        if (
          this.createLocalTracksOptions.video != undefined &&
          typeof this.createLocalTracksOptions.video !== 'boolean'
        ) {
          this.roomOptions.videoCaptureDefaults =
            this.createLocalTracksOptions.video;
        }
        if (this.trackPublishOptions != undefined) {
          this.roomOptions.publishDefaults = this.trackPublishOptions;
        }
      }
    });
  }

  openRoomApiDialog() {
    const dialogRef = this.dialog.open(RoomApiDialogComponent, {
      data: {
        room: this.room,
        localParticipant: this.room?.localParticipant,
      },
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result) => {
      document
        .getElementById('room-api-btn-' + this.index)
        ?.classList.remove('cdk-program-focused');
    });
  }

  openAllEventsDialog() {
    const oldRoomValues: Map<string, boolean> = new Map(
      JSON.parse(JSON.stringify([...this.roomEvents]))
    );
    const interimTranscriptionToggle = {
      label: 'Render interim transcription events',
      checked: this.renderInterimTranscriptionEvents,
    };
    const dialogRef = this.dialog.open(EventsDialogComponent, {
      data: {
        eventGroups: [
          {
            label: 'RoomEvent',
            eventCollection: this.roomEvents,
            extraToggles: [interimTranscriptionToggle],
          },
          { label: 'ParticipantEvent', eventCollection: this.participantEvents },
          { label: 'TrackEvent', eventCollection: this.trackEvents },
        ],
        target: 'All',
      },
      width: '800px',
      autoFocus: false,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.renderInterimTranscriptionEvents = interimTranscriptionToggle.checked;
      if (
        !!this.room &&
        JSON.stringify(Array.from(this.roomEvents.entries())) !==
          JSON.stringify(Array.from(oldRoomValues.entries()))
      ) {
        this.setupRoomEventListeners(oldRoomValues, false);
      }
    });
  }

  sendData(destinationIdentity?: string, reliable: boolean = true) {
    let strData = `Message from ${this.room?.localParticipant.identity}`;
    strData += destinationIdentity
      ? ` to ${destinationIdentity}`
      : ' to all room';
    const data = new TextEncoder().encode(strData);
    let options: DataPublishOptions = {
      reliable,
    };
    if (destinationIdentity) {
      options.destinationIdentities = [destinationIdentity];
    }
    this.room?.localParticipant.publishData(data, options);
  }

  sendDataReliable(destinationIdentity?: string) {
    this.sendData(destinationIdentity, true);
  }

  sendDataLossy(destinationIdentity?: string) {
    this.sendData(destinationIdentity, false);
  }

  openInfoDialog() {
    const updateFunction = async (): Promise<string> => {
      const pub: PCTransport = this.getPublisherPC()!;
      const sub: PCTransport = this.getSubscriberPC()!;
      const info = {
          PCTransports: {
            publisher: {
              connectedAddress: await pub.getConnectedAddress(),
              connectionState: pub.getConnectionState(),
              iceConnectionState: pub.getICEConnectionState(),
              signallingState: pub.getSignallingState(),
            },
          },
          RTCIceCandidateStats: {
            publisher: await this.getPublisherRTCIceCandidateStats(),
          }
        };
      if (!!sub) {
        (info.PCTransports as any).subscriber = {
          connectedAddress: await sub.getConnectedAddress(),
          connectionState: sub.getConnectionState(),
          iceConnectionState: sub.getICEConnectionState(),
          signallingState: sub.getSignallingState(),
        };
        (info.RTCIceCandidateStats as any).subscriber = await this.getSubscriberRTCIceCandidateStats();
      }
      return JSON.stringify(
        info,
        null,
        2
      );
    };
    this.dialog.open(InfoDialogComponent, {
      data: {
        title: 'PCTransports info',
        updateFunction,
        updateInterval: 0,
      },
      minWidth: '50vh',
    });
  }

  getPublisherPC(): PCTransport | undefined {
    return this.room?.localParticipant.engine.pcManager?.publisher;
  }

  getSubscriberPC(): PCTransport | undefined {
    return this.room?.localParticipant.engine.pcManager?.subscriber;
  }

  async getPublisherRTCIceCandidateStats() {
    return this.getRTCIceCandidateStats(this.getPublisherPC()!);
  }

  async getSubscriberRTCIceCandidateStats() {
    return this.getRTCIceCandidateStats(this.getSubscriberPC()!);
  }

  async getRTCIceCandidateStats(pcTransport: PCTransport) {
    return new Promise(async (resolve) => {
      let selectedCandidatePairId: string = '';
      const stats: any = await new Promise((res) => {
        const reports_stats: any[] = [];
        pcTransport.getStats().then((stats: any) => {
          stats.forEach((report: any) => {
            console.log('Report Type:', report.type);
            if (report.type === 'transport') {
              if (report.selectedCandidatePairId) {
                selectedCandidatePairId = report.selectedCandidatePairId;
              }
            }
            if (report.type === 'candidate-pair') {
              if (report.selected) {
                selectedCandidatePairId = report.id;
              }
              const report_stats_object = {
                report: report,
                stats: stats,
              };
              reports_stats.push(report_stats_object);
            }
          });
          return res(reports_stats);
        });
      });
      const selectedCandidates = [] as any[];
      for (const report_stats_object of stats) {
        if (report_stats_object.report.id === selectedCandidatePairId) {
          selectedCandidates.push(
            report_stats_object.stats.get(
              report_stats_object.report.localCandidateId
            )
          );
          console.log(
            'Selected Candidate:',
            report_stats_object.stats.get(
              report_stats_object.report.localCandidateId
            )
          );
        }
      }
      return resolve(selectedCandidates);
    });
  }
}
