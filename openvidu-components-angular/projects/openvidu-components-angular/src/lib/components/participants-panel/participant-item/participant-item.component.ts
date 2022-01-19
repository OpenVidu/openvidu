import { Component, Input, OnInit } from '@angular/core';

@Component({
	selector: 'ov-participant-item',
	templateUrl: './participant-item.component.html',
	styleUrls: ['./participant-item.component.css']
})
export class ParticipantItemComponent implements OnInit {
	@Input() name: string;
	@Input() connections: string;
	@Input() showDividerLine: boolean;

	constructor() {}

	ngOnInit(): void {}
}
