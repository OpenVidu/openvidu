import { Component, OnInit } from '@angular/core';
import { PanelService, TokenModel, PanelType } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-chatPanel-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens" [toolbarDisplaySessionName]="false">
			<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
				<button (click)="toggleMyPanel('my-panel')">MY PANEL</button>
				<button (click)="toggleMyPanel('my-panel2')">OTHER PANEL</button>
			</div>
			<div *ovAdditionalPanels id="my-panels">
				<div id="my-panel1" *ngIf="showExternalPanel">
					<h2>NEW PANEL</h2>
					<p>This is my new additional panel</p>
				</div>
				<div id="my-panel2" *ngIf="showExternalPanel2">
					<h2>NEW PANEL 2</h2>
					<p>This is other new panel</p>
				</div>
			</div>
		</ov-videoconference>
	`,
	styles: [
		`
			#my-panels {
				height: 100%;
				overflow: hidden;
			}
			#my-panel1, #my-panel2 {
				text-align: center;
				height: calc(100% - 40px);
				margin: 20px;
			}
			#my-panel1 {
				background: #c9ffb2;
			}
			#my-panel2 {
				background: #ddf2ff;
			}
		`
	]
})
export class AdditionalPanelsDirectiveComponent implements OnInit {
	tokens: TokenModel;
	sessionId = 'chat-panel-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	showExternalPanel: boolean = false;
	showExternalPanel2: boolean = false;
	constructor(private restService: RestService, private panelService: PanelService) {}

	ngOnInit() {
		this.subscribeToPanelToggling();
	}
	subscribeToPanelToggling() {
		this.panelService.panelOpenedObs.subscribe((ev: { opened: boolean; type?: PanelType | string }) => {
			this.showExternalPanel = ev.opened && ev.type === 'my-panel';
			this.showExternalPanel2 = ev.opened && ev.type === 'my-panel2';
		});
	}
	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}
	toggleMyPanel(type: string) {
		this.panelService.togglePanel(type);
	}
}
