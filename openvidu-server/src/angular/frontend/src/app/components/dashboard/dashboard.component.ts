import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { InfoService } from '../../services/info.service';

import { OpenVidu } from 'openvidu-browser';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewChecked {

  @ViewChild('scrollMe') private myScrollContainer: ElementRef;

  infoSubscription: Subscription;
  info = [];

  constructor(private infoService: InfoService) {

    // Subscription to info updated event raised by InfoService
    this.infoSubscription = this.infoService.newInfo$.subscribe(
      info => {
        this.info.push(info);
      });
  }

  ngOnInit() {

  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  testVideo() {
    let OV = new OpenVidu();
    let session = OV.initSession('wss://' + location.hostname + ':8443/testSession');

    session.on('streamCreated', (event) => {
      session.subscribe(event.stream, 'mirrored-video');
    });

    session.connect('token', (error) => {
      if (!error) {
        let publisher = OV.initPublisher('local-video', {
          audio: true,
          video: true,
          quality: 'MEDIUM'
        });

        publisher.stream.subscribeToMyRemote();
        session.publish(publisher);
      }
    });
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.log('[Error]:' + err.toString());
    }
  }

}
