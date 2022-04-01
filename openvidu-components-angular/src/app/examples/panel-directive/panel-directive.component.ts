import { Component, OnInit } from '@angular/core';

@Component({
	selector: 'app-panel-directive',
	template: ` <p>toolbar-directive works!</p> `,
	styleUrls: ['./panel-directive.component.scss']
})
export class PanelDirectiveComponent implements OnInit {
	constructor() {}

	ngOnInit(): void {}
}
