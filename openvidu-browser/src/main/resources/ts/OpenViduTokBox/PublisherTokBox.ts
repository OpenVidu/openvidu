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

export class PublisherTokBox {

    stream: Stream;

    constructor(stream: Stream) {
        this.stream = stream;
    }

    publishAudio(value: boolean) {
        this.stream.getWebRtcPeer().audioEnabled = value;
    }

    publishVideo(value: boolean) {
         this.stream.getWebRtcPeer().videoEnabled = value;
    }
    
}
