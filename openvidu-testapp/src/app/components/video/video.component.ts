import { Component, Input, OnInit, ViewChild, ElementRef, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';

import {
    StreamManager,
    StreamManagerEvent,
    VideoElementEvent,
    Subscriber,
    Session,
    LocalRecorder,
    OpenVidu,
    Publisher,
    StreamEvent,
    VideoInsertMode
} from 'openvidu-browser';

import { EventsDialogComponent } from '../dialogs/events-dialog.component';
import { MuteSubscribersService } from '../../services/mute-subscribers.service';
import { Subscription } from 'rxjs/Subscription';
import { LocalRecordingDialogComponent } from '../dialogs/local-recording-dialog.component';
import { ExtensionDialogComponent } from '../dialogs/extension-dialog.component';
import { OpenViduVideoComponent } from './ov-video.component';

@Component({
    selector: 'app-video',
    templateUrl: './video.component.html',
    styleUrls: ['./video.component.css']
})
export class VideoComponent implements OnInit, OnDestroy {

    @Input() streamManager: StreamManager;
    @Input() OV: OpenVidu;
    @Input() eventCollection: any;

    @Output() updateEventListInParent = new EventEmitter();
    @Output() reSubbed = new EventEmitter();

    subbed = true;
    subbedVideo = true;
    subbedAudio = true;
    recorder = undefined;
    recording = false;
    recordingPaused = false;
    videoElement = undefined;
    showButtons = false;
    videoClasses = '';
    videoPoster = '';

    unpublished = false;
    publisherChanged = false;
    audioMuted = false;
    videoMuted = false;
    sendAudio = true;
    sendVideo = true;
    sendAudioChange = false;
    sendVideoChange = false;
    optionsVideo = '';

    private muteSubscribersSubscription: Subscription;

    // Icons
    pubSubIcon = 'stop';
    pubSubVideoIcon = 'videocam';
    pubSubAudioIcon = 'mic';
    recordIcon = 'fiber_manual_record';
    pauseRecordIcon = '';

    constructor(private dialog: MatDialog, private muteSubscribersService: MuteSubscribersService
    ) { }

    ngOnInit() {

        if (this.streamManager.remote) {
            // Init subscriber events
            this.eventCollection = {
                videoElementCreated: true,
                videoElementDestroyed: true,
                streamPlaying: true
            };
            this.updateSubscriberEvents({
                videoElementCreated: false,
                videoElementDestroyed: false,
                streamPlaying: false
            });

        } else {
            // Init publisher events
            this.eventCollection = {
                videoElementCreated: true,
                videoElementDestroyed: true,
                streamPlaying: true,
                accessAllowed: true,
                accessDenied: true,
                accessDialogOpened: true,
                accessDialogClosed: true,
                streamCreated: true,
                streamDestroyed: true
            };
            this.updatePublisherEvents(
                <Publisher>this.streamManager,
                {
                    videoElementCreated: false,
                    videoElementDestroyed: false,
                    streamPlaying: false,
                    accessAllowed: false,
                    accessDenied: false,
                    accessDialogOpened: false,
                    accessDialogClosed: false,
                    streamCreated: false,
                    streamDestroyed: false
                });
            this.sendAudio = this.streamManager.stream.hasAudio;
            this.sendVideo = this.streamManager.stream.hasVideo;
            this.optionsVideo = this.streamManager.stream.typeOfVideo;
        }

        this.muteSubscribersSubscription = this.muteSubscribersService.mutedEvent$.subscribe(muteOrUnmute => {
            this.streamManager.videos.forEach(v => {
                v.video.muted = muteOrUnmute;
            });
        });
    }

    ngOnDestroy() {
        if (!!this.recorder) {
            this.recorder.clean();
        }
        if (!!this.muteSubscribersSubscription) { this.muteSubscribersSubscription.unsubscribe(); }
    }

    subUnsub() {
        const subscriber: Subscriber = <Subscriber>this.streamManager;
        if (this.subbed) {
            this.streamManager.stream.session.unsubscribe(subscriber);
            this.restartRecorder();

            this.pubSubVideoIcon = '';
            this.pubSubAudioIcon = '';
            this.recordIcon = '';
            this.pauseRecordIcon = '';
            this.pubSubIcon = 'play_arrow';
            this.subbedVideo = false;
            this.subbedAudio = false;
        } else {
            const oldValues = {
                videoElementCreated: this.eventCollection.videoElementCreated,
                videoElementDestroyed: this.eventCollection.videoElementDestroyed,
                streamPlaying: this.eventCollection.streamPlaying
            };
            this.streamManager = this.streamManager.stream.session.subscribe(subscriber.stream, undefined);
            this.reSubbed.emit(this.streamManager);

            this.pubSubVideoIcon = 'videocam';
            this.pubSubAudioIcon = 'mic';
            this.recordIcon = 'fiber_manual_record';
            this.pauseRecordIcon = '';
            this.pubSubIcon = 'stop';
            this.subbedVideo = true;
            this.subbedAudio = true;

            this.updateSubscriberEvents(oldValues);
        }
        this.subbed = !this.subbed;
    }

    subUnsubVideo(connectionId: string) {
        const subscriber: Subscriber = <Subscriber>this.streamManager;
        this.subbedVideo = !this.subbedVideo;
        subscriber.subscribeToVideo(this.subbedVideo);
        this.pubSubVideoIcon = this.subbedVideo ? 'videocam' : 'videocam_off';
    }

    subUnsubAudio(connectionId: string) {
        const subscriber: Subscriber = <Subscriber>this.streamManager;
        this.subbedAudio = !this.subbedAudio;
        subscriber.subscribeToAudio(this.subbedAudio);
        this.pubSubAudioIcon = this.subbedAudio ? 'mic' : 'mic_off';
    }

    pubUnpub() {
        const publisher: Publisher = <Publisher>this.streamManager;
        if (this.unpublished) {
            this.streamManager.stream.session.publish(publisher)
                .then(() => {
                    console.log(publisher);
                })
                .catch(e => {
                    console.error(e);
                });
        } else {
            this.streamManager.stream.session.unpublish(publisher);
        }
        this.unpublished = !this.unpublished;
        this.unpublished ? this.pubSubIcon = 'play_arrow' : this.pubSubIcon = 'stop';
    }

    pubUnpubVideo() {
        const publisher: Publisher = <Publisher>this.streamManager;
        publisher.publishVideo(this.videoMuted);
        this.videoMuted = !this.videoMuted;
        this.pubSubVideoIcon = this.videoMuted ? 'videocam_off' : 'videocam';
    }

    pubUnpubAudio() {
        const publisher: Publisher = <Publisher>this.streamManager;
        publisher.publishAudio(this.audioMuted);
        this.audioMuted = !this.audioMuted;
        this.pubSubAudioIcon = this.audioMuted ? 'mic_off' : 'mic';
    }

    changePub() {
        let screenChange;
        if (!this.publisherChanged) {
            if (this.sendAudio && !this.sendVideo) {
                this.sendAudioChange = false;
                this.sendVideoChange = true;
                screenChange = false;
            } else if (!this.sendAudio && this.sendVideo) {
                this.sendAudioChange = true;
                this.sendVideoChange = false;
            } else if (this.sendAudio && this.sendVideo && this.optionsVideo === 'CAMERA') {
                this.sendAudioChange = false;
                this.sendVideoChange = true;
                screenChange = true;
            } else if (this.sendAudio && this.sendVideo && this.optionsVideo === 'SCREEN') {
                this.sendAudioChange = false;
                this.sendVideoChange = true;
                screenChange = false;
            }
        } else {
            this.sendAudioChange = this.sendAudio;
            this.sendVideoChange = this.sendVideo;
            screenChange = this.optionsVideo === 'SCREEN' ? true : false;
        }

        this.audioMuted = false;
        this.videoMuted = false;
        this.unpublished = false;

        const otherPublisher = this.OV.initPublisher(
            undefined,
            {
                audioSource: this.sendAudioChange ? undefined : false,
                videoSource: this.sendVideoChange ? (screenChange ? 'screen' : undefined) : false,
                publishAudio: (!this.publisherChanged) ? true : !this.audioMuted,
                publishVideo: (!this.publisherChanged) ? true : !this.videoMuted,
                resolution: '640x480',
                frameRate: 30,
                insertMode: VideoInsertMode.APPEND
            },
            (err) => {
                if (err) {
                    console.warn(err);
                    if (err.name === 'SCREEN_EXTENSION_NOT_INSTALLED') {
                        this.dialog.open(ExtensionDialogComponent, {
                            data: { url: err.message },
                            disableClose: true,
                            width: '250px'
                        });
                    }
                }
            });
        this.updatePublisherEvents(otherPublisher, {
            videoElementCreated: !this.eventCollection.videoElementCreated,
            videoElementDestroyed: !this.eventCollection.videoElementDestroyed,
            streamPlaying: !this.eventCollection.streamPlaying,
            accessAllowed: !this.eventCollection.accessAllowed,
            accessDenied: !this.eventCollection.accessDenied,
            accessDialogOpened: !this.eventCollection.accessDialogOpened,
            accessDialogClosed: !this.eventCollection.accessDialogClosed,
            streamCreated: !this.eventCollection.streamCreated,
            streamDestroyed: !this.eventCollection.streamDestroyed
        });

        otherPublisher.once('accessAllowed', () => {
            if (!this.unpublished) {
                this.streamManager.stream.session.unpublish(<Publisher>this.streamManager);
                this.streamManager = otherPublisher;
            }
            this.streamManager.stream.session.publish(otherPublisher).then(() => {
                console.log(this.streamManager);
            });
        });

        this.publisherChanged = !this.publisherChanged;
    }

    updateSubscriberEvents(oldValues) {
        const sub: Subscriber = <Subscriber>this.streamManager;

        if (this.eventCollection.videoElementCreated) {
            if (!oldValues.videoElementCreated) {
                sub.on('videoElementCreated', (event: VideoElementEvent) => {
                    if (!sub.stream.hasVideo) {
                        this.videoClasses = 'grey-background';
                        this.videoPoster = 'assets/images/volume.png';
                    } else {
                        this.videoClasses = '';
                        this.videoPoster = '';
                    }
                    this.updateEventListInParent.emit({
                        event: 'videoElementCreated',
                        content: event.element.id
                    });
                });
            }
        } else {
            sub.off('videoElementCreated');
        }

        if (this.eventCollection.videoElementDestroyed) {
            if (!oldValues.videoElementDestroyed) {
                sub.on('videoElementDestroyed', (event: VideoElementEvent) => {
                    this.showButtons = false;
                    this.updateEventListInParent.emit({
                        event: 'videoElementDestroyed',
                        content: event.element.id
                    });
                });
            }
        } else {
            sub.off('videoElementDestroyed');
        }

        if (this.eventCollection.streamPlaying) {
            if (!oldValues.streamPlaying) {
                sub.on('streamPlaying', (event: StreamManagerEvent) => {
                    this.showButtons = true;
                    this.updateEventListInParent.emit({
                        event: 'streamPlaying',
                        content: this.streamManager.stream.streamId
                    });
                });
            }
        } else {
            sub.off('streamPlaying');
        }
    }

    updatePublisherEvents(pub: Publisher, oldValues: any) {
        if (this.eventCollection.videoElementCreated) {
            if (!oldValues.videoElementCreated) {
                pub.on('videoElementCreated', (event: VideoElementEvent) => {
                    if (!pub.stream.hasVideo) {
                        this.videoClasses = 'grey-background';
                        this.videoPoster = 'assets/images/volume.png';
                    } else {
                        this.videoClasses = '';
                        this.videoPoster = '';
                    }
                    this.updateEventListInParent.emit({
                        event: 'videoElementCreated',
                        content: event.element.id
                    });
                });
            }
        } else {
            pub.off('videoElementCreated');
        }

        if (this.eventCollection.accessAllowed) {
            if (!oldValues.accessAllowed) {
                pub.on('accessAllowed', (e) => {
                    this.updateEventListInParent.emit({
                        event: 'accessAllowed',
                        content: ''
                    });
                });
            }
        } else {
            pub.off('accessAllowed');
        }

        if (this.eventCollection.accessDenied) {
            if (!oldValues.accessDenied) {
                pub.on('accessDenied', (e) => {
                    this.updateEventListInParent.emit({
                        event: 'accessDenied',
                        content: ''
                    });
                });
            }
        } else {
            pub.off('accessDenied');
        }

        if (this.eventCollection.accessDialogOpened) {
            if (!oldValues.accessDialogOpened) {
                pub.on('accessDialogOpened', (e) => {
                    this.updateEventListInParent.emit({
                        event: 'accessDialogOpened',
                        content: ''
                    });
                });
            }
        } else {
            pub.off('accessDialogOpened');
        }

        if (this.eventCollection.accessDialogClosed) {
            if (!oldValues.accessDialogClosed) {
                pub.on('accessDialogClosed', (e) => {
                    this.updateEventListInParent.emit({
                        event: 'accessDialogClosed',
                        content: ''
                    });
                });
            }
        } else {
            pub.off('accessDialogClosed');
        }

        if (this.eventCollection.streamCreated) {
            if (!oldValues.streamCreated) {
                pub.on('streamCreated', (e: StreamEvent) => {
                    this.updateEventListInParent.emit({
                        event: 'streamCreated',
                        content: e.stream.streamId
                    });
                });
            }
        } else {
            pub.off('streamCreated');
        }

        if (this.eventCollection.streamDestroyed) {
            if (!oldValues.streamDestroyed) {
                pub.on('streamDestroyed', (e: StreamEvent) => {
                    this.updateEventListInParent.emit({
                        event: 'streamDestroyed',
                        content: e.stream.streamId
                    });
                });
            }
        } else {
            pub.off('streamDestroyed');
        }

        if (this.eventCollection.videoElementDestroyed) {
            if (!oldValues.videoElementDestroyed) {
                pub.on('videoElementDestroyed', (e: VideoElementEvent) => {
                    this.updateEventListInParent.emit({
                        event: 'videoElementDestroyed',
                        content: '(Publisher)'
                    });
                });
            }
        } else {
            pub.off('videoElementDestroyed');
        }

        if (this.eventCollection.streamPlaying) {
            if (!oldValues.streamPlaying) {
                pub.on('streamPlaying', (event: StreamManagerEvent) => {
                    this.showButtons = true;
                    this.updateEventListInParent.emit({
                        event: 'streamPlaying',
                        content: this.streamManager.stream.streamId
                    });
                });
            }
        } else {
            pub.off('streamPlaying');
        }
    }

    openSubscriberEventsDialog() {
        const oldValues = {
            videoElementCreated: this.eventCollection.videoElementCreated,
            videoElementDestroyed: this.eventCollection.videoElementDestroyed,
            streamPlaying: this.eventCollection.streamPlaying
        };
        const dialogRef = this.dialog.open(EventsDialogComponent, {
            data: {
                eventCollection: this.eventCollection,
                target: 'Subscriber'
            },
            width: '280px',
            autoFocus: false,
            disableClose: true
        });
        dialogRef.afterClosed().subscribe((result) => {
            this.updateSubscriberEvents(oldValues);
        });
    }


    openPublisherEventsDialog() {
        const oldValues = {
            videoElementCreated: this.eventCollection.videoElementCreated,
            videoElementDestroyed: this.eventCollection.videoElementDestroyed,
            streamPlaying: this.eventCollection.streamPlaying,
            accessAllowed: this.eventCollection.accessAllowed,
            accessDenied: this.eventCollection.accessDenied,
            accessDialogOpened: this.eventCollection.accessDialogOpened,
            accessDialogClosed: this.eventCollection.accessDialogClosed,
            streamCreated: this.eventCollection.streamCreated,
            streamDestroyed: this.eventCollection.streamDestroyed
        };
        const dialogRef = this.dialog.open(EventsDialogComponent, {
            data: {
                eventCollection: this.eventCollection,
                target: 'Publisher'
            },
            width: '280px',
            autoFocus: false,
            disableClose: true
        });
        dialogRef.afterClosed().subscribe((result) => {
            this.updatePublisherEvents(<Publisher>this.streamManager, oldValues);
        });
    }

    record(): void {
        if (!this.recording) {
            this.recorder = this.OV.initLocalRecorder(this.streamManager.stream);
            this.recorder.record();
            this.recording = true;
            this.recordIcon = 'stop';
            this.pauseRecordIcon = 'pause';
        } else {
            this.recorder.stop()
                .then(() => {
                    let dialogRef: MatDialogRef<LocalRecordingDialogComponent>;
                    dialogRef = this.dialog.open(LocalRecordingDialogComponent, {
                        disableClose: true,
                        data: {
                            recorder: this.recorder
                        }
                    });
                    dialogRef.componentInstance.myReference = dialogRef;

                    dialogRef.afterOpen().subscribe(() => {
                        this.muteSubscribersService.updateMuted(true);
                        this.recorder.preview('recorder-preview').controls = true;
                    });
                    dialogRef.afterClosed().subscribe(() => {
                        this.muteSubscribersService.updateMuted(false);
                        this.restartRecorder();
                    });
                })
                .catch((error) => {
                    console.error('Error stopping LocalRecorder: ' + error);
                });
        }
    }

    pauseRecord(): void {
        if (!this.recordingPaused) {
            this.recorder.pause();
            this.pauseRecordIcon = 'play_arrow';
        } else {
            this.recorder.resume();
            this.pauseRecordIcon = 'pause';
        }
        this.recordingPaused = !this.recordingPaused;
    }

    private restartRecorder() {
        this.recording = false;
        this.recordingPaused = false;
        this.recordIcon = 'fiber_manual_record';
        this.pauseRecordIcon = '';
        if (!!this.recorder) {
            this.recorder.clean();
        }
    }

}
