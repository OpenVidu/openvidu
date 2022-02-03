import { Component, ContentChild, OnInit, TemplateRef } from '@angular/core';
import { skip, Subscription } from 'rxjs';
import { MenuType } from '../../models/menu.model';
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';

@Component({
	selector: 'ov-panel',
	templateUrl: './panel.component.html',
	styleUrls: ['./panel.component.css']
})
export class PanelComponent implements OnInit {
	@ContentChild('participantsPanel', { read: TemplateRef }) participantsPanelTemplate: TemplateRef<any>;
	@ContentChild('chatPanel', { read: TemplateRef }) chatPanelTemplate: TemplateRef<any>;

	isParticipantsPanelOpened: boolean;
	isChatPanelOpened: boolean;
	menuSubscription: Subscription;
	constructor(protected menuService: SidenavMenuService) {}

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
