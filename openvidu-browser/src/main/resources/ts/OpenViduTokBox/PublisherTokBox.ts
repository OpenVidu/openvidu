/*
 * options: name: XXX data: true (Maybe this is based on webrtc) audio: true,
 * video: true, url: "file:///..." > Player screen: true > Desktop (implicit
 * video:true, audio:false) audio: true, video: true > Webcam
 *
 * stream.hasAudio(); stream.hasVideo(); stream.hasData();
 */
import { Stream, StreamOptions, VideoOptions } from '../OpenVidu/Stream';
import { OpenViduTokBox } from './OpenViduTokBox';
import { SessionTokBox } from './SessionTokBox';

import EventEmitter = require('wolfy87-eventemitter');

export class PublisherTokBox {

    private ee = new EventEmitter();

    accessAllowed = false;
    element: Element;
    id: string;
    stream: Stream;
    session: SessionTokBox;

    constructor(stream: Stream, parentId: string) {
        this.accessAllowed = false;

        this.ee.on('camera-access-changed', (event) => {
            this.accessAllowed = event.accessAllowed;
            if (this.accessAllowed) {
                this.ee.emitEvent('accessAllowed');
            } else {
                this.ee.emitEvent('accessDenied');
            }
        });

        this.stream = stream;
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

}
