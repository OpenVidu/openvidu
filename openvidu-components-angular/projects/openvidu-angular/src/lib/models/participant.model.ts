import { Publisher, StreamManager } from 'openvidu-browser';
import { VideoType } from './video-type.model';

/**
 * @internal
 */
export enum OpenViduRole {
	MODERATOR = 'MODERATOR',
	PUBLISHER = 'PUBLISHER'
}

export interface StreamModel {
	/**
	 * Whether the stream is available or not
	 */
	connected: boolean;
	/**
	 * The stream type.{@link VideoType}
	 */
	type: VideoType;
	/**
	 * The streamManager object from openvidu-browser library.{@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/StreamManager.html}
	 */
	streamManager: StreamManager | undefined;
	/**
	 * Whether the stream is enlarged or not
	 */
	videoEnlarged: boolean;
	/**
	 * Unique identifier of the stream
	 */
	connectionId: string | undefined;
	/**
	 * The participant object
	 */
	participant?: ParticipantAbstractModel;
}

export interface ParticipantProperties {
	/**
	 * Whether the participant is local or not
	 */
	local: boolean;
	/**
	 * The participant nickname
	 */
	nickname: string;
	/**
	 * Unique identifier of the participant
	 */
	id?: string;
	/**
	 * The participant color profile
	 */
	colorProfile?: string;
	/**
	 * Whether the participant is muted forcibly or not
	 */
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
		this.id = props.id || Math.random().toString(32).replace('.','_');
		this.local = props.local;
		this.nickname = props.nickname;
		this.colorProfile = !!props.colorProfile ? props.colorProfile : `hsl(${Math.random() * 360}, 100%, 80%)`;
		this.isMutedForcibly = typeof props.isMutedForcibly === 'boolean' ? props.isMutedForcibly : false;
		let streamModel: StreamModel = {
			connected: model ? model.connected : true,
			type: model ? model.type : VideoType.CAMERA,
			streamManager: model?.streamManager,
			videoEnlarged: model ? model.videoEnlarged : false,
			connectionId: model?.connectionId,
			participant: this
		};
		this.streams.set(streamModel.type, streamModel);
	}

	/**
	 * @internal
	 */
	addConnection(streamModel: StreamModel) {
		streamModel.participant = this;
		this.streams.set(streamModel.type, streamModel);
	}

	/**
	 * @internal
	 */
	hasAudioActive(): boolean {
		const cameraConnection = this.getCameraConnection();
		const screenConnection = this.getScreenConnection();

		if (cameraConnection.connected) {
			return this.isCameraAudioActive();
		} else if (screenConnection.connected) {
			return this.isScreenAudioActive();
		}
		return false;
	}

	/**
	 * @internal
	 */
	private isCameraAudioActive(): boolean {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection?.connected) {
			return cameraConnection.streamManager?.stream?.audioActive || false;
		}
		return false;
	}

	/**
	 * @internal
	 */
	public isCameraVideoActive(): boolean {
		const cameraConnection = this.getCameraConnection();
		return cameraConnection?.connected && cameraConnection?.streamManager?.stream?.videoActive;
	}

	/**
	 * @internal
	 */
	isScreenAudioActive(): boolean {
		const screenConnection = this.getScreenConnection();
		if (screenConnection?.connected) {
			return screenConnection?.streamManager?.stream?.audioActive || false;
		}
		return false;
	}

	/**
	 * @internal
	 */
	hasConnectionType(type: VideoType): boolean {
		return this.streams.has(type);
	}

	/**
	 * @internal
	 */
	public getCameraConnection(): StreamModel {
		return this.streams.get(VideoType.CAMERA);
	}

	/**
	 * @internal
	 */
	public getScreenConnection(): StreamModel {
		return this.streams.get(VideoType.SCREEN);
	}

	/**
	 * @internal
	 * @returns The participant active connection types
	 */
	getActiveConnectionTypes(): VideoType[] {
		const activeTypes: VideoType[] = [];
		if (this.isCameraActive()) activeTypes.push(VideoType.CAMERA);
		if (this.isScreenActive()) activeTypes.push(VideoType.SCREEN);

		return activeTypes;
	}

	/**
	 * @internal
	 */
	setCameraConnectionId(connectionId: string) {
		this.getCameraConnection().connectionId = connectionId;
	}

	/**
	 * @internal
	 */
	setScreenConnectionId(connectionId: string) {
		this.getScreenConnection().connectionId = connectionId;
	}

	/**
	 * @internal
	 */
	removeConnection(connectionId: string): StreamModel {
		const removeStream = this.getConnectionById(connectionId);
		this.streams.delete(removeStream.type);
		return removeStream;
	}

	/**
	 * @internal
	 */
	hasConnectionId(connectionId: string): boolean {
		return Array.from(this.streams.values()).some((conn) => conn.connectionId === connectionId);
	}

	/**
	 * @internal
	 */
	getConnectionById(connectionId: string): StreamModel {
		return Array.from(this.streams.values()).find((conn) => conn.connectionId === connectionId);
	}

	/**
	 * @internal
	 */
	getAvailableConnections(): StreamModel[] {
		return Array.from(this.streams.values()).filter((conn) => conn.connected);
	}

	/**
	 * @internal
	 */
	isLocal(): boolean {
		return this.local;
	}

	/**
	 * @internal
	 */
	setNickname(nickname: string) {
		this.nickname = nickname;
	}

	/**
	 * @internal
	 */
	getNickname() {
		return this.nickname;
	}

	/**
	 * @internal
	 */
	setCameraPublisher(publisher: Publisher | undefined) {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection) cameraConnection.streamManager = publisher;
	}

	/**
	 * @internal
	 */
	setScreenPublisher(publisher: Publisher) {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.streamManager = publisher;
	}

	/**
	 * @internal
	 */
	setPublisher(connType: VideoType, publisher: StreamManager) {
		const connection = this.streams.get(connType);
		if (connection) {
			connection.streamManager = publisher;
		}
	}

	/**
	 * @internal
	 */
	isCameraActive(): boolean {
		return this.getCameraConnection()?.connected;
	}

	/**
	 * @internal
	 */
	enableCamera() {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection) cameraConnection.connected = true;
	}

	/**
	 * @internal
	 */
	disableCamera() {
		const cameraConnection = this.getCameraConnection();
		if (cameraConnection) cameraConnection.connected = false;
	}

	/**
	 * @internal
	 */
	isScreenActive(): boolean {
		return this.getScreenConnection()?.connected;
	}

	/**
	 * @internal
	 */
	enableScreen() {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.connected = true;
	}

	/**
	 * @internal
	 */
	disableScreen() {
		const screenConnection = this.getScreenConnection();
		if (screenConnection) screenConnection.connected = false;
	}

	/**
	 * @internal
	 * @returns true if both camera and screen are active
	 */
	hasCameraAndScreenActives(): boolean {
		return this.isCameraActive() && this.isScreenActive();
	}

	/**
	 * @internal
	 * @returns true if only screen is active
	 */
	hasOnlyScreenActive(): boolean {
		return this.isScreenActive() && !this.isCameraActive();
	}

	/**
	 * @internal
	 * @returns true if only camera is active
	 */
	hasOnlyCameraActive(): boolean {
		return this.isCameraActive() && !this.isScreenActive();
	}

	/**
	 * @internal
	 */
	setAllVideoEnlarged(enlarged: boolean) {
		this.streams.forEach((conn) => (conn.videoEnlarged = enlarged));
	}

	/**
	 * @internal
	 */
	setCameraEnlarged(enlarged: boolean) {
		this.streams.get(VideoType.CAMERA).videoEnlarged = enlarged;
	}

	/**
	 * @internal
	 */
	setScreenEnlarged(enlarged: boolean) {
		this.streams.get(VideoType.SCREEN).videoEnlarged = enlarged;
	}

	/**
	 * @internal
	 */
	toggleVideoEnlarged(connectionId: string) {
		this.streams.forEach((conn) => {
			if (conn.connectionId === connectionId) {
				conn.videoEnlarged = !conn.videoEnlarged;
			}
		});
	}

	/**
	 * @internal
	 */
	someHasVideoEnlarged(): boolean {
		return Array.from(this.streams.values()).some((conn) => conn.videoEnlarged);
	}

	/**
	 * @internal
	 */
	setMutedForcibly(muted: boolean) {
		this.isMutedForcibly = muted;
	}

	/**
	 * @internal
	 */
	getRole(): OpenViduRole {
		return <OpenViduRole>this.streams.get(VideoType.CAMERA)?.streamManager?.stream?.connection?.role;
	}
}

/**
 * @internal
 */
export class ParticipantModel extends ParticipantAbstractModel {}
