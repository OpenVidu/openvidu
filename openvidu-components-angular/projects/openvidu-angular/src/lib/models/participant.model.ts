import { Publisher, StreamManager } from 'openvidu-browser';
import { VideoType } from './video-type.model';

export interface StreamModel {
	local: boolean;
	connected: boolean;
	nickname: string;
	type: VideoType;
	streamManager: StreamManager;
	videoEnlarged: boolean;
	connectionId: string;
}

export abstract class ParticipantAbstractModel {
	connections: Map<VideoType, StreamModel> = new Map();
	id: string;

	constructor(model?: StreamModel, id?: string) {
		let streamModel: StreamModel = {
			local: model ? model.local : true,
			connected: true,
			nickname: model ? model.nickname : 'OpenVidu_User',
			type: model ? model.type : VideoType.CAMERA,
			streamManager: model ? model.streamManager : null,
			videoEnlarged: model ? model.videoEnlarged : false,
			connectionId: model ? model.connectionId : null
		};
		this.connections.set(streamModel.type, streamModel);
		this.id = id ? id : new Date().getTime().toString();
	}

	addConnection(streamModel: StreamModel) {
		this.connections.set(streamModel.type, streamModel);
	}

	public isCameraAudioActive(): boolean {
		const cameraConnection = this.getCameraConnection();
		return cameraConnection.connected && cameraConnection.streamManager.stream.audioActive;
	}

	public isCameraVideoActive(): boolean {
		const cameraConnection = this.getCameraConnection();
		return cameraConnection?.connected && cameraConnection?.streamManager?.stream?.videoActive;
	}
	isScreenAudioActive(): boolean {
		const screenConnection = this.getScreenConnection();
		return screenConnection?.connected && screenConnection?.streamManager?.stream?.audioActive;
	}

	hasConnectionType(type: VideoType): boolean {
		return this.connections.has(type);
	}

	public getCameraConnection(): StreamModel {
		return this.connections.get(VideoType.CAMERA);
	}

	public getScreenConnection(): StreamModel {
		return this.connections.get(VideoType.SCREEN);
	}

	getConnectionTypesEnabled(): VideoType[] {
		let connType = [];
		if (this.isCameraEnabled()) connType.push(VideoType.CAMERA);
		if (this.isScreenEnabled()) connType.push(VideoType.SCREEN);

		return connType;
	}

	setCameraConnectionId(connectionId: string) {
		this.getCameraConnection().connectionId = connectionId;
	}
	setScreenConnectionId(connectionId: string) {
		this.getScreenConnection().connectionId = connectionId;
	}

	removeConnection(connectionId: string) {
		this.connections.delete(this.getConnectionById(connectionId).type);
	}

	hasConnectionId(connectionId: string): boolean {
		return Array.from(this.connections.values()).some((conn) => conn.connectionId === connectionId);
	}

	getConnectionById(connectionId: string): StreamModel {
		return Array.from(this.connections.values()).find((conn) => conn.connectionId === connectionId);
	}

	getAvailableConnections(): StreamModel[] {
		return Array.from(this.connections.values()).filter((conn) => conn.connected);
	}

	isLocal(): boolean {
		return Array.from(this.connections.values()).every((conn) => conn.local);
	}

	setNickname(nickname: string) {
		this.connections.forEach((conn) => {
			if (conn.type === VideoType.CAMERA) {
				conn.nickname = nickname;
			} else {
				conn.nickname = `${nickname}_${conn.type}`;
			}
		});
	}

	getCameraNickname(): string {
		return this.getCameraConnection()?.nickname;
	}

	getScreenNickname(): string {
		return this.getScreenConnection()?.nickname;
	}

	setCameraPublisher(publisher: Publisher) {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection) cameraConnection.streamManager = publisher;
	}

	setScreenPublisher(publisher: Publisher) {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.streamManager = publisher;
	}

	setPublisher(connType: VideoType, publisher: StreamManager) {
		const connection = this.connections.get(connType);
		if(connection) {
			connection.streamManager = publisher;
		}
	}

	isCameraEnabled(): boolean {
		return this.getCameraConnection()?.connected;
	}

	enableCamera() {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection) cameraConnection.connected = true;
	}

	disableCamera() {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection) cameraConnection.connected = false;
	}

	isScreenEnabled(): boolean {
		return this.getScreenConnection()?.connected;
	}

	enablescreen() {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.connected = true;
	}

	disableScreen() {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.connected = false;
	}
	setAllVideoEnlarged(enlarged: boolean) {
		this.connections.forEach((conn) => (conn.videoEnlarged = enlarged));
	}

	toggleVideoEnlarged(connectionId: string) {
		this.connections.forEach((conn) => {
			if (conn.connectionId === connectionId) {
				conn.videoEnlarged = !conn.videoEnlarged;
			}
		});
	}

	someHasVideoEnlarged(): boolean {
		return Array.from(this.connections.values()).some((conn) => conn.videoEnlarged);
	}
}

export class ParticipantModel extends ParticipantAbstractModel {


}

