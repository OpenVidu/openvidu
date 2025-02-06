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
  VideoGrant,
} from 'livekit-server-sdk';
import { LivekitParamsService } from './livekit-params.service';
import { VideoQuality } from 'livekit-client';
import {
  IngressVideoEncodingOptions,
  VideoCodec,
  VideoLayer,
} from '@livekit/protocol';

export const DEFAULT_URI_HTTP_VIDEO_AUDIO =
  'https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_1080p_60fps_normal.mp4';
export const DEFAULT_URI_HTTP_ONLY_VIDEO =
  'https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_1080p_60fps_normal_noaudio.mp4';
export const DEFAULT_URI_HTTP_ONLY_AUDIO =
  'https://s3.eu-west-1.amazonaws.com/public.openvidu.io/bbb_sunflower_1080p_60fps_normal_onlyaudio.mp3';
export const DEFAULT_URI_RTSP = 'rtsp://127.0.0.1:8554/live';
export const DEFAULT_URI_SRT = 'srt://127.0.0.1:8554/';

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
      encodedOutputs.file.filepath =
        'RoomComposite-{room_id}-{room_name}-{time}';
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
    inputType: IngressInput,
    urlInputType: string,
    urlUri: string,
    withAudio: boolean,
    withVideo: boolean,
    codec: VideoCodec,
    simulcast: boolean,
    enableTranscoding: boolean,
    preset?: IngressVideoEncodingPreset
  ): Promise<IngressInfo> {
    let url;
    if (inputType === IngressInput.URL_INPUT) {
      if (urlUri) {
        url = urlUri;
      } else {
        switch (urlInputType) {
          case 'HTTP':
            if (withVideo && withAudio) {
              url = DEFAULT_URI_HTTP_VIDEO_AUDIO;
            } else {
              if (withVideo) {
                url = DEFAULT_URI_HTTP_ONLY_VIDEO;
              } else {
                url = DEFAULT_URI_HTTP_ONLY_AUDIO;
              }
            }
            break;
          case 'SRT':
            url = DEFAULT_URI_SRT;
            break;
          case 'RTSP':
            url = DEFAULT_URI_RTSP;
            break;
          default:
            const errorMsg = 'Invalid URL type';
            console.error(errorMsg);
            window.alert(errorMsg);
            throw new Error(errorMsg);
        }
      }
    }
    let options: CreateIngressOptions = {
      name: inputType + '-' + room_name,
      roomName: room_name,
      participantIdentity: 'IngressParticipantIdentity',
      participantName: 'MyIngress',
      participantMetadata: 'IngressParticipantMetadata',
      url,
    };
    if (inputType === IngressInput.WHIP_INPUT) {
      options.enableTranscoding = enableTranscoding;
    }
    if (inputType != IngressInput.WHIP_INPUT || enableTranscoding) {
      options.video = {
        encodingOptions: {
          case: preset != undefined ? 'preset' : 'options',
          value: {},
        },
      } as any;
      if (preset != undefined) {
        options.video!.encodingOptions.value = preset;
      } else {
        const encodingOptions = options.video!.encodingOptions
          .value! as IngressVideoEncodingOptions;
        encodingOptions.videoCodec = codec;
        encodingOptions.frameRate = 30;
        let layers: VideoLayer[] = [];
        if (simulcast) {
          layers = [
            {
              quality: VideoQuality.HIGH,
              width: 1920,
              height: 1080,
            },
            {
              quality: VideoQuality.MEDIUM,
              width: 1280,
              height: 720,
            },
            {
              quality: VideoQuality.LOW,
              width: 640,
              height: 360,
            },
          ] as VideoLayer[];
        } else {
          layers = [
            {
              quality: VideoQuality.HIGH,
              width: 1920,
              height: 1080,
            } as VideoLayer,
          ];
        }
        encodingOptions.layers = layers;
      }
    }
    const ingressInfo = await this.ingressClient.createIngress(
      inputType,
      options
    );
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
