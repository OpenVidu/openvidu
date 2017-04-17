import { Stream, StreamOptions, VideoOptions } from '../OpenVidu/Stream';
import { OpenViduTokBox } from './OpenViduTokBox';
import { SessionTokBox } from './SessionTokBox';

export class SubscriberTokBox {

    element: Element;
    id: string;
    stream: Stream;

    constructor(stream: Stream, parentId: string) {
        this.stream = stream;
        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId)!!;
        }
    }
}