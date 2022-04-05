import { Component } from '@angular/core';
import { TokenModel, Signal } from 'openvidu-angular';
import { Session, SignalOptions } from 'openvidu-browser';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-chatPanel-directive',
	template: `
		<ov-videoconference
			(onJoinButtonClicked)="onJoinButtonClicked()"
			(onSessionCreated)="onSessionCreated($event)"
			[tokens]="tokens"
			[toolbarDisplaySessionName]="false"
		>
			<div *ovChatPanel id="my-panel">
				<h3>Chat</h3>
				<div>
					<ul>
						<li *ngFor="let msg of messages">{{ msg }}</li>
					</ul>
				</div>
				<input value="Hello" #input />
				<button (click)="send(input.value)">Send</button>
			</div>
		</ov-videoconference>
	`,
	styles: [
		`
			#my-panel {
				background: #aafffc;
				height: 100%;
				overflow: hidden;
				text-align: center;
			}
		`
	]
})
export class ChatPanelDirectiveComponent {
	tokens: TokenModel;
	sessionId = 'chat-panel-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	session: Session;
	messages: string[] = [];
	constructor(private restService: RestService) {}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}

	onSessionCreated(session: Session) {
		this.session = session;
		this.session.on(`signal:${Signal.CHAT}`, (event: any) => {
			const msg = JSON.parse(event.data).message;
			this.messages.push(msg);
		});
	}

	send(message: string): void {
		const signalOptions: SignalOptions = {
			data: JSON.stringify({ message }),
			type: Signal.CHAT,
			to: undefined
		};
		this.session.signal(signalOptions);
	}
}
