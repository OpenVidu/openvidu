import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatMenuPanel, MatMenuTrigger } from '@angular/material/menu';
import { Subject, takeUntil } from 'rxjs';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';
import { LayoutService } from '../../services/layout/layout.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { Track } from 'livekit-client';
import { ParticipantTrackPublication } from '../../models/participant.model';

/**
 * The **StreamComponent** is hosted inside of the {@link LayoutComponent}.
 * It is in charge of displaying the participant video stream in the videoconference layout.
 */
@Component({
	selector: 'ov-stream',
	templateUrl: './stream.component.html',
	styleUrls: ['./stream.component.scss'],
	standalone: false
})
export class StreamComponent implements OnInit, OnDestroy {
	/**
	 * @ignore
	 */
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;

	/**
	 * @ignore
	 */
	@ViewChild('menu') menu: MatMenuPanel;

	/**
	 * @ignore
	 */
	videoTypeEnum = Track.Source;

	/**
	 * @ignore
	 */
	_track: ParticipantTrackPublication | undefined;

	/**
	 * @ignore
	 */
	isMinimal: boolean = false;
	/**
	 * @ignore
	 */
	showParticipantName: boolean = true;
	/**
	 * @ignore
	 */
	showAudioDetection: boolean = true;
	/**
	 * @ignore
	 */
	showVideoControls: boolean = true;
	/**
	 * @ignore
	 */
	showVideo: boolean;

	/**
	 * @ignore
	 */
	mouseHovering: boolean = false;

	/**
	 * @ignore
	 */
	hoveringTimeout: ReturnType<typeof setTimeout>;

	/**
	 * @ignore
	 */
	@ViewChild('streamContainer', { static: false, read: ElementRef })
	set streamContainer(streamContainer: ElementRef) {
		setTimeout(() => {
			if (streamContainer) {
				this._streamContainer = streamContainer;
				// This is a workaround for fixing a layout bug which provide a bad UX with each new elements created.
				setTimeout(() => {
					this.showVideo = true;
				}, 100);
			}
		}, 0);
	}

	@Input()
	set track(track: ParticipantTrackPublication) {
		this._track = track;
	}

	private _streamContainer: ElementRef;
	private destroy$ = new Subject<void>();
	private readonly HOVER_TIMEOUT = 3000;

	/**
	 * @ignore
	 */
	constructor(
		private layoutService: LayoutService,
		private participantService: ParticipantService,
		private cdkSrv: CdkOverlayService,
		private libService: OpenViduComponentsConfigService
	) {}

	ngOnInit() {
		this.subscribeToStreamDirectives();
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
		this.cdkSrv.setSelector('body');
	}

	/**
	 * @ignore
	 */
	toggleVideoPinned() {
		const sid = this._track?.trackSid;
		if (this._track?.participant) {
			if (this._track?.participant.isLocal) {
				if (this._track?.participant.isMinimized) {
					this.participantService.toggleMyVideoMinimized(sid);
				}
				this.participantService.toggleMyVideoPinned(sid);
			} else {
				this.participantService.toggleRemoteVideoPinned(sid);
			}
		}
		this.layoutService.update();
	}

	/**
	 * @ignore
	 */
	toggleMinimize() {
		const sid = this._track?.trackSid;
		if (this._track?.participant && this._track?.participant.isLocal) {
			this.participantService.toggleMyVideoMinimized(sid);
			this.layoutService.update();
		}
	}

	/**
	 * @ignore
	 */
	toggleVideoMenu(event) {
		if (this.menuTrigger.menuOpen) {
			this.menuTrigger.closeMenu();
			return;
		}
		this.cdkSrv.setSelector('#container-' + this._track?.trackSid);
		this.menuTrigger.openMenu();
	}

	/**
	 * @ignore
	 */
	toggleMuteForcibly() {
		if (this._track?.participant) {
			this.participantService.setRemoteMutedForcibly(this._track?.participant.sid, !this._track?.isMutedForcibly);
		}
	}

	/**
	 * @ignore
	 */
	mouseHover(event: MouseEvent) {
		event.preventDefault();
		clearTimeout(this.hoveringTimeout);
		this.mouseHovering = true;
		this.hoveringTimeout = setTimeout(() => {
			this.mouseHovering = false;
		}, this.HOVER_TIMEOUT);
	}

	private subscribeToStreamDirectives() {
		this.libService.minimal$
			.pipe(takeUntil(this.destroy$))
			.subscribe((value: boolean) => {
				this.isMinimal = value;
			});

		this.libService.displayParticipantName$
			.pipe(takeUntil(this.destroy$))
			.subscribe((value: boolean) => {
				this.showParticipantName = value;
				// this.cd.markForCheck();
			});

		this.libService.displayAudioDetection$
			.pipe(takeUntil(this.destroy$))
			.subscribe((value: boolean) => {
				this.showAudioDetection = value;
				// this.cd.markForCheck();
			});

		this.libService.streamVideoControls$
			.pipe(takeUntil(this.destroy$))
			.subscribe((value: boolean) => {
				this.showVideoControls = value;
				// this.cd.markForCheck();
			});
	}
}
