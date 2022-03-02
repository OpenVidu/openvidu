import { Injectable } from '@angular/core';
import { Publisher, Subscriber } from 'openvidu-browser';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { StreamModel, ParticipantAbstractModel, ParticipantModel, ParticipantProperties } from '../../models/participant.model';
import { VideoType } from '../../models/video-type.model';
import { OpenViduAngularConfigService } from '../config/openvidu-angular.config.service';
import { LoggerService } from '../logger/logger.service';

@Injectable({
	providedIn: 'root'
})
export class ParticipantService {
	//Local participants observables
	localParticipantObs: Observable<ParticipantAbstractModel>;
	protected _localParticipant = <BehaviorSubject<ParticipantAbstractModel>>new BehaviorSubject(null);

	//Remote participants observable
	remoteParticipantsObs: Observable<ParticipantAbstractModel[]>;
	protected _remoteParticipants = <BehaviorSubject<ParticipantAbstractModel[]>>new BehaviorSubject([]);

	protected localParticipant: ParticipantAbstractModel;
	protected remoteParticipants: ParticipantAbstractModel[] = [];

	protected log: ILogger;

	constructor(protected openviduAngularConfigSrv: OpenViduAngularConfigService, protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('ParticipantService');

		this.localParticipantObs = this._localParticipant.asObservable();
		this.remoteParticipantsObs = this._remoteParticipants.asObservable();
	}

	initLocalParticipant(props: ParticipantProperties)  {
		this.localParticipant = this.newParticipant(props);
		this.updateLocalParticipant();
	}

	getLocalParticipant(): ParticipantAbstractModel {
		return this.localParticipant;
	}
	getMyParticipantId(): string {
		return this.localParticipant.id;
	}

	getMyCameraPublisher(): Publisher {
		return <Publisher>this.localParticipant.getCameraConnection().streamManager;
	}

	setMyCameraPublisher(publisher: Publisher) {
		this.localParticipant.setCameraPublisher(publisher);
	}
	setMyCameraConnectionId(connectionId: string) {
		this.localParticipant.setCameraConnectionId(connectionId);
	}

	getMyCameraConnectionId(): string {
		return this.localParticipant.getCameraConnection().connectionId;
	}

	getMyScreenPublisher(): Publisher {
		return <Publisher>this.localParticipant.getScreenConnection()?.streamManager;
	}

	setMyScreenPublisher(publisher: Publisher) {
		this.localParticipant.setScreenPublisher(publisher);
	}

	setMyScreenConnectionId(connectionId: string) {
		this.localParticipant.setScreenConnectionId(connectionId);
	}

	enableWebcamUser() {
		this.localParticipant.enableCamera();
		this.updateLocalParticipant();
	}

	disableWebcamUser() {
		this.localParticipant.disableCamera();
		this.updateLocalParticipant();
	}

	activeMyScreenShare(screenPublisher: Publisher) {
		this.log.d('Enabling screen publisher');

		const steramModel: StreamModel = {
			type: VideoType.SCREEN,
			videoEnlarged: true,
			streamManager: screenPublisher,
			connected: true,
			connectionId: null
		};

		this.resetRemoteStreamsToNormalSize();
		this.resetMyStreamsToNormalSize();
		this.localParticipant.addConnection(steramModel);
		this.updateLocalParticipant();
	}

	disableScreenUser() {
		this.localParticipant.disableScreen();
		this.updateLocalParticipant();
	}

	setMyNickname(nickname: string) {
		this.localParticipant.setNickname(nickname);
		this.updateLocalParticipant();
	}

	getMyNickname(): string {
		return this.localParticipant.nickname;
	}
	// getWebcamNickname(): string {
	// 	return this.localParticipant.getCameraNickname();
	// }

	// getScreenNickname(): string {
	// 	return this.localParticipant.getScreenNickname();
	// }


	toggleMyVideoEnlarged(connectionId: string) {
		this.localParticipant.toggleVideoEnlarged(connectionId);
	}


	resetMyStreamsToNormalSize() {
		if(this.localParticipant.someHasVideoEnlarged()){
			this.localParticipant.setAllVideoEnlarged(false);
			this.updateLocalParticipant();
		}
	}

	clear() {
		this.disableScreenUser();
		// this.localParticipant = this.newParticipant();
		// this._screensharing.next(false);
		this.remoteParticipants = [];
		this._remoteParticipants = <BehaviorSubject<ParticipantAbstractModel[]>>new BehaviorSubject([]);
		this.remoteParticipantsObs = this._remoteParticipants.asObservable();
		this.updateLocalParticipant();
	}

	isMyCameraActive(): boolean {
		return this.localParticipant.isCameraActive();
	}

	isMyScreenActive(): boolean {
		return this.localParticipant.isScreenActive();
	}

	isOnlyMyCameraActive(): boolean {
		return this.isMyCameraActive() && !this.isMyScreenActive();
	}

	isOnlyMyScreenActive(): boolean {
		return this.isMyScreenActive() && !this.isMyCameraActive();
	}

	haveICameraAndScreenActive(): boolean {
		return this.isMyCameraActive() && this.isMyScreenActive();
	}

	hasCameraVideoActive(): boolean {
		return this.localParticipant.isCameraVideoActive();
	}

	hasCameraAudioActive(): boolean {
		return this.localParticipant?.isCameraAudioActive();
	}

	hasScreenAudioActive(): boolean {
		return this.localParticipant.isScreenAudioActive();
	}

	updateLocalParticipant() {
		this._localParticipant.next(this.localParticipant);
	}

	/**
	 * REMOTE USERS
	 */

	addRemoteConnection(connectionId:string, data: string, subscriber: Subscriber) {

		const type: VideoType = this.getTypeConnectionData(data);
		const streamModel: StreamModel = {
			type,
			videoEnlarged: type === VideoType.SCREEN,
			streamManager: subscriber,
			connected: true,
			connectionId
		};

		const participantId = this.getParticipantIdFromData(data);
		const participantAdded = this.getRemoteParticipantById(participantId);
		if (!!participantAdded) {
			this.log.d('Adding connection to existing participant: ', participantId);
			if(participantAdded.hasConnectionType(streamModel.type)) {
				this.log.d('Participant has publisher, updating it');
				participantAdded.setPublisher(streamModel.type, subscriber);
			} else {
				this.log.d('Participant has not publisher, adding it');
				this.resetRemoteStreamsToNormalSize();
				this.resetMyStreamsToNormalSize();
				participantAdded.addConnection(streamModel);
			}
		} else {
			this.log.w('Creating new participant with id: ', participantId);
			const props: ParticipantProperties = {
				nickname: this.getNicknameFromConnectionData(data),
				local: false,
				id: participantId
			}
			const remoteParticipant = this.newParticipant(props, streamModel);
			this.remoteParticipants.push(remoteParticipant);
		}
		this.updateRemoteParticipants();
	}

	resetRemoteStreamsToNormalSize() {
		this.remoteParticipants.forEach(participant => participant.setAllVideoEnlarged(false));
		this.updateRemoteParticipants();
	}

	removeConnectionByConnectionId(connectionId: string) {
		this.log.w('Deleting connection: ', connectionId);
		let participant = null;
		if (this.localParticipant.hasConnectionId(connectionId)) {
			participant = this.localParticipant;
		} else {
			participant = this.getRemoteParticipantByConnectionId(connectionId);
		}

		if (participant) {
			const removeStream: StreamModel = participant.removeConnection(connectionId);
			//TODO: Timeout of X seconds?? Its possible sometimes the connections map was empty but must not be deleted
			if (participant.streams.size === 0) {
				// Remove participants without connections
				this.remoteParticipants = this.remoteParticipants.filter((p) => p !== participant);
			}
			if(removeStream.type === VideoType.SCREEN){
				const remoteScreens = this.remoteParticipants.filter(p => p.isScreenActive());
				if(remoteScreens.length > 0){
					// Enlarging the last screen connection active
					const lastScreenActive = remoteScreens[remoteScreens.length -1];
					lastScreenActive.setScreenEnlarged(true);
				} else if(this.localParticipant.isScreenActive()) {
					// Enlarging my screen if thereare not any remote screen active
					this.localParticipant.setScreenEnlarged(true);
				}
			}

			this.updateRemoteParticipants();
		}
	}
	getRemoteParticipantByConnectionId(connectionId: string): ParticipantAbstractModel {
		return this.remoteParticipants.find((p) => p.hasConnectionId(connectionId));
	}

	protected getRemoteParticipantById(id: string): ParticipantAbstractModel {
		return this.remoteParticipants.find((p) => p.id === id);
	}
	someoneIsSharingScreen(): boolean {
		return this.remoteParticipants.some((p) => p.someHasVideoEnlarged());
	}

	toggleRemoteVideoEnlarged(connectionId: string) {
		const p = this.getRemoteParticipantByConnectionId(connectionId);
		p.toggleVideoEnlarged(connectionId);
	}

	getNicknameFromConnectionData(data: string): string {
		try {
			return JSON.parse(data).clientData;
		} catch (error) {
			return 'OpenVidu_User';
		}
	}

	setRemoteNickname(connectionId: string, nickname: string) {
		const participant = this.getRemoteParticipantByConnectionId(connectionId);
		if (participant) {
			participant.setNickname(nickname);
			// this.updateRemoteParticipants();
		}
	}

	updateRemoteParticipants() {
		this._remoteParticipants.next(this.remoteParticipants);
	}

	protected getTypeConnectionData(data: string): VideoType {
		try {
			return JSON.parse(data).type;
		} catch (error) {
			return VideoType.CAMERA;
		}
	}

	protected getParticipantIdFromData(data: string): string {
		try {
			return JSON.parse(data).participantId;
		} catch (error) {
			return '';
		}
	}

	protected newParticipant(props: ParticipantProperties, streamModel?: StreamModel) {

		if(this.openviduAngularConfigSrv.hasParticipantFactory()){
			return this.openviduAngularConfigSrv.getParticipantFactory().apply(this, [props, streamModel]);
		}
		return new ParticipantModel(props, streamModel);
	}
}
