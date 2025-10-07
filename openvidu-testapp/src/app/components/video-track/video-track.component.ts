import { Component, Inject } from '@angular/core';
import {
  LocalTrack,
  VideoTrack,
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
  standalone: false,
})
export class VideoTrackComponent extends TrackComponent {
  muteVideoIcon: string = 'videocam';
  blurIcon: string = 'blur_on';
  maxVideoQuality: string;

  videoZoom = false;

  constructor(
    protected override testFeedService: TestFeedService,
    @Inject(MatDialog) private dialog: MatDialog
  ) {
    super(testFeedService);
  }

  async muteUnmuteVideo() {
    if (this._track?.isMuted) {
      this.muteVideoIcon = 'videocam';
      await (this._track as LocalTrack).unmute();
    } else {
      this.muteVideoIcon = 'videocam_off';
      await (this._track as LocalTrack).mute();
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
      let stats = await (this._track! as VideoTrack).getRTCStatsReport();
      let codecs = new Map();
      stats?.forEach((report) => {
        if (report.type === 'codec') {
          // Store for matching with codecId in 'outbound-rtp' or 'inbound-rtp' reports
          codecs.set(report.id, report);
        }
        if (report.type === 'outbound-rtp' || report.type === 'inbound-rtp') {
          videoLayers.push({
            codecId: report.codecId,
            scalabilityMode: report.scalabilityMode,
            rid: report.rid,
            active: report.active,
            frameWidth: report.frameWidth,
            frameHeight: report.frameHeight,
            framesPerSecond: report.framesPerSecond,
            bytesReceived: report.bytesReceived,
            bytesSent: report.bytesSent,
          });
        }
      });
      videoLayers.forEach((layer) => {
        if (codecs.has(layer.codecId)) {
          layer.codec = codecs.get(layer.codecId).mimeType;
        }
      });
      return JSON.stringify(videoLayers, null, 2);
    };
    this.dialog.open(InfoDialogComponent, {
      data: {
        title: 'Video Track Layers Info',
        subtitle: this.finalElementRefId,
        updateFunction,
        updateInterval: 700,
      },
    });
  }

  async blur() {
    if (this.blurIcon == 'blur_on') {
      // await (this._track! as LocalVideoTrack).setProcessor(BackgroundBlur());
      this.blurIcon = 'blur_off';
    } else {
      // await (this._track! as LocalVideoTrack).stopProcessor();
      this.blurIcon = 'blur_on';
    }
  }

  toggleVideoZoom() {
    this.videoZoom = !this.videoZoom;
    let newWidth = this.videoZoom ? '1500px' : '120px';
    this.elementRef.nativeElement.style.width = newWidth;
  }
}
