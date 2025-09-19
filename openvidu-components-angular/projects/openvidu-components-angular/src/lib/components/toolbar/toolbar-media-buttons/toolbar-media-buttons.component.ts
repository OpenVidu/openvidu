import { Component, EventEmitter, Input, Output, TemplateRef, computed, inject } from '@angular/core';
import { RecordingStatus } from '../../../models/recording.model';
import { BroadcastingStatus } from '../../../models/broadcasting.model';
import { ToolbarAdditionalButtonsPosition } from '../../../models/toolbar.model';
import { ViewportService } from '../../../services/viewport/viewport.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-toolbar-media-buttons',
	templateUrl: './toolbar-media-buttons.component.html',
	styleUrl: './toolbar-media-buttons.component.scss',
	standalone: false
})
export class ToolbarMediaButtonsComponent {
	// Camera related inputs
	@Input() showCameraButton: boolean = true;
	@Input() isCameraEnabled: boolean = true;
	@Input() cameraMuteChanging: boolean = false;

	// Microphone related inputs
	@Input() showMicrophoneButton: boolean = true;
	@Input() isMicrophoneEnabled: boolean = true;
	@Input() microphoneMuteChanging: boolean = false;

	// Screenshare related inputs
	@Input() showScreenshareButton: boolean = true;
	@Input() isScreenShareEnabled: boolean = false;

	// Device availability inputs
	@Input() hasVideoDevices: boolean = true;
	@Input() hasAudioDevices: boolean = true;

	// Connection state inputs
	@Input() isConnectionLost: boolean = false;

	// UI state inputs
	@Input() isMinimal: boolean = false;

	// More options menu inputs
	@Input() showMoreOptionsButton: boolean = true;
	@Input() showFullscreenButton: boolean = true;
	@Input() showRecordingButton: boolean = true;
	@Input() showViewRecordingsButton: boolean = false;
	@Input() showBroadcastingButton: boolean = true;
	@Input() showBackgroundEffectsButton: boolean = true;
	@Input() showCaptionsButton: boolean = true;
	@Input() showSettingsButton: boolean = true;

	// Fullscreen state
	@Input() isFullscreenActive: boolean = false;

	// Recording related inputs
	@Input() recordingStatus: RecordingStatus = RecordingStatus.STOPPED;
	@Input() hasRoomTracksPublished: boolean = false;

	// Broadcasting related inputs
	@Input() broadcastingStatus: BroadcastingStatus = BroadcastingStatus.STOPPED;

	// Captions
	@Input() captionsEnabled: boolean = false;

	// Leave button
	@Input() showLeaveButton: boolean = true;

	// Additional buttons template
	@Input() toolbarAdditionalButtonsTemplate: TemplateRef<any> | null = null;
	@Input() additionalButtonsPosition: ToolbarAdditionalButtonsPosition | undefined;

	// Leave button template
	@Input() toolbarLeaveButtonTemplate: TemplateRef<any> | null = null;

	// Status enums for template usage
	_recordingStatus = RecordingStatus;
	_broadcastingStatus = BroadcastingStatus;

	// Viewport service for responsive behavior
	private viewportService = inject(ViewportService);

	// Computed properties for responsive button grouping
	readonly isMobileView = computed(() => this.viewportService.isMobile());
	readonly isTabletView = computed(() => this.viewportService.isTablet());
	readonly isDesktopView = computed(() => this.viewportService.isDesktop());

	// Essential buttons that always stay visible
	readonly showCameraButtonDirect = computed(() => this.showCameraButton && !this.isMinimal);

	readonly showMicrophoneButtonDirect = computed(() => this.showMicrophoneButton && !this.isMinimal);

	// Screenshare button - visible on tablet+ or when already active
	readonly showScreenshareButtonDirect = computed(
		() => this.showScreenshareButton && !this.isMinimal && (!this.isMobileView() || this.isScreenShareEnabled)
	);

	// More options button - always visible when not minimal
	readonly showMoreOptionsButtonDirect = computed(() => this.showMoreOptionsButton && !this.isMinimal);

	// Leave button
	readonly showLeaveButtonDirect = computed(() => this.showLeaveButton);

	// Check if there are active features that should show a badge on More Options
	readonly hasActiveFeatures = computed(
		() =>
			this.isScreenShareEnabled ||
			this.recordingStatus === this._recordingStatus.STARTED ||
			this.broadcastingStatus === this._broadcastingStatus.STARTED
	);

	// Check if additional buttons should be shown outside (desktop/tablet) or inside More Options (mobile)
	readonly showAdditionalButtonsOutside = computed(() => {
		return !this.isMobileView() && this.toolbarAdditionalButtonsTemplate;
	});

	// Check if additional buttons should be shown inside More Options menu (mobile only)
	readonly showAdditionalButtonsInsideMenu = computed(() => {
		return this.isMobileView() && this.toolbarAdditionalButtonsTemplate;
	});

	// Media button outputs
	@Output() cameraToggled = new EventEmitter<void>();
	@Output() microphoneToggled = new EventEmitter<void>();
	@Output() screenShareToggled = new EventEmitter<void>();
	@Output() screenTrackReplaced = new EventEmitter<void>();

	// More options menu outputs
	@Output() fullscreenToggled = new EventEmitter<void>();
	@Output() recordingToggled = new EventEmitter<void>();
	@Output() viewRecordingsClicked = new EventEmitter<void>();
	@Output() broadcastingToggled = new EventEmitter<void>();
	@Output() backgroundEffectsToggled = new EventEmitter<void>();
	@Output() captionsToggled = new EventEmitter<void>();
	@Output() settingsToggled = new EventEmitter<void>();

	// Leave button output
	@Output() leaveClicked = new EventEmitter<void>();

	// Event handler methods
	onCameraToggle(): void {
		this.cameraToggled.emit();
	}

	onMicrophoneToggle(): void {
		this.microphoneToggled.emit();
	}

	onScreenShareToggle(): void {
		this.screenShareToggled.emit();
	}

	onScreenTrackReplace(): void {
		this.screenTrackReplaced.emit();
	}

	onFullscreenToggle(): void {
		this.fullscreenToggled.emit();
	}

	onRecordingToggle(): void {
		this.recordingToggled.emit();
	}

	onViewRecordingsClick(): void {
		this.viewRecordingsClicked.emit();
	}

	onBroadcastingToggle(): void {
		this.broadcastingToggled.emit();
	}

	onBackgroundEffectsToggle(): void {
		this.backgroundEffectsToggled.emit();
	}

	onCaptionsToggle(): void {
		this.captionsToggled.emit();
	}

	onSettingsToggle(): void {
		this.settingsToggled.emit();
	}

	onLeaveClick(): void {
		this.leaveClicked.emit();
	}
}
