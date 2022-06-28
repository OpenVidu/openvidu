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
	ChatPanelDirective,
	LayoutDirective,
	AdditionalPanelsDirective,
	PanelDirective,
	ParticipantPanelItemDirective,
	ParticipantPanelItemElementsDirective,
	ParticipantsPanelDirective,
	StreamDirective,
	ToolbarAdditionalButtonsDirective,
	ToolbarAdditionalPanelButtonsDirective,
	ToolbarDirective,
	ActivitiesPanelDirective
} from '../../directives/template/openvidu-angular.directive';
import { ILogger } from '../../models/logger.model';
import { OpenViduEdition } from '../../models/openvidu.model';
import { ParticipantAbstractModel, ParticipantProperties } from '../../models/participant.model';
import { TokenModel } from '../../models/token.model';
import { ActionService } from '../../services/action/action.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { DeviceService } from '../../services/device/device.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { StorageService } from '../../services/storage/storage.service';
import { TokenService } from '../../services/token/token.service';
import { TranslateService } from '../../services/translate/translate.service';

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
 * | **prejoin**                        | `boolean` | {@link PrejoinDirective}                        |
 * | **participantName**                | `string`  | {@link ParticipantNameDirective}                |
 * | **videoMuted**                     | `boolean` | {@link VideoMutedDirective}                     |
 * | **audioMuted**                     | `boolean` | {@link AudioMutedDirective}                     |
 * | **toolbarScreenshareButton**       | `boolean` | {@link ToolbarScreenshareButtonDirective}       |
 * | **toolbarFullscreenButton**        | `boolean` | {@link ToolbarFullscreenButtonDirective}        |
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
 * | **recordingActivityRecordingList** | `{@link RecordingInfo}[]` | {@link RecordingActivityRecordingListDirective} |
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
	styleUrls: ['./videoconference.component.css']
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
	 * TODO: WIP
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
	 * TODO: WIP
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
	 * @param {TokenModel} tokens  The tokens parameter must be an object with `webcam` and `screen` fields.
	 *  Both of them are `string` type. See {@link TokenModel}
	 */
	@Input()
	set tokens(tokens: TokenModel) {
		if (!tokens || !tokens.webcam) {
			this.log.w('No tokens received');
		} else {
			this.log.w('Tokens received');
			this.tokenService.setWebcamToken(tokens.webcam);

			const openviduEdition = new URL(tokens.webcam).searchParams.get('edition');
			if (!!openviduEdition) {
				this.openviduService.setOpenViduEdition(OpenViduEdition.PRO);
			} else {
				this.openviduService.setOpenViduEdition(OpenViduEdition.CE);
				this.libService.backgroundEffectsButton.next(false);
			}

			if (tokens.screen) {
				this.tokenService.setScreenToken(tokens.screen);
			} else {
				this.log.w('No screen token found. Screenshare feature will be disabled');
			}
			this.tokensReceived = true;
		}
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
	 * Provides event notifications that fire when play recording button is clicked from {@link ActivitiesPanelComponent}.
	 */
	@Output() onActivitiesPanelPlayRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

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
	tokensReceived: boolean = false;
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

	streamPlaying = false;
	private externalParticipantName: string;
	private prejoinSub: Subscription;
	private participantNameSub: Subscription;
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
		private tokenService: TokenService,
		private translateService: TranslateService
	) {
		this.log = this.loggerSrv.get('VideoconferenceComponent');
	}

	async ngOnInit() {
		this.subscribeToVideconferenceDirectives();
		await this.deviceSrv.forceInitDevices();
		const nickname = this.externalParticipantName || this.storageSrv.getNickname() || `OpenVidu_User${Math.floor(Math.random() * 100)}`;
		const props: ParticipantProperties = {
			local: true,
			nickname
		};
		this.participantService.initLocalParticipant(props);
		this.openviduService.initialize();

		if (this.deviceSrv.hasVideoDeviceAvailable() || this.deviceSrv.hasAudioDeviceAvailable()) {
			await this.initwebcamPublisher();
		}

		this.onParticipantCreated.emit(this.participantService.getLocalParticipant());
	}

	private async initwebcamPublisher() {
		try {
			const publisher = await this.openviduService.initDefaultPublisher(undefined);
			if (publisher) {
				publisher.once('accessDenied', (e: any) => this.handlePublisherError(e));
				publisher.once('accessAllowed', async () => {
					await this.handlePublisherSuccess();
					this.participantReady = true;
				});
				publisher.once('streamPlaying', () => (this.streamPlaying = true));
			}
		} catch (error) {
			this.actionService.openDialog(error.name.replace(/_/g, ' '), error.message, true);
			this.log.e(error);
		}
	}

	async ngOnDestroy() {
		if (this.prejoinSub) this.prejoinSub.unsubscribe();
		if (this.participantNameSub) this.participantNameSub.unsubscribe();
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
	_onSessionCreated(session: Session) {
		this.onSessionCreated.emit(session);
	}

	private handlePublisherError(e: any) {
		let message: string;
		if (e.name === OpenViduErrorName.DEVICE_ALREADY_IN_USE) {
			this.log.w('Video device already in use. Disabling video device...');
			// Allow access to the room with only mic if camera device is already in use
			this.deviceSrv.disableVideoDevices();
			return this.initwebcamPublisher();
		}
		if (e.name === OpenViduErrorName.DEVICE_ACCESS_DENIED) {
			message = this.translateService.translate('ERRORS.MEDIA_ACCESS');
			this.deviceSrv.disableVideoDevices();
			this.deviceSrv.disableAudioDevices();
			return this.initwebcamPublisher();
		} else if (e.name === OpenViduErrorName.NO_INPUT_SOURCE_SET) {
			message = this.translateService.translate('ERRORS.DEVICE_NOT_FOUND');
		}
		this.actionService.openDialog(e.name.replace(/_/g, ' '), message, true);
		this.log.e(e.message);
	}

	private async handlePublisherSuccess() {
		// The devices are initialized without labels in Firefox.
		// We need to force an update after publisher is allowed.
		if (this.deviceSrv.areEmptyLabels()) {
			await this.deviceSrv.forceInitDevices();
			if (this.deviceSrv.hasAudioDeviceAvailable()) {
				const audioLabel = this.participantService.getMyCameraPublisher()?.stream?.getMediaStream()?.getAudioTracks()[0]?.label;
				this.deviceSrv.setMicSelected(audioLabel);
			}

			if (this.deviceSrv.hasVideoDeviceAvailable()) {
				const videoLabel = this.participantService.getMyCameraPublisher()?.stream?.getMediaStream()?.getVideoTracks()[0]?.label;
				this.deviceSrv.setCameraSelected(videoLabel);
			}
		}
	}

	private subscribeToVideconferenceDirectives() {
		this.prejoinSub = this.libService.prejoin.subscribe((value: boolean) => {
			this.showPrejoin = value;
			// this.cd.markForCheck();
		});

		this.participantNameSub = this.libService.participantName.subscribe((nickname: string) => {
			this.externalParticipantName = nickname;
		});
	}
}
