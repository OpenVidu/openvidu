import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { OpenViduComponentsConfig, ParticipantFactoryFunction } from '../../config/openvidu-components-angular.config';
import { RecordingInfo } from '../../models/recording.model';
import { DOCUMENT } from '@angular/common';

// import { version } from '../../../../package.json';

/**
 * @internal
 */
@Injectable()
export class OpenViduComponentsConfigService {
	private configuration: OpenViduComponentsConfig;
	private token = <BehaviorSubject<string>>new BehaviorSubject('');
	token$: Observable<string>;

	private livekitUrl = <BehaviorSubject<string>>new BehaviorSubject('');
	livekitUrl$: Observable<string>;

	private tokenError = <BehaviorSubject<any>>new BehaviorSubject(null);
	tokenError$: Observable<any>;
	private minimal = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	minimal$: Observable<boolean>;
	private participantName = <BehaviorSubject<string>>new BehaviorSubject('');
	participantName$: Observable<string>;
	private prejoin = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	prejoin$: Observable<boolean>;

	private videoEnabled = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	videoEnabled$: Observable<boolean>;
	private audioEnabled = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	audioEnabled$: Observable<boolean>;
	private screenshareButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	screenshareButton$: Observable<boolean>;

	private fullscreenButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	fullscreenButton$: Observable<boolean>;

	private captionsButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	captionsButton$: Observable<boolean>;

	private toolbarSettingsButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	toolbarSettingsButton$: Observable<boolean>;

	private leaveButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	leaveButton$: Observable<boolean>;

	private participantsPanelButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	participantsPanelButton$: Observable<boolean>;

	private chatPanelButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	chatPanelButton$: Observable<boolean>;

	private activitiesPanelButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	activitiesPanelButton$: Observable<boolean>;

	private displayRoomName = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayRoomName$: Observable<boolean>;

	private displayLogo = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayLogo$: Observable<boolean>;
	private displayParticipantName = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayParticipantName$: Observable<boolean>;
	private displayAudioDetection = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayAudioDetection$: Observable<boolean>;
	private streamVideoControls = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	streamVideoControls$: Observable<boolean>;
	private participantItemMuteButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	participantItemMuteButton$: Observable<boolean>;
	private backgroundEffectsButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	backgroundEffectsButton$: Observable<boolean>;
	private recordingButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	recordingButton$: Observable<boolean>;
	private broadcastingButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	broadcastingButton$: Observable<boolean>;
	private recordingActivity = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	recordingActivity$: Observable<boolean>;
	private broadcastingActivity = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	broadcastingActivity$: Observable<boolean>;

	// Admin
	private adminRecordingsList: BehaviorSubject<RecordingInfo[]> = new BehaviorSubject(<RecordingInfo[]>[]);
	adminRecordingsList$: Observable<RecordingInfo[]>;
	private adminLoginError = <BehaviorSubject<any>>new BehaviorSubject(null);
	adminLoginError$: Observable<any>;

	constructor(
		@Inject('OPENVIDU_COMPONENTS_CONFIG') config: OpenViduComponentsConfig,
		@Inject(DOCUMENT) private document: Document
	) {
		this.configuration = config;
		console.log(this.configuration);
		if (this.isProduction()) console.log('OpenVidu Angular Production Mode');
		this.token$ = this.token.asObservable();
		this.livekitUrl$ = this.livekitUrl.asObservable();
		this.tokenError$ = this.tokenError.asObservable();
		this.minimal$ = this.minimal.asObservable();
		this.participantName$ = this.participantName.asObservable();
		this.prejoin$ = this.prejoin.asObservable();
		this.videoEnabled$ = this.videoEnabled.asObservable();
		this.audioEnabled$ = this.audioEnabled.asObservable();
		//Toolbar observables
		this.screenshareButton$ = this.screenshareButton.asObservable();
		this.fullscreenButton$ = this.fullscreenButton.asObservable();
		this.backgroundEffectsButton$ = this.backgroundEffectsButton.asObservable();
		this.leaveButton$ = this.leaveButton.asObservable();
		this.participantsPanelButton$ = this.participantsPanelButton.asObservable();
		this.chatPanelButton$ = this.chatPanelButton.asObservable();
		this.activitiesPanelButton$ = this.activitiesPanelButton.asObservable();
		this.displayRoomName$ = this.displayRoomName.asObservable();
		this.displayLogo$ = this.displayLogo.asObservable();
		this.recordingButton$ = this.recordingButton.asObservable();
		this.broadcastingButton$ = this.broadcastingButton.asObservable();
		this.toolbarSettingsButton$ = this.toolbarSettingsButton.asObservable();
		this.captionsButton$ = this.captionsButton.asObservable();
		//Stream observables
		this.displayParticipantName$ = this.displayParticipantName.asObservable();
		this.displayAudioDetection$ = this.displayAudioDetection.asObservable();
		this.streamVideoControls$ = this.streamVideoControls.asObservable();
		// Participant item observables
		this.participantItemMuteButton$ = this.participantItemMuteButton.asObservable();
		// Recording activity observables
		this.recordingActivity$ = this.recordingActivity.asObservable();
		// Broadcasting activity
		this.broadcastingActivity$ = this.broadcastingActivity.asObservable();
		// Admin dashboard
		this.adminRecordingsList$ = this.adminRecordingsList.asObservable();
		this.adminLoginError$ = this.adminLoginError.asObservable();
	}

	setToken(token: string) {
		this.token.next(token);
	}

	setLivekitUrl(livekitUrl: string) {
		this.livekitUrl.next(livekitUrl);
	}

	getLivekitUrl(): string {
		return this.livekitUrl.getValue();
	}

	setTokenError(error: any) {
		this.tokenError.next(error);
	}

	setMinimal(minimal: boolean) {
		this.minimal.next(minimal);
	}

	isMinimal(): boolean {
		return this.minimal.getValue();
	}

	setParticipantName(participantName: string) {
		this.participantName.next(participantName);
	}

	setPrejoin(prejoin: boolean) {
		this.prejoin.next(prejoin);
	}

	isPrejoin(): boolean {
		return this.prejoin.getValue();
	}

	setVideoEnabled(videoEnabled: boolean) {
		this.videoEnabled.next(videoEnabled);
	}

	isVideoEnabled(): boolean {
		return this.videoEnabled.getValue();
	}

	setAudioEnabled(audioEnabled: boolean) {
		this.audioEnabled.next(audioEnabled);
	}

	isAudioEnabled(): boolean {
		return this.audioEnabled.getValue();
	}

	//Toolbar settings
	setScreenshareButton(screenshareButton: boolean) {
		this.screenshareButton.next(screenshareButton);
	}

	showScreenshareButton(): boolean {
		return this.screenshareButton.getValue();
	}

	setFullscreenButton(fullscreenButton: boolean) {
		this.fullscreenButton.next(fullscreenButton);
	}

	showFullscreenButton(): boolean {
		return this.fullscreenButton.getValue();
	}

	setCaptionsButton(captionsButton: boolean) {
		this.captionsButton.next(captionsButton);
	}

	showCaptionsButton(): boolean {
		return this.captionsButton.getValue();
	}

	setToolbarSettingsButton(toolbarSettingsButton: boolean) {
		this.toolbarSettingsButton.next(toolbarSettingsButton);
	}

	showToolbarSettingsButton(): boolean {
		return this.toolbarSettingsButton.getValue();
	}

	setLeaveButton(leaveButton: boolean) {
		this.leaveButton.next(leaveButton);
	}

	showLeaveButton(): boolean {
		return this.leaveButton.getValue();
	}

	setParticipantsPanelButton(participantsPanelButton: boolean) {
		this.participantsPanelButton.next(participantsPanelButton);
	}

	showParticipantsPanelButton(): boolean {
		return this.participantsPanelButton.getValue();
	}

	setChatPanelButton(chatPanelButton: boolean) {
		this.chatPanelButton.next(chatPanelButton);
	}

	showChatPanelButton(): boolean {
		return this.chatPanelButton.getValue();
	}

	setActivitiesPanelButton(activitiesPanelButton: boolean) {
		this.activitiesPanelButton.next(activitiesPanelButton);
	}

	showActivitiesPanelButton(): boolean {
		return this.activitiesPanelButton.getValue();
	}

	setDisplayRoomName(displayRoomName: boolean) {
		this.displayRoomName.next(displayRoomName);
	}

	showRoomName(): boolean {
		return this.displayRoomName.getValue();
	}

	setDisplayLogo(displayLogo: boolean) {
		this.displayLogo.next(displayLogo);
	}

	showLogo(): boolean {
		return this.displayLogo.getValue();
	}

	setRecordingButton(recordingButton: boolean) {
		this.recordingButton.next(recordingButton);
	}

	showRecordingButton(): boolean {
		return this.recordingButton.getValue();
	}

	setBroadcastingButton(broadcastingButton: boolean) {
		this.broadcastingButton.next(broadcastingButton);
	}

	showBroadcastingButton(): boolean {
		return this.broadcastingButton.getValue();
	}

	setRecordingActivity(recordingActivity: boolean) {
		this.recordingActivity.next(recordingActivity);
	}

	showRecordingActivity(): boolean {
		return this.recordingActivity.getValue();
	}

	setBroadcastingActivity(broadcastingActivity: boolean) {
		this.broadcastingActivity.next(broadcastingActivity);
	}

	showBroadcastingActivity(): boolean {
		return this.broadcastingActivity.getValue();
	}

	//Stream settings
	setDisplayParticipantName(displayParticipantName: boolean) {
		this.displayParticipantName.next(displayParticipantName);
	}

	isParticipantNameDisplayed(): boolean {
		return this.displayParticipantName.getValue();
	}

	setDisplayAudioDetection(displayAudioDetection: boolean) {
		this.displayAudioDetection.next(displayAudioDetection);
	}

	isAudioDetectionDisplayed(): boolean {
		return this.displayAudioDetection.getValue();
	}

	setStreamVideoControls(streamVideoControls: boolean) {
		this.streamVideoControls.next(streamVideoControls);
	}

	showStreamVideoControls(): boolean {
		return this.streamVideoControls.getValue();
	}

	setParticipantItemMuteButton(participantItemMuteButton: boolean) {
		this.participantItemMuteButton.next(participantItemMuteButton);
	}

	showParticipantItemMuteButton(): boolean {
		return this.participantItemMuteButton.getValue();
	}

	setBackgroundEffectsButton(backgroundEffectsButton: boolean) {
		this.backgroundEffectsButton.next(backgroundEffectsButton);
	}

	showBackgroundEffectsButton(): boolean {
		return this.backgroundEffectsButton.getValue();
	}

	// Admin dashboard

	setAdminRecordingsList(adminRecordingsList: RecordingInfo[]) {
		this.adminRecordingsList.next(adminRecordingsList);
	}

	getAdminRecordingsList(): RecordingInfo[] {
		return this.adminRecordingsList.getValue();
	}

	setAdminLoginError(adminLoginError: any) {
		this.adminLoginError.next(adminLoginError);
	}

	getAdminLoginError(): any {
		return this.adminLoginError.getValue();
	}

	getConfig(): OpenViduComponentsConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.production || false;
	}

	/**
	 * Retrieves the base href of the application.
	 *
	 * @returns The base href of the application as a string.
	 */
	getBaseHref(): string {
		const base = this.document.getElementsByTagName('base');
		if (!base || base.length === 0) {
			return '/';
		}

		const baseHref = base[0].href;
		if (baseHref) {
			return baseHref;
		}
		return '/';
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
