import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';

import { InfoService } from 'app/services/info.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  websocket: WebSocket;

  constructor(private infoService: InfoService) { }

  ngOnInit() {

    const protocol = location.protocol.includes('https') ? 'wss://' : 'ws://';
    const port = (location.port) ? (':' + location.port) : '';

    this.websocket = new WebSocket(protocol + location.hostname + port + '/info');

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
  }

  ngOnDestroy() {
    this.websocket.close();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHander(event) {
    console.warn('Closing info websocket');
    this.websocket.close();
  }

}
