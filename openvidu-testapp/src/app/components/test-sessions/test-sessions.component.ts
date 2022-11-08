import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OpenviduParamsService } from '../../services/openvidu-params.service';
import { TestFeedService } from '../../services/test-feed.service';
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
  eventsInfoSubscription: Subscription;

  // OpenViduInstance collection
  users: SessionConf[] = [];

  numberSubs = 3;
  autoJoin = false;
  useMediasoup = false;

  constructor(private openviduParamsService: OpenviduParamsService, private testFeedService: TestFeedService) { }

  ngOnInit() {
    const openviduParams = this.openviduParamsService.getParams();
    this.openviduUrl = openviduParams.openviduUrl;
    this.openviduSecret = openviduParams.openviduSecret;

    this.paramsSubscription = this.openviduParamsService.newParams$.subscribe(
      params => {
        this.openviduUrl = params.openviduUrl;
        this.openviduSecret = params.openviduSecret;
      });

    this.eventsInfoSubscription = this.testFeedService.newLastEvent$.subscribe(
      newEvent => {
        (window as any).myEvents += ('<br>' + this.testFeedService.stringifyEventNoCircularDependencies(newEvent));
      });
  }

  ngOnDestroy() {
    this.paramsSubscription.unsubscribe();
    this.eventsInfoSubscription.unsubscribe();
  }

  addUser(): void {
    this.users.push({
      subscribeTo: true,
      publishTo: true,
      startSession: false
    });
  }

  removeUser(): void {
    this.users.pop();
  }

  removeAllUsers(): void {
    this.users = [];
  }

  private loadSubsPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: true,
        publishTo: true,
        startSession: this.autoJoin
      });
    }
  }

  private loadSubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: true,
        publishTo: false,
        startSession: this.autoJoin
      });
    }
  }

  private loadPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: false,
        publishTo: true,
        startSession: this.autoJoin
      });
    }
  }

  loadScenario(subsPubs: number, pubs: number, subs: number): void {
    this.users = [];
    this.loadSubsPubs(subsPubs);
    this.loadPubs(pubs);
    this.loadSubs(subs);
  }

}
