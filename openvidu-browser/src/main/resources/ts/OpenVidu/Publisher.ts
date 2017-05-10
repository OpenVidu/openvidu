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

        this.ee.on('camera-access-changed', (event) => {
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

    on(eventName: string, callback) {
        this.ee.addListener(eventName, event => {
            callback(event);
        });
        if (eventName == 'videoElementCreated') {
            if (this.stream.isReady) {
                this.ee.emitEvent('videoElementCreated', [{
                    element: this.stream.getVideoElement()
                }]);
            } else {
                this.stream.addEventListener('video-element-created-by-stream', element => {
                    console.warn("Publisher emitting videoElementCreated");
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [{
                        element: element
                    }]);
                });
            }
        }
    }
}