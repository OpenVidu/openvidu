import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ChatMessage } from '../../models/chat.model';

@Injectable()
export class ChatServiceMock {
	messagesObs: Observable<ChatMessage[]>;
	messagesUnreadObs: Observable<number>;
	toggleChatObs: Observable<boolean>;
	private _messageList = <BehaviorSubject<ChatMessage[]>>new BehaviorSubject([]);
	private _toggleChat = <BehaviorSubject<boolean>>new BehaviorSubject(false);


	private _messagesUnread = <BehaviorSubject<number>>new BehaviorSubject(0);

	constructor() {
		this.messagesObs = this._messageList.asObservable();
		this.toggleChatObs = this._toggleChat.asObservable();
		this.messagesUnreadObs = this._messagesUnread.asObservable();
	}

	subscribeToChat() {
	}

	sendMessage(message: string) {

	}

	toggleChat() {

	}

	private isChatOpened(): boolean {
		return false;
	}

	private addMessageUnread() {

	}
}
