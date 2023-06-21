import { animate, style, transition, trigger } from '@angular/animations';
import {
	AfterViewInit,
	Component,
	ContentChild,
	EventEmitter,
	Input,
	OnDestroy,
	OnInit,
	Output,
	TemplateRef,
	ViewChild
} from '@angular/core';
import { OpenViduErrorName, Session } from 'openvidu-browser';
import { Subscription } from 'rxjs';
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
} from '../../directives/template/openvidu-angular.directive';
import { ILogger } from '../../models/logger.model';
import { OpenViduEdition } from '../../models/openvidu.model';
import { ParticipantAbstractModel } from '../../models/participant.model';
import { TokenModel } from '../../models/token.model';
import { ActionService } from '../../services/action/action.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { DeviceService } from '../../services/device/device.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { StorageService } from '../../services/storage/storage.service';
import { TranslateService } from '../../services/translate/translate.service';
import { LangOption } from '../../models/lang.model';

/**
 * The **VideoconferenceComponent** is the parent of all OpenVidu components.
 * It allow us to create a modern, useful and powerful videoconference apps with ease.
 *
 * <div class="custom-table-container">
 * <div>
 *  <h3>API Directives</h3>
 *
 * This component allows us to show or hide certain HTML elements with the following {@link https://angular.io/guide/attribute-directives Angular attribute directives}
 * with the aim of fully customizing the videoconference application.
 *
 * | **Parameter**                  | **Type**  | **Reference**                                   |
 * | :----------------------------: | :-------: | :---------------------------------------------: |
 * | **minimal**                        | `boolean` | {@link MinimalDirective}                        |
 * | **lang**                           | `string`  | {@link LangDirective}                           |
 * | **langOptions**            		| `LangOption []`  | {@link LangOptionsDirective}             |
 * | **captionsLang**                   | `string`  | {@link CaptionsLangDirective}                   |
 * | **captionsLangOptions**            | `CaptionsLangOption []`  | {@link CaptionsLangOptionsDirective}                   |
 * | **prejoin**                        | `boolean` | {@link PrejoinDirective}                        |
 * | **participantName**                | `string`  | {@link ParticipantNameDirective}                |
 * | **videoMuted**                     | `boolean` | {@link VideoMutedDirective}                     |
 * | **audioMuted**                     | `boolean` | {@link AudioMutedDirective}                     |
 * | **toolbarScreenshareButton**       | `boolean` | {@link ToolbarScreenshareButtonDirective}       |
 * | **toolbarFullscreenButton**        | `boolean` | {@link ToolbarFullscreenButtonDirective}        |
 * | **toolbarCaptionsButton** 			| `boolean` | {@link ToolbarCaptionsButtonDirective} 		  |
 * | **toolbarBackgroundEffectsButton** | `boolean` | {@link ToolbarBackgroundEffectsButtonDirective} |
 * | **toolbarLeaveButton**             | `boolean` | {@link ToolbarLeaveButtonDirective}             |
 * | **toolbarChatPanelButton**         | `boolean` | {@link ToolbarChatPanelButtonDirective}         |
 * | **toolbarParticipantsPanelButton** | `boolean` | {@link ToolbarParticipantsPanelButtonDirective} |
 * | **toolbarDisplayLogo**             | `boolean` | {@link ToolbarDisplayLogoDirective}             |
 * | **toolbarDisplaySessionName**      | `boolean` | {@link ToolbarDisplaySessionNameDirective}      |
 * | **streamDisplayParticipantName**   | `boolean` | {@link StreamDisplayParticipantNameDirective}   |
 * | **streamDisplayAudioDetection**    | `boolean` | {@link StreamDisplayAudioDetectionDirective}    |
 * | **streamSettingsButton**           | `boolean` | {@link StreamSettingsButtonDirective}           |
 * | **participantPanelItemMuteButton** | `boolean` | {@link ParticipantPanelItemMuteButtonDirective} |
 * | **recordingActivityRecordingList** | `{@link RecordingInfo}[]` | {@link RecordingActivityRecordingsListDirective} |
 * | **recordingActivityRecordingError** | `any` | {@link RecordingActivityRecordingErrorDirective} |
 *
 * <p class="component-link-text">
 * <span class="italic">See all {@link ApiDirectiveModule API Directives}</span>
 * </p>
 * </div>
 *
 * <div>
 *
 * <h3>OpenVidu Angular Directives</h3>
 *
 *
 * The VideoconferenceComponent is also providing us a way to **replace the default templates** with a custom one.
 * It will recognise the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * in the elements added as children.
 *
 * |             **Directive**           |                 **Reference**                 |
 * |:-----------------------------------:|:---------------------------------------------:|
 * |            ***ovToolbar**           |            {@link ToolbarDirective}           |
 * |   ***ovToolbarAdditionalButtons**   |   {@link ToolbarAdditionalButtonsDirective}   |
 * |***ovToolbarAdditionalPanelButtons**   |   {@link ToolbarAdditionalPanelButtonsDirective}   |
 * |             ***ovPanel**            |             {@link PanelDirective}            |
 * |        ***ovAdditionalPanels**      |       {@link AdditionalPanelsDirective}       |
 * |           ***ovChatPanel**          |           {@link ChatPanelDirective}          |
 * |       ***ovParticipantsPanel**      |       {@link ParticipantsPanelDirective}      |
 * |     ***ovParticipantPanelItem**     |     {@link ParticipantPanelItemDirective}     |
 * | ***ovParticipantPanelItemElements** | {@link ParticipantPanelItemElementsDirective} |
 * |            ***ovLayout**            |            {@link LayoutDirective}            |
 * |            ***ovStream**            |            {@link StreamDirective}            |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */
@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css'],
	animations: [
		trigger('inOutAnimation', [
			transition(':enter', [style({ opacity: 0 }), animate('300ms ease-out', style({ opacity: 1 }))])
			// transition(':leave', [style({ opacity: 1 }), animate('50ms ease-in', style({ opacity: 0.9 }))])
		])
	]
})
export class VideoconferenceComponent implements OnInit, OnDestroy, AfterViewInit {
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
	 * Tokens parameter is required to grant a participant access to a Session.
	 * This OpenVidu token will be use by each participant when connecting to a Session.
	 *
	 * This input accepts a {@link TokenModel} object type.
	 *
	 * @param {TokenModel} tokens  The tokens parameter must be a {@link TokenModel} object.
	 *
	 */
	@Input()
	set tokens(tokens: TokenModel) {
		let openviduEdition;
		if (!tokens || !tokens.webcam) {
			this.log.e('No tokens received');
			return;
		}

		try {
			openviduEdition = new URL(tokens.webcam).searchParams.get('edition');
		} catch (error) {
			this.log.e('Token received does not seem to be valid: ', tokens.webcam);
			return;
		}

		this.log.d('Tokens received');
		if (!!openviduEdition) {
			this.openviduService.setOpenViduEdition(OpenViduEdition.PRO);
		} else {
			this.openviduService.setOpenViduEdition(OpenViduEdition.CE);
		}

		this.openviduService.setWebcamToken(tokens.webcam);
		if (tokens.screen) {
			this.openviduService.setScreenToken(tokens.screen);
		} else {
			this.log.w('No screen token found. Screenshare feature will be disabled');
		}

		this.start();
	}

	/**
	 * Provides event notifications that fire when join button (in prejoin page) has been clicked.
	 */
	@Output() onJoinButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when leave button has been clicked.
	 */
	@Output() onToolbarLeaveButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when camera toolbar button has been clicked.
	 */
	@Output() onToolbarCameraButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when microphone toolbar button has been clicked.
	 */
	@Output() onToolbarMicrophoneButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when screenshare toolbar button has been clicked.
	 */
	@Output() onToolbarScreenshareButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when fullscreen toolbar button has been clicked.
	 */
	@Output() onToolbarFullscreenButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when participants panel button has been clicked.
	 */
	@Output() onToolbarParticipantsPanelButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when chat panel button has been clicked.
	 */
	@Output() onToolbarChatPanelButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when activities panel button has been clicked.
	 */
	@Output() onToolbarActivitiesPanelButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when start recording button is clicked {@link ToolbarComponent}.
	 *  The recording should be stopped using the REST API.
	 */
	@Output() onToolbarStartRecordingClicked: EventEmitter<void> = new EventEmitter<void>();
	/**
	 * Provides event notifications that fire when stop recording button is clicked from {@link ToolbarComponent}.
	 *  The recording should be stopped using the REST API.
	 */
	@Output() onToolbarStopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when start recording button is clicked {@link ActivitiesPanelComponent}.
	 *  The recording should be stopped using the REST API.
	 */
	@Output() onActivitiesPanelStartRecordingClicked: EventEmitter<void> = new EventEmitter<void>();
	/**
	 * Provides event notifications that fire when stop recording button is clicked from {@link ActivitiesPanelComponent}.
	 *  The recording should be stopped using the REST API.
	 */
	@Output() onActivitiesPanelStopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when delete recording button is clicked from {@link ActivitiesPanelComponent}.
	 *  The recording should be deleted using the REST API.
	 */
	@Output() onActivitiesPanelDeleteRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when a participant needs update the recordings information
	 * (usually when recording is stopped by the session moderator or recording panel is opened) from {@link ActivitiesPanelComponent}.
	 * The recordings should be updated using the REST API.
	 */
	@Output() onActivitiesPanelForceRecordingUpdate: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when play recording button is clicked from {@link ActivitiesPanelComponent}.
	 */
	@Output() onActivitiesPanelPlayRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when start broadcasting button is clicked from {@link ActivitiesPanelComponent}.
	 */
	@Output() onActivitiesPanelStartBroadcastingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when start broadcasting button is clicked from {@link ActivitiesPanelComponent}.
	 */
	@Output() onActivitiesPanelStopBroadcastingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when start broadcasting button is clicked from {@link ToolbarComponent}.
	 */
	@Output() onToolbarStopBroadcastingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when OpenVidu Session is created.
	 * See {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html openvidu-browser Session}.
	 */
	@Output() onSessionCreated: EventEmitter<Session> = new EventEmitter<Session>();

	/**
	 * Provides event notifications that fire when local participant is created.
	 */
	@Output() onParticipantCreated: EventEmitter<ParticipantAbstractModel> = new EventEmitter<ParticipantAbstractModel>();

	/**
	 * Provides event notifications that fire in the case of a node crash in your OpenVidu deployment.
	 * OpenVidu delegates the recovery of the sessions to the application in the event of a node crash.
	 * See {@link https://docs.openvidu.io/en/stable/openvidu-pro/fault-tolerance/ OpenVidu Pro Fault tolerance}.
	 */
	@Output() onNodeCrashed: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when the application language has changed.
	 */
	@Output() onLangChanged: EventEmitter<LangOption> = new EventEmitter<LangOption>();

	/**
	 * @internal
	 */
	showVideoconference: boolean = false;
	/**
	 * @internal
	 */
	participantReady: boolean = false;

	/**
	 * @internal
	 */
	error: boolean = false;
	/**
	 * @internal
	 */
	errorMessage: string = '';
	/**
	 * @internal
	 */
	showPrejoin: boolean = true;

	/**
	 * @internal
	 */
	isSessionInitialized: boolean = false;

	/**
	 * @internal
	 */
	loading = true;
	private nodeCrashed: boolean = false;
	private externalParticipantName: string;
	private prejoinSub: Subscription;
	private participantNameSub: Subscription;
	private langSub: Subscription;
	private log: ILogger;

	/**
	 * @internal
	 */
	constructor(
		private loggerSrv: LoggerService,
		private storageSrv: StorageService,
		private participantService: ParticipantService,
		private deviceSrv: DeviceService,
		private openviduService: OpenViduService,
		private actionService: ActionService,
		private libService: OpenViduAngularConfigService,
		private translateService: TranslateService
	) {
		this.log = this.loggerSrv.get('VideoconferenceComponent');
	}

	async ngOnInit() {
		this.subscribeToVideconferenceDirectives();
	}

	async ngOnDestroy() {
		if (this.prejoinSub) this.prejoinSub.unsubscribe();
		if (this.participantNameSub) this.participantNameSub.unsubscribe();
		if (this.langSub) this.langSub.unsubscribe();
		this.deviceSrv.clear();
		await this.openviduService.clear();
	}

	/**
	 * @internal
	 */
	ngAfterViewInit() {
		if (this.externalToolbar) {
			this.log.d('Setting EXTERNAL TOOLBAR');
			this.openviduAngularToolbarTemplate = this.externalToolbar.template;
		} else {
			this.log.d('Setting  DEFAULT TOOLBAR');
			if (this.externalToolbarAdditionalButtons) {
				this.log.d('Setting EXTERNAL TOOLBAR ADDITIONAL BUTTONS');
				this.openviduAngularToolbarAdditionalButtonsTemplate = this.externalToolbarAdditionalButtons.template;
			}
			if (this.externalToolbarAdditionalPanelButtons) {
				this.log.d('Setting EXTERNAL TOOLBAR ADDITIONAL PANEL BUTTONS');
				this.openviduAngularToolbarAdditionalPanelButtonsTemplate = this.externalToolbarAdditionalPanelButtons.template;
			}
			this.openviduAngularToolbarTemplate = this.defaultToolbarTemplate;
		}

		if (this.externalPanel) {
			this.log.d('Setting EXTERNAL PANEL');
			this.openviduAngularPanelTemplate = this.externalPanel.template;
		} else {
			this.log.d('Setting DEFAULT PANEL');

			if (this.externalParticipantsPanel) {
				this.openviduAngularParticipantsPanelTemplate = this.externalParticipantsPanel.template;
				this.log.d('Setting EXTERNAL PARTICIPANTS PANEL');
			} else {
				this.log.d('Setting DEFAULT PARTICIPANTS PANEL');
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
				this.openviduAngularParticipantsPanelTemplate = this.defaultParticipantsPanelTemplate;
			}

			if (this.externalChatPanel) {
				this.log.d('Setting EXTERNAL CHAT PANEL');
				this.openviduAngularChatPanelTemplate = this.externalChatPanel.template;
			} else {
				this.log.d('Setting DEFAULT CHAT PANEL');
				this.openviduAngularChatPanelTemplate = this.defaultChatPanelTemplate;
			}

			if (this.externalActivitiesPanel) {
				this.log.d('Setting EXTERNAL ACTIVITIES PANEL');
				this.openviduAngularActivitiesPanelTemplate = this.externalActivitiesPanel.template;
			} else {
				this.log.d('Setting DEFAULT ACTIVITIES PANEL');
				this.openviduAngularActivitiesPanelTemplate = this.defaultActivitiesPanelTemplate;
			}

			if (this.externalAdditionalPanels) {
				this.log.d('Setting EXTERNAL ADDITIONAL PANELS');
				this.openviduAngularAdditionalPanelsTemplate = this.externalAdditionalPanels.template;
			}
			this.openviduAngularPanelTemplate = this.defaultPanelTemplate;
		}

		if (this.externalLayout) {
			this.log.d('Setting EXTERNAL LAYOUT');
			this.openviduAngularLayoutTemplate = this.externalLayout.template;
		} else {
			this.log.d('Setting DEAFULT LAYOUT');

			if (this.externalStream) {
				this.log.d('Setting EXTERNAL STREAM');
				this.openviduAngularStreamTemplate = this.externalStream.template;
			} else {
				this.log.d('Setting DEFAULT STREAM');
				this.openviduAngularStreamTemplate = this.defaultStreamTemplate;
			}
			this.openviduAngularLayoutTemplate = this.defaultLayoutTemplate;
		}
	}

	private async start() {
		await this.deviceSrv.forceInitDevices();
		const nickname = this.externalParticipantName || this.storageSrv.getNickname() || `OpenVidu_User${Math.floor(Math.random() * 100)}`;
		this.participantService.initLocalParticipant({ local: true, nickname });
		this.openviduService.initialize();
		if (this.deviceSrv.hasVideoDeviceAvailable() || this.deviceSrv.hasAudioDeviceAvailable()) {
			await this.initwebcamPublisher();
		}
		this.isSessionInitialized = true;
		this.onSessionCreated.emit(this.openviduService.getWebcamSession());
		this.onParticipantCreated.emit(this.participantService.getLocalParticipant());
		this.loading = false;
		this.participantReady = true;
		if (this.nodeCrashed) {
			this.nodeCrashed = false;
			this.actionService.closeDialog();
		}
	}

	private async initwebcamPublisher(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				const publisher = await this.openviduService.initDefaultPublisher();

				if (publisher) {
					publisher.once('accessDenied', async (e: any) => {
						await this.handlePublisherError(e);
						resolve();
					});
					publisher.once('accessAllowed', () => {
						this.participantService.setMyCameraPublisher(publisher);
						this.participantService.updateLocalParticipant();
						resolve();
					});
				} else {
					this.participantService.setMyCameraPublisher(undefined);
					this.participantService.updateLocalParticipant();
				}
			} catch (error) {
				this.actionService.openDialog(error.name.replace(/_/g, ' '), error.message, true);
				this.log.e(error);
				reject();
			}
		});
	}

	/**
	 * @internal
	 */
	_onJoinButtonClicked() {
		this.showVideoconference = true;
		this.showPrejoin = false;
		this.onJoinButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onLeaveButtonClicked() {
		this.showVideoconference = false;
		this.participantReady = false;
		this.onToolbarLeaveButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onCameraButtonClicked() {
		this.onToolbarCameraButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onMicrophoneButtonClicked() {
		this.onToolbarMicrophoneButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onScreenshareButtonClicked() {
		this.onToolbarScreenshareButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onFullscreenButtonClicked() {
		this.onToolbarFullscreenButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onParticipantsPanelButtonClicked() {
		this.onToolbarParticipantsPanelButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onChatPanelButtonClicked() {
		this.onToolbarChatPanelButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onActivitiesPanelButtonClicked() {
		this.onToolbarActivitiesPanelButtonClicked.emit();
	}

	/**
	 * @internal
	 */
	onStartRecordingClicked(from: string) {
		if (from === 'toolbar') {
			this.onToolbarStartRecordingClicked.emit();
		} else if (from === 'panel') {
			this.onActivitiesPanelStartRecordingClicked.emit();
		}
	}

	/**
	 * @internal
	 */
	onStopRecordingClicked(from: string) {
		if (from === 'toolbar') {
			this.onToolbarStopRecordingClicked.emit();
		} else if (from === 'panel') {
			this.onActivitiesPanelStopRecordingClicked.emit();
		}
	}

	/**
	 * @internal
	 */
	onDeleteRecordingClicked(recordingId: string) {
		this.onActivitiesPanelDeleteRecordingClicked.emit(recordingId);
	}

	/**
	 * @internal
	 */

	onForceRecordingUpdate() {
		this.onActivitiesPanelForceRecordingUpdate.emit();
	}

	/**
	 * @internal
	 */
	onStartBroadcastingClicked(broadcastUrl: string) {
		// if (from === 'toolbar') {
		// 	this.onToolbarStartRecordingClicked.emit();
		// } else if (from === 'panel') {
		this.onActivitiesPanelStartBroadcastingClicked.emit(broadcastUrl);
		// }
	}

	/**
	 * @internal
	 */
	onStopBroadcastingClicked(from: string) {
		if (from === 'toolbar') {
			this.onToolbarStopBroadcastingClicked.emit();
		} else if (from === 'panel') {
			this.onActivitiesPanelStopBroadcastingClicked.emit();
		}
	}

	/**
	 * @internal
	 */
	_onSessionCreated(session: Session) {
		this.onSessionCreated.emit(session);
	}

	/**
	 * @internal
	 */
	_onNodeCrashed() {
		this.nodeCrashed = true;
		this.onNodeCrashed.emit();
	}

	private async handlePublisherError(e: any): Promise<void> {
		let message: string = '';
		if (e.name === OpenViduErrorName.DEVICE_ALREADY_IN_USE) {
			this.log.w('Video device already in use. Disabling video device...');
			// Disabling video device
			// Allow access to the room with only mic
			this.deviceSrv.disableVideoDevices();
			return await this.initwebcamPublisher();
		}
		if (e.name === OpenViduErrorName.NO_INPUT_SOURCE_SET) {
			message = this.translateService.translate('ERRORS.DEVICE_NOT_FOUND');
		}
		this.actionService.openDialog(e.name.replace(/_/g, ' '), message, true);
		this.log.e(e.message);
	}

	private subscribeToVideconferenceDirectives() {
		this.prejoinSub = this.libService.prejoin.subscribe((value: boolean) => {
			this.showPrejoin = value;
			// this.cd.markForCheck();
		});

		this.participantNameSub = this.libService.participantName.subscribe((nickname: string) => {
			this.externalParticipantName = nickname;
		});

		this.langSub = this.translateService.langSelectedObs.subscribe((lang: LangOption) => {
			this.onLangChanged.emit(lang);
		});
	}
}
