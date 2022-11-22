/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';
import { PlatformUtils } from '../OpenViduInternal/Utils/Platform';
import Mime = require('mime/lite');

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * @hidden
 */
let platform: PlatformUtils;

/**
 * Easy recording of {@link Stream} objects straightaway from the browser. Initialized with {@link OpenVidu.initLocalRecorder} method
 */
export class LocalRecorder {
    state: LocalRecorderState;

    private connectionId: string;
    private mediaRecorder: MediaRecorder;
    private chunks: any[] = [];
    private blob?: Blob;
    private id: string;
    private videoPreviewSrc: string;
    private videoPreview: HTMLVideoElement;

    /**
     * @hidden
     */
    constructor(private stream: Stream) {
        platform = PlatformUtils.getInstance();
        this.connectionId = !!this.stream.connection ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = LocalRecorderState.READY;
    }

    /**
     * Starts the recording of the Stream. {@link state} property must be `READY`. After method succeeds is set to `RECORDING`
     *
     * @param options The [MediaRecorder.options](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder#parameters) to be used to record this Stream.
     * For example:
     *
     * ```javascript
     * var OV = new OpenVidu();
     * var publisher = await OV.initPublisherAsync();
     * var localRecorder = OV.initLocalRecorder(publisher.stream);
     * var options = {
     *      mimeType: 'video/webm;codecs=vp8',
     *      audioBitsPerSecond:128000,
     *      videoBitsPerSecond:2500000
     * };
     * localRecorder.record(options);
     * ```
     *
     * If not specified, the default options preferred by the platform will be used.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording successfully started and rejected with an Error object if not
     */
    record(options?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (typeof options === 'string' || options instanceof String) {
                    return reject(
                        `When calling LocalRecorder.record(options) parameter 'options' cannot be a string. Must be an object like { mimeType: "${options}" }`
                    );
                }
                if (typeof MediaRecorder === 'undefined') {
                    logger.error(
                        'MediaRecorder not supported on your device. See compatibility in https://caniuse.com/#search=MediaRecorder'
                    );
                    throw Error(
                        'MediaRecorder not supported on your device. See compatibility in https://caniuse.com/#search=MediaRecorder'
                    );
                }
                if (this.state !== LocalRecorderState.READY) {
                    throw Error(
                        "'LocalRecord.record()' needs 'LocalRecord.state' to be 'READY' (current value: '" +
                            this.state +
                            "'). Call 'LocalRecorder.clean()' or init a new LocalRecorder before"
                    );
                }
                logger.log("Starting local recording of stream '" + this.stream.streamId + "' of connection '" + this.connectionId + "'");

                if (!options) {
                    options = { mimeType: 'video/webm' };
                } else if (!options.mimeType) {
                    options.mimeType = 'video/webm';
                }

                this.mediaRecorder = new MediaRecorder(this.stream.getMediaStream(), options);
                this.mediaRecorder.start();
            } catch (err) {
                return reject(err);
            }

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.chunks.push(e.data);
                }
            };

            this.mediaRecorder.onerror = (e) => {
                logger.error('MediaRecorder error: ', e);
            };

            this.mediaRecorder.onstart = () => {
                logger.log('MediaRecorder started (state=' + this.mediaRecorder.state + ')');
            };

            this.mediaRecorder.onstop = () => {
                this.onStopDefault();
            };

            this.mediaRecorder.onpause = () => {
                logger.log('MediaRecorder paused (state=' + this.mediaRecorder.state + ')');
            };

            this.mediaRecorder.onresume = () => {
                logger.log('MediaRecorder resumed (state=' + this.mediaRecorder.state + ')');
            };

            this.state = LocalRecorderState.RECORDING;
            return resolve();
        });
    }

    /**
     * Ends the recording of the Stream. {@link state} property must be `RECORDING` or `PAUSED`. After method succeeds is set to `FINISHED`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording successfully stopped and rejected with an Error object if not
     */
    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this.state === LocalRecorderState.READY || this.state === LocalRecorderState.FINISHED) {
                    throw Error(
                        "'LocalRecord.stop()' needs 'LocalRecord.state' to be 'RECORDING' or 'PAUSED' (current value: '" +
                            this.state +
                            "'). Call 'LocalRecorder.start()' before"
                    );
                }
                this.mediaRecorder.onstop = () => {
                    this.onStopDefault();
                    return resolve();
                };
                this.mediaRecorder.stop();
            } catch (e) {
                return reject(e);
            }
        });
    }

    /**
     * Pauses the recording of the Stream. {@link state} property must be `RECORDING`. After method succeeds is set to `PAUSED`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording was successfully paused and rejected with an Error object if not
     */
    pause(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this.state !== LocalRecorderState.RECORDING) {
                    return reject(
                        Error(
                            "'LocalRecord.pause()' needs 'LocalRecord.state' to be 'RECORDING' (current value: '" +
                                this.state +
                                "'). Call 'LocalRecorder.start()' or 'LocalRecorder.resume()' before"
                        )
                    );
                }
                this.mediaRecorder.pause();
                this.state = LocalRecorderState.PAUSED;
                return resolve();
            } catch (error) {
                return reject(error);
            }
        });
    }

    /**
     * Resumes the recording of the Stream. {@link state} property must be `PAUSED`. After method succeeds is set to `RECORDING`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording was successfully resumed and rejected with an Error object if not
     */
    resume(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this.state !== LocalRecorderState.PAUSED) {
                    throw Error(
                        "'LocalRecord.resume()' needs 'LocalRecord.state' to be 'PAUSED' (current value: '" +
                            this.state +
                            "'). Call 'LocalRecorder.pause()' before"
                    );
                }
                this.mediaRecorder.resume();
                this.state = LocalRecorderState.RECORDING;
                return resolve();
            } catch (error) {
                return reject(error);
            }
        });
    }

    /**
     * Previews the recording, appending a new HTMLVideoElement to element with id `parentId`. {@link state} property must be `FINISHED`
     */
    preview(parentElement): HTMLVideoElement {
        if (this.state !== LocalRecorderState.FINISHED) {
            throw Error(
                "'LocalRecord.preview()' needs 'LocalRecord.state' to be 'FINISHED' (current value: '" +
                    this.state +
                    "'). Call 'LocalRecorder.stop()' before"
            );
        }

        this.videoPreview = document.createElement('video');

        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;

        if (platform.isSafariBrowser()) {
            this.videoPreview.playsInline = true;
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
     * Gracefully stops and cleans the current recording (WARNING: it is completely dismissed). Sets {@link state} to `READY` so the recording can start again
     */
    clean(): void {
        const f = () => {
            delete this.blob;
            this.chunks = [];
            this.state = LocalRecorderState.READY;
        };
        if (this.state === LocalRecorderState.RECORDING || this.state === LocalRecorderState.PAUSED) {
            this.stop()
                .then(() => f())
                .catch(() => f());
        } else {
            f();
        }
    }

    /**
     * Downloads the recorded video through the browser. {@link state} property must be `FINISHED`
     */
    download(): void {
        if (this.state !== LocalRecorderState.FINISHED) {
            throw Error(
                "'LocalRecord.download()' needs 'LocalRecord.state' to be 'FINISHED' (current value: '" +
                    this.state +
                    "'). Call 'LocalRecorder.stop()' before"
            );
        } else {
            const a: HTMLAnchorElement = document.createElement('a');
            a.style.display = 'none';
            document.body.appendChild(a);

            const url = globalThis.URL.createObjectURL(<any>this.blob);
            a.href = url;
            a.download = this.id + '.' + Mime.getExtension(this.blob!.type);
            a.click();
            globalThis.URL.revokeObjectURL(url);

            document.body.removeChild(a);
        }
    }

    /**
     * Gets the raw Blob file. Methods preview, download, uploadAsBinary and uploadAsMultipartfile use this same file to perform their specific actions. {@link state} property must be `FINISHED`
     */
    getBlob(): Blob {
        if (this.state !== LocalRecorderState.FINISHED) {
            throw Error("Call 'LocalRecord.stop()' before getting Blob file");
        } else {
            return this.blob!;
        }
    }

    /**
     * Uploads the recorded video as a binary file performing an HTTP/POST operation to URL `endpoint`. {@link state} property must be `FINISHED`. Optional HTTP headers can be passed as second parameter. For example:
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
                return reject(
                    Error(
                        "'LocalRecord.uploadAsBinary()' needs 'LocalRecord.state' to be 'FINISHED' (current value: '" +
                            this.state +
                            "'). Call 'LocalRecorder.stop()' before"
                    )
                );
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
                            return resolve(http.responseText);
                        } else {
                            return reject(http.status);
                        }
                    }
                };
                http.send(this.blob);
            }
        });
    }

    /**
     * Uploads the recorded video as a multipart file performing an HTTP/POST operation to URL `endpoint`. {@link state} property must be `FINISHED`. Optional HTTP headers can be passed as second parameter. For example:
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
                return reject(
                    Error(
                        "'LocalRecord.uploadAsMultipartfile()' needs 'LocalRecord.state' to be 'FINISHED' (current value: '" +
                            this.state +
                            "'). Call 'LocalRecorder.stop()' before"
                    )
                );
            } else {
                const http = new XMLHttpRequest();
                http.open('POST', endpoint, true);

                if (typeof headers === 'object') {
                    for (const key of Object.keys(headers)) {
                        http.setRequestHeader(key, headers[key]);
                    }
                }

                const sendable = new FormData();
                sendable.append('file', this.blob!, this.id + '.' + Mime.getExtension(this.blob!.type));

                http.onreadystatechange = () => {
                    if (http.readyState === 4) {
                        if (http.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            return resolve(http.responseText);
                        } else {
                            return reject(http.status);
                        }
                    }
                };

                http.send(sendable);
            }
        });
    }

    /* Private methods */

    private onStopDefault(): void {
        logger.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ')');

        this.blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
        this.chunks = [];

        this.videoPreviewSrc = globalThis.URL.createObjectURL(this.blob);

        this.state = LocalRecorderState.FINISHED;
    }
}
