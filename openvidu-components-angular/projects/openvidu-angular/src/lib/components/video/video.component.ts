import { AfterViewInit, Component, ElementRef, Input, EventEmitter, Output, ViewChild } from '@angular/core';
import { StreamManager } from 'openvidu-browser';
import { VideoType } from '../../models/video-type.model';

@Component({
	selector: 'ov-video',
	template: `
		<img *ngIf="!_streamManager?.stream?.videoActive && _streamManager?.stream?.typeOfVideo === 'CAMERA'" class="poster_img" alt="OpenVidu Logo" src="assets/images/poster.png" />
		<video
			#videoElement
			[attr.id]="streamManager && _streamManager.stream ? 'video-' + _streamManager.stream.streamId : 'video-undefined'"
			[muted]="mutedSound"
		></video>
	`,
	styleUrls: ['./video.component.css']
})
export class VideoComponent implements AfterViewInit {
	@Input() mutedSound: boolean;

	@Output() toggleVideoSizeEvent = new EventEmitter<any>();

	_streamManager: StreamManager;

	_videoElement: ElementRef;

	ngAfterViewInit() {
		setTimeout(() => {
			if (this._streamManager && this._videoElement) {
				this._streamManager.addVideoElement(this._videoElement.nativeElement);
			}
		});
	}

	@ViewChild('videoElement')
	set videoElement(element: ElementRef) {
		this._videoElement = element;
	}

	@Input()
	set streamManager(streamManager: StreamManager) {
		setTimeout(() => {
			this._streamManager = streamManager;
			if (!!this._videoElement && this._streamManager) {
				if (this._streamManager.stream.typeOfVideo === VideoType.SCREEN) {
					this._videoElement.nativeElement.style.objectFit = 'contain';
					this._videoElement.nativeElement.style.background = '#272727';
					this.enableVideoSizeBig();
				} else {
					this._videoElement.nativeElement.style.objectFit = 'cover';
				}
				this._streamManager.addVideoElement(this._videoElement.nativeElement);
			}
		});
	}

	enableVideoSizeBig() {
		// Doing video size bigger.
		// Timeout because of connectionId is null and icon does not change
		setTimeout(() => {
			this.toggleVideoSizeEvent.emit(true);
		}, 590);
	}
}
