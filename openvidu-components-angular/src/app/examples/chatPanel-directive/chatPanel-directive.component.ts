import { Component, OnInit } from '@angular/core';

@Component({
	selector: 'app-chatPanel-directive',
	template: ` <p>toolbar-directive works!</p> `,
	styleUrls: ['./chatPanel-directive.component.scss']
})
export class ChatPanelDirectiveComponent implements OnInit {
	constructor() {}

	ngOnInit(): void {}
}
