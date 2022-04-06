import { Directive, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * The ***ovToolbar** directive allows to replace the default toolbar component injecting your custom template.
 * In the example below we've replaced the default toolbar and added the **toggleAudio** and **toggleVide** features.
 *
 * *You can run the sample [here]()*.
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
 * 	constructor(private restService: RestService, private openviduService: OpenViduService) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
 * 			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
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
 *  <div style="text-align: center">
 * 	<img src="../doc/toolbardirective-example.png"/>
 * </div>
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
 * The ***ovToolbarAdditionalButtons** directive allows to add additional buttons to the toolbar. We've added the same buttons as the {@link ToolbarDirective}.
 *	Here we are using the {@link ParticipantService} fror checking the audio or video status.
 *
 * _You can check the sample [here]()_.
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
 *		private restService: RestService,
 *		private openviduService: OpenViduService,
 *		private participantService: ParticipantService
 *	) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
 * 			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
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
 * <div style="text-align: center">
 * 	<img src="../doc/toolbarAdditionalButtonsDirective-example.png"/>
 * </div>
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

@Directive({
	selector: '[ovToolbarAdditionalPanelButtons]'
})
export class ToolbarAdditionalPanelButtonsDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


@Directive({
	selector: '[ovPanel]'
})
export class PanelDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


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
 * _You can check the sample [here]()_.
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
 *
 *
 * As we need to get the OpenVidu Browser [Session](https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html)
 * for sending messages to others, we can get it from the `onSessionCreated` event fired by the {@link VideoconferenceComponent} when the session has been created.
 *
 * Once we have the session created, we can use the `signal` method for sending our messages.
 *
 *
 *
 * ```javascript
 * export class ChatPanelDirectiveComponent {
 *	tokens: TokenModel;
 *	sessionId = 'chat-panel-directive-example';
 *	OPENVIDU_URL = 'https://localhost:4443';
 *	OPENVIDU_SECRET = 'MY_SECRET';
 *	session: Session;
 *	messages: string[] = [];
 *	constructor(private restService: RestService) {}
 *
 *	async onJoinButtonClicked() {
 *		this.tokens = {
 *			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
 *			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
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
 * <div style="text-align: center">
 * 	<img src="../doc/chatPanelDirective-example.png"/>
 * </div>
 */
@Directive({
	selector: '[ovChatPanel]'
})
export class ChatPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

/**
 * The ***ovParticipantsPanel** directive allows to replace the default participants panel template injecting your own component.
 * Here we're going to redefine the participants template in a few code lines.
 *
 * _You can check the sample [here]()_.
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
 *		private restService: RestService,
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
 *			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
 *			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
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
 * <div style="text-align: center">
 * 	<img src="../doc/participantsPanelDirective-example.png"/>
 * </div>
 */
@Directive({
	selector: '[ovParticipantsPanel]'
})
export class ParticipantsPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

@Directive({
	selector: '[ovParticipantPanelItem]'
})
export class ParticipantPanelItemDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

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
 * _You can check the sample [here]()_.
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
 *		private restService: RestService,
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
 *			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
 *			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
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
 * <div style="text-align: center">
 * 	<img src="../doc/layoutDirective-example.png"/>
 * </div>
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
 * _You can check the sample [here]()_.
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
 * 	constructor(private restService: RestService) {}
 *
 * 	async onJoinButtonClicked() {
 * 		this.tokens = {
 * 			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
 * 			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
 * 		};
 * 	}
 * }
 * ```
 * <div style="text-align: center">
 * 	<img src="../doc/streamDirective-example.png"/>
 * </div>
 *
 */

@Directive({
	selector: '[ovStream]'
})
export class StreamDirective {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}
}
