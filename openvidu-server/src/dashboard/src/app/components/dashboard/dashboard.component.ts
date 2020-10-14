import { Component, OnInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { InfoService } from '../../services/info.service';
import { RestService } from '../../services/rest.service';

import { OpenVidu, Session } from 'openvidu-browser';
import { CredentialsDialogComponent } from './credentials-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {

  websocket: WebSocket;

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

  openviduPublicUrl: string;

  constructor(private infoService: InfoService, private restService: RestService, public dialog: MatDialog) {
    // Subscription to info updated event raised by InfoService
    this.infoSubscription = this.infoService.newInfo$.subscribe(
      info => {
        this.info.push(info);
        this.scrollToBottom();
      });
  }

  ngOnInit() {

    const protocol = location.protocol.includes('https') ? 'wss://' : 'ws://';
    const port = (location.port) ? (':' + location.port) : '';

    this.websocket = new WebSocket(protocol + location.hostname + port + '/openvidu/info');

    this.websocket.onopen = (event) => {
      console.log('Info websocket connected');
    };
    this.websocket.onclose = (event) => {
      console.log('Info websocket closed');
    };
    this.websocket.onerror = (event) => {
      console.log('Info websocket error');
    };
    this.websocket.onmessage = (event) => {
      console.log('Info websocket message');
      console.log(event.data);
      this.infoService.updateInfo(event.data);
    };

    this.restService.getOpenViduPublicUrl()
      .then(url => {
        this.openviduPublicUrl = url.replace('https://', 'wss://').replace('http://', 'ws://');
      })
      .catch(error => {
        console.error(error);
      });
  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    // On window closed leave test session and close info websocket
    if (this.session) {
      this.endTestVideo();
    }
    this.websocket.close();
  }

  ngOnDestroy() {
    // On component destroyed leave test session and close info websocket
    if (this.session) {
      this.endTestVideo();
    }
    this.websocket.close();
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

    dialogRef.afterClosed().subscribe(async secret => {
      if (secret) {
        try {
          const token = await this.restService.getToken(secret);
          this.connectToSession(token);
        } catch (error) {
          if (error.status === 401) { // User unauthorized error. OpenVidu security is active
            this.testVideo();
          } else {
            console.error(error.error);
            this.msgChain.push('Error connecting to session: [' + error.status + '] ' + error.message);
          }
        }
      }
    });
  }

  connectToSession(token: string) {
    this.msgChain = [];

    const OV = new OpenVidu();
    this.session = OV.initSession();

    this.testStatus = 'CONNECTING';
    this.testButton = 'Testing...';

    this.session.connect(token)
      .then(() => {

        this.msgChain.push('Connected to session');

        this.testStatus = 'CONNECTED';

        const publisherRemote = OV.initPublisher('mirrored-video', {
          publishAudio: true,
          publishVideo: true,
          resolution: '640x480'
        },
          e => {
            if (!!e) {
              console.error(e);
            }
          }
        );

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

        publisherRemote.on('streamCreated', (video) => {
          this.msgChain.push('Stream created');
        });

        publisherRemote.on('streamPlaying', (video) => {
          this.msgChain.push('Stream playing');
          this.testButton = 'End test';
          this.testStatus = 'PLAYING';
          this.showSpinner = false;
        });

        publisherRemote.subscribeToRemote();
        this.session.publish(publisherRemote);

      })
      .catch(error => {
        this.msgChain.push('Error connecting to session: ' + error);
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
