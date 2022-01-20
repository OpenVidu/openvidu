import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
	title = 'openvidu-angular';

	constructor(private router: Router) {}

	ngOnInit(): void {}

	goTo(path: string) {
		this.router.navigate([`/${path}`]);
	}
}
