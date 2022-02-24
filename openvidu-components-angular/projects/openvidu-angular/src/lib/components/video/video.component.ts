import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { StreamManager } from 'openvidu-browser';
import { VideoType } from '../../models/video-type.model';

@Component({
	selector: 'ov-video',
	template: `
		<img
			*ngIf="!_streamManager?.stream?.videoActive && (type === 'CAMERA' || !type)"
			class="poster_img"
			alt="OpenVidu Logo"
			src="assets/images/poster.png"
		/>
		<video
			class="OT_video-element"
			#videoElement
			[attr.id]="streamManager && _streamManager.stream ? 'video-' + _streamManager.stream.streamId : 'video-undefined'"
			[muted]="mutedSound"
		></video>
	`,
	styleUrls: ['./video.component.css']
})
export class VideoComponent implements AfterViewInit {
	@Input() mutedSound: boolean;

	_streamManager: StreamManager;

	_videoElement: ElementRef;
	type: VideoType = VideoType.CAMERA;

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
		if(streamManager) {
			this._streamManager = streamManager;
			if (!!this._videoElement && this._streamManager) {
				this.type = <VideoType>this._streamManager?.stream?.typeOfVideo;
				if (this.type === VideoType.SCREEN) {
					this._videoElement.nativeElement.style.objectFit = 'contain';
					// this._videoElement.nativeElement.style.background = '#272727';
				} else {
					this._videoElement.nativeElement.style.objectFit = 'cover';
				}
				this._streamManager.addVideoElement(this._videoElement.nativeElement);
			}
		}
	}
}
