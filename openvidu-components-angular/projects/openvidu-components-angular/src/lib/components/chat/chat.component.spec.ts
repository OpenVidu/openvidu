import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatService } from '../../services/chat/chat.service';
import { ChatServiceMock } from '../../services/chat/chat.service.mock';

import { ChatComponent } from './chat.component';

describe('ChatComponent', () => {
	let component: ChatComponent;
	let fixture: ComponentFixture<ChatComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ChatComponent],
			providers: [{ provide: ChatService, useClass: ChatServiceMock }]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ChatComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
