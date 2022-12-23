import { Component, OnInit } from '@angular/core';
import { RecordingService } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-admin-dashboard',
	templateUrl: './admin-dashboard.component.html',
	styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
	recordings: any[] = [];
	logged: boolean;
	error: any;
	constructor(private restService: RestService, private recordingService: RecordingService) {}

	async ngOnInit() {
		try {
			const resp: any = await this.restService.login('');
			this.logged = true;
			this.recordings = resp.recordings;
		} catch (error) {
			this.logged = false;
			console.log(error);
		}
	}

	async login(pass: string) {
		try {
			const resp: any = await this.restService.login(pass);
			this.logged = true;
			this.recordings = resp.recordings;
		} catch (error) {
			this.error = error;
			console.log(error);
		}
	}

	async onLogoutClicked() {
		this.logged = false;
		await this.restService.logout();
	}

	async onRefreshRecordingsClicked() {
		console.log('GET ALL ');
		const ecordings = await this.restService.getRecordings();
		console.log(this.recordings);
		this.recordings = ecordings;
	}

	async onDeleteRecordingClicked(recordingId: string) {
		console.warn('DELETE RECORDING CLICKED');

		try {
			this.recordings = await this.restService.deleteRecording(recordingId);
		} catch (error) {
			console.error(error);
		}
	}

}
