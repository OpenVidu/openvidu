import { Component, ContentChild, EventEmitter, HostListener, OnDestroy, OnInit, Output, TemplateRef } from '@angular/core';
import { skip, Subscription } from 'rxjs';
import { TokenService } from '../../services/token/token.service';
import { ChatService } from '../../services/chat/chat.service';
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';
import { DocumentService } from '../../services/document/document.service';

import { WebrtcService } from '../../services/webrtc/webrtc.service';
import { LoggerService } from '../../services/logger/logger.service';
import { ILogger } from '../../models/logger.model';
import { ScreenType } from '../../models/video-type.model';
import { PublisherProperties, Session } from 'openvidu-browser';
import { ActionService } from '../../services/action/action.service';
import { DeviceService } from '../../services/device/device.service';
import { ChatMessage } from '../../models/chat.model';
import { ParticipantService } from '../../services/participant/participant.service';
import { LibraryConfigService } from '../../services/library-config/library-config.service';
import { MenuType } from '../../models/menu.model';

@Component({
	selector: 'ov-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.css']
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
	isScreenShareEnabled: boolean;
	isWebcamVideoEnabled: boolean;
	isWebcamAudioEnabled: boolean;
	isConnectionLost: boolean;
	hasVideoDevices: boolean;
	hasAudioDevices: boolean;
	isFullscreenEnabled: boolean = false;
	isChatOpened: boolean = false;
	isParticipantsOpened: boolean = false;
	logoUrl = 'assets/images/openvidu_globe.png';

	protected log: ILogger;
	protected menuTogglingSubscription: Subscription;
	protected chatMessagesSubscription: Subscription;
	protected screenShareStateSubscription: Subscription;
	protected webcamVideoStateSubscription: Subscription;
	protected webcamAudioStateSubscription: Subscription;

	constructor(
		protected libraryConfigSrv: LibraryConfigService,
		protected documentService: DocumentService,
		protected chatService: ChatService,
		protected menuService: SidenavMenuService,
		protected tokenService: TokenService,
		protected participantService: ParticipantService,
		protected webrtcService: WebrtcService,
		protected oVDevicesService: DeviceService,
		protected actionService: ActionService,
		protected loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('ToolbarComponent');
	}

	ngOnDestroy(): void {
		if (this.menuTogglingSubscription) {
			this.menuTogglingSubscription.unsubscribe();
		}
		if (this.chatMessagesSubscription) {
			this.chatMessagesSubscription.unsubscribe();
		}
		if (this.screenShareStateSubscription) {
			this.screenShareStateSubscription.unsubscribe();
		}
		if (this.webcamVideoStateSubscription) {
			this.webcamVideoStateSubscription.unsubscribe();
		}
		if (this.webcamAudioStateSubscription) {
			this.webcamAudioStateSubscription.unsubscribe();
		}
	}

	@HostListener('window:resize', ['$event'])
	sizeChange(event) {
		const maxHeight = window.screen.height;
		const maxWidth = window.screen.width;
		const curHeight = window.innerHeight;
		const curWidth = window.innerWidth;
		this.isFullscreenEnabled = maxWidth == curWidth && maxHeight == curHeight;
	}

	async ngOnInit() {
		await this.oVDevicesService.initializeDevices();
		this.hasVideoDevices = this.oVDevicesService.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.oVDevicesService.hasAudioDeviceAvailable();
		this.session = this.webrtcService.getWebcamSession();

		this.subscribeToUserMediaProperties();
		this.subscribeToReconnection();
		this.subscribeToMenuToggling();
		this.subscribeToChatMessages();
	}

	toggleMicrophone() {
		this.onMicClicked.emit();

		if (this.participantService.isMyCameraEnabled()) {
			this.webrtcService.publishAudio(
				this.participantService.getMyCameraPublisher(),
				!this.participantService.hasCameraAudioActive()
			);
			return;
		}
		this.webrtcService.publishAudio(this.participantService.getMyScreenPublisher(), !this.participantService.hasScreenAudioActive());
	}

	async toggleCamera() {
		this.onCamClicked.emit();

		try {
			const publishVideo = !this.participantService.hasCameraVideoActive();
			const publishAudio = this.participantService.hasCameraAudioActive();
			// Disabling webcam
			if (this.participantService.areBothEnabled()) {
				this.webrtcService.publishVideo(this.participantService.getMyCameraPublisher(), publishVideo);
				this.participantService.disableWebcamUser();
				this.webrtcService.unpublish(this.participantService.getMyCameraPublisher());
				this.webrtcService.publishAudio(this.participantService.getMyScreenPublisher(), publishAudio);
				return;
			}
			// Enabling webcam
			if (this.participantService.isOnlyMyScreenEnabled()) {
				const hasAudio = this.participantService.hasScreenAudioActive();

				if (!this.webrtcService.isWebcamSessionConnected()) {
					await this.webrtcService.connectSession(this.webrtcService.getWebcamSession(), this.tokenService.getWebcamToken());
				}
				await this.webrtcService.publish(this.participantService.getMyCameraPublisher());
				this.webrtcService.publishAudio(this.participantService.getMyScreenPublisher(), false);
				this.webrtcService.publishAudio(this.participantService.getMyCameraPublisher(), hasAudio);
				this.participantService.enableWebcamUser();
			}
			// Muting/unmuting webcam
			this.webrtcService.publishVideo(this.participantService.getMyCameraPublisher(), publishVideo);
		} catch (error) {
			this.log.e('There was an error toggling camera:', error.code, error.message);
			this.actionService.openDialog('There was an error toggling camera:', error?.error || error?.message);
		}
	}

	async toggleScreenShare() {
		this.onScreenShareClicked.emit();

		try {
			// Disabling screenShare
			if (this.participantService.areBothEnabled()) {
				this.participantService.disableScreenUser();
				this.webrtcService.unpublish(this.participantService.getMyScreenPublisher());
				return;
			}

			// Enabling screenShare
			if (this.participantService.isOnlyMyCameraEnabled()) {
				const willThereBeWebcam = this.participantService.isMyCameraEnabled() && this.participantService.hasCameraVideoActive();
				const hasAudio = willThereBeWebcam ? false : this.hasAudioDevices && this.participantService.hasCameraAudioActive();
				const properties: PublisherProperties = {
					videoSource: ScreenType.SCREEN,
					audioSource: this.hasAudioDevices ? undefined : null,
					publishVideo: true,
					publishAudio: hasAudio,
					mirror: false
				};
				const screenPublisher = this.webrtcService.initPublisher(undefined, properties);

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
					this.participantService.enableScreenUser(screenPublisher);

					if (!this.webrtcService.isScreenSessionConnected()) {
						await this.webrtcService.connectSession(this.webrtcService.getScreenSession(), this.tokenService.getScreenToken());
					}
					await this.webrtcService.publish(this.participantService.getMyScreenPublisher());
					// this.webrtcService.sendNicknameSignal();
					if (!this.participantService.hasCameraVideoActive()) {
						// Disabling webcam
						this.participantService.disableWebcamUser();
						this.webrtcService.unpublish(this.participantService.getMyCameraPublisher());
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
			if (!this.webrtcService.isWebcamSessionConnected()) {
				await this.webrtcService.connectSession(this.webrtcService.getWebcamSession(), this.tokenService.getWebcamToken());
			}
			await this.webrtcService.publish(this.participantService.getMyCameraPublisher());
			this.webrtcService.publishAudio(this.participantService.getMyScreenPublisher(), false);
			this.webrtcService.publishAudio(this.participantService.getMyCameraPublisher(), hasAudio);
			this.participantService.enableWebcamUser();
			this.participantService.disableScreenUser();
			this.webrtcService.unpublish(this.participantService.getMyScreenPublisher());
		} catch (error) {
			this.log.e('There was an error toggling screen share:', error.code, error.message);
			this.actionService.openDialog('There was an error toggling screen share:', error?.error || error?.message);
		}
	}

	async replaceScreenTrack() {
		const properties: PublisherProperties = {
			videoSource: ScreenType.SCREEN,
			publishVideo: true,
			publishAudio: !this.participantService.isMyCameraEnabled(),
			mirror: false
		};
		await this.webrtcService.replaceTrack(this.participantService.getMyScreenPublisher(), properties);
	}

	leaveSession() {
		this.log.d('Leaving session...');
		this.webrtcService.disconnect();
		this.onLeaveSessionClicked.emit();
	}

	toggleMenu(type: string) {
		this.menuService.toggleMenu(<MenuType>type);
		this.onChatClicked.emit();
	}

	toggleFullscreen() {
		this.documentService.toggleFullscreen('room-container');
		this.isFullscreenEnabled = !this.isFullscreenEnabled;
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
		this.menuTogglingSubscription = this.menuService.menuOpenedObs.subscribe((ev: {opened: boolean, type?: MenuType}) => {
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
		});
	}
	protected subscribeToUserMediaProperties() {
		this.screenShareStateSubscription = this.participantService.screenShareState.subscribe((enabled) => {
			this.isScreenShareEnabled = enabled;
		});

		this.webcamVideoStateSubscription = this.participantService.webcamVideoActive.subscribe((enabled) => {
			this.isWebcamVideoEnabled = enabled;
		});
		this.webcamAudioStateSubscription = this.participantService.webcamAudioActive.subscribe((enabled) => {
			this.isWebcamAudioEnabled = enabled;
		});
	}
}
