import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantAbstractModel } from '../../../models/participant.model';
import { ParticipantService } from '../../../services/participant/participant.service';
import { StorageService } from '../../../services/storage/storage.service';


/**
 * @internal
 */
@Component({
	selector: 'ov-nickname-input',
	templateUrl: './nickname-input.component.html',
	styleUrls: ['./nickname-input.component.css']
})
export class NicknameInputComponent implements OnInit {
	nickname: string;
	localParticipantSubscription: Subscription;

	constructor(private participantService: ParticipantService, private storageSrv: StorageService) {}

	ngOnInit(): void {
		this.subscribeToParticipantProperties();
		this.nickname = this.participantService.getMyNickname();
	}

	updateNickname() {
		this.nickname = this.nickname === '' ? this.participantService.getMyNickname() : this.nickname;
		this.participantService.setMyNickname(this.nickname);
		this.storageSrv.setNickname(this.nickname);
	}

	private subscribeToParticipantProperties() {
		this.localParticipantSubscription = this.participantService.localParticipantObs.subscribe((p: ParticipantAbstractModel) => {
			if (p) {
				this.nickname = p.getNickname();
			}
		});
	}
}
