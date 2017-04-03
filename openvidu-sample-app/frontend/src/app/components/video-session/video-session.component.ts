import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { OpenVidu, Session, Stream } from 'openvidu-browser';

import { VideoSessionService } from '../../services/video-session.service';
import { AuthenticationService } from '../../services/authentication.service';

import { Lesson } from '../../models/lesson';

@Component({
    selector: 'app-video-session',
    templateUrl: './video-session.component.html',
    styleUrls: ['./video-session.component.css']
})
export class VideoSessionComponent implements OnInit {

    lesson: Lesson;

    OV: OpenVidu;
    session: Session;

    sessionId: string;
    token: string;

    cameraOptions: any;
    localParentId: string = 'local-stream';
    remoteParentId: string = 'remote-streams';

    localVideoActivated: boolean;
    localAudioActivated: boolean;
    videoIcon: string;
    audioIcon: string;
    fullscreenIcon: string;

    constructor(
        private location: Location,
        private authenticationService: AuthenticationService,
        private videoSessionService: VideoSessionService) { }


    OPEN_VIDU_CONNECTION() {

        // 0) Obtain 'sessionId' and 'token' from server
        // In this case, the method ngOnInit takes care of it

        // 1) Initialize OpenVidu and your Session
        this.OV = new OpenVidu("wss://" + location.hostname + ":8443/");
        this.session = this.OV.initSession(this.sessionId);


        // 2) Specify the actions when participants enter and leave the session
        this.session.onStreamAddedOV((stream) => {
            console.warn("Stream added:");
            console.warn(stream);
            stream.playOnlyVideo(this.remoteParentId, null);
        });
        this.session.onStreamRemovedOV((stream) => {
            console.warn("Stream removed:");
            console.warn(stream);
            stream.removeVideo(this.remoteParentId);
        });
        this.session.onParticipantJoinedOV((participant) => {
            console.warn("Participant joined:");
            console.warn(participant);
        });
        this.session.onParticipantLeftOV((participant) => {
            console.warn("Participant left:");
            console.warn(participant);
        });
        this.session.onParticipantPublishedOV((participant) => {
            console.warn("Participant published:");
            console.warn(participant);
        });
        this.session.onParticipantEvictedOV((participant) => {
            console.warn("Participant evicted:");
            console.warn(participant);
        });
        this.session.onRoomClosedOV((room) => {
            console.warn("Room closed:");
            console.warn(room);
        });
        this.session.onLostConnectionOV((room) => {
            console.warn("Connection lost:");
            console.warn(room);
        });
        this.session.onMediaErrorOV((error) => {
            console.warn("Media error:");
            console.warn(error);
        });


        // 3) Connect to the session
        this.session.connect(this.token, (error) => {
            if (error) return console.log("There was an error: " + error);


            // 4) Get your own camera stream with the desired resolution and publish it, only if the user is supposed to do so

            // Local publish generating an HTML video element as a child of parentId HTML element
            this.OV.initPublisherTagged(this.localParentId, this.cameraOptions, (error) => {
                if (error) return console.log("There was an error with your camera: " + error);
                this.session.publish();
            });

            // Local publish without generating an HTML video element
            /*this.OV.initPublisher(this.cameraOptions, (error) => {
                if (error) return console.log("There was an error: " + error);
                this.session.publish();
            });*/

        });

    }


    ngOnInit() {

        // Specific aspects of this concrete application
        this.previousConnectionStuff();


        if (this.authenticationService.isTeacher()) {

            // If the user is the teacher: creates the session and gets a token (with PUBLISHER role)
            this.videoSessionService.createSession(this.lesson.id).subscribe(
                sessionId => {
                    this.sessionId = sessionId;
                    this.videoSessionService.generateToken(this.lesson.id).subscribe(
                        sessionIdAndToken => {
                            this.token = sessionIdAndToken[1];
                            console.warn("Token: " + this.token);
                            console.warn("SessionId: " + this.sessionId);
                            this.OPEN_VIDU_CONNECTION();
                        },
                        error => {
                            console.log(error);
                        });
                },
                error => {
                    console.log(error);
                }
            );
        }
        else {

            // If the user is a student: gets a token (with SUBSCRIBER role)
            this.videoSessionService.generateToken(this.lesson.id).subscribe(
                sessionIdAndToken => {
                    this.sessionId = sessionIdAndToken[0];
                    this.token = sessionIdAndToken[1];
                    console.warn("Token: " + this.token);
                    console.warn("SessionId: " + this.sessionId);
                    this.OPEN_VIDU_CONNECTION();
                },
                error => {
                    console.log(error);
                });
        }


        // Specific aspects of this concrete application
        this.afterConnectionStuff();
    }

    ngAfterViewInit() {
        this.toggleScrollPage("hidden");
    }

    ngOnDestroy() {
        this.toggleScrollPage("auto");
        this.exitFullScreen();
        if (this.OV) this.OV.close(false);
    }

    toggleLocalVideo() {
        this.localVideoActivated = !this.localVideoActivated;
        this.OV.toggleLocalVideoTrack(this.localVideoActivated);
        this.videoIcon = this.localVideoActivated ? 'videocam' : 'videocam_off';
    }

    toggleLocalAudio() {
        this.localAudioActivated = !this.localAudioActivated;
        this.OV.toggleLocalAudioTrack(this.localAudioActivated);
        this.audioIcon = this.localAudioActivated ? 'mic' : 'mic_off';
    }

    toggleScrollPage(scroll: string) {
        let content = <HTMLElement>document.getElementsByClassName("mat-sidenav-content")[0];
        content.style.overflow = scroll;
    }

    toggleFullScreen() {
        let document: any = window.document;
        let fs = document.getElementsByTagName('html')[0];
        if (!document.fullscreenElement &&
            !document.mozFullScreenElement &&
            !document.webkitFullscreenElement &&
            !document.msFullscreenElement) {
            console.log("enter FULLSCREEN!");
            this.fullscreenIcon = 'fullscreen_exit';
            if (fs.requestFullscreen) {
                fs.requestFullscreen();
            } else if (fs.msRequestFullscreen) {
                fs.msRequestFullscreen();
            } else if (fs.mozRequestFullScreen) {
                fs.mozRequestFullScreen();
            } else if (fs.webkitRequestFullscreen) {
                fs.webkitRequestFullscreen();
            }
        } else {
            console.log("exit FULLSCREEN!");
            this.fullscreenIcon = 'fullscreen';
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    exitFullScreen() {
        let document: any = window.document;
        let fs = document.getElementsByTagName('html')[0];
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    previousConnectionStuff() {
        this.lesson = this.videoSessionService.lesson;
        this.cameraOptions = this.videoSessionService.cameraOptions;
    }

    afterConnectionStuff() {
        this.localVideoActivated = this.cameraOptions.video;
        this.localAudioActivated = this.cameraOptions.audio;
        this.videoIcon = this.localVideoActivated ? "videocam" : "videocam_off";
        this.audioIcon = this.localAudioActivated ? "mic" : "mic_off";
        this.fullscreenIcon = "fullscreen";
    }

}