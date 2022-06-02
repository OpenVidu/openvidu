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
	/**
	 * Local participant Observable which pushes the local participant object in every update.
	 */
	localParticipantObs: Observable<ParticipantAbstractModel>;
	protected _localParticipant = <BehaviorSubject<ParticipantAbstractModel>>new BehaviorSubject(null);

	/**
	 * Remote participants Observable which pushes the remote participants array in every update.
	 */
	remoteParticipantsObs: Observable<ParticipantAbstractModel[]>;
	protected _remoteParticipants = <BehaviorSubject<ParticipantAbstractModel[]>>new BehaviorSubject([]);

	protected localParticipant: ParticipantAbstractModel;
	protected remoteParticipants: ParticipantAbstractModel[] = [];

	protected log: ILogger;

	/**
	 * @internal
	 */
	constructor(protected openviduAngularConfigSrv: OpenViduAngularConfigService, protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('ParticipantService');

		this.localParticipantObs = this._localParticipant.asObservable();
		this.remoteParticipantsObs = this._remoteParticipants.asObservable();
	}

	/**
	 * @internal
	 */
	initLocalParticipant(props: ParticipantProperties) {
		this.localParticipant = this.newParticipant(props);
		this.updateLocalParticipant();
	}

	getLocalParticipant(): ParticipantAbstractModel {
		return this.localParticipant;
	}

	/**
	 * @internal
	 */
	getMyCameraPublisher(): Publisher {
		return <Publisher>this.localParticipant.getCameraConnection().streamManager;
	}

	/**
	 * @internal
	 */
	setMyCameraPublisher(publisher: Publisher) {
		this.localParticipant.setCameraPublisher(publisher);
	}
	/**
	 * @internal
	 */
	setMyCameraConnectionId(connectionId: string) {
		this.localParticipant.setCameraConnectionId(connectionId);
	}

	/**
	 * @internal
	 */
	getMyScreenPublisher(): Publisher {
		return <Publisher>this.localParticipant.getScreenConnection()?.streamManager;
	}

	/**
	 * @internal
	 */
	setMyScreenPublisher(publisher: Publisher) {
		this.localParticipant.setScreenPublisher(publisher);
	}

	/**
	 * @internal
	 */
	setMyScreenConnectionId(connectionId: string) {
		this.localParticipant.setScreenConnectionId(connectionId);
	}

	/**
	 * @internal
	 */
	enableWebcamStream() {
		this.localParticipant.enableCamera();
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	disableWebcamStream() {
		this.localParticipant.disableCamera();
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
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

	/**
	 * @internal
	 */
	disableScreenStream() {
		this.localParticipant.disableScreen();
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	setMyNickname(nickname: string) {
		this.localParticipant.setNickname(nickname);
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	getMyNickname(): string {
		return this.localParticipant.nickname;
	}

	getMyRole(): string {
		return this.localParticipant.getRole();
	}

	/**
	 * @internal
	 */
	toggleMyVideoEnlarged(connectionId: string) {
		this.localParticipant.toggleVideoEnlarged(connectionId);
	}

	/**
	 * @internal
	 */
	resetMyStreamsToNormalSize() {
		if (this.localParticipant.someHasVideoEnlarged()) {
			this.localParticipant.setAllVideoEnlarged(false);
			this.updateLocalParticipant();
		}
	}

	/**
	 * @internal
	 */
	clear() {
		this.disableScreenStream();
		// this.localParticipant = this.newParticipant();
		// this._screensharing.next(false);
		this.remoteParticipants = [];
		this._remoteParticipants = <BehaviorSubject<ParticipantAbstractModel[]>>new BehaviorSubject([]);
		this.remoteParticipantsObs = this._remoteParticipants.asObservable();
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	isMyCameraActive(): boolean {
		return this.localParticipant.isCameraActive();
	}

	isMyVideoActive(): boolean {
		return this.localParticipant.isCameraVideoActive();
	}

	isMyAudioActive(): boolean {
		return this.localParticipant?.isCameraAudioActive() || this.localParticipant?.isScreenAudioActive();
	}

	/**
	 * @internal
	 */
	isMyScreenActive(): boolean {
		return this.localParticipant.isScreenActive();
	}

	/**
	 * @internal
	 */
	isOnlyMyCameraActive(): boolean {
		return this.isMyCameraActive() && !this.isMyScreenActive();
	}

	/**
	 * @internal
	 */
	isOnlyMyScreenActive(): boolean {
		return this.isMyScreenActive() && !this.isMyCameraActive();
	}

	/**
	 * @internal
	 */
	haveICameraAndScreenActive(): boolean {
		return this.isMyCameraActive() && this.isMyScreenActive();
	}

	/**
	 * @internal
	 */
	hasScreenAudioActive(): boolean {
		return this.localParticipant.isScreenAudioActive();
	}

	/**
	 * Force to update the local participant object and fire a new {@link localParticipantObs} Observable event.
	 */
	updateLocalParticipant() {
		this._localParticipant.next(Object.assign(Object.create(this.localParticipant), this.localParticipant));
	}

	/**
	 * REMOTE USERS
	 */

	/**
	 * @internal
	 */
	addRemoteConnection(connectionId: string, data: string, subscriber: Subscriber) {
		const type: VideoType = this.getTypeConnectionData(data);
		const streamModel: StreamModel = {
			type,
			videoEnlarged: type === VideoType.SCREEN,
			streamManager: subscriber,
			connected: true,
			connectionId
		};

		// Avoiding create a new participant if participantId param is not exist in connection data
		// participant Id is necessary for allowing to have multiple connection in one participant
		const participantId = this.getParticipantIdFromData(data) || connectionId;

		const participantAdded = this.getRemoteParticipantById(participantId);
		if (!!participantAdded) {
			this.log.d('Adding connection to existing participant: ', participantId);
			if (participantAdded.hasConnectionType(streamModel.type)) {
				this.log.d('Participant has publisher, updating it');
				participantAdded.setPublisher(streamModel.type, subscriber);
			} else {
				this.log.d('Participant has not publisher, adding it');
				if (streamModel.type === VideoType.SCREEN) {
					this.resetRemoteStreamsToNormalSize();
					this.resetMyStreamsToNormalSize();
				}
				participantAdded.addConnection(streamModel);
			}
		} else {
			this.log.w('Creating new participant with id: ', participantId);
			const props: ParticipantProperties = {
				nickname: this.getNicknameFromConnectionData(data),
				local: false,
				id: participantId
			};
			const remoteParticipant = this.newParticipant(props, streamModel);
			this.remoteParticipants.push(remoteParticipant);
		}
		this.updateRemoteParticipants();
	}

	getRemoteParticipants(): ParticipantAbstractModel[] {
		return this.remoteParticipants;
	}

	/**
	 * @internal
	 */
	resetRemoteStreamsToNormalSize() {
		this.remoteParticipants.forEach((participant) => participant.setAllVideoEnlarged(false));
		this.updateRemoteParticipants();
	}

	/**
	 * @internal
	 */
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
			if (removeStream.type === VideoType.SCREEN) {
				const remoteScreens = this.remoteParticipants.filter((p) => p.isScreenActive());
				if (remoteScreens.length > 0) {
					// Enlarging the last screen connection active
					const lastScreenActive = remoteScreens[remoteScreens.length - 1];
					lastScreenActive.setScreenEnlarged(true);
				} else if (this.localParticipant.isScreenActive()) {
					// Enlarging my screen if thereare not any remote screen active
					this.localParticipant.setScreenEnlarged(true);
				}
			}

			this.updateRemoteParticipants();
		}
	}
	/**
	 * @internal
	 */
	getRemoteParticipantByConnectionId(connectionId: string): ParticipantAbstractModel {
		return this.remoteParticipants.find((p) => p.hasConnectionId(connectionId));
	}

	protected getRemoteParticipantById(id: string): ParticipantAbstractModel {
		return this.remoteParticipants.find((p) => p.id === id);
	}
	/**
	 * @internal
	 */
	someoneIsSharingScreen(): boolean {
		return this.remoteParticipants.some((p) => p.someHasVideoEnlarged());
	}

	/**
	 * @internal
	 */
	toggleRemoteVideoEnlarged(connectionId: string) {
		const p = this.getRemoteParticipantByConnectionId(connectionId);
		p.toggleVideoEnlarged(connectionId);
	}

	/**
	 * @internal
	 */
	getNicknameFromConnectionData(data: string): string {
		try {
			return JSON.parse(data).clientData;
		} catch (error) {
			return 'OpenVidu_User';
		}
	}

	/**
	 * @internal
	 */
	setRemoteNickname(connectionId: string, nickname: string) {
		const participant = this.getRemoteParticipantByConnectionId(connectionId);
		if (participant) {
			participant.setNickname(nickname);
			this.updateRemoteParticipants();
		}
	}

	/**
	 * @internal
	 */
	setRemoteMutedForcibly(id: string, value: boolean) {
		const participant = this.getRemoteParticipantById(id);
		if (participant) {
			participant.setMutedForcibly(value);
			this.updateRemoteParticipants();
		}
	}

	/**
	 * Force to update the remote participants object and fire a new {@link remoteParticipantsObs} Observable event.
	 */
	updateRemoteParticipants() {
		this._remoteParticipants.next([...this.remoteParticipants]);
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
		if (this.openviduAngularConfigSrv.hasParticipantFactory()) {
			return this.openviduAngularConfigSrv.getParticipantFactory().apply(this, [props, streamModel]);
		}
		return new ParticipantModel(props, streamModel);
	}
}
