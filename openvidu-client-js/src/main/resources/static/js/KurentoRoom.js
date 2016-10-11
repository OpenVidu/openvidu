/*
 * (C) Copyright 2016 Kurento (http://kurento.org/)
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
// Room --------------------------------

function jq(myid) {

    return "#" + myid.replace(/(@|:|\.|\[|\]|,)/g, "\\$1");

}

function Room(kurento, options) {

    var that = this;

    that.name = options.room;

    var ee = new EventEmitter();
    var streams = {};
    var participants = {};
    var participantsSpeaking = [];
    var connected = false;
    var localParticipant;
    var subscribeToStreams = options.subscribeToStreams || true;
    var updateSpeakerInterval = options.updateSpeakerInterval || 1500;
    var thresholdSpeaker = options.thresholdSpeaker || -50;

    setInterval(updateMainSpeaker, updateSpeakerInterval);

    function updateMainSpeaker() {
        if (participantsSpeaking.length > 0) {
            ee.emitEvent('update-main-speaker', [{
                participantId: participantsSpeaking[participantsSpeaking.length - 1]
            }]);
        }
    }

    this.getLocalParticipant = function () {
        return localParticipant;
    }

    this.addEventListener = function (eventName, listener) {
        ee.addListener(eventName, listener);
    }

    this.emitEvent = function (eventName, eventsArray) {
        ee.emitEvent(eventName, eventsArray);
    }

    this.connect = function () {
        var joinParams = {
            user: options.user,
            room: options.room
        };
        if (localParticipant) {
            if (Object.keys(localParticipant.getStreams()).some(function (streamId) {
                    return streams[streamId].isDataChannelEnabled();
                })) {
                joinParams.dataChannels = true;
            }
        }
        kurento.sendRequest('joinRoom', joinParams, function (error, response) {
            if (error) {
                console.warn('Unable to join room', error);
                ee.emitEvent('error-room', [{
                    error: error
                }]);
            } else {

                connected = true;

                var exParticipants = response.value;

                var roomEvent = {
                    participants: [],
                    streams: []
                }

                var length = exParticipants.length;
                for (var i = 0; i < length; i++) {

                    var participant = new Participant(kurento, false, that,
                        exParticipants[i]);

                    participants[participant.getID()] = participant;

                    roomEvent.participants.push(participant);

                    var streams = participant.getStreams();
                    for (var key in streams) {
                        roomEvent.streams.push(streams[key]);
                        if (subscribeToStreams) {
                            streams[key].subscribe();
                        }
                    }
                }

                ee.emitEvent('room-connected', [roomEvent]);
            }
        });
    }


    this.subscribe = function (stream) {
        stream.subscribe();
    }

    this.onParticipantPublished = function (options) {

        var participant = new Participant(kurento, false, that, options);

        var pid = participant.getID();
        if (!(pid in participants)) {
            console.info("Publisher not found in participants list by its id", pid);
        } else {
            console.log("Publisher found in participants list by its id", pid);
        }
        //replacing old participant (this one has streams)
        participants[pid] = participant;

        ee.emitEvent('participant-published', [{
            participant: participant
        }]);

        var streams = participant.getStreams();
        for (var key in streams) {
            var stream = streams[key];

            if (subscribeToStreams) {
                stream.subscribe();
                ee.emitEvent('stream-added', [{
                    stream: stream
                }]);
            }
        }
    }

    this.onParticipantJoined = function (msg) {
        var participant = new Participant(kurento, false, that, msg);
        var pid = participant.getID();
        if (!(pid in participants)) {
            console.log("New participant to participants list with id", pid);
            participants[pid] = participant;
        } else {
            //use existing so that we don't lose streams info
            console.info("Participant already exists in participants list with " +
                "the same id, old:", participants[pid], ", joined now:", participant);
            participant = participants[pid];
        }

        ee.emitEvent('participant-joined', [{
            participant: participant
        }]);
    }

    this.onParticipantLeft = function (msg) {

        var participant = participants[msg.name];

        if (participant !== undefined) {
            delete participants[msg.name];

            ee.emitEvent('participant-left', [{
                participant: participant
            }]);

            var streams = participant.getStreams();
            for (var key in streams) {
                ee.emitEvent('stream-removed', [{
                    stream: streams[key]
                }]);
            }

            participant.dispose();
        } else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: "
                + JSON.stringify(participants));
        }
    };

    this.onParticipantEvicted = function (msg) {
        ee.emitEvent('participant-evicted', [{
            localParticipant: localParticipant
        }]);
    };

    this.onNewMessage = function (msg) {
        console.log("New message: " + JSON.stringify(msg));
        var room = msg.room;
        var user = msg.user;
        var message = msg.message;

        if (user !== undefined) {
            ee.emitEvent('newMessage', [{
                room: room,
                user: user,
                message: message
            }]);
        } else {
            console.error("User undefined in new message:", msg);
        }
    }

    this.recvIceCandidate = function (msg) {
        var candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex
        }
        var participant = participants[msg.endpointName];
        if (!participant) {
            console.error("Participant not found for endpoint " +
                msg.endpointName + ". Ice candidate will be ignored.",
                candidate);
            return false;
        }
        var streams = participant.getStreams();
        for (var key in streams) {
            var stream = streams[key];
            stream.getWebRtcPeer().addIceCandidate(candidate, function (error) {
                if (error) {
                    console.error("Error adding candidate for " + key
                        + " stream of endpoint " + msg.endpointName
                        + ": " + error);
                    return;
                }
            });
        }
    }

    this.onRoomClosed = function (msg) {
        console.log("Room closed: " + JSON.stringify(msg));
        var room = msg.room;
        if (room !== undefined) {
            ee.emitEvent('room-closed', [{
                room: room
            }]);
        } else {
            console.error("Room undefined in on room closed", msg);
        }
    }

    this.onLostConnection = function () {

        if (!connected) {
            console.warn('Not connected to room, ignoring lost connection notification');
            return false;
        }

        console.log('Lost connection in room ' + that.name);
        var room = that.name;
        if (room !== undefined) {
            ee.emitEvent('lost-connection', [{
                room: room
            }]);
        } else {
            console.error('Room undefined when lost connection');
        }
    }

    this.onMediaError = function (params) {
        console.error("Media error: " + JSON.stringify(params));
        var error = params.error;
        if (error) {
            ee.emitEvent('error-media', [{
                error: error
            }]);
        } else {
            console.error("Received undefined media error. Params:", params);
        }
    }

    /*
     * forced means the user was evicted, no need to send the 'leaveRoom' request
     */
    this.leave = function (forced, jsonRpcClient) {
        forced = !!forced;
        console.log("Leaving room (forced=" + forced + ")");

        if (connected && !forced) {
            kurento.sendRequest('leaveRoom', function (error, response) {
                if (error) {
                    console.error(error);
                }
                jsonRpcClient.close();
            });
        } else {
            jsonRpcClient.close();
        }
        connected = false;
        if (participants) {
            for (var pid in participants) {
                participants[pid].dispose();
                delete participants[pid];
            }
        }
    }

    this.disconnect = function (stream) {
        var participant = stream.getParticipant();
        if (!participant) {
            console.error("Stream to disconnect has no participant", stream);
            return false;
        }

        delete participants[participant.getID()];
        participant.dispose();

        if (participant === localParticipant) {
            console.log("Unpublishing my media (I'm " + participant.getID() + ")");
            delete localParticipant;
            kurento.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.info("Media unpublished correctly");
                }
            });
        } else {
            console.log("Unsubscribing from " + stream.getGlobalID());
            kurento.sendRequest('unsubscribeFromVideo', {
                    sender: stream.getGlobalID()
                },
                function (error, response) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.info("Unsubscribed correctly from " + stream.getGlobalID());
                    }
                });
        }
    }

    this.getStreams = function () {
        return streams;
    }

    this.addParticipantSpeaking = function (participantId) {
        participantsSpeaking.push(participantId);
    }

    this.removeParticipantSpeaking = function (participantId) {
        var pos = -1;
        for (var i = 0; i < participantsSpeaking.length; i++) {
            if (participantsSpeaking[i] == participantId) {
                pos = i;
                break;
            }
        }
        if (pos != -1) {
            participantsSpeaking.splice(pos, 1);
        }
    }

    localParticipant = new Participant(kurento, true, that, {id: options.user});
    participants[options.user] = localParticipant;
}

// Participant --------------------------------

function Participant(kurento, local, room, options) {

    var that = this;
    var id = options.id;

    var streams = {};
    var streamsOpts = [];

    if (options.streams) {
        for (var i = 0; i < options.streams.length; i++) {
            var streamOpts = {
                id: options.streams[i].id,
                participant: that,
                recvVideo: (options.streams[i].recvVideo == undefined ? true : options.streams[i].recvVideo),
                recvAudio: (options.streams[i].recvAudio == undefined ? true : options.streams[i].recvAudio)
            }
            var stream = new Stream(kurento, false, room, streamOpts);
            addStream(stream);
            streamsOpts.push(streamOpts);
        }
    }
    console.log("New " + (local ? "local " : "remote ") + "participant " + id
        + ", streams opts: ", streamsOpts);

    that.setId = function (newId) {
        id = newId;
    }

    function addStream(stream) {
        streams[stream.getID()] = stream;
        room.getStreams()[stream.getID()] = stream;
    }

    that.addStream = addStream;

    that.getStreams = function () {
        return streams;
    }

    that.dispose = function () {
        for (var key in streams) {
            streams[key].dispose();
        }
    }

    that.getID = function () {
        return id;
    }

    this.sendIceCandidate = function (candidate) {
        console.debug((local ? "Local" : "Remote"), "candidate for",
            that.getID(), JSON.stringify(candidate));
        kurento.sendRequest("onIceCandidate", {
            endpointName: that.getID(),
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                console.error("Error sending ICE candidate: "
                    + JSON.stringify(error));
            }
        });
    }
}

// Stream --------------------------------

/*
 * options: name: XXX data: true (Maybe this is based on webrtc) audio: true,
 * video: true, url: "file:///..." > Player screen: true > Desktop (implicit
 * video:true, audio:false) audio: true, video: true > Webcam
 *
 * stream.hasAudio(); stream.hasVideo(); stream.hasData();
 */
function Stream(kurento, local, room, options) {

    var that = this;

    that.room = room;

    var ee = new EventEmitter();
    var sdpOffer;
    var wrStream;
    var wp;
    var id;
    if (options.id) {
        id = options.id;
    } else {
        id = "webcam";
    }
    var video;

    var videoElements = [];
    var elements = [];
    var participant = options.participant;

    var speechEvent;

    var recvVideo = options.recvVideo;
    this.getRecvVideo = function () {
        return recvVideo;
    }

    var recvAudio = options.recvAudio;
    this.getRecvAudio = function () {
        return recvAudio;
    }

    var showMyRemote = false;
    this.subscribeToMyRemote = function () {
        showMyRemote = true;
    }
    this.displayMyRemote = function () {
        return showMyRemote;
    }

    var localMirrored = false;
    this.mirrorLocalStream = function (wr) {
        showMyRemote = true;
        localMirrored = true;
        if (wr)
            wrStream = wr;
    }
    this.isLocalMirrored = function () {
        return localMirrored;
    }

    var chanId = 0;

    function getChannelName() {
        return that.getGlobalID() + '_' + chanId++;
    }

    var dataChannel = options.data || false;
    this.isDataChannelEnabled = function () {
        return dataChannel;
    }

    var dataChannelOpened = false;
    this.isDataChannelOpened = function () {
        return dataChannelOpened;
    }

    function onDataChannelOpen(event) {
        console.log('Data channel is opened');
        dataChannelOpened = true;
    }

    function onDataChannelClosed(event) {
        console.log('Data channel is closed');
        dataChannelOpened = false;
    }

    this.sendData = function (data) {
        if (wp === undefined) {
            throw new Error('WebRTC peer has not been created yet');
        }
        if (!dataChannelOpened) {
            throw new Error('Data channel is not opened');
        }
        console.log("Sending through data channel: " + data);
        wp.send(data);
    }

    this.getWrStream = function () {
        return wrStream;
    }

    this.getWebRtcPeer = function () {
        return wp;
    }

    this.addEventListener = function (eventName, listener) {
        ee.addListener(eventName, listener);
    }

    function showSpinner(spinnerParentId) {
        var progress = document.createElement('div');
        progress.id = 'progress-' + that.getGlobalID();
        progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
        document.getElementById(spinnerParentId).appendChild(progress);
    }

    function hideSpinner(spinnerId) {
        spinnerId = (typeof spinnerId === 'undefined') ? that.getGlobalID() : spinnerId;
        $(jq('progress-' + spinnerId)).remove();
    }

    this.playOnlyVideo = function (parentElement, thumbnailId) {
        video = document.createElement('video');

        video.id = 'native-video-' + that.getGlobalID();
        video.autoplay = true;
        video.controls = false;
        if (wrStream) {
            video.src = URL.createObjectURL(wrStream);
            $(jq(thumbnailId)).show();
            hideSpinner();
        } else
            console.log("No wrStream yet for", that.getGlobalID());

        videoElements.push({
            thumb: thumbnailId,
            video: video
        });

        if (local) {
            video.muted = true;
        }

        if (typeof parentElement === "string") {
            document.getElementById(parentElement).appendChild(video);
        } else {
            parentElement.appendChild(video);
        }

        return video;
    }

    this.playThumbnail = function (thumbnailId) {

        var container = document.createElement('div');
        container.className = "participant";
        container.id = that.getGlobalID();
        document.getElementById(thumbnailId).appendChild(container);

        elements.push(container);

        var name = document.createElement('div');
        container.appendChild(name);
        var userName = that.getGlobalID().replace('_webcam', '');
        if (userName.length >= 16) {
        	userName = userName.substring(0, 16) + "...";
        }
        name.appendChild(document.createTextNode(userName));
        name.id = "name-" + that.getGlobalID();
        name.className = "name";
        name.title = that.getGlobalID();

        showSpinner(thumbnailId);

        return that.playOnlyVideo(container, thumbnailId);
    }

    this.getID = function () {
        return id;
    }

    this.getParticipant = function () {
        return participant;
    }

    this.getGlobalID = function () {
        if (participant) {
            return participant.getID() + "_" + id;
        } else {
            return id + "_webcam";
        }
    }

    this.init = function () {
        participant.addStream(that);

        var constraints = {
            audio: true,
            video: {
                width: {
                    ideal: 1280
                },
                frameRate: {
                    ideal: 15
                }
            }
        };

        getUserMedia(constraints, function (userStream) {
            wrStream = userStream;
            ee.emitEvent('access-accepted', null);
        }, function (error) {
            console.error("Access denied", error);
            ee.emitEvent('access-denied', null);
        });
    }

    this.publishVideoCallback = function (error, sdpOfferParam, wp) {
        if (error) {
            return console.error("(publish) SDP offer error: "
                + JSON.stringify(error));
        }
        console.log("Sending SDP offer to publish as "
            + that.getGlobalID(), sdpOfferParam);
        kurento.sendRequest("publishVideo", {
            sdpOffer: sdpOfferParam,
            doLoopback: that.displayMyRemote() || false
        }, function (error, response) {
            if (error) {
                console.error("Error on publishVideo: " + JSON.stringify(error));
            } else {
                that.room.emitEvent('stream-published', [{
                    stream: that
                }])
                that.processSdpAnswer(response.sdpAnswer);
            }
        });
    }

    this.startVideoCallback = function (error, sdpOfferParam, wp) {
        if (error) {
            return console.error("(subscribe) SDP offer error: "
                + JSON.stringify(error));
        }
        console.log("Sending SDP offer to subscribe to "
            + that.getGlobalID(), sdpOfferParam);
        kurento.sendRequest("receiveVideoFrom", {
            sender: that.getGlobalID(),
            sdpOffer: sdpOfferParam
        }, function (error, response) {
            if (error) {
                console.error("Error on recvVideoFrom: " + JSON.stringify(error));
            } else {
                that.processSdpAnswer(response.sdpAnswer);
            }
        });
    }

    function initWebRtcPeer(sdpOfferCallback) {
        if (local) {
            var options = {
                videoStream: wrStream,
                onicecandidate: participant.sendIceCandidate.bind(participant),
            }
            if (dataChannel) {
                options.dataChannelConfig = {
                    id: getChannelName(),
                    onopen: onDataChannelOpen,
                    onclose: onDataChannelClosed
                };
                options.dataChannels = true;
            }
            if (that.displayMyRemote()) {
                wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    this.generateOffer(sdpOfferCallback.bind(that));
                });
            } else {
                wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    this.generateOffer(sdpOfferCallback.bind(that));
                });
            }
        } else {
            var offerConstraints = {
                mandatory: {
                    OfferToReceiveVideo: recvVideo,
                    OfferToReceiveAudio: recvAudio
                }
            };
            console.log("Constraints of generate SDP offer (subscribing)",
                offerConstraints);
            var options = {
                onicecandidate: participant.sendIceCandidate.bind(participant),
                connectionConstraints: offerConstraints
            }
            wp = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                if (error) {
                    return console.error(error);
                }
                this.generateOffer(sdpOfferCallback.bind(that));
            });
        }
        console.log("Waiting for SDP offer to be generated ("
            + (local ? "local" : "remote") + " peer: " + that.getGlobalID() + ")");
    }

    this.publish = function () {

        // FIXME: Throw error when stream is not local

        initWebRtcPeer(that.publishVideoCallback);

        // FIXME: Now we have coupled connecting to a room and adding a
        // stream to this room. But in the new API, there are two steps.
        // This is the second step. For now, it do nothing.

    }

    this.subscribe = function () {

        // FIXME: In the current implementation all participants are subscribed
        // automatically to all other participants. We use this method only to
        // negotiate SDP

        initWebRtcPeer(that.startVideoCallback);
    }

    this.processSdpAnswer = function (sdpAnswer) {
        var answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer,
        });
        console.log(that.getGlobalID() + ": set peer connection with recvd SDP answer",
            sdpAnswer);
        var participantId = that.getGlobalID();
        var pc = wp.peerConnection;
        pc.setRemoteDescription(answer, function () {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!local || that.displayMyRemote()) {
                wrStream = pc.getRemoteStreams()[0];
                console.log("Peer remote stream", wrStream);
                if (wrStream != undefined) {
                    speechEvent = kurentoUtils.WebRtcPeer.hark(wrStream, {threshold: that.room.thresholdSpeaker});
                    speechEvent.on('speaking', function () {
                        that.room.addParticipantSpeaking(participantId);
                        that.room.emitEvent('stream-speaking', [{
                            participantId: participantId
                        }]);
                    });
                    speechEvent.on('stopped_speaking', function () {
                        that.room.removeParticipantSpeaking(participantId);
                        that.room.emitEvent('stream-stopped-speaking', [{
                            participantId: participantId
                        }]);
                    });
                }
                for (i = 0; i < videoElements.length; i++) {
                    var thumbnailId = videoElements[i].thumb;
                    var video = videoElements[i].video;
                    video.src = URL.createObjectURL(wrStream);
                    video.onplay = function () {
                        console.log(that.getGlobalID() + ': ' + 'Video playing');
                        $(jq(thumbnailId)).show();
                        hideSpinner(that.getGlobalID());
                    };
                }
                that.room.emitEvent('stream-subscribed', [{
                    stream: that
                }]);
            }
        }, function (error) {
            console.error(that.getGlobalID() + ": Error setting SDP to the peer connection: "
                + JSON.stringify(error));
        });
    }

    this.unpublish = function () {
        if (wp) {
            wp.dispose();
        } else {
            if (wrStream) {
                wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (speechEvent) {
            speechEvent.stop();
        }

        console.log(that.getGlobalID() + ": Stream '" + id + "' unpublished");
    }

    this.dispose = function () {

        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        for (i = 0; i < elements.length; i++) {
            disposeElement(elements[i]);
        }

        for (i = 0; i < videoElements.length; i++) {
            disposeElement(videoElements[i].video);
        }

        disposeElement("progress-" + that.getGlobalID());

        if (wp) {
            wp.dispose();
        } else {
            if (wrStream) {
                wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (speechEvent) {
            speechEvent.stop();
        }

        console.log(that.getGlobalID() + ": Stream '" + id + "' disposed");
    }
}

// KurentoRoom --------------------------------

function KurentoRoom(wsUri, callback) {
    if (!(this instanceof KurentoRoom))
        return new KurentoRoom(wsUri, callback);

    var that = this;

    var room;

    var userName;

    var jsonRpcClient;

    function initJsonRpcClient() {

        var config = {
            heartbeat: 3000,
            sendCloseMessage: false,
            ws: {
                uri: wsUri,
                useSockJS: false,
                onconnected: connectCallback,
                ondisconnect: disconnectCallback,
                onreconnecting: reconnectingCallback,
                onreconnected: reconnectedCallback
            },
            rpc: {
                requestTimeout: 15000,
                //notifications
                participantJoined: onParticipantJoined,
                participantPublished: onParticipantPublished,
                participantUnpublished: onParticipantLeft,
                participantLeft: onParticipantLeft,
                participantEvicted: onParticipantEvicted,
                sendMessage: onNewMessage,
                iceCandidate: iceCandidateEvent,
                mediaError: onMediaError,
                custonNotification: customNotification
            }
        };

        jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    }

    function customNotification(params) {
        if (isRoomAvailable()) {
            room.emitEvent("custom-message-received", [{params: params}]);
        }
    }

    function connectCallback(error) {
        if (error) {
            callback(error);
        } else {
            callback(null, that);
        }
    }

    function isRoomAvailable() {
        if (room !== undefined && room instanceof Room) {
            return true;
            º
        } else {
            console.warn('Room instance not found');
            return false;
        }
    }

    function disconnectCallback() {
        console.log('Websocket connection lost');
        if (isRoomAvailable()) {
            room.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    function reconnectingCallback() {
        console.log('Websocket connection lost (reconnecting)');
        if (isRoomAvailable()) {
            room.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    function reconnectedCallback() {
        console.log('Websocket reconnected');
    }

    function onParticipantJoined(params) {
        if (isRoomAvailable()) {
            room.onParticipantJoined(params);
        }
    }

    function onParticipantPublished(params) {
        if (isRoomAvailable()) {
            room.onParticipantPublished(params);
        }
    }

    function onParticipantLeft(params) {
        if (isRoomAvailable()) {
            room.onParticipantLeft(params);
        }
    }

    function onParticipantEvicted(params) {
        if (isRoomAvailable()) {
            room.onParticipantEvicted(params);
        }
    }

    function onNewMessage(params) {
        if (isRoomAvailable()) {
            room.onNewMessage(params);
        }
    }

    function iceCandidateEvent(params) {
        if (isRoomAvailable()) {
            room.recvIceCandidate(params);
        }
    }

    function onRoomClosed(params) {
        if (isRoomAvailable()) {
            room.onRoomClosed(params);
        }
    }

    function onMediaError(params) {
        if (isRoomAvailable()) {
            room.onMediaError(params);
        }
    }

    var rpcParams;

    this.setRpcParams = function (params) {
        rpcParams = params;
    }

    this.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = undefined;
        }
        params = params || {};

        if (rpcParams && rpcParams !== "null" && rpcParams !== "undefined") {
            for (var index in rpcParams) {
                if (rpcParams.hasOwnProperty(index)) {
                    params[index] = rpcParams[index];
                    console.log('RPC param added to request {' + index + ': ' + rpcParams[index] + '}');
                }
            }
        }
        console.log('Sending request: { method:"' + method + '", params: ' + JSON.stringify(params) + ' }');
        jsonRpcClient.send(method, params, callback);
    };

    this.close = function (forced) {
        if (isRoomAvailable()) {
            room.leave(forced, jsonRpcClient);
        }
    };

    this.disconnectParticipant = function (stream) {
        if (isRoomAvailable()) {
            room.disconnect(stream);
        }
    }

    this.Stream = function (room, options) {
        options.participant = room.getLocalParticipant();
        return new Stream(that, true, room, options);
    };

    this.Room = function (options) {
        room = new Room(that, options);
        return room;
    };

    //CHAT
    this.sendMessage = function (room, user, message) {
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

    this.sendCustomRequest = function (params, callback) {
        this.sendRequest('customRequest', params, callback);
    };

    initJsonRpcClient();

}
