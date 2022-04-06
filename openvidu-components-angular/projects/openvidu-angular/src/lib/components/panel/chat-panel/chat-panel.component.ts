import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	HostListener,
	OnInit,
	ViewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../../models/chat.model';
import { PanelType } from '../../../models/panel.model';
import { ChatService } from '../../../services/chat/chat.service';
import { PanelService } from '../../../services/panel/panel.service';

/**
 *
 * The **ChatPanelComponent** is hosted inside of the {@link PanelComponent}.
 * It is in charge of displaying the session chat.
 *
 * <div class="custom-table-container">

 * <div>
 *
 * <h3>OpenVidu Angular Directives</h3>
 *
 * The ChatPanelComponent can be replaced with a custom component. It provides us the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * for doing this.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |           ***ovChatPanel**          |           {@link ChatPanelDirective}          |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */
@Component({
	selector: 'ov-chat-panel',
	templateUrl: './chat-panel.component.html',
	styleUrls: ['./chat-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPanelComponent implements OnInit, AfterViewInit {
	/**
	 * @ignore
	 */
	@ViewChild('chatScroll') chatScroll: ElementRef;
	/**
	 * @ignore
	 */
	@ViewChild('chatInput') chatInput: ElementRef;
	/**
	 * @ignore
	 */
	message: string;

	messageList: ChatMessage[] = [];

	private chatMessageSubscription: Subscription;

	/**
	 * @ignore
	 */
	constructor(private chatService: ChatService, private panelService: PanelService, private cd: ChangeDetectorRef) {}

	/**
	 * @ignore
	 */
	@HostListener('document:keydown.escape', ['$event'])
	onKeydownHandler(event: KeyboardEvent) {
		if (this.panelService.isPanelOpened()) {
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

	/**
	 * @ignore
	 */
	eventKeyPress(event) {
		// Pressed 'Enter' key
		if (event && event.keyCode === 13) {
			event.preventDefault();
			this.sendMessage();
		}
	}

	sendMessage(): void {
		if (!!this.message) {
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
		this.panelService.togglePanel(PanelType.CHAT);
	}

	private subscribeToMessages() {
		this.chatMessageSubscription = this.chatService.messagesObs.subscribe((messages: ChatMessage[]) => {
			this.messageList = messages;
			if (this.panelService.isPanelOpened()) {
				this.scrollToBottom();
				this.cd.markForCheck();
			}
		});
	}
}
