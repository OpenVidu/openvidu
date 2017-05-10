import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { OpenVidu, Session, Publisher } from 'openvidu-browser';

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
    publisher: Publisher;

    sessionId: string;
    token: string;

    cameraOptions: any;

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
        this.session = this.OV.initSession("apikey", this.sessionId);

        // 2) Specify the actions when events take place
        this.session.on('streamCreated', (event) => {
            this.session.subscribe(event.stream, 'subscriber', {
                insertMode: 'append',
                width: '100%',
                height: '100%'
            });
        });

        // 3) Connect to the session
        this.session.connect(this.token, (error) => {

            // If the connection is successful, initialize a publisher and publish to the session
            if (!error) {

                // 4) Get your own camera stream with the desired resolution and publish it, only if the user is supposed to do so
                this.publisher = this.OV.initPublisher('publisher', this.cameraOptions);

                // 5) Publish your stream
                this.session.publish(this.publisher);

            } else {
                console.log('There was an error connecting to the session:', error.code, error.message);
            }
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
        this.videoSessionService.removeUser(this.lesson.id).subscribe(
            response => {
                console.warn("You have succesfully left the lesson");
            },
            error => {
                console.log(error);
            });
        this.toggleScrollPage("auto");
        this.exitFullScreen();
        if (this.OV) this.session.disconnect();
    }

    toggleScrollPage(scroll: string) {
        let content = <HTMLElement>document.getElementsByClassName("mat-sidenav-content")[0];
        content.style.overflow = scroll;
    }

    toggleLocalVideo() {
        this.localVideoActivated = !this.localVideoActivated;
        this.publisher.publishVideo(this.localVideoActivated);
        this.videoIcon = this.localVideoActivated ? 'videocam' : 'videocam_off';
    }

    toggleLocalAudio() {
        this.localAudioActivated = !this.localAudioActivated;
        this.publisher.publishAudio(this.localAudioActivated);
        this.audioIcon = this.localAudioActivated ? 'mic' : 'mic_off';
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