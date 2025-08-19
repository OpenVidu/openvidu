import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { CustomDevice } from '../../../models/device.model';
import { DeviceService } from '../../../services/device/device.service';
import { ParticipantService } from '../../../services/participant/participant.service';
import { StorageService } from '../../../services/storage/storage.service';
import { ParticipantModel } from '../../../models/participant.model';

/**
 * @internal
 */
@Component({
	selector: 'ov-audio-devices-select',
	templateUrl: './audio-devices.component.html',
	styleUrls: ['./audio-devices.component.scss'],
	standalone: false
})
export class AudioDevicesComponent implements OnInit, OnDestroy {
	@Input() compact: boolean = false;
	@Output() onAudioDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onAudioEnabledChanged = new EventEmitter<boolean>();

	microphoneStatusChanging: boolean;
	hasAudioDevices: boolean;
	isMicrophoneEnabled: boolean;
	microphoneSelected: CustomDevice | undefined;
	microphones: CustomDevice[] = [];
	private localParticipantSubscription: Subscription;

	constructor(
		private deviceSrv: DeviceService,
		private storageSrv: StorageService,
		private participantService: ParticipantService
	) {}

	async ngOnInit() {
		this.subscribeToParticipantMediaProperties();
		this.hasAudioDevices = this.deviceSrv.hasAudioDeviceAvailable();
		if (this.hasAudioDevices) {
			this.microphones = this.deviceSrv.getMicrophones();
			this.microphoneSelected = this.deviceSrv.getMicrophoneSelected();
		}

		this.isMicrophoneEnabled = this.participantService.isMyMicrophoneEnabled();
	}

	ngOnDestroy() {
		this.microphones = [];
		if (this.localParticipantSubscription) this.localParticipantSubscription.unsubscribe();
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
		const device: CustomDevice = event?.value;
		if (this.deviceSrv.needUpdateAudioTrack(device)) {
			this.microphoneStatusChanging = true;
			await this.participantService.switchMicrophone(device.device);
			this.deviceSrv.setMicSelected(device.device);
			this.microphoneSelected = this.deviceSrv.getMicrophoneSelected();
			this.microphoneStatusChanging = false;
			this.onAudioDeviceChanged.emit(this.microphoneSelected);
		}
	}

	/**
	 * @internal
	 * Compare two devices to check if they are the same. Used by the mat-select
	 */
	compareObjectDevices(o1: CustomDevice, o2: CustomDevice): boolean {
		return o1.label === o2.label;
	}

	/**
	 * This subscription is necessary to update the microphone status when the user changes it from toolbar and
	 * the settings panel is opened. With this, the microphone status is updated in the settings panel.
	 */
	private subscribeToParticipantMediaProperties() {
		this.localParticipantSubscription = this.participantService.localParticipant$.subscribe((p: ParticipantModel | undefined) => {
			if (p) {
				this.isMicrophoneEnabled = p.isMicrophoneEnabled;
				this.storageSrv.setMicrophoneEnabled(this.isMicrophoneEnabled);
			}
		});
	}
}
