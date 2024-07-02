import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
	title = 'openvidu-components-angular';
	private areStaticVideosEnabled = false;

	constructor(private router: Router) {}

	ngOnInit(): void {}

	goTo(path: string) {
		this.router.navigate([`/${path}`], { queryParams: { staticVideos: this.areStaticVideosEnabled } });
	}

	staticVideosChanged(value: boolean) {
		console.warn('VC video enabled: ', value);
		this.areStaticVideosEnabled = value;
	}
}

