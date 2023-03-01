import { Directive, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * The ***ovToolbar** directive allows to replace the default toolbar component with a custom one.
 * In the example below we've replaced the default toolbar and added the **toggleAudio** and **toggleVideo** buttons.
 * Here we are using the {@link OpenViduService} for publishing/unpublishing the audio and video.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-toolbar#running-this-tutorial).
 *
 *```html
 *<ov-videoconference [tokens]="tokens">
 *	<div *ovToolbar style="text-align: center;">
 *		<button (click)="toggleVideo()">Toggle Video</button>
 *		<button (click)="toggleAudio()">Toggle Audio</button>
 *	</div>
 *</ov-videoconference>
 * ```
 *
 * ```javascript
 * export class ToolbarDirectiveComponent {
 *
 *	sessionId = 'toolbar-directive-example';
 *	tokens!: TokenModel;
 *
 *	publishVideo = true;
 *	publishAudio = true;
 *
 *	constructor(private httpClient: HttpClient, private participantService: ParticipantService) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *
 *	toggleVideo() {
 *		this.publishVideo = !this.publishVideo;
 *		this.participantService.publishVideo(this.publishVideo);
 *	}
 *
 *	toggleAudio() {
 *		this.publishAudio = !this.publishAudio;
 *		this.participantService.publishAudio(this.publishAudio);
 *	}
 *
 *	async getToken(): Promise<string> {
 * 		// Returns an OpeVidu token
 * 	}
 *
 * }
 * ```
 *
 */
@Directive({
	selector: '[ovToolbar]'
})
export class ToolbarDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

/**
 * The ***ovToolbarAdditionalButtons** directive allows to add additional buttons to center buttons group.
 * In the example below we've added the same buttons as the {@link ToolbarDirective}.
 * Here we are using the {@link ParticipantService} to check the audio or video status.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-toolbar-buttons#running-this-tutorial).
 *
 *```html
 *<ov-videoconference [tokens]="tokens" [toolbarDisplaySessionName]="false">
 *	<div *ovToolbarAdditionalButtons style="text-align: center;">
 *		<button mat-icon-button (click)="toggleVideo()">
 *			<mat-icon>videocam</mat-icon>
 *		</button>
 *		<button mat-icon-button (click)="toggleAudio()">
 *			<mat-icon>mic</mat-icon>
 *		</button>
 *	</div>
 *</ov-videoconference>
 * ```
 *
 * ```javascript
 * export class ToolbarAdditionalButtonsDirectiveComponent {
 *
    sessionId = "panel-directive-example";
    tokens!: TokenModel;


 *	sessionId = 'toolbar-additionalbtn-directive-example';
 *	tokens!: TokenModel;
 *
 *	constructor(
 *		private httpClient: HttpClient,
 *		private participantService: ParticipantService
 *	) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *
 *	toggleVideo() {
 *		const publishVideo = !this.participantService.isMyVideoActive();
 *		this.participantService.publishVideo(publishVideo);
 *	}
 *
 *	toggleAudio() {
 *		const publishAudio = !this.participantService.isMyAudioActive();
 *		this.participantService.publishAudio(publishAudio);
 *	}
 *
 *	async getToken(): Promise<string> {
 * 		// Returns an OpeVidu token
 * 	}
 *
 * }
 * ```
 */
@Directive({
	selector: '[ovToolbarAdditionalButtons]'
})
export class ToolbarAdditionalButtonsDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovToolbarAdditionalPanelButtons** directive allows to add additional **panel buttons** to the toolbar.
 * In the example below we've added a simple button without any functionality. To learn how to toggle the panel check the {@link AdditionalPanelsDirective}.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-toolbar-panel-buttons#running-this-tutorial).
 *
 *```html
 *<ov-videoconference [tokens]="tokens" [toolbarDisplaySessionName]="false">
 *	<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
 *		<button (click)="onButtonClicked()">MY PANEL</button>
 *	</div>
 *</ov-videoconference>
 * ```
 *
 * ```javascript
 * export class ToolbarAdditionalPanelButtonsDirectiveComponent {
 *
 *  sessionId = "toolbar-additionalPanelbtn";
 *  tokens!: TokenModel;
 *
 *  constructor(private httpClient: HttpClient) { }
 *
 * async ngOnInit() {
 *    this.tokens = {
 *     webcam: await this.getToken(),
 *      screen: await this.getToken(),
 *    };
 *  }
 *
 *  onButtonClicked() {
 *    alert('button clicked');
 *  }
 *
 *  async getToken(): Promise<string> {
 *    // Returns an OpeVidu token
 *  }
 *
 * }
 * ```
 */
@Directive({
	selector: '[ovToolbarAdditionalPanelButtons]'
})
export class ToolbarAdditionalPanelButtonsDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovPanel** directive allows to replace the default panels with your own custom panels. This directive also allows to insert elements
 * tagged with the {@link ChatPanelDirective}, {@link ParticipantsPanelDirective} and {@link AdditionalPanelsDirective}.
 *
 * In the example below we replace the entire {@link PanelComponent} using the ***ovPanel** directive. Inside of it, we customize
 * the {@link ParticipantsPanelComponent} and {@link ChatPanelcomponent} using their own directives.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-panels#running-this-tutorial).
 *
 *```html
 *<ov-videoconference [tokens]="tokens">
 *	<ov-panel *ovPanel>
 *		<div *ovChatPanel id="my-chat-panel">This is my custom chat panel</div>
 *		<div *ovParticipantsPanel id="my-participants-panel">
 *			This is my custom participants panel
 *		</div>
 *	</ov-panel>
 *</ov-videoconference>
 * ```
 *
 * ```javascript
 * export class PanelDirectiveComponent {
 *
 *	sessionId = "panel-directive-example";
 *	tokens!: TokenModel;
 *
 *	constructor(private httpClient: HttpClient) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken(),
 *		};
 *	}
 *
 *	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 */
@Directive({
	selector: '[ovPanel]'
})
export class PanelDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovAdditionalPanels** directive allows to add more extra panels to the {@link PanelComponent}. In this example we add a new
 * panel alongside the default ones.
 *
 * To mimic the toggling behavior of the default panels, we need to add a new button in the {@link ToolbarComponent}
 * using the {@link ToolbarAdditionalPanelButtonsDirective}.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-additional-panels#running-this-tutorial).
 *
 *```html
 *<ov-videoconference [tokens]="tokens" [toolbarDisplaySessionName]="false">
 *	<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
 *		<button mat-icon-button (click)="toggleMyPanel('my-panel')">
 *			<mat-icon>360</mat-icon>
 *		</button>
 *		<button mat-icon-button (click)="toggleMyPanel('my-panel2')">
 *			<mat-icon>star</mat-icon>
 *		</button>
 *	</div>
 *	<div *ovAdditionalPanels id="my-panels">
 *		<div id="my-panel1" *ngIf="showExternalPanel">
 *			<h2>NEW PANEL</h2>
 *			<p>This is my new additional panel</p>
 *		</div>
 *		<div id="my-panel2" *ngIf="showExternalPanel2">
 *			<h2>NEW PANEL 2</h2>
 *			<p>This is other new panel</p>
 *		</div>
 *	</div>
 *</ov-videoconference>
 * ```
 * <br/>
 *
 * We need to subscribe to the {@link ../injectables/PanelService.html#panelOpenedObs panelOpenedObs} Observable to listen to the panel status and update our boolean variables
 * (`showExternalPanel` and `showExternalPanel2`) in charge of showing or hiding them.
 *
 * ```javascript
 * export class AdditionalPanelsDirectiveComponent implements OnInit {
 *
 *	sessionId = "toolbar-additionalbtn-directive-example";
 *	tokens!: TokenModel;
 *
 *	showExternalPanel: boolean = false;
 *	showExternalPanel2: boolean = false;
 *
 *	constructor(
 *		private httpClient: HttpClient,
 *		private panelService: PanelService
 *	) { }
 *
 *	async ngOnInit() {
 *		this.subscribeToPanelToggling();
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken(),
 *		};
 *	}
 *
 *	subscribeToPanelToggling() {
 *		this.panelService.panelOpenedObs.subscribe(
 *			(ev: { opened: boolean; type?: PanelType | string }) => {
 *				this.showExternalPanel = ev.opened && ev.type === "my-panel";
 *				this.showExternalPanel2 = ev.opened && ev.type === "my-panel2";
 *			}
 *		);
 *	}
 *
 *	toggleMyPanel(type: string) {
 *		this.panelService.togglePanel(type);
 *	}
 *
 *	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 */
@Directive({
	selector: '[ovAdditionalPanels]'
})
export class AdditionalPanelsDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovChatPanel** directive allows to replace the default chat panel template with a custom one.
 * In the example below we replace the chat template in a few lines of code.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-chat-panel#running-this-tutorial).
 *
 * ```html
 *<ov-videoconference
 *	(onSessionCreated)="onSessionCreated($event)"
 *	[tokens]="tokens"
 *	[toolbarDisplaySessionName]="false">
 *	<div *ovChatPanel id="my-panel">
 *		<h3>Chat</h3>
 *		<div>
 *			<ul>
 *				<li *ngFor="let msg of messages">{{ msg }}</li>
 *			</ul>
 *		</div>
 *		<input value="Hello" #input />
 *		<button (click)="send(input.value)">Send</button>
 *	</div>
 *</ov-videoconference>
 *```
 * <br/>
 *
 * As we need to get the openvidu-browser **[Session](https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html)**
 * object for sending messages to others, we can get it from the `onSessionCreated` event fired by the {@link VideoconferenceComponent}
 * when the session has been created.
 *
 * Once we have the session created, we can use the
 * [signal](https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html#signal) method to send our messages.
 *
 * ```javascript
 * export class ChatPanelDirectiveComponent {
 *
 *	sessionId = "chat-panel-directive-example";
 *	tokens!: TokenModel;
 *
 *	session!: Session;
 *	messages: string[] = [];
 *
 *	constructor(private httpClient: HttpClient) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken(),
 *		};
 *	}
 *
 *	onSessionCreated(session: Session) {
 *		this.session = session;
 *		this.session.on(`signal:${Signal.CHAT}`, (event: any) => {
 *			const msg = JSON.parse(event.data).message;
 *			this.messages.push(msg);
 *		});
 *	}
 *
 *	send(message: string): void {
 *		const signalOptions: SignalOptions = {
 *			data: JSON.stringify({ message }),
 *			type: Signal.CHAT,
 *			to: undefined,
 *		};
 *		this.session.signal(signalOptions);
 *	}
 *
 *	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 *
 */
@Directive({
	selector: '[ovChatPanel]'
})
export class ChatPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

/**
 * backgroundEffectsPanel does not provide any customization for now
 * @internal
 */
@Directive({
	selector: '[ovBackgroundEffectsPanel]'
})
export class BackgroundEffectsPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovActivitiesPanel** directive allows to replace the default activities panel template with a custom one.
 * In the example below we replace the activities template in a few lines of code.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-activities-panel#running-this-tutorial).
 *
 * ```html
 *<ov-videoconference
 *	[tokens]="tokens"
 *	[toolbarRecordingButton]="false"
 *	[toolbarDisplaySessionName]="false">
 *	<div *ovActivitiesPanel id="my-panel">
 *		<h3>ACTIVITIES</h3>
 *		<div>
 *			CUSTOM ACTIVITIES
 *		</div>
 *	</div>
 *</ov-videoconference>
 *```
 * <br/>
 *
 * As we need to assign the OpenVidu Tokens to the {@link VideoconferenceComponent}, we request them on the ngOnInit Angular lifecycle hook.
 *
 * ```javascript
 * export class AppComponent implements OnInit {
 *
 *	sessionId = "activities-panel-directive-example";
 *	tokens!: TokenModel;
 *
 *	constructor(private httpClient: HttpClient) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken(),
 *		};
 *	}
 *
 *	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 *}
 * ```
 *
 */
@Directive({
	selector: '[ovActivitiesPanel]'
})
export class ActivitiesPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

/**
 * The ***ovParticipantsPanel** directive allows to replace the default participants panel template with a custom one.
 * In the example below we replace the participants template in a few lines of code.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-participants-panel#running-this-tutorial).
 *
 * ```html
 *<ov-videoconference [tokens]="tokens" [toolbarDisplaySessionName]="false" (onSessionCreated)="subscribeToParticipants()">
 *	<div *ovParticipantsPanel id="my-panel">
 *		<ul id="local">
 *			<li>{{localParticipant.nickname}}</li>
 *		</ul>
 *		<ul id="remote">
 *			<li *ngFor="let p of remoteParticipants">{{p.nickname}}</li>
 *		</ul>
 *	</div>
 *</ov-videoconference>
 *```
 * <br/>
 *
 * We need to get the participants in our Session, so we use the {@link ParticipantService} to subscribe to the required Observables.
 * We'll get the local participant and the remote participants to update our custom participants panel on any change.
 *
 * ```javascript
 * export class ParticipantsPanelDirectiveComponent implements OnInit, OnDestroy {
 *
 *	sessionId = 'participants-panel-directive-example';
 *	tokens!: TokenModel;
 *
 *	localParticipant!: ParticipantAbstractModel;
 *	remoteParticipants!: ParticipantAbstractModel[];
 *	localParticipantSubs!: Subscription;
 *	remoteParticipantsSubs!: Subscription;
 *
 *	constructor(private httpClient: HttpClient, private participantService: ParticipantService) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *
 *	ngOnDestroy() {
 *		this.localParticipantSubs.unsubscribe();
 *		this.remoteParticipantsSubs.unsubscribe();
 *	}
 *
 *	subscribeToParticipants() {
 *		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
 *			this.localParticipant = p;
 *		});
 *		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
 *			this.remoteParticipants = participants;
 *		});
 *	}
 *
 *	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 *
 */
@Directive({
	selector: '[ovParticipantsPanel]'
})
export class ParticipantsPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovParticipantPanelItem** directive allows to replace the default participant panel item template in the {@link ParticipantsPanelComponent} with a custom one.
 *
 * With ***ovParticipantPanelItem** directive we can access the participant object from its context using the `let` keyword and referencing the `participant`
 * variable: `*ovParticipantPanelItem="let participant"`. Now we can access the {@link ParticipantAbstractModel} object.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-participant-panel-item#running-this-tutorial).
 *
 * ```html
 *<ov-videoconference [tokens]="tokens" [toolbarDisplaySessionName]="false">
 *	<div *ovParticipantPanelItem="let participant" style="display: flex">
 *		<p>{{ participant.nickname }}</p>
 *		<button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
 *		<mat-menu #menu="matMenu">
 *			<button mat-menu-item>Button 1</button>
 *			<button mat-menu-item>Button 2</button>
 *		</mat-menu>
 *	</div>
 *</ov-videoconference>
 *```
 *
 * ```javascript
 * export class ParticipantPanelItemDirectiveComponent {
 *
 *	sessionId = 'participants-panel-directive-example';
 *	tokens!: TokenModel;
 *
 *	constructor(private httpClient: HttpClient) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *
 * 	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 *
 */
@Directive({
	selector: '[ovParticipantPanelItem]'
})
export class ParticipantPanelItemDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

/**
 * The ***ovParticipantPanelItemElements** directive allows to add elements to the {@link ParticipantsPanelItemComponent}.
 * In the example below we add a simple button to disconnect from the session.
 *
 * With ***ovParticipantPanelItemElements** directive we can access the participant object from its context using
 * the `let` keyword and referencing the `participant` variable: `*ovParticipantPanelItem="let participant"`.
 * Now we can access the {@link ParticipantAbstractModel} object and enable the button just for the local participant.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-participant-panel-item-element#running-this-tutorial).
 *
 * ```html
 *<ov-videoconference
 *	*ngIf="connected"
 *	[tokens]="tokens"
 *	[toolbarDisplaySessionName]="false">
 *	<div *ovParticipantPanelItemElements="let participant">
 *		<button *ngIf="participant.local" (click)="leaveSession()">
 *			Leave
 *		</button>
 *	</div>
 *</ov-videoconference>
 *<div *ngIf="!connected" style="text-align: center;">Session disconnected</div>
 *```
 *
 * ```javascript
 * export class ParticipantPanelItemElementsDirectiveComponent {
 *
 *	sessionId = "participants-panel-directive-example";
 *	tokens!: TokenModel;
 *
 *	connected = true;
 *
 *	constructor(private httpClient: HttpClient, private openviduService: OpenViduService) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken(),
 *		};
 *	}
 *
 *	leaveSession() {
 *		this.openviduService.disconnect();
 *		this.connected = false;
 *	}
 *
 * 	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 */
@Directive({
	selector: '[ovParticipantPanelItemElements]'
})
export class ParticipantPanelItemElementsDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovLayout** directive allows to replace the default session layout with a custom one.
 *
 * As the deafult {@link StreamComponent} needs the participant stream, and as the participants streams extraction is not trivial,
 * openvidu-angular provides a {@link ParticipantStreamsPipe} for easy extraction of the stream of each participant. In the example
 * below you can see that on the HTML template, as the last component of the `*ngFor` statements (`| streams`).
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-layout#running-this-tutorial).
 *
 * ```html
 *<ov-videoconference [tokens]="tokens" (onSessionCreated)="subscribeToParticipants()">
 *	<div *ovLayout>
 *		<div class="container">
 *			<div class="item" *ngFor="let stream of localParticipant | streams">
 *				<ov-stream [stream]="stream"></ov-stream>
 *			</div>
 *			<div class="item" *ngFor="let stream of remoteParticipants | streams">
 *				<ov-stream [stream]="stream"></ov-stream>
 *			</div>
 *		</div>
 *	</div>
 *</ov-videoconference>
 *```
 *
 * We need to get the participants in our Session, so we use the {@link ParticipantService} to subscribe to the required Observables.
 * We'll get the local participant and the remote participants to display their streams in our custom session layout.
 *
 * ```javascript
 * export class LayoutDirectiveComponent implements OnInit, OnDestroy {
 *
 * 	sessionId = 'layout-directive-example';
 *	tokens!: TokenModel;
 *
 *	localParticipant!: ParticipantAbstractModel;
 *	remoteParticipants!: ParticipantAbstractModel[];
 *	localParticipantSubs!: Subscription;
 *	remoteParticipantsSubs!: Subscription;
 *
 *	constructor(private httpClient: HttpClient, private participantService: ParticipantService) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *
 *	ngOnDestroy() {
 *		this.localParticipantSubs.unsubscribe();
 *		this.remoteParticipantsSubs.unsubscribe();
 *	}
 *
 *	subscribeToParticipants() {
 *		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
 *			this.localParticipant = p;
 *		});
 *
 *		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
 *			this.remoteParticipants = participants;
 *		});
 *	}
 *
 * 	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 */
@Directive({
	selector: '[ovLayout]'
})
export class LayoutDirective {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}
}

/**
 * The ***ovStream** directive allows to replace the default {@link StreamComponent} template injecting a custom one.
 * In the example below we customize the participant's nickname position and styles, replacing the default stream component.
 *
 * With ***ovStream** directive we can access to the stream object from its context using the `let` keyword and
 * referencing the `stream` variable: `*ovStream="let stream"`. Now we can access the {@link StreamModel} object.
 *
 * You can run the associated tutorial [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-stream#running-this-tutorial).
 *
 * ```html
 *<ov-videoconference [tokens]="tokens">
 *	<div *ovStream="let stream">
 *		<ov-stream [stream]="stream" [displayParticipantName]="false"></ov-stream>
 *		<p>{{ stream.participant.nickname }}</p>
 *	</div>
 *</ov-videoconference>
 * ```
 *
 * ```javascript
 * export class StreamDirectiveComponent {
 *
 *	sessionId = 'toolbar-directive-example';
 *	tokens!: TokenModel;
 *
 *	constructor(private httpClient: HttpClient) { }
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *
 * 	async getToken(): Promise<string> {
 *		// Returns an OpeVidu token
 *	}
 *
 * }
 * ```
 */
@Directive({
	selector: '[ovStream]'
})
export class StreamDirective {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}
}
