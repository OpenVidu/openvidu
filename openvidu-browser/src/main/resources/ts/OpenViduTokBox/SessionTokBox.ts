import { Session, SessionOptions } from '../OpenVidu/Session';
import { Stream } from '../OpenVidu/Stream';

import { OpenViduTokBox } from './OpenViduTokBox';
import { PublisherTokBox } from './PublisherTokBox';
import { SubscriberTokBox } from './SubscriberTokBox';

export class SessionTokBox {

    //capabilities: Capabilities
    //connection: Connection
    sessionId: String;

    constructor(private session: Session, private openVidu: OpenViduTokBox) {
        this.sessionId = session.getSessionId();
        this.session.addEventListener('stream-removed-default', event => {
            event.stream.removeVideo();
        });
    }

    connect(token, callback) {
        // Early configuration to deactivate automatic subscription to streams
        this.session.configure({
            sessionId: this.session.getSessionId(),
            participantId: token,
            subscribeToStreams: false
        });
        this.session.connect(token, callback);
    }

    disconnect() {
        this.openVidu.openVidu.close(false);
    }

    publish(publisher: PublisherTokBox) {
        publisher.session = this;
        publisher.stream.publish();
    }

    unpublish(publisher: PublisherTokBox) {
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

    subscribe(stream: Stream, htmlId: string, videoOptions: any): SubscriberTokBox;
    subscribe(stream: Stream, htmlId: string): SubscriberTokBox;
    
    subscribe(param1, param2, param3?): SubscriberTokBox {
        // Subscription
        this.session.subscribe(param1);
        let subscriber = new SubscriberTokBox(param1, param2);
        param1.playOnlyVideo(param2, null);
        return subscriber;
    }

    unsubscribe(subscriber: SubscriberTokBox) {
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
