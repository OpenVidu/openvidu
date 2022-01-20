import { Injectable } from '@angular/core';
import { Session, PublisherProperties, OpenVidu, Publisher, Connection } from 'openvidu-browser';
import { Signal } from '../../models/signal.model';

@Injectable({
	providedIn: 'root'
})
export class WebrtcServiceMock {
	private OV: OpenVidu = null;
	private OVScreen: OpenVidu = null;

	private webcamSession: Session = null;
	private screenSession: Session = null;

	private videoSource = undefined;
	private audioSource = undefined;

	private screenMediaStream: MediaStream = null;
	private webcamMediaStream: MediaStream = null;


	constructor() {}

	initialize() {}

	initSessions() {}

	getWebcamSession(): Session {
		return null;
	}

	initializeWebcamSession(): void {}

	initializeScreenSession(): void {}

	getScreenSession(): Session {
		return null;
	}

	async connectWebcamSession(token: string): Promise<any> {}
	disconnectWebcamSession(): void {}

	async connectScreenSession(token: string): Promise<any> {}
	disconnectScreenSession(): void {}

	disconnect() {}

	initPublisher(targetElement: string | HTMLElement, properties: PublisherProperties): Publisher {
		return null;
	}
	initPublisherAsync(targetElement: string | HTMLElement, properties: PublisherProperties): Promise<Publisher> {
		return null;
	}

	destroyWebcamPublisher(): void {}

	destroyScreenPublisher(): void {}

	async publishWebcamPublisher(): Promise<any> {}
	unpublishWebcamPublisher(): void {}
	async publishScreenPublisher(): Promise<any> {}

	unpublishScreenPublisher(): void {}
	publishWebcamVideo(active: boolean): void {}
	publishWebcamAudio(active: boolean): void {}
	publishScreenAudio(active: boolean): void {}
	replaceTrack(videoSource: string, audioSource: string, mirror: boolean = true): Promise<any> {
		return new Promise((resolve, reject) => {});
	}

	sendSignal(type: Signal, connection?: Connection, data?: any): void {}

	createPublisherProperties(
		videoSource: string | MediaStreamTrack | boolean,
		audioSource: string | MediaStreamTrack | boolean,
		publishVideo: boolean,
		publishAudio: boolean,
		mirror: boolean
	): PublisherProperties {
		return {};
	}

	async replaceScreenTrack() {}

	stopAudioTracks(mediaStream: MediaStream) {}

	stopVideoTracks(mediaStream: MediaStream) {}

	needSendNicknameSignal(): boolean {
		return false;
	}

	isMyOwnConnection(connectionId: string): boolean {
		return false;
	}

	getSessionOfUserConnected(): Session {
		return null;
	}

	private stopScreenTracks() {}
}
