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
	PanelDirective,
	ParticipantPanelItemDirective,
	ParticipantPanelItemElementsDirective,
	ParticipantsPanelDirective,
	StreamDirective,
	ToolbarAdditionalButtonsDirective,
	ToolbarDirective
} from '../../directives/template/openvidu-angular.directive';
import { ILogger } from '../../models/logger.model';
import { ParticipantProperties } from '../../models/participant.model';
import { ActionService } from '../../services/action/action.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { DeviceService } from '../../services/device/device.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { StorageService } from '../../services/storage/storage.service';
import { TokenService } from '../../services/token/token.service';

@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css']
})
export class VideoconferenceComponent implements OnInit, OnDestroy, AfterViewInit {
	// *** Toolbar ***
	@ContentChild(ToolbarDirective) externalToolbar: ToolbarDirective;
	@ContentChild(ToolbarAdditionalButtonsDirective) externalToolbarAdditionalButtons: ToolbarAdditionalButtonsDirective;

	// *** Panels ***
	@ContentChild(PanelDirective) externalPanel: PanelDirective;
	@ContentChild(ChatPanelDirective) externalChatPanel: ChatPanelDirective;
	@ContentChild(ParticipantsPanelDirective) externalParticipantsPanel: ParticipantsPanelDirective;
	@ContentChild(ParticipantPanelItemDirective) externalParticipantPanelItem: ParticipantPanelItemDirective;
	@ContentChild(ParticipantPanelItemElementsDirective) externalParticipantPanelItemElements: ParticipantPanelItemElementsDirective;

	// *** Layout ***
	@ContentChild(LayoutDirective) externalLayout: LayoutDirective;
	@ContentChild(StreamDirective) externalStream: StreamDirective;

	@ViewChild('defaultToolbar', { static: false, read: TemplateRef }) defaultToolbarTemplate: TemplateRef<any>;
	@ViewChild('defaultPanel', { static: false, read: TemplateRef }) defaultPanelTemplate: TemplateRef<any>;
	@ViewChild('defaultChatPanel', { static: false, read: TemplateRef }) defaultChatPanelTemplate: TemplateRef<any>;
	@ViewChild('defaultParticipantsPanel', { static: false, read: TemplateRef }) defaultParticipantsPanelTemplate: TemplateRef<any>;
	@ViewChild('defaultParticipantPanelItem', { static: false, read: TemplateRef }) defaultParticipantPanelItemTemplate: TemplateRef<any>;
	@ViewChild('defaultLayout', { static: false, read: TemplateRef }) defaultLayoutTemplate: TemplateRef<any>;
	@ViewChild('defaultStream', { static: false, read: TemplateRef }) defaultStreamTemplate: TemplateRef<any>;

	openviduAngularToolbarTemplate: TemplateRef<any>;
	openviduAngularToolbarAdditionalButtonsTemplate: TemplateRef<any>;
	openviduAngularPanelTemplate: TemplateRef<any>;
	openviduAngularChatPanelTemplate: TemplateRef<any>;
	openviduAngularParticipantsPanelTemplate: TemplateRef<any>;
	openviduAngularParticipantPanelItemTemplate: TemplateRef<any>;
	openviduAngularParticipantPanelItemElementsTemplate: TemplateRef<any>;
	openviduAngularLayoutTemplate: TemplateRef<any>;
	openviduAngularStreamTemplate: TemplateRef<any>;

	@Input()
	set tokens(tokens: { webcam: string; screen: string }) {
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


	joinSessionClicked: boolean = false;
	participantReady: boolean = false;
	canPublish: boolean = false;
	error: boolean = false;
	errorMessage: string = '';
	showPrejoin: boolean = true;
	private externalParticipantName: string;
	private prejoinSub: Subscription;
	private participantNameSub: Subscription;
	private log: ILogger;

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

	ngAfterViewInit() {
		if (this.externalToolbar) {
			this.openviduAngularToolbarTemplate = this.externalToolbar.template;
			this.log.d('Setting EXTERNAL TOOLBAR');
		} else {
			if (this.externalToolbarAdditionalButtons) {
				this.log.d('Setting EXTERNAL TOOLBAR ADDITIONAL BUTTONS');
				this.openviduAngularToolbarAdditionalButtonsTemplate = this.externalToolbarAdditionalButtons.template;
			}
			this.openviduAngularToolbarTemplate = this.defaultToolbarTemplate;
			this.log.d('Setting  DEFAULT TOOLBAR');
		}

		if (this.externalPanel) {
			this.openviduAngularPanelTemplate = this.externalPanel.template;
			this.log.d('Setting EXTERNAL PANEL');
		} else {
			this.log.d('Setting DEFAULT PANEL');

			if (this.externalParticipantsPanel) {
				this.openviduAngularParticipantsPanelTemplate = this.externalParticipantsPanel.template;
				this.log.d('Setting EXTERNAL PARTICIPANTS PANEL');
			} else {
				this.log.d('Setting DEFAULT PARTICIPANTS PANEL');
				if (this.externalParticipantPanelItem) {
					this.openviduAngularParticipantPanelItemTemplate = this.externalParticipantPanelItem.template;
					this.log.d('Setting EXTERNAL P ITEM');
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
				this.openviduAngularChatPanelTemplate = this.externalChatPanel.template;
				this.log.d('Setting EXTERNAL CHAT PANEL');
			} else {
				this.openviduAngularChatPanelTemplate = this.defaultChatPanelTemplate;
				this.log.d('Setting DEFAULT CHAT PANEL');
			}
			this.openviduAngularPanelTemplate = this.defaultPanelTemplate;
		}

		if (this.externalLayout) {
			this.openviduAngularLayoutTemplate = this.externalLayout.template;
			this.log.d('Setting EXTERNAL LAYOUT');
		} else {
			this.log.d('Setting DEAFULT LAYOUT');

			if (this.externalStream) {
				this.openviduAngularStreamTemplate = this.externalStream.template;
				this.log.d('Setting EXTERNAL STREAM');
			} else {
				this.openviduAngularStreamTemplate = this.defaultStreamTemplate;
				this.log.d('Setting DEFAULT STREAM');
			}
			this.openviduAngularLayoutTemplate = this.defaultLayoutTemplate;
		}
	}

	_onJoinButtonClicked() {
		this.joinSessionClicked = true;
		this.onJoinButtonClicked.emit();
	}
	onLeaveButtonClicked() {
		this.joinSessionClicked = false;
		this.participantReady = false;
		this.onToolbarLeaveButtonClicked.emit();
	}
	onCameraButtonClicked() {
		this.onToolbarCameraButtonClicked.emit();
	}

	onMicrophoneButtonClicked() {
		this.onToolbarMicrophoneButtonClicked.emit();
	}
	onScreenshareButtonClicked() {
		this.onToolbarScreenshareButtonClicked.emit();
	}
	onFullscreenButtonClicked() {
		this.onToolbarFullscreenButtonClicked.emit();
	}
	onParticipantsPanelButtonClicked() {
		this.onToolbarParticipantsPanelButtonClicked.emit();
	}
	onChatPanelButtonClicked() {
		this.onToolbarChatPanelButtonClicked.emit();
	}
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
