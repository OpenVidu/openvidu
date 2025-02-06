import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, Inject, inject } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VideoCodec } from '@livekit/protocol';
import { LocalParticipant } from 'livekit-client';

import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodedOutputs,
  IngressInfo,
  IngressInput,
  IngressVideoEncodingPreset,
  Room,
  RoomCompositeOptions,
  RoomServiceClient,
  SegmentedFileOutput,
  SegmentedFileProtocol,
  StreamOutput,
  StreamProtocol,
} from 'livekit-server-sdk';
import {
  DEFAULT_URI_HTTP_ONLY_AUDIO,
  DEFAULT_URI_HTTP_ONLY_VIDEO,
  DEFAULT_URI_HTTP_VIDEO_AUDIO,
  DEFAULT_URI_RTSP,
  DEFAULT_URI_SRT,
  RoomApiService,
} from 'src/app/services/room-api.service';

@Component({
  selector: 'app-room-api-dialog',
  templateUrl: './room-api-dialog.component.html',
  styleUrls: ['./room-api-dialog.component.css'],
})
export class RoomApiDialogComponent {
  room: Room;
  localParticipant: LocalParticipant;
  roomServiceClient: RoomServiceClient;
  egressClient: EgressClient;

  apiRoomName: string;
  apiParticipantIdentity: string;
  apiTrackSid: string;
  muteTrack: boolean = true;

  egressRoomName: string;
  egressId: string;
  audioTrackId: string;
  videoTrackId: string;

  ROOM_COMPOSITE_LAYOUTS = ['grid', 'speaker', 'single-speaker'];
  roomCompositeLayoutSelected: string = 'grid';
  roomCompositeAudioOnly: boolean = false;
  roomCompositeVideoOnly: boolean = false;

  fileOutputSelected: boolean = true;
  streamOutputSelected: boolean = false;
  s3Endpoint: string = 'http://localhost:9100'; // 'http://minio:9000'
  rtmpUrls: string[] = ['rtmp://172.17.0.1:1936/live/'];
  segmentOutputSelected: boolean = false;
  segmentDuration: number = 6;

  ingressRoomName: string;
  ingressId: string;
  inputTypeSelected: IngressInput = IngressInput.URL_INPUT;
  ingressWithVideo: boolean = true;
  ingressWithAudio: boolean = false;
  ingressVideoCodecSelected: VideoCodec = VideoCodec.H264_BASELINE;
  ingressSimulcast: boolean = true;
  ingressEnableTranscoding: boolean = false;
  ingressVideoEncodingPresetSelected?: IngressVideoEncodingPreset = undefined;

  INGRESS_URL_TYPES: string[] = ['HTTP', 'SRT', 'RTSP'];
  ingressUrlType: string = 'HTTP';
  ingressUrlUri: string;

  response: string;

  INGRESS_INPUT_TYPES: { value: IngressInput; viewValue: string }[] = [
    { value: IngressInput.URL_INPUT, viewValue: 'URL' },
    { value: IngressInput.RTMP_INPUT, viewValue: 'RTMP' },
    { value: IngressInput.WHIP_INPUT, viewValue: 'WHIP' },
  ];
  INGRESS_VIDEO_CODECS: { value: VideoCodec; viewValue: string }[] = [
    { value: VideoCodec.H264_BASELINE, viewValue: 'H264' },
    { value: VideoCodec.VP8, viewValue: 'VP8' },
  ];
  INGRESS_VIDEO_ENCODING_PRESETS: {
    value: IngressInput | undefined;
    viewValue: string;
  }[] = [{ value: undefined, viewValue: 'undefined' }].concat(
    Object.keys(IngressVideoEncodingPreset)
      .filter((key) => isNaN(Number(key)))
      .map((key) => {
        return {
          value: IngressVideoEncodingPreset[key as any],
          viewValue: key.toString(),
        } as any;
      })
  );

  // s3Config = {
  //     endpoint: this.s3Endpoint,
  //     metadata: { "mytag": "myvalue" },
  //     tagging: "mytagging"
  // };

  announcer = inject(LiveAnnouncer);
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  constructor(
    private roomApiService: RoomApiService,
    public dialogRef: MatDialogRef<RoomApiDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.room = data.room;
    this.localParticipant = data.localParticipant;
    this.apiRoomName = this.room?.name;
    this.apiParticipantIdentity = this.localParticipant?.identity;
    this.apiTrackSid = this.localParticipant?.videoTrackPublications
      .values()
      .next().value?.trackSid!;
    this.egressRoomName = this.room?.name;
    this.audioTrackId = this.localParticipant?.audioTrackPublications
      .values()
      .next().value?.trackSid!;
    this.videoTrackId = this.localParticipant?.videoTrackPublications
      .values()
      .next().value?.trackSid!;
    this.ingressRoomName = this.room?.name;
  }

  async listRooms() {
    console.log('Listing rooms');
    try {
      const rooms = await this.roomApiService.listRooms();
      this.response = JSON.stringify(rooms, null, 4);
    } catch (error: any) {
      this.response = error;
    }
  }

  async deleteRoom() {
    console.log('Deleting room');
    try {
      await this.roomApiService.deleteRoom(this.apiRoomName);
      this.response = 'Room deleted';
    } catch (error: any) {
      this.response = error;
      console.log(JSON.stringify(error));
    }
  }

  async deleteAllRooms() {
    console.log('Deleting all rooms');
    try {
      const promises: Promise<void>[] = [];
      const rooms = await this.roomApiService.listRooms();
      rooms.forEach((r) => {
        promises.push(this.roomApiService.deleteRoom(r.name));
      });
      await Promise.all(promises);
      this.response = 'Deleted ' + promises.length + ' rooms';
    } catch (error: any) {
      this.response = error;
    }
  }

  async listParticipants() {
    console.log('Listing participants');
    try {
      const participants = await this.roomApiService.listParticipants(
        this.apiRoomName
      );
      this.response = JSON.stringify(participants, null, 4);
    } catch (error: any) {
      this.response = error;
    }
  }

  async getParticipant() {
    console.log('Getting participant');
    try {
      const participant = await this.roomApiService.getParticipant(
        this.apiRoomName,
        this.apiParticipantIdentity
      );
      this.response = JSON.stringify(participant, null, 4);
    } catch (error: any) {
      this.response = error;
    }
  }

  async removeParticipant() {
    console.log('Removing participant');
    try {
      await this.roomApiService.removeParticipant(
        this.apiRoomName,
        this.apiParticipantIdentity
      );
      this.response = 'Participant removed';
    } catch (error: any) {
      this.response = error;
    }
  }

  async mutePublishedTrack() {
    console.log(`${this.muteTrack ? 'Muting' : 'Unmuting'} track`);
    try {
      await this.roomApiService.mutePublishedTrack(
        this.apiRoomName,
        this.apiParticipantIdentity,
        this.apiTrackSid,
        this.muteTrack
      );
      this.response = `Track ${this.muteTrack ? 'muted' : 'unmuted'}`;
      this.muteTrack = !this.muteTrack;
    } catch (error: any) {
      this.response = error;
    }
  }

  async listEgress() {
    console.log('Listing egress');
    try {
      const egress = await this.roomApiService.listEgress();
      this.response = JSON.stringify(egress, null, 4);
    } catch (error: any) {
      this.response = error;
    }
  }

  async startRoomCompositeEgress() {
    console.log('Starting room composite egress');
    try {
      const encodedOutputs = this.getEncodedOutputs();
      const roomCompositeOptions: RoomCompositeOptions = {
        layout: this.roomCompositeLayoutSelected,
        audioOnly: this.roomCompositeAudioOnly,
        videoOnly: this.roomCompositeVideoOnly,
      };
      const egress = await this.roomApiService.startRoomCompositeEgress(
        this.egressRoomName,
        roomCompositeOptions,
        encodedOutputs
      );
      this.response = JSON.stringify(egress, null, 4);
      this.egressId = egress.egressId;
    } catch (error: any) {
      this.response = error;
    }
  }

  async startTrackCompositeEgress() {
    console.log('Starting track composite egress');
    try {
      const encodedOutputs = this.getEncodedOutputs();
      const egress = await this.roomApiService.startTrackCompositeEgress(
        this.egressRoomName,
        this.audioTrackId,
        this.videoTrackId,
        encodedOutputs
      );
      this.response = JSON.stringify(egress, null, 4);
      this.egressId = egress.egressId;
    } catch (error: any) {
      this.response = error;
    }
  }

  async startTrackEgress() {
    console.log('Starting track egress');
    try {
      const egress = await this.roomApiService.startTrackEgress(
        this.egressRoomName,
        !!this.audioTrackId ? this.audioTrackId : this.videoTrackId
      );
      this.response = JSON.stringify(egress, null, 4);
      this.egressId = egress.egressId;
    } catch (error: any) {
      this.response = error;
    }
  }

  async stopEgress() {
    console.log('Stopping egress');
    try {
      await this.roomApiService.stopEgress(this.egressId);
      this.response = 'Egress stopped';
    } catch (error: any) {
      this.response = error;
    }
  }

  async listIngress() {
    console.log('Listing ingress');
    try {
      const ingress = await this.roomApiService.listIngress();
      this.response = JSON.stringify(ingress, null, 4);
    } catch (error: any) {
      this.response = error;
    }
  }

  async createIngress() {
    console.log('Creating ingress');
    try {
      const ingress = await this.roomApiService.createIngress(
        this.ingressRoomName,
        this.inputTypeSelected,
        this.ingressUrlType,
        this.ingressUrlUri,
        this.ingressWithAudio,
        this.ingressWithVideo,
        this.ingressVideoCodecSelected,
        this.ingressSimulcast,
        this.ingressEnableTranscoding,
        this.ingressVideoEncodingPresetSelected
      );
      this.response = JSON.stringify(ingress, null, 4);
      this.ingressId = ingress.ingressId;
    } catch (error: any) {
      this.response = error;
      console.warn(error);
      console.warn(error.code);
      console.warn(error.msg);
    }
  }

  async deleteIngress() {
    console.log('Deleting ingress');
    try {
      await this.roomApiService.deleteIngress(this.ingressId);
      this.response = 'Ingress deleted';
    } catch (error: any) {
      this.response = error;
    }
  }

  async deleteAllIngress() {
    console.log('Deleting all ingress');
    try {
      const promises: Promise<IngressInfo>[] = [];
      const ingresses = await this.roomApiService.listIngress();
      ingresses.forEach((i) => {
        promises.push(this.roomApiService.deleteIngress(i.ingressId));
      });
      await Promise.all(promises);
      this.response = 'Deleted ' + promises.length + ' ingresses';
    } catch (error: any) {
      this.response = error;
    }
  }

  addRtmpUrl(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.rtmpUrls.push(value);
    }
    event.chipInput!.clear();
  }

  removeRtmpUrl(url: string): void {
    const index = this.rtmpUrls.indexOf(url);
    if (index >= 0) {
      this.rtmpUrls.splice(index, 1);
      this.announcer.announce(`Removed ${url}`);
    }
  }

  private getEncodedOutputs(): EncodedOutputs {
    // this.s3Config.endpoint = this.s3Endpoint;
    const encodedOutputs: EncodedOutputs = {};
    if (this.fileOutputSelected) {
      encodedOutputs.file = new EncodedFileOutput({
        fileType: EncodedFileType.DEFAULT_FILETYPE,
        filepath: 'room-composite-{room_id}-{room_name}-{time}',
      });
    }
    if (this.streamOutputSelected) {
      encodedOutputs.stream = new StreamOutput({
        urls: this.rtmpUrls,
        protocol: StreamProtocol.RTMP,
      });
    }
    if (this.segmentOutputSelected) {
      encodedOutputs.segments = new SegmentedFileOutput({
        protocol: SegmentedFileProtocol.HLS_PROTOCOL,
        segmentDuration: this.segmentDuration,
        // s3: this.s3Config
      });
    }
    return encodedOutputs;
  }
}
