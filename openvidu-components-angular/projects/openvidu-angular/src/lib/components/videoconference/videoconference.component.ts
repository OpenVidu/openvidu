import { AfterViewInit, Component, ContentChild, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import {
	ChatPanelDirective,
	LayoutDirective,
	PanelDirective,
	ParticipantPanelItemDirective,
	ParticipantsPanelDirective,
	StreamDirective,
	ToolbarDirective
} from '../../directives/openvidu-angular.directive';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../../services/logger/logger.service';

@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css']
})
export class VideoconferenceComponent implements OnInit, AfterViewInit {
	//Toolbar
	@ContentChild(ToolbarDirective) externalToolbar: ToolbarDirective;
	// Panels
	@ContentChild(PanelDirective) externalPanel: PanelDirective;
	@ContentChild(ChatPanelDirective) externalChatPanel: ChatPanelDirective;
	@ContentChild(ParticipantsPanelDirective) externalParticipantsPanel: ParticipantsPanelDirective;
	@ContentChild(ParticipantPanelItemDirective) externalParticipantPanelItem: ParticipantPanelItemDirective;
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
	openviduAngularPanelTemplate: TemplateRef<any>;
	openviduAngularChatPanelTemplate: TemplateRef<any>;
	openviduAngularParticipantsPanelTemplate: TemplateRef<any>;
	openviduAngularParticipantPanelItemTemplate: TemplateRef<any>;
	openviduAngularLayoutTemplate: TemplateRef<any>;
	openviduAngularStreamTemplate: TemplateRef<any>;

	@Input() sessionName: string;
	@Input() userName: string;

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
				this.joinSessionClicked = true;
				this.isSessionAlive = true;
			}
		}
	}

	@Output() onJoinClicked = new EventEmitter<any>();
	@Output() onCloseClicked = new EventEmitter<any>();

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
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

	async _onJoinClicked() {
		this.onJoinClicked.emit();
	}
	onLeaveSessionClicked() {
		this.isSessionAlive = false;
		this.closeClicked = true;
	}
}
