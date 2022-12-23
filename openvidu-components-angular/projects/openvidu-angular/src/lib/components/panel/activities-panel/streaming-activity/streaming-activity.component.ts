import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { Signal } from '../../../../models/signal.model';
import { StreamingError, StreamingInfo, StreamingStatus } from '../../../../models/streaming.model';
import { OpenViduAngularConfigService } from '../../../../services/config/openvidu-angular.config.service';
import { OpenViduService } from '../../../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { StreamingService } from '../../../../services/streaming/streaming.service';

@Component({
	selector: 'ov-streaming-activity',
	templateUrl: './streaming-activity.component.html',
	styleUrls: ['./streaming-activity.component.css', '../activities-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class StreamingActivityComponent implements OnInit {
	/**
	 * Provides event notifications that fire when start streaming button has been clicked.
	 * The streaming should be started using the REST API.
	 */
	@Output() onStartStreamingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when stop streaming button has been clicked.
	 * The streaming should be stopped using the REST API.
	 */
	@Output() onStopStreamingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * @internal
	 */
	urlRequiredError: boolean = false;

	/**
	 * @internal
	 */
	oldStreamingStatus: StreamingStatus;
	/**
	 * @internal
	 */
	rtmpUrl: string = '';

	/**
	 * @internal
	 */
	@Input() expanded: boolean;

	/**
	 * @internal
	 */
	streamingError: StreamingError | undefined;

	/**
	 * @internal
	 */
	streamingStatus: StreamingStatus = StreamingStatus.STOPPED;
	/**
	 * @internal
	 */
	streamingStatusEnum = StreamingStatus;
	/**
	 * @internal
	 */
	opened: boolean = false;
	/**
	 * @internal
	 */
	isSessionCreator: boolean = false;
	/**
	 * @internal
	 */
	isRtmpModuleAvailable: boolean = true;
	private streamingSub: Subscription;
	private streamingInfoSub: Subscription;
	private streamingErrorSub: Subscription;

	/**
	 * @internal
	 */
	constructor(
		private streamingService: StreamingService,
		private participantService: ParticipantService,
		private openviduService: OpenViduService,
		private libService: OpenViduAngularConfigService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @internal
	 */
	ngOnInit(): void {
		this.isSessionCreator = this.participantService.amIModerator();
		this.subscribeToStreamingStatus();
		this.subscribeToStreamingInfo();
		this.subscribeToStreamingError();
	}

	/**
	 * @internal
	 */
	ngOnDestroy() {
		if (this.streamingSub) this.streamingSub.unsubscribe();
		if (this.streamingInfoSub) this.streamingInfoSub.unsubscribe();
		if (this.streamingErrorSub) this.streamingErrorSub.unsubscribe();
	}

	/**
	 * @internal
	 */
	panelOpened() {
		this.opened = true;
	}

	/**
	 * @internal
	 */
	panelClosed() {
		this.opened = false;
	}

	/**
	 * @ignore
	 */
	eventKeyPress(event) {
		// Pressed 'Enter' key
		if (event && event.keyCode === 13) {
			event.preventDefault();
			this.startStreaming();
		}
	}

	/**
	 * @internal
	 */
	startStreaming() {
		if (!!this.rtmpUrl) {
			this.isRtmpModuleAvailable = true;
			this.streamingError = undefined;
			this.streamingService.updateStatus(StreamingStatus.STARTING);
			this.onStartStreamingClicked.emit(this.rtmpUrl);
		}
		this.urlRequiredError = !this.rtmpUrl;
	}

	/**
	 * @internal
	 */
	stopStreaming() {
		this.onStopStreamingClicked.emit();
		this.streamingService.updateStatus(StreamingStatus.STOPPING);
	}

	private subscribeToStreamingStatus() {
		this.streamingSub = this.streamingService.streamingStatusObs.subscribe(
			(ev: { status: StreamingStatus; time?: Date } | undefined) => {
				if (!!ev) {
					this.streamingStatus = ev.status;
					this.cd.markForCheck();
					if (this.isSessionCreator) {
						//TODO: Remove it when RTMP Exported was included on OV and streaming ready event was fired.
						const signal =
							this.streamingStatus === StreamingStatus.STARTED ? Signal.STREAMING_STARTED : Signal.STREAMING_STOPPED;
						this.openviduService.sendSignal(signal);
					}
				}
			}
		);
	}

	//TODO: Remove this directive when RTMP Exported was included on OV and streaming ready event was fired.
	private subscribeToStreamingInfo() {
		this.streamingInfoSub = this.libService.streamingInfoObs.subscribe((info: StreamingInfo | undefined) => {
			if (!!info) {
				this.streamingService.updateStatus(info.status);
				this.cd.markForCheck();
			}
		});
	}

	private subscribeToStreamingError() {
		this.streamingErrorSub = this.libService.streamingErrorObs.subscribe((error: StreamingError | undefined) => {
			if (!!error) {
				this.streamingError = error;
				this.isRtmpModuleAvailable = error.rtmpAvailable;
				this.streamingService.updateStatus(StreamingStatus.FAILED);
				this.cd.markForCheck();
			}
		});
	}
}
