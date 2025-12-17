import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ChatMessage } from '../../../models/chat.model';
import { PanelType } from '../../../models/panel.model';
import { ChatService } from '../../../services/chat/chat.service';
import { E2eeService } from '../../../services/e2ee/e2ee.service';
import { PanelService } from '../../../services/panel/panel.service';
import { ParticipantService } from '../../../services/participant/participant.service';

/**
 *
 * The **ChatPanelComponent** is an integral part of the {@link PanelComponent} and serves as the interface for displaying the session chat.
 */
@Component({
	selector: 'ov-chat-panel',
	templateUrl: './chat-panel.component.html',
	styleUrls: ['../panel.component.scss', './chat-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class ChatPanelComponent implements OnInit, AfterViewInit {
	/**
	 * @ignore
	 */
	@ViewChild('chatScroll') chatScroll: ElementRef = new ElementRef(null);
	/**
	 * @ignore
	 */
	@ViewChild('chatInput') chatInput: ElementRef = new ElementRef(null);
	/**
	 * @ignore
	 */
	message: string = '';
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
		private cd: ChangeDetectorRef,
		private e2eeService: E2eeService,
		private participantService: ParticipantService
	) {	}

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
	eventKeyPress(event: KeyboardEvent): void {
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

	/**
	 * @ignore
	 */
	hasEncryptionKeyMismatch = computed(() => {
		if (!this.e2eeService.isEnabled) {
			return false;
		}
		const remoteParticipants = this.participantService.remoteParticipantsSignal();
		return remoteParticipants.some(p => p.hasEncryptionError);
	});



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
