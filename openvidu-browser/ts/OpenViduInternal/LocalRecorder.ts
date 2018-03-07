import { Stream } from "./Stream";

declare var MediaRecorder: any;

export const enum LocalRecoderState {
    READY = 'READY',
    RECORDING = 'RECORDING',
    PAUSED = 'PAUSED',
    FINISHED = 'FINISHED'
}

export class LocalRecorder {

    state: LocalRecoderState;

    private stream: Stream;
    private connectionId: string;

    private mediaRecorder: any;
    private chunks: any[] = [];
    private blob: Blob;
    private count: number = 0;
    private id: string;

    private videoPreviewSrc: string;
    private htmlParentElementId: string;
    private videoPreview: HTMLVideoElement;

    constructor(stream: Stream) {
        this.stream = stream;
        this.connectionId = (!!this.stream.connection) ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = LocalRecoderState.READY;
    }

    record() {
        if (typeof MediaRecorder === 'undefined') {
            console.error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder');
            throw (Error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder'));
        }
        if (this.state !== LocalRecoderState.READY) {
            throw (Error('\'LocalRecord.record()\' needs \'LocalRecord.state\' to be \'READY\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.clean()\' or init a new LocalRecorder before'));
        }
        console.log("Starting local recording of stream '" + this.stream.streamId + "' of connection '" + this.connectionId + "'");
        if (typeof MediaRecorder.isTypeSupported == 'function') {
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

        this.mediaRecorder.ondataavailable = (e) => {
            this.chunks.push(e.data);
        };

        this.mediaRecorder.onerror = (e) => {
            console.error('MediaRecorder error: ', e);
        };


        this.mediaRecorder.onstart = () => {
            console.log('MediaRecorder started (state=' + this.mediaRecorder.state + ")");
        };

        this.mediaRecorder.onstop = () => {
            this.onStopDefault();
        };

        this.mediaRecorder.onpause = () => {
            console.log('MediaRecorder paused (state=' + this.mediaRecorder.state + ")");
        }

        this.mediaRecorder.onresume = () => {
            console.log('MediaRecorder resumed (state=' + this.mediaRecorder.state + ")");
        }

        this.mediaRecorder.onwarning = (e) => {
            console.log('MediaRecorder warning: ' + e);
        };

        this.state = LocalRecoderState.RECORDING;
    }

    stop(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (this.state === LocalRecoderState.READY || this.state === LocalRecoderState.FINISHED) {
                    throw (Error('\'LocalRecord.stop()\' needs \'LocalRecord.state\' to be \'RECORDING\' or \'PAUSED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.start()\' before'));
                }
                this.mediaRecorder.onstop = () => {
                    this.onStopDefault();
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                reject(e);
            }
        });
    }

    pause() {
        if (this.state !== LocalRecoderState.RECORDING) {
            throw (Error('\'LocalRecord.pause()\' needs \'LocalRecord.state\' to be \'RECORDING\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.start()\' or \'LocalRecorder.resume()\' before'));
        }
        this.mediaRecorder.pause();
        this.state = LocalRecoderState.PAUSED;
    }

    resume() {
        if (this.state !== LocalRecoderState.PAUSED) {
            throw (Error('\'LocalRecord.resume()\' needs \'LocalRecord.state\' to be \'PAUSED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.pause()\' before'));
        }
        this.mediaRecorder.resume();
        this.state = LocalRecoderState.RECORDING;
    }

    preview(parentElement): HTMLVideoElement {

        if (this.state !== LocalRecoderState.FINISHED) {
            throw (Error('\'LocalRecord.preview()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }

        this.videoPreview = document.createElement('video');

        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;

        if (typeof parentElement === "string") {
            this.htmlParentElementId = parentElement;

            let parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        } else {
            this.htmlParentElementId = parentElement.id;
            this.videoPreview = parentElement.appendChild(this.videoPreview);
        }

        this.videoPreview.src = this.videoPreviewSrc;

        return this.videoPreview;
    }

    clean() {
        let f = () => {
            delete this.blob;
            this.chunks = [];
            this.count = 0;
            delete this.mediaRecorder;
            this.state = LocalRecoderState.READY;
        }
        if (this.state === LocalRecoderState.RECORDING || this.state === LocalRecoderState.PAUSED) {
            this.stop().then(() => f()).catch(() => f());
        } else {
            f();
        }
    }

    download() {
        if (this.state !== LocalRecoderState.FINISHED) {
            throw (Error('\'LocalRecord.download()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        } else {
            let a: HTMLAnchorElement = document.createElement("a");
            a.style.display = 'none';
            document.body.appendChild(a);

            let url = window.URL.createObjectURL(this.blob);
            a.href = url;
            a.download = this.id + '.webm';
            a.click();
            window.URL.revokeObjectURL(url);

            document.body.removeChild(a);
        }
    }

    getBlob(): Blob {
        if (this.state !== LocalRecoderState.FINISHED) {
            throw (Error('Call \'LocalRecord.stop()\' before getting Blob file'));
        } else {
            return this.blob;
        }
    }

    uploadAsBinary(endpoint: string, headers?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.state !== LocalRecoderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsBinary()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            } else {
                let http = new XMLHttpRequest();
                http.open("POST", endpoint, true);
                
                if (typeof headers === 'object') {
                    for (let key of Object.keys(headers)) {
                        http.setRequestHeader(key, headers[key]);
                    }
                }

                http.onreadystatechange = () => {
                    if (http.readyState === 4) {
                        if (http.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http.responseText);
                        } else {
                            reject(Error("Upload error: " + http.status));
                        }
                    }
                }
                http.send(this.blob);
            }
        });
    }

    uploadAsMultipartfile(endpoint: string, headers?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.state !== LocalRecoderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsMultipartfile()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            } else {
                let http = new XMLHttpRequest();
                http.open("POST", endpoint, true);

                if (typeof headers === 'object') {
                    for (let key of Object.keys(headers)) {
                        http.setRequestHeader(key, headers[key]);
                    }
                }

                let sendable = new FormData();
                sendable.append("file", this.blob, this.id + ".webm");

                http.onreadystatechange = () => {
                    if (http.readyState === 4) {
                        if (http.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http.responseText);
                        } else {
                            reject(Error("Upload error: " + http.status));
                        }
                    }
                }

                http.send(sendable);
            }
        });
    }

    private onStopDefault() {
        console.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ")");

        this.blob = new Blob(this.chunks, { type: "video/webm" });
        this.chunks = [];

        this.videoPreviewSrc = window.URL.createObjectURL(this.blob);

        this.state = LocalRecoderState.FINISHED;
    }

}
