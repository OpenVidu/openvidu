import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	ElementRef,
	EventEmitter,
	HostListener,
	OnDestroy,
	OnInit,
	Output,
	TemplateRef,
	ViewChild
} from '@angular/core';

import { ILogger } from '../../models/logger.model';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDrawerContainer, MatSidenav } from '@angular/material/sidenav';
import { skip, Subject, takeUntil } from 'rxjs';
import { SidenavMode } from '../../models/layout.model';
import { PanelStatusInfo, PanelType } from '../../models/panel.model';
import { DataTopic } from '../../models/data-topic.model';
import { RoomStatusData } from '../../models/room.model';
import { ActionService } from '../../services/action/action.service';
import { BroadcastingService } from '../../services/broadcasting/broadcasting.service';
// import { CaptionService } from '../../services/caption/caption.service';
import { ChatService } from '../../services/chat/chat.service';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';
import { LayoutService } from '../../services/layout/layout.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { PanelService } from '../../services/panel/panel.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { RecordingService } from '../../services/recording/recording.service';
import { TranslateService } from '../../services/translate/translate.service';
import { VirtualBackgroundService } from '../../services/virtual-background/virtual-background.service';
import {
	DataPacket_Kind,
	DisconnectReason,
	LocalParticipant,
	Participant,
	RemoteParticipant,
	RemoteTrack,
	RemoteTrackPublication,
	Room,
	RoomEvent,
	Track
} from 'livekit-client';
import { ParticipantLeftEvent, ParticipantLeftReason, ParticipantModel } from '../../models/participant.model';
import { RecordingStatus } from '../../models/recording.model';

/**
 * @internal
 */

@Component({
	selector: 'ov-session',
	templateUrl: './session.component.html',
	styleUrls: ['./session.component.scss'],
	animations: [trigger('sessionAnimation', [transition(':enter', [style({ opacity: 0 }), animate('50ms', style({ opacity: 1 }))])])],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class SessionComponent implements OnInit, OnDestroy {
	@ContentChild('toolbar', { read: TemplateRef }) toolbarTemplate: TemplateRef<any>;
	@ContentChild('panel', { read: TemplateRef }) panelTemplate: TemplateRef<any>;
	@ContentChild('layout', { read: TemplateRef }) layoutTemplate: TemplateRef<any>;
	/**
	 * Provides event notifications that fire when Room is created for the local participant.
	 */
	@Output() onRoomCreated: EventEmitter<Room> = new EventEmitter<Room>();

	/**
	 * Provides event notifications that fire when Room is being reconnected for the local participant.
	 */
	@Output() onRoomReconnecting: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when Room is reconnected for the local participant.
	 */
	@Output() onRoomReconnected: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when participant is disconnected from Room.
	 * @deprecated Use {@link SessionComponent.onParticipantLeft} instead.
	 */
	@Output() onRoomDisconnected: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when local participant is connected to the Room.
	 */
	@Output() onParticipantConnected: EventEmitter<ParticipantModel> = new EventEmitter<ParticipantModel>();

	/**
	 * This event is emitted when the local participant leaves the room.
	 */
	@Output() onParticipantLeft: EventEmitter<ParticipantLeftEvent> = new EventEmitter<ParticipantLeftEvent>();

	room: Room;
	sideMenu: MatSidenav;
	sidenavMode: SidenavMode = SidenavMode.SIDE;
	settingsPanelOpened: boolean;
	drawer: MatDrawerContainer;
	loading: boolean = true;

	private shouldDisconnectRoomWhenComponentIsDestroyed: boolean = true;
	private readonly SIDENAV_WIDTH_LIMIT_MODE = 790;
	private destroy$ = new Subject<void>();
	private updateLayoutInterval: NodeJS.Timeout;
	private log: ILogger;

	constructor(
		private layoutService: LayoutService,
		private actionService: ActionService,
		private openviduService: OpenViduService,
		private participantService: ParticipantService,
		private loggerSrv: LoggerService,
		private chatService: ChatService,
		private libService: OpenViduComponentsConfigService,
		private panelService: PanelService,
		private recordingService: RecordingService,
		private broadcastingService: BroadcastingService,
		private translateService: TranslateService,
		// private captionService: CaptionService,
		private backgroundService: VirtualBackgroundService,
		private cd: ChangeDetectorRef
	) {
		this.log = this.loggerSrv.get('SessionComponent');
	}

	@HostListener('window:beforeunload')
	beforeunloadHandler() {
		this.disconnectRoom(ParticipantLeftReason.BROWSER_UNLOAD);
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
				if (this.libService.showBackgroundEffectsButton()) {
					// Apply background from storage when layout container is in DOM only when background effects button is enabled
					await this.backgroundService.applyBackgroundFromStorage();
				}
			}
		}, 0);
	}

	async ngOnInit() {
		this.shouldDisconnectRoomWhenComponentIsDestroyed = true;
		this.room = this.openviduService.getRoom();

		// this.subscribeToCaptionLanguage();
		this.subcribeToActiveSpeakersChanged();
		this.subscribeToParticipantConnected();
		this.subscribeToTrackSubscribed();
		this.subscribeToTrackUnsubscribed();
		this.subscribeToParticipantDisconnected();
		this.subscribeToParticipantMetadataChanged();

		// this.subscribeToParticipantNameChanged();
		this.subscribeToDataMessage();
		this.subscribeToReconnection();
		this.subscribeToVirtualBackground();

		if (this.libService.isRecordingEnabled()) {
			// this.subscribeToRecordingEvents();
		}

		if (this.libService.isBroadcastingEnabled()) {
			// this.subscribeToBroadcastingEvents();
		}
		try {
			await this.participantService.connect();
			// Send room created after participant connect for avoiding to send incomplete room payload
			this.onRoomCreated.emit(this.room);
			this.cd.markForCheck();
			this.loading = false;
			this.onParticipantConnected.emit(this.participantService.getLocalParticipant());
		} catch (error) {
			this.log.e('There was an error connecting to the room:', error.code, error.message);
			this.actionService.openDialog(this.translateService.translate('ERRORS.SESSION'), error?.error || error?.message || error);
		}
	}
	subcribeToActiveSpeakersChanged() {
		this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
			this.participantService.setSpeaking(speakers);
		});
	}

	async ngOnDestroy() {
		if (this.shouldDisconnectRoomWhenComponentIsDestroyed) {
			await this.disconnectRoom(ParticipantLeftReason.LEAVE);
		}
		if (this.room) this.room.removeAllListeners();
		this.participantService.clear();
		// this.room = undefined;
		this.destroy$.next();
		this.destroy$.complete();
		// 	if (this.captionLanguageSubscription) this.captionLanguageSubscription.unsubscribe();
	}

	async disconnectRoom(reason: ParticipantLeftReason) {
		// Mark session as disconnected for avoiding to do it again in ngOnDestroy
		this.shouldDisconnectRoomWhenComponentIsDestroyed = false;
		await this.openviduService.disconnectRoom(() => {
			this.onParticipantLeft.emit({
				roomName: this.openviduService.getRoomName(),
				participantName: this.participantService.getLocalParticipant()?.identity || '',
				reason
			});
		}, false);
	}

	private subscribeToTogglingMenu() {
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

		this.panelService.panelStatusObs.pipe(skip(1), takeUntil(this.destroy$)).subscribe((ev: PanelStatusInfo) => {
			if (this.sideMenu) {
				this.settingsPanelOpened = ev.isOpened && ev.panelType === PanelType.SETTINGS;

				if (this.sideMenu.opened && ev.isOpened) {
					if (ev.panelType === PanelType.SETTINGS || ev.previousPanelType === PanelType.SETTINGS) {
						// Switch from SETTINGS to another panel and vice versa.
						// As the SETTINGS panel will be bigger than others, the sidenav container must be updated.
						// Setting autosize to 'true' allows update it.
						this.drawer.autosize = true;
						this.startUpdateLayoutInterval();
					}
				}
				ev.isOpened ? this.sideMenu.open() : this.sideMenu.close();
			}
		});
	}

	private subscribeToLayoutWidth() {
		this.layoutService.layoutWidthObs.pipe(takeUntil(this.destroy$)).subscribe((width) => {
			this.sidenavMode = width <= this.SIDENAV_WIDTH_LIMIT_MODE ? SidenavMode.OVER : SidenavMode.SIDE;
		});
	}

	private subscribeToParticipantConnected() {
		this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
			this.participantService.addRemoteParticipant(participant);
		});
	}

	/**
	 * The LocalParticipant has subscribed to a new track because of the RoomConnectionOptions has beed set with autosubscribe = 'true'.
	 * The LocalParticipant will subscribe to all tracks after joining.
	 */
	private subscribeToTrackSubscribed() {
		// this.room.on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
		// 	console.warn("NEW TrackPublished", participant);
		// 	console.warn("NEW TrackPublished", publication);
		// });
		this.room.on(
			RoomEvent.TrackSubscribed,
			(track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
				const isScreenTrack = track.source === Track.Source.ScreenShare;
				this.participantService.addRemoteParticipant(participant);
				if (isScreenTrack) {
					// Set all videos to normal size when a new screen is being shared
					this.participantService.resetMyStreamsToNormalSize();
					this.participantService.resetRemoteStreamsToNormalSize();
					this.participantService.toggleRemoteVideoPinned(track.sid);
					if (track.sid) this.participantService.setScreenTrackPublicationDate(participant.sid, track.sid, new Date().getTime());
				}
				// if (this.openviduService.isSttReady() && this.captionService.areCaptionsEnabled() && isCameraType) {
				// 	// Only subscribe to STT when is ready and stream is CAMERA type and it is a remote stream
				// 	try {
				// 		await this.openviduService.subscribeStreamToStt(event.stream, lang);
				// 	} catch (error) {
				// 		this.log.e('Error subscribing from STT: ', error);
				// 		// I assume the only reason of an STT error is a STT crash.
				// 		// It must be subscribed to all remotes again
				// 		// await this.openviduService.unsubscribeRemotesFromSTT();
				// 		await this.openviduService.subscribeRemotesToSTT(lang);
				// 	}
				// }
			}
		);
	}

	/**
	 * The LocalParticipant has unsubscribed from a track.
	 */
	private subscribeToTrackUnsubscribed() {
		this.room.on(
			RoomEvent.TrackUnsubscribed,
			(track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
				this.log.d('TrackUnSubscribed', track, participant);
				// TODO: Check if this is the last track of the participant before removing it
				const isScreenTrack = track.source === Track.Source.ScreenShare;
				if (isScreenTrack) {
					if (track.sid) this.participantService.setScreenTrackPublicationDate(participant.sid, track.sid, -1);
					this.participantService.resetMyStreamsToNormalSize();
					this.participantService.resetRemoteStreamsToNormalSize();
					// Set last screen track shared to pinned size
					this.participantService.setLastScreenPinned();
				}

				if (track.sid) this.participantService.removeRemoteParticipantTrack(participant, track.sid);
				// 	if (this.openviduService.isSttReady() && this.captionService.areCaptionsEnabled() && isRemoteConnection && isCameraType) {
				// 		try {
				// 			await this.session.unsubscribeFromSpeechToText(event.stream);
				// 		} catch (error) {
				// 			this.log.e('Error unsubscribing from STT: ', error);
				// 		}
				// 	}
			}
		);
	}

	private subscribeToParticipantDisconnected() {
		this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
			this.participantService.removeRemoteParticipant(participant.sid);
		});
	}

	private subscribeToParticipantMetadataChanged() {
		this.room.on(
			RoomEvent.ParticipantMetadataChanged,
			(metadata: string | undefined, participant: RemoteParticipant | LocalParticipant) => {
				console.log('ParticipantMetadataChanged', participant);
			}
		);
	}

	// private subscribeToCaptionLanguage() {
	// 	this.captionLanguageSubscription = this.captionService.captionLangObs.subscribe(async (langOpt) => {
	// 		if (this.captionService.areCaptionsEnabled()) {
	// 			// Unsubscribe all streams from speech to text and re-subscribe with new language
	// 			this.log.d('Re-subscribe from STT because of language changed to ', langOpt.lang);
	// 			await this.openviduService.unsubscribeRemotesFromSTT();
	// 			await this.openviduService.subscribeRemotesToSTT(langOpt.lang);
	// 		}
	// 	});
	// }

	// private subscribeToParticipantNameChanged() {
	// 	this.room.on(RoomEvent.ParticipantNameChanged, (name: string, participant: RemoteParticipant | LocalParticipant) => {
	// 		console.log('ParticipantNameChanged', participant);
	// 	});
	// }

	private subscribeToDataMessage() {
		this.room.on(
			RoomEvent.DataReceived,
			(payload: Uint8Array, participant?: RemoteParticipant, _?: DataPacket_Kind, topic?: string) => {
				const event = JSON.parse(new TextDecoder().decode(payload));
				this.log.d(`Data event received: ${topic}`);
				switch (topic) {
					case DataTopic.CHAT:
						const participantName = participant?.identity || 'Unknown';
						this.chatService.addRemoteMessage(event.message, participantName);
						break;
					case DataTopic.RECORDING_STARTING:
						this.log.d('Recording is starting', event);
						this.recordingService.setRecordingStarting();
						break;
					case DataTopic.RECORDING_STARTED:
						this.log.d('Recording has been started', event);
						this.recordingService.setRecordingStarted(event);
						break;
					case DataTopic.RECORDING_STOPPING:
						this.log.d('Recording is stopping', event);
						this.recordingService.setRecordingStopping();
						break;
					case DataTopic.RECORDING_STOPPED:
						this.log.d('RECORDING_STOPPED', event);
						this.recordingService.setRecordingStopped(event);
						break;

					case DataTopic.RECORDING_DELETED:
						this.log.d('RECORDING_DELETED', event);
						this.recordingService.deleteRecording(event);
						break;

					case DataTopic.RECORDING_FAILED:
						this.log.d('RECORDING_FAILED', event);
						this.recordingService.setRecordingFailed(event.error);
						break;

					case DataTopic.BROADCASTING_STARTING:
						this.broadcastingService.setBroadcastingStarting();
						break;
					case DataTopic.BROADCASTING_STARTED:
						this.log.d('Broadcasting has been started', event);
						this.broadcastingService.setBroadcastingStarted(event);
						break;

					case DataTopic.BROADCASTING_STOPPING:
						this.broadcastingService.setBroadcastingStopping();
						break;
					case DataTopic.BROADCASTING_STOPPED:
						this.broadcastingService.setBroadcastingStopped();
						break;

					case DataTopic.BROADCASTING_FAILED:
						this.broadcastingService.setBroadcastingFailed(event.error);
						break;

					case DataTopic.ROOM_STATUS:
						const { recordingList, isRecordingStarted, isBroadcastingStarted, broadcastingId } = event as RoomStatusData;

						this.recordingService.setRecordingList(recordingList);
						if (isRecordingStarted) {
							const recordingActive = recordingList.find((recording) => recording.status === RecordingStatus.STARTED);
							this.recordingService.setRecordingStarted(recordingActive);
						}
						if (isBroadcastingStarted) {
							this.broadcastingService.setBroadcastingStarted(broadcastingId);
						}

					default:
						break;
				}
			}
		);
	}

	private subscribeToReconnection() {
		this.room.on(RoomEvent.Reconnecting, () => {
			this.log.w('Connection lost: Reconnecting');
			this.actionService.openConnectionDialog(
				this.translateService.translate('ERRORS.CONNECTION'),
				this.translateService.translate('ERRORS.RECONNECT')
			);
			this.onRoomReconnecting.emit();
		});
		this.room.on(RoomEvent.Reconnected, () => {
			this.log.w('Connection lost: Reconnected');
			this.actionService.closeConnectionDialog();
			this.onRoomReconnected.emit();
		});

		this.room.on(RoomEvent.Disconnected, async (reason: DisconnectReason | undefined) => {
			this.shouldDisconnectRoomWhenComponentIsDestroyed = false;
			const participantLeftEvent: ParticipantLeftEvent = {
				roomName: this.openviduService.getRoomName(),
				participantName: this.participantService.getLocalParticipant()?.identity || '',
				reason: ParticipantLeftReason.NETWORK_DISCONNECT
			};
			const messageErrorKey = 'ERRORS.DISCONNECT';
			let descriptionErrorKey = '';
			switch (reason) {
				case DisconnectReason.CLIENT_INITIATED:
					// Skip disconnect reason if a default disconnect method has been called
					if (!this.openviduService.shouldHandleClientInitiatedDisconnectEvent) return;
					participantLeftEvent.reason = ParticipantLeftReason.LEAVE;
					break;
				case DisconnectReason.DUPLICATE_IDENTITY:
					participantLeftEvent.reason = ParticipantLeftReason.DUPLICATE_IDENTITY;
					descriptionErrorKey = 'ERRORS.DUPLICATE_IDENTITY';
					break;
				case DisconnectReason.SERVER_SHUTDOWN:
					descriptionErrorKey = 'ERRORS.SERVER_SHUTDOWN';
					participantLeftEvent.reason = ParticipantLeftReason.SERVER_SHUTDOWN;
					break;
				case DisconnectReason.PARTICIPANT_REMOVED:
					participantLeftEvent.reason = ParticipantLeftReason.PARTICIPANT_REMOVED;
					descriptionErrorKey = 'ERRORS.PARTICIPANT_REMOVED';
					break;
				case DisconnectReason.ROOM_DELETED:
					participantLeftEvent.reason = ParticipantLeftReason.ROOM_DELETED;
					descriptionErrorKey = 'ERRORS.ROOM_DELETED';
					break;
				case DisconnectReason.SIGNAL_CLOSE:
					participantLeftEvent.reason = ParticipantLeftReason.SIGNAL_CLOSE;
					descriptionErrorKey = 'ERRORS.SIGNAL_CLOSE';
					break;
				default:
					participantLeftEvent.reason = ParticipantLeftReason.OTHER;
					descriptionErrorKey = 'ERRORS.DISCONNECT';
					break;
			}

			this.log.d('Participant disconnected', participantLeftEvent);
			this.onParticipantLeft.emit(participantLeftEvent);
			this.onRoomDisconnected.emit();
			if (this.libService.getShowDisconnectionDialog() && descriptionErrorKey) {
				this.actionService.openDialog(
					this.translateService.translate(messageErrorKey),
					this.translateService.translate(descriptionErrorKey)
				);
			}
		});
	}

	private subscribeToVirtualBackground() {
		this.libService.backgroundEffectsButton$.subscribe(async (enable) => {
			if (!enable && this.backgroundService.isBackgroundApplied()) {
				await this.backgroundService.removeBackground();
				if (this.panelService.isBackgroundEffectsPanelOpened()) {
					this.panelService.closePanel();
				}
			}
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
