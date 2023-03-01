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
	ExceptionEvent,
	ExceptionEventName,
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
import { PanelEvent, PanelType } from '../../models/panel.model';
import { Signal } from '../../models/signal.model';
import { ActionService } from '../../services/action/action.service';
import { BroadcastingService } from '../../services/broadcasting/broadcasting.service';
import { CaptionService } from '../../services/caption/caption.service';
import { ChatService } from '../../services/chat/chat.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { LayoutService } from '../../services/layout/layout.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { PanelService } from '../../services/panel/panel.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { PlatformService } from '../../services/platform/platform.service';
import { RecordingService } from '../../services/recording/recording.service';
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
	@Output() onNodeCrashed = new EventEmitter<any>();

	session: Session;
	sessionScreen: Session;
	sideMenu: MatSidenav;
	sidenavMode: SidenavMode = SidenavMode.SIDE;
	settingsPanelOpened: boolean;
	drawer: MatDrawerContainer;
	preparing: boolean = true;

	private isSessionCreator: boolean = false;
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
		private libService: OpenViduAngularConfigService,
		protected layoutService: LayoutService,
		protected panelService: PanelService,
		private recordingService: RecordingService,
		private broadcastingService: BroadcastingService,
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
			this.isSessionCreator = this.participantService.amIModerator();
			if (!this.openviduService.getScreenToken()) {
				// Hide screenshare button if screen token does not exist
				this.libService.screenshareButton.next(false);
			}
			this.session = this.openviduService.getWebcamSession();
			this.sessionScreen = this.openviduService.getScreenSession();

			this.subscribeToOpenViduException();
			this.subscribeToCaptionLanguage();
			this.subscribeToConnectionCreatedAndDestroyed();
			this.subscribeToStreamCreated();
			this.subscribeToStreamDestroyed();
			this.subscribeToStreamPropertyChange();
			this.subscribeToNicknameChanged();
			this.chatService.subscribeToChat();
			this.subscribeToReconnection();

			await this.connectToSession();

			if (this.libService.isRecordingEnabled()) {
				this.subscribeToRecordingEvents();
			}

			if (this.libService.isBroadcastingEnabled()) {
				this.subscribeToBroadcastingEvents();
			}
		}
		this.preparing = false;
		this.cd.markForCheck();
	}

	async ngOnDestroy() {
		// Reconnecting session is received in Firefox
		// To avoid 'Connection lost' message uses session.off()
		if (!this.usedInPrejoinPage) {
			this.session?.off('reconnecting');
			await this.participantService.clear();
			this.session = null;
			this.sessionScreen = null;
			if (this.menuSubscription) this.menuSubscription.unsubscribe();
			if (this.layoutWidthSubscription) this.layoutWidthSubscription.unsubscribe();
			if (this.captionLanguageSubscription) this.captionLanguageSubscription.unsubscribe();
		}
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
			const nickname = this.participantService.getMyNickname();
			const participantId = this.participantService.getLocalParticipant().id;
			const screenPublisher = this.participantService.getMyScreenPublisher();
			const cameraPublisher = this.participantService.getMyCameraPublisher();

			if (this.participantService.haveICameraAndScreenActive()) {

				const webcamSessionId = await this.openviduService.connectWebcamSession(participantId, nickname);
				if (webcamSessionId) this.participantService.setMyCameraConnectionId(webcamSessionId);

				const screenSessionId = await this.openviduService.connectScreenSession(participantId, nickname);
				if (screenSessionId) this.participantService.setMyScreenConnectionId(screenSessionId);


				await this.openviduService.publishCamera(cameraPublisher);
				await this.openviduService.publishScreen(screenPublisher);
			} else if (this.participantService.isOnlyMyScreenActive()) {
				await this.openviduService.connectScreenSession(participantId, nickname);
				await this.openviduService.publishScreen(screenPublisher);
			} else {
				await this.openviduService.connectWebcamSession(participantId, nickname);
				await this.openviduService.publishCamera(cameraPublisher);
			}
		} catch (error) {
			// this._error.emit({ error: error.error, messgae: error.message, code: error.code, status: error.status });
			this.log.e('There was an error connecting to the session:', error.code, error.message);
			this.actionService.openDialog(this.translateService.translate('ERRORS.SESSION'), error?.error || error?.message || error);
		}
	}

	private subscribeToOpenViduException() {
		this.session.on('exception', async (event: ExceptionEvent) => {
			if (event.name === ExceptionEventName.SPEECH_TO_TEXT_DISCONNECTED) {
				this.log.w(event.name, event.message);
				this.openviduService.setSTTReady(false);
				// Try to re-subscribe to STT
				await this.openviduService.subscribeRemotesToSTT(this.captionService.getLangSelected().lang);
			} else {
				this.log.e(event.name, event.message);
			}
		});
	}

	private subscribeToConnectionCreatedAndDestroyed() {
		this.session.on('connectionCreated', async (event: ConnectionEvent) => {
			const connectionId = event.connection?.connectionId;
			const newNickname: string = this.participantService.getNicknameFromConnectionData(event.connection.data);
			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(connectionId);
			const isCameraConnection: boolean = !newNickname?.includes(`_${VideoType.SCREEN}`);
			const nickname = this.participantService.getMyNickname();
			const data = event.connection?.data;

			if (isRemoteConnection && isCameraConnection) {
				// Adding participant when connection is created and it's not screen
				this.participantService.addRemoteConnection(connectionId, data, null);

				//Sending nicnkanme signal to new participants
				if (this.openviduService.needSendNicknameSignal(nickname)) {
					const data = { clientData: this.participantService.getMyNickname() };
					await this.openviduService.sendSignal(Signal.NICKNAME_CHANGED, [event.connection], data);
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
			const isCameraType: boolean = this.participantService.getTypeConnectionData(data) === VideoType.CAMERA;
			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(connectionId);
			const lang = this.captionService.getLangSelected().lang;

			if (isRemoteConnection) {
				const subscriber: Subscriber = this.session.subscribe(event.stream, undefined);
				this.participantService.addRemoteConnection(connectionId, data, subscriber);
				// this.oVSessionService.sendNicknameSignal(event.stream.connection);

				if (this.openviduService.isSttReady() && this.captionService.areCaptionsEnabled() && isCameraType) {
					// Only subscribe to STT when is ready and stream is CAMERA type and it is a remote stream
					try {
						await this.openviduService.subscribeStreamToStt(event.stream, lang);
					} catch (error) {
						this.log.e('Error subscribing from STT: ', error);
						// I assume the only reason of an STT error is a STT crash.
						// It must be subscribed to all remotes again
						// await this.openviduService.unsubscribeRemotesFromSTT();
						await this.openviduService.subscribeRemotesToSTT(lang);
					}
				}
			}
		});
	}

	private subscribeToStreamDestroyed() {
		this.session.on('streamDestroyed', async (event: StreamEvent) => {
			const connectionId = event.stream.connection.connectionId;
			const data = event.stream?.connection?.data;
			const isRemoteConnection: boolean = !this.openviduService.isMyOwnConnection(connectionId);
			const isCameraType: boolean = this.participantService.getTypeConnectionData(data) === VideoType.CAMERA;

			this.participantService.removeConnectionByConnectionId(connectionId);
			if (this.openviduService.isSttReady() && this.captionService.areCaptionsEnabled() && isRemoteConnection && isCameraType) {
				try {
					await this.session.unsubscribeFromSpeechToText(event.stream);
				} catch (error) {
					this.log.e('Error unsubscribing from STT: ', error);
				}
			}
		});
	}

	private subscribeToCaptionLanguage() {
		this.captionLanguageSubscription = this.captionService.captionLangObs.subscribe(async (langOpt) => {
			if (this.captionService.areCaptionsEnabled()) {
				// Unsubscribe all streams from speech to text and re-subscribe with new language
				this.log.d('Re-subscribe from STT because of language changed to ', langOpt.lang);
				await this.openviduService.unsubscribeRemotesFromSTT();
				await this.openviduService.subscribeRemotesToSTT(langOpt.lang);
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
		this.session.on('recordingStarted', (event: RecordingEvent) => this.recordingService.startRecording(event));

		this.session.on('recordingStopped', (event: RecordingEvent) => this.recordingService.stopRecording(event));
	}

	private subscribeToBroadcastingEvents() {
		this.session.on('broadcastStarted', () => this.broadcastingService.startBroadcasting());
		this.session.on('broadcastStopped', () => this.broadcastingService.stopBroadcasting());

		if (!this.isSessionCreator) {
			// Listen to recording delete events from moderator
			this.session.on(`signal:${Signal.RECORDING_DELETED}`, () => this.recordingService.forceUpdateRecordings());
		}
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
