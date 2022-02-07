import { Injectable } from '@angular/core';
import { Publisher, Subscriber } from 'openvidu-browser';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { StreamModel, ParticipantAbstractModel, ParticipantModel } from '../../models/participant.model';
import { VideoType } from '../../models/video-type.model';
import { LoggerService } from '../logger/logger.service';

@Injectable({
	providedIn: 'root'
})
export class ParticipantService {
	//Local participants observables
	localParticipantObs: Observable<ParticipantAbstractModel>;
	screenShareState: Observable<boolean>;
	webcamVideoActive: Observable<boolean>;
	webcamAudioActive: Observable<boolean>;
	protected _localParticipant = <BehaviorSubject<ParticipantAbstractModel>>new BehaviorSubject(null);
	protected _screensharing = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	protected _cameraVideoActive = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	protected _cameraAudioActive = <BehaviorSubject<boolean>>new BehaviorSubject(true);

	//Remote participants observable
	remoteParticipantsObs: Observable<ParticipantAbstractModel[]>;
	protected _remoteParticipants = <BehaviorSubject<ParticipantAbstractModel[]>>new BehaviorSubject([]);

	protected localParticipant: ParticipantAbstractModel;
	protected remoteParticipants: ParticipantAbstractModel[] = [];

	protected log: ILogger;

	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('ParticipantService');

		this.localParticipantObs = this._localParticipant.asObservable();
		this.remoteParticipantsObs = this._remoteParticipants.asObservable();
		this.screenShareState = this._screensharing.asObservable();
		this.webcamVideoActive = this._cameraVideoActive.asObservable();
		this.webcamAudioActive = this._cameraAudioActive.asObservable();

		this.localParticipant = this.newParticipant();
		this.updateLocalParticipant();
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

	enableScreenUser(screenPublisher: Publisher) {
		this.log.d('Enabling screen publisher');

		const steramModel: StreamModel = {
			local: true,
			type: VideoType.SCREEN,
			videoEnlarged: true,
			streamManager: screenPublisher,
			nickname: `${this.localParticipant.getCameraNickname()}_${VideoType.SCREEN}`,
			connected: true,
			connectionId: null
		};

		this.localParticipant.addConnection(steramModel);

		this._screensharing.next(true);

		this.updateLocalParticipant();
	}

	disableScreenUser() {
		this.localParticipant.disableScreen();
		this.updateLocalParticipant();
		this._screensharing.next(false);
	}

	updateUsersStatus() {
		this._cameraVideoActive.next(this.localParticipant.isCameraVideoActive());
		if (this.isMyCameraEnabled()) {
			this._cameraAudioActive.next(this.localParticipant.isCameraAudioActive());
		} else {
			this._cameraAudioActive.next(this.hasScreenAudioActive());
		}
	}

	setNickname(connectionId: string, nickname: string) {
		if (this.localParticipant.hasConnectionId(connectionId)) {
			this.localParticipant.setNickname(nickname);
			// this.updateLocalParticipant();
		} else {
			const participant = this.getRemoteParticipantByConnectionId(connectionId);
			if (participant) {
				participant.setNickname(nickname);
				// this.updateRemoteParticipants();
			}
		}
	}

	getWebcamNickname(): string {
		return this.localParticipant.getCameraNickname();
	}

	getScreenNickname(): string {
		return this.localParticipant.getScreenNickname();
	}

	resetUsersZoom() {
		this.localParticipant?.setAllVideoEnlarged(false);
	}

	toggleZoom(connectionId: string) {
		this.localParticipant.toggleVideoEnlarged(connectionId);
	}

	clear() {
		this.disableScreenUser();
		this.localParticipant = this.newParticipant();
		this._screensharing.next(false);
		this.remoteParticipants = [];
		this._remoteParticipants = <BehaviorSubject<ParticipantAbstractModel[]>>new BehaviorSubject([]);
		this.remoteParticipantsObs = this._remoteParticipants.asObservable();
		this.updateLocalParticipant();
	}

	isMyCameraEnabled(): boolean {
		return this.localParticipant.isCameraEnabled();
	}

	isMyScreenEnabled(): boolean {
		return this.localParticipant.isScreenEnabled();
	}

	isOnlyMyCameraEnabled(): boolean {
		return this.isMyCameraEnabled() && !this.isMyScreenEnabled();
	}

	isOnlyMyScreenEnabled(): boolean {
		return this.isMyScreenEnabled() && !this.isMyCameraEnabled();
	}

	areBothEnabled(): boolean {
		return this.isMyCameraEnabled() && this.isMyScreenEnabled();
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

	protected updateLocalParticipant() {
		// Cloning localParticipant object for not applying changes on the global variable
		let participantsWithConnectionAvailable: ParticipantAbstractModel = Object.assign(this.newParticipant(), this.localParticipant);
		const availableConnections = participantsWithConnectionAvailable.getAvailableConnections();
		const availableConnectionsMap = new Map(availableConnections.map((conn) => [conn.type, conn]));
		participantsWithConnectionAvailable.connections = availableConnectionsMap;
		this._localParticipant.next(participantsWithConnectionAvailable);
	}

	/**
	 * REMOTE USERS
	 */

	addRemoteConnection(connectionId:string, data: string, subscriber: Subscriber) {

		const steramModel: StreamModel = {
			local: false,
			type: this.getTypeConnectionData(data),
			videoEnlarged: false,
			streamManager: subscriber,
			nickname: this.getNicknameFromConnectionData(data),
			connected: true,
			connectionId
		};

		const participantId = this.getParticipantIdFromData(data);
		const participantAdded = this.getRemoteParticipantById(participantId);
		if (!!participantAdded) {
			this.log.d('Adding connection to existing participant: ', participantId);
			if(participantAdded.hasConnectionType(steramModel.type)) {
				this.log.d('Participant has publisher, updating it');
				participantAdded.setPublisher(steramModel.type, subscriber);
			} else {
				this.log.d('Participant has not publisher, adding it');
				participantAdded.addConnection(steramModel);
			}
		} else {
			this.log.d('Creating new participant with id: ', participantId);
			const remoteParticipant = this.newParticipant(steramModel, participantId);
			this.remoteParticipants.push(remoteParticipant);
		}
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
			participant.removeConnection(connectionId);
			//TODO: Timeout of X seconds?? Its possible sometimes the connections map was empty but must not be deleted
			if (participant.connections.size === 0) {
				// Remove participants without connections
				this.remoteParticipants = this.remoteParticipants.filter((p) => p !== participant);
			}
			this.updateRemoteParticipants();
		}
	}
	protected getRemoteParticipantByConnectionId(connectionId: string): ParticipantAbstractModel {
		return this.remoteParticipants.find((p) => p.hasConnectionId(connectionId));
	}

	protected getRemoteParticipantById(id: string): ParticipantAbstractModel {
		return this.remoteParticipants.find((p) => p.id === id);
	}
	someoneIsSharingScreen(): boolean {
		return this.remoteParticipants.some((p) => p.someHasVideoEnlarged());
	}

	toggleUserZoom(connectionId: string) {
		const p = this.getRemoteParticipantByConnectionId(connectionId);
		p.toggleVideoEnlarged(connectionId);
	}

	resetRemotesZoom() {
		this.remoteParticipants.forEach((u) => u.setAllVideoEnlarged(false));
	}

	getNicknameFromConnectionData(data: string): string {
		try {
			return JSON.parse(data).clientData;
		} catch (error) {
			return 'OpenVidu_User';
		}
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

	protected updateRemoteParticipants() {
		this._remoteParticipants.next(this.remoteParticipants);
	}
	protected newParticipant(steramModel?: StreamModel, participantId?: string) {
		return new ParticipantModel(steramModel, participantId);
	}
}
