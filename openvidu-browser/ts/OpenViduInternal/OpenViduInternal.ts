/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { SessionInternal, SessionOptions } from './SessionInternal';
import { Connection } from './Connection';
import { OpenViduError, OpenViduErrorName } from './OpenViduError';
import { Stream, OutboundStreamOptions } from './Stream';
import * as RpcBuilder from '../KurentoUtils/kurento-jsonrpc';

export type Callback<T> = (error?: any, openVidu?: T) => void;

export class OpenViduInternal {

    private wsUri;
    private session: SessionInternal;
    private jsonRpcClient: any;
    private rpcParams: any;
    private callback: Callback<OpenViduInternal>;
    private localStream: Stream;
    private secret: string;
    private recorder: boolean = false;

    /* NEW METHODS */
    initSession(sessionId) {
        console.info("'Session' initialized with 'sessionId' [" + sessionId + "]");
        this.session = new SessionInternal(this, sessionId);
        return this.session;
    }

    initPublisherTagged(parentId: string, cameraOptions: OutboundStreamOptions, newStream: boolean, callback?: Function): Stream {

        if (newStream) {
            if (cameraOptions == null) {
                cameraOptions = {
                    sendAudio: true,
                    sendVideo: true,
                    activeAudio: true,
                    activeVideo: true,
                    dataChannel: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                }
            }
            this.localStream = new Stream(this, true, this.session, cameraOptions);
        }

        this.localStream.requestCameraAccess((error, localStream) => {
            if (error) {
                // Neither localStream or microphone device is allowed/able to capture media
                console.error(error);
                if (callback) {
                    callback(error);
                }
                this.localStream.ee.emitEvent('access-denied-by-publisher');
            } else {
                this.localStream.setVideoElement(this.cameraReady(localStream!, parentId));
                if (callback) {
                    callback(undefined);
                }
            }
        });
        return this.localStream;
    }

    initPublisherScreen(parentId: string, newStream: boolean, callback?): Stream {

        if (newStream) {
            this.localStream = new Stream(this, true, this.session, 'screen-options');
        }

        this.localStream.addOnceEventListener('can-request-screen', () => {
            this.localStream.requestCameraAccess((error, localStream) => {
                if (error) {
                    this.localStream.ee.emitEvent('access-denied-by-publisher');
                    let errorName: OpenViduErrorName = OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                    let errorMessage = 'You must allow access to one window of your desktop';
                    let e = new OpenViduError(errorName, errorMessage);
                    console.error(e);
                    if (callback) {
                        callback(e);
                    }
                }
                else {
                    this.localStream.setVideoElement(this.cameraReady(localStream!, parentId));
                    if (this.localStream.getSendAudio()) {
                        // If the user wants to send audio with the screen capturing
                        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                            .then(userStream => {
                                this.localStream.getMediaStream().addTrack(userStream.getAudioTracks()[0]);

                                // Mute audio if 'activeAudio' property is false
                                if (userStream.getAudioTracks()[0] != null) {
                                    userStream.getAudioTracks()[0].enabled = this.localStream.outboundOptions.activeAudio;
                                }

                                this.localStream.isScreenRequestedReady = true;
                                this.localStream.ee.emitEvent('screen-ready');
                                if (callback) {
                                    callback(undefined);
                                }
                            })
                            .catch(error => {
                                this.localStream.ee.emitEvent('access-denied-by-publisher');
                                console.error("Error accessing the microphone", error);
                                if (callback) {
                                    let errorName: OpenViduErrorName = OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                                    let errorMessage = error.toString();
                                    callback(new OpenViduError(errorName, errorMessage));
                                }
                            });
                    } else {
                        this.localStream.isScreenRequestedReady = true;
                        this.localStream.ee.emitEvent('screen-ready');
                        if (callback) {
                            callback(undefined);
                        }
                    }
                }
            });
        });
        return this.localStream;
    }

    cameraReady(localStream: Stream, parentId: string) {
        this.localStream = localStream;
        let videoElement = this.localStream.playOnlyVideo(parentId, null);
        this.localStream.emitStreamReadyEvent();
        return videoElement;
    }

    getLocalStream() {
        return this.localStream;
    }

    /* NEW METHODS */

    getWsUri() {
        return this.wsUri;
    }

    setWsUri(wsUri: string) {
        this.wsUri = wsUri;
    }

    getSecret() {
        return this.secret;
    }

    setSecret(secret: string) {
        this.secret = secret;
    }

    getRecorder() {
        return this.recorder;
    }

    setRecorder(recorder: boolean) {
        this.recorder = recorder;
    }

    getOpenViduServerURL() {
        return 'https://' + this.wsUri.split("wss://")[1].split("/room")[0];
    }

    getRoom() {
        return this.session;
    }

    connect(callback: Callback<OpenViduInternal>): void {

        this.callback = callback;

        this.initJsonRpcClient(this.wsUri);
    }

    private initJsonRpcClient(wsUri: string): void {

        let config = {
            heartbeat: 3000,
            sendCloseMessage: false,
            ws: {
                uri: wsUri,
                useSockJS: false,
                onconnected: this.connectCallback.bind(this),
                ondisconnect: this.disconnectCallback.bind(this),
                onreconnecting: this.reconnectingCallback.bind(this),
                onreconnected: this.reconnectedCallback.bind(this)
            },
            rpc: {
                requestTimeout: 15000,
                //notifications
                participantJoined: this.onParticipantJoined.bind(this),
                participantPublished: this.onParticipantPublished.bind(this),
                participantUnpublished: this.onParticipantUnpublished.bind(this),
                participantLeft: this.onParticipantLeft.bind(this),
                participantEvicted: this.onParticipantEvicted.bind(this),
                sendMessage: this.onNewMessage.bind(this),
                iceCandidate: this.iceCandidateEvent.bind(this),
                mediaError: this.onMediaError.bind(this),
            }
        };

        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    }

    private connectCallback(error) {
        if (error) {
            this.callback(error);
        } else {
            this.callback(null);
        }
    }

    private isRoomAvailable() {
        if (this.session !== undefined && this.session instanceof SessionInternal) {
            return true;
        } else {
            console.warn('Session instance not found');
            return false;
        }
    }

    private disconnectCallback() {
        console.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    private reconnectingCallback() {
        console.warn('Websocket connection lost (reconnecting)');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    private reconnectedCallback() {
        console.warn('Websocket reconnected');
    }

    private onParticipantJoined(params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantJoined(params);
        }
    }

    private onParticipantPublished(params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantPublished(params);
        }
    }

    private onParticipantUnpublished(params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantUnpublished(params);
        }
    }

    private onParticipantLeft(params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantLeft(params);
        }
    }

    private onParticipantEvicted(params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantEvicted(params);
        }
    }

    private onNewMessage(params) {
        if (this.isRoomAvailable()) {
            this.session.onNewMessage(params);
        }
    }

    private iceCandidateEvent(params) {
        if (this.isRoomAvailable()) {
            this.session.recvIceCandidate(params);
        }
    }

    private onRoomClosed(params) {
        if (this.isRoomAvailable()) {
            this.session.onRoomClosed(params);
        }
    }

    private onMediaError(params) {
        if (this.isRoomAvailable()) {
            this.session.onMediaError(params);
        }
    }


    setRpcParams(params: any) {
        this.rpcParams = params;
    }

    sendRequest(method, params, callback?) {

        if (params && params instanceof Function) {
            callback = params;
            params = undefined;
        }

        params = params || {};

        if (this.rpcParams && this.rpcParams !== null && this.rpcParams !== undefined) {
            for (let index in this.rpcParams) {
                if (this.rpcParams.hasOwnProperty(index)) {
                    params[index] = this.rpcParams[index];
                    console.debug('RPC param added to request {' + index + ': ' + this.rpcParams[index] + '}');
                }
            }
        }

        console.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');

        this.jsonRpcClient.send(method, params, callback);
    }

    close(forced) {
        if (this.isRoomAvailable()) {
            this.session.leave(forced, this.jsonRpcClient);
        }
    };

    disconnectParticipant(stream) {
        if (this.isRoomAvailable()) {
            this.session.disconnect(stream);
        }
    }

    sendMessage(message: any, completionHandler?: Function) {
        this.sendRequest('sendMessage', {
            message: message
        }, (error, response) => {
            if (!!completionHandler) {
                completionHandler(!!error ? new Error(error) : null);
            }
        });
    };

    generateMediaConstraints(cameraOptions: any) {
        let mediaConstraints = {
            audio: cameraOptions.audio,
            video: {}
        }
        if (!cameraOptions.video) {
            mediaConstraints.video = false
        } else {
            let w, h;
            switch (cameraOptions.quality) {
                case 'LOW':
                    w = 320;
                    h = 240;
                    break;
                case 'MEDIUM':
                    w = 640;
                    h = 480;
                    break;
                case 'HIGH':
                    w = 1280;
                    h = 720;
                    break;
                default:
                    w = 640;
                    h = 480;
            }
            mediaConstraints.video['width'] = { exact: w };
            mediaConstraints.video['height'] = { exact: h };
            //mediaConstraints.video['frameRate'] = { ideal: Number((<HTMLInputElement>document.getElementById('frameRate')).value) };
        }
        return mediaConstraints;
    }

}
