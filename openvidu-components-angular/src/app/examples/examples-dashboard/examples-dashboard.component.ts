import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-examples-dashboard',
  templateUrl: './examples-dashboard.component.html',
  styleUrls: ['./examples-dashboard.component.scss']
})
export class ExamplesDashboardComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {}

  goTo(path: string) {
    this.router.navigate([`/${path}`]);
  }

}
