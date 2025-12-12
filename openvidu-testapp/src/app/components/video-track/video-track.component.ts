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
import { ProcessorDialogComponent } from '../dialogs/processor-dialog/processor-dialog.component';

@Component({
  selector: 'app-video-track',
  templateUrl: './video-track.component.html',
  styleUrls: ['./video-track.component.css'],
  standalone: false,
})
export class VideoTrackComponent extends TrackComponent {
  muteVideoIcon: string = 'videocam';
  maxVideoQuality: string;

  videoZoom = false;

  // Processor state
  processor: any;
  mode: 'disabled' | 'background-blur' | 'virtual-background' | undefined =
    'virtual-background';
  backgroundType: 'image' | 'screen' = 'image';
  tracking: boolean = false;
  scale: number = 1;
  horizontalPosition: number = 0;
  blurRadius: number = 10;
  processorEnabled: boolean = false;
  screenShareTrack: MediaStreamTrack | undefined;

  segmentationMethod: 'mediapipe' | 'chroma' = 'mediapipe';
  modelAssetPath: string = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
  chromaKey = {
    autoDetect: true,
    autoDetectThreshold: [70, 70, 70] as [number, number, number],
    hueRange: [60, 130] as [number, number],
    saturationRange: [50, 255] as [number, number],
    valueRange: [50, 255] as [number, number],
    sampleRegion: { startX: 0.05, endX: 0.2, startY: 0.08, endY: 0.25 },
    autoDetectFrameInterval: 30
  };

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

  openProcessorDialog() {
    this.dialog.open(ProcessorDialogComponent, {
      data: {
        videoTrack: this,
      },
      width: '1400px',
      maxWidth: '95vw',
      maxHeight: '95vh',
    });
  }

  toggleVideoZoom() {
    this.videoZoom = !this.videoZoom;
    let newWidth = this.videoZoom ? '1500px' : '120px';
    this.elementRef.nativeElement.style.width = newWidth;
  }
}
