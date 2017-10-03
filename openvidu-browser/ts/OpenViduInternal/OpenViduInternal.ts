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
import { Stream } from './Stream';
import * as RpcBuilder from '../KurentoUtils/kurento-jsonrpc';

export type Callback<T> = (error?: any, openVidu?: T) => void;

export class OpenViduInternal {

    private wsUri;
    private session: SessionInternal;
    private jsonRpcClient: any;
    private rpcParams: any;
    private callback: Callback<OpenViduInternal>;
    private camera: Stream;
    private remoteStreams: Stream[] = [];

    private secret: string;

    constructor() { };


    /* NEW METHODS */
    initSession(sessionId) {
        console.info("'Session' initialized with 'sessionId' [" + sessionId + "]");
        this.session = new SessionInternal(this, sessionId);
        return this.session;
    }

    initPublisherTagged(parentId: string, cameraOptions: any, callback?: Function): Stream {

        this.getCamera(cameraOptions);

        this.camera.requestCameraAccess((error, camera) => {
            if (error) {
                console.error("Error accessing the camera", error);
                if (callback) {
                    callback(error);
                }
            } else {
                this.camera.setVideoElement(this.cameraReady(camera!, parentId));
                if (callback) {
                    callback(undefined);
                }
            }
        });
        return this.camera;
    }

    initPublisherScreen(parentId: string, callback?): Stream {
        this.camera = new Stream(this, true, this.session, 'screen-options');
        this.camera.addOnceEventListener('can-request-screen', () => {
            this.camera.requestCameraAccess((error, camera) => {
                if (error) {
                    console.error("Error capturing the screen", error);
                    if (callback) {
                        callback(error);
                    }
                }
                else {
                    this.camera.setVideoElement(this.cameraReady(camera!, parentId));
                    if (this.camera.getSendAudio()) {
                        // If the user wants to send audio with the screen capturing
                        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                            .then(userStream => {
                                this.camera.getWrStream().addTrack(userStream.getAudioTracks()[0]);
                                this.camera.isScreenRequestedReady = true;
                                this.camera.ee.emitEvent('screen-ready');
                                if (callback) {
                                    callback(undefined);
                                }
                            })
                            .catch(error => {
                                this.camera.ee.emitEvent('access-denied-by-publisher');
                                console.error("Access denied", error);
                                if (callback) callback(error, this);
                            });
                    } else {
                        this.camera.isScreenRequestedReady = true;
                        this.camera.ee.emitEvent('screen-ready');
                        if (callback) {
                            callback(undefined);
                        }
                    }
                }
            });
        });
        return this.camera;
    }

    cameraReady(camera: Stream, parentId: string) {
        this.camera = camera;
        let videoElement = this.camera.playOnlyVideo(parentId, null);
        this.camera.emitStreamReadyEvent();
        return videoElement;
    }

    initPublisher(cameraOptions: any, callback) {
        this.getCamera(cameraOptions);
        this.camera.requestCameraAccess((error, camera) => {
            if (error) callback(error);
            else callback(undefined);
        });
    }

    getLocalStream() {
        return this.camera;
    }

    getRemoteStreams() {
        return this.remoteStreams;
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
                participantUnpublished: this.onParticipantLeft.bind(this),
                participantLeft: this.onParticipantLeft.bind(this),
                participantEvicted: this.onParticipantEvicted.bind(this),
                sendMessage: this.onNewMessage.bind(this),
                iceCandidate: this.iceCandidateEvent.bind(this),
                mediaError: this.onMediaError.bind(this),
                custonNotification: this.customNotification.bind(this)
            }
        };

        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    }


    private customNotification(params) {
        if (this.isRoomAvailable()) {
            this.session.emitEvent("custom-message-received", [{ params: params }]);
        }
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
            console.warn('Room instance not found');
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

    getCamera(options?) {

        if (this.camera) {
            return this.camera;
        }

        options = options || {
            sendAudio: true,
            sendVideo: true,
            activeAudio: true,
            activeVideo: true,
            data: true,
            mediaConstraints: {
                audio: true,
                video: { width: { ideal: 1280 } }
            }
        }
        options.connection = this.session.getLocalParticipant();

        this.camera = new Stream(this, true, this.session, options);
        return this.camera;
    };

    //CHAT
    sendMessage(room, user, message) {
        this.sendRequest('sendMessage', {
            message: message,
            userMessage: user,
            roomMessage: room
        }, function (error, response) {
            if (error) {
                console.error(error);
            }
        });
    };

    sendCustomRequest(params, callback) {
        this.sendRequest('customRequest', params, callback);
    };




    toggleLocalVideoTrack(activate: boolean) {
        this.getCamera().getWebRtcPeer().videoEnabled = activate;
    }

    toggleLocalAudioTrack(activate: boolean) {
        this.getCamera().getWebRtcPeer().audioEnabled = activate;
    }

    publishLocalVideoAudio() {
        this.toggleLocalVideoTrack(true);
        this.toggleLocalAudioTrack(true);
    }

    unpublishLocalVideoAudio() {
        this.toggleLocalVideoTrack(false);
        this.toggleLocalAudioTrack(false);
    }

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
