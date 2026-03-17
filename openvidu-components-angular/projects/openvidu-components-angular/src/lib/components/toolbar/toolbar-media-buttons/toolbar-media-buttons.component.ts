import { Component, ContentChild, EventEmitter, Output, TemplateRef, computed, inject, input } from '@angular/core';
import { RecordingStatus } from '../../../models/recording.model';
import { BroadcastingStatus } from '../../../models/broadcasting.model';
import { ToolbarAdditionalButtonsPosition } from '../../../models/toolbar.model';
import { ViewportService } from '../../../services/viewport/viewport.service';
import { ToolbarMoreOptionsAdditionalMenuItemsDirective } from '../../../directives/template/internals.directive';

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
	showCameraButton = input<boolean>(true);
	isCameraEnabled = input<boolean>(true);
	cameraMuteChanging = input<boolean>(false);

	// Microphone related inputs
	showMicrophoneButton = input<boolean>(true);
	isMicrophoneEnabled = input<boolean>(true);
	microphoneMuteChanging = input<boolean>(false);

	// Screenshare related inputs
	showScreenshareButton = input<boolean>(true);
	isScreenShareEnabled = input<boolean>(false);
	isFirefoxBrowser = input<boolean>(false);

	// Device availability inputs
	hasVideoDevices = input<boolean>(true);
	hasAudioDevices = input<boolean>(true);

	// Connection state inputs
	isConnectionLost = input<boolean>(false);

	// UI state inputs
	isMinimal = input<boolean>(false);

	// More options menu inputs
	showMoreOptionsButton = input<boolean>(true);
	showFullscreenButton = input<boolean>(true);
	showRecordingButton = input<boolean>(true);
	showViewRecordingsButton = input<boolean>(false);
	showBroadcastingButton = input<boolean>(true);
	showBackgroundEffectsButton = input<boolean>(true);
	showCaptionsButton = input<boolean>(true);
	showSettingsButton = input<boolean>(true);

	// Fullscreen state
	isFullscreenActive = input<boolean>(false);

	// Recording related inputs
	recordingStatus = input<RecordingStatus>(RecordingStatus.STOPPED);
	hasRoomTracksPublished = input<boolean>(false);

	// Broadcasting related inputs
	broadcastingStatus = input<BroadcastingStatus>(BroadcastingStatus.STOPPED);

	// Captions
	captionsEnabled = input<boolean>(false);

	// Leave button
	showLeaveButton = input<boolean>(true);

	// Additional buttons template
	toolbarAdditionalButtonsTemplate = input<TemplateRef<any> | null>(null);
	additionalButtonsPosition = input<ToolbarAdditionalButtonsPosition | undefined>(undefined);

	// Leave button template
	toolbarLeaveButtonTemplate = input<TemplateRef<any> | null>(null);

	/**
	 * @internal
	 * ContentChild for custom menu items in more options menu
	 */
	@ContentChild(ToolbarMoreOptionsAdditionalMenuItemsDirective)
	externalMoreOptionsAdditionalMenuItems!: ToolbarMoreOptionsAdditionalMenuItemsDirective;

	/**
	 * @internal
	 * Gets the template for additional menu items in more options
	 */
	get moreOptionsAdditionalMenuItemsTemplate(): TemplateRef<any> | undefined {
		return this.externalMoreOptionsAdditionalMenuItems?.template;
	}

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
	readonly showCameraButtonDirect = computed(() => this.showCameraButton() && !this.isMinimal());

	readonly showMicrophoneButtonDirect = computed(() => this.showMicrophoneButton() && !this.isMinimal());

	// Screenshare button - visible on tablet+ or when already active
	readonly showScreenshareButtonDirect = computed(
		() => this.showScreenshareButton() && !this.isMinimal() && (!this.isMobileView() || this.isScreenShareEnabled())
	);

	// More options button - always visible when not minimal
	readonly showMoreOptionsButtonDirect = computed(() => this.showMoreOptionsButton() && !this.isMinimal());

	// Check if there are active features that should show a badge on More Options
	readonly hasActiveFeatures = computed(
		() =>
			this.isScreenShareEnabled() ||
			this.recordingStatus() === this._recordingStatus.STARTED ||
			this.broadcastingStatus() === this._broadcastingStatus.STARTED
	);

	// Check if additional buttons should be shown outside (desktop/tablet) or inside More Options (mobile)
	readonly showAdditionalButtonsOutside = computed(() => {
		return !this.isMobileView() && this.toolbarAdditionalButtonsTemplate();
	});

	// Check if additional buttons should be shown inside More Options menu (mobile only)
	readonly showAdditionalButtonsInsideMenu = computed(() => {
		return this.isMobileView() && this.toolbarAdditionalButtonsTemplate();
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
