import { SessionInternal, SessionOptions } from '../OpenViduInternal/SessionInternal';
import { Stream } from '../OpenViduInternal/Stream';
import { Connection } from "../OpenViduInternal/Connection";

import { OpenVidu } from './OpenVidu';
import { Publisher } from './Publisher';
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
        this.session.addEventListener('stream-destroyed-default', event => {
            event.stream.removeVideo();
        });

        // Listens to the deactivation of the default behaviour upon the disconnection of a Session
        this.session.addEventListener('session-disconnected-default', () => {
            let s: Stream;
            for (s of this.openVidu.openVidu.getRemoteStreams()) {
                s.removeVideo();
            }
            if (this.connection) {
                for (let streamId in this.connection.getStreams()) {
                    this.connection.getStreams()[streamId].removeVideo();
                }
            }
        });

        // Sets or updates the value of 'connection' property. Triggered by SessionInternal when succesful connection
        this.session.addEventListener('update-connection-object', event => {
            this.connection = event.connection;
        });
    }

    connect(token: string, callback: any);
    connect(token: string, metadata: any, callback: any);

    connect(param1, param2, param3?) {
        // Early configuration to deactivate automatic subscription to streams
        if (param3) {
            this.session.configure({
                sessionId: this.session.getSessionId(),
                participantId: param1,
                metadata: this.session.stringClientMetadata(param2),
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
        this.session.emitEvent('sessionDisconnected', [{
            preventDefault: () => { this.session.removeEvent('session-disconnected-default'); }
        }]);
        this.session.emitEvent('session-disconnected-default', [{}]);
    }

    publish(publisher: Publisher) {
        if (publisher.isScreenRequested && !publisher.stream.isScreenRequestedReady) {
            publisher.stream.addOnceEventListener('screen-ready', () => {
                publisher.session = this;
                publisher.stream.publish();
            });
        } else {
            publisher.session = this;
            publisher.stream.publish();
        }
    }

    unpublish(publisher: Publisher) {
        this.session.unpublish(publisher.stream);
    }

    on(eventName: string, callback) {
        this.session.addEventListener(eventName, event => {
            if (event) {
                console.info("Event '" + eventName + "' triggered by 'Session'", event);
            } else {
                console.info("Event '" + eventName + "' triggered by 'Session'");
            }
            callback(event);
        });
    }

    once(eventName: string, callback) {
        this.session.addOnceEventListener(eventName, event => {
            callback(event);
        });
    }

    off(eventName: string, eventHandler) {
        this.session.removeListener(eventName, eventHandler);
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

}
