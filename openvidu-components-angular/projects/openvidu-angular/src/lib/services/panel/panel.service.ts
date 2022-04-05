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
	panelOpenedObs: Observable<{ opened: boolean; type?: MenuType }>;
	protected log: ILogger;
	protected isChatPanelOpened: boolean = false;
	protected isParticipantsPanelOpened: boolean = false;
	protected _panelOpened = <BehaviorSubject<{ opened: boolean; type?: MenuType }>>new BehaviorSubject({ opened: false });

	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('PanelService');
		this.panelOpenedObs = this._panelOpened.asObservable();
	}

	isPanelOpened(): boolean {
		return this.isChatOpened() || this.isParticipantsOpened();
	}

	togglePanel(type: MenuType) {
		this.log.d(`Toggling ${type} menu`);
		if (type === MenuType.CHAT) {
			if (this.isChatPanelOpened) {
				// Close chat and side menu
				this.isChatPanelOpened = false;
				this._panelOpened.next({ opened: false });
			} else {
				// Open chat
				this.isChatPanelOpened = true;
				this.isParticipantsPanelOpened = false;
				this._panelOpened.next({ opened: true, type: MenuType.CHAT });
			}
		} else if (type === MenuType.PARTICIPANTS) {
			if (this.isParticipantsPanelOpened) {
				// Close participants menu and side menu
				this.isParticipantsPanelOpened = false;
				this._panelOpened.next({ opened: false });
			} else {
				// Open participants menu
				this.isParticipantsPanelOpened = true;
				this.isChatPanelOpened = false;
				this._panelOpened.next({ opened: true, type: MenuType.PARTICIPANTS });
			}
		}
	}

	closeMenu() {
		this.isParticipantsPanelOpened = false;
		this.isChatPanelOpened = false;
		this._panelOpened.next({ opened: false });
	}

	isChatOpened() {
		return this.isChatPanelOpened;
	}

	isParticipantsOpened() {
		return this.isParticipantsPanelOpened;
	}
}
