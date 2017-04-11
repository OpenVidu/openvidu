import { Session, SessionOptions } from '../OpenVidu/Session';
import { Stream } from '../OpenVidu/Stream';

import { OpenViduTokBox } from './OpenViduTokBox';
import { PublisherTokBox } from './PublisherTokBox';

export class SessionTokBox {

    constructor(private session: Session, private openVidu: OpenViduTokBox) { }

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
        publisher.stream.publish();
    }

    unpublish(publisher: PublisherTokBox) {
        this.session.unpublish(publisher.stream);
    }

    on(eventName: string, callback) {
        let realEventName = '';
        switch (eventName) {
            case 'streamCreated':
                realEventName = 'stream-added'
                break;
            case 'streamDestroyed':
                realEventName = 'stream-removed'
                break;
        }
        if (realEventName != '') {
            this.session.addEventListener(realEventName, event => {
                callback(event);
            });
        } else {
            console.warn("That is not a supported event!");
        }
    }

    subscribe(stream: Stream, htmlId: string, videoOptions: any);
    subscribe(stream: Stream, htmlId: string);
    
    subscribe(param1, param2, param3?) {
        // Subscription
        this.session.subscribe(param1);
        param1.playOnlyVideo(param2, null);
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
