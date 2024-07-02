import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { LocalTrack, VideoTrack, VideoCaptureOptions, ScreenShareCaptureOptions } from 'livekit-client';
import { TrackComponent } from '../track/track.component';
// import { BackgroundBlur } from '@livekit/track-processors';

@Component({
    selector: 'app-video-track',
    templateUrl: './video-track.component.html',
    styleUrls: ['./video-track.component.css']
})
export class VideoTrackComponent extends TrackComponent {

    @ViewChild('videoElement') elementRef: ElementRef;
    elementRefId: string = '';

    muteVideoIcon: string = 'videocam';
    blurIcon: string = 'blur_on';

    private _videoTrack: VideoTrack | undefined;

    private videoCaptureOptions: VideoCaptureOptions;
    private screenShareCaptureOptions: ScreenShareCaptureOptions;

    @Input() set videoTrack(videoTrack: VideoTrack | undefined) {
        this._videoTrack = videoTrack;
        this.track = this._videoTrack;

        this.setupTrackEventListeners();

        let id = '';
        id = `${this.getTrackOrigin()}--video--${this._videoTrack?.source}--${this._videoTrack?.sid}`;
        if (this._videoTrack?.sid !== this._videoTrack?.mediaStreamID) {
            id += `--${this._videoTrack?.mediaStreamID}`;
        }
        id = id.replace(/[^0-9a-z-A-Z_-]+/g, '');
        this.elementRefId = id;

        if (this.elementRef) {
            this._videoTrack?.attach(this.elementRef.nativeElement);
        }
    }

    ngAfterViewInit() {
        this._videoTrack?.attach(this.elementRef.nativeElement);
    }

    ngOnDestroy() {
        this._videoTrack?.detach(this.elementRef.nativeElement);
    }

    async muteUnmuteVideo() {
        if (this._videoTrack?.isMuted) {
            this.muteVideoIcon = 'videocam';
            await (this._videoTrack as LocalTrack).unmute();
        } else {
            this.muteVideoIcon = 'videocam_off';
            await (this._videoTrack as LocalTrack).mute();
        }
    }

    async blur() {
        if (this.blurIcon == 'blur_on') {
            // await (this._videoTrack! as LocalVideoTrack).setProcessor(BackgroundBlur());
            this.blurIcon = 'blur_off';
        } else {
            // await (this._videoTrack! as LocalVideoTrack).stopProcessor();
            this.blurIcon = 'blur_on';
        }
    }

}
