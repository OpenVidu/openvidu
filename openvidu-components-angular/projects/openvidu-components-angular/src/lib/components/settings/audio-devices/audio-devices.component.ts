import { Component, effect, EventEmitter, Input, OnInit, Output, Signal, WritableSignal } from '@angular/core';
import { CustomDevice } from '../../../models/device.model';
import { ILogger } from '../../../models/logger.model';
import { DeviceService } from '../../../services/device/device.service';
import { LoggerService } from '../../../services/logger/logger.service';
import { ParticipantService } from '../../../services/participant/participant.service';
import { StorageService } from '../../../services/storage/storage.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-audio-devices-select',
	templateUrl: './audio-devices.component.html',
	styleUrls: ['./audio-devices.component.scss'],
	standalone: false
})
export class AudioDevicesComponent implements OnInit {
	@Input() compact: boolean = false;
	@Output() onAudioDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onAudioEnabledChanged = new EventEmitter<boolean>();

	microphoneStatusChanging: boolean = false;
	isMicrophoneEnabled: boolean = false;
	private log: ILogger;

	// Expose signals directly from service (reactive)
	protected readonly microphones: WritableSignal<CustomDevice[]>;
	protected readonly microphoneSelected: WritableSignal<CustomDevice | undefined>;
	protected readonly hasAudioDevices: Signal<boolean>;

	constructor(
		private deviceSrv: DeviceService,
		private storageSrv: StorageService,
		private participantService: ParticipantService,
		private loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('AudioDevicesComponent');
		this.microphones = this.deviceSrv.microphones;
		this.microphoneSelected = this.deviceSrv.microphoneSelected;
		this.hasAudioDevices = this.deviceSrv.hasAudioDevices;

		// Use effect instead of subscription for reactive updates
		effect(() => {
			const participant = this.participantService.localParticipantSignal();
			if (participant) {
				this.isMicrophoneEnabled = participant.isMicrophoneEnabled;
				this.storageSrv.setMicrophoneEnabled(this.isMicrophoneEnabled);
			}
		});
	}

	async ngOnInit() {
		this.isMicrophoneEnabled = this.participantService.isMyMicrophoneEnabled();
	}

	async toggleMic(event: any) {
		event.stopPropagation();
		this.microphoneStatusChanging = true;
		this.isMicrophoneEnabled = !this.isMicrophoneEnabled;
		await this.participantService.setMicrophoneEnabled(this.isMicrophoneEnabled);
		this.microphoneStatusChanging = false;
		this.storageSrv.setMicrophoneEnabled(this.isMicrophoneEnabled);
		this.onAudioEnabledChanged.emit(this.isMicrophoneEnabled);
	}

	async onMicrophoneSelected(event: any) {
		try {
			const device: CustomDevice = event?.value;
			if (this.deviceSrv.needUpdateAudioTrack(device)) {
				this.microphoneStatusChanging = true;
				await this.participantService.switchMicrophone(device.device);
				this.deviceSrv.setMicSelected(device.device);
				this.onAudioDeviceChanged.emit(this.microphoneSelected());
			}
		} catch (error) {
			this.log.e('Error switching microphone', error);
		} finally {
			this.microphoneStatusChanging = false;
		}
	}

	/**
	 * @internal
	 * Compare two devices to check if they are the same. Used by the mat-select
	 */
	compareObjectDevices(o1: CustomDevice, o2: CustomDevice): boolean {
		return o1.label === o2.label;
	}
}
