import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { RecordingInfo } from '../../models/recording.model';
import { ActionService } from '../../services/action/action.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { RecordingService } from '../../services/recording/recording.service';

@Component({
	selector: 'ov-admin-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
	/**
	 * Provides event notifications that fire when download recording button has been clicked.
	 * The recording should be downloaded using the REST API.
	 */
	@Output() onDownloadRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * The recording should be deleted using the REST API.
	 */
	@Output() onDeleteRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when play recording button has been clicked.
	 */
	@Output() onPlayRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * @internal
	 */
	recordings: RecordingInfo[] = [];
	/**
	 * @internal
	 */
	sortDescendent = true;
	/**
	 * @internal
	 */
	sortByLegend = 'Sort by';
	/**
	 * @internal
	 */
	searchValue = '';
	private adminSubscription: Subscription;
	/**
	 * @internal
	 */
	constructor(
		private actionService: ActionService,
		private recordingService: RecordingService,
		private libService: OpenViduAngularConfigService
	) {}

	/**
	 * @internal
	 */
	ngOnInit(): void {
		this.subscribeToAdminDirectives();
	}
	ngOnDestroy() {
		if (this.adminSubscription) this.adminSubscription.unsubscribe();
	}

	/**
	 * @internal
	 */
	sortRecordingsByDate() {
		this.recordings.sort((a, b) => {
			if (a.createdAt > b.createdAt) {
				return this.sortDescendent ? -1 : 1;
			} else if (a.createdAt < b.createdAt) {
				return this.sortDescendent ? 1 : -1;
			} else {
				return 0;
			}
		});
		this.sortByLegend = 'Date';
	}

	/**
	 * @internal
	 */
	sortRecordingsByDuration() {
		this.recordings.sort((a, b) => {
			if (a.duration > b.duration) {
				return this.sortDescendent ? -1 : 1;
			} else if (a.duration < b.duration) {
				return this.sortDescendent ? 1 : -1;
			} else {
				return 0;
			}
		});
		this.sortByLegend = 'Duration';
	}

	/**
	 * @internal
	 */
	sortRecordingsBySize() {
		this.recordings.sort((a, b) => {
			if (a.size > b.size) {
				return this.sortDescendent ? -1 : 1;
			} else if (a.size < b.size) {
				return this.sortDescendent ? 1 : -1;
			} else {
				return 0;
			}
		});
		this.sortByLegend = 'Size';
	}

	/**
	 * @internal
	 */
	getThumbnailSrc(recording: RecordingInfo): string {
		return !recording.url ? undefined : recording.url.substring(0, recording.url.lastIndexOf('/')) + '/' + recording.id + '.jpg';
	}

	/**
	 * @internal
	 */
	deleteRecording(recordingId: string) {
		const succsessCallback = () => {
			this.onDeleteRecordingClicked.emit(recordingId);
		};
		this.actionService.openDeleteRecordingDialog(succsessCallback);
	}

	/**
	 * @internal
	 */
	download(recordingId: string) {
		//TODO solucionar el tema del login.
		// TODO Si soy capaz de loguearme en openvidu al hacer login en el dashboard, no necesitaria emitir evento
		this.onDownloadRecordingClicked.emit(recordingId);
	}

	/**
	 * @internal
	 */
	async play(recording: RecordingInfo) {
		this.actionService.openRecordingPlayerDialog(recording.url, 'video/mp4', true);
	}

	private subscribeToAdminDirectives() {
		this.adminSubscription = this.libService.adminRecordingsListObs.subscribe((recordings: RecordingInfo[]) => {
			this.recordings = recordings;
		});
	}
}
