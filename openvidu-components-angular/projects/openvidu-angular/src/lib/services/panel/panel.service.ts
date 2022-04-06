import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { PanelType } from '../../models/panel.model';
import { LoggerService } from '../logger/logger.service';

@Injectable({
	providedIn: 'root'
})
export class PanelService {
	panelOpenedObs: Observable<{ opened: boolean; type?: PanelType | string }>;
	protected log: ILogger;
	protected isChatOpened: boolean = false;
	protected isParticipantsOpened: boolean = false;
	private isExternalOpened: boolean = false;
	private externalType: string;
	protected _panelOpened = <BehaviorSubject<{ opened: boolean; type?: PanelType | string }>>new BehaviorSubject({ opened: false });

	/**
	 * @internal
	 */
	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('PanelService');
		this.panelOpenedObs = this._panelOpened.asObservable();
	}

	togglePanel(type: PanelType | string) {
		this.log.d(`Toggling ${type} menu`);
		let opened: boolean;
		if (type === PanelType.CHAT) {
			this.isChatOpened = !this.isChatOpened;
			this.isParticipantsOpened = false;
			this.isExternalOpened = false;
			opened = this.isChatOpened;
		} else if (type === PanelType.PARTICIPANTS) {
			this.isParticipantsOpened = !this.isParticipantsOpened;
			this.isChatOpened = false;
			this.isExternalOpened = false;
			opened = this.isParticipantsOpened;
		} else {
			this.log.d('Toggling external panel');
			this.isChatOpened = false;
			this.isParticipantsOpened = false;
			// Open when is close or is opened with another type
			this.isExternalOpened = !this.isExternalOpened || this.externalType !== type;
			this.externalType = !this.isExternalOpened ? '' : type;
			opened = this.isExternalOpened;
		}

		this._panelOpened.next({ opened, type });
	}

	/**
	 * @internal
	 */
	isPanelOpened(): boolean {
		return this.isChatPanelOpened() || this.isParticipantsPanelOpened() || this.isExternalPanelOpened();
	}

	closePanel(): void {
		this.isParticipantsOpened = false;
		this.isChatOpened = false;
		this.isExternalOpened = false;
		this._panelOpened.next({ opened: false });
	}

	isChatPanelOpened(): boolean {
		return this.isChatOpened;
	}

	isParticipantsPanelOpened(): boolean {
		return this.isParticipantsOpened;
	}

	private isExternalPanelOpened(): boolean {
		return this.isExternalOpened;
	}
}
