import { animate, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Track } from 'livekit-client';

/**
 * @internal
 */
@Component({
	selector: 'ov-media-element',
	template: `
		<ov-avatar-profile @posterAnimation *ngIf="showAvatar" [name]="avatarName" [color]="avatarColor"></ov-avatar-profile>
		<video #videoElement *ngIf="_track?.kind === 'video'" class="OV_video-element" [attr.id]="_track?.sid"></video>
		<audio #audioElement *ngIf="_track?.kind === 'audio'" [attr.id]="_track?.sid"></audio>
	`,
	styleUrls: ['./media-element.component.scss'],
	animations: [
		trigger('posterAnimation', [
			transition(':enter', [style({ opacity: 0 }), animate('100ms', style({ opacity: 1 }))]),
			transition(':leave', [style({ opacity: 1 }), animate('200ms', style({ opacity: 0 }))])
		])
	],
	standalone: false
})
export class MediaElementComponent implements AfterViewInit, OnDestroy {
	_track: Track;
	_videoElement: ElementRef;
	_audioElement: ElementRef;
	type: Track.Source = Track.Source.Camera;
	private _muted: boolean = false;
	private previousTrack: Track | null = null;

	@Input() showAvatar: boolean;
	@Input() avatarColor: string;
	@Input() avatarName: string;
	@Input() isLocal: boolean;

	@ViewChild('videoElement', { static: false })
	set videoElement(element: ElementRef) {
		this._videoElement = element;
		this.attachTracks();
	}

	@ViewChild('audioElement', { static: false })
	set audioElement(element: ElementRef) {
		this._audioElement = element;
		this.attachTracks();
	}

	@Input()
	set track(track: Track) {
		if (!track) return;

		// Detach previous track if it's different
		if (this.previousTrack && this.previousTrack !== track) {
			this.detachPreviousTrack();
		}

		this._track = track;
		this.previousTrack = track;
		this.attachTracks();
	}

	@Input()
	set muted(muted: boolean) {
		this._muted = muted;
		if (this._audioElement && !this.isLocal) {
			this.muteAudioTrack(this._muted);
		}
	}

	ngAfterViewInit() {
		setTimeout(() => {
			if (!this._track) return;
			this.attachTracks();
		});
	}

	ngOnDestroy() {
		this.detachPreviousTrack();
	}

	private detachPreviousTrack() {
		if (this.previousTrack) {
			// Detach from video element
			if (this.isVideoTrack() && this._videoElement?.nativeElement) {
				this.previousTrack.detach(this._videoElement.nativeElement);
			}
			// Detach from audio element
			if (this.isAudioTrack() && this._audioElement?.nativeElement) {
				this.previousTrack.detach(this._audioElement.nativeElement);
			}
		}
	}

	private updateVideoStyles() {
		this.type = this._track.source;
		if (this.type === Track.Source.ScreenShare) {
			this._videoElement.nativeElement.style.objectFit = 'contain';
			this._videoElement.nativeElement.classList.add('screen-type');
		} else if (this.type === Track.Source.Camera) {
			if (this.isLocal) {
				this._videoElement.nativeElement.style.transform = 'scaleX(-1)';
			}
			this._videoElement.nativeElement.style.objectFit = 'cover';
			this._videoElement.nativeElement.classList.add('camera-type');
		}
	}

	private attachTracks() {
		if (this.isAudioTrack() && !!this._audioElement && !this.isLocal) {
			this.attachAudioTrack();
		} else if (this.isVideoTrack() && !!this._videoElement) {
			this.updateVideoStyles();
			this.attachVideoTrack();
		}
	}

	private attachVideoTrack() {
		this._track.attach(this._videoElement.nativeElement);
	}

	private attachAudioTrack() {
		this._track.attach(this._audioElement.nativeElement);
		this.muteAudioTrack(this._muted);
	}
	private muteAudioTrack(mute: boolean) {
		this._audioElement.nativeElement.muted = mute;
		this._track.mediaStreamTrack.enabled = !mute;
	}

	private isAudioTrack(): boolean {
		return this._track?.kind === Track.Kind.Audio;
	}

	private isVideoTrack(): boolean {
		return this._track?.kind === Track.Kind.Video;
	}
}
