import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { PanelEvent, PanelSettingsOptions, PanelType } from '../../models/panel.model';
import { LoggerService } from '../logger/logger.service';

@Injectable({
	providedIn: 'root'
})
export class PanelService {
	/**
	 * Panel Observable which pushes the panel status in every update.
	 */
	panelOpenedObs: Observable<PanelEvent>;
	protected log: ILogger;
	private isExternalOpened: boolean = false;
	private externalType: string;
	protected _panelOpened = <BehaviorSubject<PanelEvent>>new BehaviorSubject({ opened: false });
	private panelTypes: string[] = Object.values(PanelType);

	/**
	 * @internal
	 */
	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('PanelService');
		this.panelOpenedObs = this._panelOpened.asObservable();
	}

	/**
	 * Open or close the panel type received. Calling this method with the panel opened and the same type panel, will close the panel.
	 * If the type is differente, it will switch to the properly panel.
	 */
	togglePanel(type: PanelType | string, expand?: PanelSettingsOptions | string) {
		let nextOpenedValue: boolean = false;
		const oldType = this._panelOpened.getValue().type;
		const oldOpened = this._panelOpened.getValue().opened;

		if (this.panelTypes.includes(type)) {
			this.log.d(`Toggling ${type} menu`);

			nextOpenedValue = oldType !== type ? true : !oldOpened;
		} else {
			// Panel is external
			this.log.d('Toggling external panel');
			// Opening when external panel is closed or is opened with another type
			this.isExternalOpened = !this.isExternalOpened || this.externalType !== type;
			this.externalType = !this.isExternalOpened ? '' : type;
			nextOpenedValue = this.isExternalOpened;
		}

		this._panelOpened.next({ opened: nextOpenedValue, type, expand, oldType });
	}

	/**
	 * @internal
	 */
	isPanelOpened(): boolean {
		return this._panelOpened.getValue().opened;
	}

	/**
	 * Closes the panel (if opened)
	 */
	closePanel(): void {
		this._panelOpened.next({ opened: false, type: undefined, expand: undefined, oldType: undefined });
	}

	/**
	 * Whether the chat panel is opened or not.
	 */
	isChatPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.opened && panelState.type === PanelType.CHAT;
	}

	/**
	 * Whether the participants panel is opened or not.
	 */
	isParticipantsPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.opened && panelState.type === PanelType.PARTICIPANTS;
	}

	/**
	 * Whether the activities panel is opened or not.
	 */
	isActivitiesPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.opened && panelState.type === PanelType.ACTIVITIES;
	}

	/**
	 * Whether the settings panel is opened or not.
	 */
	isSettingsPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.opened && panelState.type === PanelType.SETTINGS;
	}

	/**
	 * Whether the background effects panel is opened or not.
	 */
	isBackgroundEffectsPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.opened && panelState.type === PanelType.BACKGROUND_EFFECTS;
	}

	isExternalPanelOpened(): boolean {
		return this.isExternalOpened;
	}
}
