import { Component, OnInit } from '@angular/core';
import { RestService } from '../services/rest.service';

interface TemplateDirectives {
	name: string;
	subDirectives?: TemplateDirectives[];
}

enum DirectiveId {
	TOOLBAR = 'ovToolbar',
	TOOLBAR_BUTTONS = 'ovToolbarAdditionalButtons',
	PANEL = 'ovPanel',
	CHAT_PANEL = 'ovChatPanel',
	PARTICIPANTS_PANEL = 'ovParticipantsPanel',
	PARTICIPANTS_PANEL_ITEM = 'ovParticipantPanelItem',
	PARTICIPANTS_PANEL_ITEM_ELEMENT = 'ovParticipantPanelItemElements',
	LAYOUT = 'ovLayout',
	STREAM = 'ovStream'
}

@Component({
	selector: 'app-testing',
	templateUrl: './testing.component.html',
	styleUrls: ['./testing.component.scss']
})
export class TestingComponent implements OnInit {
	directives: TemplateDirectives[] = [
		{
			name: 'ovToolbar',
			subDirectives: [{ name: 'ovToolbarAdditionalButtons' }]
		},

		{
			name: 'ovPanel',
			subDirectives: [
				{ name: 'ovChatPanel' },
				{
					name: 'ovParticipantsPanel',
					subDirectives: [
						{
							name: 'ovParticipantPanelItem',
							subDirectives: [{ name: 'ovParticipantPanelItemElements' }]
						}
					]
				}
			]
		},
		{
			name: 'ovLayout',
			subDirectives: [{ name: 'ovStream' }]
		}
	];

	showDirectives: boolean = true;
	ovToolbarSelected = false;
	ovToolbarAdditionalButtonsSelected = false;
	ovPanelSelected = false;
	ovChatPanelSelected = false;
	ovParticipantsPanelSelected = false;
	ovParticipantPanelItemSelected = false;
	ovParticipantPanelItemElementsSelected = false;
	ovLayoutSelected = false;
	ovStreamSelected = false;
	tokens: { webcam: any; screen: any };

	constructor(private restService: RestService) {}

	async ngOnInit() {
		const testingSession = `testingSession-${(Math.random() + 1).toString(36).substring(7)}`;

		this.tokens = {
			webcam: await this.restService.getToken(testingSession),
			screen: await this.restService.getToken(testingSession)
		};
	}

	appendElement(id: string) {
		console.log(id)
		const eventsDiv = document.getElementById('events');
		const element = document.createElement('div');
		element.setAttribute('id', id);
		element.setAttribute('style', 'height: 1px;');
		eventsDiv.appendChild(element);
	}

	updateSelection(id: string, value: boolean) {
		switch (id) {
			case DirectiveId.TOOLBAR:
				this.ovToolbarSelected = value;
				break;

			case DirectiveId.TOOLBAR_BUTTONS:
				this.ovToolbarAdditionalButtonsSelected = value;
				break;

			case DirectiveId.PANEL:
				this.ovPanelSelected = value;
				break;

			case DirectiveId.CHAT_PANEL:
				this.ovChatPanelSelected = value;
				break;

			case DirectiveId.PARTICIPANTS_PANEL:
				this.ovParticipantsPanelSelected = value;
				break;

			case DirectiveId.PARTICIPANTS_PANEL_ITEM:
				this.ovParticipantPanelItemSelected = value;
				break;

			case DirectiveId.PARTICIPANTS_PANEL_ITEM_ELEMENT:
				this.ovParticipantPanelItemElementsSelected = value;
				break;

			case DirectiveId.LAYOUT:
				this.ovLayoutSelected = value;
				break;

			case DirectiveId.STREAM:
				this.ovStreamSelected = value;
				break;
		}
	}

	apply() {
		this.showDirectives = false;
	}
}
