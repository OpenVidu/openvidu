import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { MenuType } from '../../models/menu.model';
import { LoggerService } from '../logger/logger.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class PanelService {
	menuOpenedObs: Observable<{ opened: boolean; type?: MenuType }>;
	protected log: ILogger;
	protected isChatMenuOpened: boolean = false;
	protected isParticipantsMenuOpened: boolean = false;
	protected _menuOpened = <BehaviorSubject<{ opened: boolean; type?: MenuType }>>new BehaviorSubject({ opened: false });

	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('PanelService');
		this.menuOpenedObs = this._menuOpened.asObservable();
	}

	isMenuOpened(): boolean {
		return this.isChatOpened() || this.isParticipantsOpened();
	}

	toggleMenu(type: MenuType) {
		this.log.d(`Toggling ${type} menu`);
		if (type === MenuType.CHAT) {
			if (this.isChatMenuOpened) {
				// Close chat and side menu
				this.isChatMenuOpened = false;
				this._menuOpened.next({ opened: false });
			} else {
				// Open chat
				this.isChatMenuOpened = true;
				this.isParticipantsMenuOpened = false;
				this._menuOpened.next({ opened: true, type: MenuType.CHAT });
			}
		} else if (type === MenuType.PARTICIPANTS) {
			if (this.isParticipantsMenuOpened) {
				// Close participants menu and side menu
				this.isParticipantsMenuOpened = false;
				this._menuOpened.next({ opened: false });
			} else {
				// Open participants menu
				this.isParticipantsMenuOpened = true;
				this.isChatMenuOpened = false;
				this._menuOpened.next({ opened: true, type: MenuType.PARTICIPANTS });
			}
		}
	}

	closeMenu() {
		this.isParticipantsMenuOpened = false;
		this.isChatMenuOpened = false;
		this._menuOpened.next({ opened: false });
	}

	isChatOpened() {
		return this.isChatMenuOpened;
	}

	isParticipantsOpened() {
		return this.isParticipantsMenuOpened;
	}
}
