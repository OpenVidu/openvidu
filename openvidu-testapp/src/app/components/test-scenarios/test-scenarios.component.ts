import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import {
  TestAppEvent,
  TestFeedService,
} from '../../services/test-feed.service';

import {
  CreateLocalTracksOptions,
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
  RoomConnectOptions,
  RoomEvent,
  RoomOptions,
  LocalTrack,
  TrackPublishOptions,
  ParticipantEvent,
  LocalTrackPublication,
  RemoteTrack,
} from 'livekit-client';
import { LivekitParamsService } from 'src/app/services/livekit-params.service';
import { RoomApiService } from 'src/app/services/room-api.service';
import stringify from 'json-stringify-safe';
import { MatDialog } from '@angular/material/dialog';
import { OptionsDialogComponent } from '../dialogs/options-dialog/options-dialog.component';

export interface User {
  subscriber: boolean;
  publisher: boolean;
  room: Room;
  localTracks: {
    audio?: LocalAudioTrack;
    video?: LocalVideoTrack;
  };
}

@Component({
  selector: 'app-test-scenarios',
  templateUrl: './test-scenarios.component.html',
  styleUrls: ['./test-scenarios.component.css'],
})
export class TestScenariosComponent implements OnInit, OnDestroy {
  fixedRoomId = 'SCENARIO_TEST';

  openviduUrl: string;
  openviduSecret: string;

  scenarioPlaying = false;

  eventsInfoSubscription: Subscription;

  MtoM = 2;
  NofNtoM = 1;
  MofNtoM = 4;

  users: User[] = [];

  roomOptions: RoomOptions;
  roomConnectOptions: RoomConnectOptions = {
    autoSubscribe: false,
  };
  createLocalTracksOptions: CreateLocalTracksOptions = {
    video: {
      resolution: {
        frameRate: 6,
        height: 144,
        width: 256,
      },
    },
    audio: true,
  };
  trackPublishOptions: TrackPublishOptions;

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

  ngOnInit() {
    (window as any).myEvents = '';
    this.eventsInfoSubscription = this.testFeedService.newLastEvent$.subscribe(
      (newEvent) => {
        (window as any).myEvents += '<br>' + stringify(newEvent);
      }
    );
  }

  ngOnDestroy() {
    this.endScenario();
    this.eventsInfoSubscription.unsubscribe();
  }

  loadScenario(subsPubs: number, pubs: number, subs: number): void {
    this.users = [];
    this.loadSubsPubs(subsPubs);
    this.loadPubs(pubs);
    this.loadSubs(subs);
    this.startSession();
    this.scenarioPlaying = true;
  }

  async endScenario() {
    await Promise.all(this.users.map((user) => user.room.disconnect()));
    try {
      await this.roomApiService.deleteRoom(this.fixedRoomId);
    } catch (error: any) {
      console.error(JSON.stringify(error));
    }
    this.users = [];
    this.scenarioPlaying = false;
  }

  private loadSubsPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscriber: true,
        publisher: true,
        room: new Room(this.roomOptions),
        localTracks: {
          audio: undefined,
          video: undefined,
        },
      });
    }
  }

  private loadSubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscriber: true,
        publisher: false,
        room: new Room(this.roomOptions),
        localTracks: {
          audio: undefined,
          video: undefined,
        },
      });
    }
  }

  private loadPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscriber: false,
        publisher: true,
        room: new Room(this.roomOptions),
        localTracks: {
          audio: undefined,
          video: undefined,
        },
      });
    }
  }

  private updateEventList(eventType: RoomEvent) {
    const event: TestAppEvent = {
      eventType,
      eventCategory: 'RoomEvent',
      eventContent: {},
      eventDescription: '',
    };
    this.testFeedService.pushNewEvent({ user: 0, event });
  }

  private async startSession() {
    let promises = [];
    let i = -1;
    for (const user of this.users) {
      i++;
      const promise = new Promise<void>(async (resolve) => {
        try {
          const token = await this.roomApiService.createToken(
            {
              roomJoin: true,
              canPublish: user.publisher,
              canSubscribe: user.subscriber,
            },
            `${i}`,
            this.fixedRoomId
          );
          const room: Room = user.room;

          room.on(RoomEvent.SignalConnected, () => {
            this.updateEventList(RoomEvent.SignalConnected);
          });

          room.on(RoomEvent.Connected, () => {
            this.updateEventList(RoomEvent.Connected);
            room.remoteParticipants.forEach(
              (remoteParticipant: RemoteParticipant) => {
                if (user.subscriber) {
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

          room.on(RoomEvent.ParticipantConnected, () => {
            this.updateEventList(RoomEvent.ParticipantConnected);
          });

          room.on(RoomEvent.ParticipantConnected, () => {
            this.updateEventList(RoomEvent.ParticipantConnected);
          });

          room.on(
            RoomEvent.TrackPublished,
            (publication: RemoteTrackPublication) => {
              this.updateEventList(RoomEvent.TrackPublished);
              if (user.subscriber) {
                // Subscribe to new tracks
                publication.setSubscribed(true);
              }
            }
          );

          room.on(RoomEvent.LocalTrackPublished, () => {
            this.updateEventList(RoomEvent.LocalTrackPublished);
          });

          room.on(RoomEvent.LocalTrackSubscribed, () => {
            this.updateEventList(RoomEvent.LocalTrackSubscribed);
          });

          room.on(RoomEvent.TrackSubscribed, () => {
            this.updateEventList(RoomEvent.TrackSubscribed);
          });

          room.on(RoomEvent.Disconnected, () => {
            this.updateEventList(RoomEvent.Disconnected);
          });

          await room.connect(
            this.livekitParamsService.getParams().livekitUrl,
            token,
            this.roomConnectOptions
          );
          if (user.publisher) {
            const tracks: LocalTrack[] =
              await room.localParticipant.createTracks(
                this.createLocalTracksOptions
              );
            await Promise.all(
              tracks.map((track) =>
                room.localParticipant.publishTrack(
                  track,
                  this.trackPublishOptions
                )
              )
            );
            user.localTracks.audio = tracks.find(
              (track) => track.kind === 'audio'
            ) as LocalAudioTrack;
            user.localTracks.video = tracks.find(
              (track) => track.kind === 'video'
            ) as LocalVideoTrack;
          }
          resolve();
        } catch (error) {
          console.error(error);
          resolve();
        }
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }

  openScenarioOptionsDialog() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      data: {
        roomOptions: this.roomOptions,
        createLocalTracksOptions: this.createLocalTracksOptions,
        shareScreen: false,
        trackPublishOptions: this.trackPublishOptions,
      },
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.roomOptions = result.roomOptions;
      this.createLocalTracksOptions = result.createLocalTracksOptions;
      this.trackPublishOptions = result.trackPublishOptions;
    });
  }
}
