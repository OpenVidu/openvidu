/*
 * options: name: XXX data: true (Maybe this is based on webrtc) audio: true,
 * video: true, url: "file:///..." > Player screen: true > Desktop (implicit
 * video:true, audio:false) audio: true, video: true > Webcam
 *
 * stream.hasAudio(); stream.hasVideo(); stream.hasData();
 */
import { Stream, StreamOptions, VideoOptions } from '../OpenViduInternal/Stream';
import { Session } from './Session';

import EventEmitter = require('wolfy87-eventemitter');

export class Publisher {

    private ee = new EventEmitter();

    accessAllowed = false;
    element: Element;
    id: string;
    stream: Stream;
    session: Session; //Initialized by Session.publish(Publisher)

    constructor(stream: Stream, parentId: string) {
        this.stream = stream;

        this.stream.addEventListener('camera-access-changed', (event) => {
            this.accessAllowed = event.accessAllowed;
            if (this.accessAllowed) {
                this.ee.emitEvent('accessAllowed');
            } else {
                this.ee.emitEvent('accessDenied');
            }
        });

        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId)!!;
        }
    }

    publishAudio(value: boolean) {
        this.stream.getWebRtcPeer().audioEnabled = value;
    }

    publishVideo(value: boolean) {
        this.stream.getWebRtcPeer().videoEnabled = value;
    }

    destroy() {
        this.session.unpublish(this);
        this.stream.dispose();
        this.stream.removeVideo(this.element);
        return this;
    }

    subscribeToRemote() {
        this.stream.subscribeToMyRemote();
    }

    on(eventName: string, callback) {
        this.ee.addListener(eventName, event => {
            if (event) {
                console.info("Event '" + eventName + "' triggered by 'Publisher'", event);
            } else {
                console.info("Event '" + eventName + "' triggered by 'Publisher'");
            }
            callback(event);
        });
        if (eventName == 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [{
                    element: this.stream.getVideoElement()
                }]);
            } else {
                this.stream.addOnceEventListener('video-element-created-by-stream', (element) => {
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [{
                        element: element.element
                    }]);
                });
            }
        }
        if (eventName == 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 && 
                video.paused == false && 
                video.ended == false &&
                video.readyState == 4) {
                    this.ee.emitEvent('videoPlaying', [{
                        element: this.stream.getVideoElement()
                    }]);
            } else {
                this.stream.addOnceEventListener('video-is-playing', (element) => {
                    this.ee.emitEvent('videoPlaying', [{
                        element: element.element
                    }]);
                });
            }
        }
        if (eventName == 'remoteVideoPlaying') {
            var video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 && 
                video.paused == false && 
                video.ended == false &&
                video.readyState == 4) {
                    this.ee.emitEvent('remoteVideoPlaying', [{
                        element: this.stream.getVideoElement()
                    }]);
            } else {
                this.stream.addOnceEventListener('remote-video-is-playing', (element) => {
                    this.ee.emitEvent('remoteVideoPlaying', [{
                        element: element.element
                    }]);
                });
            }
        }
        if (eventName == 'streamCreated') {
            if (this.stream.isReady) {
                this.ee.emitEvent('streamCreated', [{ stream: this.stream }]);
            } else {
                this.stream.addEventListener('stream-created-by-publisher', () => {
                    console.warn('Publisher emitting streamCreated');
                    this.ee.emitEvent('streamCreated', [{ stream: this.stream }]);
                });
            }
        }
        if (eventName == 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            } else {
                this.stream.addEventListener('access-allowed-by-publisher', () => {
                    this.ee.emitEvent('accessAllowed');
                });
            }
        }
        if (eventName == 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            } else {
                this.stream.addEventListener('access-denied-by-publisher', () => {
                    this.ee.emitEvent('accessDenied');
                });
            }
        }
    }
}