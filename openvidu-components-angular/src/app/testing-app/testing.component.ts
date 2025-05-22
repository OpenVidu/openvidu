import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PanelService } from 'openvidu-components-angular';
import { Subscription } from 'rxjs';
import { RestService } from '../services/rest.service';
import { ParticipantLeftEvent } from '../../../projects/openvidu-components-angular/src/lib/models/participant.model';

interface TemplateDirectives {
	name: string;
	subDirectives?: TemplateDirectives[];
}

interface APIDirectives {
	component: string;
	directives: { name: AttributeDirective; checked: boolean }[];
}

enum StructuralDirectives {
	TOOLBAR = 'ovToolbar',
	TOOLBAR_BUTTONS = 'ovToolbarAdditionalButtons',
	TOOLBAR_PANEL_BUTTONS = 'ovToolbarAdditionalPanelButtons',
	PANEL = 'ovPanel',
	ADDITIONAL_PANELS = 'ovAdditionalPanels',
	CHAT_PANEL = 'ovChatPanel',
	PARTICIPANTS_PANEL = 'ovParticipantsPanel',
	PARTICIPANTS_PANEL_ITEM = 'ovParticipantPanelItem',
	PARTICIPANTS_PANEL_ITEM_ELEMENTS = 'ovParticipantPanelItemElements',
	ACTIVITIES_PANEL = 'ovActivitiesPanel',
	LAYOUT = 'ovLayout',
	STREAM = 'ovStream'
}

export enum AttributeDirective {
	TOOLBAR_SCREENSHARE = 'screenshareButton',
	TOOLBAR_FULLSCREEN = 'fullscreenButton',
	TOOLBAR_BROADCASTING = 'broadcastingButton',
	TOOLBAR_LEAVE = 'leaveButton',
	TOOLBAR_PARTICIPANTS_PANEL = 'participantsPanelButton',
	TOOLBAR_ACTIVITIES_PANEL = 'activitiesPanelButton',
	TOOLBAR_CHAT_PANEL = 'chatPanelButton',
	TOOLBAR_DISPLAY_ROOM = 'displayRoomName',
	TOOLBAR_DISPLAY_LOGO = 'displayLogo',
	STREAM_PARTICIPANT_NAME = 'displayParticipantName',
	STREAM_AUDIO_DETECTION = 'displayAudioDetection',
	STREAM_SETTINGS = 'settingsButton',
	PARTICIPANT_ITEM_MUTE = 'muteButton',
	ACTIVITIES_PANEL_RECORDING_ACTIVITY = 'recordingActivity',
	ACTIVITIES_PANEL_BROADCASTING_ACTIVITY = 'broadcastingActivity'
}

@Component({
    selector: 'app-testing',
    templateUrl: './testing.component.html',
    styleUrls: ['./testing.component.scss'],
    standalone: false
})
export class TestingComponent implements AfterViewInit {
	roomName: string;
	templateDirectives: TemplateDirectives[] = [
		{
			name: StructuralDirectives.TOOLBAR,
			subDirectives: [{ name: StructuralDirectives.TOOLBAR_BUTTONS }, { name: StructuralDirectives.TOOLBAR_PANEL_BUTTONS }]
		},
		{
			name: StructuralDirectives.PANEL,
			subDirectives: [
				{ name: StructuralDirectives.ACTIVITIES_PANEL },
				{ name: StructuralDirectives.ADDITIONAL_PANELS },
				{ name: StructuralDirectives.CHAT_PANEL },
				{
					name: StructuralDirectives.PARTICIPANTS_PANEL,
					subDirectives: [
						{
							name: StructuralDirectives.PARTICIPANTS_PANEL_ITEM,
							subDirectives: [{ name: StructuralDirectives.PARTICIPANTS_PANEL_ITEM_ELEMENTS }]
						}
					]
				}
			]
		},
		{
			name: StructuralDirectives.LAYOUT,
			subDirectives: [{ name: StructuralDirectives.STREAM }]
		}
	];

	apiDirectives: APIDirectives[] = [
		{
			component: StructuralDirectives.TOOLBAR,
			directives: [
				{ name: AttributeDirective.TOOLBAR_CHAT_PANEL, checked: true },
				{ name: AttributeDirective.TOOLBAR_DISPLAY_LOGO, checked: true },
				{ name: AttributeDirective.TOOLBAR_DISPLAY_ROOM, checked: true },
				{ name: AttributeDirective.TOOLBAR_FULLSCREEN, checked: true },
				{ name: AttributeDirective.TOOLBAR_BROADCASTING, checked: true },
				{ name: AttributeDirective.TOOLBAR_LEAVE, checked: true },
				{ name: AttributeDirective.TOOLBAR_PARTICIPANTS_PANEL, checked: true },
				{ name: AttributeDirective.TOOLBAR_ACTIVITIES_PANEL, checked: true },
				{ name: AttributeDirective.TOOLBAR_SCREENSHARE, checked: true }
			]
		},
		{
			component: StructuralDirectives.STREAM,
			directives: [
				{ name: AttributeDirective.STREAM_AUDIO_DETECTION, checked: true },
				{ name: AttributeDirective.STREAM_PARTICIPANT_NAME, checked: true },
				{ name: AttributeDirective.STREAM_SETTINGS, checked: true }
			]
		},
		{
			component: StructuralDirectives.PARTICIPANTS_PANEL_ITEM,
			directives: [{ name: AttributeDirective.PARTICIPANT_ITEM_MUTE, checked: true }]
		},
		{
			component: StructuralDirectives.ACTIVITIES_PANEL,
			directives: [
				{ name: AttributeDirective.ACTIVITIES_PANEL_RECORDING_ACTIVITY, checked: true },
				{ name: AttributeDirective.ACTIVITIES_PANEL_BROADCASTING_ACTIVITY, checked: true }
			]
		}
	];

	showDirectives: boolean = true;
	ovToolbarSelected = false;
	ovToolbarAdditionalButtonsSelected = false;
	ovToolbarAdditionalPanelButtonsSelected = false;
	ovPanelSelected = false;
	ovActivitiesPanelSelected = false;
	ovAdditionalPanelsSelected = false;
	ovChatPanelSelected = false;
	ovParticipantsPanelSelected = false;
	ovParticipantPanelItemSelected = false;
	ovParticipantPanelItemElementsSelected = false;
	ovLayoutSelected = false;
	ovStreamSelected = false;

	displayLogo = true;
	chatPanelBtn = true;
	displayRoomName = true;
	fullscreenBtn = true;
	leaveBtn = true;
	participantsPanelBtn = true;
	activitiesPanelBtn = true;
	screenshareBtn = true;
	audioDetection = true;
	participantName = true;
	videoControls = true;
	participantItemMuteBtn = true;
	broadcastingActivity = true;
	broadcastingBtn = true;

	token: string;

	subscription: Subscription;

	recordingActivity = true;

	constructor(
		private restService: RestService,
		private route: ActivatedRoute,
		private router: Router,
		private panelService: PanelService
	) {}

	ngAfterViewInit() {}

	appendElement(id: string) {
		console.log(id);
		const eventsDiv = document.getElementById('events');
		const element = document.createElement('div');
		element.setAttribute('id', id);
		element.setAttribute('style', 'height: 1px;');
		eventsDiv?.appendChild(element);
	}

	updateSelection(id: string, value: boolean) {
		switch (id) {
			case StructuralDirectives.TOOLBAR:
				this.ovToolbarSelected = value;
				break;

			case StructuralDirectives.TOOLBAR_BUTTONS:
				this.ovToolbarAdditionalButtonsSelected = value;
				break;

			case StructuralDirectives.TOOLBAR_PANEL_BUTTONS:
				this.ovToolbarAdditionalPanelButtonsSelected = value;
				break;

			case StructuralDirectives.PANEL:
				this.ovPanelSelected = value;
				break;

			case StructuralDirectives.ADDITIONAL_PANELS:
				this.ovAdditionalPanelsSelected = value;
				break;

			case StructuralDirectives.ACTIVITIES_PANEL:
				this.ovActivitiesPanelSelected = value;
				break;

			case StructuralDirectives.CHAT_PANEL:
				this.ovChatPanelSelected = value;
				break;

			case StructuralDirectives.PARTICIPANTS_PANEL:
				this.ovParticipantsPanelSelected = value;
				break;

			case StructuralDirectives.PARTICIPANTS_PANEL_ITEM:
				this.ovParticipantPanelItemSelected = value;
				break;

			case StructuralDirectives.PARTICIPANTS_PANEL_ITEM_ELEMENTS:
				this.ovParticipantPanelItemElementsSelected = value;
				break;

			case StructuralDirectives.LAYOUT:
				this.ovLayoutSelected = value;
				break;

			case StructuralDirectives.STREAM:
				this.ovStreamSelected = value;
				break;
		}
	}

	updateApiDirective(id: string, value: boolean) {
		switch (id) {
			case AttributeDirective.TOOLBAR_CHAT_PANEL:
				this.chatPanelBtn = value;
				break;

			case AttributeDirective.TOOLBAR_DISPLAY_LOGO:
				this.displayLogo = value;
				break;

			case AttributeDirective.TOOLBAR_DISPLAY_ROOM:
				this.displayRoomName = value;
				break;

			case AttributeDirective.TOOLBAR_FULLSCREEN:
				this.fullscreenBtn = value;
				break;

			case AttributeDirective.TOOLBAR_BROADCASTING:
				this.broadcastingBtn = value;
				break;

			case AttributeDirective.TOOLBAR_LEAVE:
				this.leaveBtn = value;
				break;
			case AttributeDirective.TOOLBAR_PARTICIPANTS_PANEL:
				this.participantsPanelBtn = value;
				break;
			case AttributeDirective.TOOLBAR_ACTIVITIES_PANEL:
				this.activitiesPanelBtn = value;
				break;
			case AttributeDirective.TOOLBAR_SCREENSHARE:
				this.screenshareBtn = value;
				break;
			case AttributeDirective.STREAM_AUDIO_DETECTION:
				this.audioDetection = value;
				break;
			case AttributeDirective.STREAM_PARTICIPANT_NAME:
				this.participantName = value;
				break;

			case AttributeDirective.STREAM_SETTINGS:
				this.videoControls = value;
				break;
			case AttributeDirective.PARTICIPANT_ITEM_MUTE:
				this.participantItemMuteBtn = value;
				break;
			case AttributeDirective.ACTIVITIES_PANEL_RECORDING_ACTIVITY:
				this.recordingActivity = value;
				break;
			case AttributeDirective.ACTIVITIES_PANEL_BROADCASTING_ACTIVITY:
				this.broadcastingActivity = value;
				break;
			default:
				break;
		}
	}

	apply() {
		this.showDirectives = false;
		this.subscription = this.route.queryParams.subscribe(async (params) => {
			console.warn(params);
			if (params?.sessionId) {
				this.roomName = params.sessionId;
			} else {
				this.roomName = `testingSession-${(Math.random() + 1).toString(36).substring(7)}`;
			}

			this.token = await this.getToken(this.roomName);
		});
		this.subscription.unsubscribe();
	}

	onParticipantLeft(event: ParticipantLeftEvent) {
		this.router.navigate(['']);
	}

	toggleMyPanel(type: string) {
		this.panelService.togglePanel(type);
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

	async getToken(roomName: string): Promise<string> {
		const response = await this.restService.getTokenFromBackend(roomName, Math.random().toString(36).substring(7));
		return response.token;
	}
}
