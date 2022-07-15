import { Directive, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * The ***ovToolbar** directive allows to replace the default toolbar component injecting your custom template.
 * In the example below we've replaced the default toolbar and added the **toggleAudio** and **toggleVideo** features.
 *
 * You can run the __openvidu-custom-toolbar__ sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-toolbar#run-this-tutorial).
 *
 *
 *```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<div *ovToolbar style="text-align: center;">
 * 		<button (click)="toggleVideo()">Toggle Video</button>
 * 		<button (click)="toggleAudio()">Toggle Audio</button>
 * 	</div>
 * </ov-videoconference>
 * ```
 *
 * We have used the {@link OpenViduService} for publishing/unpublishing the audio and video.
 *
 * ```javascript
 * export class ToolbarDirectiveComponent {
 * 	tokens: TokenModel;
 * 	sessionId = 'toolbar-directive-example';
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 * 	publishVideo = true;
 * 	publishAudio = true;
 * 	constructor(private httpClient: HttpClient, private openviduService: OpenViduService) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.getToken(),
 * 			screen: await this.getToken()
 * 		};
 * 	}
 *
 * 	toggleVideo() {
 * 		this.publishVideo = !this.publishVideo;
 * 		this.openviduService.publishVideo(this.publishVideo);
 * 	}
 *
 * 	toggleAudio() {
 * 		this.publishAudio = !this.publishAudio;
 * 		this.openviduService.publishAudio(this.publishAudio);
 * 	}
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
 * We've added the same buttons as the {@link ToolbarDirective}.
 * Here we are using the {@link ParticipantService} fror checking the audio or video status.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-toolbar-buttons#run-this-tutorial).
 *
 *
 *```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<div *ovToolbarAdditionalButtons style="text-align: center;">
 * 		<button (click)="toggleVideo()">Toggle Video</button>
 * 		<button (click)="toggleAudio()">Toggle Audio</button>
 * 	</div>
 * </ov-videoconference>
 * ```
 *
 * ```javascript
 * export class ToolbarAdditionalButtonsDirectiveComponent {
 * 	tokens: TokenModel;
 * 	sessionId = 'toolbar-additionalbtn-directive-example';
 *
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 *
 *	constructor(
 *		private httpClient: HttpClient,
 *		private openviduService: OpenViduService,
 *		private participantService: ParticipantService
 *	) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.getToken(),
 * 			screen: await this.getToken()
 * 		};
 * 	}
 *
 * 	toggleVideo() {
 * 		const publishVideo = !this.participantService.isMyVideoActive();
 * 		this.openviduService.publishVideo(publishVideo);
 * 	}
 *
 * 	toggleAudio() {
 * 		const publishAudio = !this.participantService.isMyAudioActive();
 * 		this.openviduService.publishAudio(publishAudio);
 * 	}
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
 * We've added a simple button without any functionality. For being able to toggle the panel you can see the {@link AdditionalPanelsDirective}.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-toolbar-panel-buttons#run-this-tutorial).
 *
 *
 *```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
 * 		<button>MY PANEL</button>
 * 	</div>
 * </ov-videoconference>
 * ```
 *
 * ```javascript
 * export class ToolbarAdditionalPanelButtonsDirectiveComponent {
 * 	tokens: TokenModel;
 * 	sessionId = 'toolbar-additionalPanelbtn';
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 *
 * 	constructor(private httpClient: HttpClient) {}
 *
 * 	async onJoinButtonClicked() {
 * 	 this.tokens = {
 * 	 	webcam: await this.getToken(),
 * 	 	screen: await this.getToken()
 * 	 };
 * 	}
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
 * The ***ovPanel** directive allows to replace the default panels with your own. This directive also allows us insert elements
 * tagged with the {@link ChatPanelDirective}, {@link ParticipantsPanelDirective} and {@link AdditionalPanelsDirective}.
 *
 * In this example we're going to replace the entire {@link PanelComponent} using the ***ovPanel** directive. Inside of it, we're customizing
 * the {@link ParticipantsPanelComponent} and {@link ChatPanelcomponent} using theirs directives.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-panels#run-this-tutorial).
 *
 *
 *```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<ov-panel *ovPanel>
 *	 <div *ovChatPanel>This is my custom chat panel</div>
 *	 <div *ovParticipantsPanel id="my-participants-panel">This is my custom participants panel</div>
 *	</ov-panel>
 * </ov-videoconference>
 * ```
 *
 * ```javascript
 * export class PanelDirectiveComponent {
 * 	tokens: TokenModel;
 * 	sessionId = 'panel-directive-example';
 *
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 *
 *	constructor(private httpClient: HttpClient) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.getToken(),
 * 			screen: await this.getToken()
 * 		};
 * 	}
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
 * The ***ovAdditionalPanels** directive allows to add more extra panels to the {@link PanelComponent}. In this example we've added a new
 * panel besides the defaults.
 *
 * As we want to toggle this new panel as the others, we need to add a new button in the {@link ToolbarComponent}
 * using the {@link ToolbarAdditionalPanelButtonsDirective}.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-additional-panels#run-this-tutorial).
 *
 *
 *```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
 *		<button (click)="toggleMyPanel('my-panel')">MY PANEL</button>
 *		<button (click)="toggleMyPanel('my-panel2')">OTHER PANEL</button>
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
 * </ov-videoconference>
 * ```
 * <br/>
 *
 * We need to subscribe to the {@link ../injectables/PanelService.html#panelOpenedObs panelOpenedObs} Observable for listening the panel status and update our boolean variables
 * (`showExternalPanel` and `showExternalPanel2`) for show and hide our panels.
 *
 * ```javascript
 * export class AdditionalPanelsDirectiveComponent implements OnInit {
 * 	tokens: TokenModel;
 * 	sessionId = 'chat-panel-directive-example';
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 * 	showExternalPanel: boolean = false;
 * 	showExternalPanel2: boolean = false;
 * 	constructor(private httpClient: HttpClient, private panelService: PanelService) {}
 *
 * 	ngOnInit() {
 * 		this.subscribeToPanelToggling();
 * 	}
 * 	subscribeToPanelToggling() {
 * 		this.panelService.panelOpenedObs.subscribe((ev: PanelEvent) => {
 * 			this.showExternalPanel = ev.opened && ev.type === 'my-panel';
 * 			this.showExternalPanel2 = ev.opened && ev.type === 'my-panel2';
 * 		});
 * 	}
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.getToken(),
 * 			screen: await this.getToken()
 * 		};
 * 	}
 * 	toggleMyPanel(type: string) {
 * 		this.panelService.togglePanel(type);
 * 	}
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
 * The ***ovChatPanel** directive allows to replace the default chat panel template injecting your own component.
 * Here we're going to redefine the chat template in a few code lines.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-chat-panel#run-this-tutorial).
 *
 * ```html
 * <ov-videoconference
 *	(onJoinButtonClicked)="onJoinButtonClicked()"
 *	(onSessionCreated)="onSessionCreated($event)"
 *	[tokens]="tokens"
 * >
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
 * </ov-videoconference>
 *```
 * <br/>
 *
 * As we need to get the **openvidu-browser [Session](https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html)**
 * for sending messages to others, we can get it from the `onSessionCreated` event fired by the {@link VideoconferenceComponent}
 * when the session has been created.
 *
 * Once we have the session created, we can use the
 * [signal](https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html#signal) method for sending our messages.
 *
 * ```javascript
 * export class ChatPanelDirectiveComponent {
 *	tokens: TokenModel;
 *	sessionId = 'chat-panel-directive-example';
 *	OPENVIDU_URL = 'https://localhost:4443';
 *	OPENVIDU_SECRET = 'MY_SECRET';
 *	session: Session;
 *	messages: string[] = [];
 *	constructor(private httpClient: HttpClient) {}
 *
 *	async onJoinButtonClicked() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
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
 *			to: undefined
 *		};
 *		this.session.signal(signalOptions);
 *	}
 *}
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
 * backgroundEffectsPanel does not provides customization
 * @internal
 */
@Directive({
	selector: '[ovBackgroundEffectsPanel]'
})
export class BackgroundEffectsPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovActivitiesPanel** directive allows to replace the default activities panel template injecting your own component.
 * Here we're going to redefine the activities template in a few code lines.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-activities-panel#run-this-tutorial).
 *
 * ```html
 * <ov-videoconference [tokens]="tokens">
 *	<div *ovActivitiesPanel id="my-panel">
 *		<h3>ACTIVITIES</h3>
 *		<div>
 *			CUSTOM ACTIVITIES
 *		</div>
 *	</div>
 * </ov-videoconference>
 *```
 * <br/>
 *
 * As we need to assign the tokens to the  the {@link VideoconferenceComponent}, we can request the tokens on the ngOnInit Angular lifecycle.
 *
 * ```javascript
 * export class AppComponent implements OnInit {
 *	tokens: TokenModel;
 *	sessionId = 'activities-panel-directive-example';
 *	OPENVIDU_URL = 'https://localhost:4443';
 *	OPENVIDU_SECRET = 'MY_SECRET';

 *	constructor(private httpClient: HttpClient) {}
 *
 *	async ngOnInit() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken(),
 *		};
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
 * The ***ovParticipantsPanel** directive allows to replace the default participants panel template injecting your own component.
 * Here we're going to redefine the participants template in a few code lines.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-participants-panel#run-this-tutorial).
 *
 * ```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<div *ovParticipantsPanel id="my-panel">
 * 		<ul id="local">
 * 			<li>{{localParticipant.nickname}}</li>
 * 		</ul>
 *
 * 		<ul id="remote">
 * 			<li *ngFor="let p of remoteParticipants">{{p.nickname}}</li>
 * 		</ul>
 * 	</div>
 * </ov-videoconference>
 *```
 *
 *
 * As we need to get the participants in our session, we are subscribing to them using the {@link ParticipantService}. We'll get the local participant
 * and the remote participants and we will be able to update the participants panel on every update.
 *
 *
 * ```javascript
 * export class ParticipantsPanelDirectiveComponent implements OnInit, OnDestroy {
 * 	tokens: TokenModel;
 *	sessionId = 'participants-panel-directive-example';
 *	OPENVIDU_URL = 'https://localhost:4443';
 *	OPENVIDU_SECRET = 'MY_SECRET';
 *	localParticipant: ParticipantAbstractModel;
 *	remoteParticipants: ParticipantAbstractModel[];
 *	localParticipantSubs: Subscription;
 *	remoteParticipantsSubs: Subscription;
 *
 *	constructor(
 *		private httpClient: HttpClient,
 *		private participantService: ParticipantService
 *	) {}
 *
 *	ngOnInit(): void {
 *		this.subscribeToParticipants();
 *	}
 *
 *	ngOnDestroy() {
 *		this.localParticipantSubs.unsubscribe();
 *		this.remoteParticipantsSubs.unsubscribe();
 *	}
 *
 *	async onJoinButtonClicked() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *	subscribeToParticipants() {
 *		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
 *			this.localParticipant = p;
 *		});
 *
 *		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
 *			this.remoteParticipants = participants;
 *		});
 *	}
 * }
 *
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
 * The ***ovParticipantPanelItem** directive allows to replace the default participant panel item template in the {@link ParticipantsPanelComponent} injecting your own component.
 *
 * With ***ovParticipantPanelItem** directive we can access to the participant object from its context using
 * the `let` keyword and referencing to the `participant` variable: `*ovParticipantPanelItem="let participant"`.
 *  Now we can access to the {@link ParticipantAbstractModel} object.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-participant-panel-item#run-this-tutorial).
 *
 * ```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<div *ovParticipantPanelItem="let participant" style="display: flex">
 *		<p>{{ participant.nickname }}</p>
 *		<button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
 *		<mat-menu #menu="matMenu">
 *			<button mat-menu-item>Button 1</button>
 *			<button mat-menu-item>Button 2</button>
 *		</mat-menu>
 *	</div>
 * </ov-videoconference>
 *```
 *
 *
 *
 * ```javascript
 * export class ParticipantPanelItemDirectiveComponent {
 * 	tokens: TokenModel;
 * 	sessionId = 'participants-panel-directive-example';
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 *
 * 	constructor(private httpClient: HttpClient) {}
 *
 * 	async onJoinButtonClicked() {
 * 	 this.tokens = {
 * 	  webcam: await this.getToken(),
 * 	  screen: await this.getToken()
 * 	 };
 * 	}
 * }
 *
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
 * Here we're going to add a simple button for disconnecting to the session.
 *
 * With ***ovParticipantPanelItemElements** directive we can access to the participant object from its context using
 * the `let` keyword and referencing to the `participant` variable: `*ovParticipantPanelItem="let participant"`.
 *  Now we can access to the {@link ParticipantAbstractModel} object and enable the button just for local participants.
 *
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-participant-panel-item-element#run-this-tutorial).
 *
 * ```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 * 	<div *ovParticipantPanelItemElements="let participant">
 *		<button *ngIf="participant.local" (click)="leaveSession()">Leave</button>
 *	</div>
 * </ov-videoconference>
 *```
 *
 *
 *
 * ```javascript
 * export class ParticipantPanelItemElementsDirectiveComponent {
 * 	tokens: TokenModel;
 * 	sessionId = 'participants-panel-directive-example';
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 *
 * 	constructor(private httpClient: HttpClient, private openviduService: OpenViduService) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.getToken(),
 * 			screen: await this.getToken()
 * 		};
 * 	}
 *
 * 	leaveSession() {
 * 		this.openviduService.disconnect();
 * 	}
 * }
 * ```
 *
 */

@Directive({
	selector: '[ovParticipantPanelItemElements]'
})
export class ParticipantPanelItemElementsDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 *
 * The ***ovLayout** directive allows us replacing the default layout with ours. As we have to add a stream for each participant,
 * we must get the local and remote participants.
 *
 * As the deafult {@link StreamComponent} needs the participant stream, and as the participants streams extraction is not trivial,
 * openvidu-angular provides us a {@link ParticipantStreamsPipe}for extracting the streams of each participant with ease.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-layout#run-this-tutorial).
 *
 * ```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 *	<div *ovLayout>
 *	 <div class="container">
 *	 	<div class="item" *ngFor="let stream of localParticipant | streams">
 *	 		<ov-stream [stream]="stream"></ov-stream>
 *	 	</div>
 *	 	<div class="item" *ngFor="let stream of remoteParticipants | streams">
 *	 		<ov-stream [stream]="stream"></ov-stream>
 *	 	</div>
 *	 </div>
 *	</div>
 * </ov-videoconference>
 *```
 *
 * ```javascript
 * export class LayoutDirectiveComponent implements OnInit, OnDestroy {
 * 	tokens: TokenModel;
 *	sessionId = 'participants-panel-directive-example';
 *	OPENVIDU_URL = 'https://localhost:4443';
 *	OPENVIDU_SECRET = 'MY_SECRET';
 *	localParticipant: ParticipantAbstractModel;
 *	remoteParticipants: ParticipantAbstractModel[];
 *	localParticipantSubs: Subscription;
 *	remoteParticipantsSubs: Subscription;
 *
 *	constructor(
 *		private httpClient: HttpClient,
 *		private participantService: ParticipantService
 *	) {}
 *
 *	ngOnInit(): void {
 *		this.subscribeToParticipants();
 *	}
 *
 *	ngOnDestroy() {
 *		this.localParticipantSubs.unsubscribe();
 *		this.remoteParticipantsSubs.unsubscribe();
 *	}
 *
 *	async onJoinButtonClicked() {
 *		this.tokens = {
 *			webcam: await this.getToken(),
 *			screen: await this.getToken()
 *		};
 *	}
 *	subscribeToParticipants() {
 *		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
 *			this.localParticipant = p;
 *		});
 *
 *		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
 *			this.remoteParticipants = participants;
 *		});
 *	}
 * }
 *
 * ```
 *
 */
@Directive({
	selector: '[ovLayout]'
})
export class LayoutDirective {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}
}

/**
 * The ***ovStream** directive allows to replace the default {@link StreamComponent} template injecting your own component.
 * In the example below, we have to customize the nickname position and styles replacing the default stream.
 *
 * With ***ovStream** directive we can access to the stream object from its context using the `let` keyword and
 * referencing to the `stream` variable: `*ovStream="let stream"`. Now we can access to the {@link StreamModel} object.
 *
 * You can run the sample [here](https://docs.openvidu.io/en/stable/components/openvidu-custom-stream#run-this-tutorial).
 *
 * ```html
 * <ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
 *	<div *ovStream="let stream">
 *		<ov-stream [stream]="stream" [displayParticipantName]="false"></ov-stream>
 *		<p>{{stream.participant.nickname}}</p>
 *	</div>
 * </ov-videoconference>
 * ```
 *
 * ```javascript
 * export class StreamDirectiveComponent {
 * 	tokens: TokenModel;
 * 	sessionId = 'toolbar-directive-example';
 * 	OPENVIDU_URL = 'https://localhost:4443';
 * 	OPENVIDU_SECRET = 'MY_SECRET';
 *
 * 	constructor(private httpClient: HttpClient) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.getToken(),
 * 			screen: await this.getToken()
 * 		};
 * 	}
 * }
 * ```
 *
 */

@Directive({
	selector: '[ovStream]'
})
export class StreamDirective {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}
}
