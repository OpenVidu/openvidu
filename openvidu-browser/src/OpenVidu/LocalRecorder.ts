/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

import { Stream } from './Stream';
import { LocalRecorderState } from '../OpenViduInternal/Enums/LocalRecorderState';
import platform = require('platform');


/**
 * @hidden
 */
declare var MediaRecorder: any;


/**
 * Easy recording of [[Stream]] objects straightaway from the browser. Initialized with [[OpenVidu.initLocalRecorder]] method
 *
 * > WARNINGS:
 * - Performing browser local recording of **remote streams** may cause some troubles. A long waiting time may be required after calling _LocalRecorder.stop()_ in this case
 * - Only Chrome and Firefox support local stream recording
 */
export class LocalRecorder {

    state: LocalRecorderState;

    private connectionId: string;
    private mediaRecorder: any;
    private chunks: any[] = [];
    private blob: Blob;
    private id: string;
    private videoPreviewSrc: string;
    private videoPreview: HTMLVideoElement;

    /**
     * @hidden
     */
    constructor(private stream: Stream) {
        this.connectionId = (!!this.stream.connection) ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = LocalRecorderState.READY;
    }


    /**
     * Starts the recording of the Stream. [[state]] property must be `READY`. After method succeeds is set to `RECORDING`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording successfully started and rejected with an Error object if not
     */
    record(): Promise<any> {
        return new Promise((resolve, reject) => {

            try {

                if (typeof MediaRecorder === 'undefined') {
                    console.error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder');
                    throw (Error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder'));
                }
                if (this.state !== LocalRecorderState.READY) {
                    throw (Error('\'LocalRecord.record()\' needs \'LocalRecord.state\' to be \'READY\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.clean()\' or init a new LocalRecorder before'));
                }
                console.log("Starting local recording of stream '" + this.stream.streamId + "' of connection '" + this.connectionId + "'");


                if (typeof MediaRecorder.isTypeSupported === 'function') {
                    let options;
                    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                        options = { mimeType: 'video/webm;codecs=vp9' };
                    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                        options = { mimeType: 'video/webm;codecs=h264' };
                    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                        options = { mimeType: 'video/webm;codecs=vp8' };
                    }
                    console.log('Using mimeType ' + options.mimeType);
                    this.mediaRecorder = new MediaRecorder(this.stream.getMediaStream(), options);
                } else {
                    console.warn('isTypeSupported is not supported, using default codecs for browser');
                    this.mediaRecorder = new MediaRecorder(this.stream.getMediaStream());
                }

                this.mediaRecorder.start(10);

            } catch (err) {
                reject(err);
            }

            this.mediaRecorder.ondataavailable = (e) => {
                this.chunks.push(e.data);
            };

            this.mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error: ', e);
            };

            this.mediaRecorder.onstart = () => {
                console.log('MediaRecorder started (state=' + this.mediaRecorder.state + ')');
            };

            this.mediaRecorder.onstop = () => {
                this.onStopDefault();
            };

            this.mediaRecorder.onpause = () => {
                console.log('MediaRecorder paused (state=' + this.mediaRecorder.state + ')');
            };

            this.mediaRecorder.onresume = () => {
                console.log('MediaRecorder resumed (state=' + this.mediaRecorder.state + ')');
            };

            this.mediaRecorder.onwarning = (e) => {
                console.log('MediaRecorder warning: ' + e);
            };

            this.state = LocalRecorderState.RECORDING;
            resolve();

        });
    }


    /**
     * Ends the recording of the Stream. [[state]] property must be `RECORDING` or `PAUSED`. After method succeeds is set to `FINISHED`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording successfully stopped and rejected with an Error object if not
     */
    stop(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (this.state === LocalRecorderState.READY || this.state === LocalRecorderState.FINISHED) {
                    throw (Error('\'LocalRecord.stop()\' needs \'LocalRecord.state\' to be \'RECORDING\' or \'PAUSED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.start()\' before'));
                }
                this.mediaRecorder.onstop = () => {
                    this.onStopDefault();
                    resolve();
                };
                this.mediaRecorder.stop();
            } catch (e) {
                reject(e);
            }
        });
    }


    /**
     * Pauses the recording of the Stream. [[state]] property must be `RECORDING`. After method succeeds is set to `PAUSED`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording was successfully paused and rejected with an Error object if not
     */
    pause(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (this.state !== LocalRecorderState.RECORDING) {
                    reject(Error('\'LocalRecord.pause()\' needs \'LocalRecord.state\' to be \'RECORDING\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.start()\' or \'LocalRecorder.resume()\' before'));
                }
                this.mediaRecorder.pause();
                this.state = LocalRecorderState.PAUSED;
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Resumes the recording of the Stream. [[state]] property must be `PAUSED`. After method succeeds is set to `RECORDING`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording was successfully resumed and rejected with an Error object if not
     */
    resume(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (this.state !== LocalRecorderState.PAUSED) {
                    throw (Error('\'LocalRecord.resume()\' needs \'LocalRecord.state\' to be \'PAUSED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.pause()\' before'));
                }
                this.mediaRecorder.resume();
                this.state = LocalRecorderState.RECORDING;
            } catch (error) {
                reject(error);
            }
        });
    }


    /**
     * Previews the recording, appending a new HTMLVideoElement to element with id `parentId`. [[state]] property must be `FINISHED`
     */
    preview(parentElement): HTMLVideoElement {

        if (this.state !== LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.preview()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }

        this.videoPreview = document.createElement('video');

        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;

        if (platform.name === 'Safari') {
            this.videoPreview.setAttribute('playsinline', 'true');
        }

        if (typeof parentElement === 'string') {
            const parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        } else {
            this.videoPreview = parentElement.appendChild(this.videoPreview);
        }

        this.videoPreview.src = this.videoPreviewSrc;

        return this.videoPreview;
    }


    /**
     * Gracefully stops and cleans the current recording (WARNING: it is completely dismissed). Sets [[state]] to `READY` so the recording can start again
     */
    clean(): void {
        const f = () => {
            delete this.blob;
            this.chunks = [];
            delete this.mediaRecorder;
            this.state = LocalRecorderState.READY;
        };
        if (this.state === LocalRecorderState.RECORDING || this.state === LocalRecorderState.PAUSED) {
            this.stop().then(() => f()).catch(() => f());
        } else {
            f();
        }
    }


    /**
     * Downloads the recorded video through the browser. [[state]] property must be `FINISHED`
     */
    download(): void {
        if (this.state !== LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.download()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        } else {
            const a: HTMLAnchorElement = document.createElement('a');
            a.style.display = 'none';
            document.body.appendChild(a);

            const url = window.URL.createObjectURL(this.blob);
            a.href = url;
            a.download = this.id + '.webm';
            a.click();
            window.URL.revokeObjectURL(url);

            document.body.removeChild(a);
        }
    }

    /**
     * Gets the raw Blob file. Methods preview, download, uploadAsBinary and uploadAsMultipartfile use this same file to perform their specific actions. [[state]] property must be `FINISHED`
     */
    getBlob(): Blob {
        if (this.state !== LocalRecorderState.FINISHED) {
            throw (Error('Call \'LocalRecord.stop()\' before getting Blob file'));
        } else {
            return this.blob;
        }
    }


    /**
     * Uploads the recorded video as a binary file performing an HTTP/POST operation to URL `endpoint`. [[state]] property must be `FINISHED`. Optional HTTP headers can be passed as second parameter. For example:
     * ```
     * var headers = {
     *  "Cookie": "$Version=1; Skin=new;",
     *  "Authorization":"Basic QWxhZGpbjpuIHNlctZQ=="
     * }
     * ```
     * @returns A Promise (to which you can optionally subscribe to) that is resolved with the `http.responseText` from server if the operation was successful and rejected with the failed `http.status` if not
     */
    uploadAsBinary(endpoint: string, headers?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.state !== LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsBinary()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            } else {
                const http = new XMLHttpRequest();
                http.open('POST', endpoint, true);

                if (typeof headers === 'object') {
                    for (const key of Object.keys(headers)) {
                        http.setRequestHeader(key, headers[key]);
                    }
                }

                http.onreadystatechange = () => {
                    if (http.readyState === 4) {
                        if (http.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http.responseText);
                        } else {
                            reject(http.status);
                        }
                    }
                };
                http.send(this.blob);
            }
        });
    }


    /**
     * Uploads the recorded video as a multipart file performing an HTTP/POST operation to URL `endpoint`. [[state]] property must be `FINISHED`. Optional HTTP headers can be passed as second parameter. For example:
     * ```
     * var headers = {
     *  "Cookie": "$Version=1; Skin=new;",
     *  "Authorization":"Basic QWxhZGpbjpuIHNlctZQ=="
     * }
     * ```
     * @returns A Promise (to which you can optionally subscribe to) that is resolved with the `http.responseText` from server if the operation was successful and rejected with the failed `http.status` if not:
     */
    uploadAsMultipartfile(endpoint: string, headers?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.state !== LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsMultipartfile()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            } else {
                const http = new XMLHttpRequest();
                http.open('POST', endpoint, true);

                if (typeof headers === 'object') {
                    for (const key of Object.keys(headers)) {
                        http.setRequestHeader(key, headers[key]);
                    }
                }

                const sendable = new FormData();
                sendable.append('file', this.blob, this.id + '.webm');

                http.onreadystatechange = () => {
                    if (http.readyState === 4) {
                        if (http.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http.responseText);
                        } else {
                            reject(http.status);
                        }
                    }
                };

                http.send(sendable);
            }
        });
    }


    /* Private methods */

    private onStopDefault(): void {
        console.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ')');

        this.blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];

        this.videoPreviewSrc = window.URL.createObjectURL(this.blob);

        this.state = LocalRecorderState.FINISHED;
    }

}
