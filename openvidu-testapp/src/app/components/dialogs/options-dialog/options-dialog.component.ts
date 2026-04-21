import { Component, inject } from '@angular/core';
import { NgClass, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { VideoResolutionComponent } from './video-resolution/video-resolution.component';
import {
  AudioCaptureOptions,
  CreateLocalTracksOptions,
  Room,
  RoomOptions,
  ScreenShareCaptureOptions,
  Track,
  TrackPublishOptions,
  VideoCaptureOptions,
} from 'livekit-client';

@Component({
    selector: 'app-options-dialog',
    templateUrl: './options-dialog.component.html',
    styleUrl: './options-dialog.component.css',
    imports: [NgClass, UpperCasePipe, FormsModule, MatDialogModule, MatRadioModule, MatDividerModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, VideoResolutionComponent],
})
export class OptionsDialogComponent {
  roomOptions?: RoomOptions;
  forceRelay = false;
  createLocalTracksOptions?: CreateLocalTracksOptions;
  shareScreen = false;
  screenShareCaptureOptions?: ScreenShareCaptureOptions;
  trackPublishOptions?: TrackPublishOptions;
  allowDisablingAudio = true;
  allowDisablingVideo = true;
  allowDisablingScreen = true;

  dataTrackName?: string;

  videoOption: true | false | 'custom';
  audioOption: true | false | 'custom';
  screenOption: true | false | 'custom';

  auxVideoCaptureOptions: VideoCaptureOptions;
  auxAudioCaptureOptions: AudioCaptureOptions;

  auxScreenDisplaySurface: 'NONE' | 'window' | 'browser' | 'monitor';
  customScreenShareResolution: boolean = false;

  ENUMERATION_SOURCE = Object.keys(Track.Source);

  inputVideoDevices: MediaDeviceInfo[] = [];

  private data = inject<{
    roomOptions?: RoomOptions;
    forceRelay: boolean;
    createLocalTracksOptions?: CreateLocalTracksOptions;
    shareScreen: boolean;
    screenShareCaptureOptions?: ScreenShareCaptureOptions;
    trackPublishOptions?: TrackPublishOptions;
    allowDisablingAudio?: boolean;
    allowDisablingVideo?: boolean;
    allowDisablingScreen?: boolean;
    dataTrackName?: string;
  }>(MAT_DIALOG_DATA);

  constructor(
    public dialogRef: MatDialogRef<OptionsDialogComponent>,
  ) {
    const data = this.data;
    this.roomOptions = data.roomOptions;
    this.forceRelay = data.forceRelay;
    this.createLocalTracksOptions = data.createLocalTracksOptions;
    this.shareScreen = data.shareScreen;
    this.screenShareCaptureOptions = data.screenShareCaptureOptions;
    this.trackPublishOptions = data.trackPublishOptions;
    if (this.createLocalTracksOptions !== undefined) {
      if (typeof this.createLocalTracksOptions.video !== 'boolean') {
        this.auxVideoCaptureOptions = this.createLocalTracksOptions!
          .video as VideoCaptureOptions;
        this.videoOption = 'custom';
      } else {
        this.videoOption = this.createLocalTracksOptions.video;
        this.auxVideoCaptureOptions = new Room().options.videoCaptureDefaults!;
      }
      if (typeof this.createLocalTracksOptions?.audio !== 'boolean') {
        this.auxAudioCaptureOptions = this.createLocalTracksOptions!
          .audio as AudioCaptureOptions;
        this.audioOption = 'custom';
      } else {
        this.audioOption = this.createLocalTracksOptions.audio;
        this.auxAudioCaptureOptions = new Room().options.audioCaptureDefaults!;
      }
    }
    if (this.shareScreen) {
      if (this.screenShareCaptureOptions == undefined) {
        this.screenOption = false;
      } else if (Object.keys(this.screenShareCaptureOptions).length > 0) {
        this.screenOption = 'custom';
        if (this.screenShareCaptureOptions.resolution) {
          this.customScreenShareResolution = true;
        }
      } else {
        this.screenOption = true;
        this.screenShareCaptureOptions = {};
      }
    }
    if (this.data.allowDisablingAudio === false) {
      this.allowDisablingAudio = false;
    }
    if (this.data.allowDisablingVideo === false) {
      this.allowDisablingVideo = false;
    }
    if (this.data.allowDisablingScreen === false) {
      this.allowDisablingScreen = false;
    }
    if (this.data.dataTrackName !== undefined) {
      this.dataTrackName = this.data.dataTrackName;
    }
    Room.getLocalDevices('videoinput').then((devices) => {
      this.inputVideoDevices = devices;
    });
  }

  returnValues() {
    if (this.createLocalTracksOptions) {
      if (this.videoOption === 'custom') {
        this.createLocalTracksOptions.video = this.auxVideoCaptureOptions;
      } else {
        this.createLocalTracksOptions.video = this.videoOption;
      }
      if (this.audioOption === 'custom') {
        this.createLocalTracksOptions.audio = this.auxAudioCaptureOptions;
      } else {
        this.createLocalTracksOptions.audio = this.audioOption;
      }
    }
    if (
      !!this.auxScreenDisplaySurface &&
      this.auxScreenDisplaySurface !== 'NONE'
    ) {
      this.screenShareCaptureOptions!.video = {
        displaySurface: this.auxScreenDisplaySurface,
      };
    }
    if (this.screenOption === true) {
      this.screenShareCaptureOptions = {};
    }
    if (this.screenOption === false) {
      this.screenShareCaptureOptions = undefined;
    }
    this.dialogRef.close({
      roomOptions: this.roomOptions,
      forceRelay: this.forceRelay,
      createLocalTracksOptions: this.createLocalTracksOptions,
      screenShareCaptureOptions: this.screenShareCaptureOptions,
      trackPublishOptions: this.trackPublishOptions,
      dataTrackName: this.dataTrackName,
    });
  }

  screenOptionChanged(event: MatRadioChange) {
    if (event.value === 'custom' && !this.screenShareCaptureOptions) {
      this.screenShareCaptureOptions = {
        video: true,
      };
    }
  }

  handleCustomScreenResolutionChange() {
    if (this.customScreenShareResolution) {
      if (!this.screenShareCaptureOptions!.resolution) {
        this.screenShareCaptureOptions!.resolution = {
          width: 1920,
          height: 1080,
        };
      }
    } else {
      delete this.screenShareCaptureOptions!.resolution;
    }
  }
}
