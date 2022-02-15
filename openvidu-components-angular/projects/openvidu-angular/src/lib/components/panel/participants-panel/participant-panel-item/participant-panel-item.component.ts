import { Component, Input, OnInit } from '@angular/core';
import { ParticipantAbstractModel } from '../../../../models/participant.model';

@Component({
	selector: 'ov-participant-panel-item',
	templateUrl: './participant-panel-item.component.html',
	styleUrls: ['./participant-panel-item.component.css']
})
export class ParticipantPanelItemComponent implements OnInit {
	@Input() participant: ParticipantAbstractModel;
	@Input() showDividerLine: boolean;

	constructor() {}

	ngOnInit(): void {}
}
