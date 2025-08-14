import { animate, style, transition, trigger } from '@angular/animations';
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	EventEmitter,
	OnDestroy,
	Output,
	TemplateRef,
	ViewChild
} from '@angular/core';
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
import {
	TemplateManagerService,
	TemplateConfiguration,
	ExternalDirectives,
	DefaultTemplates
} from '../../services/template/template-manager.service';
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
import {
	LayoutAdditionalElementsDirective,
	ParticipantPanelAfterLocalParticipantDirective,
	PreJoinDirective
} from '../../directives/template/internals.directive';

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
			transition(':enter', [
				style({ opacity: 0 }),
				animate(`${VideoconferenceComponent.ANIMATION_DURATION_MS}ms ease-out`, style({ opacity: 1 }))
			])
			// transition(':leave', [style({ opacity: 1 }), animate('50ms ease-in', style({ opacity: 0.9 }))])
		])
	],
	standalone: false
})
export class VideoconferenceComponent implements OnDestroy, AfterViewInit {
	// Constants
	private static readonly PARTICIPANT_NAME_TIMEOUT_MS = 1000;
	private static readonly ANIMATION_DURATION_MS = 300;
	private static readonly MATERIAL_ICONS_URL =
		'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=background_replace,keep_off';
	private static readonly MATERIAL_ICONS_SELECTOR = 'link[href*="Material+Symbols+Outlined"]';
	private static readonly SPINNER_DIAMETER = 50;
	// *** Toolbar ***

	private _externalToolbar?: ToolbarDirective;
	/**
	 * @internal
	 */
	@ContentChild(ToolbarDirective)
	set externalToolbar(value: ToolbarDirective) {
		this._externalToolbar = value;
		this.setupTemplates();
	}

	get externalToolbar(): ToolbarDirective | undefined {
		return this._externalToolbar;
	}

	private _externalToolbarAdditionalButtons?: ToolbarAdditionalButtonsDirective;

	/**
	 * @internal
	 */
	@ContentChild(ToolbarAdditionalButtonsDirective)
	set externalToolbarAdditionalButtons(value: ToolbarAdditionalButtonsDirective) {
		this._externalToolbarAdditionalButtons = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalToolbarAdditionalButtons(): ToolbarAdditionalButtonsDirective | undefined {
		return this._externalToolbarAdditionalButtons;
	}

	private _externalToolbarAdditionalPanelButtons?: ToolbarAdditionalPanelButtonsDirective;

	/**
	 * @internal
	 */
	@ContentChild(ToolbarAdditionalPanelButtonsDirective)
	set externalToolbarAdditionalPanelButtons(value: ToolbarAdditionalPanelButtonsDirective) {
		this._externalToolbarAdditionalPanelButtons = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalToolbarAdditionalPanelButtons(): ToolbarAdditionalPanelButtonsDirective | undefined {
		return this._externalToolbarAdditionalPanelButtons;
	}

	private _externalAdditionalPanels?: AdditionalPanelsDirective;

	/**
	 * @internal
	 */
	@ContentChild(AdditionalPanelsDirective)
	set externalAdditionalPanels(value: AdditionalPanelsDirective) {
		this._externalAdditionalPanels = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalAdditionalPanels(): AdditionalPanelsDirective | undefined {
		return this._externalAdditionalPanels;
	}

	// *** Panels ***

	private _externalPanel?: PanelDirective;

	/**
	 * @internal
	 */
	@ContentChild(PanelDirective)
	set externalPanel(value: PanelDirective) {
		this._externalPanel = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalPanel(): PanelDirective | undefined {
		return this._externalPanel;
	}

	private _externalChatPanel?: ChatPanelDirective;

	/**
	 * @internal
	 */
	@ContentChild(ChatPanelDirective)
	set externalChatPanel(value: ChatPanelDirective) {
		this._externalChatPanel = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalChatPanel(): ChatPanelDirective | undefined {
		return this._externalChatPanel;
	}

	private _externalActivitiesPanel?: ActivitiesPanelDirective;

	/**
	 * @internal
	 */
	@ContentChild(ActivitiesPanelDirective)
	set externalActivitiesPanel(value: ActivitiesPanelDirective) {
		this._externalActivitiesPanel = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalActivitiesPanel(): ActivitiesPanelDirective | undefined {
		return this._externalActivitiesPanel;
	}

	private _externalParticipantsPanel?: ParticipantsPanelDirective;

	/**
	 * @internal
	 */
	@ContentChild(ParticipantsPanelDirective)
	set externalParticipantsPanel(value: ParticipantsPanelDirective) {
		this._externalParticipantsPanel = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalParticipantsPanel(): ParticipantsPanelDirective | undefined {
		return this._externalParticipantsPanel;
	}

	private _externalParticipantPanelItem?: ParticipantPanelItemDirective;

	/**
	 * @internal
	 */
	@ContentChild(ParticipantPanelItemDirective)
	set externalParticipantPanelItem(value: ParticipantPanelItemDirective) {
		this._externalParticipantPanelItem = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalParticipantPanelItem(): ParticipantPanelItemDirective | undefined {
		return this._externalParticipantPanelItem;
	}

	private _externalParticipantPanelItemElements?: ParticipantPanelItemElementsDirective;

	/**
	 * @internal
	 */
	@ContentChild(ParticipantPanelItemElementsDirective)
	set externalParticipantPanelItemElements(value: ParticipantPanelItemElementsDirective) {
		this._externalParticipantPanelItemElements = value;
		this.setupTemplates();
	}

	/**
	 * @internal
	 */
	get externalParticipantPanelItemElements(): ParticipantPanelItemElementsDirective | undefined {
		return this._externalParticipantPanelItemElements;
	}

	// *** Layout ***

	private _externalLayout?: LayoutDirective;
	/**
	 * @internal
	 */
	@ContentChild(LayoutDirective)
	set externalLayout(value: LayoutDirective) {
		this._externalLayout = value;
		this.setupTemplates();
	}
	/**
	 * @internal
	 */
	get externalLayout(): LayoutDirective | undefined {
		return this._externalLayout;
	}

	private _externalStream?: StreamDirective;
	/**
	 * @internal
	 */
	@ContentChild(StreamDirective)
	set externalStream(value: StreamDirective) {
		this._externalStream = value;
		this.setupTemplates();
	}
	/**
	 * @internal
	 */
	get externalStream(): StreamDirective | undefined {
		return this._externalStream;
	}

	// *** PreJoin ***

	private _externalPreJoin?: PreJoinDirective;
	/**
	 * @internal
	 */
	@ContentChild(PreJoinDirective)
	set externalPreJoin(value: PreJoinDirective) {
		this._externalPreJoin = value;
		this.setupTemplates();
	}
	/**
	 * @internal
	 */
	get externalPreJoin(): PreJoinDirective | undefined {
		return this._externalPreJoin;
	}

	private _externalParticipantPanelAfterLocalParticipant?: ParticipantPanelAfterLocalParticipantDirective;
	/**
	 * @internal
	 */
	@ContentChild(ParticipantPanelAfterLocalParticipantDirective)
	set externalParticipantPanelAfterLocalParticipant(value: ParticipantPanelAfterLocalParticipantDirective) {
		this._externalParticipantPanelAfterLocalParticipant = value;
		this.setupTemplates();
	}
	/**
	 * @internal
	 */
	get externalParticipantPanelAfterLocalParticipant(): ParticipantPanelAfterLocalParticipantDirective | undefined {
		return this._externalParticipantPanelAfterLocalParticipant;
	}

	private _externalLayoutAdditionalElements?: LayoutAdditionalElementsDirective;
	/**
	 * @internal
	 */
	@ContentChild(LayoutAdditionalElementsDirective)
	set externalLayoutAdditionalElements(value: LayoutAdditionalElementsDirective) {
		this._externalLayoutAdditionalElements = value;
		this.setupTemplates();
	}
	/**
	 * @internal
	 */
	get externalLayoutAdditionalElements(): LayoutAdditionalElementsDirective | undefined {
		return this._externalLayoutAdditionalElements;
	}

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
	openviduAngularParticipantPanelAfterLocalParticipantTemplate: TemplateRef<any>;
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
	 * @internal
	 */
	ovLayoutAdditionalElementsTemplate: TemplateRef<any>;

	/**
	 * @internal
	 * Template configuration managed by TemplateManagerService
	 */
	private templateConfig: TemplateConfiguration;

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
		private libService: OpenViduComponentsConfigService,
		private templateManagerService: TemplateManagerService
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
		const externalDirectives: ExternalDirectives = {
			toolbar: this.externalToolbar,
			toolbarAdditionalButtons: this.externalToolbarAdditionalButtons,
			toolbarAdditionalPanelButtons: this.externalToolbarAdditionalPanelButtons,
			additionalPanels: this.externalAdditionalPanels,
			panel: this.externalPanel,
			chatPanel: this.externalChatPanel,
			activitiesPanel: this.externalActivitiesPanel,
			participantsPanel: this.externalParticipantsPanel,
			participantPanelAfterLocalParticipant: this.externalParticipantPanelAfterLocalParticipant,
			participantPanelItem: this.externalParticipantPanelItem,
			participantPanelItemElements: this.externalParticipantPanelItemElements,
			layout: this.externalLayout,
			stream: this.externalStream,
			preJoin: this.externalPreJoin,
			layoutAdditionalElements: this.externalLayoutAdditionalElements
		};

		const defaultTemplates: DefaultTemplates = {
			toolbar: this.defaultToolbarTemplate,
			panel: this.defaultPanelTemplate,
			chatPanel: this.defaultChatPanelTemplate,
			participantsPanel: this.defaultParticipantsPanelTemplate,
			activitiesPanel: this.defaultActivitiesPanelTemplate,
			participantPanelItem: this.defaultParticipantPanelItemTemplate,
			layout: this.defaultLayoutTemplate,
			stream: this.defaultStreamTemplate
		};

		// Use the template manager service to set up all templates
		this.templateConfig = this.templateManagerService.setupTemplates(externalDirectives, defaultTemplates);

		// Apply the configuration to the component properties
		this.applyTemplateConfiguration();
	}

	/**
	 * @internal
	 * Applies the template configuration to component properties
	 */
	private applyTemplateConfiguration(): void {
		const assignIfChanged = <K extends keyof this>(prop: K, value: this[K]) => {
			if (this[prop] !== value) {
				this[prop] = value;
			}
		};

		assignIfChanged('openviduAngularToolbarTemplate', this.templateConfig.toolbarTemplate);
		assignIfChanged('openviduAngularPanelTemplate', this.templateConfig.panelTemplate);
		assignIfChanged('openviduAngularChatPanelTemplate', this.templateConfig.chatPanelTemplate);
		assignIfChanged('openviduAngularParticipantsPanelTemplate', this.templateConfig.participantsPanelTemplate);
		assignIfChanged('openviduAngularActivitiesPanelTemplate', this.templateConfig.activitiesPanelTemplate);
		assignIfChanged('openviduAngularParticipantPanelItemTemplate', this.templateConfig.participantPanelItemTemplate);
		assignIfChanged('openviduAngularLayoutTemplate', this.templateConfig.layoutTemplate);
		assignIfChanged('openviduAngularStreamTemplate', this.templateConfig.streamTemplate);

		// Optional templates
		if (this.templateConfig.toolbarAdditionalButtonsTemplate) {
			assignIfChanged('openviduAngularToolbarAdditionalButtonsTemplate', this.templateConfig.toolbarAdditionalButtonsTemplate);
		}
		if (this.templateConfig.toolbarAdditionalPanelButtonsTemplate) {
			assignIfChanged(
				'openviduAngularToolbarAdditionalPanelButtonsTemplate',
				this.templateConfig.toolbarAdditionalPanelButtonsTemplate
			);
		}
		if (this.templateConfig.additionalPanelsTemplate) {
			assignIfChanged('openviduAngularAdditionalPanelsTemplate', this.templateConfig.additionalPanelsTemplate);
		}
		if (this.templateConfig.participantPanelAfterLocalParticipantTemplate) {
			assignIfChanged(
				'openviduAngularParticipantPanelAfterLocalParticipantTemplate',
				this.templateConfig.participantPanelAfterLocalParticipantTemplate
			);
		}
		if (this.templateConfig.participantPanelItemElementsTemplate) {
			assignIfChanged(
				'openviduAngularParticipantPanelItemElementsTemplate',
				this.templateConfig.participantPanelItemElementsTemplate
			);
		}
		if (this.templateConfig.preJoinTemplate) {
			assignIfChanged('openviduAngularPreJoinTemplate', this.templateConfig.preJoinTemplate);
		}
		if (this.templateConfig.layoutAdditionalElementsTemplate) {
			assignIfChanged('ovLayoutAdditionalElementsTemplate', this.templateConfig.layoutAdditionalElementsTemplate);
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

			// Get the most current participant name from the service
			// This ensures we have the latest value after any batch updates
			const participantName = this.libService.getCurrentParticipantName() || this.latestParticipantName;

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
					// Wait a bit and try again in case name is still propagating
					setTimeout(() => {
						const retryName = this.libService.getCurrentParticipantName() || this.latestParticipantName;
						if (retryName) {
							this.log.d(`Retrying token request for participant: ${retryName}`);
							this.onTokenRequested.emit(retryName);
						} else {
							this.log.e('Still no participant name available after retry');
						}
					}, 10);
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
								this.libService.updateGeneralConfig({ participantName: storedName });
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

				// If we're waiting for a participant name to proceed with joining, do it now
				if (
					this.componentState.state === VideoconferenceState.JOINING &&
					this.componentState.isRoomReady &&
					!this.componentState.showPrejoin
				) {
					this.log.d('Participant name received, proceeding to join');
					this.updateComponentState({
						state: VideoconferenceState.READY_TO_CONNECT,
						showPrejoin: false
					});
				}
			}
		});
	}
}
