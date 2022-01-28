import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { skip, Subscription } from 'rxjs';
import { LibraryComponents } from '../../config/lib.config';
import { MenuType } from '../../models/menu.model';
import { LibraryConfigService } from '../../services/library-config/library-config.service';
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';
import { ChatPanelComponent } from './chat-panel/chat-panel.component';
import { ParticipantsPanelComponent } from './participants-panel/participants-panel/participants-panel.component';

@Component({
	selector: 'ov-panel',
	templateUrl: './panel.component.html',
	styleUrls: ['./panel.component.css']
})
export class PanelComponent implements OnInit, OnDestroy {
	isParticipantsPanelOpened: boolean;
	isChatPanelOpened: boolean;
	_chat: ViewContainerRef;
	_participants: ViewContainerRef;
	menuSubscription: Subscription;

	@ViewChild('chat', { static: false, read: ViewContainerRef })
	set chat(reference: ViewContainerRef) {
		setTimeout(() => {
			this._chat = reference;

			if (this._chat) {
				let component = ChatPanelComponent;
				if (this.libraryConfigSrv.isCustomComponentDefined(LibraryComponents.CHAT_PANEL)) {
					component = this.libraryConfigSrv.getCustomComponent(LibraryComponents.CHAT_PANEL);
				}
				this._chat?.clear();
				this._chat.createComponent(component);
			}
		}, 0);
	}

	@ViewChild('participants', { static: false, read: ViewContainerRef })
	set participants(reference: ViewContainerRef) {
		setTimeout(() => {
			this._participants = reference;

			if (this._participants) {
				let component = ParticipantsPanelComponent;
				if (this.libraryConfigSrv.isCustomComponentDefined(LibraryComponents.PARTICIPANTS_PANEL)) {
					component = this.libraryConfigSrv.getCustomComponent(LibraryComponents.PARTICIPANTS_PANEL);
				}
				this._participants?.clear();
				this._participants.createComponent(component);
			}
		}, 0);
	}

	constructor(protected libraryConfigSrv: LibraryConfigService, protected menuService: SidenavMenuService) {}

	ngOnInit(): void {
		this.subscribeToPanelToggling();
	}
	subscribeToPanelToggling() {
		this.menuSubscription = this.menuService.menuOpenedObs.pipe(skip(1)).subscribe((ev: { opened: boolean; type?: MenuType }) => {
			this.isChatPanelOpened = ev.opened && ev.type === MenuType.CHAT;
			this.isParticipantsPanelOpened = ev.opened && ev.type === MenuType.PARTICIPANTS;
		});
	}

	ngOnDestroy() {
		this.isChatPanelOpened = false;
		this.isParticipantsPanelOpened = false;
		if (this.menuSubscription) this.menuSubscription.unsubscribe();
	}
}
