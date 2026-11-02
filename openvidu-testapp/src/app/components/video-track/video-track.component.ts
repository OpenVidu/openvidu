import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  LocalTrack,
  LocalVideoTrack,
  VideoTrack,
  RemoteTrackPublication,
  VideoQuality,
} from 'livekit-client';
import { TrackComponent } from '../track/track.component';
import { MatDialog } from '@angular/material/dialog';
import { TestFeedService } from 'src/app/services/test-feed.service';
import { InfoDialogComponent } from '../dialogs/info-dialog/info-dialog.component';
import { ProcessorDialogComponent } from '../dialogs/processor-dialog/processor-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-video-track',
  templateUrl: './video-track.component.html',
  styleUrl: './video-track.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    NgClass,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
})
export class VideoTrackComponent extends TrackComponent {
  muteVideoIcon: string = 'videocam';
  maxVideoQuality: string;
  // Resolution to re-capture the local video track at (see onRestartResolutionChange)
  restartResolution: string;

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
  modelAssetPath: string =
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
  chromaKey = {
    autoDetect: true,
    autoDetectThreshold: [70, 70, 70] as [number, number, number],
    hueRange: [60, 130] as [number, number],
    saturationRange: [50, 255] as [number, number],
    valueRange: [50, 255] as [number, number],
    sampleRegion: { startX: 0.05, endX: 0.2, startY: 0.08, endY: 0.25 },
    autoDetectFrameInterval: 30,
  };

  private dialog = inject(MatDialog);

  constructor(protected override testFeedService: TestFeedService) {
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
      videoQuality,
    );
  }

  // Re-captures the local video track at the selected resolution. Useful to make
  // the encoder change its layer structure on the fly: an SVC encoder drops its
  // upper spatial layers when the capture is too small to host them
  async onRestartResolutionChange() {
    const [width, height] = this.restartResolution.split('x').map(Number);
    await (this._track as LocalVideoTrack).restartTrack({
      resolution: { width, height, frameRate: 30 },
    });
  }

  openInfoDialog() {
    const updateFunction = async (): Promise<string> => {
      const videoLayers: any[] = [];
      let stats = await (this._track! as VideoTrack).getRTCStatsReport();
      let codecs = new Map();
      let transport: RTCTransportStats | undefined;
      stats?.forEach((report) => {
        if (report.type === 'codec') {
          // Store for matching with codecId in 'outbound-rtp' or 'inbound-rtp' reports
          codecs.set(report.id, report);
        }
        if (report.type === 'transport') {
          // Whole-connection counters: RTP, RTX padding and RTCP of every track of
          // this peer connection, so a subscriber can see traffic that its own
          // 'inbound-rtp' does not count
          transport = report as RTCTransportStats;
        }
        if (report.type === 'outbound-rtp') {
          const reportTyped = report as RTCOutboundRtpStreamStats;
          videoLayers.push({
            codecId: reportTyped.codecId,
            scalabilityMode: reportTyped.scalabilityMode,
            ssrc: reportTyped.ssrc,
            rid: reportTyped.rid,
            mid: reportTyped.mid,
            active: reportTyped.active,
            frameWidth: reportTyped.frameWidth,
            frameHeight: reportTyped.frameHeight,
            framesSent: reportTyped.framesSent,
            framesEncoded: reportTyped.framesEncoded,
            keyFramesEncoded: reportTyped.keyFramesEncoded,
            bytesSent: reportTyped.bytesSent,
            framesPerSecond: reportTyped.framesPerSecond,
          });
        }
        if (report.type === 'inbound-rtp') {
          const reportTyped = report as RTCInboundRtpStreamStats;
          videoLayers.push({
            codecId: reportTyped.codecId,
            ssrc: reportTyped.ssrc,
            mid: reportTyped.mid,
            trackIdentifier: reportTyped.trackIdentifier,
            frameWidth: reportTyped.frameWidth,
            frameHeight: reportTyped.frameHeight,
            framesReceived: reportTyped.framesReceived,
            framesDecoded: reportTyped.framesDecoded,
            keyFramesDecoded: reportTyped.keyFramesDecoded,
            framesDropped: reportTyped.framesDropped,
            bytesReceived: reportTyped.bytesReceived,
            framesPerSecond: reportTyped.framesPerSecond,
            freezeCount: reportTyped.freezeCount,
            pauseCount: reportTyped.pauseCount,
          });
        }
      });
      videoLayers.forEach((layer) => {
        if (codecs.has(layer.codecId)) {
          layer.codec = codecs.get(layer.codecId).mimeType;
        }
        if (transport) {
          layer.transportBytesReceived = transport.bytesReceived;
          layer.transportPacketsReceived = transport.packetsReceived;
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
