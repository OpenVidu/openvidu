import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RecordingInfo } from '../../models/recording.model';
import { ToolbarAdditionalButtonsPosition } from '../../models/toolbar.model';
import { ParticipantModel } from '../../models/participant.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class OpenViduComponentsConfigService {
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
	private prejoinDisplayParticipantName = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	prejoinDisplayParticipantName$: Observable<boolean>;

	private videoEnabled = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	videoEnabled$: Observable<boolean>;
	private audioEnabled = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	audioEnabled$: Observable<boolean>;

	private showDisconnectionDialog = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	showDisconnectionDialog$: Observable<boolean>;

	private recordingStreamBaseUrl = <BehaviorSubject<string>>new BehaviorSubject('call/api/recordings');
	recordingStreamBaseUrl$: Observable<string>;

	//Toolbar settings
	private cameraButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	cameraButton$: Observable<boolean>;

	private microphoneButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	microphoneButton$: Observable<boolean>;

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

	private brandingLogo = <BehaviorSubject<string>>new BehaviorSubject('');
	brandingLogo$: Observable<string>;

	private displayLogo = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	displayLogo$: Observable<boolean>;

	private toolbarAdditionalButtonsPosition = <BehaviorSubject<ToolbarAdditionalButtonsPosition>>(
		new BehaviorSubject(ToolbarAdditionalButtonsPosition.AFTER_MENU)
	);
	toolbarAdditionalButtonsPosition$: Observable<ToolbarAdditionalButtonsPosition>;

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
	private toolbarViewRecordingsButton = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	toolbarViewRecordingsButton$: Observable<boolean>;
	private broadcastingButton = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	broadcastingButton$: Observable<boolean>;
	private recordingActivity = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	recordingActivity$: Observable<boolean>;
	private broadcastingActivity = <BehaviorSubject<boolean>>new BehaviorSubject(true);
	broadcastingActivity$: Observable<boolean>;

	// Recording activity configuration
	private recordingActivityReadOnly = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	recordingActivityReadOnly$: Observable<boolean>;
	private recordingActivityShowControls = <BehaviorSubject<{ play?: boolean; download?: boolean; delete?: boolean }>>(
		new BehaviorSubject({ play: true, download: true, delete: true })
	);
	recordingActivityShowControls$: Observable<{ play?: boolean; download?: boolean; delete?: boolean; externalView?: boolean }>;

	// Admin
	private adminRecordingsList: BehaviorSubject<RecordingInfo[]> = new BehaviorSubject(<RecordingInfo[]>[]);
	adminRecordingsList$: Observable<RecordingInfo[]>;
	private adminLoginError = <BehaviorSubject<any>>new BehaviorSubject(null);
	private adminLoginTitle = <BehaviorSubject<string>>new BehaviorSubject('');
	private adminDashboardTitle = <BehaviorSubject<string>>new BehaviorSubject('');
	adminLoginTitle$: Observable<string>;
	adminDashboardTitle$: Observable<string>;
	adminLoginError$: Observable<any>;

	// Internals
	private layoutRemoteParticipants: BehaviorSubject<ParticipantModel[] | undefined> = new BehaviorSubject(<any>undefined);
	layoutRemoteParticipants$: Observable<ParticipantModel[] | undefined>;

	constructor() {
		this.token$ = this.token.asObservable();
		this.livekitUrl$ = this.livekitUrl.asObservable();
		this.tokenError$ = this.tokenError.asObservable();
		this.minimal$ = this.minimal.asObservable();
		this.participantName$ = this.participantName.asObservable();
		this.prejoin$ = this.prejoin.asObservable();
		this.prejoinDisplayParticipantName$ = this.prejoinDisplayParticipantName.asObservable();
		this.videoEnabled$ = this.videoEnabled.asObservable();
		this.audioEnabled$ = this.audioEnabled.asObservable();
		this.recordingStreamBaseUrl$ = this.recordingStreamBaseUrl.asObservable();
		//Toolbar observables
		this.cameraButton$ = this.cameraButton.asObservable();
		this.microphoneButton$ = this.microphoneButton.asObservable();
		this.screenshareButton$ = this.screenshareButton.asObservable();
		this.fullscreenButton$ = this.fullscreenButton.asObservable();
		this.backgroundEffectsButton$ = this.backgroundEffectsButton.asObservable();
		this.leaveButton$ = this.leaveButton.asObservable();
		this.participantsPanelButton$ = this.participantsPanelButton.asObservable();
		this.chatPanelButton$ = this.chatPanelButton.asObservable();
		this.activitiesPanelButton$ = this.activitiesPanelButton.asObservable();
		this.displayRoomName$ = this.displayRoomName.asObservable();
		this.displayLogo$ = this.displayLogo.asObservable();
		this.brandingLogo$ = this.brandingLogo.asObservable();
		this.recordingButton$ = this.recordingButton.asObservable();
		this.toolbarViewRecordingsButton$ = this.toolbarViewRecordingsButton.asObservable();
		this.broadcastingButton$ = this.broadcastingButton.asObservable();
		this.toolbarSettingsButton$ = this.toolbarSettingsButton.asObservable();
		this.captionsButton$ = this.captionsButton.asObservable();
		this.toolbarAdditionalButtonsPosition$ = this.toolbarAdditionalButtonsPosition.asObservable();
		//Stream observables
		this.displayParticipantName$ = this.displayParticipantName.asObservable();
		this.displayAudioDetection$ = this.displayAudioDetection.asObservable();
		this.streamVideoControls$ = this.streamVideoControls.asObservable();
		// Participant item observables
		this.participantItemMuteButton$ = this.participantItemMuteButton.asObservable();
		// Recording activity observables
		this.recordingActivity$ = this.recordingActivity.asObservable();
		this.recordingActivityReadOnly$ = this.recordingActivityReadOnly.asObservable();
		this.recordingActivityShowControls$ = this.recordingActivityShowControls.asObservable();
		// Broadcasting activity
		this.broadcastingActivity$ = this.broadcastingActivity.asObservable();
		// Admin dashboard
		this.adminRecordingsList$ = this.adminRecordingsList.asObservable();
		this.adminLoginError$ = this.adminLoginError.asObservable();
		this.adminLoginTitle$ = this.adminLoginTitle.asObservable();
		this.adminDashboardTitle$ = this.adminDashboardTitle.asObservable();
		// Internals
		this.layoutRemoteParticipants$ = this.layoutRemoteParticipants.asObservable();
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

	setPrejoinDisplayParticipantName(prejoinDisplayParticipantName: boolean) {
		this.prejoinDisplayParticipantName.next(prejoinDisplayParticipantName);
	}

	showPrejoin(): boolean {
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

	getShowDisconnectionDialog(): boolean {
		return this.showDisconnectionDialog.getValue();
	}

	setShowDisconnectionDialog(showDisconnectionDialog: boolean) {
		this.showDisconnectionDialog.next(showDisconnectionDialog);
	}

	setRecordingStreamBaseUrl(recordingStreamBaseUrl: string) {
		this.recordingStreamBaseUrl.next(recordingStreamBaseUrl);
	}

	getRecordingStreamBaseUrl(): string {
		let baseUrl = this.recordingStreamBaseUrl.getValue();
		// Add trailing slash if not present
		baseUrl += baseUrl.endsWith('/') ? '' : '/';
		return baseUrl;
	}

	//Toolbar settings

	setCameraButton(cameraButton: boolean) {
		this.cameraButton.next(cameraButton);
	}

	showCameraButton(): boolean {
		return this.cameraButton.getValue();
	}

	setMicrophoneButton(microphoneButton: boolean) {
		this.microphoneButton.next(microphoneButton);
	}

	showMicrophoneButton(): boolean {
		return this.microphoneButton.getValue();
	}

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

	setBrandingLogo(brandingLogo: string) {
		this.brandingLogo.next(brandingLogo);
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
	getToolbarAdditionalButtonsPosition(): ToolbarAdditionalButtonsPosition {
		return this.toolbarAdditionalButtonsPosition.getValue();
	}

	setToolbarAdditionalButtonsPosition(toolbarAdditionalButtonsPosition: ToolbarAdditionalButtonsPosition) {
		this.toolbarAdditionalButtonsPosition.next(toolbarAdditionalButtonsPosition);
	}

	setRecordingButton(recordingButton: boolean) {
		this.recordingButton.next(recordingButton);
	}

	showRecordingButton(): boolean {
		return this.recordingButton.getValue();
	}

	setToolbarViewRecordingsButton(toolbarViewRecordingsButton: boolean) {
		this.toolbarViewRecordingsButton.next(toolbarViewRecordingsButton);
	}

	getToolbarViewRecordingsButton(): boolean {
		return this.toolbarViewRecordingsButton.getValue();
	}

	showToolbarViewRecordingsButton(): boolean {
		return this.getToolbarViewRecordingsButton();
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

	getAdminLoginTitle(): string {
		return this.adminLoginTitle.getValue();
	}

	setAdminLoginTitle(title: string) {
		this.adminLoginTitle.next(title);
	}

	getAdminDashboardTitle(): string {
		return this.adminDashboardTitle.getValue();
	}

	setAdminDashboardTitle(title: string) {
		this.adminDashboardTitle.next(title);
	}

	isRecordingEnabled(): boolean {
		return this.recordingButton.getValue() && this.recordingActivity.getValue();
	}

	isBroadcastingEnabled(): boolean {
		return this.broadcastingButton.getValue() && this.broadcastingActivity.getValue();
	}

	// Internals
	setLayoutRemoteParticipants(participants: ParticipantModel[] | undefined) {
		this.layoutRemoteParticipants.next(participants);
	}

	// Recording Activity Configuration
	setRecordingActivityReadOnly(readOnly: boolean) {
		this.recordingActivityReadOnly.next(readOnly);
	}

	isRecordingActivityReadOnly(): boolean {
		return this.recordingActivityReadOnly.getValue();
	}


	setRecordingActivityShowControls(controls: { play?: boolean; download?: boolean; delete?: boolean }) {
		this.recordingActivityShowControls.next(controls);
	}

	getRecordingActivityShowControls(): { play?: boolean; download?: boolean; delete?: boolean } {
		return this.recordingActivityShowControls.getValue();
	}
}
