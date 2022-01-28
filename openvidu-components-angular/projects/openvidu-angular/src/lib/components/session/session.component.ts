import {
	Component,
	ContentChild,
	EventEmitter,
	HostListener,
	Input,
	OnInit,
	Output,
	TemplateRef,
	ViewChild,
	ViewContainerRef
} from '@angular/core';
import { Subscriber, Session, StreamEvent, StreamPropertyChangedEvent, SessionDisconnectedEvent, ConnectionEvent } from 'openvidu-browser';

import { VideoType } from '../../models/video-type.model';
import { ILogger } from '../../models/logger.model';

import { ChatService } from '../../services/chat/chat.service';
import { LoggerService } from '../../services/logger/logger.service';
import { WebrtcService } from '../../services/webrtc/webrtc.service';
import { TokenService } from '../../services/token/token.service';
import { ActionService } from '../../services/action/action.service';
import { Signal } from '../../models/signal.model';
import { ParticipantService } from '../../services/participant/participant.service';
import { MatSidenav } from '@angular/material/sidenav';
import { SidenavMode } from '../../models/layout.model';
import { LayoutService } from '../../services/layout/layout.service';
import { Subscription, skip } from 'rxjs';
import { MenuType } from '../../models/menu.model';
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { LibraryConfigService } from '../../services/library-config/library-config.service';
import { LayoutComponent } from '../layout/layout.component';
import { PanelComponent } from '../panel/panel.component';
import { LibraryComponents } from '../../config/lib.config';

@Component({
	selector: 'ov-session',
	templateUrl: './session.component.html',
	styleUrls: ['./session.component.css']
})
export class SessionComponent implements OnInit {
	// @ContentChild('toolbar', { read: TemplateRef }) toolbarTemplate: TemplateRef<any>;
	@ContentChild('customPanelContent', { read: TemplateRef }) customPanelContentTemplate: TemplateRef<any>;
	@ContentChild('customLayoutElement', { read: TemplateRef }) customLayoutElementTemplate: TemplateRef<any>;

	@Input() tokens: { webcam: string; screen: string };
	// @Output() _session = new EventEmitter<any>();
	// @Output() _publisher = new EventEmitter<any>();
	// @Output() _error = new EventEmitter<any>();

	session: Session;
	sessionScreen: Session;

	sideMenu: MatSidenav;

	sidenavMode: SidenavMode = SidenavMode.SIDE;

	protected readonly SIDENAV_WIDTH_LIMIT_MODE = 790;

	protected menuSubscription: Subscription;
	protected layoutWidthSubscription: Subscription;

	protected updateLayoutInterval: NodeJS.Timer;

	protected log: ILogger;

	_toolbar: ViewContainerRef;
	_layout: ViewContainerRef;
	_panel: ViewContainerRef;

	constructor(
		protected actionService: ActionService,
		protected webrtcService: WebrtcService,
		protected participantService: ParticipantService,
		protected loggerSrv: LoggerService,
		protected chatService: ChatService,
		protected tokenService: TokenService,
		protected layoutService: LayoutService,
		protected menuService: SidenavMenuService,
		protected libraryConfigSrv: LibraryConfigService
	) {
		this.log = this.loggerSrv.get('SessionComponent');
	}

	@ViewChild('toolbar', { static: false, read: ViewContainerRef })
	set toolbar(reference: ViewContainerRef) {
		setTimeout(() => {
			this._toolbar = reference;

			if (this._toolbar) {
				let component = ToolbarComponent;
				// Inject the custom component if exists
				if (this.libraryConfigSrv.isCustomComponentDefined(LibraryComponents.TOOLBAR)) {
					component = this.libraryConfigSrv.getCustomComponent(LibraryComponents.TOOLBAR);
				}
				this._toolbar?.clear();
				this._toolbar.createComponent(component);
			}
		}, 0);
	}

	@ViewChild('layout', { static: false, read: ViewContainerRef })
	set layout(reference: ViewContainerRef) {
		setTimeout(() => {
			this._layout = reference;

			if (this._layout) {
				let component = LayoutComponent;
				// Inject the custom component if exists
				if (this.libraryConfigSrv.isCustomComponentDefined(LibraryComponents.LAYOUT)) {
					component = this.libraryConfigSrv.getCustomComponent(LibraryComponents.LAYOUT);
				}
				this._layout?.clear();
				this._layout.createComponent(component);
				this.layoutService.initialize();
			}
		}, 0);
	}

	@ViewChild('panel', { static: false, read: ViewContainerRef })
	set panel(reference: ViewContainerRef) {
		setTimeout(() => {
			this._panel = reference;

			if (this._panel) {
				let component = PanelComponent;
				// Inject the custom component if exists
				// if (this.libraryConfigSrv.isCustomComponentDefined(LibraryComponents.PANEL)) {
				// 	component = this.libraryConfigSrv.getCustomComponent(LibraryComponents.PANEL);
				// }
				this._panel?.clear();
				this._panel.createComponent(component);
			}
		}, 0);
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

	async ngOnInit() {
		if (this.webrtcService.getWebcamSession() === null) {
			this.webrtcService.initialize();
			await this.webrtcService.initDefaultPublisher(undefined);
		}
		this.session = this.webrtcService.getWebcamSession();
		this.sessionScreen = this.webrtcService.getScreenSession();
		this.subscribeToConnectionCreatedAndDestroyed();
		this.subscribeToStreamCreated();
		this.subscribeToStreamDestroyed();
		this.subscribeToStreamPropertyChange();
		this.subscribeToNicknameChanged();
		this.chatService.subscribeToChat();
		this.subscribeToReconnection();

		this.tokenService.setWebcamToken(this.tokens.webcam);
		this.tokenService.setScreenToken(this.tokens.screen);

		await this.connectToSession();
		// Workaround, firefox does not have audio when publisher join with muted camera
		// if (this.platformService.isFirefox() && !this.localUserService.hasCameraVideoActive()) {
		// 	this.webrtcService.publishVideo(this.localUserService.getMyCameraPublisher(), true);
		// 	this.webrtcService.publishVideo(this.localUserService.getMyCameraPublisher(), false);
		// }

		// this._session.emit(this.session);
	}

	ngOnDestroy() {
		// Reconnecting session is received in Firefox
		// To avoid 'Connection lost' message uses session.off()
		this.session?.off('reconnecting');
		this.participantService.clear();
		this.session = null;
		this.sessionScreen = null;
		this.layoutService.clear();
		if (this.menuSubscription) this.menuSubscription.unsubscribe();
		if (this.layoutWidthSubscription) this.layoutWidthSubscription.unsubscribe();
	}

	leaveSession() {
		this.log.d('Leaving session...');
		this.webrtcService.disconnect();
	}

	protected subscribeToTogglingMenu() {
		this.sideMenu.openedChange.subscribe(() => {
			if (this.updateLayoutInterval) {
				clearInterval(this.updateLayoutInterval);
			}
			this.layoutService.update();
		});

		this.sideMenu.openedStart.subscribe(() => {
			this.updateLayoutInterval = setInterval(() => this.layoutService.update(), 50);
		});

		this.sideMenu.closedStart.subscribe(() => {
			this.updateLayoutInterval = setInterval(() => this.layoutService.update(), 50);
		});

		this.menuSubscription = this.menuService.menuOpenedObs.pipe(skip(1)).subscribe((ev: { opened: boolean; type?: MenuType }) => {
			this.sideMenu && ev.opened ? this.sideMenu.open() : this.sideMenu.close();
		});
	}

	protected subscribeToLayoutWidth() {
		this.layoutWidthSubscription = this.layoutService.layoutWidthObs.subscribe((width) => {
			this.sidenavMode = width <= this.SIDENAV_WIDTH_LIMIT_MODE ? SidenavMode.OVER : SidenavMode.SIDE;
		});
	}

	private async connectToSession(): Promise<void> {
		try {
			if (this.participantService.areBothEnabled()) {
				await this.webrtcService.connectSession(this.webrtcService.getWebcamSession(), this.tokenService.getWebcamToken());
				await this.webrtcService.connectSession(this.webrtcService.getScreenSession(), this.tokenService.getScreenToken());
				await this.webrtcService.publish(this.participantService.getMyCameraPublisher());
				await this.webrtcService.publish(this.participantService.getMyScreenPublisher());
			} else if (this.participantService.isOnlyMyScreenEnabled()) {
				await this.webrtcService.connectSession(this.webrtcService.getScreenSession(), this.tokenService.getScreenToken());
				await this.webrtcService.publish(this.participantService.getMyScreenPublisher());
			} else {
				await this.webrtcService.connectSession(this.webrtcService.getWebcamSession(), this.tokenService.getWebcamToken());
				await this.webrtcService.publish(this.participantService.getMyCameraPublisher());
			}
		} catch (error) {
			// this._error.emit({ error: error.error, messgae: error.message, code: error.code, status: error.status });
			this.log.e('There was an error connecting to the session:', error.code, error.message);
			this.actionService.openDialog('There was an error connecting to the session:', error?.error || error?.message);
		}
	}

	private subscribeToConnectionCreatedAndDestroyed() {
		this.session.on('connectionCreated', (event: ConnectionEvent) => {
			const connectionId = event.connection?.connectionId;
			const nickname: string = this.participantService.getNicknameFromConnectionData(event.connection.data);
			const isRemoteConnection: boolean = !this.webrtcService.isMyOwnConnection(connectionId);
			const isCameraConnection: boolean = !nickname?.includes(`_${VideoType.SCREEN}`);
			const data = event.connection?.data;

			if (isRemoteConnection && isCameraConnection) {
				// Adding participant when connection is created and it's not screen
				this.participantService.addRemoteConnection(connectionId, data, null);

				//Sending nicnkanme signal to new participants
				if (this.webrtcService.needSendNicknameSignal()) {
					const data = { clientData: this.participantService.getWebcamNickname() };
					this.webrtcService.sendSignal(Signal.NICKNAME_CHANGED, [event.connection], data);
				}
			}
		});

		this.session.on('connectionDestroyed', (event: ConnectionEvent) => {
			const nickname: string = this.participantService.getNicknameFromConnectionData(event.connection.data);
			const isRemoteConnection: boolean = !this.webrtcService.isMyOwnConnection(event.connection.connectionId);
			const isCameraConnection: boolean = !nickname?.includes(`_${VideoType.SCREEN}`);
			// Deleting participant when connection is destroyed
			if (isRemoteConnection && isCameraConnection) {
				this.participantService.removeConnectionByConnectionId(event.connection.connectionId);
			}
		});
	}

	private subscribeToStreamCreated() {
		this.session.on('streamCreated', (event: StreamEvent) => {
			const connectionId = event.stream?.connection?.connectionId;
			const data = event.stream?.connection?.data;

			const isRemoteConnection: boolean = !this.webrtcService.isMyOwnConnection(connectionId);
			if (isRemoteConnection) {
				const subscriber: Subscriber = this.session.subscribe(event.stream, undefined);
				this.participantService.addRemoteConnection(connectionId, data, subscriber);
				// this.oVSessionService.sendNicknameSignal(event.stream.connection);
			}
		});
	}

	private subscribeToStreamDestroyed() {
		this.session.on('streamDestroyed', (event: StreamEvent) => {
			const connectionId = event.stream.connection.connectionId;
			this.participantService.removeConnectionByConnectionId(connectionId);
			// event.preventDefault();
		});
	}

	private subscribeToStreamPropertyChange() {
		// this.session.on('streamPropertyChanged', (event: StreamPropertyChangedEvent) => {
		// 	const connectionId = event.stream.connection.connectionId;
		// 	const isRemoteConnection: boolean = !this.webrtcService.isMyOwnConnection(connectionId);
		// 	if (isRemoteConnection) {
		// 		if (event.changedProperty === 'videoActive') {
		// 			// this.participantService.updateUsers();
		// 		}
		// 	}
		// });
	}

	private subscribeToNicknameChanged() {
		this.session.on(`signal:${Signal.NICKNAME_CHANGED}`, (event: any) => {
			const connectionId = event.from.connectionId;
			const isRemoteConnection: boolean = !this.webrtcService.isMyOwnConnection(connectionId);

			if (isRemoteConnection) {
				const nickname = this.participantService.getNicknameFromConnectionData(event.data);
				this.participantService.setNickname(connectionId, nickname);
			}
		});
	}

	private subscribeToReconnection() {
		this.session.on('reconnecting', () => {
			this.log.w('Connection lost: Reconnecting');
			this.actionService.openDialog('Connection Problem', 'Oops! Trying to reconnect to the session ...', false);
		});
		this.session.on('reconnected', () => {
			this.log.w('Connection lost: Reconnected');
			this.actionService.closeDialog();
		});
		this.session.on('sessionDisconnected', (event: SessionDisconnectedEvent) => {
			if (event.reason === 'networkDisconnect') {
				this.actionService.closeDialog();
				this.leaveSession();
			}
		});
	}
}
