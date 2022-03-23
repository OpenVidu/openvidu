import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Publisher } from 'openvidu-browser/lib/OpenVidu/Publisher';
import { ParticipantAbstractModel } from '../../models/participant.model';


@Injectable({
	providedIn: 'root'
})
export class ParticipantServiceMock {
	OVUsers: Observable<ParticipantAbstractModel[]>;
	screenShareState: Observable<boolean>;
	webcamVideoActive: Observable<boolean>;
	private _OVUsers = <BehaviorSubject<ParticipantAbstractModel[]>>new BehaviorSubject([]);
	private _screenShareState = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	private _webcamVideoActive = <BehaviorSubject<boolean>>new BehaviorSubject(true);


	constructor() {
		this.OVUsers = this._OVUsers.asObservable();
		this.screenShareState = this._screenShareState.asObservable();
		this.webcamVideoActive = this._webcamVideoActive.asObservable();
	}

	initialize() {}

	getMyCameraPublisher(): Publisher {
		return null;
	}

	setWebcamPublisher(publisher: Publisher) {}

	getScreenPublisher(): Publisher {
		return null;
	}

	setScreenPublisher(publisher: Publisher) {}

	enableWebcamUser() {}

	disableWebcamUser() {}

	enableScreenUser(screenPublisher: Publisher) {}

	disableScreenUser() {}

	updateUsersStatus() {}

	clear() {}

	isMyCameraEnabled(): boolean {
		return false;
	}

	isOnlyMyScreenEnabled(): boolean {
		return false;
	}

	hasCameraVideoActive(): boolean {
		return false;
	}

	hasCameraAudioActive(): boolean {
		return false;
	}

	hasScreenAudioActive(): boolean {
		return false;
	}

	areBothEnabled(): boolean {
		return false;
	}

	isOnlyMyCameraEnabled(): boolean {
		return false;
	}

	isScreenShareEnabled(): boolean {
		return false;
	}

	updateUsersNickname(nickname: string) {}

	getWebcamAvatar(): string {
		return '';
	}

	getWebcamNickname(): string {
		return '';
	}

	getScreenNickname() {}

	resetUsersZoom() {}

	toggleZoom(connectionId: string) {}
}
