import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { InfoService } from '../../services/info.service';

import { OpenVidu, Session } from 'openvidu-browser';

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

  constructor(private infoService: InfoService) {

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
    this.session = OV.initSession('wss://' + location.hostname + ':8443/testSession');

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
