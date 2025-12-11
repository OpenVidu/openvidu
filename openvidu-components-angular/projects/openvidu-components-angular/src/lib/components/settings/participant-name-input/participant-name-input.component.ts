import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppMaterialModule } from '../../../openvidu-components-angular.material.module';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Subscription } from 'rxjs';
import { ParticipantService } from '../../../services/participant/participant.service';
import { StorageService } from '../../../services/storage/storage.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-participant-name-input',
	templateUrl: './participant-name-input.component.html',
	styleUrls: ['./participant-name-input.component.scss'],
	standalone: true,
	imports: [CommonModule, FormsModule, AppMaterialModule, TranslatePipe]
})
export class ParticipantNameInputComponent implements OnInit {
	name: string;
	localParticipantSubscription: Subscription;
	@Input() isPrejoinPage: boolean;
	@Input() error: boolean;
	@Output() onNameUpdated = new EventEmitter<string>();
	@Output() onEnterPressed = new EventEmitter<void>();

	constructor(
		private participantService: ParticipantService,
		private storageSrv: StorageService
	) {}

	ngOnInit(): void {
		this.subscribeToParticipantProperties();
		const myName = this.participantService.getMyName();
		const storedName = this.storageSrv.getParticipantName();

		this.name = myName ?? storedName ?? this.generateRandomName();

		if (!myName && !storedName) {
			this.storageSrv.setParticipantName(this.name);
		}

		this.onNameUpdated.emit(this.name);
	}

	/**
	 * As updating name requires that the participant has the `canUpdateOwnMetadata` to true in server side, which is a little bit insecure,
	 * we decided to not allow this feature for now.
	 */
	updateName() {
		if (this.isPrejoinPage) {
			this.name = this.name ?? this.participantService.getMyName();
			// this.participantService.setMyName(this.name);
			this.storageSrv.setParticipantName(this.name);
			this.onNameUpdated.emit(this.name);
		}
	}

	/**
	 * @ignore
	 */
	eventKeyPress(event) {
		// Pressed 'Enter' key
		if (event && event.keyCode === 13 && this.name) {
			event.preventDefault();
			this.updateName();
			this.onEnterPressed.emit();
		}
	}

	private subscribeToParticipantProperties() {
		// this.localParticipantSubscription = this.participantService.localParticipant$.subscribe((p: ParticipantModel | undefined) => {
		// 	if (p) {
		// 		this.name = p.name;
		// 	}
		// });
	}

	private generateRandomName(): string {
		return 'OpenVidu_User_' + Math.floor(Math.random() * 100);
	}
}
