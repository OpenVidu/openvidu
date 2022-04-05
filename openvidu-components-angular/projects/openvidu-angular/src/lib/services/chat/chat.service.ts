import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

import { ILogger } from '../../models/logger.model';
import { ChatMessage } from '../../models/chat.model';
import { INotificationOptions } from '../../models/notification-options.model';

import { ActionService } from '../action/action.service';
import { OpenViduService } from '../openvidu/openvidu.service';
import { LoggerService } from '../logger/logger.service';
import { Signal } from '../../models/signal.model';
import { PanelService } from '../panel/panel.service';
import { ParticipantService } from '../participant/participant.service';
import { MenuType } from '../../models/menu.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class ChatService {
	messagesObs: Observable<ChatMessage[]>;
	private messageSound: HTMLAudioElement;
	protected _messageList = <BehaviorSubject<ChatMessage[]>>new BehaviorSubject([]);
	protected messageList: ChatMessage[] = [];
	protected log: ILogger;
	constructor(
		protected loggerSrv: LoggerService,
		protected openviduService: OpenViduService,
		protected participantService: ParticipantService,
		protected panelService: PanelService,
		protected actionService: ActionService
	) {
		this.log = this.loggerSrv.get('ChatService');
		this.messagesObs = this._messageList.asObservable();
		this.messageSound = new Audio('assets/audio/message_sound.mp3');
		this.messageSound.volume = 0.5;
	}

	subscribeToChat() {
		const session = this.openviduService.getWebcamSession();
		session.on(`signal:${Signal.CHAT}`, (event: any) => {
			const connectionId = event.from.connectionId;
			const data = JSON.parse(event.data);
			const isMyOwnConnection = this.openviduService.isMyOwnConnection(connectionId);
			this.messageList.push({
				isLocal: isMyOwnConnection,
				nickname: data.nickname,
				message: data.message
			});
			if (!this.panelService.isMenuOpened()) {
				const notificationOptions: INotificationOptions = {
					message: `${data.nickname.toUpperCase()} sent a message`,
					cssClassName: 'messageSnackbar',
					buttonActionText: 'READ'
				};
				this.launchNotification(notificationOptions);
				this.messageSound.play().catch(() => {});

			}
			this._messageList.next(this.messageList);
		});
	}

	sendMessage(message: string) {
		message = message.replace(/ +(?= )/g, '');
		if (message !== '' && message !== ' ') {
			const data = {
				message: message,
				nickname: this.participantService.getMyNickname()
			};

			this.openviduService.sendSignal(Signal.CHAT, undefined, data);
		}
	}

	protected launchNotification(options: INotificationOptions) {
		this.actionService.launchNotification(options, this.panelService.toggleMenu.bind(this.panelService, MenuType.CHAT));
	}
}
