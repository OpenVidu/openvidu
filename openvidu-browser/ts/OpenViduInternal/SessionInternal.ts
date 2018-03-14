import { Stream, StreamOptionsServer } from './Stream';
import { OpenViduInternal } from './OpenViduInternal';
import { Connection, ConnectionOptions } from './Connection';
import { Publisher } from '../OpenVidu/Publisher';

import EventEmitter = require('wolfy87-eventemitter');

type ObjMap<T> = { [s: string]: T; }

const SECRET_PARAM = '?secret=';
const RECORDER_PARAM = '&recorder=';

export interface SessionOptions {
    sessionId: string;
    participantId: string;
    metadata: string;
    subscribeToStreams?: boolean;
    updateSpeakerInterval?: number;
    thresholdSpeaker?: number;
}

export interface SignalOptions {
    type?: string;
    to?: Connection[];
    data?: string;
}

export class SessionInternal {

    private id: string;
    private sessionId: string;
    private ee = new EventEmitter();
    private remoteStreams: ObjMap<Stream> = {};
    private participants = {};
    private publishersSpeaking: Connection[] = [];
    private connected = false;
    public localParticipant: Connection;
    private subscribeToStreams: boolean;
    private updateSpeakerInterval: number;
    public thresholdSpeaker: number;
    private options: SessionOptions;

    constructor(private openVidu: OpenViduInternal, sessionId: string) {
        this.sessionId = this.getUrlWithoutSecret(sessionId);
        this.localParticipant = new Connection(this.openVidu, true, this);
        if (!this.openVidu.getWsUri() && !!sessionId) {
            this.processOpenViduUrl(sessionId);
        }
    }

    private processOpenViduUrl(url: string) {
        let secret = this.getSecretFromUrl(url);
        let recorder = this.getRecorderFromUrl(url);
        if (!(secret == null)) {
            this.openVidu.setSecret(secret);
        }
        if (!(recorder == null)) {
            this.openVidu.setRecorder(recorder);
        }
        this.openVidu.setWsUri(this.getFinalUrl(url));
    }

    private getSecretFromUrl(url: string): string {
        let secret = '';
        if (url.indexOf(SECRET_PARAM) !== -1) {
            let endOfSecret = url.lastIndexOf(RECORDER_PARAM);
            if (endOfSecret !== -1) {
                secret = url.substring(url.lastIndexOf(SECRET_PARAM) + SECRET_PARAM.length, endOfSecret);
            } else {
                secret = url.substring(url.lastIndexOf(SECRET_PARAM) + SECRET_PARAM.length, url.length);
            }
        }
        return secret;
    }

    private getRecorderFromUrl(url: string): boolean {
        let recorder = '';
        if (url.indexOf(RECORDER_PARAM) !== -1) {
            recorder = url.substring(url.lastIndexOf(RECORDER_PARAM) + RECORDER_PARAM.length, url.length);
        }
        return new Boolean(recorder).valueOf();;
    }

    private getUrlWithoutSecret(url: string): string {
        if (!url) {
            console.error('sessionId is not defined');
        }
        if (url.indexOf(SECRET_PARAM) !== -1) {
            url = url.substring(0, url.lastIndexOf(SECRET_PARAM));
        }
        return url;
    }

    private getFinalUrl(url: string): string {
        url = this.getUrlWithoutSecret(url).substring(0, url.lastIndexOf('/')) + '/room';
        if (url.indexOf(".ngrok.io") !== -1) {
            // OpenVidu server URL referes to a ngrok IP: secure wss protocol and delete port of URL
            url = url.replace("ws://", "wss://");
            let regex = /\.ngrok\.io:\d+/;
            url = url.replace(regex, ".ngrok.io");
        } else if ((url.indexOf("localhost") !== -1) || (url.indexOf("127.0.0.1") != -1)) {
            // OpenVidu server URL referes to localhost IP

        }
        return url;
    }



    /* NEW METHODS */
    connect(token, callback) {

        this.openVidu.connect((error) => {
            if (error) {
                callback('ERROR CONNECTING TO OPENVIDU');
            }
            else {

                if (!token) {
                    token = this.randomToken();
                }

                let joinParams = {
                    token: token,
                    session: this.sessionId,
                    metadata: this.options.metadata,
                    secret: this.openVidu.getSecret(),
                    recorder: this.openVidu.getRecorder(),
                    dataChannels: false
                }

                if (this.localParticipant) {
                    if (Object.keys(this.localParticipant.getStreams()).some(streamId =>
                        this.remoteStreams[streamId].isDataChannelEnabled())) {
                        joinParams.dataChannels = true;
                    }
                }

                this.openVidu.sendRequest('joinRoom', joinParams, (error, response) => {

                    if (error) {
                        callback(error);
                    } else {

                        this.connected = true;

                        let exParticipants: ConnectionOptions[] = response.value;

                        // IMPORTANT: Update connectionId with value send by server
                        this.localParticipant.connectionId = response.id;
                        this.participants[response.id] = this.localParticipant;

                        let roomEvent = {
                            participants: new Array<Connection>(),
                            streams: new Array<Stream>()
                        }

                        let length = exParticipants.length;
                        for (let i = 0; i < length; i++) {

                            let connection = new Connection(this.openVidu, false, this,
                                exParticipants[i]);
                            connection.creationTime = new Date().getTime();

                            this.participants[connection.connectionId] = connection;

                            roomEvent.participants.push(connection);

                            let streams = connection.getStreams();
                            for (let key in streams) {
                                roomEvent.streams.push(streams[key]);
                                if (this.subscribeToStreams) {
                                    streams[key].subscribe();
                                }
                            }
                        }

                        // Update local Connection object properties with values returned by server
                        this.localParticipant.data = response.metadata;
                        this.localParticipant.creationTime = new Date().getTime();

                        // Updates the value of property 'connection' in Session object
                        this.ee.emitEvent('update-connection-object', [{ connection: this.localParticipant }]);
                        // Own connection created event
                        this.ee.emitEvent('connectionCreated', [{ connection: this.localParticipant }]);

                        // One connection created event for each existing connection in the session
                        for (let part of roomEvent.participants) {
                            this.ee.emitEvent('connectionCreated', [{ connection: part }]);
                        }

                        //if (this.subscribeToStreams) {
                        for (let stream of roomEvent.streams) {
                            this.ee.emitEvent('streamCreated', [{ stream }]);

                            // Store the remote stream
                            this.remoteStreams[stream.streamId] = stream;
                        }

                        callback(undefined);
                    }
                });
            }
        });
    }
    /* NEW METHODS */





    configure(options: SessionOptions) {
        this.options = options;
        this.id = options.sessionId;
        this.subscribeToStreams = options.subscribeToStreams == null ? true : options.subscribeToStreams;
        this.updateSpeakerInterval = options.updateSpeakerInterval || 1500;
        this.thresholdSpeaker = options.thresholdSpeaker || -50;
        this.activateUpdateMainSpeaker();

        if (!this.openVidu.getWsUri()) {
            this.processOpenViduUrl(options.sessionId);
        }
    }

    getId() {
        return this.id;
    }

    getSessionId() {
        return this.sessionId;
    }

    private activateUpdateMainSpeaker() {

        /*setInterval(() => {
            if (this.publishersSpeaking.length > 0) {
                this.ee.emitEvent('publisherStartSpeaking', [{
                    participantId: this.publishersSpeaking[this.publishersSpeaking.length - 1]
                }]);
            }
        }, this.updateSpeakerInterval);*/
    }

    getLocalParticipant() {
        return this.localParticipant;
    }

    addEventListener(eventName, listener) {
        this.ee.on(eventName, listener);
    }

    addOnceEventListener(eventName, listener) {
        this.ee.once(eventName, listener);
    }

    removeListener(eventName, listener) {
        this.ee.off(eventName, listener);
    }

    removeEvent(eventName) {
        this.ee.removeEvent(eventName);
    }

    emitEvent(eventName, eventsArray) {
        this.ee.emitEvent(eventName, eventsArray);
    }


    subscribe(stream: Stream) {
        stream.subscribe();
    }

    unsubscribe(stream: Stream) {
        console.info("Unsubscribing from " + stream.connection.connectionId);
        this.openVidu.sendRequest('unsubscribeFromVideo', {
            sender: stream.connection.connectionId
        },
            (error, response) => {
                if (error) {
                    console.error("Error unsubscribing from Subscriber", error);
                } else {
                    console.info("Unsubscribed correctly from " + stream.connection.connectionId);
                }
                stream.dispose();
            });
    }

    onParticipantPublished(response: ConnectionOptions) {

        // Get the existing Connection created on 'onParticipantJoined' for
        // existing participants or create a new one for new participants
        let connection: Connection = this.participants[response.id];
        if (connection != null) {
            // Update existing Connection
            response.metadata = connection.data;
            connection.setOptions(response);
            connection.initRemoteStreams(response);
        } else {
            // Create new Connection
            connection = new Connection(this.openVidu, false, this, response);
        }

        let pid = connection.connectionId;
        if (!(pid in this.participants)) {
            console.debug("Remote Connection not found in connections list by its id [" + pid + "]");
        } else {
            console.debug("Remote Connection found in connections list by its id [" + pid + "]");
        }

        this.participants[pid] = connection;

        let streams = connection.getStreams();
        for (let key in streams) {
            let stream = streams[key];

            if (!this.remoteStreams[stream.streamId]) {
                // Avoid race condition between stream.subscribe() in "onParticipantPublished" and in "joinRoom" rpc callback
                // This condition is false if openvidu-server sends "participantPublished" event to a subscriber participant that has
                // already subscribed to certain stream in the callback of "joinRoom" method

                if (this.subscribeToStreams) {
                    stream.subscribe();
                }
                this.ee.emitEvent('streamCreated', [{ stream }]);

                // Store the remote stream
                this.remoteStreams[stream.streamId] = stream;

           }
        }
    }

    onParticipantUnpublished(msg) {
        let connection: Connection = this.participants[msg.name];

        if (connection !== undefined) {

            let streams = connection.getStreams();
            for (let key in streams) {
                this.ee.emitEvent('streamDestroyed', [{
                    stream: streams[key],
                    preventDefault: () => { this.ee.removeEvent('stream-destroyed-default'); }
                }]);
                this.ee.emitEvent('stream-destroyed-default', [{
                    stream: streams[key]
                }]);

                // Deleting the remote stream
                let streamId: string = streams[key].streamId;
                let stream: Stream = this.remoteStreams[streamId];

                stream.dispose();
                delete this.remoteStreams[stream.streamId];
                connection.removeStream(stream.streamId);

            }
        } else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: "
                + JSON.stringify(this.participants));
        }
    }

    onParticipantJoined(response: ConnectionOptions) {

        let connection = new Connection(this.openVidu, false, this, response);
        connection.creationTime = new Date().getTime();

        let pid = connection.connectionId;
        if (!(pid in this.participants)) {
            this.participants[pid] = connection;
        } else {
            //use existing so that we don't lose streams info
            console.warn("Connection already exists in connections list with " +
                "the same connectionId, old:", this.participants[pid], ", joined now:", connection);
            connection = this.participants[pid];
        }

        this.ee.emitEvent('participant-joined', [{
            connection: connection
        }]);

        this.ee.emitEvent('connectionCreated', [{
            connection: connection
        }]);

    }

    onParticipantLeft(msg) {

        let connection: Connection = this.participants[msg.name];

        if (connection !== undefined) {

            this.ee.emitEvent('participant-left', [{
                connection: connection
            }]);

            let streams = connection.getStreams();
            for (let key in streams) {
                this.ee.emitEvent('streamDestroyed', [{
                    stream: streams[key],
                    preventDefault: () => { this.ee.removeEvent('stream-destroyed-default'); }
                }]);
                this.ee.emitEvent('stream-destroyed-default', [{
                    stream: streams[key]
                }]);

                // Deleting the remote stream
                let streamId: string = streams[key].streamId;
                delete this.remoteStreams[streamId];
            }

            connection.dispose();

            delete this.participants[msg.name];

            this.ee.emitEvent('connectionDestroyed', [{
                connection: connection
            }]);

        } else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: "
                + JSON.stringify(this.participants));
        }
    };

    onParticipantEvicted(msg) {
        this.ee.emitEvent('participant-evicted', [{
            localParticipant: this.localParticipant
        }]);
    };

    onNewMessage(msg) {

        console.info("New signal: " + JSON.stringify(msg));

        this.ee.emitEvent('signal', [{
            data: msg.data,
            from: this.participants[msg.from],
            type: msg.type
        }]);

        this.ee.emitEvent('signal:' + msg.type, [{
            data: msg.data,
            from: this.participants[msg.from],
            type: msg.type
        }]);

    }

    recvIceCandidate(msg) {

        let candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex
        }

        let connection = this.participants[msg.endpointName];
        if (!connection) {
            console.error("Participant not found for endpoint " +
                msg.endpointName + ". Ice candidate will be ignored.",
                candidate);
            return;
        }

        let streams = connection.getStreams();
        for (let key in streams) {
            let stream = streams[key];
            stream.getWebRtcPeer().addIceCandidate(candidate, function (error) {
                if (error) {
                    console.error("Error adding candidate for " + key
                        + " stream of endpoint " + msg.endpointName
                        + ": " + error);
                }
            });
        }
    }

    onRoomClosed(msg) {

        console.info("Session closed: " + JSON.stringify(msg));
        let room = msg.room;
        if (room !== undefined) {
            this.ee.emitEvent('room-closed', [{
                room: room
            }]);
        } else {
            console.warn("Session undefined on session closed", msg);
        }
    }

    onLostConnection() {

        if (!this.connected) {
            console.warn('Not connected to session: if you are not debugging, this is probably a certificate error');
            if (window.confirm('If you are not debugging, this is probably a certificate error at \"' + this.openVidu.getOpenViduServerURL() + '\"\n\nClick OK to navigate and accept it')) {
                location.assign(this.openVidu.getOpenViduServerURL() + '/accept-certificate');
            };
            return;
        }

        console.warn('Lost connection in Session ' + this.id);
        let room = this.id;
        if (room !== undefined) {
            this.ee.emitEvent('lost-connection', [{ room }]);
        } else {
            console.warn('Session undefined when lost connection');
        }
    }

    onMediaError(params) {

        console.error("Media error: " + JSON.stringify(params));
        let error = params.error;
        if (error) {
            this.ee.emitEvent('error-media', [{
                error: error
            }]);
        } else {
            console.warn("Received undefined media error. Params:", params);
        }
    }

    /*
     * forced means the user was evicted, no need to send the 'leaveRoom' request
     */
    leave(forced, jsonRpcClient) {

        forced = !!forced;

        console.info("Leaving Session (forced=" + forced + ")");

        if (this.connected && !forced) {
            this.openVidu.sendRequest('leaveRoom', function (error, response) {
                if (error) {
                    console.error(error);
                }
                jsonRpcClient.close();
            });
        } else {
            jsonRpcClient.close();
        }
        this.connected = false;
        if (this.participants) {
            for (let pid in this.participants) {
                this.participants[pid].dispose();
                delete this.participants[pid];
            }
        }
    }

    disconnect(stream: Stream) {

        let connection = stream.getParticipant();
        if (!connection) {
            console.error("Stream to disconnect has no participant", stream);
            return;
        }

        delete this.participants[connection.connectionId];
        connection.dispose();

        if (connection === this.localParticipant) {

            console.info("Unpublishing my media (I'm " + connection.connectionId + ")");
            delete this.localParticipant;
            this.openVidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.info("Media unpublished correctly");
                }
            });

        } else {
            this.unsubscribe(stream);
        }
    }

    unpublish(publisher: Publisher) {

        let stream = publisher.stream;

        if (!stream.connection) {
            console.error("The associated Connection object of this Publisher is null", stream);
            return;
        } else if (stream.connection !== this.localParticipant) {
            console.error("The associated Connection object of this Publisher is not your local Connection." +
                "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method", stream);
            return;
        } else {
            stream.dispose();

            console.info("Unpublishing local media (" + stream.connection.connectionId + ")");

            this.openVidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.info("Media unpublished correctly");
                }
            });

            stream.isReadyToPublish = false;
            stream.isScreenRequestedReady = false;

            delete stream.connection.getStreams()[stream.streamId];

            publisher.ee.emitEvent('streamDestroyed', [{
                stream: publisher.stream,
                preventDefault: () => { this.ee.removeEvent('stream-destroyed-default'); }
            }]);
            publisher.ee.emitEvent('stream-destroyed-default', [{
                stream: publisher.stream
            }]);
        }
    }

    getRemoteStreams() {
        return this.remoteStreams;
    }

    addParticipantSpeaking(participantId) {
        this.publishersSpeaking.push(participantId);
        this.ee.emitEvent('publisherStartSpeaking', [{
            participantId: participantId
        }]);
    }

    removeParticipantSpeaking(participantId) {
        let pos = -1;
        for (let i = 0; i < this.publishersSpeaking.length; i++) {
            if (this.publishersSpeaking[i] == participantId) {
                pos = i;
                break;
            }
        }
        if (pos != -1) {
            this.publishersSpeaking.splice(pos, 1);
            this.ee.emitEvent('publisherStopSpeaking', [{
                participantId: participantId
            }]);
        }
    }

    stringClientMetadata(metadata): string {
        if (!(typeof metadata === 'string')) {
            return JSON.stringify(metadata);
        } else {
            return metadata;
        }
    }

    private randomToken(): string {
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }

}
