import { Stream, StreamOptions, VideoOptions } from '../OpenVidu/Stream';
import { OpenViduTokBox } from './OpenViduTokBox';
import { SessionTokBox } from './SessionTokBox';

import EventEmitter = require('wolfy87-eventemitter');

export class SubscriberTokBox {

    private ee = new EventEmitter();

    element: Element;
    id: string;
    stream: Stream;

    constructor(stream: Stream, parentId: string) {
        this.stream = stream;
        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId)!!;
        }
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
                    console.warn("Subscriber emitting videoElementCreated");
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [{
                        element: element
                    }]);
                });
            }
        }
    }
}