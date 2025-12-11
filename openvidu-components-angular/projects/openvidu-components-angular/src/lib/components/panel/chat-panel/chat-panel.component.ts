import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppMaterialModule } from '../../../openvidu-components-angular.material.module';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { LinkifyPipe } from '../../../pipes/linkify.pipe';
import { Subject, takeUntil } from 'rxjs';
import { ChatMessage } from '../../../models/chat.model';
import { PanelType } from '../../../models/panel.model';
import { ChatService } from '../../../services/chat/chat.service';
import { PanelService } from '../../../services/panel/panel.service';

/**
 *
 * The **ChatPanelComponent** is an integral part of the {@link PanelComponent} and serves as the interface for displaying the session chat.
 */
@Component({
	selector: 'ov-chat-panel',
	templateUrl: './chat-panel.component.html',
	styleUrls: ['../panel.component.scss', './chat-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
	imports: [CommonModule, FormsModule, AppMaterialModule, TranslatePipe, LinkifyPipe]
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
	/**
	 * @ignore
	 */
	messageList: ChatMessage[] = [];

	private destroy$ = new Subject<void>();

	/**
	 * @ignore
	 */
	constructor(
		private chatService: ChatService,
		private panelService: PanelService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @ignore
	 */
	ngOnInit() {
		this.subscribeToMessages();
	}

	/**
	 * @ignore
	 */
	ngAfterViewInit() {
		setTimeout(() => {
			this.scrollToBottom();
			this.chatInput.nativeElement.focus();
		}, 100);
	}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
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

	/**
	 * @ignore
	 */
	async sendMessage(): Promise<void> {
		if (!!this.message) {
			await this.chatService.sendMessage(this.message);
			this.message = '';
		}
	}

	/**
	 * @ignore
	 */
	scrollToBottom(): void {
		setTimeout(() => {
			try {
				this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
			} catch (err) {}
		}, 20);
	}

	/**
	 * @ignore
	 */
	close() {
		this.panelService.togglePanel(PanelType.CHAT);
	}

	private subscribeToMessages() {
		this.chatService.chatMessages$.pipe(takeUntil(this.destroy$)).subscribe((messages: ChatMessage[]) => {
			this.messageList = messages;
			if (this.panelService.isChatPanelOpened()) {
				this.scrollToBottom();
				this.cd.markForCheck();
			}
		});
	}
}
