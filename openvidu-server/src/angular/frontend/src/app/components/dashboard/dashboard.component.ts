import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { MdDialog, MdDialogRef } from '@angular/material';
import { Subscription } from 'rxjs/Subscription';

import { InfoService } from '../../services/info.service';
import { CredentialsService } from '../../services/credentials.service';

import { OpenVidu, Session } from 'openvidu-browser';
import { CredentialsDialogComponent } from './credentials-dialog.component';

declare const $;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('scrollMe') private myScrollContainer: ElementRef;

  infoSubscription: Subscription;
  info = [];

  session: Session;

  testStatus = 'DISCONNECTED';
  testButton = 'Test';
  tickClass = 'trigger';
  showSpinner = false;

  constructor(private infoService: InfoService, private credentialsService: CredentialsService, public dialog: MdDialog) {

    // Subscription to info updated event raised by InfoService
    this.infoSubscription = this.infoService.newInfo$.subscribe(
      info => {
        this.info.push(info);
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

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleTestVideo() {
    if (!this.session) {
      this.testVideo();
    } else {
      this.endTestVideo();
    }
  }

  testVideo() {
    let OV = new OpenVidu();
    this.connectToSession(OV, 'wss://' + location.hostname + ':8443/testSession', 'token');
  }

  connectToSession(OV: OpenVidu, mySessionId: string, myToken: string) {
    this.session = OV.initSession(mySessionId);

    this.session.on('streamCreated', (event) => {
      this.session.subscribe(event.stream, 'mirrored-video');
    });

    this.testStatus = 'CONNECTING';
    this.testButton = 'Testing...';

    this.session.connect(myToken, (error) => {
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
              this.credentialsService.getSessionId(secret).subscribe(
                sessionId => {
                  this.credentialsService.getToken(sessionId.id, secret).subscribe(
                    token => {
                      this.connectToSession(OV, sessionId.id, token.token);
                    }
                  )
                },
                err => {
                  console.log(err);
                }
              );
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
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.log('[Error]:' + err.toString());
    }
  }

}
