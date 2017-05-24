import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { InfoService } from '../../services/info.service';

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

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.log('[Error]:' + err.toString());
    }
  }

}
