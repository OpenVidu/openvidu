import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';

import {
  AccessToken,
  CreateIngressOptions,
  DirectFileOutput,
  EgressClient,
  EgressInfo,
  EncodedOutputs,
  EncodingOptions,
  EncodingOptionsPreset,
  IngressClient,
  IngressInfo,
  IngressInput,
  IngressVideoEncodingPreset,
  ParticipantInfo,
  Room,
  RoomCompositeOptions,
  RoomServiceClient,
  TrackCompositeOptions,
  TrackInfo,
  TrackSource,
  VideoGrant,
} from 'livekit-server-sdk';
import { LivekitParamsService } from './livekit-params.service';

@Injectable({
  providedIn: 'root',
})
export class RoomApiService {
  private roomServiceClient: RoomServiceClient;
  private egressClient: EgressClient;
  private ingressClient: IngressClient;

  constructor(
    private http: HttpClient,
    private livekitParamsService: LivekitParamsService
  ) {
    this.roomServiceClient = new RoomServiceClient(
      this.getRestUrl(),
      this.livekitParamsService.getParams().livekitApiKey,
      this.livekitParamsService.getParams().livekitApiSecret
    );
    this.egressClient = new EgressClient(
      this.getRestUrl(),
      this.livekitParamsService.getParams().livekitApiKey,
      this.livekitParamsService.getParams().livekitApiSecret
    );
    this.ingressClient = new IngressClient(
      this.getRestUrl(),
      this.livekitParamsService.getParams().livekitApiKey,
      this.livekitParamsService.getParams().livekitApiSecret
    );
  }

  async createToken(
    permissions: VideoGrant,
    participantName?: string,
    roomName?: string
  ): Promise<string> {
    const at = new AccessToken(
      this.livekitParamsService.getParams().livekitApiKey,
      this.livekitParamsService.getParams().livekitApiSecret,
      { identity: participantName }
    );
    if (roomName) {
      permissions.room = roomName;
    }
    at.addGrant(permissions);
    return at.toJwt();
  }

  /*
   * RoomService API
   * https://docs.livekit.io/reference/server/server-apis/
   */

  async listRooms(): Promise<Room[]> {
    return this.roomServiceClient.listRooms();
  }

  async deleteRoom(roomName: string): Promise<void> {
    return await this.roomServiceClient.deleteRoom(roomName);
  }

  async listParticipants(roomName: string): Promise<ParticipantInfo[]> {
    return await this.roomServiceClient.listParticipants(roomName);
  }

  async getParticipant(
    roomName: string,
    participantIdentity: string
  ): Promise<ParticipantInfo> {
    return await this.roomServiceClient.getParticipant(
      roomName,
      participantIdentity
    );
  }

  async removeParticipant(
    roomName: string,
    participantIdentity: string
  ): Promise<void> {
    return await this.roomServiceClient.removeParticipant(
      roomName,
      participantIdentity
    );
  }

  async mutePublishedTrack(
    roomName: string,
    participantIdentity: string,
    track_sid: string,
    muted: boolean
  ): Promise<TrackInfo> {
    return await this.roomServiceClient.mutePublishedTrack(
      roomName,
      participantIdentity,
      track_sid,
      muted
    );
  }

  async listEgress(): Promise<EgressInfo[]> {
    return await this.egressClient.listEgress({});
  }

  async startRoomCompositeEgress(
    roomName: string,
    roomCompositeOptions: RoomCompositeOptions,
    encodedOutputs: EncodedOutputs,
    encodingOptions?: EncodingOptionsPreset | EncodingOptions
  ): Promise<EgressInfo> {
    if (encodedOutputs.file) {
      encodedOutputs.file.filepath = 'RoomComposite-{room_id}-{room_name}-{time}';
    }
    if (encodingOptions) {
      roomCompositeOptions.encodingOptions = encodingOptions;
    }
    return await this.egressClient.startRoomCompositeEgress(
      roomName,
      encodedOutputs,
      roomCompositeOptions
    );
  }

  async startTrackCompositeEgress(
    roomName: string,
    audioTrackId: string,
    videoTrackId: string,
    encodedOutputs: EncodedOutputs,
    encodingOptions?: EncodingOptionsPreset | EncodingOptions
  ): Promise<EgressInfo> {
    if (encodedOutputs.file) {
      encodedOutputs.file.filepath =
        'TrackComposite-{room_id}-{room_name}-{time}-{publisher_identity}';
    }
    const trackCompositeOptions: TrackCompositeOptions = {
      audioTrackId,
      videoTrackId,
    };
    if (encodingOptions) {
      trackCompositeOptions.encodingOptions = encodingOptions;
    }
    return await this.egressClient.startTrackCompositeEgress(
      roomName,
      encodedOutputs,
      trackCompositeOptions
    );
  }

  async startTrackEgress(
    roomName: string,
    track_id: string,
    output?: DirectFileOutput | string
  ): Promise<EgressInfo> {
    if (!output) {
      let outputAux = {
        filepath:
          'Track-{room_id}-{room_name}-{time}-{publisher_identity}-{track_id}-{track_type}-{track_source}',
      };
      output = outputAux as DirectFileOutput;
    }
    return await this.egressClient.startTrackEgress(roomName, output, track_id);
  }

  async stopEgress(egressId: string): Promise<EgressInfo> {
    return await this.egressClient.stopEgress(egressId);
  }

  async listIngress(): Promise<IngressInfo[]> {
    const ingressClient: IngressClient = new IngressClient(
      this.getRestUrl(),
      this.livekitParamsService.getParams().livekitApiKey,
      this.livekitParamsService.getParams().livekitApiSecret
    );
    return await ingressClient.listIngress({});
  }

  async createIngress(
    room_name: string,
    input_type: IngressInput
  ): Promise<IngressInfo> {
    const ingressClient: IngressClient = new IngressClient(
      this.getRestUrl(),
      this.livekitParamsService.getParams().livekitApiKey,
      this.livekitParamsService.getParams().livekitApiSecret
    );
    let options: CreateIngressOptions = {
      name: input_type + '-' + room_name,
      roomName: room_name,
      participantIdentity: 'IngressParticipantIdentity',
      participantName: 'MyIngress',
      participantMetadata: 'IngressParticipantMetadata',
      url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      // video: {
      //     encodingOptions: {
      //       video_codec: VideoCodec.VP8,
      //       frame_rate: 30,
      //       layers: [
      //         {
      //           quality: VideoQuality.HIGH,
      //           width: 1920,
      //           height: 1080,
      //           bitrate: 4500000,
      //         },
      //       ],
      //     },
      //   } as any,
      video: {
        name: 'pelicula',
        source: TrackSource.SCREEN_SHARE,
        encodingOptions: {
          case: 'preset',
          value:
            IngressVideoEncodingPreset.H264_540P_25FPS_2_LAYERS_HIGH_MOTION,
        },
      } as any,
      // audio: {
      //     source: TrackSource.MICROPHONE,
      //     preset: IngressAudioEncodingPreset.OPUS_MONO_64KBS,
      // } as any,
    };
    const ingressInfo = await ingressClient.createIngress(input_type, options);
    return ingressInfo;
  }

  async deleteIngress(ingressId: string): Promise<IngressInfo> {
    const ingressClient: IngressClient = new IngressClient(
      this.getRestUrl(),
      this.livekitParamsService.getParams().livekitApiKey,
      this.livekitParamsService.getParams().livekitApiSecret
    );
    return await ingressClient.deleteIngress(ingressId);
  }

  private getRestUrl() {
    const wsUrl = this.livekitParamsService.getParams().livekitUrl;
    const protocol =
      wsUrl.startsWith('wss:') || wsUrl.startsWith('https:') ? 'https' : 'http';
    return `${protocol}://${wsUrl
      .substring(wsUrl.indexOf('//') + 2)
      .replace(/\/$/, '')}`;
  }
}
