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
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * The recording should be deleted using the REST API.
	 * @param recordingId
	 */
	@Output() onDeleteRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when refresh recordings button has been clicked.
	 */
	@Output() onRefreshRecordingsClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when logout button has been clicked.
	 */
	@Output() onLogoutClicked: EventEmitter<void> = new EventEmitter<void>();

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

	/**
	 * @internal
	 */
	ngOnDestroy() {
		if (this.adminSubscription) this.adminSubscription.unsubscribe();
	}

	/**
	 * @internal
	 */
	logout() {
		this.onLogoutClicked.emit();
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
	deleteRecording(recordingId: string) {
		const succsessCallback = () => {
			this.onDeleteRecordingClicked.emit(recordingId);
		};
		this.actionService.openDeleteRecordingDialog(succsessCallback);
	}

	/**
	 * @internal
	 */
	download(recording: RecordingInfo) {
		this.recordingService.downloadRecording(recording);
	}

	/**
	 * @internal
	 */
	refreshRecordings() {
		this.onRefreshRecordingsClicked.emit();
	}

	/**
	 * @internal
	 */
	async play(recording: RecordingInfo) {
		this.recordingService.playRecording(recording);
	}

	private subscribeToAdminDirectives() {
		this.adminSubscription = this.libService.adminRecordingsListObs.subscribe((recordings: RecordingInfo[]) => {
			this.recordings = recordings;
		});
	}
}
