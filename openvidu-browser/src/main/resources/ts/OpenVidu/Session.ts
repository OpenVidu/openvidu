import { SessionInternal, SessionOptions } from '../OpenViduInternal/SessionInternal';
import { Stream } from '../OpenViduInternal/Stream';
import { Connection } from "../OpenViduInternal/Connection";

import { OpenVidu } from './OpenVidu';
import { Publisher} from './Publisher';
import { Subscriber } from './Subscriber';

import EventEmitter = require('wolfy87-eventemitter');

export class Session {

    sessionId: String;
    //capabilities: Capabilities
    connection: Connection;

    private ee = new EventEmitter();

    constructor(private session: SessionInternal, private openVidu: OpenVidu) {
        this.sessionId = session.getSessionId();

        // Listens to the deactivation of the default behaviour upon the deletion of a Stream object
        this.session.addEventListener('stream-removed-default', event => {
            event.stream.removeVideo();
        });

        // Sets or updates the value of 'connection' property. Triggered by SessionInternal when succesful connection
        this.session.addEventListener('update-connection-object', event => {
            this.connection = event.connection;
        });
    }

    connect(token: string, callback: any);
    connect(token:string, metadata: string, callback: any);
    
    connect(param1, param2, param3?) {
        // Early configuration to deactivate automatic subscription to streams
        if (typeof param2 == "string") {
            this.session.configure({
                sessionId: this.session.getSessionId(),
                participantId: param1,
                metadata: param2,
                subscribeToStreams: false
            });
            this.session.connect(param1, param3);
        } else {
            this.session.configure({
                sessionId: this.session.getSessionId(),
                participantId: param1,
                metadata: '',
                subscribeToStreams: false
            });
            this.session.connect(param1, param2);
        }
    }

    disconnect() {
        this.openVidu.openVidu.close(false);
    }

    publish(publisher: Publisher) {
        publisher.session = this;
        publisher.stream.publish();
    }

    unpublish(publisher: Publisher) {
        this.session.unpublish(publisher.stream);
    }

    on(eventName: string, callback) {
        let realEventName = '';
        switch (eventName) {
            case 'streamCreated':
                realEventName = 'stream-added';
                break;
            case 'streamDestroyed':
                realEventName = 'stream-removed';
                break;
        }
        if (realEventName != '') {
            this.session.addEventListener(realEventName, event => {
                callback(event);
            });
        } else {
            this.session.addEventListener(eventName, event => {
                callback(event);
            });
        }
    }

    once(eventName: string, callback) {
        let realEventName = '';
        switch (eventName) {
            case 'streamCreated':
                realEventName = 'stream-added';
                break;
            case 'streamDestroyed':
                realEventName = 'stream-removed';
                break;
        }
        if (realEventName != '') {
            this.session.addOnceEventListener(realEventName, event => {
                callback(event);
            });
        } else {
            this.session.addOnceEventListener(eventName, event => {
                callback(event);
            });
        }
    }

    off(eventName: string, eventHandler) {
        let realEventName = '';
        switch (eventName) {
            case 'streamCreated':
                realEventName = 'stream-added';
                break;
            case 'streamDestroyed':
                realEventName = 'stream-removed';
                break;
        }
        if (realEventName != '') {
            this.session.removeListener(realEventName, eventHandler);
        } else {
            this.session.removeListener(eventName, eventHandler);
        }
    }

    subscribe(stream: Stream, htmlId: string, videoOptions: any): Subscriber;
    subscribe(stream: Stream, htmlId: string): Subscriber;
    
    subscribe(param1, param2, param3?): Subscriber {
        // Subscription
        this.session.subscribe(param1);
        let subscriber = new Subscriber(param1, param2);
        param1.playOnlyVideo(param2, null);
        return subscriber;
    }

    unsubscribe(subscriber: Subscriber) {
        this.session.unsuscribe(subscriber.stream);
        subscriber.stream.removeVideo();
    }




    /* Shortcut event API */

    onStreamCreated(callback) {
        this.session.addEventListener("stream-added", streamEvent => {
            callback(streamEvent.stream);
        });
    }

    onStreamDestroyed(callback) {
        this.session.addEventListener("stream-removed", streamEvent => {
            callback(streamEvent.stream);
        });
    }

    onParticipantJoined(callback) {
        this.session.addEventListener("participant-joined", participantEvent => {
            callback(participantEvent.participant);
        });
    }

    onParticipantLeft(callback) {
        this.session.addEventListener("participant-left", participantEvent => {
            callback(participantEvent.participant);
        });
    }

    onParticipantPublished(callback) {
        this.session.addEventListener("participant-published", participantEvent => {
            callback(participantEvent.participant);
        });
    }

    onParticipantEvicted(callback) {
        this.session.addEventListener("participant-evicted", participantEvent => {
            callback(participantEvent.participant);
        });
    }

    onRoomClosed(callback) {
        this.session.addEventListener("room-closed", roomEvent => {
            callback(roomEvent.room);
        });
    }

    onLostConnection(callback) {
        this.session.addEventListener("lost-connection", roomEvent => {
            callback(roomEvent.room);
        });
    }

    onMediaError(callback) {
        this.session.addEventListener("error-media", errorEvent => {
            callback(errorEvent.error)
        });
    }

    /* Shortcut event API */
}
