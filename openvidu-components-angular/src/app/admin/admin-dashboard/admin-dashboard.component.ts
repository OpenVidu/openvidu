import { Component, OnInit } from '@angular/core';
import { RecordingDeleteRequestedEvent, RecordingInfo } from 'openvidu-components-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-admin-dashboard',
	templateUrl: './admin-dashboard.component.html',
	styleUrls: ['./admin-dashboard.component.scss'],
	standalone: false
})
export class AdminDashboardComponent implements OnInit {
	recordings: RecordingInfo[] = [];
	logged: boolean;
	error: any;
	private continuationToken: string;
	constructor(private restService: RestService) {}

	async ngOnInit() {
		// try {
		// 	const resp: any = await this.restService.login('');
		// 	this.logged = true;
		// 	this.recordings = resp.recordings;
		// } catch (error) {
		// 	this.logged = false;
		// 	console.log(error);
		// }
	}

	async login(credentials: { username: string; password: string }) {
		try {
			const resp: any = await this.restService.login(credentials);
			this.logged = true;

			const response = await this.restService.getRecordings(this.continuationToken);

			this.recordings = response.recordings;
			this.continuationToken = response.continuationToken;
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
		const response = await this.restService.getRecordings();
		this.recordings = response.recordings;
		this.continuationToken = response.continuationToken;
	}

	async onLoadMoreRecordingsRequested() {
		if (!this.continuationToken) return console.warn('No more recordings to load');
		const response = await this.restService.getRecordings(this.continuationToken);
		this.recordings = response.recordings;
		this.continuationToken = response.continuationToken;
	}

	async onDeleteRecordingClicked(recording: RecordingDeleteRequestedEvent) {
		console.warn('DELETE RECORDING CLICKED', recording);

		try {
			await this.restService.deleteRecordingByAdmin(recording.recordingId);
			const response = await this.restService.getRecordings();
			this.recordings = response.recordings;
		} catch (error) {
			console.error(error);
		}
	}
}
