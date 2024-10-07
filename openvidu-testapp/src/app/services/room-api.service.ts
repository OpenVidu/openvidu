import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as _ from 'lodash';

import { AccessToken, EncodedOutputs, EncodingOptions, EncodingOptionsPreset, IngressInput, RoomCompositeOptions, VideoGrant } from 'livekit-server-sdk';
import { LivekitParamsService } from './livekit-params.service';

@Injectable({
    providedIn: 'root'
})
export class RoomApiService {

    private ADMIN_PERMISSIONS: VideoGrant = {
        roomCreate: true,
        roomList: true,
        roomRecord: true,
        roomAdmin: true,
        ingressAdmin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
    };

    constructor(private http: HttpClient, private livekitParamsService: LivekitParamsService) { }

    async createToken(permissions: VideoGrant, participantName?: string, roomName?: string): Promise<string> {
        const at = new AccessToken(this.livekitParamsService.getParams().livekitApiKey, this.livekitParamsService.getParams().livekitApiSecret, { identity: participantName });
        if (roomName) {
            permissions.room = roomName;
        }
        at.addGrant(permissions);
        return at.toJwt();
    }

    private globalAdminToken(): Promise<string> {
        return this.createToken(this.ADMIN_PERMISSIONS, 'GLOBAL_ADMIN', undefined);
    }

    private roomAdminToken(roomName: string): Promise<string> {
        return this.createToken(this.ADMIN_PERMISSIONS, 'ROOM_ADMIN', roomName);
    }

    /*
     * RoomService API
     * https://docs.livekit.io/reference/server/server-apis/
     */

    async listRooms() {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('RoomService', 'ListRooms'), {}, this.getRestOptions(token)));
    }

    async getRoom(roomName: string) {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('RoomService', 'ListRooms'), { names: [roomName] }, this.getRestOptions(token)));
    }

    async deleteRoom(roomName: string) {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('RoomService', 'DeleteRoom'), { room: roomName }, this.getRestOptions(token)));
    }

    async listParticipants(roomName: string) {
        const token = await this.roomAdminToken(roomName);
        return await firstValueFrom<any>(this.http.post(this.getUrl('RoomService', 'ListParticipants'), { room: roomName }, this.getRestOptions(token)));
    }

    async getParticipant(roomName: string, participantIdentity: string) {
        const token = await this.roomAdminToken(roomName);
        return await firstValueFrom<any>(this.http.post(this.getUrl('RoomService', 'GetParticipant'), { room: roomName, identity: participantIdentity }, this.getRestOptions(token)));
    }

    async removeParticipant(roomName: string, participantIdentity: string) {
        const token = await this.roomAdminToken(roomName);
        return await firstValueFrom<any>(this.http.post(this.getUrl('RoomService', 'RemoveParticipant'), { room: roomName, identity: participantIdentity }, this.getRestOptions(token)));
    }

    async mutePublishedTrack(roomName: string, participantIdentity: string, track_sid: string, muted: boolean) {
        const token = await this.roomAdminToken(roomName);
        return await firstValueFrom<any>(this.http.post(this.getUrl('RoomService', 'MutePublishedTrack'), { room: roomName, identity: participantIdentity, track_sid, muted }, this.getRestOptions(token)));
    }

    /**
     * Egress API
     * https://docs.livekit.io/egress-ingress/egress/overview/#api
     */

    async listEgress() {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('Egress', 'ListEgress'), {}, this.getRestOptions(token)));
    }

    async getEgress(egress_id: string) {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('Egress', 'ListEgress'), { egress_id }, this.getRestOptions(token)));
    }

    // {room_id} {room_name} {time}
    async startRoomCompositeEgress(room_name: string, compositeOptions: RoomCompositeOptions, encodedOutputs: EncodedOutputs, encodingOptions?: EncodingOptionsPreset | EncodingOptions) {
        const token = await this.globalAdminToken();
        if (encodedOutputs.file) {
            encodedOutputs.file.filepath = 'track-{room_id}-{room_name}-{time}';
        }
        return await firstValueFrom<any>(this.http.post(this.getUrl('Egress', 'StartRoomCompositeEgress'), {
            room_name,
            layout: compositeOptions?.layout,
            audio_only: compositeOptions?.audioOnly,
            video_only: compositeOptions?.videoOnly,
            custom_base_url: compositeOptions?.customBaseUrl,
            file_outputs: encodedOutputs?.file ? [encodedOutputs?.file] : [],
            segment_outputs: encodedOutputs?.segments ? [encodedOutputs?.segments] : [],
            stream_outputs: encodedOutputs?.stream ? [encodedOutputs?.stream] : [],
            preset: encodingOptions
        }, this.getRestOptions(token)));
    }

    // {room_id} {room_name} {time} {publisher_identity}
    async startTrackCompositeEgress(room_name: string, audio_track_id: string, video_track_id: string, encodedOutputs: EncodedOutputs, encodingOptions?: EncodingOptionsPreset | EncodingOptions) {
        const token = await this.globalAdminToken();
        if (encodedOutputs.file) {
            encodedOutputs.file.filepath = 'track-{room_id}-{room_name}-{time}-{publisher_identity}';
        }
        return await firstValueFrom<any>(this.http.post(this.getUrl('Egress', 'StartTrackCompositeEgress'), {
            room_name,
            audio_track_id,
            video_track_id,
            file_outputs: encodedOutputs?.file ? [encodedOutputs?.file] : [],
            segment_outputs: encodedOutputs?.segments ? [encodedOutputs?.segments] : [],
            stream_outputs: encodedOutputs?.stream ? [encodedOutputs?.stream] : [],
            preset: encodingOptions
        }, this.getRestOptions(token)));
    }

    // {room_id} {room_name} {time} {publisher_identity} {track_id} {track_type} {track_source}
    async startTrackEgress(room_name: string, track_id: string, encodedOutputs: EncodedOutputs) {
        const token = await this.roomAdminToken(room_name);
        if (encodedOutputs.file) {
            encodedOutputs.file.filepath = 'track-{room_id}-{room_name}-{time}-{publisher_identity}-{track_id}-{track_type}-{track_source}';
        }
        return await firstValueFrom<any>(this.http.post(this.getUrl('Egress', 'StartTrackEgress'), {
            room_name,
            track_id,
            file: encodedOutputs?.file,
            // websocket_url: ""
        }, this.getRestOptions(token)));
    }

    async stopEgress(egress_id: string) {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('Egress', 'StopEgress'), { egress_id }, this.getRestOptions(token)));
    }

    /**
     * Ingress API
     * https://docs.livekit.io/egress-ingress/ingress/overview/#api
     */

    async listIngress() {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('Ingress', 'ListIngress'), {}, this.getRestOptions(token)));
    }

    async createIngress(room_name: string, input_type: IngressInput) {
        const token = await this.roomAdminToken(room_name);
        let options = {
            room_name,
            input_type,
            name: 'MyIngress',
            participant_identity: 'IngressParticipantIdentity',
            participant_name: 'IngressParticipantName',
            url: 'http://playertest.longtailvideo.com/adaptive/wowzaid3/playlist.m3u8'
        }
        if (input_type === IngressInput.WHIP_INPUT) {
            (options as any).bypass_transcoding = true;
        }
        return await firstValueFrom<any>(this.http.post(this.getUrl('Ingress', 'CreateIngress'), options, this.getRestOptions(token)));
    }

    async deleteIngress(ingress_id: string) {
        const token = await this.globalAdminToken();
        return await firstValueFrom<any>(this.http.post(this.getUrl('Ingress', 'DeleteIngress'), { ingress_id }, this.getRestOptions(token)));
    }

    private getUrl(endpoint: string, method: string) {
        const wsUrl = this.livekitParamsService.getParams().livekitUrl;
        const protocol = (wsUrl.startsWith('wss:') || wsUrl.startsWith('https:')) ? 'https' : 'http';
        const restUrl = `${protocol}://${wsUrl.substring(wsUrl.indexOf('//') + 2).replace(/\/$/, "")}`;
        return `${restUrl}/twirp/livekit.${endpoint}/${method}`;
    }

    private getRestOptions(token: string) {
        return {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        }
    }

}