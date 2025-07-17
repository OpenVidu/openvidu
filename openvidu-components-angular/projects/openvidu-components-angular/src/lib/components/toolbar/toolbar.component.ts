import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	EventEmitter,
	HostListener,
	OnDestroy,
	OnInit,
	Output,
	TemplateRef,
	ViewChild
} from '@angular/core';
import { fromEvent, skip, Subject, takeUntil } from 'rxjs';
import { ChatService } from '../../services/chat/chat.service';
import { DocumentService } from '../../services/document/document.service';
import { PanelService } from '../../services/panel/panel.service';

import { MatMenuTrigger } from '@angular/material/menu';
import {
	ToolbarAdditionalButtonsDirective,
	ToolbarAdditionalPanelButtonsDirective
} from '../../directives/template/openvidu-components-angular.directive';
import { BroadcastingStatus, BroadcastingStatusInfo, BroadcastingStopRequestedEvent } from '../../models/broadcasting.model';
import { ChatMessage } from '../../models/chat.model';
import { ILogger } from '../../models/logger.model';
import { PanelStatusInfo, PanelType } from '../../models/panel.model';
import {
	RecordingInfo,
	RecordingStartRequestedEvent,
	RecordingStatus,
	RecordingStatusInfo,
	RecordingStopRequestedEvent
} from '../../models/recording.model';
import { ActionService } from '../../services/action/action.service';
import { BroadcastingService } from '../../services/broadcasting/broadcasting.service';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';
import { DeviceService } from '../../services/device/device.service';
import { LayoutService } from '../../services/layout/layout.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { PlatformService } from '../../services/platform/platform.service';
import { RecordingService } from '../../services/recording/recording.service';
import { StorageService } from '../../services/storage/storage.service';
import { TranslateService } from '../../services/translate/translate.service';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { ParticipantLeftEvent, ParticipantLeftReason, ParticipantModel } from '../../models/participant.model';
import { Room, RoomEvent } from 'livekit-client';
import { ToolbarAdditionalButtonsPosition } from '../../models/toolbar.model';

/**
 * The **ToolbarComponent** is hosted inside of the {@link VideoconferenceComponent}.
 * It is in charge of displaying the participants controlls for handling the media, panels and more videoconference features.
 */
@Component({
	selector: 'ov-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class ToolbarComponent implements OnInit, OnDestroy, AfterViewInit {
	/**
	 * @ignore
	 */
	@ContentChild('toolbarAdditionalButtons', { read: TemplateRef }) toolbarAdditionalButtonsTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('toolbarAdditionalPanelButtons', { read: TemplateRef }) toolbarAdditionalPanelButtonsTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild(ToolbarAdditionalButtonsDirective)
	set externalAdditionalButtons(externalAdditionalButtons: ToolbarAdditionalButtonsDirective) {
		// This directive will has value only when ADDITIONAL BUTTONS component (tagged with '*ovToolbarAdditionalButtons' directive)
		// is inside of the TOOLBAR component tagged with '*ovToolbar' directive
		if (externalAdditionalButtons) {
			this.toolbarAdditionalButtonsTemplate = externalAdditionalButtons.template;
		}
	}

	/**
	 * @ignore
	 */
	@ContentChild(ToolbarAdditionalPanelButtonsDirective)
	set externalAdditionalPanelButtons(externalAdditionalPanelButtons: ToolbarAdditionalPanelButtonsDirective) {
		// This directive will has value only when ADDITIONAL PANEL BUTTONS component tagged with '*ovToolbarAdditionalPanelButtons' directive
		// is inside of the TOOLBAR component tagged with '*ovToolbar' directive
		if (externalAdditionalPanelButtons) {
			this.toolbarAdditionalPanelButtonsTemplate = externalAdditionalPanelButtons.template;
		}
	}

	/**
	 * This event is emitted when the room has been disconnected.
	 *  @deprecated Use {@link ToolbarComponent.onParticipantLeft} instead.
	 */
	@Output() onRoomDisconnected: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * This event is emitted when the local participant leaves the room.
	 */
	@Output() onParticipantLeft: EventEmitter<ParticipantLeftEvent> = new EventEmitter<ParticipantLeftEvent>();

	/**
	 * This event is emitted when the video state changes, providing information about if the video is enabled (true) or disabled (false).
	 */
	@Output() onVideoEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This event is emitted when the video state changes, providing information about if the video is enabled (true) or disabled (false).
	 */
	@Output() onAudioEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This event is emitted when the fullscreen state changes, providing information about if the fullscreen is enabled (true) or disabled (false).
	 */
	@Output() onFullscreenEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This event is emitted when the screen share state changes, providing information about if the screen share is enabled (true) or disabled (false).
	 */
	@Output() onScreenShareEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This event is fired when the user clicks on the start recording button.
	 * It provides the {@link RecordingStartRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStartRequested: EventEmitter<RecordingStartRequestedEvent> = new EventEmitter<RecordingStartRequestedEvent>();
	/**
	 * Provides event notifications that fire when stop recording has been requested.
	 * It provides the {@link RecordingStopRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStopRequested: EventEmitter<RecordingStopRequestedEvent> = new EventEmitter<RecordingStopRequestedEvent>();

	/**
	 * Provides event notifications that fire when stop broadcasting has been requested.
	 * It provides the {@link BroadcastingStopRequestedEvent} payload as event data.
	 */
	@Output() onBroadcastingStopRequested: EventEmitter<BroadcastingStopRequestedEvent> =
		new EventEmitter<BroadcastingStopRequestedEvent>();

	/**
	 * @ignore
	 */
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;

	/**
	 * @ignore
	 */
	room: Room;
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
	isScreenShareEnabled: boolean = false;
	/**
	 * @ignore
	 */
	isCameraEnabled: boolean = true;
	/**
	 * @ignore
	 */
	isMicrophoneEnabled: boolean = true;
	/**
	 * @ignore
	 */
	isConnectionLost: boolean = false;
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
	isActivitiesOpened: boolean = false;

	/**
	 * @ignore
	 */
	isMinimal: boolean = false;
	/**
	 * @ignore
	 */
	showCameraButton: boolean = true;
	/**
	 * @ignore
	 */
	showMicrophoneButton: boolean = true;
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
	showBackgroundEffectsButton: boolean = true;

	/**
	 * @ignore
	 */
	showLeaveButton: boolean = true;

	/**
	 * @ignore
	 */
	showRecordingButton: boolean = true;

	/**
	 * @ignore
	 */
	showBroadcastingButton: boolean = true;

	/**
	 * @ignore
	 */
	showSettingsButton: boolean = true;

	/**
	 * @ignore
	 */
	showMoreOptionsButton: boolean = true;

	/**
	 * @ignore
	 */
	showParticipantsPanelButton: boolean = true;

	/**
	 * @ignore
	 */
	showActivitiesPanelButton: boolean = true;
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
	brandingLogo: string = '';
	/**
	 * @ignore
	 */
	showSessionName: boolean = true;

	/**
	 * @ignore
	 */
	showCaptionsButton: boolean = true;

	/**
	 * @ignore
	 */
	additionalButtonsPosition: ToolbarAdditionalButtonsPosition;

	/**
	 * @ignore
	 */
	captionsEnabled: boolean = false;

	/**
	 * @ignore
	 */
	cameraMuteChanging: boolean = false;

	/**
	 * @ignore
	 */
	microphoneMuteChanging: boolean = false;

	/**
	 * @ignore
	 */
	recordingStatus: RecordingStatus = RecordingStatus.STOPPED;

	/**
	 * @ignore
	 */
	private startedRecording: RecordingInfo | undefined;

	/**
	 * @ignore
	 */
	broadcastingStatus: BroadcastingStatus = BroadcastingStatus.STOPPED;
	/**
	 * @ignore
	 */
	broadcastingId: string | undefined;
	/**
	 * @ignore
	 */
	_recordingStatus = RecordingStatus;
	/**
	 * @ignore
	 */
	_broadcastingStatus = BroadcastingStatus;

	/**
	 * @ignore
	 */
	recordingTime: Date;

	private log: ILogger;
	private destroy$ = new Subject<void>();
	private currentWindowHeight = window.innerHeight;

	/**
	 * @ignore
	 */
	constructor(
		private layoutService: LayoutService,
		private documentService: DocumentService,
		private chatService: ChatService,
		private panelService: PanelService,
		private participantService: ParticipantService,
		private openviduService: OpenViduService,
		private oVDevicesService: DeviceService,
		private actionService: ActionService,
		private loggerSrv: LoggerService,
		private cd: ChangeDetectorRef,
		private libService: OpenViduComponentsConfigService,
		private platformService: PlatformService,
		private recordingService: RecordingService,
		private broadcastingService: BroadcastingService,
		private translateService: TranslateService,
		private storageSrv: StorageService,
		private cdkOverlayService: CdkOverlayService
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
		this.room = this.openviduService.getRoom();

		this.hasVideoDevices = this.oVDevicesService.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.oVDevicesService.hasAudioDeviceAvailable();

		this.subscribeToToolbarDirectives();
		this.subscribeToUserMediaProperties();

		this.subscribeToReconnection();
		this.subscribeToMenuToggling();
		this.subscribeToChatMessages();
		this.subscribeToRecordingStatus();
		this.subscribeToBroadcastingStatus();
		this.subscribeToCaptionsToggling();
	}

	ngAfterViewInit() {
		this.subscribeToFullscreenChanged();
	}

	ngOnDestroy(): void {
		this.panelService.clear();
		this.destroy$.next();
		this.destroy$.complete();
		this.isFullscreenActive = false;
		this.cdkOverlayService.setSelector('body');
	}

	/**
	 * @internal
	 */
	get hasRoomTracksPublished(): boolean {
		return this.openviduService.hasRoomTracksPublished();
	}

	/**
	 * @ignore
	 */
	async toggleMicrophone() {
		try {
			this.microphoneMuteChanging = false;
			const isMicrophoneEnabled = this.participantService.isMyMicrophoneEnabled();
			await this.participantService.setMicrophoneEnabled(!isMicrophoneEnabled);
		} catch (error) {
			this.log.e('There was an error toggling microphone:', error.code, error.message);
			this.actionService.openDialog(
				this.translateService.translate('ERRORS.TOGGLE_MICROPHONE'),
				error?.error || error?.message || error
			);
		} finally {
			this.microphoneMuteChanging = false;
		}
	}

	/**
	 * @ignore
	 */
	async toggleCamera() {
		try {
			this.cameraMuteChanging = true;
			const isCameraEnabled = this.participantService.isMyCameraEnabled();
			if (this.panelService.isBackgroundEffectsPanelOpened() && isCameraEnabled) {
				this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
			}
			await this.participantService.setCameraEnabled(!isCameraEnabled);
		} catch (error) {
			this.log.e('There was an error toggling camera:', error.code, error.message);
			this.actionService.openDialog(this.translateService.translate('ERRORS.TOGGLE_CAMERA'), error?.error || error?.message || error);
		} finally {
			this.cameraMuteChanging = false;
		}
	}

	/**
	 * @ignore
	 */
	async toggleScreenShare() {
		const isScreenShareEnabled = this.participantService.isMyScreenShareEnabled();
		await this.participantService.setScreenShareEnabled(!isScreenShareEnabled);
	}

	/**
	 * @ignore
	 */
	async replaceScreenTrack() {
		await this.participantService.switchScreenShare();
	}

	/**
	 * The participant leaves the room voluntarily.
	 * @ignore
	 */
	async disconnect() {
		try {
			await this.openviduService.disconnectRoom(() => {
				this.onParticipantLeft.emit({
					roomName: this.openviduService.getRoomName(),
					participantName: this.participantService.getLocalParticipant()?.identity || '',
					reason: ParticipantLeftReason.LEAVE
				});
				this.onRoomDisconnected.emit();
			}, false);
		} catch (error) {
			this.log.e('There was an error disconnecting:', error.code, error.message);
			this.actionService.openDialog(this.translateService.translate('ERRORS.DISCONNECT'), error?.error || error?.message || error);
		}
	}

	/**
	 * @ignore
	 */
	toggleRecording() {
		const payload: RecordingStartRequestedEvent = {
			roomName: this.openviduService.getRoomName()
		};
		if (this.recordingStatus === RecordingStatus.STARTED) {
			this.log.d('Stopping recording');
			payload.recordingId = this.startedRecording?.id;
			this.onRecordingStopRequested.emit(payload);
		} else if (this.recordingStatus === RecordingStatus.STOPPED) {
			this.onRecordingStartRequested.emit(payload);
			if (this.showActivitiesPanelButton && !this.isActivitiesOpened) {
				this.toggleActivitiesPanel('recording');
			}
		}
	}

	/**
	 * @ignore
	 */
	toggleBroadcasting() {
		if (this.broadcastingStatus === BroadcastingStatus.STARTED) {
			this.log.d('Stopping broadcasting');
			const payload: BroadcastingStopRequestedEvent = {
				roomName: this.openviduService.getRoomName(),
				broadcastingId: this.broadcastingId as string
			};
			this.onBroadcastingStopRequested.emit(payload);
			this.broadcastingService.setBroadcastingStopped();
		} else if (this.broadcastingStatus === BroadcastingStatus.STOPPED) {
			if (this.showActivitiesPanelButton && !this.isActivitiesOpened) {
				this.toggleActivitiesPanel('broadcasting');
			}
		}
	}

	/**
	 * @ignore
	 */
	toggleBackgroundEffects() {
		this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
	}

	/**
	 * @ignore
	 */
	// toggleCaptions() {
	// 	if (this.openviduService.isOpenViduPro()) {
	// 		this.layoutService.toggleCaptions();
	// 	} else {
	// 		this.actionService.openProFeatureDialog(
	// 			this.translateService.translate('PANEL.SETTINGS.CAPTIONS'),
	// 			this.translateService.translate('PANEL.PRO_FEATURE')
	// 		);
	// 	}
	// }

	/**
	 * @ignore
	 */
	toggleSettings() {
		this.panelService.togglePanel(PanelType.SETTINGS);
	}

	/**
	 * @ignore
	 */
	toggleParticipantsPanel() {
		this.panelService.togglePanel(PanelType.PARTICIPANTS);
	}

	/**
	 * @ignore
	 */
	toggleChatPanel() {
		this.panelService.togglePanel(PanelType.CHAT);
	}

	/**
	 * @ignore
	 */
	toggleFullscreen() {
		this.documentService.toggleFullscreen('session-container');
	}

	private toggleActivitiesPanel(expandPanel: string) {
		this.panelService.togglePanel(PanelType.ACTIVITIES, expandPanel);
	}

	private subscribeToReconnection() {
		this.room.on(RoomEvent.Reconnecting, () => {
			if (this.panelService.isPanelOpened()) {
				this.panelService.closePanel();
			}
			this.isConnectionLost = true;
		});
		this.room.on(RoomEvent.Reconnected, () => (this.isConnectionLost = false));
	}

	private subscribeToFullscreenChanged() {
		fromEvent(document, 'fullscreenchange').pipe(takeUntil(this.destroy$)).subscribe(() => {
			const isFullscreen = Boolean(document.fullscreenElement);
			if (isFullscreen) {
				this.cdkOverlayService.setSelector('#session-container');
			} else {
				this.cdkOverlayService.setSelector('body');
			}
			this.isFullscreenActive = isFullscreen;
			this.onFullscreenEnabledChanged.emit(this.isFullscreenActive);
			this.cd.detectChanges();
		});
	}

	private subscribeToMenuToggling() {
		this.panelService.panelStatusObs.pipe(takeUntil(this.destroy$)).subscribe((ev: PanelStatusInfo) => {
			this.isChatOpened = ev.isOpened && ev.panelType === PanelType.CHAT;
			this.isParticipantsOpened = ev.isOpened && ev.panelType === PanelType.PARTICIPANTS;
			this.isActivitiesOpened = ev.isOpened && ev.panelType === PanelType.ACTIVITIES;
			if (this.isChatOpened) {
				this.unreadMessages = 0;
			}
			this.cd.markForCheck();
		});
	}

	private subscribeToChatMessages() {
		this.chatService.messagesObs.pipe(skip(1), takeUntil(this.destroy$)).subscribe((messages) => {
			if (!this.panelService.isChatPanelOpened()) {
				this.unreadMessages++;
			}
			this.messageList = messages;
			this.cd.markForCheck();
		});
	}
	private subscribeToUserMediaProperties() {
		this.participantService.localParticipant$.pipe(takeUntil(this.destroy$)).subscribe((p: ParticipantModel | undefined) => {
			if (p) {
				if (this.isCameraEnabled !== p.isCameraEnabled) {
					this.onVideoEnabledChanged.emit(p.isCameraEnabled);
					this.isCameraEnabled = p.isCameraEnabled;
					this.storageSrv.setCameraEnabled(this.isCameraEnabled);
				}

				if (this.isMicrophoneEnabled !== p.isMicrophoneEnabled) {
					this.onAudioEnabledChanged.emit(p.isMicrophoneEnabled);
					this.isMicrophoneEnabled = p.isMicrophoneEnabled;
					this.storageSrv.setMicrophoneEnabled(this.isMicrophoneEnabled);
				}

				if (this.isScreenShareEnabled !== p.isScreenShareEnabled) {
					this.onScreenShareEnabledChanged.emit(p.isScreenShareEnabled);
					this.isScreenShareEnabled = p.isScreenShareEnabled;
				}
				this.cd.markForCheck();
			}
		});
	}

	private subscribeToRecordingStatus() {
		this.recordingService.recordingStatusObs.pipe(takeUntil(this.destroy$)).subscribe((event: RecordingStatusInfo) => {
			const { status, startedAt } = event;
			this.recordingStatus = status;
			if (status === RecordingStatus.STARTED) {
				this.startedRecording = event.recordingList.find((rec) => rec.status === RecordingStatus.STARTED);
			} else {
				this.startedRecording = undefined;
			}

			if (startedAt) {
				this.recordingTime = startedAt;
			}
			this.cd.markForCheck();
		});
	}

	private subscribeToBroadcastingStatus() {
		this.broadcastingService.broadcastingStatusObs.pipe(takeUntil(this.destroy$)).subscribe((ev: BroadcastingStatusInfo) => {
			if (!!ev) {
				this.broadcastingStatus = ev.status;
				this.broadcastingId = ev.broadcastingId;
				this.cd.markForCheck();
			}
		});
	}

	private subscribeToToolbarDirectives() {
		this.libService.minimal$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.isMinimal = value;
			this.cd.markForCheck();
		});
		this.libService.brandingLogo$.pipe(takeUntil(this.destroy$)).subscribe((value: string) => {
			this.brandingLogo = value;
			this.cd.markForCheck();
		});
		this.libService.cameraButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showCameraButton = value;
			this.cd.markForCheck();
		});
		this.libService.microphoneButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showMicrophoneButton = value;
			this.cd.markForCheck();
		});
		this.libService.screenshareButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showScreenshareButton = value && !this.platformService.isMobile();
			this.cd.markForCheck();
		});
		this.libService.fullscreenButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showFullscreenButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});
		this.libService.leaveButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showLeaveButton = value;
			this.cd.markForCheck();
		});

		this.libService.recordingButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showRecordingButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});

		this.libService.broadcastingButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showBroadcastingButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});

		this.libService.toolbarSettingsButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showSettingsButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});
		this.libService.chatPanelButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showChatPanelButton = value;
			this.cd.markForCheck();
		});
		this.libService.participantsPanelButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showParticipantsPanelButton = value;
			this.cd.markForCheck();
		});
		this.libService.activitiesPanelButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showActivitiesPanelButton = value;
			this.cd.markForCheck();
		});
		this.libService.backgroundEffectsButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showBackgroundEffectsButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});
		this.libService.displayLogo$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showLogo = value;
			this.cd.markForCheck();
		});

		this.libService.displayRoomName$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showSessionName = value;
			this.cd.markForCheck();
		});
		this.libService.captionsButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showCaptionsButton = value;
			this.cd.markForCheck();
		});

		this.libService.toolbarAdditionalButtonsPosition$.pipe(takeUntil(this.destroy$)).subscribe(
			(value: ToolbarAdditionalButtonsPosition) => {
				// Using Promise.resolve() to defer change detection until the next microtask.
				// This ensures that Angular's change detection has the latest value before updating the view.
				// Without this, Angular's OnPush strategy might not immediately reflect the change,
				// due to asynchronous operations affecting the timing of the detection cycle.

				Promise.resolve().then(() => {
					this.additionalButtonsPosition = value;
					this.cd.markForCheck();
				});
			}
		);
	}

	private subscribeToCaptionsToggling() {
		this.layoutService.captionsTogglingObs.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.captionsEnabled = value;
			this.cd.markForCheck();
		});
	}

	private checkDisplayMoreOptions() {
		this.showMoreOptionsButton =
			this.showFullscreenButton ||
			this.showBackgroundEffectsButton ||
			this.showRecordingButton ||
			this.showBroadcastingButton ||
			this.showSettingsButton;
	}
}
