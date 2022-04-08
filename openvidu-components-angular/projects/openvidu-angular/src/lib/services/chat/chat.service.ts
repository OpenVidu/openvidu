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
import { PanelType } from '../../models/panel.model';

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
		this.messageSound = new Audio('data:audio/wav;base64,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');
		this.messageSound.volume = 0.6;
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
			if (!this.panelService.isPanelOpened()) {
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
		this.actionService.launchNotification(options, this.panelService.togglePanel.bind(this.panelService, PanelType.CHAT));
	}
}
