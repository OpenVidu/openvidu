import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import {
  LocalTrack,
  VideoTrack,
  VideoCaptureOptions,
  ScreenShareCaptureOptions,
  RemoteTrack,
  RemoteTrackPublication,
  VideoQuality,
} from 'livekit-client';
import { TrackComponent } from '../track/track.component';
import { MatDialog } from '@angular/material/dialog';
import { TestFeedService } from 'src/app/services/test-feed.service';
import { InfoDialogComponent } from '../dialogs/info-dialog/info-dialog.component';

@Component({
  selector: 'app-video-track',
  templateUrl: './video-track.component.html',
  styleUrls: ['./video-track.component.css'],
})
export class VideoTrackComponent extends TrackComponent {
  @ViewChild('videoElement') elementRef: ElementRef;
  elementRefId: string = '';

  muteVideoIcon: string = 'videocam';
  blurIcon: string = 'blur_on';

  private _videoTrack: VideoTrack | undefined;
  maxVideoQuality: string;

  @Input() set videoTrack(videoTrack: VideoTrack | undefined) {
    this._videoTrack = videoTrack;
    this.track = this._videoTrack;

    this.setupTrackEventListeners();

    let id = '';
    id = `${this.getTrackOrigin()}--video--${this._videoTrack?.source}--${
      this._videoTrack?.sid
    }`;
    if (this._videoTrack?.sid !== this._videoTrack?.mediaStreamID) {
      id += `--${this._videoTrack?.mediaStreamID}`;
    }
    id = id.replace(/[^0-9a-z-A-Z_-]+/g, '');
    this.elementRefId = id;

    if (this.elementRef) {
      this._videoTrack?.attach(this.elementRef.nativeElement);
    }
  }

  constructor(
    protected override testFeedService: TestFeedService,
    private dialog: MatDialog
  ) {
    super(testFeedService);
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

  async onQualityChange() {
    let videoQuality: VideoQuality;
    switch (this.maxVideoQuality) {
      case 'LOW':
        videoQuality = VideoQuality.LOW;
        break;
      case 'MEDIUM':
        videoQuality = VideoQuality.MEDIUM;
        break;
      case 'HIGH':
        videoQuality = VideoQuality.HIGH;
        break;
      default:
        videoQuality = VideoQuality.HIGH;
    }
    await (this.trackPublication as RemoteTrackPublication).setVideoQuality(
      videoQuality
    );
  }

  openInfoDialog() {
    const updateFunction = async (): Promise<string> => {
      const videoLayers: any[] = [];
      let stats = await this._videoTrack?.getRTCStatsReport();
      stats?.forEach((report) => {
        if (report.type === 'outbound-rtp' || report.type === 'inbound-rtp') {
          videoLayers.push({
            codecId: report.codecId,
            scalabilityMode: report.scalabilityMode,
            rid: report.rid,
            active: report.active,
            frameWidth: report.frameWidth,
            frameHeight: report.frameHeight,
            framesPerSecond: report.framesPerSecond,
          });
        }
      });
      return JSON.stringify(videoLayers, null, 2);
    };
    this.dialog.open(InfoDialogComponent, {
      data: {
        title: 'Video Track Layers Info',
        subtitle: this.elementRefId,
        updateFunction,
      },
    });
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
