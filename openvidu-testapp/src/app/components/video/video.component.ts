import { Component, Input, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';

import {
    StreamManager,
    StreamManagerEvent,
    StreamPropertyChangedEvent,
    VideoElementEvent,
    Subscriber,
    OpenVidu,
    Publisher,
    StreamEvent,
    VideoInsertMode,
    FilterEvent
} from 'openvidu-browser';

import { EventsDialogComponent } from '../dialogs/events-dialog/events-dialog.component';
import { MuteSubscribersService } from '../../services/mute-subscribers.service';
import { Subscription } from 'rxjs';
import { LocalRecordingDialogComponent } from '../dialogs/local-recording-dialog/local-recording-dialog.component';
import { ExtensionDialogComponent } from '../dialogs/extension-dialog/extension-dialog.component';
import { FilterDialogComponent } from '../dialogs/filter-dialog/filter-dialog.component';
import { OpenViduEvent } from '../openvidu-instance/openvidu-instance.component';

@Component({
    selector: 'app-video',
    templateUrl: './video.component.html',
    styleUrls: ['./video.component.css']
})
export class VideoComponent implements OnInit, OnDestroy {

    @Input() streamManager: StreamManager;
    @Input() properties: any;
    @Input() OV: OpenVidu;
    @Input() eventCollection: any;

    @Output() updateEventListInParent = new EventEmitter<OpenViduEvent>();
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
                streamPlaying: true,
                streamAudioVolumeChange: false,
                streamPropertyChanged: false
            };
            this.updateSubscriberEvents({
                videoElementCreated: false,
                videoElementDestroyed: false,
                streamPlaying: false,
                streamAudioVolumeChange: true,
                streamPropertyChanged: true
            });

        } else {
            // Init publisher events
            this.eventCollection = {
                videoElementCreated: true,
                videoElementDestroyed: true,
                streamPlaying: true,
                streamAudioVolumeChange: false,
                accessAllowed: true,
                accessDenied: true,
                accessDialogOpened: true,
                accessDialogClosed: true,
                streamCreated: true,
                streamDestroyed: true,
                streamPropertyChanged: false
            };
            this.updatePublisherEvents(
                <Publisher>this.streamManager,
                {
                    videoElementCreated: false,
                    videoElementDestroyed: false,
                    streamPlaying: false,
                    streamAudioVolumeChange: true,
                    accessAllowed: false,
                    accessDenied: false,
                    accessDialogOpened: false,
                    accessDialogClosed: false,
                    streamCreated: false,
                    streamDestroyed: false,
                    streamPropertyChanged: true
                });
            this.sendAudio = this.streamManager.stream.hasAudio;
            this.sendVideo = this.streamManager.stream.hasVideo;
            this.audioMuted = !this.properties.publishAudio;
            this.videoMuted = !this.properties.publishVideo;
            this.pubSubAudioIcon = this.audioMuted ? 'mic_off' : 'mic';
            this.pubSubVideoIcon = this.videoMuted ? 'videocam_off' : 'videocam';
            this.optionsVideo = this.streamManager.stream.typeOfVideo;
        }

        this.muteSubscribersSubscription = this.muteSubscribersService.mutedEvent$.subscribe(muteOrUnmute => {
            if (this.streamManager.remote) {
                this.streamManager.videos.forEach(v => {
                    v.video.muted = muteOrUnmute;
                });
            }
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
                streamPlaying: this.eventCollection.streamPlaying,
                streamAudioVolumeChange: this.eventCollection.streamAudioVolumeChange,
                streamPropertyChanged: this.eventCollection.streamPropertyChanged
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
        this.videoMuted = !this.videoMuted;
        publisher.publishVideo(!this.videoMuted);
        this.pubSubVideoIcon = this.videoMuted ? 'videocam_off' : 'videocam';
    }

    pubUnpubAudio() {
        const publisher: Publisher = <Publisher>this.streamManager;
        this.audioMuted = !this.audioMuted;
        publisher.publishAudio(!this.audioMuted);
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

        this.unpublished = false;

        const otherPublisher = this.OV.initPublisher(
            undefined,
            {
                audioSource: this.sendAudioChange ? undefined : false,
                videoSource: this.sendVideoChange ? (screenChange ? 'screen' : undefined) : false,
                publishAudio: !this.audioMuted,
                publishVideo: !this.videoMuted,
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
            streamAudioVolumeChange: !this.eventCollection.streamAudioVolumeChange,
            accessAllowed: !this.eventCollection.accessAllowed,
            accessDenied: !this.eventCollection.accessDenied,
            accessDialogOpened: !this.eventCollection.accessDialogOpened,
            accessDialogClosed: !this.eventCollection.accessDialogClosed,
            streamCreated: !this.eventCollection.streamCreated,
            streamDestroyed: !this.eventCollection.streamDestroyed,
            streamPropertyChanged: !this.eventCollection.streamPropertyChanged,
        });

        const oldPublisher = <Publisher>this.streamManager;
        if (oldPublisher.isSubscribedToRemote) {
            otherPublisher.subscribeToRemote(true);
        }

        otherPublisher.once('accessAllowed', () => {
            if (!this.unpublished) {
                this.streamManager.stream.session.unpublish(oldPublisher);
            }
            this.streamManager.stream.session.publish(otherPublisher).then(() => {
                this.streamManager = otherPublisher;
            });
        });

        this.publisherChanged = !this.publisherChanged;
    }

    updateSubscriberEvents(oldValues) {
        const sub: Subscriber = <Subscriber>this.streamManager;

        if (this.eventCollection.videoElementCreated) {
            if (!oldValues.videoElementCreated) {
                sub.on('videoElementCreated', (event: VideoElementEvent) => {
                    this.updateEventListInParent.emit({
                        eventName: 'videoElementCreated',
                        eventContent: event.element.id,
                        event
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
                        eventName: 'videoElementDestroyed',
                        eventContent: event.element.id,
                        event
                    });
                });
            }
        } else {
            sub.off('videoElementDestroyed');
        }

        if (this.eventCollection.streamPlaying) {
            if (!oldValues.streamPlaying) {
                sub.on('streamPlaying', (event: StreamManagerEvent) => {
                    if (!sub.stream.hasVideo) {
                        this.videoClasses = 'grey-background';
                        this.videoPoster = 'assets/images/volume.png';
                    } else {
                        this.videoClasses = '';
                        this.videoPoster = '';
                    }
                    this.showButtons = true;
                    this.updateEventListInParent.emit({
                        eventName: 'streamPlaying',
                        eventContent: this.streamManager.stream.streamId,
                        event
                    });
                });
            }
        } else {
            sub.off('streamPlaying');
        }

        if (this.eventCollection.streamAudioVolumeChange) {
            if (!oldValues.streamAudioVolumeChange) {
                sub.on('streamAudioVolumeChange', (event: StreamManagerEvent) => {
                    this.updateEventListInParent.emit({
                        eventName: 'streamAudioVolumeChange',
                        eventContent: event.value['newValue'],
                        event
                    });
                });
            }
        } else {
            sub.off('streamAudioVolumeChange');
        }

        if (this.eventCollection.streamPropertyChanged) {
            if (!oldValues.streamPropertyChanged) {
                sub.on('streamPropertyChanged', (event: StreamPropertyChangedEvent) => {
                    const newValue = event.changedProperty === 'videoDimensions' ?
                        JSON.stringify(event.newValue) : event.newValue.toString();
                    this.updateEventListInParent.emit({
                        eventName: 'streamPropertyChanged',
                        eventContent: event.changedProperty + ' [' + newValue + ']',
                        event
                    });
                });
            }
        } else {
            sub.off('streamPropertyChanged');
        }
    }

    updatePublisherEvents(pub: Publisher, oldValues: any) {
        if (this.eventCollection.videoElementCreated) {
            if (!oldValues.videoElementCreated) {
                pub.on('videoElementCreated', (event: VideoElementEvent) => {
                    this.updateEventListInParent.emit({
                        eventName: 'videoElementCreated',
                        eventContent: event.element.id,
                        event
                    });
                });
            }
        } else {
            pub.off('videoElementCreated');
        }

        if (this.eventCollection.accessAllowed) {
            if (!oldValues.accessAllowed) {
                pub.on('accessAllowed', () => {
                    this.updateEventListInParent.emit({
                        eventName: 'accessAllowed',
                        eventContent: '',
                        event: {
                            type: 'accessAllowed',
                            target: pub,
                            cancelable: false,
                            hasBeenPrevented: false,
                            isDefaultPrevented: () => false,
                            preventDefault: () => { },
                            callDefaultBehavior: () => { }
                        }
                    });
                });
            }
        } else {
            pub.off('accessAllowed');
        }

        if (this.eventCollection.accessDenied) {
            if (!oldValues.accessDenied) {
                pub.on('accessDenied', (error) => {
                    this.updateEventListInParent.emit({
                        eventName: 'accessDenied',
                        eventContent: JSON.stringify(error),
                        event: {
                            type: 'accessDenied',
                            target: pub,
                            cancelable: false,
                            hasBeenPrevented: false,
                            isDefaultPrevented: () => false,
                            preventDefault: () => { },
                            callDefaultBehavior: () => { }
                        }
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
                        eventName: 'accessDialogOpened',
                        eventContent: '',
                        event: {
                            type: 'accessDialogOpened',
                            target: pub,
                            cancelable: false,
                            hasBeenPrevented: false,
                            isDefaultPrevented: () => false,
                            preventDefault: () => { },
                            callDefaultBehavior: () => { }
                        }
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
                        eventName: 'accessDialogClosed',
                        eventContent: '',
                        event: {
                            type: 'accessDialogClosed',
                            target: pub,
                            cancelable: false,
                            hasBeenPrevented: false,
                            isDefaultPrevented: () => false,
                            preventDefault: () => { },
                            callDefaultBehavior: () => { }
                        }
                    });
                });
            }
        } else {
            pub.off('accessDialogClosed');
        }

        if (this.eventCollection.streamCreated) {
            if (!oldValues.streamCreated) {
                pub.on('streamCreated', (event: StreamEvent) => {
                    this.updateEventListInParent.emit({
                        eventName: 'streamCreated',
                        eventContent: event.stream.streamId,
                        event
                    });
                });
            }
        } else {
            pub.off('streamCreated');
        }

        if (this.eventCollection.streamDestroyed) {
            if (!oldValues.streamDestroyed) {
                pub.on('streamDestroyed', (event: StreamEvent) => {
                    this.updateEventListInParent.emit({
                        eventName: 'streamDestroyed',
                        eventContent: event.stream.streamId,
                        event
                    });
                    if (event.reason.indexOf('forceUnpublish') !== -1) {
                        this.unpublished = !this.unpublished;
                        this.unpublished ? this.pubSubIcon = 'play_arrow' : this.pubSubIcon = 'stop';
                    }
                });
            }
        } else {
            pub.off('streamDestroyed');
        }

        if (this.eventCollection.streamPropertyChanged) {
            if (!oldValues.streamPropertyChanged) {
                pub.on('streamPropertyChanged', (event: StreamPropertyChangedEvent) => {
                    const newValue = event.changedProperty === 'videoDimensions' ?
                        JSON.stringify(event.newValue) : event.newValue.toString();
                    this.updateEventListInParent.emit({
                        eventName: 'streamPropertyChanged',
                        eventContent: event.changedProperty + ' [' + newValue + ']',
                        event
                    });
                });
            }
        } else {
            pub.off('streamPropertyChanged');
        }

        if (this.eventCollection.videoElementDestroyed) {
            if (!oldValues.videoElementDestroyed) {
                pub.on('videoElementDestroyed', (event: VideoElementEvent) => {
                    this.updateEventListInParent.emit({
                        eventName: 'videoElementDestroyed',
                        eventContent: '(Publisher)',
                        event
                    });
                });
            }
        } else {
            pub.off('videoElementDestroyed');
        }

        if (this.eventCollection.streamPlaying) {
            if (!oldValues.streamPlaying) {
                pub.on('streamPlaying', (event: StreamManagerEvent) => {
                    if (!pub.stream.hasVideo) {
                        this.videoClasses = 'grey-background';
                        this.videoPoster = 'assets/images/volume.png';
                    } else {
                        this.videoClasses = '';
                        this.videoPoster = '';
                    }
                    this.showButtons = true;
                    this.updateEventListInParent.emit({
                        eventName: 'streamPlaying',
                        eventContent: pub.stream.streamId,
                        event
                    });
                });
            }
        } else {
            pub.off('streamPlaying');
        }

        if (this.eventCollection.streamAudioVolumeChange) {
            if (!oldValues.streamAudioVolumeChange) {
                pub.on('streamAudioVolumeChange', (event: StreamManagerEvent) => {
                    this.updateEventListInParent.emit({
                        eventName: 'streamAudioVolumeChange',
                        eventContent: event.value['newValue'],
                        event
                    });
                });
            }
        } else {
            pub.off('streamAudioVolumeChange');
        }
    }

    openSubscriberEventsDialog() {
        const oldValues = {
            videoElementCreated: this.eventCollection.videoElementCreated,
            videoElementDestroyed: this.eventCollection.videoElementDestroyed,
            streamPlaying: this.eventCollection.streamPlaying,
            streamAudioVolumeChange: this.eventCollection.streamAudioVolumeChange,
            streamPropertyChanged: this.eventCollection.streamPropertyChanged
        };
        const dialogRef = this.dialog.open(EventsDialogComponent, {
            data: {
                eventCollection: this.eventCollection,
                target: 'Subscriber'
            },
            width: '295px',
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
            streamAudioVolumeChange: this.eventCollection.streamAudioVolumeChange,
            accessAllowed: this.eventCollection.accessAllowed,
            accessDenied: this.eventCollection.accessDenied,
            accessDialogOpened: this.eventCollection.accessDialogOpened,
            accessDialogClosed: this.eventCollection.accessDialogClosed,
            streamCreated: this.eventCollection.streamCreated,
            streamDestroyed: this.eventCollection.streamDestroyed,
            streamPropertyChanged: this.eventCollection.streamPropertyChanged
        };
        const dialogRef = this.dialog.open(EventsDialogComponent, {
            data: {
                eventCollection: this.eventCollection,
                target: 'Publisher'
            },
            width: '295px',
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

    forceUnpublish() {
        this.OV.session.forceUnpublish(this.streamManager.stream);
    }

    forceDisconnect() {
        this.OV.session.forceDisconnect(this.streamManager.stream.connection);
    }

    filterConfig() {
        this.dialog.open(FilterDialogComponent, {
            data: {
                session: this.streamManager.stream.session,
                stream: this.streamManager.stream,
                filterEventHandler: this.emitFilterEventToParent.bind(this)
            },
            disableClose: true,
            width: '450px'
        });
    }

    emitFilterEventToParent(event: FilterEvent) {
        this.updateEventListInParent.emit({
            eventName: 'filterEvent',
            eventContent: JSON.stringify(event.data),
            event
        });
    }

}
