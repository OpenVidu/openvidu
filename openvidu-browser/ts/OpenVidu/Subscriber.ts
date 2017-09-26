import { Stream, StreamOptions, VideoOptions } from '../OpenViduInternal/Stream';

import EventEmitter = require('wolfy87-eventemitter');

export class Subscriber {

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
            if (event) {
                console.info("Event '" + eventName + "' triggered by 'Subscriber'", event);
            } else {
                console.info("Event '" + eventName + "' triggered by 'Subscriber'");
            }
            callback(event);
        });
        if (eventName == 'videoElementCreated') {
            if (this.stream.isReady) {
                this.ee.emitEvent('videoElementCreated', [{
                    element: this.stream.getVideoElement()
                }]);
            } else {
                this.stream.addOnceEventListener('video-element-created-by-stream', element => {
                    console.warn("Subscriber emitting videoElementCreated");
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [{
                        element: element
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
    }
}