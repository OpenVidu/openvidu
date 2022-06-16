import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { PanelType } from '../../models/panel.model';
import { LoggerService } from '../logger/logger.service';

export interface PanelEvent {
	opened: boolean;
	type?: PanelType | string;
	expand?: string;
	oldType?: PanelType | string;
}

@Injectable({
	providedIn: 'root'
})
export class PanelService {
	/**
	 * Panel Observable which pushes the panel status in every update.
	 */
	panelOpenedObs: Observable<PanelEvent>;
	protected log: ILogger;
	protected isChatOpened: boolean = false;
	protected isParticipantsOpened: boolean = false;
	protected isActivitiesOpened: boolean = false;
	private isExternalOpened: boolean = false;
	private externalType: string;
	protected _panelOpened = <BehaviorSubject<PanelEvent>>new BehaviorSubject({ opened: false });
	private panelMap: Map<string, boolean> = new Map();

	/**
	 * @internal
	 */
	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('PanelService');
		this.panelOpenedObs = this._panelOpened.asObservable();
		Object.values(PanelType).forEach((panel) => this.panelMap.set(panel, false));
	}

	/**
	 * Open or close the panel type received. Calling this method with the panel opened and the same type panel, will close the panel.
	 * If the type is differente, it will switch to the properly panel.
	 */
	togglePanel(type: PanelType | string, expand?: string) {
		let nextOpenedValue: boolean = false;
		if (this.panelMap.has(type)) {
			this.log.d(`Toggling ${type} menu`);

			this.panelMap.forEach((opened: boolean, panel: string) => {
				if (panel === type) {
					// Toggle panel
					this.panelMap.set(panel, !opened);
					nextOpenedValue = !opened;
				} else {
					// Close others
					this.panelMap.set(panel, false);
				}
			});
		} else {
			// Panel is external
			this.log.d('Toggling external panel');
			this.isChatOpened = false;
			this.isParticipantsOpened = false;
			this.isActivitiesOpened = false;
			// Open when is closed or is opened with another type
			this.isExternalOpened = !this.isExternalOpened || this.externalType !== type;
			this.externalType = !this.isExternalOpened ? '' : type;
			nextOpenedValue = this.isExternalOpened;
		}

		const oldType = this._panelOpened.getValue().type;
		this._panelOpened.next({ opened: nextOpenedValue, type, expand, oldType });
	}

	/**
	 * @internal
	 */
	isPanelOpened(): boolean {
		return (
			this.isChatPanelOpened() || this.isParticipantsPanelOpened() || this.isActivitiesPanelOpened() || this.isExternalPanelOpened()
		);
	}

	/**
	 * Closes the panel (if opened)
	 */
	closePanel(): void {
		this.isParticipantsOpened = false;
		this.isChatOpened = false;
		this.isExternalOpened = false;
		this.isActivitiesOpened = false;
		this._panelOpened.next({ opened: false });
	}

	/**
	 * Whether the chat panel is opened or not.
	 */
	isChatPanelOpened(): boolean {
		return this.isChatOpened;
	}

	/**
	 * Whether the participants panel is opened or not.
	 */
	isParticipantsPanelOpened(): boolean {
		return this.isParticipantsOpened;
	}

	/**
	 * Whether the activities panel is opened or not.
	 */
	isActivitiesPanelOpened(): boolean {
		return this.isActivitiesOpened;
	}

	isExternalPanelOpened(): boolean {
		return this.isExternalOpened;
	}
}
