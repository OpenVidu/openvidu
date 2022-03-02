import { Publisher, StreamManager } from 'openvidu-browser';
import { VideoType } from './video-type.model';

export interface StreamModel {
	connected: boolean;
	type: VideoType;
	streamManager: StreamManager;
	videoEnlarged: boolean;
	connectionId: string;
	participant?: ParticipantAbstractModel
}

export interface ParticipantProperties {
	local: boolean;
	nickname: string;
	id?: string;
	colorProfile?: string;
	isMutedForcibly?: boolean;
}

export abstract class ParticipantAbstractModel {
	streams: Map<VideoType, StreamModel> = new Map();
	id: string;
	local: boolean;
	nickname: string;
	colorProfile: string;
	isMutedForcibly: boolean;

	constructor(props: ParticipantProperties, model?: StreamModel) {
		this.id = props.id ? props.id : new Date().getTime().toString();
		this.local = props.local;
		this.nickname = props.nickname;
		this.colorProfile = !!props.colorProfile ? props.colorProfile : `hsl(${Math.random()*360}, 100%, 80%)`;
		this.isMutedForcibly = typeof props.isMutedForcibly === 'boolean' ? props.isMutedForcibly : false;
		let streamModel: StreamModel = {
			connected: true,
			type: model ? model.type : VideoType.CAMERA,
			streamManager: model ? model.streamManager : null,
			videoEnlarged: model ? model.videoEnlarged : false,
			connectionId: model ? model.connectionId : null,
			participant: this
		};
		this.streams.set(streamModel.type, streamModel);
	}

	addConnection(streamModel: StreamModel) {
		streamModel.participant = this;
		this.streams.set(streamModel.type, streamModel);
	}

	public isCameraAudioActive(): boolean {
		const cameraConnection = this.getCameraConnection();
		if(cameraConnection) {
			return cameraConnection.connected && cameraConnection.streamManager.stream.audioActive;
		}
		return this.isScreenAudioActive();;
	}

	public isCameraVideoActive(): boolean {
		const cameraConnection = this.getCameraConnection();
		return cameraConnection?.connected && cameraConnection?.streamManager?.stream?.videoActive;
	}
	isScreenAudioActive(): boolean {
		const screenConnection = this.getScreenConnection();
		if(screenConnection){
			return screenConnection?.connected && screenConnection?.streamManager?.stream?.audioActive;
		}
		return false;
	}

	hasConnectionType(type: VideoType): boolean {
		return this.streams.has(type);
	}

	public getCameraConnection(): StreamModel {
		return this.streams.get(VideoType.CAMERA);
	}

	public getScreenConnection(): StreamModel {
		return this.streams.get(VideoType.SCREEN);
	}

	getConnectionTypesActive(): VideoType[] {
		let connType = [];
		if (this.isCameraActive()) connType.push(VideoType.CAMERA);
		if (this.isScreenActive()) connType.push(VideoType.SCREEN);

		return connType;
	}

	setCameraConnectionId(connectionId: string) {
		this.getCameraConnection().connectionId = connectionId;
	}
	setScreenConnectionId(connectionId: string) {
		this.getScreenConnection().connectionId = connectionId;
	}

	removeConnection(connectionId: string): StreamModel {
		const removeStream = this.getConnectionById(connectionId);
		this.streams.delete(removeStream.type);
		return removeStream;
	}

	hasConnectionId(connectionId: string): boolean {
		return Array.from(this.streams.values()).some((conn) => conn.connectionId === connectionId);
	}

	getConnectionById(connectionId: string): StreamModel {
		return Array.from(this.streams.values()).find((conn) => conn.connectionId === connectionId);
	}

	getAvailableConnections(): StreamModel[] {
		return Array.from(this.streams.values()).filter((conn) => conn.connected);
	}

	isLocal(): boolean {
		return this.local;
		// return Array.from(this.streams.values()).every((conn) => conn.local);
	}

	setNickname(nickname: string) {
		this.nickname = nickname;
		// this.streams.forEach((conn) => {
		// 	if (conn.type === VideoType.CAMERA) {
		// 		conn.nickname = nickname;
		// 	} else {
		// 		conn.nickname = `${nickname}_${conn.type}`;
		// 	}
		// });
	}

	getNickname() {
		return this.nickname;
	}

	// getCameraNickname(): string {
	// 	return this.getCameraConnection()?.nickname;
	// }

	// getScreenNickname(): string {
	// 	return this.getScreenConnection()?.nickname;
	// }

	setCameraPublisher(publisher: Publisher) {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection) cameraConnection.streamManager = publisher;
	}

	setScreenPublisher(publisher: Publisher) {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.streamManager = publisher;
	}

	setPublisher(connType: VideoType, publisher: StreamManager) {
		const connection = this.streams.get(connType);
		if(connection) {
			connection.streamManager = publisher;
		}
	}

	isCameraActive(): boolean {
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

	isScreenActive(): boolean {
		return this.getScreenConnection()?.connected;
	}

	enableScreen() {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.connected = true;
	}

	disableScreen() {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.connected = false;
	}

	setAllVideoEnlarged(enlarged: boolean) {
		this.streams.forEach((conn) => (conn.videoEnlarged = enlarged));
	}

	setCameraEnlarged(enlarged: boolean) {
		this.streams.get(VideoType.CAMERA).videoEnlarged = enlarged;
	}
	setScreenEnlarged(enlarged: boolean) {
		this.streams.get(VideoType.SCREEN).videoEnlarged = enlarged;
	}


	toggleVideoEnlarged(connectionId: string) {
		this.streams.forEach((conn) => {
			if (conn.connectionId === connectionId) {
				conn.videoEnlarged = !conn.videoEnlarged;
			}
		});
	}

	someHasVideoEnlarged(): boolean {
		return Array.from(this.streams.values()).some((conn) => conn.videoEnlarged);
	}

	setMutedForcibly(muted: boolean){
		this.isMutedForcibly = muted;
	}
}

export class ParticipantModel extends ParticipantAbstractModel {


}

