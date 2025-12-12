import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VideoTrackComponent } from '../../video-track/video-track.component';
import { LocalVideoTrack } from 'livekit-client';
import {
  BackgroundOptions,
  BackgroundProcessor,
} from '@livekit/track-processors';

@Component({
  selector: 'app-processor-dialog',
  templateUrl: './processor-dialog.component.html',
  styleUrls: ['./processor-dialog.component.css'],
  standalone: false,
})
export class ProcessorDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement: ElementRef<HTMLVideoElement>;

  constructor(
    public dialogRef: MatDialogRef<ProcessorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { videoTrack: VideoTrackComponent }
  ) {}

  ngAfterViewInit() {
    if (this.data.videoTrack._track) {
      (this.data.videoTrack._track as LocalVideoTrack).attach(
        this.videoElement.nativeElement
      );
    }
  }

  ngOnDestroy() {
    if (this.data.videoTrack._track) {
      (this.data.videoTrack._track as LocalVideoTrack).detach(
        this.videoElement.nativeElement
      );
    }
  }

  close() {
    this.dialogRef.close();
  }

  async toggleTrackProcessor() {
    if (this.data.videoTrack.processorEnabled) {
      await (this.data.videoTrack._track! as LocalVideoTrack).stopProcessor();
      this.data.videoTrack.processorEnabled = false;
      if (this.data.videoTrack.screenShareTrack) {
        this.data.videoTrack.screenShareTrack.stop();
        this.data.videoTrack.screenShareTrack = undefined;
      }
    } else {
      const options = await this.getProcessorOptions();
      this.data.videoTrack.processor = BackgroundProcessor(options);
      await (this.data.videoTrack._track! as LocalVideoTrack).setProcessor(
        this.data.videoTrack.processor
      );
      this.data.videoTrack.processorEnabled = true;
    }
  }

  async changeProcessorMode(
    mode: 'disabled' | 'background-blur' | 'virtual-background'
  ) {
    this.data.videoTrack.mode = mode;
    const options = await this.getProcessorOptions();
    await this.data.videoTrack.processor.switchTo(options);
  }

  async changeBackgroundType(type: 'image' | 'screen') {
    this.data.videoTrack.backgroundType = type;
    const options = await this.getProcessorOptions();
    await this.data.videoTrack.processor.switchTo(options);
  }

  private async getProcessorOptions(): Promise<any> {
    const options: any = {
      mode: this.data.videoTrack.mode,
      tracking: this.data.videoTrack.tracking,
      scale: this.data.videoTrack.scale,
      horizontalPosition: this.data.videoTrack.horizontalPosition,
      blurRadius: this.data.videoTrack.blurRadius,
      segmentationMethod: this.data.videoTrack.segmentationMethod,
    };

    if (this.data.videoTrack.segmentationMethod === 'mediapipe' && this.data.videoTrack.modelAssetPath) {
      options.assetPaths = { modelAssetPath: this.data.videoTrack.modelAssetPath };
    }

    if (this.data.videoTrack.segmentationMethod === 'chroma') {
      options.chromaKey = { ...this.data.videoTrack.chromaKey };
    }

    if (this.data.videoTrack.mode === 'virtual-background') {
      if (this.data.videoTrack.backgroundType === 'image') {
        options.imagePath =
          'https://raw.githubusercontent.com/OpenVidu/openvidu.io/refs/heads/main/docs/assets/images/advanced-features/recording1.png';
      } else {
        if (
          !this.data.videoTrack.screenShareTrack ||
          this.data.videoTrack.screenShareTrack.readyState === 'ended'
        ) {
          const screenShareTracks =
            await this.data.videoTrack.localParticipant?.createScreenTracks({
              video: true,
              audio: false,
            });
          if (screenShareTracks && screenShareTracks.length > 0) {
            this.data.videoTrack.screenShareTrack =
              screenShareTracks[0].mediaStreamTrack;
          }
        }
        if (this.data.videoTrack.screenShareTrack) {
          options.videoTrack = this.data.videoTrack.screenShareTrack;
        }
      }
    }
    return options;
  }

  async toggleProcessorTracking() {
    this.data.videoTrack.tracking = !this.data.videoTrack.tracking;
    await this.data.videoTrack.processor.updateTransformerOptions({
      tracking: this.data.videoTrack.tracking,
    } as BackgroundOptions);
  }

  async changeProcessorScale(scale: number) {
    this.data.videoTrack.scale = scale;
    await this.data.videoTrack.processor.updateTransformerOptions({
      scale: this.data.videoTrack.scale,
    } as BackgroundOptions);
  }

  async changeProcessorHorizontalPosition(horizontalPosition: number) {
    this.data.videoTrack.horizontalPosition = horizontalPosition;
    await this.data.videoTrack.processor.updateTransformerOptions({
      horizontalPosition: this.data.videoTrack.horizontalPosition,
    } as any);
  }

  async changeProcessorBlurRadius(blurRadius: number) {
    this.data.videoTrack.blurRadius = blurRadius;
    await this.data.videoTrack.processor.updateTransformerOptions({
      blurRadius: this.data.videoTrack.blurRadius,
    } as any);
  }

  async resetVirtualBackground() {
    this.data.videoTrack.tracking = false;
    this.data.videoTrack.scale = 1;
    this.data.videoTrack.horizontalPosition = 0;
    await this.data.videoTrack.processor.updateTransformerOptions({
      tracking: this.data.videoTrack.tracking,
      scale: this.data.videoTrack.scale,
      horizontalPosition: this.data.videoTrack.horizontalPosition,
    } as any);
  }

  async changeModelAssetPath(path: string) {
    this.data.videoTrack.modelAssetPath = path;
    if (this.data.videoTrack.processorEnabled) {
      const options = await this.getProcessorOptions();
      // Recreate processor because assetPaths is a constructor option
      await (this.data.videoTrack._track! as LocalVideoTrack).stopProcessor();
      this.data.videoTrack.processor = BackgroundProcessor(options);
      await (this.data.videoTrack._track! as LocalVideoTrack).setProcessor(
        this.data.videoTrack.processor
      );
      await this.data.videoTrack.processor.updateTransformerOptions(options);
    }
  }

  async changeSegmentationMethod(method: 'mediapipe' | 'chroma') {
    this.data.videoTrack.segmentationMethod = method;
    const options = await this.getProcessorOptions();
    // Recreate processor because segmentationMethod is a constructor option
    await (this.data.videoTrack._track! as LocalVideoTrack).stopProcessor();
    this.data.videoTrack.processor = BackgroundProcessor(options);
    await (this.data.videoTrack._track! as LocalVideoTrack).setProcessor(
      this.data.videoTrack.processor
    );
  }

  async updateChromaKey() {
    // Ensure numeric type for autoDetectFrameInterval
    if (this.data.videoTrack.chromaKey.autoDetectFrameInterval) {
      this.data.videoTrack.chromaKey.autoDetectFrameInterval = Number(
        this.data.videoTrack.chromaKey.autoDetectFrameInterval
      );
    }
    console.log(
      'Updating Chroma Key options:',
      JSON.stringify(this.data.videoTrack.chromaKey)
    );
    await this.data.videoTrack.processor.updateTransformerOptions({
      chromaKey: { ...this.data.videoTrack.chromaKey },
    } as any);
  }

  async resetAllChromaKeyDefaults() {
    this.data.videoTrack.chromaKey.autoDetect = true;
    this.data.videoTrack.chromaKey.autoDetectThreshold = [70, 70, 70];
    this.data.videoTrack.chromaKey.sampleRegion = {
      startX: 0.05,
      endX: 0.2,
      startY: 0.08,
      endY: 0.25,
    };
    this.data.videoTrack.chromaKey.autoDetectFrameInterval = 30;
    this.data.videoTrack.chromaKey.hueRange = [60, 130];
    this.data.videoTrack.chromaKey.saturationRange = [50, 255];
    this.data.videoTrack.chromaKey.valueRange = [50, 255];
    await this.updateChromaKey();
  }
}
