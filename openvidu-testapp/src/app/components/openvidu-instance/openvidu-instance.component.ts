import { Component, HostListener, Input } from '@angular/core';

import { RoomConf } from '../test-sessions/test-sessions.component';
import { LivekitParamsService } from 'src/app/services/livekit-params.service';

import {
  ConnectionQuality,
  ConnectionState,
  CreateLocalTracksOptions,
  DataPacket_Kind,
  DataPublishOptions,
  DisconnectReason,
  LocalAudioTrack,
  LocalParticipant,
  LocalTrack,
  LocalTrackPublication,
  LocalVideoTrack,
  MediaDeviceFailure,
  Participant,
  RemoteAudioTrack,
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
  TrackPublication,
  TrackPublishOptions,
} from 'livekit-client';
import { ParticipantPermission } from 'livekit-server-sdk';
import {
  TestAppEvent,
  TestFeedService,
} from 'src/app/services/test-feed.service';
import { RoomEventCallbacks } from 'livekit-client/dist/src/room/Room';
import { MatDialog } from '@angular/material/dialog';
import { RoomApiDialogComponent } from '../dialogs/room-api-dialog/room-api-dialog.component';
import { RoomApiService } from 'src/app/services/room-api.service';
import { EventsDialogComponent } from '../dialogs/events-dialog/events-dialog.component';
import { OptionsDialogComponent } from '../dialogs/options-dialog/options-dialog.component';
import PCTransport from 'livekit-client/dist/src/room/PCTransport';
import { InfoDialogComponent } from '../dialogs/info-dialog/info-dialog.component';

@Component({
  selector: 'app-openvidu-instance',
  templateUrl: './openvidu-instance.component.html',
  styleUrls: ['./openvidu-instance.component.css'],
  standalone: false,
})
export class OpenviduInstanceComponent {
  @Input()
  roomConf: RoomConf;

  @Input()
  index: number;

  room?: Room;
  roomEvents: Map<RoomEvent, Boolean> = new Map<RoomEvent, boolean>();

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

  constructor(
    private livekitParamsService: LivekitParamsService,
    private testFeedService: TestFeedService,
    private roomApiService: RoomApiService,
    private dialog: MatDialog
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
    this.participantName += this.index;
    if (this.roomConf.startSession) {
      const token = await this.roomApiService.createToken(
        { roomJoin: true },
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
        { roomJoin: true },
        this.participantName,
        this.roomName
      )
    );
  }

  async connectRoom(token: string): Promise<void> {
    // creates a new room with options
    this.room = new Room(this.roomOptions);

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

  setupRoomEventListeners(oldValues: Map<string, boolean>, firstTime: boolean) {
    // This is a link to the complete list of Room events
    let callbacks: RoomEventCallbacks;
    let events: RoomEvent;

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Connected) !==
      oldValues.get(RoomEvent.Connected)
    ) {
      this.room?.removeAllListeners(RoomEvent.Connected);
      if (this.roomEvents.get(RoomEvent.Connected)) {
        this.room!.on(RoomEvent.Connected, () => {
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
      this.room?.removeAllListeners(RoomEvent.Reconnecting);
      if (this.roomEvents.get(RoomEvent.Reconnecting)) {
        this.room!.on(RoomEvent.Reconnecting, () => {
          this.updateEventList(RoomEvent.Reconnecting, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Reconnected) !==
      oldValues.get(RoomEvent.Reconnected)
    ) {
      this.room?.removeAllListeners(RoomEvent.Reconnected);
      if (this.roomEvents.get(RoomEvent.Reconnected)) {
        this.room!.on(RoomEvent.Reconnected, () => {
          this.updateEventList(RoomEvent.Reconnected, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.Disconnected) !==
      oldValues.get(RoomEvent.Disconnected)
    ) {
      this.room?.removeAllListeners(RoomEvent.Disconnected);
      if (this.roomEvents.get(RoomEvent.Disconnected)) {
        this.room!.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
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
      this.room?.removeAllListeners(RoomEvent.ConnectionStateChanged);
      if (this.roomEvents.get(RoomEvent.ConnectionStateChanged)) {
        this.room!.on(
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
      this.roomEvents.get(RoomEvent.MediaDevicesChanged) !==
      oldValues.get(RoomEvent.MediaDevicesChanged)
    ) {
      this.room?.removeAllListeners(RoomEvent.MediaDevicesChanged);
      if (this.roomEvents.get(RoomEvent.MediaDevicesChanged)) {
        this.room!.on(RoomEvent.MediaDevicesChanged, () => {
          this.updateEventList(RoomEvent.MediaDevicesChanged, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.ParticipantConnected) !==
      oldValues.get(RoomEvent.ParticipantConnected)
    ) {
      this.room?.removeAllListeners(RoomEvent.ParticipantConnected);
      if (this.roomEvents.get(RoomEvent.ParticipantConnected)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.ParticipantActive);
      if (this.roomEvents.get(RoomEvent.ParticipantActive)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.ParticipantDisconnected);
      if (this.roomEvents.get(RoomEvent.ParticipantDisconnected)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.TrackPublished);
      if (this.roomEvents.get(RoomEvent.TrackPublished)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.TrackSubscribed);
      if (this.roomEvents.get(RoomEvent.TrackSubscribed)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.TrackSubscriptionFailed);
      if (this.roomEvents.get(RoomEvent.TrackSubscriptionFailed)) {
        this.room!.on(
          RoomEvent.TrackSubscriptionFailed,
          (
            trackSid: string,
            participant: RemoteParticipant,
            reason?: SubscriptionError
          ) => {
            this.updateEventList(
              RoomEvent.TrackSubscriptionFailed,
              { trackSid, participant },
              `${participant.identity} (${trackSid}). Reason: ${reason ? SubscriptionError[reason] : reason
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
      this.room?.removeAllListeners(RoomEvent.TrackUnpublished);
      if (this.roomEvents.get(RoomEvent.TrackUnpublished)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.TrackUnsubscribed);
      if (this.roomEvents.get(RoomEvent.TrackUnsubscribed)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.TrackMuted);
      if (this.roomEvents.get(RoomEvent.TrackMuted)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.TrackUnmuted);
      if (this.roomEvents.get(RoomEvent.TrackUnmuted)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.LocalTrackPublished);
      if (this.roomEvents.get(RoomEvent.LocalTrackPublished)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.LocalTrackUnpublished);
      if (this.roomEvents.get(RoomEvent.LocalTrackUnpublished)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.LocalAudioSilenceDetected);
      if (this.roomEvents.get(RoomEvent.LocalAudioSilenceDetected)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.ParticipantMetadataChanged);
      if (this.roomEvents.get(RoomEvent.ParticipantMetadataChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.ParticipantNameChanged);
      if (this.roomEvents.get(RoomEvent.ParticipantNameChanged)) {
        this.room!.on(
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
      this.roomEvents.get(RoomEvent.ParticipantPermissionsChanged) !==
      oldValues.get(RoomEvent.ParticipantPermissionsChanged)
    ) {
      this.room?.removeAllListeners(RoomEvent.ParticipantPermissionsChanged);
      if (this.roomEvents.get(RoomEvent.ParticipantPermissionsChanged)) {
        this.room!.on(
          RoomEvent.ParticipantPermissionsChanged,
          (
            prevPermissions: ParticipantPermission | undefined,
            participant: RemoteParticipant | LocalParticipant
          ) => {
            this.updateEventList(
              RoomEvent.ParticipantPermissionsChanged,
              { prevPermissions, participant },
              `${participant.identity
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
      this.room?.removeAllListeners(RoomEvent.ActiveSpeakersChanged);
      if (this.roomEvents.get(RoomEvent.ActiveSpeakersChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.RoomMetadataChanged);
      if (this.roomEvents.get(RoomEvent.RoomMetadataChanged)) {
        this.room!.on(RoomEvent.RoomMetadataChanged, (metadata: string) => {
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
      this.room?.removeAllListeners(RoomEvent.DataReceived);
      if (this.roomEvents.get(RoomEvent.DataReceived)) {
        this.room!.on(
          RoomEvent.DataReceived,
          (
            payload: Uint8Array,
            participant?: RemoteParticipant,
            kind?: DataPacket_Kind,
            topic?: string
          ) => {
            const decodedPayload = this.decoder.decode(payload);
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
      this.roomEvents.get(RoomEvent.ConnectionQualityChanged) !==
      oldValues.get(RoomEvent.ConnectionQualityChanged)
    ) {
      this.room?.removeAllListeners(RoomEvent.ConnectionQualityChanged);
      if (this.roomEvents.get(RoomEvent.ConnectionQualityChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.MediaDevicesError);
      if (this.roomEvents.get(RoomEvent.MediaDevicesError)) {
        this.room!.on(RoomEvent.MediaDevicesError, (error: Error) => {
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
      this.room?.removeAllListeners(RoomEvent.TrackStreamStateChanged);
      if (this.roomEvents.get(RoomEvent.TrackStreamStateChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(
        RoomEvent.TrackSubscriptionPermissionChanged
      );
      if (this.roomEvents.get(RoomEvent.TrackSubscriptionPermissionChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.TrackSubscriptionStatusChanged);
      if (this.roomEvents.get(RoomEvent.TrackSubscriptionStatusChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.AudioPlaybackStatusChanged);
      if (this.roomEvents.get(RoomEvent.AudioPlaybackStatusChanged)) {
        this.room!.on(
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
      this.roomEvents.get(RoomEvent.SignalConnected) !==
      oldValues.get(RoomEvent.SignalConnected)
    ) {
      this.room?.removeAllListeners(RoomEvent.SignalConnected);
      if (this.roomEvents.get(RoomEvent.SignalConnected)) {
        this.room!.on(RoomEvent.SignalConnected, () => {
          this.updateEventList(RoomEvent.SignalConnected, {}, '');
        });
      }
    }

    if (
      firstTime ||
      this.roomEvents.get(RoomEvent.RecordingStatusChanged) !==
      oldValues.get(RoomEvent.RecordingStatusChanged)
    ) {
      this.room?.removeAllListeners(RoomEvent.RecordingStatusChanged);
      if (this.roomEvents.get(RoomEvent.RecordingStatusChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(
        RoomEvent.ParticipantEncryptionStatusChanged
      );
      if (this.roomEvents.get(RoomEvent.ParticipantEncryptionStatusChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.EncryptionError);
      if (this.roomEvents.get(RoomEvent.EncryptionError)) {
        this.room!.on(RoomEvent.EncryptionError, (error: Error) => {
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
      this.room?.removeAllListeners(RoomEvent.DCBufferStatusChanged);
      if (this.roomEvents.get(RoomEvent.DCBufferStatusChanged)) {
        this.room!.on(
          RoomEvent.DCBufferStatusChanged,
          (isLow: boolean, kind: DataPacket_Kind) => {
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
      this.room?.removeAllListeners(RoomEvent.ActiveDeviceChanged);
      if (this.roomEvents.get(RoomEvent.ActiveDeviceChanged)) {
        this.room!.on(
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
      this.room?.removeAllListeners(RoomEvent.LocalTrackSubscribed);
      if (this.roomEvents.get(RoomEvent.LocalTrackSubscribed)) {
        this.room!.on(
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
            this.updateEventList(
              isFinal
                ? ('finalTranscription' as any)
                : ('interimTranscription' as any),
              { participant: participantInfo.identity, message },
              `${participantInfo.identity} ${isFinal ? 'said' : 'is saying'
              }: ${message}`,
              isFinal ? 'RoomEvent' : 'RoomEvent-InterimTranscription'
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
      await this.room.disconnect();
      delete this.room;
      delete this.localTracks.audioTrack;
      delete this.localTracks.videoTrack;
      this.remoteTracks.clear();
    }
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

  openRoomEventsDialog() {
    const oldValues: Map<string, boolean> = new Map(
      JSON.parse(JSON.stringify([...this.roomEvents]))
    );

    const dialogRef = this.dialog.open(EventsDialogComponent, {
      data: {
        eventCollection: this.roomEvents,
        target: 'Session',
      },
      width: '800px',
      autoFocus: false,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (
        !!this.room &&
        JSON.stringify(Array.from(this.roomEvents.entries())) !==
        JSON.stringify(Array.from(oldValues.entries()))
      ) {
        this.setupRoomEventListeners(oldValues, false);
      }
    });
  }

  sendData(destinationIdentity?: string) {
    let strData = `Message from ${this.room?.localParticipant.identity}`;
    strData += destinationIdentity
      ? ` to ${destinationIdentity}`
      : ' to all room';
    const data = new TextEncoder().encode(strData);
    let options: DataPublishOptions = {
      reliable: true,
    };
    if (destinationIdentity) {
      options.destinationIdentities = [destinationIdentity];
    }
    this.room?.localParticipant.publishData(data, options);
  }

  openInfoDialog() {
    const updateFunction = async (): Promise<string> => {
      const pub: PCTransport = this.getPublisherPC()!;
      const sub: PCTransport = this.getSubscriberPC()!;
      return JSON.stringify(
        {
          PCTransports: {
            publisher: {
              connectedAddress: await pub.getConnectedAddress(),
              connectionState: pub.getConnectionState(),
              iceConnectionState: pub.getICEConnectionState(),
              signallingState: pub.getSignallingState(),
            },
            subscriber: {
              connectedAddress: await sub.getConnectedAddress(),
              connectionState: sub.getConnectionState(),
              iceConnectionState: sub.getICEConnectionState(),
              signallingState: sub.getSignallingState(),
            },
          },
          RTCIceCandidateStats: {
            publisher: await this.getPublisherRTCIceCandidateStats(),
            subscriber: await this.getSubscriberRTCIceCandidateStats(),
          },
        },
        null,
        2
      );
    };
    this.dialog.open(InfoDialogComponent, {
      data: {
        title: 'PCTransports info',
        updateFunction,
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
