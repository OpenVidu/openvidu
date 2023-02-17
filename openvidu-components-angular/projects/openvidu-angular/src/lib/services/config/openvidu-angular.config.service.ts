import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { OpenViduAngularConfig, ParticipantFactoryFunction } from '../../config/openvidu-angular.config';
import { BroadcastingError } from '../../models/broadcasting.model';
import { RecordingInfo } from '../../models/recording.model';

// import { version } from '../../../../package.json';

/**
 * @internal
 */
@Injectable()
export class OpenViduAngularConfigService {
	private configuration: OpenViduAngularConfig;
	minimal = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	minimalObs: Observable<boolean>;
	participantName = <BehaviorSubject<string>>new BehaviorSubject('');
	participantNameObs: Observable<string>;
	prejoin = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	prejoinObs: Observable<boolean>;

	videoMuted = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	videoMutedObs: Observable<boolean>;
	audioMuted = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	audioMutedObs: Observable<boolean>;
	screenshareButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	screenshareButtonObs: Observable<boolean>;

	fullscreenButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	fullscreenButtonObs: Observable<boolean>;

	captionsButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	captionsButtonObs: Observable<boolean>;

	toolbarSettingsButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	toolbarSettingsButtonObs: Observable<boolean>;

	leaveButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	leaveButtonObs: Observable<boolean>;

	participantsPanelButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	participantsPanelButtonObs: Observable<boolean>;

	chatPanelButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	chatPanelButtonObs: Observable<boolean>;

	activitiesPanelButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	activitiesPanelButtonObs: Observable<boolean>;

	displaySessionName = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displaySessionNameObs: Observable<boolean>;

	displayLogo = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayLogoObs: Observable<boolean>;
	displayParticipantName = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayParticipantNameObs: Observable<boolean>;
	displayAudioDetection = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayAudioDetectionObs: Observable<boolean>;
	streamSettingsButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	streamSettingsButtonObs: Observable<boolean>;
	participantItemMuteButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	participantItemMuteButtonObs: Observable<boolean>;
	backgroundEffectsButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	backgroundEffectsButtonObs: Observable<boolean>;
	recordingsList: BehaviorSubject<RecordingInfo[]> = new BehaviorSubject(<RecordingInfo[]>[]);
	recordingsListObs: Observable<RecordingInfo[]>;
	recordingButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	recordingButtonObs: Observable<boolean>;
	broadcastingButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	broadcastingButtonObs: Observable<boolean>;
	recordingActivity = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	recordingActivityObs: Observable<boolean>;
	broadcastingActivity = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	broadcastingActivityObs: Observable<boolean>;
	recordingError = <BehaviorSubject<any>>new BehaviorSubject(null);
	recordingErrorObs: Observable<any>;
	broadcastingErrorObs: Observable<BroadcastingError | undefined>;
	broadcastingError = <BehaviorSubject<BroadcastingError | undefined>>new BehaviorSubject(undefined);
	// Admin
	adminRecordingsList: BehaviorSubject<RecordingInfo[]> = new BehaviorSubject(<RecordingInfo[]>[]);
	adminRecordingsListObs: Observable<RecordingInfo[]>;
	adminLoginError = <BehaviorSubject<any>>new BehaviorSubject(null);
	adminLoginErrorObs: Observable<any>;

	constructor(@Inject('OPENVIDU_ANGULAR_CONFIG') config: OpenViduAngularConfig) {
		this.configuration = config;
		console.log(this.configuration);
		if (this.isProduction()) console.log('OpenVidu Angular Production Mode');
		this.minimalObs = this.minimal.asObservable();
		this.participantNameObs = this.participantName.asObservable();
		this.prejoinObs = this.prejoin.asObservable();
		this.videoMutedObs = this.videoMuted.asObservable();
		this.audioMutedObs = this.audioMuted.asObservable();
		//Toolbar observables
		this.screenshareButtonObs = this.screenshareButton.asObservable();
		this.fullscreenButtonObs = this.fullscreenButton.asObservable();
		this.backgroundEffectsButtonObs = this.backgroundEffectsButton.asObservable();
		this.leaveButtonObs = this.leaveButton.asObservable();
		this.participantsPanelButtonObs = this.participantsPanelButton.asObservable();
		this.chatPanelButtonObs = this.chatPanelButton.asObservable();
		this.activitiesPanelButtonObs = this.activitiesPanelButton.asObservable();
		this.displaySessionNameObs = this.displaySessionName.asObservable();
		this.displayLogoObs = this.displayLogo.asObservable();
		this.recordingButtonObs = this.recordingButton.asObservable();
		this.broadcastingButtonObs = this.broadcastingButton.asObservable();
		this.toolbarSettingsButtonObs = this.toolbarSettingsButton.asObservable();
		this.captionsButtonObs = this.captionsButton.asObservable();
		//Stream observables
		this.displayParticipantNameObs = this.displayParticipantName.asObservable();
		this.displayAudioDetectionObs = this.displayAudioDetection.asObservable();
		this.streamSettingsButtonObs = this.streamSettingsButton.asObservable();
		// Participant item observables
		this.participantItemMuteButtonObs = this.participantItemMuteButton.asObservable();
		// Recording activity observables
		this.recordingActivityObs = this.recordingActivity.asObservable();
		this.recordingsListObs = this.recordingsList.asObservable();
		this.recordingErrorObs = this.recordingError.asObservable();
		// Broadcasting activity
		this.broadcastingActivityObs = this.broadcastingActivity.asObservable();
		this.broadcastingErrorObs = this.broadcastingError.asObservable();
		// Admin dashboard
		this.adminRecordingsListObs = this.adminRecordingsList.asObservable();
		this.adminLoginErrorObs = this.adminLoginError.asObservable();
	}

	getConfig(): OpenViduAngularConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.production || false;
	}

	hasParticipantFactory(): boolean {
		return typeof this.getConfig().participantFactory === 'function';
	}

	getParticipantFactory(): ParticipantFactoryFunction {
		return this.getConfig().participantFactory;
	}

	isRecordingEnabled(): boolean {
		return this.recordingButton.getValue() && this.recordingActivity.getValue();
	}

	isBroadcastingEnabled(): boolean {
		return this.broadcastingButton.getValue() && this.broadcastingActivity.getValue();
	}
}
