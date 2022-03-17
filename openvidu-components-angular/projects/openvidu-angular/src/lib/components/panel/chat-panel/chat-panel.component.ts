import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../../models/chat.model';
import { MenuType } from '../../../models/menu.model';
import { ChatService } from '../../../services/chat/chat.service';
import { SidenavMenuService } from '../../../services/sidenav-menu/sidenav-menu.service';

@Component({
	selector: 'ov-chat-panel',
	templateUrl: './chat-panel.component.html',
	styleUrls: ['./chat-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPanelComponent implements OnInit, AfterViewInit {
	@ViewChild('chatScroll') chatScroll: ElementRef;
	@ViewChild('chatInput') chatInput: ElementRef;
	message: string;
	messageList: ChatMessage[] = [];
	isMenuOpened: boolean;

	private chatMessageSubscription: Subscription;

	constructor(private chatService: ChatService, private menuService: SidenavMenuService, private cd: ChangeDetectorRef) {}

	@HostListener('document:keydown.escape', ['$event'])
	onKeydownHandler(event: KeyboardEvent) {
		if (this.menuService.isMenuOpened()) {
			this.close();
		}
	}

	ngOnInit() {
		this.subscribeToMessages();
	}

	ngAfterViewInit() {
		setTimeout(() => {
			this.scrollToBottom();
			this.chatInput.nativeElement.focus();
		}, 100);
	}

	ngOnDestroy(): void {
		if (this.chatMessageSubscription) this.chatMessageSubscription.unsubscribe();
	}

	eventKeyPress(event) {
		// Pressed 'Enter' key
		if (event && event.keyCode === 13) {
			event.preventDefault();
			this.sendMessage();
		}
	}

	sendMessage(): void {
		if(!!this.message) {
			this.chatService.sendMessage(this.message);
			this.message = '';
		}
	}

	scrollToBottom(): void {
		setTimeout(() => {
			try {
				this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
			} catch (err) {}
		}, 20);
	}

	close() {
		this.menuService.toggleMenu(MenuType.CHAT);
	}

	private subscribeToMessages() {
		this.chatMessageSubscription = this.chatService.messagesObs.subscribe((messages: ChatMessage[]) => {
			this.messageList = messages;
			if (this.menuService.isMenuOpened()) {
				this.scrollToBottom();
				this.cd.markForCheck();
			}
		});
	}
}
