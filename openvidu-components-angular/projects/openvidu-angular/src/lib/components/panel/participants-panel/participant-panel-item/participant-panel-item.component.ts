import { Component, Input, OnInit } from '@angular/core';

@Component({
	selector: 'ov-participant-panel-item',
	templateUrl: './participant-panel-item.component.html',
	styleUrls: ['./participant-panel-item.component.css']
})
export class ParticipantPanelItemComponent implements OnInit {
	@Input() name: string;
	@Input() connections: string;
	@Input() showDividerLine: boolean;

	constructor() {}

	ngOnInit(): void {}
}
