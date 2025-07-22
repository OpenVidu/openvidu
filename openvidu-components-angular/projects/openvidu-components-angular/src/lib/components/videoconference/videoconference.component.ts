import { animate, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, ContentChild, EventEmitter, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { Subject, filter, skip, take, takeUntil } from 'rxjs';
import {
	ActivitiesPanelDirective,
	AdditionalPanelsDirective,
	ChatPanelDirective,
	LayoutDirective,
	PanelDirective,
	ParticipantPanelItemDirective,
	ParticipantPanelItemElementsDirective,
	ParticipantsPanelDirective,
	PreJoinDirective,
	StreamDirective,
	ToolbarAdditionalButtonsDirective,
	ToolbarAdditionalPanelButtonsDirective,
	ToolbarDirective
} from '../../directives/template/openvidu-components-angular.directive';
import { ILogger } from '../../models/logger.model';
import { VideoconferenceState, VideoconferenceStateInfo } from '../../models/videoconference-state.model';
import { ActionService } from '../../services/action/action.service';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';
import { DeviceService } from '../../services/device/device.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { StorageService } from '../../services/storage/storage.service';
import { Room } from 'livekit-client';
import { ParticipantLeftEvent, ParticipantModel } from '../../models/participant.model';
import { CustomDevice } from '../../models/device.model';
import {
	ActivitiesPanelStatusEvent,
	ChatPanelStatusEvent,
	ParticipantsPanelStatusEvent,
	SettingsPanelStatusEvent
} from '../../models/panel.model';
import {
	RecordingDeleteRequestedEvent,
	RecordingDownloadClickedEvent,
	RecordingPlayClickedEvent,
	RecordingStartRequestedEvent,
	RecordingStopRequestedEvent
} from '../../models/recording.model';
import { BroadcastingStartRequestedEvent, BroadcastingStopRequestedEvent } from '../../models/broadcasting.model';
import { LangOption } from '../../models/lang.model';

/**
 * The **VideoconferenceComponent** is the parent of all OpenVidu components.
 * It allow us to create a modern, useful and powerful videoconference apps with ease.
 */
@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.scss'],
	animations: [
		trigger('inOutAnimation', [
			transition(':enter', [style({ opacity: 0 }), animate(`${VideoconferenceComponent.ANIMATION_DURATION_MS}ms ease-out`, style({ opacity: 1 }))])
			// transition(':leave', [style({ opacity: 1 }), animate('50ms ease-in', style({ opacity: 0.9 }))])
		])
	],
	standalone: false
})
export class VideoconferenceComponent implements OnDestroy, AfterViewInit {

	// Constants
	private static readonly PARTICIPANT_NAME_TIMEOUT_MS = 1000;
	private static readonly ANIMATION_DURATION_MS = 300;
	private static readonly MATERIAL_ICONS_URL = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=background_replace,keep_off';
	private static readonly MATERIAL_ICONS_SELECTOR = 'link[href*="Material+Symbols+Outlined"]';
	private static readonly SPINNER_DIAMETER = 50;
	// *** Toolbar ***
	/**
	 * @internal
	 */
	@ContentChild(ToolbarDirective) externalToolbar: ToolbarDirective;
	/**
	 * @internal
	 */
	@ContentChild(ToolbarAdditionalButtonsDirective) externalToolbarAdditionalButtons: ToolbarAdditionalButtonsDirective;
	/**
	 * @internal
	 */
	@ContentChild(ToolbarAdditionalPanelButtonsDirective) externalToolbarAdditionalPanelButtons: ToolbarAdditionalPanelButtonsDirective;
	/**
	 * @internal
	 */
	@ContentChild(AdditionalPanelsDirective) externalAdditionalPanels: AdditionalPanelsDirective;

	// *** Panels ***

	/**
	 * @internal
	 */
	@ContentChild(PanelDirective) externalPanel: PanelDirective;
	/**
	 * @internal
	 */
	@ContentChild(ChatPanelDirective) externalChatPanel: ChatPanelDirective;
	/**
	 * @internal
	 */
	@ContentChild(ActivitiesPanelDirective) externalActivitiesPanel: ActivitiesPanelDirective;

	/**
	 * @internal
	 */
	@ContentChild(ParticipantsPanelDirective) externalParticipantsPanel: ParticipantsPanelDirective;
	/**
	 * @internal
	 */
	@ContentChild(ParticipantPanelItemDirective) externalParticipantPanelItem: ParticipantPanelItemDirective;
	/**
	 * @internal
	 */
	@ContentChild(ParticipantPanelItemElementsDirective) externalParticipantPanelItemElements: ParticipantPanelItemElementsDirective;

	// *** Layout ***
	/**
	 * @internal
	 */
	@ContentChild(LayoutDirective) externalLayout: LayoutDirective;
	/**
	 * @internal
	 */
	@ContentChild(StreamDirective) externalStream: StreamDirective;

	// *** PreJoin ***
	/**
	 * @internal
	 */
	@ContentChild(PreJoinDirective) externalPreJoin: PreJoinDirective;

	/**
	 * @internal
	 */
	@ViewChild('defaultToolbar', { static: false, read: TemplateRef }) defaultToolbarTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	@ViewChild('defaultPanel', { static: false, read: TemplateRef }) defaultPanelTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	@ViewChild('defaultChatPanel', { static: false, read: TemplateRef }) defaultChatPanelTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	@ViewChild('defaultParticipantsPanel', { static: false, read: TemplateRef }) defaultParticipantsPanelTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	@ViewChild('defaultActivitiesPanel', { static: false, read: TemplateRef })
	defaultActivitiesPanelTemplate: TemplateRef<any>;

	/**
	 * @internal
	 */
	@ViewChild('defaultParticipantPanelItem', { static: false, read: TemplateRef }) defaultParticipantPanelItemTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	@ViewChild('defaultLayout', { static: false, read: TemplateRef }) defaultLayoutTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	@ViewChild('defaultStream', { static: false, read: TemplateRef }) defaultStreamTemplate: TemplateRef<any>;

	/**
	 * @internal
	 */
	openviduAngularToolbarTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularToolbarAdditionalButtonsTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularActivitiesPanelTemplate: TemplateRef<any>;

	/**
	 * @internal
	 */
	openviduAngularToolbarAdditionalPanelButtonsTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularPanelTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularChatPanelTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularParticipantsPanelTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularAdditionalPanelsTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularParticipantPanelItemTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularParticipantPanelItemElementsTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularLayoutTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularStreamTemplate: TemplateRef<any>;
	/**
	 * @internal
	 */
	openviduAngularPreJoinTemplate: TemplateRef<any>;

	/**
	 * Provides event notifications that fire when the local participant is ready to join to the room.
	 * This event emits the participant name as data.
	 */
	@Output() onTokenRequested: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when the local participant is ready to join to the room.
	 * This event is only emitted when the prejoin page has been shown.
	 */
	@Output() onReadyToJoin: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when Room is disconnected for the local participant.
	 * @deprecated Use {@link VideoconferenceComponent.onParticipantLeft} instead
	 */
	@Output() onRoomDisconnected: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when Room is being reconnected for the local participant.
	 */
	@Output() onRoomReconnecting: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when Room is reconnected for the local participant.
	 */
	@Output() onRoomReconnected: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * This event is emitted when the local participant leaves the room.
	 */
	@Output() onParticipantLeft: EventEmitter<ParticipantLeftEvent> = new EventEmitter<ParticipantLeftEvent>();

	/**
	 * This event is emitted when the video state changes, providing information about if the video is enabled (true) or disabled (false).
	 */
	@Output() onVideoEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();
	/**
	 * This event is emitted when the selected video device changes, providing information about the new custom device that has been selected.
	 */
	@Output() onVideoDeviceChanged: EventEmitter<CustomDevice> = new EventEmitter<CustomDevice>();

	/**
	 * This event is emitted when the audio state changes, providing information about if the audio is enabled (true) or disabled (false).
	 */
	@Output() onAudioEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This event is emitted when the selected audio device changes, providing information about the new custom device that has been selected.
	 */
	@Output() onAudioDeviceChanged: EventEmitter<CustomDevice> = new EventEmitter<CustomDevice>();

	/**
	 * This event is emitted when the language changes, providing information about the new language that has been selected.
	 */
	@Output() onLangChanged: EventEmitter<LangOption> = new EventEmitter<LangOption>();

	/**
	 * This event is emitted when the screen share state changes, providing information about if the screen share is enabled (true) or disabled (false).
	 */
	@Output() onScreenShareEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * The event is emitted when the fullscreen state changes, providing information about if the fullscreen is enabled (true) or disabled (false).
	 */
	@Output() onFullscreenEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This event is fired when the chat panel status has been changed.
	 * It provides the new status of the chat panel as {@link ChatPanelStatusEvent} payload.
	 */
	@Output() onChatPanelStatusChanged: EventEmitter<ChatPanelStatusEvent> = new EventEmitter<ChatPanelStatusEvent>();

	/**
	 * This event is fired when the participants panel status has been changed.
	 * It provides the new status of the participants panel as {@link ParticipantsPanelStatusEvent} payload.
	 */
	@Output() onParticipantsPanelStatusChanged: EventEmitter<ParticipantsPanelStatusEvent> =
		new EventEmitter<ParticipantsPanelStatusEvent>();

	/**
	 * This event is fired when the settings panel status has been changed.
	 * It provides the new status of the settings panel as {@link SettingsPanelStatusEvent} payload.
	 */
	@Output() onSettingsPanelStatusChanged: EventEmitter<SettingsPanelStatusEvent> = new EventEmitter<SettingsPanelStatusEvent>();

	/**
	 * This event is fired when the activities panel status has been changed.
	 * It provides the new status of the activities panel as {@link ActivitiesPanelStatusEvent} payload.
	 */
	@Output() onActivitiesPanelStatusChanged: EventEmitter<ActivitiesPanelStatusEvent> = new EventEmitter<ActivitiesPanelStatusEvent>();

	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 * It provides the {@link RecordingStopRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStopRequested: EventEmitter<RecordingStopRequestedEvent> = new EventEmitter<RecordingStopRequestedEvent>();

	/**
	 * This event is fired when the user clicks on the start recording button.
	 * It provides the {@link RecordingStartRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStartRequested: EventEmitter<RecordingStartRequestedEvent> = new EventEmitter<RecordingStartRequestedEvent>();

	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * It provides the {@link RecordingDeleteRequestedEvent} payload as event data.
	 */
	@Output() onRecordingDeleteRequested: EventEmitter<RecordingDeleteRequestedEvent> = new EventEmitter<RecordingDeleteRequestedEvent>();

	/**
	 * Provides event notifications that fire when play recording button is clicked from {@link ActivitiesPanelComponent}.
	 * It provides the {@link RecordingPlayClickedEvent} payload as event data.
	 */
	@Output() onRecordingPlayClicked: EventEmitter<RecordingPlayClickedEvent> = new EventEmitter<RecordingPlayClickedEvent>();

	/**
	 * @internal
	 * This event is fired when the user clicks on the view recording button.
	 * It provides the recording ID as event data.
	 */
	@Output() onViewRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when download recording button is clicked from {@link ActivitiesPanelComponent}.
	 * It provides the {@link RecordingDownloadClickedEvent} payload as event data.
	 */
	@Output() onRecordingDownloadClicked: EventEmitter<RecordingDownloadClickedEvent> = new EventEmitter<RecordingDownloadClickedEvent>();

	/**
	 * Provides event notifications that fire when start broadcasting button is clicked.
	 * It provides the {@link BroadcastingStartRequestedEvent} payload as event data.
	 */
	@Output() onBroadcastingStartRequested: EventEmitter<BroadcastingStartRequestedEvent> =
		new EventEmitter<BroadcastingStartRequestedEvent>();

	/**
	 * Provides event notifications that fire when stop broadcasting button is clicked.
	 * It provides the {@link BroadcastingStopRequestedEvent} payload as event data.
	 */
	@Output() onBroadcastingStopRequested: EventEmitter<BroadcastingStopRequestedEvent> =
		new EventEmitter<BroadcastingStopRequestedEvent>();

	/**
	 * @internal
	 * This event is fired when the user clicks on the view recordings button.
	 */
	@Output() onViewRecordingsClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when Room is created for the local participant.
	 * It provides the {@link https://openvidu.io/latest/docs/getting-started/#room Room} payload as event data.
	 */
	@Output() onRoomCreated: EventEmitter<Room> = new EventEmitter<Room>();

	/**
	 * Provides event notifications that fire when local participant is created and connected to the Room.
	 * @deprecated Use `onParticipantConnected` instead
	 */
	@Output() onParticipantCreated: EventEmitter<ParticipantModel> = new EventEmitter<ParticipantModel>();

	/**
	 * Provides event notifications that fire when local participant is connected to the Room.
	 * It provides the {@link ParticipantModel} payload as event data.
	 */
	@Output() onParticipantConnected: EventEmitter<ParticipantModel> = new EventEmitter<ParticipantModel>();

	/**
	 * @internal
	 * Centralized state management for the videoconference component
	 */
	componentState: VideoconferenceStateInfo = {
		state: VideoconferenceState.INITIALIZING,
		showPrejoin: true,
		isRoomReady: false,
		isConnected: false,
		hasAudioDevices: false,
		hasVideoDevices: false,
		hasUserInitiatedJoin: false,
		wasPrejoinShown: false,
		isLoading: true,
		error: {
			hasError: false,
			message: '',
			tokenError: null
		}
	};

	private destroy$ = new Subject<void>();
	private log: ILogger;
	private latestParticipantName: string | undefined;

	// Expose constants to template
	get spinnerDiameter(): number {
		return VideoconferenceComponent.SPINNER_DIAMETER;
	}

	/**
	 * @internal
	 * Updates the component state
	 */
	private updateComponentState(newState: Partial<VideoconferenceStateInfo>): void {
		this.componentState = { ...this.componentState, ...newState };
		this.log.d(`State updated to: ${this.componentState.state}`, this.componentState);
	}

	/**
	 * @internal
	 * Checks if user has initiated the join process
	 */
	private hasUserInitiatedJoin(): boolean {
		return (
			this.componentState.state === VideoconferenceState.JOINING ||
			this.componentState.state === VideoconferenceState.READY_TO_CONNECT ||
			this.componentState.state === VideoconferenceState.CONNECTED
		);
	}

	/**
	 * @internal
	 */
	constructor(
		private loggerSrv: LoggerService,
		private storageSrv: StorageService,
		private deviceSrv: DeviceService,
		private openviduService: OpenViduService,
		private actionService: ActionService,
		private libService: OpenViduComponentsConfigService
	) {
		this.log = this.loggerSrv.get('VideoconferenceComponent');

		// Initialize state
		this.updateComponentState({
			state: VideoconferenceState.INITIALIZING,
			showPrejoin: true,
			isRoomReady: false,
			wasPrejoinShown: false,
			isLoading: true,
			error: { hasError: false }
		});

		this.subscribeToVideconferenceDirectives();
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
		this.deviceSrv.clear();
	}

	/**
	 * @internal
	 */
	ngAfterViewInit() {
		this.addMaterialIconsIfNeeded();
		this.setupTemplates();
		this.deviceSrv.initializeDevices().then(() => {
			this.updateComponentState({
				isLoading: false
			});
		});
	}

	/**
	 * @internal
	 */
	private addMaterialIconsIfNeeded(): void {
		//Add material icons to the page if not already present
		const existingLink = document.querySelector(VideoconferenceComponent.MATERIAL_ICONS_SELECTOR);
		if (!existingLink) {
			const link = document.createElement('link');
			link.href = VideoconferenceComponent.MATERIAL_ICONS_URL;
			link.rel = 'stylesheet';
			document.head.appendChild(link);
		}
	}

	/**
	 * @internal
	 */
	private setupTemplates(): void {
		this.setupToolbarTemplate();
		this.setupPanelTemplate();
		this.setupLayoutTemplate();
		this.setupPreJoinTemplate();
	}

	/**
	 * @internal
	 */
	private setupToolbarTemplate(): void {
		if (this.externalToolbar) {
			this.log.d('Setting EXTERNAL TOOLBAR');
			this.openviduAngularToolbarTemplate = this.externalToolbar.template;
		} else {
			this.log.d('Setting DEFAULT TOOLBAR');
			this.setupToolbarAdditionalButtons();
			this.openviduAngularToolbarTemplate = this.defaultToolbarTemplate;
		}
	}

	/**
	 * @internal
	 */
	private setupToolbarAdditionalButtons(): void {
		if (this.externalToolbarAdditionalButtons) {
			this.log.d('Setting EXTERNAL TOOLBAR ADDITIONAL BUTTONS');
			this.openviduAngularToolbarAdditionalButtonsTemplate = this.externalToolbarAdditionalButtons.template;
		}
		if (this.externalToolbarAdditionalPanelButtons) {
			this.log.d('Setting EXTERNAL TOOLBAR ADDITIONAL PANEL BUTTONS');
			this.openviduAngularToolbarAdditionalPanelButtonsTemplate = this.externalToolbarAdditionalPanelButtons.template;
		}
	}

	/**
	 * @internal
	 */
	private setupPanelTemplate(): void {
		if (this.externalPanel) {
			this.log.d('Setting EXTERNAL PANEL');
			this.openviduAngularPanelTemplate = this.externalPanel.template;
		} else {
			this.log.d('Setting DEFAULT PANEL');
			this.setupParticipantsPanel();
			this.setupChatPanel();
			this.setupActivitiesPanel();
			this.setupAdditionalPanels();
			this.openviduAngularPanelTemplate = this.defaultPanelTemplate;
		}
	}

	/**
	 * @internal
	 */
	private setupParticipantsPanel(): void {
		if (this.externalParticipantsPanel) {
			this.openviduAngularParticipantsPanelTemplate = this.externalParticipantsPanel.template;
			this.log.d('Setting EXTERNAL PARTICIPANTS PANEL');
		} else {
			this.log.d('Setting DEFAULT PARTICIPANTS PANEL');
			this.setupParticipantPanelItem();
			this.openviduAngularParticipantsPanelTemplate = this.defaultParticipantsPanelTemplate;
		}
	}

	/**
	 * @internal
	 */
	private setupParticipantPanelItem(): void {
		if (this.externalParticipantPanelItem) {
			this.log.d('Setting EXTERNAL P ITEM');
			this.openviduAngularParticipantPanelItemTemplate = this.externalParticipantPanelItem.template;
		} else {
			if (this.externalParticipantPanelItemElements) {
				this.log.d('Setting EXTERNAL PARTICIPANT PANEL ITEM ELEMENT');
				this.openviduAngularParticipantPanelItemElementsTemplate = this.externalParticipantPanelItemElements.template;
			}
			this.openviduAngularParticipantPanelItemTemplate = this.defaultParticipantPanelItemTemplate;
			this.log.d('Setting DEFAULT P ITEM');
		}
	}

	/**
	 * @internal
	 */
	private setupChatPanel(): void {
		if (this.externalChatPanel) {
			this.log.d('Setting EXTERNAL CHAT PANEL');
			this.openviduAngularChatPanelTemplate = this.externalChatPanel.template;
		} else {
			this.log.d('Setting DEFAULT CHAT PANEL');
			this.openviduAngularChatPanelTemplate = this.defaultChatPanelTemplate;
		}
	}

	/**
	 * @internal
	 */
	private setupActivitiesPanel(): void {
		if (this.externalActivitiesPanel) {
			this.log.d('Setting EXTERNAL ACTIVITIES PANEL');
			this.openviduAngularActivitiesPanelTemplate = this.externalActivitiesPanel.template;
		} else {
			this.log.d('Setting DEFAULT ACTIVITIES PANEL');
			this.openviduAngularActivitiesPanelTemplate = this.defaultActivitiesPanelTemplate;
		}
	}

	/**
	 * @internal
	 */
	private setupAdditionalPanels(): void {
		if (this.externalAdditionalPanels) {
			this.log.d('Setting EXTERNAL ADDITIONAL PANELS');
			this.openviduAngularAdditionalPanelsTemplate = this.externalAdditionalPanels.template;
		}
	}

	/**
	 * @internal
	 */
	private setupLayoutTemplate(): void {
		if (this.externalLayout) {
			this.log.d('Setting EXTERNAL LAYOUT');
			this.openviduAngularLayoutTemplate = this.externalLayout.template;
		} else {
			this.log.d('Setting DEFAULT LAYOUT');
			this.setupStreamTemplate();
			this.openviduAngularLayoutTemplate = this.defaultLayoutTemplate;
		}
	}

	/**
	 * @internal
	 */
	private setupStreamTemplate(): void {
		if (this.externalStream) {
			this.log.d('Setting EXTERNAL STREAM');
			this.openviduAngularStreamTemplate = this.externalStream.template;
		} else {
			this.log.d('Setting DEFAULT STREAM');
			this.openviduAngularStreamTemplate = this.defaultStreamTemplate;
		}
	}

	/**
	 * @internal
	 */
	private setupPreJoinTemplate(): void {
		if (this.externalPreJoin) {
			this.log.d('Setting EXTERNAL PREJOIN');
			this.openviduAngularPreJoinTemplate = this.externalPreJoin.template;
		} else {
			this.log.d('Setting DEFAULT PREJOIN');
			// Keep the default behavior - no template is set
		}
	}

	/**
	 * @internal
	 * Handles the ready-to-join event, initializing the room and managing the prejoin flow.
	 * This method coordinates the transition from prejoin state to actual room joining.
	 */
	_onReadyToJoin(): void {
		this.log.d('Ready to join - initializing room and handling prejoin flow');

		try {
			// Mark that user has initiated the join process
			this.updateComponentState({
				state: VideoconferenceState.JOINING,
				wasPrejoinShown: this.componentState.showPrejoin
			});

			// Always initialize the room when ready to join
			this.openviduService.initRoom();

			const participantName = this.latestParticipantName;

			if (this.componentState.isRoomReady) {
				// Room is ready, hide prejoin and proceed
				this.log.d('Room is ready, proceeding to join');
				this.updateComponentState({
					state: VideoconferenceState.READY_TO_CONNECT,
					showPrejoin: false
				});
			} else {
				// Room not ready, request token if we have a participant name
				if (participantName) {
					this.log.d(`Requesting token for participant: ${participantName}`);
					this.onTokenRequested.emit(participantName);
				} else {
					this.log.w('No participant name available when requesting token');
				}
			}

			// Emit onReadyToJoin event only if prejoin page was actually shown
			// This ensures the event semantics are correct
			if (this.componentState.wasPrejoinShown) {
				this.log.d('Emitting onReadyToJoin event (prejoin was shown)');
				this.onReadyToJoin.emit();
			}
		} catch (error) {
			this.log.e('Error during ready to join process', error);
			this.updateComponentState({
				state: VideoconferenceState.ERROR,
				error: {
					hasError: true,
					message: 'Error during ready to join process'
				}
			});
		}
	}
	/**
	 * @internal
	 */
	_onParticipantLeft(event: ParticipantLeftEvent) {
		// Reset to disconnected state to allow prejoin to show again if needed
		this.updateComponentState({
			state: VideoconferenceState.DISCONNECTED,
			isRoomReady: false,
			showPrejoin: this.libService.showPrejoin()
		});

		this.onParticipantLeft.emit(event);
	}

	private subscribeToVideconferenceDirectives() {
		this.libService.token$.pipe(skip(1), takeUntil(this.destroy$)).subscribe((token: string) => {
			try {
				if (!token) {
					this.log.e('Token is empty');
					return;
				}

				const livekitUrl = this.libService.getLivekitUrl();
				this.openviduService.initializeAndSetToken(token, livekitUrl);
				this.log.d('Token has been successfully set. Room is ready to join');

				// Only update showPrejoin if user hasn't initiated join process yet
				// This prevents prejoin from showing again after user clicked join
				if (!this.hasUserInitiatedJoin()) {
					this.updateComponentState({
						state: VideoconferenceState.PREJOIN_SHOWN,
						isRoomReady: true,
						showPrejoin: this.libService.showPrejoin()
					});
				} else {
					// User has initiated join, proceed to hide prejoin and continue
					this.log.d('User has initiated join, hiding prejoin and proceeding');
					this.updateComponentState({
						state: VideoconferenceState.READY_TO_CONNECT,
						isRoomReady: true,
						showPrejoin: false
					});
				}
			} catch (error) {
				this.log.e('Error trying to set token', error);
				this.updateComponentState({
					state: VideoconferenceState.ERROR,
					error: {
						hasError: true,
						message: 'Error setting token',
						tokenError: error
					}
				});
			}
		});

		this.libService.tokenError$.pipe(takeUntil(this.destroy$)).subscribe((error: any) => {
			if (!error) return;

			this.log.e('Token error received', error);
			this.updateComponentState({
				state: VideoconferenceState.ERROR,
				error: {
					hasError: true,
					message: 'Token error',
					tokenError: error
				}
			});

			if (!this.componentState.showPrejoin) {
				this.actionService.openDialog(error.name, error.message, false);
			}
		});

		this.libService.prejoin$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.updateComponentState({
				showPrejoin: value
			});

			if (!value) {
				// Emit token ready if the prejoin page won't be shown

				// Ensure we have a participant name before proceeding with the join
				this.log.d('Prejoin page is hidden, checking participant name');
				// Check if we have a participant name already
				if (this.latestParticipantName) {
					// We have a name, proceed immediately
					this._onReadyToJoin();
				} else {
					// No name yet - set up a one-time subscription to wait for it
					this.libService.participantName$
						.pipe(
							filter((name) => !!name),
							take(1),
							takeUntil(this.destroy$)
						)
						.subscribe(() => {
							// Now we have the name in latestParticipantName
							this._onReadyToJoin();
						});
					// Add safety timeout in case name never arrives
					setTimeout(() => {
						if (!this.latestParticipantName) {
							this.log.w('No participant name received after timeout, proceeding anyway');
							const storedName = this.storageSrv.getParticipantName();
							if (storedName) {
								this.latestParticipantName = storedName;
								this.libService.setParticipantName(storedName);
							}
							this._onReadyToJoin();
						}
					}, VideoconferenceComponent.PARTICIPANT_NAME_TIMEOUT_MS);
				}
			}
		});

		this.libService.participantName$.pipe(takeUntil(this.destroy$)).subscribe((name: string) => {
			if (name) {
				this.latestParticipantName = name;
				this.storageSrv.setParticipantName(name);
			}
		});
	}
}
