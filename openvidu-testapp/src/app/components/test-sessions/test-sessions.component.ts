import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { OpenviduParamsService } from '../../services/openvidu-params.service';
import { SessionConf } from '../openvidu-instance/openvidu-instance.component';

@Component({
  selector: 'app-test-sessions',
  templateUrl: './test-sessions.component.html',
  styleUrls: ['./test-sessions.component.css']
})
export class TestSessionsComponent implements OnInit, OnDestroy {

  openviduUrl: string;
  openviduSecret: string;

  paramsSubscription: Subscription;

  // OpenViduInstance collection
  users: SessionConf[] = [];

  numberSubs = 3;
  autoJoin = false;

  constructor(private openviduParamsService: OpenviduParamsService) { }

  ngOnInit() {
    const openviduParams = this.openviduParamsService.getParams();
    this.openviduUrl = openviduParams.openviduUrl;
    this.openviduSecret = openviduParams.openviduSecret;

    this.paramsSubscription = this.openviduParamsService.newParams$.subscribe(
      params => {
        this.openviduUrl = params.openviduUrl;
        this.openviduSecret = params.openviduSecret;
      });
  }

  ngOnDestroy() {
    this.paramsSubscription.unsubscribe();
  }

  private addUser(): void {
    this.users.push({
      subscribeTo: true,
      publishTo: true,
      sendAudio: true,
      sendVideo: true,
      startSession: false
    });
  }

  private loadSubsPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: true,
        publishTo: true,
        sendAudio: true,
        sendVideo: true,
        startSession: this.autoJoin
      });
    }
  }

  private loadSubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: true,
        publishTo: false,
        sendAudio: false,
        sendVideo: false,
        startSession: this.autoJoin
      });
    }
  }

  private loadPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: false,
        publishTo: true,
        sendAudio: true,
        sendVideo: true,
        startSession: this.autoJoin
      });
    }
  }

  private loadScenario(subsPubs: number, pubs: number, subs: number, ): void {
    this.users = [];
    this.loadSubsPubs(subsPubs);
    this.loadPubs(pubs);
    this.loadSubs(subs);
  }

}
