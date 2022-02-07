import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatService } from '../../../services/chat/chat.service';
import { ChatServiceMock } from '../../../services/chat/chat.service.mock';

import { ChatPanelComponent } from './chat-panel.component';

describe('ChatPanelComponent', () => {
	let component: ChatPanelComponent;
	let fixture: ComponentFixture<ChatPanelComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ChatPanelComponent],
			providers: [{ provide: ChatService, useClass: ChatServiceMock }]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ChatPanelComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
