import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppMaterialModule } from '../../openvidu-components-angular.material.module';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SearchByStringPropertyPipe } from '../../pipes/recording.pipe';
import { Subscription } from 'rxjs';
import { RecordingDeleteRequestedEvent, RecordingInfo, RecordingStatus } from '../../models/recording.model';
import { ActionService } from '../../services/action/action.service';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';
import { RecordingService } from '../../services/recording/recording.service';

@Component({
	selector: 'ov-admin-dashboard',
	templateUrl: './admin-dashboard.component.html',
	styleUrls: ['./admin-dashboard.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		AppMaterialModule,
		TranslatePipe,
		SearchByStringPropertyPipe
	]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * The recording should be deleted using the REST API.
	 * @param recordingId
	 */
	@Output() onRecordingDeleteRequested: EventEmitter<RecordingDeleteRequestedEvent> = new EventEmitter<RecordingDeleteRequestedEvent>();

	/**
	 * Provides event notifications that fire when refresh recordings button has been clicked.
	 * The recordings should be updated using the REST API.
	 */
	@Output() onRefreshRecordingsRequested: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when load more button has been clicked.
	 * The recordings should be updated using the REST API with the continuation token.
	 */
	@Output() onLoadMoreRecordingsRequested: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when logout button has been clicked.
	 */
	@Output() onLogoutRequested: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * @internal
	 */
	title = '';

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
	/**
	 * @internal
	 */
	recordingStatusEnum = RecordingStatus;
	private recordingsSub: Subscription;
	private titleSub: Subscription;

	/**
	 * @internal
	 */
	constructor(
		private actionService: ActionService,
		private recordingService: RecordingService,
		private libService: OpenViduComponentsConfigService
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
		if (this.recordingsSub) this.recordingsSub.unsubscribe();
		if (this.titleSub) this.titleSub.unsubscribe();
	}

	/**
	 * @internal
	 */
	logout() {
		this.onLogoutRequested.emit();
	}

	/**
	 * @internal
	 */
	refreshRecordings() {
		this.recordings = [];
		this.onRefreshRecordingsRequested.emit();
	}

	/**
	 * @internal
	 */
	sortRecordingsByDateStart() {
		this.recordings.sort((a, b) => {
			if (!a.startedAt || !b.startedAt) return 0;
			if (a.startedAt > b.startedAt) {
				return this.sortDescendent ? -1 : 1;
			} else if (a.startedAt < b.startedAt) {
				return this.sortDescendent ? 1 : -1;
			} else {
				return 0;
			}
		});
		this.sortByLegend = 'Start Date';
	}

	/**
	 * @internal
	 */
	sortRecordingsByDateEnd() {
		this.recordings.sort((a, b) => {
			if (!a.endedAt || !b.endedAt) return 0;
			if (a.endedAt > b.endedAt) {
				return this.sortDescendent ? -1 : 1;
			} else if (a.endedAt < b.endedAt) {
				return this.sortDescendent ? 1 : -1;
			} else {
				return 0;
			}
		});
		this.sortByLegend = 'End Date';
	}

	/**
	 * @internal
	 */
	sortRecordingsByDuration() {
		this.recordings.sort((a, b) => {
			if (!a.duration || !b.duration) return 0;
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
			if (!a.size || !b.size) return 0;
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
	loadMore(event: any) {
		if (event) {
			this.onLoadMoreRecordingsRequested.emit();
		}
	}

	/**
	 * @internal
	 */
	deleteRecording(recording: RecordingInfo) {
		const succsessCallback = async () => {
			if (!recording.id) {
				throw new Error('Error deleting recording. Recording id is undefined');
			}
			const payload: RecordingDeleteRequestedEvent = {
				roomName: recording.roomName,
				recordingId: recording.id
			};
			this.onRecordingDeleteRequested.emit(payload);
			//mark the recording as deleted
			recording.markedForDeletion = true;
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
	async play(recording: RecordingInfo) {
		this.recordingService.playRecording(recording);
	}

	/**
	 * @internal
	 */
	trackByRecordingId(index: number, recording: any): any {
		return recording.id;
	}

	private filterDeletedRecordings(recordings: RecordingInfo[]) {
		this.recordings = this.recordings.filter(
		  (recording) => !recording.markedForDeletion && recordings.some((r) => r.id === recording.id)
		);
	  }

	  private mergeRecordings(recordings: RecordingInfo[]) {
		const recordingMap = new Map(this.recordings.map((recording) => [recording.id, recording]));
		recordings.forEach((recording) => recordingMap.set(recording.id, recording));
		this.recordings = Array.from(recordingMap.values());
	  }

	private sortRecordings() {
		switch (this.sortByLegend) {
			case 'End Date':
				this.sortRecordingsByDateEnd();
				break;
			case 'Start Date':
				this.sortRecordingsByDateStart();
				break;
			case 'Duration':
				this.sortRecordingsByDuration();
				break;
			case 'Size':
				this.sortRecordingsBySize();
				break;
			default:
				this.sortRecordingsByDateEnd();
				break;
		}
	}

	private subscribeToAdminDirectives() {
		this.recordingsSub = this.libService.adminRecordingsList$.subscribe((recordings: RecordingInfo[]) => {

			// Remove the recordings that are marked for deletion
			this.filterDeletedRecordings(recordings);

			// Merge the new recordings and avoid duplicates
			this.mergeRecordings(recordings);

			this.sortRecordings();
		});

		this.titleSub = this.libService.adminDashboardTitle$.subscribe((value) => {
			this.title = value;
		});
	}
}
