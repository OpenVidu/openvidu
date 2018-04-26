"use strict";
/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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
exports.__esModule = true;
var __1 = require("..");
/**
 * Represents each one of the user's connection to the session (the local one and other user's connections).
 * Therefore each [[Session]] and [[Stream]] object has an attribute of type Connection
 */
var Connection = /** @class */ (function () {
    /**
     * @hidden
     */
    function Connection(session, opts) {
        this.session = session;
        /**
         * @hidden
         */
        this.disposed = false;
        var msg = "'Connection' created ";
        if (!!opts) {
            msg += "(remote) with 'connectionId' [" + opts.id + ']';
        }
        else {
            msg += '(local)';
        }
        console.info(msg);
        this.options = opts;
        if (!!opts) {
            // Connection is remote
            this.connectionId = opts.id;
            if (opts.metadata) {
                this.data = opts.metadata;
            }
            if (opts.streams) {
                this.initRemoteStreams(opts.streams);
            }
        }
        this.creationTime = new Date().getTime();
    }
    /* Hidden methods */
    /**
     * @hidden
     */
    Connection.prototype.sendIceCandidate = function (candidate) {
        console.debug((!!this.stream.outboundStreamOpts ? 'Local' : 'Remote'), 'candidate for', this.connectionId, JSON.stringify(candidate));
        this.session.openvidu.sendRequest('onIceCandidate', {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                console.error('Error sending ICE candidate: '
                    + JSON.stringify(error));
            }
        });
    };
    /**
     * @hidden
     */
    Connection.prototype.initRemoteStreams = function (options) {
        var _this = this;
        // This is ready for supporting multiple streams per Connection object. Right now the loop will always run just once
        // this.stream should also be replaced by a collection of streams to support multiple streams per Connection
        options.forEach(function (opts) {
            var streamOptions = {
                id: opts.id,
                connection: _this,
                frameRate: opts.frameRate,
                recvAudio: opts.audioActive,
                recvVideo: opts.videoActive,
                typeOfVideo: opts.typeOfVideo
            };
            var stream = new __1.Stream(_this.session, streamOptions);
            _this.addStream(stream);
        });
        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + '] is now configured for receiving Streams with options: ', this.stream.inboundStreamOpts);
    };
    /**
     * @hidden
     */
    Connection.prototype.addStream = function (stream) {
        stream.connection = this;
        this.stream = stream;
    };
    /**
     * @hidden
     */
    Connection.prototype.removeStream = function (streamId) {
        delete this.stream;
    };
    /**
     * @hidden
     */
    Connection.prototype.dispose = function () {
        if (!!this.stream) {
            delete this.stream;
        }
        this.disposed = true;
    };
    return Connection;
}());
exports.Connection = Connection;
//# sourceMappingURL=Connection.js.map