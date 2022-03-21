import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { RestService } from '../services/rest.service';
import { throwError as observableThrowError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
	OPENVIDU_SERVER_URL = 'https://localhost:4443';
	OPENVIDU_SERVER_SECRET = 'MY_SECRET';
	sessionId: string;
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

	constructor(private httpClient: HttpClient) {}

	async ngOnInit() {
		this.sessionId = `testingSession-${(Math.random() + 1).toString(36).substring(7)}`;

		this.tokens = {
			webcam: await this.getToken(this.sessionId),
			screen: await this.getToken(this.sessionId)
		};
	}

	appendElement(id: string) {
		console.log(id);
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

	/**
	 * --------------------------
	 * SERVER-SIDE RESPONSIBILITY
	 * --------------------------
	 * This method retrieve the mandatory user token from OpenVidu Server,
	 * in this case making use Angular http API.
	 * This behavior MUST BE IN YOUR SERVER-SIDE IN PRODUCTION. In this case:
	 *   1) Initialize a Session in OpenVidu Server	(POST /openvidu/api/sessions)
	 *   2) Create a Connection in OpenVidu Server (POST /openvidu/api/sessions/<SESSION_ID>/connection)
	 *   3) The Connection.token must be consumed in Session.connect() method
	 */

	async getToken(sessionId: string): Promise<string> {
		const id = await this.createSession(sessionId);
		return await this.createToken(id);
	}

	createSession(sessionId) {
		return new Promise((resolve, reject) => {
			const body = JSON.stringify({ customSessionId: sessionId });
			const options = {
				headers: new HttpHeaders({
					Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + this.OPENVIDU_SERVER_SECRET),
					'Content-Type': 'application/json'
				})
			};
			return this.httpClient
				.post(this.OPENVIDU_SERVER_URL + '/openvidu/api/sessions', body, options)
				.pipe(
					catchError((error) => {
						if (error.status === 409) {
							resolve(sessionId);
						} else {
							console.warn(
								'No connection to OpenVidu Server. This may be a certificate error at ' + this.OPENVIDU_SERVER_URL
							);
							if (
								window.confirm(
									'No connection to OpenVidu Server. This may be a certificate error at "' +
										this.OPENVIDU_SERVER_URL +
										'"\n\nClick OK to navigate and accept it. If no certificate warning is shown, then check that your OpenVidu Server' +
										'is up and running at "' +
										this.OPENVIDU_SERVER_URL +
										'"'
								)
							) {
								location.assign(this.OPENVIDU_SERVER_URL + '/accept-certificate');
							}
						}
						return observableThrowError(error);
					})
				)
				.subscribe((response) => {
					console.log(response);
					resolve(response['id']);
				});
		});
	}

	createToken(sessionId): Promise<string> {
		return new Promise((resolve, reject) => {
			const body = {};
			const options = {
				headers: new HttpHeaders({
					Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + this.OPENVIDU_SERVER_SECRET),
					'Content-Type': 'application/json'
				})
			};
			return this.httpClient
				.post(this.OPENVIDU_SERVER_URL + '/openvidu/api/sessions/' + sessionId + '/connection', body, options)
				.pipe(
					catchError((error) => {
						reject(error);
						return observableThrowError(error);
					})
				)
				.subscribe((response) => {
					console.log(response);
					resolve(response['token']);
				});
		});
	}
}
