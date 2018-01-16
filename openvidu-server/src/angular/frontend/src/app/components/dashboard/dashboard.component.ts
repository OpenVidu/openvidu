import { Component, OnInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { Subscription } from 'rxjs/Subscription';

import { InfoService } from '../../services/info.service';

import { OpenVidu, Session } from 'openvidu-browser';
import { CredentialsDialogComponent } from './credentials-dialog.component';

declare const $;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {

  @ViewChild('scrollMe') private myScrollContainer: ElementRef;
  lockScroll = false;

  infoSubscription: Subscription;
  info = [];

  session: Session;

  testStatus = 'DISCONNECTED';
  testButton = 'Test';
  tickClass = 'trigger';
  showSpinner = false;
  msgChain = [];

  constructor(private infoService: InfoService, public dialog: MatDialog) {
    // Subscription to info updated event raised by InfoService
    this.infoSubscription = this.infoService.newInfo$.subscribe(
      info => {
        this.info.push(info);
        this.scrollToBottom();
      });
  }

  ngOnInit() {

  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    // On window closed leave test session
    if (this.session) {
      this.endTestVideo();
    }
  }

  ngOnDestroy() {
    // On component destroyed leave test session
    if (this.session) {
      this.endTestVideo();
    }
  }

  toggleTestVideo() {
    if (!this.session) {
      this.testVideo();
    } else {
      this.endTestVideo();
    }
  }

  testVideo() {
    let dialogRef: MatDialogRef<CredentialsDialogComponent>;
    dialogRef = this.dialog.open(CredentialsDialogComponent);
    dialogRef.componentInstance.myReference = dialogRef;

    dialogRef.afterClosed().subscribe(secret => {
      if (secret) {
        const port = (location.port) ? location.port : '8443';
        this.connectToSession('wss://' + location.hostname + ':' + port + '/testSession?secret=' + secret);
      }
    });
  }

  connectToSession(mySessionId: string) {
    this.msgChain = [];

    const OV = new OpenVidu();
    this.session = OV.initSession(mySessionId);

    this.testStatus = 'CONNECTING';
    this.testButton = 'Testing...';

    this.session.connect('token', (error) => {
      if (!error) {

        this.testStatus = 'CONNECTED';

        const publisherRemote = OV.initPublisher('mirrored-video', {
          audio: true,
          video: true,
          audioActive: true,
          videoActive: true,
          quality: 'MEDIUM'
        });

        publisherRemote.on('accessAllowed', () => {
          this.msgChain.push('Camera access allowed');
        });

        publisherRemote.on('accessDenied', () => {
          this.endTestVideo();
          this.msgChain.push('Camera access denied');
        });

        publisherRemote.on('videoElementCreated', (video) => {
          this.showSpinner = true;
          this.msgChain.push('Video element created');
        });

        publisherRemote.on('remoteVideoPlaying', (video) => {
          this.msgChain.push('Remote video playing');
          this.testButton = 'End test';
          this.testStatus = 'PLAYING';
          this.showSpinner = false;
        });

        publisherRemote.subscribeToRemote();
        this.session.publish(publisherRemote);
      } else {
        if (error.code === 401) { // User unauthorized error. OpenVidu security is active
          this.endTestVideo();
          let dialogRef: MatDialogRef<CredentialsDialogComponent>;
          dialogRef = this.dialog.open(CredentialsDialogComponent);
          dialogRef.componentInstance.myReference = dialogRef;

          dialogRef.afterClosed().subscribe(secret => {
            if (secret) {
              this.connectToSession('wss://' + location.hostname + ':8443/testSession?secret=' + secret);
            }
          });
        } else {
          console.error(error);
        }
      }
    });
  }

  endTestVideo() {
    this.session.disconnect();
    this.session = null;
    this.testStatus = 'DISCONNECTED';
    this.testButton = 'Test';
    this.showSpinner = false;
    this.info = [];
    this.msgChain = [];
  }

  scrollToBottom(): void {
    try {
      if (!this.lockScroll) {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('[Error]:' + err.toString());
    }
  }

}
