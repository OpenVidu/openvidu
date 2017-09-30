import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { OpenviduParamsService } from '../../services/openvidu-params.service';

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
  users = [true];

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

  private addUser() {
    this.users.push(true);
  }

}
