import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { skip, Subscription } from 'rxjs';
import { LibraryComponents } from '../../config/lib.config';
import { MenuType } from '../../models/menu.model';
import { LibraryConfigService } from '../../services/library-config/library-config.service';
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';

@Component({
	selector: 'ov-panel',
	templateUrl: './panel.component.html',
	styleUrls: ['./panel.component.css']
})
export class PanelComponent implements OnInit, OnDestroy {
	isParticipantsPanelOpened: boolean;
	isChatPanelOpened: boolean;
	menuSubscription: Subscription;

	@ViewChild('chat', { static: false, read: ViewContainerRef })
	set chat(reference: ViewContainerRef) {
		setTimeout(() => {
			if (reference) {
				const component = this.libraryConfigSrv.getDynamicComponent(LibraryComponents.CHAT_PANEL);
				reference.clear();
				reference.createComponent(component);
			}
		}, 0);
	}

	@ViewChild('participants', { static: false, read: ViewContainerRef })
	set participants(reference: ViewContainerRef) {
		setTimeout(() => {
			if (reference) {
				const component = this.libraryConfigSrv.getDynamicComponent(LibraryComponents.PARTICIPANTS_PANEL);
				reference.clear();
				reference.createComponent(component);
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
