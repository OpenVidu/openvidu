import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatRadioChange } from '@angular/material/radio';
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
  styleUrls: ['./options-dialog.component.css'],
})
export class OptionsDialogComponent {
  roomOptions?: RoomOptions;
  createLocalTracksOptions?: CreateLocalTracksOptions;
  shareScreen = false;
  screenShareCaptureOptions?: ScreenShareCaptureOptions;
  trackPublishOptions?: TrackPublishOptions;

  videoOption: true | false | 'custom';
  audioOption: true | false | 'custom';
  screenOption: true | false | 'custom';

  auxVideoCaptureOptions: VideoCaptureOptions;
  auxAudioCaptureOptions: AudioCaptureOptions;

  auxScreenDisplaySurface: 'NONE' | 'window' | 'browser' | 'monitor';

  ENUMERATION_SOURCE = Object.keys(Track.Source);

  constructor(
    public dialogRef: MatDialogRef<OptionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      roomOptions?: RoomOptions;
      createLocalTracksOptions?: CreateLocalTracksOptions;
      shareScreen: boolean;
      screenShareCaptureOptions?: ScreenShareCaptureOptions;
      trackPublishOptions?: TrackPublishOptions;
    }
  ) {
    this.roomOptions = data.roomOptions;
    this.createLocalTracksOptions = data.createLocalTracksOptions;
    this.shareScreen = data.shareScreen;
    this.screenShareCaptureOptions = data.screenShareCaptureOptions;
    this.trackPublishOptions = data.trackPublishOptions;
    if (typeof this.createLocalTracksOptions?.video !== 'boolean') {
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
    if (this.shareScreen) {
      if (this.screenShareCaptureOptions == undefined) {
        this.screenOption = false;
      } else if (Object.keys(this.screenShareCaptureOptions).length > 0) {
        this.screenOption = 'custom';
      } else {
        this.screenOption = true;
        this.screenShareCaptureOptions = {};
      }
    }
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
      createLocalTracksOptions: this.createLocalTracksOptions,
      screenShareCaptureOptions: this.screenShareCaptureOptions,
      trackPublishOptions: this.trackPublishOptions,
    });
  }

  screenOptionChanged(event: MatRadioChange) {
    if (event.value === 'custom' && !this.screenShareCaptureOptions) {
      this.screenShareCaptureOptions = {
        video: true
      };
    }
  }
}
