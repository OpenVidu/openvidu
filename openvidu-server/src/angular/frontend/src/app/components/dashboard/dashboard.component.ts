import { Component, OnInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { MdDialog, MdDialogRef } from '@angular/material';
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

  constructor(private infoService: InfoService, public dialog: MdDialog) {
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
    let dialogRef: MdDialogRef<CredentialsDialogComponent>;
    dialogRef = this.dialog.open(CredentialsDialogComponent);
    dialogRef.componentInstance.myReference = dialogRef;

    dialogRef.afterClosed().subscribe(secret => {
      if (secret) {
        this.connectToSession('wss://' + location.hostname + ':8443/testSession?secret=' + secret);
      }
    });
  }

  connectToSession(mySessionId: string) {
    let OV = new OpenVidu();
    this.session = OV.initSession(mySessionId);

    this.session.on('streamCreated', (event) => {
      this.session.subscribe(event.stream, 'mirrored-video');
    });

    this.testStatus = 'CONNECTING';
    this.testButton = 'Testing...';

    this.session.connect('token', (error) => {
      if (!error) {

        this.testStatus = 'CONNECTED';

        const publisherRemote = OV.initPublisher('mirrored-video', {
          audio: true,
          video: true,
          quality: 'MEDIUM'
        });

        publisherRemote.on('videoElementCreated', (video) => {

          this.showSpinner = true;

          video.element.addEventListener('playing', () => {
            console.warn('PLAYING!!');
            this.testButton = 'End test';
            this.testStatus = 'PLAYING';
            this.showSpinner = false;
          });
        });

        publisherRemote.stream.subscribeToMyRemote();
        this.session.publish(publisherRemote);
      } else {
        if (error.code === 401) { // User unauthorized error. OpenVidu security is active
          this.endTestVideo();
          let dialogRef: MdDialogRef<CredentialsDialogComponent>;
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
