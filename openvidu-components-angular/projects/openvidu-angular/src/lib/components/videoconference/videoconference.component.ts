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
	ToolbarDirective
} from '../../directives/template/openvidu-angular.directive';
import { ILogger } from '../../models/logger.model';
import { ParticipantProperties } from '../../models/participant.model';
import { TokenModel } from '../../models/token.model';
import { ActionService } from '../../services/action/action.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { DeviceService } from '../../services/device/device.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { StorageService } from '../../services/storage/storage.service';
import { TokenService } from '../../services/token/token.service';

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
 * | **prejoin**                        | `boolean` | {@link PrejoinDirective}                        |
 * | **participantName**                | `string`  | {@link ParticipantNameDirective}                |
 * | **videoMuted**                     | `boolean` | {@link VideoMutedDirective}                     |
 * | **audioMuted**                     | `boolean` | {@link AudioMutedDirective}                     |
 * | **toolbarScreenshareButton**       | `boolean` | {@link ToolbarScreenshareButtonDirective}       |
 * | **toolbarFullscreenButton**        | `boolean` | {@link ToolbarFullscreenButtonDirective}        |
 * | **toolbarLeaveButton**             | `boolean` | {@link ToolbarLeaveButtonDirective}             |
 * | **toolbarChatPanelButton**         | `boolean` | {@link ToolbarChatPanelButtonDirective}         |
 * | **toolbarParticipantsPanelButton** | `boolean` | {@link ToolbarParticipantsPanelButtonDirective} |
 * | **toolbarDisplayLogo**             | `boolean` | {@link ToolbarDisplayLogoDirective}             |
 * | **toolbarDisplaySessionName**      | `boolean` | {@link ToolbarDisplaySessionNameDirective}      |
 * | **streamDisplayParticipantName**   | `boolean` | {@link StreamDisplayParticipantNameDirective}   |
 * | **streamDisplayAudioDetection**    | `boolean` | {@link StreamDisplayAudioDetectionDirective}    |
 * | **streamSettingsButton**           | `boolean` | {@link StreamSettingsButtonDirective}           |
 * | **participantPanelItemMuteButton** | `boolean` | {@link ParticipantPanelItemMuteButtonDirective} |
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

	// *** Parameters ***
	// @Input() sessionName: string;
	// @Input() participantName: string;

	/**
	 * @param {TokenModel} tokens  The tokens parameter must be an object with `webcam` and `screen` fields.
	 *  Both of them are `string` type. See {@link TokenModel}
	 */
	@Input()
	set tokens(tokens: TokenModel) {
		if (!tokens || (!tokens.webcam && !tokens.screen)) {
			//No tokens received
			// throw new Error('No tokens received');
			this.log.w('No tokens received');
		} else {
			if (tokens.webcam || tokens.screen) {
				this.tokenService.setWebcamToken(tokens.webcam);
				this.tokenService.setScreenToken(tokens.screen);
				this.canPublish = true;
			}
		}
	}

	// *** Events ***

	// Event sent when user click on the join button in pre-join page
	@Output() onJoinButtonClicked = new EventEmitter<any>();
	// Event sent when user click on the join button in pre-join page
	@Output() onToolbarLeaveButtonClicked = new EventEmitter<any>();
	@Output() onToolbarCameraButtonClicked = new EventEmitter<any>();
	@Output() onToolbarMicrophoneButtonClicked = new EventEmitter<any>();
	@Output() onToolbarScreenshareButtonClicked = new EventEmitter<any>();
	@Output() onToolbarFullscreenButtonClicked = new EventEmitter<any>();
	@Output() onToolbarParticipantsPanelButtonClicked = new EventEmitter<any>();
	@Output() onToolbarChatPanelButtonClicked = new EventEmitter<any>();

	// Event sent when participant has joined the session
	// @Output() onParticipantJoined = new EventEmitter<any>();

	// Event sent when session has been created
	@Output() onSessionCreated = new EventEmitter<any>();
	// Event sent when participant has been created
	@Output() onParticipantCreated = new EventEmitter<any>();

	/**
	 * @internal
	 */
	joinSessionClicked: boolean = false;
	/**
	 * @internal
	 */
	participantReady: boolean = false;
	/**
	 * @internal
	 */
	canPublish: boolean = false;
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
		private tokenService: TokenService
	) {
		this.log = this.loggerSrv.get('VideoconferenceComponent');
	}

	async ngOnInit() {
		this.subscribeToVideconferenceDirectives();
		await this.deviceSrv.initializeDevices();
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
				publisher.once('accessDenied', (e: any) => {
					this.handlePublisherError(e);
				});
				publisher.once('accessAllowed', () => {
					this.participantReady = true;
				});
			}
		} catch (error) {
			this.actionService.openDialog(error.name.replace(/_/g, ' '), error.message, true);
			this.log.e(error);
		}
	}

	ngOnDestroy(): void {
		if (this.prejoinSub) this.prejoinSub.unsubscribe();
		if (this.participantNameSub) this.participantNameSub.unsubscribe();
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
		this.joinSessionClicked = true;
		this.onJoinButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	onLeaveButtonClicked() {
		this.joinSessionClicked = false;
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
	_onSessionCreated(event: Session) {
		this.onSessionCreated.emit(event);
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
			message = 'Access to media devices was not allowed.';
			this.deviceSrv.disableVideoDevices();
			this.deviceSrv.disableAudioDevices();
			return this.initwebcamPublisher();
		} else if (e.name === OpenViduErrorName.NO_INPUT_SOURCE_SET) {
			message = 'No video or audio devices have been found. Please, connect at least one.';
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
	}
}
