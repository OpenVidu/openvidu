import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	ElementRef,
	EventEmitter,
	HostListener,
	Input,
	OnDestroy,
	OnInit,
	Output,
	TemplateRef,
	ViewChild
} from '@angular/core';
import {
	ConnectionEvent,
	RecordingEvent,
	Session,
	SessionDisconnectedEvent,
	StreamEvent,
	StreamPropertyChangedEvent,
	Subscriber
} from 'openvidu-browser';

import { ILogger } from '../../models/logger.model';
import { VideoType } from '../../models/video-type.model';

import { animate, style, transition, trigger } from '@angular/animations';
import { MatDrawerContainer, MatSidenav } from '@angular/material/sidenav';
import { skip, Subscription } from 'rxjs';
import { SidenavMode } from '../../models/layout.model';
import { PanelType } from '../../models/panel.model';
import { Signal } from '../../models/signal.model';
import { ActionService } from '../../services/action/action.service';
import { CaptionService } from '../../services/caption/caption.service';
import { ChatService } from '../../services/chat/chat.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { LayoutService } from '../../services/layout/layout.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { PanelEvent, PanelService } from '../../services/panel/panel.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { PlatformService } from '../../services/platform/platform.service';
import { RecordingService } from '../../services/recording/recording.service';
import { TokenService } from '../../services/token/token.service';
import { TranslateService } from '../../services/translate/translate.service';
import { VirtualBackgroundService } from '../../services/virtual-background/virtual-background.service';

/**
 * @internal
 */

@Component({
	selector: 'ov-session',
	templateUrl: './session.component.html',
	styleUrls: ['./session.component.css'],
	animations: [trigger('sessionAnimation', [transition(':enter', [style({ opacity: 0 }), animate('50ms', style({ opacity: 1 }))])])],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionComponent implements OnInit, OnDestroy {
	@ContentChild('toolbar', { read: TemplateRef }) toolbarTemplate: TemplateRef<any>;
	@ContentChild('panel', { read: TemplateRef }) panelTemplate: TemplateRef<any>;
	@ContentChild('layout', { read: TemplateRef }) layoutTemplate: TemplateRef<any>;

	@Input() usedInPrejoinPage = false;
	@Output() onSessionCreated = new EventEmitter<any>();

	@Output() onNodeCrashed = new EventEmitter<any>();

	session: Session;
	sessionScreen: Session;

	sideMenu: MatSidenav;

	sidenavMode: SidenavMode = SidenavMode.SIDE;
	settingsPanelOpened: boolean;
	drawer: MatDrawerContainer;
	preparing: boolean = true;

	protected readonly SIDENAV_WIDTH_LIMIT_MODE = 790;

	protected menuSubscription: Subscription;
	protected layoutWidthSubscription: Subscription;

	protected updateLayoutInterval: NodeJS.Timer;
	private captionLanguageSubscription: Subscription;

	protected log: ILogger;

	constructor(
		protected actionService: ActionService,
		protected openviduService: OpenViduService,
		protected participantService: ParticipantService,
		protected loggerSrv: LoggerService,
		protected chatService: ChatService,
		protected tokenService: TokenService,
		private libService: OpenViduAngularConfigService,
		protected layoutService: LayoutService,
		protected panelService: PanelService,
		private recordingService: RecordingService,
		private translateService: TranslateService,
		private captionService: CaptionService,
		private platformService: PlatformService,
		private backgroundService: VirtualBackgroundService,
		private cd: ChangeDetectorRef
	) {
		this.log = this.loggerSrv.get('SessionComponent');
	}

	@HostListener('window:beforeunload')
	beforeunloadHandler() {
		this.leaveSession();
	}

	@HostListener('window:resize')
	sizeChange() {
		this.layoutService.update();
	}

	@ViewChild('sidenav')
	set sidenavMenu(menu: MatSidenav) {
		setTimeout(() => {
			if (menu) {
				this.sideMenu = menu;
				this.subscribeToTogglingMenu();
			}
		}, 0);
	}

	@ViewChild('videoContainer', { static: false, read: ElementRef })
	set videoContainer(container: ElementRef) {
		setTimeout(() => {
			if (container && !this.toolbarTemplate) {
				container.nativeElement.style.height = '100%';
				container.nativeElement.style.minHeight = '100%';
				this.layoutService.update();
			}
		}, 0);
	}

	@ViewChild('container')
	set container(container: MatDrawerContainer) {
		setTimeout(() => {
			if (container) {
				this.drawer = container;
				this.drawer._contentMarginChanges.subscribe(() => {
					setTimeout(() => {
						this.stopUpdateLayoutInterval();
						this.layoutService.update();
						this.drawer.autosize = false;
					}, 250);
				});
			}
		}, 0);
	}

	@ViewChild('layoutContainer')
	set layoutContainer(container: ElementRef) {
		setTimeout(async () => {
			if (container) {
				// Apply background from storage when layout container is in DOM
				await this.backgroundService.applyBackgroundFromStorage();
			}
		}, 0);
	}

	async ngOnInit() {
		if (!this.usedInPrejoinPage) {
			if (!this.tokenService.getScreenToken()) {
				// Hide screenshare button if screen token does not exist
				this.libService.screenshareButton.next(false);
			}
			this.session = this.openviduService.getWebcamSession();
			this.sessionScreen = this.openviduService.getScreenSession();
			this.subscribeToCaptionLanguage();
			this.subscribeToConnectionCreatedAndDestroyed();
			this.subscribeToStreamCreated();
			this.subscribeToStreamDestroyed();
			this.subscribeToStreamPropertyChange();
			this.subscribeToNicknameChanged();
			this.chatService.subscribeToChat();
			this.subscribeToReconnection();
			const recordingEnabled = this.libService.recordingButton.getValue() && this.libService.recordingActivity.getValue();
			if (recordingEnabled) {
				this.subscribeToRecordingEvents();
			}
			this.onSessionCreated.emit(this.session);

			await this.connectToSession();
			// ios devices appear with blank video. Muting and unmuting it fix this problem
			if (this.platformService.isIos() && this.participantService.isMyCameraActive()) {
				await this.openviduService.publishVideo(false);
				await this.openviduService.publishVideo(true);
			}
		}
		this.preparing = false;
		this.cd.markForCheck();
	}

	ngOnDestroy() {
		// Reconnecting session is received in Firefox
		// To avoid 'Connection lost' message uses session.off()
		this.session?.off('reconnecting');
		this.participantService.clear();
		this.session = null;
		this.sessionScreen = null;
		if (this.menuSubscription) this.menuSubscription.unsubscribe();
		if (this.layoutWidthSubscription) this.layoutWidthSubscription.unsubscribe();
	}

	leaveSession() {
		this.log.d('Leaving session...');
		this.openviduService.disconnect();
	}

	protected subscribeToTogglingMenu() {
		this.sideMenu.openedChange.subscribe(() => {
			this.stopUpdateLayoutInterval();
			this.layoutService.update();
		});

		this.sideMenu.openedStart.subscribe(() => {
			this.startUpdateLayoutInterval();
		});

		this.sideMenu.closedStart.subscribe(() => {
			this.startUpdateLayoutInterval();
		});

		this.menuSubscription = this.panelService.panelOpenedObs.pipe(skip(1)).subscribe((ev: PanelEvent) => {
			if (this.sideMenu) {
				this.settingsPanelOpened = ev.opened && ev.type === PanelType.SETTINGS;

				if (this.sideMenu.opened && ev.opened) {
					if (ev.type === PanelType.SETTINGS || ev.oldType === PanelType.SETTINGS) {
						// Switch from SETTINGS to another panel and vice versa.
						// As the SETTINGS panel will be bigger than others, the sidenav container must be updated.
						// Setting autosize to 'true' allows update it.
						this.drawer.autosize = true;
						this.startUpdateLayoutInterval();
					}
				}
				ev.opened ? this.sideMenu.open() : this.sideMenu.close();
			}
		});
	}

	protected subscribeToLayoutWidth() {
		this.layoutWidthSubscription = this.layoutService.layoutWidthObs.subscribe((width) => {
			this.sidenavMode = width <= this.SIDENAV_WIDTH_LIMIT_MODE ? SidenavMode.OVER : SidenavMode.SIDE;
		});
	}

	private async connectToSession(): Promise<void> {
		try {
			if (this.participantService.haveICameraAndScreenActive()) {
				await this.openviduService.connectSession(this.openviduService.getWebcamSession(), this.tokenService.getWebcamToken());
				await this.openviduService.connectSession(this.openviduService.getScreenSession(), this.tokenService.getScreenToken());
				await this.openviduService.publish(this.participantService.getMyCameraPublisher());
				await this.openviduService.publish(this.participantService.getMyScreenPublisher());
			} else if (this.participantService.isOnlyMyScreenActive()) {
				await this.openviduService.connectSession(this.openviduService.getScreenSession(), this.tokenService.getScreenToken());
				await this.openviduService.publish(this.participantService.getMyScreenPublisher());
			} else {
				await this.openviduService.connectSession(this.openviduService.getWebcamSession(), this.tokenService.getWebcamToken());
				await this.openviduService.publish(this.participantService.getMyCameraPublisher());
			}
		} catch (error) {
			// this._error.emit({ error: error.error, messgae: error.message, code: error.code, status: error.status });
			this.log.e('There was an error connecting to the session:', error.code, error.message);
			this.actionService.openDialog(this.translateService.translate('ERRORS.SESSION'), error?.error || error?.message || error);
		}
	}

	private subscribeToConnectionCreatedAndDestroyed() {
		this.session.on('connectionCreated', (event: ConnectionEvent) => {
			const connectionId = event.connection?.connectionId;
			const nickname: string = this.participantService.getNicknameFromConnectionData(event.connection.data);
			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(connectionId);
			const isCameraConnection: boolean = !nickname?.includes(`_${VideoType.SCREEN}`);
			const data = event.connection?.data;

			if (isRemoteConnection && isCameraConnection) {
				// Adding participant when connection is created and it's not screen
				this.participantService.addRemoteConnection(connectionId, data, null);

				//Sending nicnkanme signal to new participants
				if (this.openviduService.needSendNicknameSignal()) {
					const data = { clientData: this.participantService.getMyNickname() };
					this.openviduService.sendSignal(Signal.NICKNAME_CHANGED, [event.connection], data);
				}
			}
		});

		this.session.on('connectionDestroyed', (event: ConnectionEvent) => {
			const nickname: string = this.participantService.getNicknameFromConnectionData(event.connection.data);
			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(event.connection.connectionId);
			const isCameraConnection: boolean = !nickname?.includes(`_${VideoType.SCREEN}`);
			// Deleting participant when connection is destroyed
			if (isRemoteConnection && isCameraConnection) {
				this.participantService.removeConnectionByConnectionId(event.connection.connectionId);
			}
		});
	}

	private subscribeToStreamCreated() {
		this.session.on('streamCreated', async (event: StreamEvent) => {
			const connectionId = event.stream?.connection?.connectionId;
			const data = event.stream?.connection?.data;

			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(connectionId);
			if (isRemoteConnection) {
				const subscriber: Subscriber = this.session.subscribe(event.stream, undefined);
				this.participantService.addRemoteConnection(connectionId, data, subscriber);
				// this.oVSessionService.sendNicknameSignal(event.stream.connection);

				if (this.participantService.getTypeConnectionData(data) === VideoType.CAMERA) {
					// Only subscribe to STT when stream is CAMERA type and it is a remote stream
					try {
						await this.session.subscribeToSpeechToText(event.stream, this.captionService.getLangSelected().ISO);
					} catch (error) {
						this.log.e('Error subscribing from STT: ', error);
					}
				}
			}
		});
	}

	private subscribeToStreamDestroyed() {
		this.session.on('streamDestroyed', async (event: StreamEvent) => {
			const connectionId = event.stream.connection.connectionId;
			this.participantService.removeConnectionByConnectionId(connectionId);
			try {
				await this.session.unsubscribeFromSpeechToText(event.stream);
			} catch (error) {
				this.log.e('Error unsubscribing from STT: ', error);
			}
		});
	}

	private subscribeToCaptionLanguage() {
		this.captionLanguageSubscription = this.captionService.captionLangObs.subscribe(async (lang) => {
			// Unsubscribe all streams from speech to text and re-subscribe with new language
			this.log.d('Re-subscribe from STT because of language changed to ', lang.ISO);
			for (const participant of this.participantService.getRemoteParticipants()) {
				const streamManager = participant.getCameraConnection()?.streamManager;
				if (!!streamManager?.stream) {
					try {
						await this.session.unsubscribeFromSpeechToText(streamManager.stream);
						await this.session.subscribeToSpeechToText(streamManager.stream, lang.ISO);
					} catch (error) {
						this.log.e('Error re-subscribing to STT: ', error);
					}
				}
			}
		});
	}

	private subscribeToStreamPropertyChange() {
		this.session.on('streamPropertyChanged', (event: StreamPropertyChangedEvent) => {
			const connectionId = event.stream.connection.connectionId;
			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(connectionId);
			if (isRemoteConnection) {
				this.participantService.updateRemoteParticipants();
			}
		});
	}

	private subscribeToNicknameChanged() {
		this.session.on(`signal:${Signal.NICKNAME_CHANGED}`, (event: any) => {
			const connectionId = event.from.connectionId;
			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(connectionId);

			if (isRemoteConnection) {
				const nickname = this.participantService.getNicknameFromConnectionData(event.data);
				this.participantService.setRemoteNickname(connectionId, nickname);
			}
		});
	}

	private subscribeToReconnection() {
		this.session.on('reconnecting', () => {
			this.log.w('Connection lost: Reconnecting');
			this.actionService.openDialog(
				this.translateService.translate('ERRORS.CONNECTION'),
				this.translateService.translate('ERRORS.RECONNECT'),
				false
			);
		});
		this.session.on('reconnected', () => {
			this.log.w('Connection lost: Reconnected');
			this.actionService.closeDialog();
		});
		this.session.on('sessionDisconnected', (event: SessionDisconnectedEvent) => {
			if (event.reason === 'nodeCrashed') {
				this.actionService.openDialog(
					this.translateService.translate('ERRORS.CONNECTION'),
					this.translateService.translate('ERRORS.RECONNECT'),
					false
				);
				this.onNodeCrashed.emit();
			} else if (event.reason === 'networkDisconnect') {
				this.actionService.closeDialog();
				this.leaveSession();
			}
		});
	}

	private subscribeToRecordingEvents() {
		this.session.on('recordingStarted', (event: RecordingEvent) => {
			this.recordingService.startRecording(event);
		});

		this.session.on('recordingStopped', (event: RecordingEvent) => {
			this.recordingService.stopRecording(event);
		});
	}

	private startUpdateLayoutInterval() {
		this.updateLayoutInterval = setInterval(() => {
			this.layoutService.update();
		}, 50);
	}

	private stopUpdateLayoutInterval() {
		if (this.updateLayoutInterval) {
			clearInterval(this.updateLayoutInterval);
		}
	}
}
