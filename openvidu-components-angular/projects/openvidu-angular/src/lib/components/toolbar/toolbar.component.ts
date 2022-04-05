import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	EventEmitter,
	HostListener,
	OnDestroy,
	OnInit,
	Output,
	TemplateRef
} from '@angular/core';
import { skip, Subscription } from 'rxjs';
import { TokenService } from '../../services/token/token.service';
import { ChatService } from '../../services/chat/chat.service';
import { PanelService } from '../../services/panel/panel.service';
import { DocumentService } from '../../services/document/document.service';

import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { LoggerService } from '../../services/logger/logger.service';
import { ILogger } from '../../models/logger.model';
import { Session } from 'openvidu-browser';
import { ActionService } from '../../services/action/action.service';
import { DeviceService } from '../../services/device/device.service';
import { ChatMessage } from '../../models/chat.model';
import { ParticipantService } from '../../services/participant/participant.service';
import { MenuType } from '../../models/menu.model';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { ToolbarAdditionalButtonsDirective } from '../../directives/template/openvidu-angular.directive';
import { ParticipantAbstractModel } from '../../models/participant.model';

/**
 *
 * The **ToolbarComponent** is hosted inside of the {@link VideoconferenceComponent}.
 * It is in charge of displaying the participants controlls for handling the media, panels and more videoconference features.
 *
 * <div class="custom-table-container">
 * <div>
 *  <h3>API Directives</h3>
 *
 * This component allows us to show or hide certain HTML elements with the following {@link https://angular.io/guide/attribute-directives Angular attribute directives}
 * with the aim of fully customizing the ToolbarComponent.
 *
 * | **Name**                  | **Type**  | **Reference**                                   |
 * | :----------------------------: | :-------: | :---------------------------------------------: |
 * | **screenshareButton**       | `boolean` | {@link ToolbarScreenshareButtonDirective}       |
 * | **fullscreenButton**        | `boolean` | {@link ToolbarFullscreenButtonDirective}        |
 * | **leaveButton**             | `boolean` | {@link ToolbarLeaveButtonDirective}             |
 * | **chatPanelButton**         | `boolean` | {@link ToolbarChatPanelButtonDirective}         |
 * | **participantsPanelButton** | `boolean` | {@link ToolbarParticipantsPanelButtonDirective} |
 * | **displayLogo**             | `boolean` | {@link ToolbarDisplayLogoDirective}             |
 * | **displaySessionName**      | `boolean` | {@link ToolbarDisplaySessionNameDirective}      |
 *
 * <p class="component-link-text">
 * <span class="italic">See all {@link ApiDirectiveModule API Directives}</span>
 * </p>
 *
 * </div>
 * <div>
 *
 * <h3>OpenVidu Angular Directives</h3>
 *
 * The ToolbarComponent can be replaced with a custom component. It provides us the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * for doing this.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |           ***ovToolbar**           |            {@link ToolbarDirective}           |
 *
 * </br>
 *
 * It is also providing us a way to **add additional buttons** to the default toolbar.
 * It will recognise the following directive in a child element.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |   ***ovToolbarAdditionalButtons**   |   {@link ToolbarAdditionalButtonsDirective}   |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */

@Component({
	selector: 'ov-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent implements OnInit, OnDestroy {
	/**
	 * @ignore
	 */
	@ContentChild('toolbarAdditionalButtons', { read: TemplateRef }) toolbarAdditionalButtonsTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild(ToolbarAdditionalButtonsDirective)
	set externalAdditionalButtons(externalAdditionalButtons: ToolbarAdditionalButtonsDirective) {
		// This directive will has value only when ADDITIONAL BUTTONS component tagget with '*ovToolbarAdditionalButtons' directive
		// is inside of the TOOLBAR component tagged with '*ovToolbar' directive
		if (externalAdditionalButtons) {
			this.toolbarAdditionalButtonsTemplate = externalAdditionalButtons.template;
		}
	}

	@Output() onLeaveButtonClicked = new EventEmitter<any>();
	@Output() onCameraButtonClicked = new EventEmitter<any>();
	@Output() onMicrophoneButtonClicked = new EventEmitter<any>();
	@Output() onFullscreenButtonClicked = new EventEmitter<any>();
	@Output() onScreenshareButtonClicked = new EventEmitter<any>();
	@Output() onParticipantsPanelButtonClicked = new EventEmitter<any>();
	@Output() onChatPanelButtonClicked = new EventEmitter<any>();

	/**
	 * @ignore
	 */
	session: Session;
	/**
	 * @ignore
	 */
	unreadMessages: number = 0;
	/**
	 * @ignore
	 */
	messageList: ChatMessage[] = [];
	/**
	 * @ignore
	 */
	isScreenShareActive: boolean;
	/**
	 * @ignore
	 */
	isWebcamVideoActive: boolean;
	/**
	 * @ignore
	 */
	isAudioActive: boolean;
	/**
	 * @ignore
	 */
	isConnectionLost: boolean;
	/**
	 * @ignore
	 */
	hasVideoDevices: boolean;
	/**
	 * @ignore
	 */
	hasAudioDevices: boolean;
	/**
	 * @ignore
	 */
	isFullscreenActive: boolean = false;
	/**
	 * @ignore
	 */
	isChatOpened: boolean = false;
	/**
	 * @ignore
	 */
	isParticipantsOpened: boolean = false;

	/**
	 * @ignore
	 */
	isMinimal: boolean = false;
	/**
	 * @ignore
	 */
	showScreenshareButton = true;
	/**
	 * @ignore
	 */
	showFullscreenButton: boolean = true;
	/**
	 * @ignore
	 */
	showLeaveButton: boolean = true;
	/**
	 * @ignore
	 */
	showParticipantsPanelButton: boolean = true;
	/**
	 * @ignore
	 */
	showChatPanelButton: boolean = true;
	/**
	 * @ignore
	 */
	showLogo: boolean = true;
	/**
	 * @ignore
	 */
	showSessionName: boolean = true;

	private log: ILogger;
	private minimalSub: Subscription;
	private menuTogglingSubscription: Subscription;
	private chatMessagesSubscription: Subscription;
	private localParticipantSubscription: Subscription;
	private screenshareButtonSub: Subscription;
	private fullscreenButtonSub: Subscription;
	private leaveButtonSub: Subscription;
	private participantsPanelButtonSub: Subscription;
	private chatPanelButtonSub: Subscription;
	private displayLogoSub: Subscription;
	private displaySessionNameSub: Subscription;
	private currentWindowHeight = window.innerHeight;

	/**
	 * @ignore
	 */
	constructor(
		protected documentService: DocumentService,
		protected chatService: ChatService,
		protected panelService: PanelService,
		protected tokenService: TokenService,
		protected participantService: ParticipantService,
		protected openviduService: OpenViduService,
		protected oVDevicesService: DeviceService,
		protected actionService: ActionService,
		protected loggerSrv: LoggerService,
		private cd: ChangeDetectorRef,
		private libService: OpenViduAngularConfigService
	) {
		this.log = this.loggerSrv.get('ToolbarComponent');
	}
	/**
	 * @ignore
	 */
	@HostListener('window:resize', ['$event'])
	sizeChange(event) {
		if (this.currentWindowHeight >= window.innerHeight) {
			// The user has exit the fullscreen mode
			this.isFullscreenActive = false;
			this.currentWindowHeight = window.innerHeight;
		}
	}

	/**
	 * @ignore
	 */
	@HostListener('document:keydown', ['$event'])
	keyDown(event: KeyboardEvent) {
		if (event.key === 'F11') {
			event.preventDefault();
			this.toggleFullscreen();
			this.currentWindowHeight = window.innerHeight;
			return false;
		}
	}

	async ngOnInit() {
		this.subscribeToToolbarDirectives();

		await this.oVDevicesService.initializeDevices();
		this.hasVideoDevices = this.oVDevicesService.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.oVDevicesService.hasAudioDeviceAvailable();
		this.session = this.openviduService.getWebcamSession();

		this.subscribeToUserMediaProperties();
		this.subscribeToReconnection();
		this.subscribeToMenuToggling();
		this.subscribeToChatMessages();
	}

	ngOnDestroy(): void {
		if (this.menuTogglingSubscription) this.menuTogglingSubscription.unsubscribe();
		if (this.chatMessagesSubscription) this.chatMessagesSubscription.unsubscribe();
		if (this.localParticipantSubscription) this.localParticipantSubscription.unsubscribe();
		if (this.screenshareButtonSub) this.screenshareButtonSub.unsubscribe();
		if (this.fullscreenButtonSub) this.fullscreenButtonSub.unsubscribe();
		if (this.leaveButtonSub) this.leaveButtonSub.unsubscribe();
		if (this.participantsPanelButtonSub) this.participantsPanelButtonSub.unsubscribe();
		if (this.chatPanelButtonSub) this.chatPanelButtonSub.unsubscribe();
		if (this.displayLogoSub) this.displayLogoSub.unsubscribe();
		if (this.displaySessionNameSub) this.displaySessionNameSub.unsubscribe();
		if (this.minimalSub) this.minimalSub.unsubscribe();
	}

	/**
	 * @ignore
	 */
	async toggleMicrophone() {
		this.onMicrophoneButtonClicked.emit();
		try {
			await this.openviduService.publishAudio(!this.isAudioActive);
		} catch (error) {
			this.log.e('There was an error toggling microphone:', error.code, error.message);
			this.actionService.openDialog('There was an error toggling camera', error?.error || error?.message);
		}
	}

	/**
	 * @ignore
	 */
	async toggleCamera() {
		this.onCameraButtonClicked.emit();

		try {
			const publishVideo = !this.participantService.isMyVideoActive();
			await this.openviduService.publishVideo(publishVideo);
		} catch (error) {
			this.log.e('There was an error toggling camera:', error.code, error.message);
			this.actionService.openDialog('There was an error toggling camera', error?.error || error?.message);
		}
	}

	/**
	 * @ignore
	 */
	async toggleScreenShare() {
		this.onScreenshareButtonClicked.emit();

		try {
			await this.openviduService.toggleScreenshare();
		} catch (error) {
			this.log.e('There was an error toggling screen share', error.code, error.message);
			if (error && error.name === 'SCREEN_SHARING_NOT_SUPPORTED') {
				this.actionService.openDialog('Error sharing screen', 'Your browser does not support screen sharing');
			}
		}
	}

	/**
	 * @ignore
	 */
	leaveSession() {
		this.log.d('Leaving session...');
		this.openviduService.disconnect();
		this.onLeaveButtonClicked.emit();
	}

	/**
	 * @ignore
	 */
	toggleParticipantsPanel() {
		this.onParticipantsPanelButtonClicked.emit();
		this.panelService.togglePanel(MenuType.PARTICIPANTS);
	}

	/**
	 * @ignore
	 */
	toggleChatPanel() {
		this.onChatPanelButtonClicked.emit();
		this.panelService.togglePanel(MenuType.CHAT);
	}

	/**
	 * @ignore
	 */
	toggleFullscreen() {
		this.isFullscreenActive = !this.isFullscreenActive;
		this.documentService.toggleFullscreen('session-container');
		this.onFullscreenButtonClicked.emit();
	}

	protected subscribeToReconnection() {
		this.session.on('reconnecting', () => {
			if (this.panelService.isPanelOpened()) {
				this.panelService.closeMenu();
			}
			this.isConnectionLost = true;
		});
		this.session.on('reconnected', () => {
			this.isConnectionLost = false;
		});
	}
	protected subscribeToMenuToggling() {
		this.menuTogglingSubscription = this.panelService.panelOpenedObs.subscribe((ev: { opened: boolean; type?: MenuType }) => {
			this.isChatOpened = ev.opened && ev.type === MenuType.CHAT;
			this.isParticipantsOpened = ev.opened && ev.type === MenuType.PARTICIPANTS;
			if (this.isChatOpened) {
				this.unreadMessages = 0;
			}
		});
	}

	protected subscribeToChatMessages() {
		this.chatMessagesSubscription = this.chatService.messagesObs.pipe(skip(1)).subscribe((messages) => {
			if (!this.panelService.isPanelOpened()) {
				this.unreadMessages++;
			}
			this.messageList = messages;
			this.cd.markForCheck();
		});
	}
	protected subscribeToUserMediaProperties() {
		this.localParticipantSubscription = this.participantService.localParticipantObs.subscribe((p: ParticipantAbstractModel) => {
			if (p) {
				this.isWebcamVideoActive = p.isCameraVideoActive();
				this.isAudioActive = p.isCameraAudioActive() || p.isScreenAudioActive();
				this.isScreenShareActive = p.isScreenActive();
				this.cd.markForCheck();
			}
		});
	}

	private subscribeToToolbarDirectives() {
		this.minimalSub = this.libService.minimalObs.subscribe((value: boolean) => {
			this.isMinimal = value;
			this.cd.markForCheck();
		});
		this.screenshareButtonSub = this.libService.screenshareButtonObs.subscribe((value: boolean) => {
			this.showScreenshareButton = value;
			this.cd.markForCheck();
		});
		this.fullscreenButtonSub = this.libService.fullscreenButtonObs.subscribe((value: boolean) => {
			this.showFullscreenButton = value;
			this.cd.markForCheck();
		});
		this.leaveButtonSub = this.libService.leaveButtonObs.subscribe((value: boolean) => {
			this.showLeaveButton = value;
			this.cd.markForCheck();
		});
		this.chatPanelButtonSub = this.libService.chatPanelButtonObs.subscribe((value: boolean) => {
			this.showChatPanelButton = value;
			this.cd.markForCheck();
		});
		this.participantsPanelButtonSub = this.libService.participantsPanelButtonObs.subscribe((value: boolean) => {
			this.showParticipantsPanelButton = value;
			this.cd.markForCheck();
		});
		this.displayLogoSub = this.libService.displayLogoObs.subscribe((value: boolean) => {
			this.showLogo = value;
			this.cd.markForCheck();
		});
		this.displaySessionNameSub = this.libService.displaySessionNameObs.subscribe((value: boolean) => {
			this.showSessionName = value;
			this.cd.markForCheck();
		});
	}
}
