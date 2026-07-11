import { animate, style, transition, trigger } from '@angular/animations';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TestFeedService } from 'src/app/services/test-feed.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { OpenviduInstanceComponent } from '../openvidu-instance/openvidu-instance.component';
import stringify from 'json-stringify-safe';

export interface RoomConf {
  // Stable unique id for this instance
  uid: number;
  subscriber: boolean;
  publisher: boolean;
  startSession: boolean;
}

@Component({
    selector: 'app-test-sessions',
    templateUrl: './test-sessions.component.html',
    styleUrl: './test-sessions.component.css',
    animations: [
        trigger('fadeAnimation', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('100ms', style({ opacity: 1 })),
            ]),
        ]),
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, OpenviduInstanceComponent],
})
export class TestSessionsComponent {
  eventsInfoSubscription: Subscription;

  // OpenViduInstance collection
  users: RoomConf[] = [];

  // Monotonic counter assigning a stable uid to each instance. Reset only on a
  // full clear (removeAllUsers / loadScenario), never on individual removals, so
  // uids are never reused while instances come and go.
  private nextUid = 0;

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

  private pushUser(conf: Omit<RoomConf, 'uid'>): void {
    this.users.push({ uid: this.nextUid++, ...conf });
  }

  addUser(): void {
    this.pushUser({
      subscriber: true,
      publisher: true,
      startSession: false,
    });
  }

  removeUser(): void {
    this.users.pop();
  }

  // Remove a single instance by its stable uid (emitted by its remove button).
  removeUserByUid(uid: number): void {
    this.users = this.users.filter((user) => user.uid !== uid);
  }

  removeAllUsers(): void {
    this.users = [];
    this.nextUid = 0;
  }

  private loadSubsPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.pushUser({
        subscriber: true,
        publisher: true,
        startSession: this.autoJoin,
      });
    }
  }

  private loadSubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.pushUser({
        subscriber: true,
        publisher: false,
        startSession: this.autoJoin,
      });
    }
  }

  private loadPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.pushUser({
        subscriber: false,
        publisher: true,
        startSession: this.autoJoin,
      });
    }
  }

  loadScenario(subsPubs: number, pubs: number, subs: number): void {
    this.users = [];
    this.nextUid = 0;
    this.loadSubsPubs(subsPubs);
    this.loadPubs(pubs);
    this.loadSubs(subs);
  }
}
