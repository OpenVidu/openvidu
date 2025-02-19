import { animate, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { TestFeedService } from 'src/app/services/test-feed.service';
import stringify from 'json-stringify-safe';

export interface RoomConf {
  subscriber: boolean;
  publisher: boolean;
  startSession: boolean;
}

@Component({
    selector: 'app-test-sessions',
    templateUrl: './test-sessions.component.html',
    styleUrls: ['./test-sessions.component.css'],
    animations: [
        trigger('fadeAnimation', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('100ms', style({ opacity: 1 })),
            ]),
        ]),
    ],
    standalone: false
})
export class TestSessionsComponent {
  eventsInfoSubscription: Subscription;

  // OpenViduInstance collection
  users: RoomConf[] = [];

  numberParticipants = 2;
  autoJoin = false;

  constructor(private testFeedService: TestFeedService) {}

  ngOnInit() {
    (window as any).myEvents = '';
    this.eventsInfoSubscription = this.testFeedService.newLastEvent$.subscribe(
      (newEvent) => {
        (window as any).myEvents += '<br>' + stringify(newEvent);
      }
    );
  }

  ngOnDestroy() {
    this.eventsInfoSubscription.unsubscribe();
  }

  addUser(): void {
    this.users.push({
      subscriber: true,
      publisher: true,
      startSession: false,
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
        subscriber: true,
        publisher: true,
        startSession: this.autoJoin,
      });
    }
  }

  private loadSubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscriber: true,
        publisher: false,
        startSession: this.autoJoin,
      });
    }
  }

  private loadPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscriber: false,
        publisher: true,
        startSession: this.autoJoin,
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
