import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	HostListener,
	Input,
	OnDestroy,
	OnInit,
	Output
} from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { filter, Subject, take, takeUntil, tap } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { TranslateService } from '../../services/translate/translate.service';
import { LocalTrack } from 'livekit-client';
import { CustomDevice } from '../../models/device.model';
import { LangOption } from '../../models/lang.model';

/**
 * @internal
 */
@Component({
	selector: 'ov-pre-join',
	templateUrl: './pre-join.component.html',
	styleUrls: ['./pre-join.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
	animations: [
		trigger('containerResize', [
			state(
				'normal',
				style({
					height: '*'
				})
			),
			state(
				'compact',
				style({
					height: '28vh'
				})
			),
			transition('normal => compact', [animate('250ms cubic-bezier(0.25, 0.8, 0.25, 1)')]),
			transition('compact => normal', [animate('350ms cubic-bezier(0.25, 0.8, 0.25, 1)')])
		]),
		trigger('slideInOut', [
			transition(':enter', [
				style({
					opacity: 0
				}),
				animate(
					'300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
					style({
						opacity: 1
					})
				)
			]),
			transition(':leave', [
				animate(
					'200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
					style({
						opacity: 0,
						transform: 'translateY(-10px)'
					})
				)
			])
		])
	]
})
export class PreJoinComponent implements OnInit, OnDestroy {
	@Input() set error(error: { name: string; message: string } | undefined) {
		if (error) this._error = error.message ?? error.name;
	}
	@Output() onVideoDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onAudioDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onVideoEnabledChanged = new EventEmitter<boolean>();
	@Output() onAudioEnabledChanged = new EventEmitter<boolean>();
	@Output() onLangChanged = new EventEmitter<LangOption>();
	@Output() onReadyToJoin = new EventEmitter<any>();

	_error: string | undefined;
	windowSize: number;
	isLoading = true;
	participantName: string | undefined = '';

	/**
	 * @ignore
	 */
	isMinimal: boolean = false;
	showCameraButton: boolean = true;
	showMicrophoneButton: boolean = true;
	showLogo: boolean = true;
	showParticipantName: boolean = true;

	// Future feature preparation
	backgroundEffectEnabled: boolean = true; // Enable virtual backgrounds by default
	showBackgroundPanel: boolean = false;

	videoTrack: LocalTrack | undefined;
	audioTrack: LocalTrack | undefined;
	isVideoEnabled: boolean = false;
	hasVideoDevices: boolean = true;
	private tracks: LocalTrack[];
	private log: ILogger;
	private destroy$ = new Subject<void>();
	private shouldRemoveTracksWhenComponentIsDestroyed: boolean = true;

	@HostListener('window:resize')
	sizeChange() {
		this.windowSize = window.innerWidth;
	}

	constructor(
		private loggerSrv: LoggerService,
		private libService: OpenViduComponentsConfigService,
		private cdkSrv: CdkOverlayService,
		private openviduService: OpenViduService,
		private translateService: TranslateService,
		private changeDetector: ChangeDetectorRef
	) {
		this.log = this.loggerSrv.get('PreJoinComponent');
	}

	async ngOnInit() {
		this.subscribeToPrejoinDirectives();
		await this.initializeDevices();
		this.windowSize = window.innerWidth;
		this.isLoading = false;
		this.changeDetector.markForCheck();
	}

	// ngAfterContentChecked(): void {
	// 	// this.changeDetector.detectChanges();
	// 	this.isLoading = false;
	// }

	async ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
		this.cdkSrv.setSelector('body');

		if (this.shouldRemoveTracksWhenComponentIsDestroyed) {
			this.tracks?.forEach((track) => {
				track.stop();
			});
		}
	}

	private async initializeDevices() {
		await this.initializeDevicesWithRetry();
	}

	onDeviceSelectorClicked() {
		// Some devices as iPhone do not show the menu panels correctly
		// Updating the container where the panel is added fix the problem.
		this.cdkSrv.setSelector('#prejoin-container');
	}

	join() {
		if (this.showParticipantName && !this.participantName?.trim()) {
			this._error = this.translateService.translate('PREJOIN.NICKNAME_REQUIRED');
			return;
		}

		// Clear any previous errors
		this._error = undefined;

		// Mark tracks as permanent for avoiding to be removed in ngOnDestroy
		this.shouldRemoveTracksWhenComponentIsDestroyed = false;

		// Assign participant name to the observable if it is defined
		if (this.participantName?.trim()) {
			this.libService.updateGeneralConfig({ participantName: this.participantName.trim() });

			this.libService.participantName$
				.pipe(
					filter((name) => name === this.participantName?.trim()),
					take(1)
				)
				.subscribe(() => this.onReadyToJoin.emit());
		} else {
			// No participant name to set, emit immediately
			this.onReadyToJoin.emit();
		}
	}

	onParticipantNameChanged(name: string) {
		this.participantName = name?.trim() || '';
		// Clear error when user starts typing
		if (this._error && this.participantName) {
			this._error = undefined;
		}
	}

	onEnterPressed() {
		this.join();
	}

	private subscribeToPrejoinDirectives() {
		this.libService.minimal$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.isMinimal = value;
			this.changeDetector.markForCheck();
		});

		this.libService.cameraButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showCameraButton = value;
			this.changeDetector.markForCheck();
		});

		this.libService.microphoneButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showMicrophoneButton = value;
			this.changeDetector.markForCheck();
		});

		this.libService.displayLogo$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showLogo = value;
			this.changeDetector.markForCheck();
		});

		this.libService.participantName$.pipe(takeUntil(this.destroy$)).subscribe((value: string) => {
			if (value) {
				this.participantName = value;
				this.changeDetector.markForCheck();
			}
		});

		this.libService.prejoinDisplayParticipantName$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showParticipantName = value;
			this.changeDetector.markForCheck();
		});
	}

	async videoEnabledChanged(enabled: boolean) {
		this.isVideoEnabled = enabled;
		if (!enabled) {
			this.closeBackgroundPanel();
		} else if (!this.videoTrack) {
			const newVideoTrack = await this.openviduService.createLocalTracks(true, false);
			this.videoTrack = newVideoTrack[0];
			this.tracks.push(this.videoTrack);
			this.openviduService.setLocalTracks(this.tracks);
		}

		this.onVideoEnabledChanged.emit(enabled);
	}

	onVideoDevicesLoaded(devices: CustomDevice[]) {
		this.hasVideoDevices = devices.length > 0;
	}

	async audioEnabledChanged(enabled: boolean) {
		if (enabled && !this.audioTrack) {
			const newAudioTrack = await this.openviduService.createLocalTracks(false, true);
			this.audioTrack = newAudioTrack[0];
			this.tracks.push(this.audioTrack);
			this.openviduService.setLocalTracks(this.tracks);
		}
		this.onAudioEnabledChanged.emit(enabled);
	}

	/**
	 * Toggle virtual background panel visibility with smooth animation
	 */
	toggleBackgroundPanel() {
		// Add a small delay to ensure smooth transition
		if (!this.showBackgroundPanel) {
			// Opening panel
			this.showBackgroundPanel = true;
			this.changeDetector.markForCheck();
		} else {
			// Closing panel - add slight delay for smooth animation
			setTimeout(() => {
				this.showBackgroundPanel = false;
				this.changeDetector.markForCheck();
			}, 50);
		}
	}

	/**
	 * Close virtual background panel with smooth animation
	 */
	closeBackgroundPanel() {
		// Add animation delay for smooth closing
		setTimeout(() => {
			this.showBackgroundPanel = false;
			this.changeDetector.markForCheck();
		}, 100);
	}

	/**
	 * Enhanced error handling with better UX
	 */
	private handleError(error: any) {
		this.log.e('PreJoin component error:', error);
		this._error = error.message || 'An unexpected error occurred';
		this.changeDetector.markForCheck();
	}

	/**
	 * Improved device initialization with error handling
	 */
	private async initializeDevicesWithRetry(maxRetries: number = 3): Promise<void> {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				this.tracks = await this.openviduService.createLocalTracks();
				this.openviduService.setLocalTracks(this.tracks);
				this.videoTrack = this.tracks.find((track) => track.kind === 'video');
				this.audioTrack = this.tracks.find((track) => track.kind === 'audio');
				this.isVideoEnabled = this.openviduService.isVideoTrackEnabled();

				return; // Success, exit retry loop
			} catch (error) {
				this.log.w(`Device initialization attempt ${attempt} failed:`, error);

				if (attempt === maxRetries) {
					this.handleError(error);
				} else {
					// Wait before retrying
					await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
				}
			}
		}
	}
}
