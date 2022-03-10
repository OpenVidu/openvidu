import { AfterViewInit, Component, ContentChild, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import {
	ChatPanelDirective,
	LayoutDirective,
	PanelDirective,
	ParticipantPanelItemDirective,
	ParticipantsPanelDirective,
	StreamDirective,
	ToolbarAdditionalButtonsDirective,
	ToolbarDirective
} from '../../directives/template/openvidu-angular.directive';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../../services/logger/logger.service';

@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css']
})
export class VideoconferenceComponent implements OnInit, AfterViewInit {
	// *** Toolbar ***
	@ContentChild(ToolbarDirective) externalToolbar: ToolbarDirective;
	@ContentChild(ToolbarAdditionalButtonsDirective) externalToolbarAdditionalButtons: ToolbarAdditionalButtonsDirective;

	// *** Panels ***
	@ContentChild(PanelDirective) externalPanel: PanelDirective;
	@ContentChild(ChatPanelDirective) externalChatPanel: ChatPanelDirective;
	@ContentChild(ParticipantsPanelDirective) externalParticipantsPanel: ParticipantsPanelDirective;
	@ContentChild(ParticipantPanelItemDirective) externalParticipantPanelItem: ParticipantPanelItemDirective;

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
	openviduAngularLayoutTemplate: TemplateRef<any>;
	openviduAngularStreamTemplate: TemplateRef<any>;

	// *** Parameters ***
	@Input() sessionName: string;
	@Input() participantName: string;

	@Input()
	set tokens(tokens: { webcam: string; screen: string }) {
		if (!tokens || (!tokens.webcam && !tokens.screen)) {
			//No tokens received
			// throw new Error('No tokens received');
			this.log.w('No tokens received');
		} else {
			if (tokens.webcam || tokens.screen) {
				this._tokens = {
					webcam: tokens.webcam,
					screen: tokens.screen
				};
				this.isSessionAlive = true;
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
	@Output() onParticipantJoined = new EventEmitter<any>();

	// Event sent when participant has left the session
	// @Output() onParticipantLeft = new EventEmitter<any>();

	// Event sent when session has been created
	@Output() onSessionCreated = new EventEmitter<any>();

	joinSessionClicked: boolean = false;
	isSessionAlive: boolean = false;
	_tokens: { webcam: string; screen: string };
	error: boolean = false;
	errorMessage: string = '';

	private log: ILogger;

	constructor(private loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('VideoconferenceComponent');
	}

	ngAfterViewInit() {
		if (this.externalToolbar) {
			this.openviduAngularToolbarTemplate = this.externalToolbar.template;
			this.log.d('Setting EXTERNAL TOOLBAR');
		} else {
			if (this.externalToolbarAdditionalButtons) {
				this.log.d('Setting EXTERNAL TOOLBAR ADDITIONAL BUTTONS', this.externalToolbarAdditionalButtons.template);
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

	ngOnInit() {}

	_onJoinButtonClicked() {
		this.joinSessionClicked = true;
		this.onJoinButtonClicked.emit();
	}
	onLeaveButtonClicked() {
		this.joinSessionClicked = false;
		this.isSessionAlive = false;
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
}
