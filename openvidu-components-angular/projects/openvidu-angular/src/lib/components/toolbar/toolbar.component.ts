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
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';
import { DocumentService } from '../../services/document/document.service';

import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { LoggerService } from '../../services/logger/logger.service';
import { ILogger } from '../../models/logger.model';
import { ScreenType } from '../../models/video-type.model';
import { PublisherProperties, Session } from 'openvidu-browser';
import { ActionService } from '../../services/action/action.service';
import { DeviceService } from '../../services/device/device.service';
import { ChatMessage } from '../../models/chat.model';
import { ParticipantService } from '../../services/participant/participant.service';
import { MenuType } from '../../models/menu.model';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

@Component({
	selector: 'ov-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent implements OnInit, OnDestroy {
	@ContentChild('centeredButtons', { read: TemplateRef }) centeredButtonsTemplate: TemplateRef<any>;

	@Output() onMicClicked = new EventEmitter<any>();
	@Output() onCamClicked = new EventEmitter<any>();
	@Output() onScreenShareClicked = new EventEmitter<any>();
	@Output() onLeaveSessionClicked = new EventEmitter<any>();
	@Output() onChatClicked = new EventEmitter<any>();

	session: Session;
	unreadMessages: number = 0;
	messageList: ChatMessage[] = [];
	isScreenShareActive: boolean;
	isWebcamVideoActive: boolean;
	isWebcamAudioActive: boolean;
	isConnectionLost: boolean;
	hasVideoDevices: boolean;
	hasAudioDevices: boolean;
	isFullscreenActive: boolean = false;
	isChatOpened: boolean = false;
	isParticipantsOpened: boolean = false;

	isMinimal: boolean = false;
	showScreenshareButton = true;
	showFullscreenButton: boolean = true;
	showLeaveButton: boolean = true;
	showParticipantsPanelButton: boolean = true;
	showChatPanelButton: boolean = true;
	showLogo: boolean = true;
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

	@HostListener('window:resize', ['$event'])
	sizeChange(event) {
		if (this.currentWindowHeight >= window.innerHeight) {
			// The user has exit the fullscreen mode
			this.isFullscreenActive = false;
			this.currentWindowHeight = window.innerHeight;
		}
	}

	@HostListener('document:keydown', ['$event'])
	keyDown(event: KeyboardEvent) {
		if (event.key === 'F11') {
			event.preventDefault();
			this.toggleFullscreen();
			this.currentWindowHeight = window.innerHeight;
			return false;
		}
	}

	constructor(
		protected documentService: DocumentService,
		protected chatService: ChatService,
		protected menuService: SidenavMenuService,
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
	}

	toggleMicrophone() {
		this.onMicClicked.emit();

		if (this.participantService.isMyCameraActive()) {
			this.openviduService.publishAudio(
				this.participantService.getMyCameraPublisher(),
				!this.participantService.hasCameraAudioActive()
			);
			return;
		}
		this.openviduService.publishAudio(this.participantService.getMyScreenPublisher(), !this.participantService.hasScreenAudioActive());
	}

	async toggleCamera() {
		this.onCamClicked.emit();

		try {
			const publishVideo = !this.participantService.hasCameraVideoActive();
			const publishAudio = this.participantService.hasCameraAudioActive();
			// Disabling webcam
			if (this.participantService.haveICameraAndScreenActive()) {
				this.openviduService.publishVideo(this.participantService.getMyCameraPublisher(), publishVideo);
				this.participantService.disableWebcamUser();
				this.openviduService.unpublish(this.participantService.getMyCameraPublisher());
				this.openviduService.publishAudio(this.participantService.getMyScreenPublisher(), publishAudio);
				return;
			}
			// Enabling webcam
			if (this.participantService.isOnlyMyScreenActive()) {
				const hasAudio = this.participantService.hasScreenAudioActive();

				if (!this.openviduService.isWebcamSessionConnected()) {
					await this.openviduService.connectSession(this.openviduService.getWebcamSession(), this.tokenService.getWebcamToken());
				}
				await this.openviduService.publish(this.participantService.getMyCameraPublisher());
				this.openviduService.publishAudio(this.participantService.getMyScreenPublisher(), false);
				this.openviduService.publishAudio(this.participantService.getMyCameraPublisher(), hasAudio);
				this.participantService.enableWebcamUser();
			}
			// Muting/unmuting webcam
			this.openviduService.publishVideo(this.participantService.getMyCameraPublisher(), publishVideo);
		} catch (error) {
			this.log.e('There was an error toggling camera:', error.code, error.message);
			this.actionService.openDialog('There was an error toggling camera:', error?.error || error?.message);
		}
	}

	async toggleScreenShare() {
		this.onScreenShareClicked.emit();

		try {
			// Disabling screenShare
			if (this.participantService.haveICameraAndScreenActive()) {
				this.participantService.disableScreenUser();
				this.openviduService.unpublish(this.participantService.getMyScreenPublisher());
				return;
			}

			// Enabling screenShare
			if (this.participantService.isOnlyMyCameraActive()) {
				const willThereBeWebcam = this.participantService.isMyCameraActive() && this.participantService.hasCameraVideoActive();
				const hasAudio = willThereBeWebcam ? false : this.hasAudioDevices && this.participantService.hasCameraAudioActive();
				const properties: PublisherProperties = {
					videoSource: ScreenType.SCREEN,
					audioSource: this.hasAudioDevices ? undefined : null,
					publishVideo: true,
					publishAudio: hasAudio,
					mirror: false
				};
				const screenPublisher = await this.openviduService.initPublisher(undefined, properties);

				screenPublisher.once('accessAllowed', async (event) => {
					// Listen to event fired when native stop button is clicked
					screenPublisher.stream
						.getMediaStream()
						.getVideoTracks()[0]
						.addEventListener('ended', () => {
							this.log.d('Clicked native stop button. Stopping screen sharing');
							this.toggleScreenShare();
						});
					this.log.d('ACCESS ALOWED screenPublisher');
					this.participantService.activeMyScreenShare(screenPublisher);

					if (!this.openviduService.isScreenSessionConnected()) {
						await this.openviduService.connectSession(
							this.openviduService.getScreenSession(),
							this.tokenService.getScreenToken()
						);
					}
					await this.openviduService.publish(this.participantService.getMyScreenPublisher());
					// this.openviduService.sendNicknameSignal();
					if (!this.participantService.hasCameraVideoActive()) {
						// Disabling webcam
						this.participantService.disableWebcamUser();
						this.openviduService.unpublish(this.participantService.getMyCameraPublisher());
					}
				});

				screenPublisher.once('accessDenied', (error: any) => {
					this.log.e(error);
					if (error && error.name === 'SCREEN_SHARING_NOT_SUPPORTED') {
						this.actionService.openDialog('Error sharing screen', 'Your browser does not support screen sharing');
					}
				});
				return;
			}

			// Disabling screnShare and enabling webcam
			const hasAudio = this.participantService.hasScreenAudioActive();
			if (!this.openviduService.isWebcamSessionConnected()) {
				await this.openviduService.connectSession(this.openviduService.getWebcamSession(), this.tokenService.getWebcamToken());
			}
			await this.openviduService.publish(this.participantService.getMyCameraPublisher());
			this.openviduService.publishAudio(this.participantService.getMyScreenPublisher(), false);
			this.openviduService.publishAudio(this.participantService.getMyCameraPublisher(), hasAudio);
			this.participantService.enableWebcamUser();
			this.participantService.disableScreenUser();
			this.openviduService.unpublish(this.participantService.getMyScreenPublisher());
		} catch (error) {
			this.log.e('There was an error toggling screen share:', error.code, error.message);
			this.actionService.openDialog('There was an error toggling screen share:', error?.error || error?.message);
		}
	}

	leaveSession() {
		this.log.d('Leaving session...');
		this.openviduService.disconnect();
		this.onLeaveSessionClicked.emit();
	}

	toggleMenu(type: string) {
		this.menuService.toggleMenu(<MenuType>type);
		this.onChatClicked.emit();
	}

	toggleFullscreen() {
		this.isFullscreenActive = !this.isFullscreenActive;
		this.documentService.toggleFullscreen('session-container');
	}

	protected subscribeToReconnection() {
		this.session.on('reconnecting', () => {
			if (this.menuService.isMenuOpened()) {
				this.menuService.closeMenu();
			}
			this.isConnectionLost = true;
		});
		this.session.on('reconnected', () => {
			this.isConnectionLost = false;
		});
	}
	protected subscribeToMenuToggling() {
		this.menuTogglingSubscription = this.menuService.menuOpenedObs.subscribe((ev: { opened: boolean; type?: MenuType }) => {
			this.isChatOpened = ev.opened && ev.type === MenuType.CHAT;
			this.isParticipantsOpened = ev.opened && ev.type === MenuType.PARTICIPANTS;
			if (this.isChatOpened) {
				this.unreadMessages = 0;
			}
		});
	}

	protected subscribeToChatMessages() {
		this.chatMessagesSubscription = this.chatService.messagesObs.pipe(skip(1)).subscribe((messages) => {
			if (!this.menuService.isMenuOpened()) {
				this.unreadMessages++;
			}
			this.messageList = messages;
			this.cd.markForCheck();
		});
	}
	protected subscribeToUserMediaProperties() {
		this.localParticipantSubscription = this.participantService.localParticipantObs.subscribe((p) => {
			this.isWebcamVideoActive = p.isCameraVideoActive();
			this.isWebcamAudioActive = p.isCameraAudioActive();
			this.isScreenShareActive = p.isScreenActive();
			this.cd.markForCheck();
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
