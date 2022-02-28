import { Component, Input } from '@angular/core';
import { ParticipantAbstractModel } from '../../../../models/participant.model';

@Component({
	selector: 'ov-participant-panel-item',
	templateUrl: './participant-panel-item.component.html',
	styleUrls: ['./participant-panel-item.component.css']
})
export class ParticipantPanelItemComponent {

	@Input()
	set participant( p: ParticipantAbstractModel) {
		this._participant = p;
	}
	_participant: ParticipantAbstractModel;
	constructor() {}

	toggleMuteForcibly() {
		this._participant.setMutedForcibly(!this._participant.isMutedForcibly);
	}

}
