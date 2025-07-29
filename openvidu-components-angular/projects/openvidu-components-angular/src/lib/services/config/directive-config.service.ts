import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, shareReplay, map } from 'rxjs/operators';
import { RecordingInfo } from '../../models/recording.model';
import { ToolbarAdditionalButtonsPosition } from '../../models/toolbar.model';
import { ParticipantModel } from '../../models/participant.model';

/**
 * Configuration item for the service
 */
interface ConfigItem<T> {
	subject: BehaviorSubject<T>;
	observable$: Observable<T>;
}

/**
 * Recording activity controls configuration
 */
interface RecordingControls {
	play: boolean;
	download: boolean;
	delete: boolean;
	externalView: boolean;
}

/**
 * Toolbar configuration grouped by domain
 */
interface ToolbarConfig {
	camera: boolean;
	microphone: boolean;
	screenshare: boolean;
	fullscreen: boolean;
	captions: boolean;
	settings: boolean;
	leave: boolean;
	participantsPanel: boolean;
	chatPanel: boolean;
	activitiesPanel: boolean;
	displayRoomName: boolean;
	displayLogo: boolean;
	backgroundEffects: boolean;
	recording: boolean;
	viewRecordings: boolean;
	broadcasting: boolean;
	brandingLogo: string;
	additionalButtonsPosition: ToolbarAdditionalButtonsPosition;
}

/**
 * Stream/Video configuration
 */
interface StreamConfig {
	videoEnabled: boolean;
	audioEnabled: boolean;
	displayParticipantName: boolean;
	displayAudioDetection: boolean;
	videoControls: boolean;
	participantItemMuteButton: boolean;
}

/**
 * Recording activity configuration
 */
interface RecordingActivityConfig {
	enabled: boolean;
	readOnly: boolean;
	showControls: RecordingControls;
	startStopButton: boolean;
	viewRecordingsButton: boolean;
	showRecordingsList: boolean;
}

/**
 * Admin dashboard configuration
 */
interface AdminConfig {
	recordingsList: RecordingInfo[];
	loginError: any;
	loginTitle: string;
	dashboardTitle: string;
}

/**
 * General application configuration
 */
interface GeneralConfig {
	token: string;
	livekitUrl: string;
	tokenError: any;
	minimal: boolean;
	participantName: string;
	prejoin: boolean;
	prejoinDisplayParticipantName: boolean;
	showDisconnectionDialog: boolean;
	recordingStreamBaseUrl: string;
}

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class OpenViduComponentsConfigService {
	/**
	 * Helper method to create a configuration item with BehaviorSubject and Observable
	 */
	private createConfigItem<T>(initialValue: T): ConfigItem<T> {
		const subject = new BehaviorSubject<T>(initialValue);
		const observable$ = subject.asObservable().pipe(distinctUntilChanged(), shareReplay(1));
		return { subject, observable$ };
	}

	/**
	 * Helper method for array configurations with optimized comparison
	 */
	private createArrayConfigItem<T>(initialValue: T[]): ConfigItem<T[]> {
		const subject = new BehaviorSubject<T[]>(initialValue);
		const observable$ = subject.asObservable().pipe(
			distinctUntilChanged((prev, curr) => {
				if (prev.length !== curr.length) return false;
				return prev.every((item, index) => this.deepEqual(item, curr[index]));
			}),
			shareReplay(1)
		);
		return { subject, observable$ };
	}

	/**
	 * Helper method for RecordingControls with specific comparison
	 */
	private createRecordingControlsConfigItem(initialValue: RecordingControls): ConfigItem<RecordingControls> {
		const subject = new BehaviorSubject<RecordingControls>(initialValue);
		const observable$ = subject.asObservable().pipe(
			distinctUntilChanged(
				(prev, curr) =>
					prev.play === curr.play &&
					prev.download === curr.download &&
					prev.delete === curr.delete &&
					prev.externalView === curr.externalView
			),
			shareReplay(1)
		);
		return { subject, observable$ };
	}

	/**
	 * Helper method for ToolbarConfig with specific comparison
	 */
	private createToolbarConfigItem(initialValue: ToolbarConfig): ConfigItem<ToolbarConfig> {
		const subject = new BehaviorSubject<ToolbarConfig>(initialValue);
		const observable$ = subject.asObservable().pipe(
			distinctUntilChanged((prev, curr) => this.compareToolbarConfig(prev, curr)),
			shareReplay(1)
		);
		return { subject, observable$ };
	}

	/**
	 * Helper method for StreamConfig with specific comparison
	 */
	private createStreamConfigItem(initialValue: StreamConfig): ConfigItem<StreamConfig> {
		const subject = new BehaviorSubject<StreamConfig>(initialValue);
		const observable$ = subject.asObservable().pipe(
			distinctUntilChanged((prev, curr) => this.compareStreamConfig(prev, curr)),
			shareReplay(1)
		);
		return { subject, observable$ };
	}

	/**
	 * Helper method for RecordingActivityConfig with specific comparison
	 */
	private createRecordingActivityConfigItem(initialValue: RecordingActivityConfig): ConfigItem<RecordingActivityConfig> {
		const subject = new BehaviorSubject<RecordingActivityConfig>(initialValue);
		const observable$ = subject.asObservable().pipe(
			distinctUntilChanged((prev, curr) => this.compareRecordingActivityConfig(prev, curr)),
			shareReplay(1)
		);
		return { subject, observable$ };
	}

	/**
	 * Helper method for AdminConfig with specific comparison
	 */
	private createAdminConfigItem(initialValue: AdminConfig): ConfigItem<AdminConfig> {
		const subject = new BehaviorSubject<AdminConfig>(initialValue);
		const observable$ = subject.asObservable().pipe(
			distinctUntilChanged((prev, curr) => this.compareAdminConfig(prev, curr)),
			shareReplay(1)
		);
		return { subject, observable$ };
	}

	/**
	 * Helper method for GeneralConfig with specific comparison
	 */
	private createGeneralConfigItem(initialValue: GeneralConfig): ConfigItem<GeneralConfig> {
		const subject = new BehaviorSubject<GeneralConfig>(initialValue);
		const observable$ = subject.asObservable().pipe(
			distinctUntilChanged((prev, curr) => this.compareGeneralConfig(prev, curr)),
			shareReplay(1)
		);
		return { subject, observable$ };
	}

	/**
	 * Optimized deep equality check
	 */
	private deepEqual(a: any, b: any): boolean {
		if (a === b) return true;
		if (a == null || b == null) return a === b;
		if (typeof a !== typeof b) return false;
		if (typeof a !== 'object') return a === b;

		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;

		return keysA.every((key) => this.deepEqual(a[key], b[key]));
	}

	/**
	 * Compare ToolbarConfig efficiently
	 */
	private compareToolbarConfig(prev: ToolbarConfig, curr: ToolbarConfig): boolean {
		return (
			prev.camera === curr.camera &&
			prev.microphone === curr.microphone &&
			prev.screenshare === curr.screenshare &&
			prev.fullscreen === curr.fullscreen &&
			prev.captions === curr.captions &&
			prev.settings === curr.settings &&
			prev.leave === curr.leave &&
			prev.participantsPanel === curr.participantsPanel &&
			prev.chatPanel === curr.chatPanel &&
			prev.activitiesPanel === curr.activitiesPanel &&
			prev.displayRoomName === curr.displayRoomName &&
			prev.displayLogo === curr.displayLogo &&
			prev.backgroundEffects === curr.backgroundEffects &&
			prev.recording === curr.recording &&
			prev.viewRecordings === curr.viewRecordings &&
			prev.broadcasting === curr.broadcasting &&
			prev.brandingLogo === curr.brandingLogo &&
			prev.additionalButtonsPosition === curr.additionalButtonsPosition
		);
	}

	/**
	 * Compare StreamConfig efficiently
	 */
	private compareStreamConfig(prev: StreamConfig, curr: StreamConfig): boolean {
		return (
			prev.videoEnabled === curr.videoEnabled &&
			prev.audioEnabled === curr.audioEnabled &&
			prev.displayParticipantName === curr.displayParticipantName &&
			prev.displayAudioDetection === curr.displayAudioDetection &&
			prev.videoControls === curr.videoControls &&
			prev.participantItemMuteButton === curr.participantItemMuteButton
		);
	}

	/**
	 * Compare RecordingActivityConfig efficiently
	 */
	private compareRecordingActivityConfig(prev: RecordingActivityConfig, curr: RecordingActivityConfig): boolean {
		return (
			prev.enabled === curr.enabled &&
			prev.readOnly === curr.readOnly &&
			prev.startStopButton === curr.startStopButton &&
			prev.viewRecordingsButton === curr.viewRecordingsButton &&
			prev.showRecordingsList === curr.showRecordingsList &&
			prev.showControls.play === curr.showControls.play &&
			prev.showControls.download === curr.showControls.download &&
			prev.showControls.delete === curr.showControls.delete &&
			prev.showControls.externalView === curr.showControls.externalView
		);
	}

	/**
	 * Compare AdminConfig efficiently
	 */
	private compareAdminConfig(prev: AdminConfig, curr: AdminConfig): boolean {
		return (
			prev.loginError === curr.loginError &&
			prev.loginTitle === curr.loginTitle &&
			prev.dashboardTitle === curr.dashboardTitle &&
			prev.recordingsList.length === curr.recordingsList.length &&
			prev.recordingsList.every((item, index) => this.deepEqual(item, curr.recordingsList[index]))
		);
	}

	/**
	 * Compare GeneralConfig efficiently
	 */
	private compareGeneralConfig(prev: GeneralConfig, curr: GeneralConfig): boolean {
		return (
			prev.token === curr.token &&
			prev.livekitUrl === curr.livekitUrl &&
			prev.tokenError === curr.tokenError &&
			prev.minimal === curr.minimal &&
			prev.participantName === curr.participantName &&
			prev.prejoin === curr.prejoin &&
			prev.prejoinDisplayParticipantName === curr.prejoinDisplayParticipantName &&
			prev.showDisconnectionDialog === curr.showDisconnectionDialog &&
			prev.recordingStreamBaseUrl === curr.recordingStreamBaseUrl
		);
	}

	// Grouped configuration items by domain
	private generalConfig = this.createGeneralConfigItem({
		token: '',
		livekitUrl: '',
		tokenError: null,
		minimal: false,
		participantName: '',
		prejoin: true,
		prejoinDisplayParticipantName: true,
		showDisconnectionDialog: true,
		recordingStreamBaseUrl: 'call/api/recordings'
	});

	private toolbarConfig = this.createToolbarConfigItem({
		camera: true,
		microphone: true,
		screenshare: true,
		fullscreen: true,
		captions: true,
		settings: true,
		leave: true,
		participantsPanel: true,
		chatPanel: true,
		activitiesPanel: true,
		displayRoomName: true,
		displayLogo: true,
		backgroundEffects: true,
		recording: true,
		viewRecordings: false,
		broadcasting: true,
		brandingLogo: '',
		additionalButtonsPosition: ToolbarAdditionalButtonsPosition.AFTER_MENU
	});

	private streamConfig = this.createStreamConfigItem({
		videoEnabled: true,
		audioEnabled: true,
		displayParticipantName: true,
		displayAudioDetection: true,
		videoControls: true,
		participantItemMuteButton: true
	});

	private recordingActivityConfig = this.createRecordingActivityConfigItem({
		enabled: true,
		readOnly: false,
		showControls: {
			play: true,
			download: true,
			delete: true,
			externalView: false
		},
		startStopButton: true,
		viewRecordingsButton: false,
		showRecordingsList: true
	});

	private adminConfig = this.createAdminConfigItem({
		recordingsList: [],
		loginError: null,
		loginTitle: '',
		dashboardTitle: ''
	});

	// Individual configs that don't fit into groups
	private broadcastingActivityConfig = this.createConfigItem(true);
	private layoutRemoteParticipantsConfig = this.createConfigItem<ParticipantModel[] | undefined>(undefined);

	// General observables
	token$: Observable<string> = this.generalConfig.observable$.pipe(map((config) => config.token));
	livekitUrl$: Observable<string> = this.generalConfig.observable$.pipe(map((config) => config.livekitUrl));
	tokenError$: Observable<any> = this.generalConfig.observable$.pipe(map((config) => config.tokenError));
	minimal$: Observable<boolean> = this.generalConfig.observable$.pipe(map((config) => config.minimal));
	participantName$: Observable<string> = this.generalConfig.observable$.pipe(map((config) => config.participantName));
	prejoin$: Observable<boolean> = this.generalConfig.observable$.pipe(map((config) => config.prejoin));
	prejoinDisplayParticipantName$: Observable<boolean> = this.generalConfig.observable$.pipe(
		map((config) => config.prejoinDisplayParticipantName)
	);
	showDisconnectionDialog$: Observable<boolean> = this.generalConfig.observable$.pipe(map((config) => config.showDisconnectionDialog));
	recordingStreamBaseUrl$: Observable<string> = this.generalConfig.observable$.pipe(map((config) => config.recordingStreamBaseUrl));

	// Stream observables
	videoEnabled$: Observable<boolean> = this.streamConfig.observable$.pipe(map((config) => config.videoEnabled));
	audioEnabled$: Observable<boolean> = this.streamConfig.observable$.pipe(map((config) => config.audioEnabled));
	displayParticipantName$: Observable<boolean> = this.streamConfig.observable$.pipe(map((config) => config.displayParticipantName));
	displayAudioDetection$: Observable<boolean> = this.streamConfig.observable$.pipe(map((config) => config.displayAudioDetection));
	streamVideoControls$: Observable<boolean> = this.streamConfig.observable$.pipe(map((config) => config.videoControls));
	participantItemMuteButton$: Observable<boolean> = this.streamConfig.observable$.pipe(map((config) => config.participantItemMuteButton));

	// Toolbar observables
	cameraButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.camera));
	microphoneButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.microphone));
	screenshareButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.screenshare));
	fullscreenButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.fullscreen));
	captionsButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.captions));
	toolbarSettingsButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.settings));
	leaveButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.leave));
	participantsPanelButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.participantsPanel));
	chatPanelButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.chatPanel));
	activitiesPanelButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.activitiesPanel));
	displayRoomName$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.displayRoomName));
	brandingLogo$: Observable<string> = this.toolbarConfig.observable$.pipe(map((config) => config.brandingLogo));
	displayLogo$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.displayLogo));
	toolbarAdditionalButtonsPosition$: Observable<ToolbarAdditionalButtonsPosition> = this.toolbarConfig.observable$.pipe(
		map((config) => config.additionalButtonsPosition)
	);
	backgroundEffectsButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.backgroundEffects));
	recordingButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.recording));
	toolbarViewRecordingsButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.viewRecordings));
	broadcastingButton$: Observable<boolean> = this.toolbarConfig.observable$.pipe(map((config) => config.broadcasting));

	// Recording activity observables
	recordingActivity$: Observable<boolean> = this.recordingActivityConfig.observable$.pipe(map((config) => config.enabled));
	recordingActivityReadOnly$: Observable<boolean> = this.recordingActivityConfig.observable$.pipe(map((config) => config.readOnly));
	recordingActivityShowControls$: Observable<RecordingControls> = this.recordingActivityConfig.observable$.pipe(
		map((config) => config.showControls)
	);
	recordingActivityStartStopRecordingButton$: Observable<boolean> = this.recordingActivityConfig.observable$.pipe(
		map((config) => config.startStopButton)
	);
	recordingActivityViewRecordingsButton$: Observable<boolean> = this.recordingActivityConfig.observable$.pipe(
		map((config) => config.viewRecordingsButton)
	);
	recordingActivityShowRecordingsList$: Observable<boolean> = this.recordingActivityConfig.observable$.pipe(
		map((config) => config.showRecordingsList)
	);

	// Admin observables
	adminRecordingsList$: Observable<RecordingInfo[]> = this.adminConfig.observable$.pipe(map((config) => config.recordingsList));
	adminLoginError$: Observable<any> = this.adminConfig.observable$.pipe(map((config) => config.loginError));
	adminLoginTitle$: Observable<string> = this.adminConfig.observable$.pipe(map((config) => config.loginTitle));
	adminDashboardTitle$: Observable<string> = this.adminConfig.observable$.pipe(map((config) => config.dashboardTitle));

	// Individual observables that don't fit into groups
	broadcastingActivity$: Observable<boolean> = this.broadcastingActivityConfig.observable$;
	layoutRemoteParticipants$: Observable<ParticipantModel[] | undefined> = this.layoutRemoteParticipantsConfig.observable$;

	constructor() {
		// Constructor no longer needed - all observables are initialized directly
	}

	// ============================================
	// BATCH UPDATE METHODS
	// ============================================

	/**
	 * Update multiple general configuration properties at once
	 */
	updateGeneralConfig(partialConfig: Partial<GeneralConfig>): void {
		const current = this.generalConfig.subject.getValue();
		this.generalConfig.subject.next({ ...current, ...partialConfig });
	}

	/**
	 * Update multiple toolbar configuration properties at once
	 */
	updateToolbarConfig(partialConfig: Partial<ToolbarConfig>): void {
		const current = this.toolbarConfig.subject.getValue();
		this.toolbarConfig.subject.next({ ...current, ...partialConfig });
	}

	/**
	 * Update multiple stream configuration properties at once
	 */
	updateStreamConfig(partialConfig: Partial<StreamConfig>): void {
		const current = this.streamConfig.subject.getValue();
		this.streamConfig.subject.next({ ...current, ...partialConfig });
	}

	/**
	 * Update multiple recording activity configuration properties at once
	 */
	updateRecordingActivityConfig(partialConfig: Partial<RecordingActivityConfig>): void {
		const current = this.recordingActivityConfig.subject.getValue();
		this.recordingActivityConfig.subject.next({ ...current, ...partialConfig });
	}

	/**
	 * Update multiple admin configuration properties at once
	 */
	updateAdminConfig(partialConfig: Partial<AdminConfig>): void {
		const current = this.adminConfig.subject.getValue();
		this.adminConfig.subject.next({ ...current, ...partialConfig });
	}

	/**
	 * Update recording controls specifically with batch support
	 */
	updateRecordingControls(partialControls: Partial<RecordingControls>): void {
		const current = this.recordingActivityConfig.subject.getValue();
		const updatedControls = { ...current.showControls, ...partialControls };
		this.updateRecordingActivityConfig({ showControls: updatedControls });
	}

	// ============================================
	// DIRECT ACCESS METHODS (for internal use)
	// ============================================

	/**
	 * @internal
	 * Get current participant name directly
	 */
	getCurrentParticipantName(): string {
		return this.generalConfig.subject.getValue().participantName;
	}

	// ============================================
	// INDIVIDUAL GETTER/SETTER METHODS
	// ============================================

	// General configuration methods

	getLivekitUrl(): string {
		return this.generalConfig.subject.getValue().livekitUrl;
	}

	showPrejoin(): boolean {
		return this.generalConfig.subject.getValue().prejoin;
	}

	getShowDisconnectionDialog(): boolean {
		return this.generalConfig.subject.getValue().showDisconnectionDialog;
	}

	getRecordingStreamBaseUrl(): string {
		let baseUrl = this.generalConfig.subject.getValue().recordingStreamBaseUrl;
		// Add trailing slash if not present
		baseUrl += baseUrl.endsWith('/') ? '' : '/';
		return baseUrl;
	}

	// Stream configuration methods

	isVideoEnabled(): boolean {
		return this.streamConfig.subject.getValue().videoEnabled;
	}

	isAudioEnabled(): boolean {
		return this.streamConfig.subject.getValue().audioEnabled;
	}

	// Toolbar configuration methods

	setBroadcastingButton(broadcastingButton: boolean) {
		this.updateToolbarConfig({ broadcasting: broadcastingButton });
	}

	showBackgroundEffectsButton(): boolean {
		return this.toolbarConfig.subject.getValue().backgroundEffects;
	}

	// Activity methods (these remain individual as they don't fit cleanly into toolbar config)

	setBroadcastingActivity(broadcastingActivity: boolean) {
		this.broadcastingActivityConfig.subject.next(broadcastingActivity);
	}

	// Internals
	setLayoutRemoteParticipants(participants: ParticipantModel[] | undefined) {
		this.layoutRemoteParticipantsConfig.subject.next(participants);
	}

	// Recording Activity Configuration methods

	showRecordingActivityRecordingsList(): boolean {
		return this.recordingActivityConfig.subject.getValue().showRecordingsList;
	}
}