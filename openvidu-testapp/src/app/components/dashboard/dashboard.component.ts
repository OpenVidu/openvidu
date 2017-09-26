import { Component, OnInit } from '@angular/core';
import { OpenviduRestService } from '../../services/openvidu-rest.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  // Join form
  sessionName: string;
  clientData: string;

  constructor(private openviduRestService: OpenviduRestService) {
    this.generateSessionInfo();
  }

  ngOnInit() { }

  private generateSessionInfo() {
    this.sessionName = 'TestSession';
    this.clientData = 'RandomClient' + Math.floor(Math.random() * 100);
  }

  private getSessionId() {
    this.openviduRestService.getSessionId()
      .then((sessionId) => {
        alert(sessionId);
      })
      .catch((error) => {
        console.error('Error getting a sessionId', error);
      });
  }

  private getToken() {
    this.openviduRestService.getToken()
      .then((token) => {
        alert(token);
      })
      .catch((error) => {
        console.error('Error getting a token', error);
      });
  }
}
